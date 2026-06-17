import { Request, Response } from 'express';
import db from '../../core/db';
import { verifyPaymentSignature } from './vnpay.utils';

/**
 * Xử lý IPN callback từ VNPAY (Server-to-Server)
 */
export const handleVNPAYIPN = async (req: Request, res: Response): Promise<void> => {
  console.log('[vnpay-ipn]: Received callback query:', req.query);

  const queryParams = req.query as Record<string, string>;

  // 1. Xác minh chữ ký bảo mật
  const isValidSignature = verifyPaymentSignature(queryParams);
  if (!isValidSignature) {
    console.error('[vnpay-ipn]: Invalid signature.');
    res.status(200).json({ RspCode: '97', Message: 'Invalid signature' });
    return;
  }

  // 2. Trích xuất thông tin giao dịch
  const orderCode = queryParams['vnp_TxnRef'];
  const amountCents = parseFloat(queryParams['vnp_Amount']);
  const vnp_ResponseCode = queryParams['vnp_ResponseCode'];
  const vnp_TransactionStatus = queryParams['vnp_TransactionStatus'];
  const vnp_TransactionNo = queryParams['vnp_TransactionNo'];
  const vnp_BankCode = queryParams['vnp_BankCode'];
  const vnp_CardType = queryParams['vnp_CardType'];
  const vnp_PayDate = queryParams['vnp_PayDate']; // Định dạng: YYYYMMDDHHmmss

  if (!orderCode || isNaN(amountCents)) {
    res.status(200).json({ RspCode: '99', Message: 'Input required data' });
    return;
  }

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    // Kiểm tra xem đây có phải là giao dịch nạp tiền ví (WL-...) không
    if (orderCode.startsWith('WL-')) {
      const vnpayTotal = amountCents / 100;

      // Tìm thông tin giao dịch khởi tạo đã lưu trong vnpay_transactions để lấy userId
      const txnRes = await client.query(
        `SELECT id, response_code, raw_request 
         FROM vnpay_transactions 
         WHERE txn_ref = $1 
         FOR UPDATE`,
        [orderCode]
      );

      if (txnRes.rows.length === 0) {
        console.error(`[vnpay-ipn-wallet]: Wallet topup transaction not found: ${orderCode}`);
        await client.query('ROLLBACK');
        res.status(200).json({ RspCode: '01', Message: 'Transaction not found' });
        return;
      }

      const txnRow = txnRes.rows[0];

      // Nếu response_code đã có giá trị (không phải null), nghĩa là đã xử lý giao dịch này rồi
      if (txnRow.response_code !== null) {
        console.log(`[vnpay-ipn-wallet]: Wallet topup already processed: ${orderCode}`);
        await client.query('COMMIT');
        res.status(200).json({ RspCode: '02', Message: 'Transaction already confirmed' });
        return;
      }

      const rawReq = txnRow.raw_request || {};
      const userId = rawReq.userId;

      if (!userId) {
        console.error(`[vnpay-ipn-wallet]: UserId not found in raw_request for transaction: ${orderCode}`);
        await client.query('ROLLBACK');
        res.status(200).json({ RspCode: '01', Message: 'User not found' });
        return;
      }

      const isSuccess = vnp_ResponseCode === '00' && vnp_TransactionStatus === '00';
      if (isSuccess) {
        // Cập nhật số dư người dùng
        const userUpdateRes = await client.query(
          `UPDATE users 
           SET wallet_balance = wallet_balance + $1 
           WHERE id = $2::uuid 
           RETURNING wallet_balance`,
          [vnpayTotal, userId]
        );

        if (userUpdateRes.rows.length === 0) {
          await client.query('ROLLBACK');
          res.status(200).json({ RspCode: '01', Message: 'User not found' });
          return;
        }

        const newBalance = parseFloat(userUpdateRes.rows[0].wallet_balance);

        // Ghi log giao dịch ví
        await client.query(
          `INSERT INTO wallet_transactions (user_id, amount, type, balance_after)
           VALUES ($1::uuid, $2, 'deposit', $3)`,
          [userId, vnpayTotal, newBalance]
        );

        // Cập nhật trạng thái vnpay_transactions
        await client.query(
          `UPDATE vnpay_transactions
           SET transaction_no = $1,
               response_code = $2,
               transaction_status = $3,
               bank_code = $4,
               card_type = $5,
               raw_response = $6
           WHERE id = $7`,
          [
            vnp_TransactionNo,
            vnp_ResponseCode,
            vnp_TransactionStatus,
            vnp_BankCode,
            vnp_CardType,
            JSON.stringify(queryParams),
            txnRow.id,
          ]
        );

        await client.query('COMMIT');
        console.log(`[vnpay-ipn-wallet]: Wallet topup successful for User: ${userId}, Amount: ${vnpayTotal}, Code: ${orderCode}`);
        res.status(200).json({ RspCode: '00', Message: 'Confirm Success' });
        return;
      } else {
        // Cập nhật trạng thái giao dịch thất bại vào vnpay_transactions
        await client.query(
          `UPDATE vnpay_transactions
           SET transaction_no = $1,
               response_code = $2,
               transaction_status = $3,
               bank_code = $4,
               card_type = $5,
               raw_response = $6
           WHERE id = $7`,
          [
            vnp_TransactionNo,
            vnp_ResponseCode,
            vnp_TransactionStatus,
            vnp_BankCode,
            vnp_CardType,
            JSON.stringify(queryParams),
            txnRow.id,
          ]
        );

        await client.query('COMMIT');
        console.log(`[vnpay-ipn-wallet]: Wallet topup failed for User: ${userId}, Code: ${orderCode}`);
        res.status(200).json({ RspCode: '00', Message: 'Confirm Success' });
        return;
      }
    }

    // 3. Khóa và lấy thông tin đơn hàng hiện tại
    const orderRes = await client.query(
      `SELECT id, order_code, total_amount, payment_status 
       FROM orders 
       WHERE order_code = $1 
       FOR UPDATE`,
      [orderCode]
    );

    if (orderRes.rows.length === 0) {
      console.error(`[vnpay-ipn]: Order not found for code: ${orderCode}`);
      await client.query('ROLLBACK');
      res.status(200).json({ RspCode: '01', Message: 'Order not found' });
      return;
    }

    const order = orderRes.rows[0];
    const orderTotal = parseFloat(order.total_amount);
    const vnpayTotal = amountCents / 100;

    // 4. Kiểm tra số tiền giao dịch
    if (Math.round(orderTotal) !== Math.round(vnpayTotal)) {
      console.error(`[vnpay-ipn]: Amount mismatch. Order: ${orderTotal}, VNPAY: ${vnpayTotal}`);
      await client.query('ROLLBACK');
      res.status(200).json({ RspCode: '04', Message: 'Invalid amount' });
      return;
    }

    // 5. Kiểm tra xem đơn hàng đã được xác nhận thanh toán trước đó chưa
    if (order.payment_status === 'paid') {
      console.log(`[vnpay-ipn]: Order already confirmed paid for code: ${orderCode}`);
      await client.query('COMMIT');
      res.status(200).json({ RspCode: '02', Message: 'Order already confirmed' });
      return;
    }

    // 6. Xử lý kết quả thanh toán từ VNPAY
    const isSuccess = vnp_ResponseCode === '00' && vnp_TransactionStatus === '00';

    if (isSuccess) {
      // Giao dịch thành công -> Cập nhật payment_status = 'paid' và chuyển orders/sub_orders sang 'confirmed'
      await client.query(
        `UPDATE orders
         SET payment_status = 'paid',
             status = 'confirmed',
             vnpay_transaction_no = $1,
             vnpay_bank_code = $2,
             vnpay_card_type = $3,
             vnpay_pay_date = TO_TIMESTAMP($4, 'YYYYMMDDHHMISS'),
             updated_at = NOW()
         WHERE id = $5`,
        [vnp_TransactionNo, vnp_BankCode, vnp_CardType, vnp_PayDate, order.id]
      );

      // Cập nhật trạng thái các đơn con sub_orders sang 'confirmed'
      await client.query(
        `UPDATE sub_orders 
         SET status = 'confirmed', 
             updated_at = NOW() 
         WHERE order_id = $1`,
        [order.id]
      );

      // Lưu log kiểm toán giao dịch thành công
      await client.query(
        `INSERT INTO vnpay_transactions (
           order_id, txn_ref, transaction_no, command, amount,
           response_code, transaction_status, bank_code, card_type,
           raw_request, raw_response
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
        [
          order.id,
          orderCode,
          vnp_TransactionNo,
          'pay',
          vnpayTotal,
          vnp_ResponseCode,
          vnp_TransactionStatus,
          vnp_BankCode,
          vnp_CardType,
          JSON.stringify({}),
          JSON.stringify(queryParams),
        ]
      );

      await client.query('COMMIT');
      console.log(`[vnpay-ipn]: Payment successful and order updated for ${orderCode}`);
      res.status(200).json({ RspCode: '00', Message: 'Confirm Success' });
      return;
    } else {
      // Giao dịch thất bại / Khách hủy thanh toán -> Đơn hàng hủy
      await client.query(
        `UPDATE orders
         SET payment_status = 'failed',
             status = 'cancelled',
             updated_at = NOW()
         WHERE id = $1`,
        [order.id]
      );

      await client.query(
        `UPDATE sub_orders 
         SET status = 'cancelled', 
             updated_at = NOW() 
         WHERE order_id = $1`,
        [order.id]
      );

      // Hoàn trả lại tồn kho sản phẩm do thanh toán không thành công
      const itemsRes = await client.query(
        `SELECT product_id, quantity 
         FROM order_items 
         WHERE order_id = $1`,
        [order.id]
      );

      for (const item of itemsRes.rows) {
        await client.query(
          `UPDATE products 
           SET stock = stock + $1 
           WHERE id = $2`,
          [item.quantity, item.product_id]
        );
      }

      // Lưu log kiểm toán giao dịch thất bại
      await client.query(
        `INSERT INTO vnpay_transactions (
           order_id, txn_ref, transaction_no, command, amount,
           response_code, transaction_status, bank_code, card_type,
           raw_request, raw_response
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
        [
          order.id,
          orderCode,
          vnp_TransactionNo,
          'pay',
          vnpayTotal,
          vnp_ResponseCode,
          vnp_TransactionStatus || vnp_ResponseCode,
          vnp_BankCode,
          vnp_CardType,
          JSON.stringify({}),
          JSON.stringify(queryParams),
        ]
      );

      await client.query('COMMIT');
      console.log(`[vnpay-ipn]: Payment failed and order cancelled for ${orderCode}`);
      res.status(200).json({ RspCode: '00', Message: 'Confirm Success' });
      return;
    }
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('[vnpay-ipn]: Exception occurred:', error);
    res.status(200).json({ RspCode: '99', Message: 'Internal Error' });
  } finally {
    client.release();
  }
};

/**
 * Xác minh chữ ký số redirect trả về frontend
 */
export const verifyPaymentReturn = async (req: Request, res: Response): Promise<void> => {
  const queryParams = req.query as Record<string, string>;

  const isValidSignature = verifyPaymentSignature(queryParams);
  if (!isValidSignature) {
    res.status(400).json({ success: false, message: 'Chữ ký số không hợp lệ' });
    return;
  }

  const vnp_ResponseCode = queryParams['vnp_ResponseCode'];
  const vnp_TxnRef = queryParams['vnp_TxnRef'];

  if (vnp_ResponseCode === '00') {
    res.status(200).json({
      success: true,
      message: 'Thanh toán thành công',
      data: { orderCode: vnp_TxnRef },
    });
  } else {
    res.status(200).json({
      success: false,
      message: 'Thanh toán không thành công',
      code: vnp_ResponseCode,
    });
  }
};
