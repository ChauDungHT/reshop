import { Request, Response } from 'express';
import { sendResponse } from '../../shared/response';
import db from '../../core/db';
import { IQAItem } from '../../shared/types/models';
import { calculateVendorFee } from '../../shared/fee-calculator';

/**
 * Gửi đánh giá sản phẩm
 */
export const createReview = async (req: Request, res: Response): Promise<void> => {
  const client = await db.pool.connect();
  try {
    const userId = req.user?.id;
    const { order_id, product_id, stars, comment, images } = req.body;

    if (!userId) {
      sendResponse(res, 401, false, 'Unauthorized');
      return;
    }

    await client.query('BEGIN');

    // 1. Điều kiện: sub_order chứa line item đó phải delivered
    const orderCheck = await client.query(
      `SELECT so.id, so.feedback_status, so.subtotal, so.shipping_fee, so.vendor_discount, so.platform_discount, so.vendor_id
       FROM sub_orders so
       JOIN order_items oi ON oi.sub_order_id = so.id
       JOIN orders o ON o.id = so.order_id
       WHERE so.order_id = $1::uuid AND o.buyer_id = $2::uuid AND so.status = 'delivered' AND oi.product_id = $3::uuid
       FOR UPDATE OF so`,
      [order_id, userId, product_id]
    );

    if (orderCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      sendResponse(res, 403, false, 'Bạn chỉ có thể đánh giá sản phẩm sau khi đơn hàng đã được giao.');
      return;
    }

    const subOrder = orderCheck.rows[0];

    // 1.5. Kiểm tra không cho phép Vendor tự đánh giá sản phẩm của mình
    const productCheck = await client.query('SELECT vendor_id FROM products WHERE id = $1', [product_id]);
    if (productCheck.rows.length > 0 && productCheck.rows[0].vendor_id === userId) {
      await client.query('ROLLBACK');
      sendResponse(res, 403, false, 'Nhà bán hàng không được phép tự đánh giá sản phẩm của chính mình.');
      return;
    }

    // 2. Kiểm tra đã review chưa
    const existingReview = await client.query(
      'SELECT id FROM reviews WHERE user_id = $1 AND product_id = $2 AND order_id = $3',
      [userId, product_id, order_id]
    );

    if (existingReview.rows.length > 0) {
      await client.query('ROLLBACK');
      sendResponse(res, 400, false, 'Bạn đã gửi đánh giá cho sản phẩm này trong đơn hàng này rồi.');
      return;
    }

    // 3. Insert Review
    const imagesJson = JSON.stringify((images || []).slice(0, 3));
    await client.query(
      'INSERT INTO reviews (order_id, product_id, user_id, stars, comment, images) VALUES ($1, $2, $3, $4, $5, $6)',
      [order_id, product_id, userId, stars, comment, imagesJson]
    );

    // 4. Nếu feedback_status là awaiting_feedback, thực hiện giải phóng tiền sớm
    if (subOrder.feedback_status === 'awaiting_feedback') {
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

        // Tính toán lại số tiền thực nhận
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

          // Cập nhật feedback_status của sub_order thành 'reviewed'
          await client.query(
            `UPDATE sub_orders 
             SET feedback_status = 'reviewed', 
                 updated_at = NOW() 
             WHERE id = $1::uuid`,
            [subOrder.id]
          );

          console.log(`[after-sales]: Early escrow release for sub_order: ${subOrder.id}, netAmount: ${netAmount}`);
        }
      }
    }

    await client.query('COMMIT');
    console.log(`[after-sales]: Review Created - User: ${userId}, Product: ${product_id}`);
    sendResponse<null>(res, 201, true, 'Cảm ơn bạn đã gửi đánh giá!', null);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error createReview:', err);
    sendResponse<null>(res, 500, false, 'Internal Server Error', null);
  } finally {
    client.release();
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
    sendResponse<null>(res, 201, true, 'Câu hỏi của bạn đã được gửi tới Shop.', null);
  } catch (err) {
    console.error('Error askQuestion:', err);
    sendResponse<null>(res, 500, false, 'Internal Server Error', null);
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
    sendResponse<null>(res, 200, true, 'Đã xóa câu hỏi.', null);
  } catch (err) {
    console.error('Error deleteQuestion:', err);
    sendResponse<null>(res, 500, false, 'Internal Server Error', null);
  }
};

/**
 * Yêu cầu trả hàng
 */
