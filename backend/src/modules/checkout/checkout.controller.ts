import { Request, Response } from 'express';
import { sendResponse } from '../../shared/response';
import db from '../../core/db';
import { IOrder } from '../../shared/types/models';

/**
 * Quy trình Checkout Atomic
 */
export const processCheckout = async (req: Request, res: Response): Promise<void> => {
  const client = await db.pool.connect();
  try {
    const userId = req.user?.id;
    const { items, shipping_address, payment_method } = req.body; 
    // items: Array of { product_id, quantity }

    if (!userId) {
      sendResponse(res, 401, false, 'Unauthorized');
      return;
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      sendResponse(res, 400, false, 'Cart is empty');
      return;
    }

    await client.query('BEGIN');

    let totalAmount = 0;
    const orderItemsData = [];

    // 1. Lock & Check Stock for each item
    for (const item of items) {
      const productQuery = 'SELECT id, name, price, stock FROM products WHERE id = $1 FOR UPDATE';
      const productRes = await client.query(productQuery, [item.product_id]);

      if (productRes.rows.length === 0) {
        throw new Error(`PRODUCT_NOT_FOUND:${item.product_id}`);
      }

      const product = productRes.rows[0];
      if (product.stock < item.quantity) {
        throw new Error(`ERR_OUT_OF_STOCK:${product.name}`);
      }

      // Update Stock
      await client.query('UPDATE products SET stock = stock - $1 WHERE id = $2', [item.quantity, item.product_id]);

      const subtotal = parseFloat(product.price) * item.quantity;
      totalAmount += subtotal;

      orderItemsData.push({
        product_id: item.product_id,
        quantity: item.quantity,
        price_snapshot: product.price
      });
    }

    // 2. Handle Payment (nếu là ví)
    if (payment_method === 'wallet') {
      const userQuery = 'SELECT wallet_balance FROM users WHERE id = $1 FOR UPDATE';
      const userRes = await client.query(userQuery, [userId]);
      const balance = parseFloat(userRes.rows[0].wallet_balance);

      if (balance < totalAmount) {
        throw new Error('ERR_INSUFFICIENT_BALANCE');
      }

      // Update Wallet
      const newBalance = balance - totalAmount;
      await client.query('UPDATE users SET wallet_balance = $1 WHERE id = $2', [newBalance, userId]);

      // Log Transaction
      await client.query(
        'INSERT INTO wallet_transactions (user_id, amount, type, balance_after) VALUES ($1, $2, $3, $4)',
        [userId, -totalAmount, 'payment', newBalance]
      );
    }

    // 3. Create Order
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const randomSuffix = Math.random().toString(36).substring(2, 7).toUpperCase();
    const orderCode = `ORD-${dateStr}-${randomSuffix}`;

    const orderQuery = `
      INSERT INTO orders (buyer_id, order_code, total_amount, status, shipping_address)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id
    `;
    const orderRes = await client.query(orderQuery, [
      userId, 
      orderCode, 
      totalAmount, 
      'pending', 
      JSON.stringify(shipping_address || {})
    ]);
    const orderId = orderRes.rows[0].id;

    // 4. Create Order Items
    for (const oi of orderItemsData) {
      await client.query(
        'INSERT INTO order_items (order_id, product_id, quantity, price_snapshot) VALUES ($1, $2, $3, $4)',
        [orderId, oi.product_id, oi.quantity, oi.price_snapshot]
      );
    }

    // 5. Cleanup Cart
    const productIds = items.map(i => i.product_id);
    await client.query(
      'DELETE FROM cart_items WHERE user_id = $1 AND product_id = ANY($2::uuid[])',
      [userId, productIds]
    );

    await client.query('COMMIT');

    console.log(`[checkout]: Order Successful - ${orderCode} - User ID: ${userId}`);
    sendResponse<{ order_id: string; order_code: string; total_amount: number; }>(res, 201, true, 'Order placed successfully', {
      order_id: orderId,
      order_code: orderCode,
      total_amount: totalAmount
    });

  } catch (err: any) {
    await client.query('ROLLBACK');
    console.error('Error during checkout:', err.message);

    if (err.message.startsWith('ERR_OUT_OF_STOCK')) {
      const productName = err.message.split(':')[1];
      sendResponse(res, 400, false, `Sản phẩm "${productName}" đã hết hàng.`);
    } else if (err.message === 'ERR_INSUFFICIENT_BALANCE') {
      sendResponse(res, 400, false, 'Số dư ví không đủ để thanh toán.');
    } else if (err.message.startsWith('PRODUCT_NOT_FOUND')) {
      sendResponse(res, 404, false, 'Một số sản phẩm không tồn tại.');
    } else {
      sendResponse(res, 500, false, 'Internal Server Error');
    }
  } finally {
    client.release();
  }
};

