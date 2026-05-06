import { Request, Response } from 'express';
import { sendResponse } from '../../shared/response';
import db from '../../core/db';

/**
 * Gửi đánh giá sản phẩm
 */
export const createReview = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { order_id, product_id, stars, comment, images } = req.body;

    if (!userId) {
      sendResponse(res, 401, false, 'Unauthorized');
      return;
    }

    // 1. Kiểm tra điều kiện: Đã mua SP và đơn hàng ở trạng thái 'delivered'
    const orderCheck = await db.query(
      `SELECT o.id 
       FROM orders o 
       JOIN order_items oi ON o.id = oi.order_id 
       WHERE o.id = $1 AND o.buyer_id = $2 AND oi.product_id = $3 AND o.status = 'delivered'`,
      [order_id, userId, product_id]
    );

    if (orderCheck.rows.length === 0) {
      sendResponse(res, 403, false, 'Bạn chỉ có thể đánh giá sản phẩm sau khi đơn hàng đã được giao.');
      return;
    }

    // 1.5. Kiểm tra không cho phép Vendor tự đánh giá sản phẩm của mình
    const productCheck = await db.query('SELECT vendor_id FROM products WHERE id = $1', [product_id]);
    if (productCheck.rows.length > 0 && productCheck.rows[0].vendor_id === userId) {
      sendResponse(res, 403, false, 'Nhà bán hàng không được phép tự đánh giá sản phẩm của chính mình.');
      return;
    }

    // 2. Kiểm tra đã review chưa
    const existingReview = await db.query(
      'SELECT id FROM reviews WHERE user_id = $1 AND product_id = $2 AND order_id = $3',
      [userId, product_id, order_id]
    );

    if (existingReview.rows.length > 0) {
      sendResponse(res, 400, false, 'Bạn đã gửi đánh giá cho sản phẩm này trong đơn hàng này rồi.');
      return;
    }

    // 3. Insert Review
    const imagesJson = JSON.stringify((images || []).slice(0, 3));
    await db.query(
      'INSERT INTO reviews (order_id, product_id, user_id, stars, comment, images) VALUES ($1, $2, $3, $4, $5, $6)',
      [order_id, product_id, userId, stars, comment, imagesJson]
    );

    console.log(`[after-sales]: Review Created - User: ${userId}, Product: ${product_id}`);
    sendResponse(res, 201, true, 'Cảm ơn bạn đã gửi đánh giá!');
  } catch (err) {
    console.error('Error createReview:', err);
    sendResponse(res, 500, false, 'Internal Server Error');
  }
};

/**
 * Đặt câu hỏi Q&A
 */
export const askQuestion = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { product_id, question } = req.body;

    if (!userId) {
      sendResponse(res, 401, false, 'Unauthorized');
      return;
    }

    await db.query(
      'INSERT INTO qa (product_id, user_id, question) VALUES ($1, $2, $3)',
      [product_id, userId, question]
    );

    console.log(`[after-sales]: Question Asked - User: ${userId}, Product: ${product_id}`);
    sendResponse(res, 201, true, 'Câu hỏi của bạn đã được gửi tới Shop.');
  } catch (err) {
    console.error('Error askQuestion:', err);
    sendResponse(res, 500, false, 'Internal Server Error');
  }
};

/**
 * Xóa câu hỏi
 */
export const deleteQuestion = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const userRole = req.user?.role;
    const { id } = req.params;

    if (!userId) {
      sendResponse(res, 401, false, 'Unauthorized');
      return;
    }

    // Kiểm tra quyền
    const checkRes = await db.query('SELECT user_id FROM qa WHERE id = $1', [id]);
    if (checkRes.rows.length === 0) {
      sendResponse(res, 404, false, 'Câu hỏi không tồn tại.');
      return;
    }

    if (checkRes.rows[0].user_id !== userId && userRole !== 'admin') {
      sendResponse(res, 403, false, 'Bạn không có quyền xóa câu hỏi này.');
      return;
    }

    await db.query('DELETE FROM qa WHERE id = $1', [id]);
    sendResponse(res, 200, true, 'Đã xóa câu hỏi.');
  } catch (err) {
    console.error('Error deleteQuestion:', err);
    sendResponse(res, 500, false, 'Internal Server Error');
  }
};

/**
 * Yêu cầu trả hàng
 */
export const createReturnRequest = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { order_item_id, reason, description, images } = req.body;

    if (!userId) {
      sendResponse(res, 401, false, 'Unauthorized');
      return;
    }

    // 1. Kiểm tra đơn hàng: delivered và chưa quá 7 ngày
    const orderCheck = await db.query(
      `SELECT o.status, o.updated_at, oi.quantity 
       FROM orders o 
       JOIN order_items oi ON o.id = oi.order_id 
       WHERE oi.id = $1 AND o.buyer_id = $2`,
      [order_item_id, userId]
    );

    if (orderCheck.rows.length === 0) {
      sendResponse(res, 404, false, 'Không tìm thấy thông tin đơn hàng.');
      return;
    }

    const { status, updated_at } = orderCheck.rows[0];
    if (status !== 'delivered') {
      sendResponse(res, 400, false, 'Chỉ đơn hàng đã giao thành công mới có thể yêu cầu trả hàng.');
      return;
    }

    const deliveryDate = new Date(updated_at);
    const now = new Date();
    const diffDays = Math.ceil((now.getTime() - deliveryDate.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays > 7) {
      sendResponse(res, 400, false, 'Đã quá thời hạn 7 ngày để yêu cầu trả hàng.');
      return;
    }

    // 2. Insert Return Request
    await db.query(
      'INSERT INTO return_requests (order_item_id, reason, description, images) VALUES ($1, $2, $3, $4)',
      [order_item_id, reason, description, JSON.stringify(images || [])]
    );

    console.log(`[after-sales]: Return Request Created - User: ${userId}`);
    sendResponse(res, 201, true, 'Yêu cầu trả hàng đã được gửi và đang chờ duyệt.');
  } catch (err) {
    console.error('Error createReturnRequest:', err);
    sendResponse(res, 500, false, 'Internal Server Error');
  }
};