export const createReturnRequest = async (req: Request, res: Response): Promise<void> => {
  const client = await db.pool.connect();
  try {
    const userId = req.user?.id;
    const { order_item_id, reason, description, images } = req.body;

    if (!userId) {
      sendResponse(res, 401, false, 'Unauthorized');
      return;
    }

    await client.query('BEGIN');

    // 1. sub_order của line item phải delivered; 7 ngày tính từ cập nhật sub_order
    const orderCheck = await client.query(
      `SELECT so.status, so.updated_at, oi.quantity, oi.sub_order_id
       FROM order_items oi
       JOIN orders o ON o.id = oi.order_id
       JOIN sub_orders so ON so.id = oi.sub_order_id
       WHERE oi.id = $1::uuid AND o.buyer_id = $2::uuid
       FOR UPDATE OF so`,
      [order_item_id, userId]
    );

    if (orderCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      sendResponse(res, 404, false, 'Không tìm thấy thông tin đơn hàng.');
      return;
    }

    const { status, updated_at, sub_order_id: subOrderId } = orderCheck.rows[0];
    if (status !== 'delivered') {
      await client.query('ROLLBACK');
      sendResponse(res, 400, false, 'Chỉ có thể yêu cầu trả hàng khi đơn theo shop đã giao (delivered).');
      return;
    }

    const deliveryDate = new Date(updated_at);
    const now = new Date();
    const diffDays = Math.ceil((now.getTime() - deliveryDate.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays > 7) {
      await client.query('ROLLBACK');
      sendResponse(res, 400, false, 'Đã quá thời hạn 7 ngày để yêu cầu trả hàng.');
      return;
    }

    // 1.5 Kiểm tra xem đã có yêu cầu trả hàng cho item này chưa
    const existingRequest = await client.query(
      "SELECT id FROM return_requests WHERE order_item_id = $1 AND status != 'rejected'",
      [order_item_id]
    );

    if (existingRequest.rows.length > 0) {
      await client.query('ROLLBACK');
      sendResponse(res, 400, false, 'Bạn đã gửi yêu cầu trả hàng cho sản phẩm này rồi. Vui lòng chờ xử lý.');
      return;
    }

    // 2. Insert Return Request
    await client.query(
      'INSERT INTO return_requests (order_item_id, reason, description, images) VALUES ($1, $2, $3, $4)',
      [order_item_id, reason, description, JSON.stringify(images || [])]
    );

    // 3. Cập nhật feedback_status của sub_order thành 'disputed'
    await client.query(
      `UPDATE sub_orders 
       SET feedback_status = 'disputed', 
           updated_at = NOW() 
       WHERE id = $1::uuid`,
      [subOrderId]
    );

    await client.query('COMMIT');
    console.log(`[after-sales]: Return Request Created - User: ${userId}, SubOrder: ${subOrderId} locked to 'disputed'`);
    sendResponse<null>(res, 201, true, 'Yêu cầu trả hàng đã được gửi và đang chờ duyệt.', null);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error createReturnRequest:', err);
    sendResponse<null>(res, 500, false, 'Internal Server Error', null);
  } finally {
    client.release();
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
      // Khi từ chối yêu cầu trả hàng từ phía Vendor: 
      // Cập nhật trạng thái return_request thành 'rejected'.
      // Lưu ý: Khách hàng vẫn có quyền khiếu nại (escalate) lên Admin, 
      // do đó tiền vẫn được giữ ở trạng thái 'disputed' trong pending_balance.
      await client.query('BEGIN');
      await client.query(
        "UPDATE return_requests SET status = $1, updated_at = NOW() WHERE id = $2::uuid",
        [status, id]
      );
      await client.query('COMMIT');
      sendResponse(res, 200, true, 'Đã cập nhật trạng thái yêu cầu.');
      return;
    }

    await client.query('BEGIN');

    // 1. Get info & Verify Ownership
    const vendorId = req.user?.vendor_id;
    const userRole = req.user?.role;

    const reqRes = await client.query(
      `SELECT rr.id, oi.product_id, oi.quantity, oi.price_snapshot, oi.sub_order_id, o.buyer_id, p.vendor_id
       FROM return_requests rr
       JOIN order_items oi ON rr.order_item_id = oi.id
       JOIN products p ON oi.product_id = p.id
       JOIN orders o ON oi.order_id = o.id
       WHERE rr.id = $1::uuid
       FOR UPDATE OF rr`,
      [id]
    );

    if (reqRes.rows.length === 0) {
      sendResponse(res, 404, false, 'Không tìm thấy yêu cầu trả hàng.');
      await client.query('ROLLBACK');
      return;
    }

    const requestData = reqRes.rows[0];

    if (userRole === 'vendor' && requestData.vendor_id !== vendorId) {
      sendResponse(res, 403, false, 'Bạn không có quyền xử lý yêu cầu trả hàng này.');
      await client.query('ROLLBACK');
      return;
    }

    const { product_id, quantity, price_snapshot, buyer_id, sub_order_id, vendor_id: itemVendorId } = requestData;
    if (!sub_order_id) {
      sendResponse(res, 400, false, 'Dòng đơn không gắn sub_order; không thể hoàn tiền theo chính sách hiện tại.');
      await client.query('ROLLBACK');
      return;
    }

    const refundAmount = parseFloat(String(price_snapshot)) * quantity;

    // Khóa các bản ghi liên quan
    await client.query(`SELECT id FROM sub_orders WHERE id = $1::uuid FOR UPDATE`, [sub_order_id]);
    await client.query(`SELECT id FROM users WHERE id = $1::uuid FOR UPDATE`, [buyer_id]);

    // 1. Cập nhật trạng thái return_request thành 'approved'
    await client.query(`UPDATE return_requests SET status = 'approved', updated_at = NOW() WHERE id = $1::uuid`, [id]);

    // 2. Hoàn tiền vào ví khả dụng của Người mua
    const buyerWalletRes = await client.query(
      `UPDATE users 
       SET wallet_balance = wallet_balance + $1 
       WHERE id = $2::uuid 
       RETURNING wallet_balance`,
      [refundAmount, buyer_id]
    );
    const buyerBalanceAfter = parseFloat(buyerWalletRes.rows[0].wallet_balance);

    // 3. Ghi log giao dịch 'refund' cho Người mua
    await client.query(
      `INSERT INTO wallet_transactions (user_id, amount, type, ref_id, balance_after)
       VALUES ($1::uuid, $2, 'refund', $3::uuid, $4)`,
      [buyer_id, refundAmount, sub_order_id, buyerBalanceAfter]
    );

    // 4. Lấy thông tin user_id và commission_rate của Vendor để trừ pending_balance
    const vendorQuery = await client.query(
      `SELECT user_id, COALESCE(commission_rate, 5.0) as commission_rate 
       FROM vendors 
       WHERE id = $1::uuid`,
      [itemVendorId]
    );

    if (vendorQuery.rows.length > 0) {
      const { user_id: vendorUserId, commission_rate: commissionRate } = vendorQuery.rows[0];
      const rate = parseFloat(commissionRate);
      const refundNetAmount = parseFloat((refundAmount * (1 - rate / 100)).toFixed(2));

      // Trừ pending_balance của Vendor
      const vendorUserRes = await client.query(
        `UPDATE users 
         SET pending_balance = GREATEST(pending_balance - $1, 0) 
         WHERE id = $2::uuid 
         RETURNING wallet_balance`,
         [refundNetAmount, vendorUserId]
      );

      if (vendorUserRes.rows.length > 0) {
        const vendorBalanceAfter = parseFloat(vendorUserRes.rows[0].wallet_balance);

        // Ghi log giao dịch âm pending_release cho Vendor
        await client.query(
          `INSERT INTO wallet_transactions (user_id, amount, type, ref_id, balance_after)
           VALUES ($1::uuid, $2, 'pending_release', $3::uuid, $4)`,
          [vendorUserId, -refundNetAmount, sub_order_id, vendorBalanceAfter]
        );
      }
    }

    // 5. Cập nhật refunded_amount và feedback_status trên sub_orders
    await client.query(
      `UPDATE sub_orders 
       SET refunded_amount = refunded_amount + $1, 
           feedback_status = 'disputed',
           updated_at = NOW() 
       WHERE id = $2::uuid`,
      [refundAmount, sub_order_id]
    );

    // 6. Hoàn lại kho hàng
    await client.query(`UPDATE products SET stock = stock + $1 WHERE id = $2::uuid`, [quantity, product_id]);

    await client.query('COMMIT');
    console.log(`[after-sales]: Return Approved & Refunded - Request ID: ${id}`);
    sendResponse<null>(res, 200, true, 'Đã duyệt trả hàng và hoàn tiền thành công.', null);
  } catch (err: any) {
    await client.query('ROLLBACK');
    console.error('Error approveReturn:', err.message);
    sendResponse<null>(res, 500, false, 'Internal Server Error', null);
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
    sendResponse<IQAItem[]>(res, 200, true, 'Vendor QA list retrieved', result.rows as IQAItem[]);
  } catch (err) {
    console.error('Error getVendorQA:', err);
    sendResponse<null>(res, 500, false, 'Internal Server Error', null);
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
    sendResponse<null>(res, 200, true, 'Đã gửi câu trả lời thành công.', null);
  } catch (err) {
    console.error('Error answerQuestion:', err);
    sendResponse<null>(res, 500, false, 'Internal Server Error', null);
  }
};

