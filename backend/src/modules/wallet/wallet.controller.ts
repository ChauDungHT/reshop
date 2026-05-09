import { Request, Response } from 'express';
import { sendResponse } from '../../shared/response';
import db from '../../core/db';
import { IWalletTransaction } from '../../shared/types/models';
import { IPaginatedData } from '../../shared/types/api';

/**
 * Lấy số dư ví hiện tại của người dùng
 */
export const getBalance = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      sendResponse(res, 401, false, 'Unauthorized');
      return;
    }

    const result = await db.query('SELECT wallet_balance FROM users WHERE id = $1', [userId]);
    if (result.rows.length === 0) {
      sendResponse(res, 404, false, 'User not found');
      return;
    }

    console.log(`[wallet]: Fetch Balance Successful - 200 - User ID: ${userId}`);
    sendResponse<{ balance: number }>(res, 200, true, 'Balance retrieved successfully', {
      balance: parseFloat(result.rows[0].wallet_balance)
    });
  } catch (err) {
    console.error('Error getBalance:', err);
    sendResponse(res, 500, false, 'Internal Server Error');
  }
};

/**
 * Nạp tiền vào ví (Giả lập)
 */
export const topup = async (req: Request, res: Response): Promise<void> => {
  const client = await db.pool.connect();
  try {
    const userId = req.user?.id;
    const { amount } = req.body;

    if (!userId) {
      sendResponse(res, 401, false, 'Unauthorized');
      return;
    }

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      console.log(`[wallet]: Topup Failed - 400 - Invalid amount: ${amount}`);
      sendResponse<null>(res, 400, false, 'Amount must be a positive number', null);
      return;
    }

    await client.query('BEGIN');

    // 1. Cập nhật số dư người dùng
    const userUpdateQuery = `
      UPDATE users 
      SET wallet_balance = wallet_balance + $1 
      WHERE id = $2 
      RETURNING wallet_balance
    `;
    const userUpdateResult = await client.query(userUpdateQuery, [numAmount, userId]);
    
    if (userUpdateResult.rows.length === 0) {
      await client.query('ROLLBACK');
      sendResponse(res, 404, false, 'User not found');
      return;
    }

    const newBalance = parseFloat(userUpdateResult.rows[0].wallet_balance);

    // 2. Ghi log giao dịch
    const transactionQuery = `
      INSERT INTO wallet_transactions (user_id, amount, type, balance_after)
      VALUES ($1, $2, $3, $4)
      RETURNING id, created_at
    `;
    const transactionResult = await client.query(transactionQuery, [userId, numAmount, 'deposit', newBalance]);

    await client.query('COMMIT');

    console.log(`[wallet]: Topup Successful - 200 - User ID: ${userId}, Amount: ${numAmount}`);
    sendResponse<{ transaction_id: string; new_balance: number; created_at: string; }>(res, 200, true, 'Topup successful', {
      transaction_id: transactionResult.rows[0].id,
      new_balance: newBalance,
      created_at: transactionResult.rows[0].created_at
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error topup:', err);
    sendResponse(res, 500, false, 'Internal Server Error');
  } finally {
    client.release();
  }
};

/**
 * Lấy lịch sử giao dịch ví (Phân trang)
 */
export const getHistory = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      sendResponse(res, 401, false, 'Unauthorized');
      return;
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const offset = (page - 1) * limit;

    const countQuery = 'SELECT COUNT(*) FROM wallet_transactions WHERE user_id = $1';
    const countResult = await db.query(countQuery, [userId]);
    const total = parseInt(countResult.rows[0].count);

    const historyQuery = `
      SELECT id, amount, type, ref_id, balance_after, created_at
      FROM wallet_transactions
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT $2 OFFSET $3
    `;
    const result = await db.query(historyQuery, [userId, limit, offset]);

    console.log(`[wallet]: Fetch History Successful - 200 - User ID: ${userId}, Page: ${page}`);
    sendResponse<IPaginatedData<IWalletTransaction>>(res, 200, true, 'Transaction history retrieved successfully', {
      items: result.rows as IWalletTransaction[],
      total,
      page,
      limit,
      total_pages: Math.ceil(total / limit)
    });
  } catch (err) {
    console.error('Error getHistory:', err);
    sendResponse(res, 500, false, 'Internal Server Error');
  }
};
/**
 * VNPay: Tạo URL thanh toán nạp tiền
 */
export const createVNPayPayment = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { amount } = req.body;

    if (!amount || amount < 10000) {
      sendResponse(res, 400, false, 'Số tiền nạp tối thiểu là 10.000₫');
      return;
    }

    // TODO: Thực hiện logic tạo URL VNPay tại đây
    // Tạm thời trả về thông báo để sẵn sàng tích hợp
    console.log(`[wallet-vnpay]: Initiate payment request for User: ${userId}, Amount: ${amount}`);
    
    sendResponse<{ payment_url: string }>(res, 200, true, 'Sẵn sàng tích hợp VNPay', {
      payment_url: 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html?placeholder=true'
    });
  } catch (err) {
    console.error('Error createVNPayPayment:', err);
    sendResponse(res, 500, false, 'Internal Server Error');
  }
};

/**
 * VNPay: Xử lý Callback (IPN)
 */
export const vnpayCallback = async (req: Request, res: Response): Promise<void> => {
  try {
    // VNPay gửi các tham số qua query string
    const vnp_params = req.query;
    
    console.log('[wallet-vnpay]: Received callback from VNPay', vnp_params);

    // TODO: 
    // 1. Kiểm tra Checksum (Secure Hash)
    // 2. Kiểm tra trạng thái giao dịch (vnp_ResponseCode === '00')
    // 3. Kiểm tra số tiền
    // 4. Cập nhật ví người dùng
    
    // Trả về kết quả cho VNPay theo đúng định dạng IPN
    res.status(200).json({ RspCode: '00', Message: 'Confirm Success' });
  } catch (err) {
    console.error('Error vnpayCallback:', err);
    res.status(500).json({ RspCode: '99', Message: 'Internal Error' });
  }
};
