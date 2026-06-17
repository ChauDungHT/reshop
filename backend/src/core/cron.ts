import cron from 'node-cron';
import db from './db';
import { calculateVendorFee } from '../shared/fee-calculator';
import { getGMT7DateString, queryTransactionStatus } from '../modules/payment/vnpay.utils';

/**
 * Tự động giải phóng tiền tạm giữ của Vendor sau 7 ngày nếu không có tranh chấp hay phản hồi
 */
export const autoReleaseEscrow = async (): Promise<number> => {
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Lấy tất cả các sub_orders có status = 'delivered', feedback_status = 'awaiting_feedback' và delivered_at >= 7 ngày trước
    const eligibleOrders = await client.query(
      `SELECT so.id, so.subtotal, so.shipping_fee, so.vendor_discount, so.platform_discount, so.vendor_id
       FROM sub_orders so
       WHERE so.status = 'delivered'
         AND so.feedback_status = 'awaiting_feedback'
         AND so.delivered_at <= NOW() - INTERVAL '7 days'
       FOR UPDATE OF so`
    );

    let releasedCount = 0;

    for (const subOrder of eligibleOrders.rows) {
      const vendorId = subOrder.vendor_id;

      // Lấy thông tin user_id của Vendor
      const vendorQuery = await client.query(
        `SELECT user_id 
         FROM vendors 
         WHERE id = $1::uuid`,
        [vendorId]
      );

      if (vendorQuery.rows.length > 0) {
        const { user_id: vendorUserId } = vendorQuery.rows[0];

        // Tính toán số tiền thực nhận
        const subtotal = parseFloat(subOrder.subtotal);
        const shippingFee = parseFloat(subOrder.shipping_fee || 0);
        const vendorDiscount = parseFloat(subOrder.vendor_discount || 0);
        const platformDiscount = parseFloat(subOrder.platform_discount || 0);

        const grossAmount = subtotal + shippingFee - vendorDiscount - platformDiscount;
        const { netAmount } = await calculateVendorFee(client, vendorId, grossAmount);

        // Trừ pending_balance và cộng vào wallet_balance
        const userUpdateRes = await client.query(
          `UPDATE users 
           SET pending_balance = GREATEST(pending_balance - $1, 0),
               wallet_balance = wallet_balance + $1 
           WHERE id = $2::uuid 
           RETURNING wallet_balance`,
          [netAmount, vendorUserId]
        );

        if (userUpdateRes.rows.length > 0) {
          const balanceAfter = parseFloat(userUpdateRes.rows[0].wallet_balance);

          // Tạo bản ghi giao dịch pending_release
          await client.query(
            `INSERT INTO wallet_transactions (user_id, amount, type, ref_id, balance_after)
             VALUES ($1::uuid, $2, 'pending_release', $3::uuid, $4)`,
            [vendorUserId, netAmount, subOrder.id, balanceAfter]
          );

          // Cập nhật feedback_status của sub_order thành 'auto_completed'
          await client.query(
            `UPDATE sub_orders 
             SET feedback_status = 'auto_completed', 
                 updated_at = NOW() 
             WHERE id = $1::uuid`,
            [subOrder.id]
          );

          releasedCount++;
        }
      }
    }

    await client.query('COMMIT');
    if (releasedCount > 0) {
      console.log(`[cron]: Automatically released escrow for ${releasedCount} sub-order(s).`);
    }
    return releasedCount;
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('[cron]: Error running autoReleaseEscrow:', error);
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Tự động đối soát trạng thái đơn hàng thanh toán qua VNPAY bị treo
 */
export const reconcileVNPAYOrders = async (): Promise<void> => {
  const client = await db.pool.connect();
  try {
    // Tìm các đơn hàng VNPAY đang ở trạng thái pending thanh toán trong vòng 2 ngày qua
    const pendingOrdersQuery = await client.query(
      `SELECT id, order_code, total_amount, created_at
       FROM orders
       WHERE payment_method = 'vnpay'
         AND payment_status = 'pending'
         AND created_at BETWEEN NOW() - INTERVAL '2 days' AND NOW() - INTERVAL '15 minutes'`
    );

    if (pendingOrdersQuery.rows.length === 0) {
      return;
    }

    console.log(`[cron-reconcile]: Found ${pendingOrdersQuery.rows.length} pending VNPAY orders to reconcile.`);

    for (const order of pendingOrdersQuery.rows) {
      const dbClient = await db.pool.connect();
      try {
        await dbClient.query('BEGIN');

        // Khóa dòng đơn hàng để tránh race condition với IPN callback thực tế
        const orderRes = await dbClient.query(
          `SELECT id, order_code, total_amount, payment_status, created_at
           FROM orders
           WHERE id = $1::uuid
           FOR UPDATE`,
          [order.id]
        );

        if (orderRes.rows.length === 0) {
          await dbClient.query('ROLLBACK');
          continue;
        }

        const currentOrder = orderRes.rows[0];
        if (currentOrder.payment_status !== 'pending') {
          await dbClient.query('ROLLBACK');
          continue;
        }

        const transactionDate = getGMT7DateString(currentOrder.created_at);
        console.log(`[cron-reconcile]: Querying VNPAY status for order: ${currentOrder.order_code} (created_at: ${transactionDate})`);

        const result = await queryTransactionStatus({
          orderCode: currentOrder.order_code,
          transactionDate,
          ipAddr: '127.0.0.1',
        });

        const vnp_ResponseCode = result.vnp_ResponseCode;
        const vnp_TransactionStatus = result.vnp_TransactionStatus;

        if (vnp_ResponseCode === '00') {
          if (vnp_TransactionStatus === '00') {
            // Thanh toán thành công -> Cập nhật trạng thái
            const vnp_TransactionNo = result.vnp_TransactionNo || 'CRON_RECONCILE';
            const vnp_BankCode = result.vnp_BankCode || 'NCB';
            const vnp_CardType = result.vnp_CardType || 'ATM';
            const vnp_PayDate = result.vnp_PayDate || getGMT7DateString(new Date());

            await dbClient.query(
              `UPDATE orders
               SET payment_status = 'paid',
                   status = 'confirmed',
                   vnpay_transaction_no = $1,
                   vnpay_bank_code = $2,
                   vnpay_card_type = $3,
                   vnpay_pay_date = TO_TIMESTAMP($4, 'YYYYMMDDHHMISS'),
                   updated_at = NOW()
               WHERE id = $5::uuid`,
              [vnp_TransactionNo, vnp_BankCode, vnp_CardType, vnp_PayDate, currentOrder.id]
            );

            await dbClient.query(
              `UPDATE sub_orders
               SET status = 'confirmed',
                   updated_at = NOW()
               WHERE order_id = $1::uuid`,
              [currentOrder.id]
            );

            await dbClient.query(
              `INSERT INTO vnpay_transactions (
                 order_id, txn_ref, transaction_no, command, amount,
                 response_code, transaction_status, bank_code, card_type,
                 raw_request, raw_response
               ) VALUES ($1::uuid, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
              [
                currentOrder.id,
                currentOrder.order_code,
                vnp_TransactionNo,
                'querydr',
                parseFloat(currentOrder.total_amount),
                vnp_ResponseCode,
                vnp_TransactionStatus,
                vnp_BankCode,
                vnp_CardType,
                JSON.stringify({ orderCode: currentOrder.order_code }),
                JSON.stringify(result),
              ]
            );

            await dbClient.query('COMMIT');
            console.log(`[cron-reconcile]: Order ${currentOrder.order_code} successfully updated to paid via reconcile.`);
          } else if (vnp_TransactionStatus === '02' || vnp_ResponseCode === '91' || result.vnp_Message === 'Transaction not found') {
            // Thanh toán thất bại hoặc Giao dịch không tồn tại (quá hạn thanh toán) -> Hủy đơn hàng và hoàn kho
            await dbClient.query(
              `UPDATE orders
               SET payment_status = 'failed',
                   status = 'cancelled',
                   updated_at = NOW()
               WHERE id = $1::uuid`,
              [currentOrder.id]
            );

            await dbClient.query(
              `UPDATE sub_orders
               SET status = 'cancelled',
                   updated_at = NOW()
               WHERE order_id = $1::uuid`,
              [currentOrder.id]
            );

            const itemsRes = await dbClient.query(
              `SELECT product_id, quantity FROM order_items WHERE order_id = $1::uuid`,
              [currentOrder.id]
            );

            for (const item of itemsRes.rows) {
              await dbClient.query(
                `UPDATE products
                 SET stock = stock + $1
                 WHERE id = $2::uuid`,
                [item.quantity, item.product_id]
              );
            }

            await dbClient.query(
              `INSERT INTO vnpay_transactions (
                 order_id, txn_ref, transaction_no, command, amount,
                 response_code, transaction_status, bank_code, card_type,
                 raw_request, raw_response
               ) VALUES ($1::uuid, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
              [
                currentOrder.id,
                currentOrder.order_code,
                result.vnp_TransactionNo || 'N/A',
                'querydr',
                parseFloat(currentOrder.total_amount),
                vnp_ResponseCode,
                vnp_TransactionStatus || 'failed',
                result.vnp_BankCode || 'N/A',
                result.vnp_CardType || 'N/A',
                JSON.stringify({ orderCode: currentOrder.order_code }),
                JSON.stringify(result),
              ]
            );

            await dbClient.query('COMMIT');
            console.log(`[cron-reconcile]: Order ${currentOrder.order_code} marked failed/cancelled via reconcile.`);
          } else {
            // Các trạng thái khác (đang xử lý hoặc chưa thanh toán nhưng chưa hết hạn)
            await dbClient.query('ROLLBACK');
          }
        } else {
          // Lỗi gọi API đối soát -> Thử lại lần sau
          await dbClient.query('ROLLBACK');
        }
      } catch (err) {
        await dbClient.query('ROLLBACK');
        console.error(`[cron-reconcile]: Error reconciling order ${order.order_code}:`, err);
      } finally {
        dbClient.release();
      }
    }
  } catch (error) {
    console.error('[cron-reconcile]: Error in reconcileVNPAYOrders master task:', error);
  } finally {
    client.release();
  }
};

/**
 * Khởi tạo các Cron Jobs khi ứng dụng khởi chạy
 */
export const initCronJobs = () => {
  // Chạy hàng ngày vào lúc nửa đêm (00:00)
  cron.schedule('0 0 * * *', async () => {
    console.log('[cron]: Running scheduled daily escrow auto-release...');
    try {
      await autoReleaseEscrow();
    } catch (e) {
      console.error('[cron]: Scheduled escrow release failed:', e);
    }
  });

  // Chạy đối soát giao dịch VNPAY mỗi 30 phút một lần
  cron.schedule('*/30 * * * *', async () => {
    console.log('[cron]: Running VNPAY order reconciliation...');
    try {
      await reconcileVNPAYOrders();
    } catch (e) {
      console.error('[cron]: VNPAY reconciliation failed:', e);
    }
  });

  console.log('[cron]: Cron jobs initialized successfully.');
};