/**
 * Duyệt trả hàng (Admin/Vendor)
 */
export const approveReturn = async (req: Request, res: Response): Promise<void> => {
  const client = await db.pool.connect();
  try {
    const { id } = req.params;
    const { status } = req.body; // 'approved' hoặc 'rejected'

    if (status !== 'approved') {
      await db.query('UPDATE return_requests SET status = $1, updated_at = NOW() WHERE id = $2', [status, id]);
      sendResponse(res, 200, true, 'Đã cập nhật trạng thái yêu cầu.');
      return;
    }

    await client.query('BEGIN');

    // 1. Get info
    const reqRes = await client.query(
      `SELECT rr.id, oi.product_id, oi.quantity, oi.price_snapshot, o.buyer_id, o.id as order_id
       FROM return_requests rr
       JOIN order_items oi ON rr.order_item_id = oi.id
       JOIN orders o ON oi.order_id = o.id
       WHERE rr.id = $1 FOR UPDATE`,
      [id]
    );

    if (reqRes.rows.length === 0) throw new Error('Return request not found');

    const { product_id, quantity, price_snapshot, buyer_id } = reqRes.rows[0];
    const refundAmount = parseFloat(price_snapshot) * quantity;

    // 2. Cập nhật trạng thái
    await client.query('UPDATE return_requests SET status = \'approved\', updated_at = NOW() WHERE id = $1', [id]);

    // 3. Hoàn tiền vào ví
    await client.query('UPDATE users SET wallet_balance = wallet_balance + $1 WHERE id = $2', [refundAmount, buyer_id]);
    
    // Log Wallet Transaction
    await client.query(
      `INSERT INTO wallet_transactions (user_id, amount, type, ref_id, balance_after) 
       VALUES ($1, $2, $3, $4, (SELECT wallet_balance FROM users WHERE id = $1))`,
      [buyer_id, refundAmount, 'refund', id]
    );

    // 4. Cộng lại tồn kho
    await client.query('UPDATE products SET stock = stock + $1 WHERE id = $2', [quantity, product_id]);

    await client.query('COMMIT');
    console.log(`[after-sales]: Return Approved & Refunded - Request ID: ${id}`);
    sendResponse(res, 200, true, 'Đã duyệt trả hàng và hoàn tiền thành công.');
  } catch (err: any) {
    await client.query('ROLLBACK');
    console.error('Error approveReturn:', err.message);
    sendResponse(res, 500, false, 'Internal Server Error');
  } finally {
    client.release();
  }
};

/**
 * Lấy danh sách câu hỏi liên quan đến sản phẩm của Vendor
 */
export const getVendorQA = async (req: Request, res: Response): Promise<void> => {
  try {
    const vendorId = req.user?.vendor_id;
    const { status } = req.query; // 'answered', 'pending', 'all'

    const queryParams: any[] = [vendorId];
    let queryConditions = 'p.vendor_id = $1';

    if (status === 'answered') {
      queryConditions += ' AND q.answer IS NOT NULL';
    } else if (status === 'pending') {
      queryConditions += ' AND q.answer IS NULL';
    }

    const query = `
      SELECT q.*, p.name as product_name, u.name as buyer_name
      FROM qa q
      JOIN products p ON q.product_id = p.id
      JOIN users u ON q.user_id = u.id
      WHERE ${queryConditions}
      ORDER BY q.created_at DESC
    `;

    const result = await db.query(query, queryParams);
    sendResponse(res, 200, true, 'Vendor QA list retrieved', result.rows);
  } catch (err) {
    console.error('Error getVendorQA:', err);
    sendResponse(res, 500, false, 'Internal Server Error');
  }
};

/**
 * Trả lời câu hỏi Q&A (Vendor)
 */
export const answerQuestion = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { answer } = req.body;
    const vendorId = req.user?.vendor_id;
    const userId = req.user?.id;

    if (!answer || answer.trim().length === 0) {
      sendResponse(res, 400, false, 'Câu trả lời không được để trống.');
      return;
    }

    // 1. Kiểm tra quyền sở hữu sản phẩm của câu hỏi
    const checkRes = await db.query(
      `SELECT p.vendor_id FROM qa q
       JOIN products p ON q.product_id = p.id
       WHERE q.id = $1`,
      [id]
    );

    if (checkRes.rows.length === 0) {
      sendResponse(res, 404, false, 'Câu hỏi không tồn tại.');
      return;
    }

    if (checkRes.rows[0].vendor_id !== vendorId) {
      sendResponse(res, 403, false, 'Bạn không có quyền trả lời câu hỏi này.');
      return;
    }

    // 2. Cập nhật câu trả lời
    await db.query(
      `UPDATE qa SET 
        answer = $1, 
        answered_at = NOW(), 
        answered_by = $2 
       WHERE id = $3`,
      [answer, vendorId, id]
    );

    console.log(`[after-sales]: Question Answered - QA ID: ${id}`);
    sendResponse(res, 200, true, 'Đã gửi câu trả lời thành công.');
  } catch (err) {
    console.error('Error answerQuestion:', err);
    sendResponse(res, 500, false, 'Internal Server Error');
  }
};

