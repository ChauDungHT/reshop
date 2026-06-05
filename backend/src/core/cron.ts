import cron from 'node-cron';
import db from './db';
import { calculateVendorFee } from '../shared/fee-calculator';

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
  console.log('[cron]: Cron jobs initialized successfully.');
};