/**
 * Lấy danh sách đơn hàng của tôi
 */
export const getMyOrders = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const query = `
      SELECT o.*, 
             (SELECT json_agg(items) FROM (
               SELECT oi.*, p.name as product_name, p.image_urls
               FROM order_items oi
               JOIN products p ON oi.product_id = p.id
               WHERE oi.order_id = o.id
             ) items) as items
      FROM orders o
      WHERE o.buyer_id = $1
      ORDER BY o.created_at DESC
    `;
    const result = await db.query(query, [userId]);
    sendResponse<IOrder[]>(res, 200, true, 'Orders fetched successfully', result.rows as IOrder[]);
  } catch (err) {
    console.error('Error getMyOrders:', err);
    sendResponse(res, 500, false, 'Internal Server Error');
  }
};

/**
 * Hủy đơn hàng
 */
export const cancelOrder = async (req: Request, res: Response): Promise<void> => {
  const client = await db.pool.connect();
  try {
    const userId = req.user?.id;
    const { id } = req.params;

    await client.query('BEGIN');

    // 1. Kiểm tra đơn hàng và trạng thái
    const orderRes = await client.query(
      'SELECT status, buyer_id FROM orders WHERE id = $1 FOR UPDATE',
      [id]
    );

    if (orderRes.rows.length === 0) {
      throw new Error('ORDER_NOT_FOUND');
    }

    const order = orderRes.rows[0];
    if (order.buyer_id !== userId) {
      throw new Error('FORBIDDEN');
    }

    if (order.status !== 'pending' && order.status !== 'confirmed') {
      throw new Error('CANNOT_CANCEL');
    }

    // 2. Hoàn lại tồn kho
    const itemsRes = await client.query('SELECT product_id, quantity FROM order_items WHERE order_id = $1', [id]);
    for (const item of itemsRes.rows) {
      await client.query('UPDATE products SET stock = stock + $1 WHERE id = $2', [item.quantity, item.product_id]);
    }

    // 3. Cập nhật trạng thái
    await client.query('UPDATE orders SET status = \'cancelled\', updated_at = NOW() WHERE id = $1', [id]);

    await client.query('COMMIT');
    sendResponse<null>(res, 200, true, 'Order cancelled successfully', null);
  } catch (err: any) {
    await client.query('ROLLBACK');
    if (err.message === 'ORDER_NOT_FOUND') sendResponse(res, 404, false, 'Không tìm thấy đơn hàng');
    else if (err.message === 'FORBIDDEN') sendResponse(res, 403, false, 'Bạn không có quyền thực hiện');
    else if (err.message === 'CANNOT_CANCEL') sendResponse(res, 400, false, 'Không thể hủy đơn hàng ở trạng thái này');
    else sendResponse(res, 500, false, 'Internal Server Error');
  } finally {
    client.release();
  }
};

/**
 * Cập nhật thông tin đơn hàng (Chỉ địa chỉ khi đang pending)
 */
export const updateOrderAddress = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;
    const { shipping_address } = req.body;

    const check = await db.query('SELECT status, buyer_id FROM orders WHERE id = $1', [id]);
    if (check.rows.length === 0) {
      sendResponse(res, 404, false, 'Không tìm thấy đơn hàng');
      return;
    }

    if (check.rows[0].buyer_id !== userId) {
      sendResponse(res, 403, false, 'Forbidden');
      return;
    }

    if (check.rows[0].status !== 'pending') {
      sendResponse(res, 400, false, 'Chỉ có thể chỉnh sửa đơn hàng đang chờ xử lý');
      return;
    }

    await db.query(
      'UPDATE orders SET shipping_address = $1, updated_at = NOW() WHERE id = $2',
      [JSON.stringify(shipping_address), id]
    );

    sendResponse<null>(res, 200, true, 'Cập nhật địa chỉ thành công', null);
  } catch (err) {
    sendResponse(res, 500, false, 'Internal Server Error');
  }
};
