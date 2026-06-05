import { Request, Response } from 'express';
import { sendResponse } from '../../shared/response';
import db from '../../core/db';
import { IOrder } from '../../shared/types/models';

type ShippingAddress = { shipping_method?: string } & Record<string, unknown>;

function resolveShippingFee(shipping_address: ShippingAddress | undefined): number {
  const m = shipping_address?.shipping_method;
  if (m === 'fast') return 50000;
  return 20000;
}

/** [Risk 3] Last vendor gets remainder so sum(platform_discount) == effective voucher (capped by merchandise). */
function allocatePlatformDiscount(
  vendorSubtotals: Map<string, number>,
  voucherAmountRaw: number
): Map<string, number> {
  const entries = [...vendorSubtotals.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  const out = new Map<string, number>();
  for (const [vid] of entries) out.set(vid, 0);
  if (entries.length === 0) return out;

  const totalSub = entries.reduce((s, [, v]) => s + v, 0);
  if (totalSub <= 0) return out;

  const voucherAmount = Math.max(0, Number(voucherAmountRaw) || 0);
  const effective = Math.min(voucherAmount, totalSub);
  if (effective <= 0) return out;

  let allocated = 0;
  for (let i = 0; i < entries.length; i++) {
    const [vendorId, sub] = entries[i];
    if (i === entries.length - 1) {
      out.set(vendorId, effective - allocated);
    } else {
      const d = Math.floor((effective * sub) / totalSub);
      out.set(vendorId, d);
      allocated += d;
    }
  }
  return out;
}

function netSubOrderPayable(row: {
  subtotal: string | number;
  shipping_fee: string | number;
  vendor_discount: string | number;
  platform_discount: string | number;
}): number {
  return (
    parseFloat(String(row.subtotal)) +
    parseFloat(String(row.shipping_fee)) -
    parseFloat(String(row.vendor_discount)) -
    parseFloat(String(row.platform_discount))
  );
}

/**
 * Quy trình Checkout Atomic — parent order + sub_orders + order_items (Phase 3)
 */
export const processCheckout = async (req: Request, res: Response): Promise<void> => {
  const client = await db.pool.connect();
  try {
    const userId = req.user?.id;
    const { items, shipping_address, payment_method, platform_voucher_amount } = req.body as {
      items: Array<{ product_id: string; quantity: number }>;
      shipping_address?: ShippingAddress;
      payment_method?: string;
      platform_voucher_amount?: number;
    };

    if (!userId) {
      sendResponse(res, 401, false, 'Unauthorized');
      return;
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      sendResponse(res, 400, false, 'Cart is empty');
      return;
    }

    const shippingFeeTotal = resolveShippingFee(shipping_address);

    await client.query('BEGIN');

    type LockedLine = {
      product_id: string;
      vendor_id: string;
      name: string;
      quantity: number;
      price: number;
    };

    const lockedLines: LockedLine[] = [];

    for (const item of items) {
      const productRes = await client.query(
        `SELECT p.id, p.name, p.price, p.stock, p.vendor_id
         FROM products p
         WHERE p.id = $1
         FOR UPDATE`,
        [item.product_id]
      );

      if (productRes.rows.length === 0) {
        throw new Error(`PRODUCT_NOT_FOUND:${item.product_id}`);
      }

      const product = productRes.rows[0];
      if (product.stock < item.quantity) {
        throw new Error(`ERR_OUT_OF_STOCK:${product.name}`);
      }

      lockedLines.push({
        product_id: product.id,
        vendor_id: product.vendor_id,
        name: product.name,
        quantity: item.quantity,
        price: parseFloat(product.price),
      });
    }

    const vendorSubtotals = new Map<string, number>();
    for (const line of lockedLines) {
      const add = line.price * line.quantity;
      vendorSubtotals.set(line.vendor_id, (vendorSubtotals.get(line.vendor_id) ?? 0) + add);
    }

    const platformByVendor = allocatePlatformDiscount(vendorSubtotals, platform_voucher_amount ?? 0);

    const sortedVendorIds = [...vendorSubtotals.keys()].sort((a, b) => a.localeCompare(b));

    for (const line of lockedLines) {
      await client.query(`UPDATE products SET stock = stock - $1 WHERE id = $2`, [line.quantity, line.product_id]);
    }

    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const randomSuffix = Math.random().toString(36).substring(2, 7).toUpperCase();
    const orderCode = `ORD-${dateStr}-${randomSuffix}`;

    let grandTotal = 0;
    const subOrderPlans: Array<{
      vendor_id: string;
      sub_order_code: string;
      subtotal: number;
      shipping_fee: number;
      vendor_discount: number;
      platform_discount: number;
      lines: LockedLine[];
    }> = [];

    sortedVendorIds.forEach((vendorId, idx) => {
      const subtotal = vendorSubtotals.get(vendorId) ?? 0;
      const shipping_fee = idx === 0 ? shippingFeeTotal : 0;
      const vendor_discount = 0;
      const platform_discount = platformByVendor.get(vendorId) ?? 0;
      const lines = lockedLines.filter((l) => l.vendor_id === vendorId);
      const subLabel = idx < 26 ? String.fromCharCode(65 + idx) : `V${idx + 1}`;
      const sub_order_code = `${orderCode}-${subLabel}`;
      const lineNet = subtotal + shipping_fee - vendor_discount - platform_discount;
      grandTotal += lineNet;
      subOrderPlans.push({
        vendor_id: vendorId,
        sub_order_code,
        subtotal,
        shipping_fee,
        vendor_discount,
        platform_discount,
        lines,
      });
    });

    const orderRes = await client.query(
      `INSERT INTO orders (buyer_id, order_code, total_amount, status, shipping_address)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id`,
      [userId, orderCode, grandTotal, 'pending', JSON.stringify(shipping_address || {})]
    );
    const orderId = orderRes.rows[0].id;

    if (payment_method === 'wallet') {
      const userRes = await client.query(`SELECT wallet_balance FROM users WHERE id = $1 FOR UPDATE`, [userId]);
      const balance = parseFloat(userRes.rows[0].wallet_balance);
      if (balance < grandTotal) {
        throw new Error('ERR_INSUFFICIENT_BALANCE');
      }
      const newBalance = balance - grandTotal;
      await client.query(`UPDATE users SET wallet_balance = $1 WHERE id = $2`, [newBalance, userId]);
      await client.query(
        `INSERT INTO wallet_transactions (user_id, amount, type, ref_id, balance_after)
         VALUES ($1, $2, $3, $4, $5)`,
        [userId, -grandTotal, 'payment', orderId, newBalance]
      );
    }

    for (const plan of subOrderPlans) {
      const soRes = await client.query(
        `INSERT INTO sub_orders (
           order_id, vendor_id, sub_order_code, status,
           subtotal, shipping_fee, vendor_discount, platform_discount, refunded_amount
         ) VALUES ($1, $2, $3, 'pending', $4, $5, $6, $7, 0)
         RETURNING id`,
        [
          orderId,
          plan.vendor_id,
          plan.sub_order_code,
          plan.subtotal,
          plan.shipping_fee,
          plan.vendor_discount,
          plan.platform_discount,
        ]
      );
      const subOrderId = soRes.rows[0].id;
      for (const line of plan.lines) {
        await client.query(
          `INSERT INTO order_items (order_id, sub_order_id, product_id, quantity, price_snapshot)
           VALUES ($1, $2, $3, $4, $5)`,
          [orderId, subOrderId, line.product_id, line.quantity, line.price]
        );
      }
    }

    const productIds = items.map((i) => i.product_id);
    await client.query(`DELETE FROM cart_items WHERE user_id = $1 AND product_id = ANY($2::uuid[])`, [
      userId,
      productIds,
    ]);

    await client.query('COMMIT');

    console.log(`[checkout]: Order Successful - ${orderCode} - User ID: ${userId}`);
    sendResponse<{ order_id: string; order_code: string; total_amount: number }>(res, 201, true, 'Order placed successfully', {
      order_id: orderId,
      order_code: orderCode,
      total_amount: grandTotal,
    });
  } catch (err: unknown) {
    try {
      await client.query('ROLLBACK');
    } catch (rbErr) {
      console.error('Rollback failed:', rbErr);
    }
    const message = err instanceof Error ? err.message : String(err);
    console.error('Error during checkout:', message);

    if (message.startsWith('ERR_OUT_OF_STOCK')) {
      const productName = message.split(':')[1];
      sendResponse(res, 400, false, `Sản phẩm "${productName}" đã hết hàng.`);
    } else if (message === 'ERR_INSUFFICIENT_BALANCE') {
      sendResponse(res, 400, false, 'Số dư ví không đủ để thanh toán.');
    } else if (message.startsWith('PRODUCT_NOT_FOUND')) {
      sendResponse(res, 404, false, 'Một số sản phẩm không tồn tại.');
    } else {
      console.error(err);
      sendResponse(res, 500, false, 'Internal Server Error: ' + message);
    }
  } finally {
    client.release();
  }
};

/**
 * Lấy danh sách đơn hàng của tôi — hierarchy sub_orders → items + flat items (UI)
 */
export const getMyOrders = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      sendResponse(res, 401, false, 'Unauthorized');
      return;
    }
    const query = `
      SELECT o.*,
        (
          SELECT COALESCE(json_agg(so_data ORDER BY so_data.sub_order_code), '[]'::json)
          FROM (
            SELECT
              so.id,
              so.order_id,
              so.vendor_id,
              so.sub_order_code,
              so.status,
              so.subtotal,
              so.shipping_fee,
              so.vendor_discount,
              so.platform_discount,
              so.refunded_amount,
              so.tracking_number,
              so.created_at,
              so.updated_at,
              v.store_name,
              (
                SELECT COALESCE(json_agg(oi_data ORDER BY oi_data.created_at), '[]'::json)
                FROM (
                  SELECT
                    oi.id,
                    oi.order_id,
                    oi.sub_order_id,
                    oi.product_id,
                    oi.quantity,
                    oi.price_snapshot,
                    oi.created_at,
                    p.name AS product_name,
                    p.image_urls
                  FROM order_items oi
                  JOIN products p ON oi.product_id = p.id
                  WHERE oi.sub_order_id = so.id
                ) oi_data
              ) AS items
            FROM sub_orders so
            LEFT JOIN vendors v ON so.vendor_id = v.id
            WHERE so.order_id = o.id
          ) so_data
        ) AS sub_orders,
        (
          SELECT COALESCE(json_agg(items ORDER BY items.created_at), '[]'::json)
          FROM (
            SELECT oi.*, p.name AS product_name, p.image_urls
            FROM order_items oi
            JOIN products p ON oi.product_id = p.id
            WHERE oi.order_id = o.id
          ) items
        ) AS items
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

async function orderWasPaidWithWallet(client: { query: typeof db.pool.query }, orderId: string, buyerId: string): Promise<boolean> {
  const r = await client.query(
    `SELECT 1 FROM wallet_transactions
     WHERE ref_id = $1::uuid AND user_id = $2::uuid AND type = 'payment'
     LIMIT 1`,
    [orderId, buyerId]
  );
  return r.rows.length > 0;
}

/**
 * Hủy đơn hàng — chỉ khi mọi sub_order đang pending; hoàn order.total_amount nếu đã thanh toán ví
 */
export const cancelOrder = async (req: Request, res: Response): Promise<void> => {
  const userId = req.user?.id;
  const orderId = typeof req.params.id === 'string' ? req.params.id : req.params.id?.[0];
  if (!userId || !orderId) {
    sendResponse(res, 401, false, 'Unauthorized');
    return;
  }

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    const orderRes = await client.query(
      `SELECT o.id, o.status, o.buyer_id, o.total_amount
       FROM orders o
       WHERE o.id = $1
       FOR UPDATE`,
      [orderId]
    );

    if (orderRes.rows.length === 0) {
      throw new Error('ORDER_NOT_FOUND');
    }

    const order = orderRes.rows[0];
    if (order.buyer_id !== userId) {
      throw new Error('FORBIDDEN');
    }

    const subsRes = await client.query(
      `SELECT id, status FROM sub_orders WHERE order_id = $1 FOR UPDATE`,
      [orderId]
    );
    if (subsRes.rows.length === 0) {
      throw new Error('NO_SUB_ORDERS');
    }
    const allPending = subsRes.rows.every((r: { status: string }) => r.status === 'pending');
    if (!allPending) {
      throw new Error('CANNOT_CANCEL');
    }

    const itemsRes = await client.query(`SELECT product_id, quantity FROM order_items WHERE order_id = $1`, [orderId]);
    for (const item of itemsRes.rows) {
      await client.query(`UPDATE products SET stock = stock + $1 WHERE id = $2`, [item.quantity, item.product_id]);
    }

    const refundTotal = parseFloat(order.total_amount);
    if (refundTotal > 0 && (await orderWasPaidWithWallet(client, orderId, userId))) {
      const userRes = await client.query(`SELECT wallet_balance FROM users WHERE id = $1 FOR UPDATE`, [userId]);
      const newBalance = parseFloat(userRes.rows[0].wallet_balance) + refundTotal;
      await client.query(`UPDATE users SET wallet_balance = $1 WHERE id = $2`, [newBalance, userId]);
      await client.query(
        `INSERT INTO wallet_transactions (user_id, amount, type, ref_id, balance_after)
         VALUES ($1, $2, $3, $4, $5)`,
        [userId, refundTotal, 'refund', orderId, newBalance]
      );
    }

    await client.query(`UPDATE sub_orders SET status = 'cancelled', updated_at = NOW() WHERE order_id = $1`, [orderId]);
    await client.query(`UPDATE orders SET status = 'cancelled', updated_at = NOW() WHERE id = $1`, [orderId]);

    await client.query('COMMIT');
    sendResponse<null>(res, 200, true, 'Order cancelled successfully', null);
  } catch (err: unknown) {
    await client.query('ROLLBACK');
    const message = err instanceof Error ? err.message : String(err);
    if (message === 'ORDER_NOT_FOUND') sendResponse(res, 404, false, 'Không tìm thấy đơn hàng');
    else if (message === 'FORBIDDEN') sendResponse(res, 403, false, 'Bạn không có quyền thực hiện');
    else if (message === 'CANNOT_CANCEL' || message === 'NO_SUB_ORDERS') {
      sendResponse(res, 400, false, 'Chỉ có thể hủy khi tất cả đơn theo shop đang chờ xử lý.');
    } else sendResponse(res, 500, false, 'Internal Server Error');
  } finally {
    client.release();
  }
};

/**
 * POST /checkout/sub-orders/:id/cancel — hủy một sub_order pending; hoàn tiền phần shop; Risk 5-B
 */
export const cancelSubOrder = async (req: Request, res: Response): Promise<void> => {
  const userId = req.user?.id;
  const subOrderId = typeof req.params.id === 'string' ? req.params.id : req.params.id?.[0];
  if (!userId || !subOrderId) {
    sendResponse(res, 401, false, 'Unauthorized');
    return;
  }

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    const soRes = await client.query(
      `SELECT so.*, o.buyer_id AS buyer_id, o.id AS parent_order_id
       FROM sub_orders so
       JOIN orders o ON o.id = so.order_id
       WHERE so.id = $1
       FOR UPDATE OF so, o`,
      [subOrderId]
    );

    if (soRes.rows.length === 0) {
      throw new Error('SUB_ORDER_NOT_FOUND');
    }

    const row = soRes.rows[0];
    if (row.buyer_id !== userId) {
      throw new Error('FORBIDDEN');
    }
    if (row.status !== 'pending') {
      throw new Error('CANNOT_CANCEL');
    }

    const refund = netSubOrderPayable(row);
    if (refund < 0) {
      throw new Error('INVALID_AMOUNT');
    }

    const itemsRes = await client.query(`SELECT product_id, quantity FROM order_items WHERE sub_order_id = $1`, [
      subOrderId,
    ]);
    for (const item of itemsRes.rows) {
      await client.query(`UPDATE products SET stock = stock + $1 WHERE id = $2`, [item.quantity, item.product_id]);
    }

    await client.query(
      `UPDATE sub_orders
       SET status = 'cancelled',
           refunded_amount = refunded_amount + $1,
           updated_at = NOW()
       WHERE id = $2`,
      [refund, subOrderId]
    );

    if (refund > 0 && (await orderWasPaidWithWallet(client, row.parent_order_id, userId))) {
      const userRes = await client.query(`SELECT wallet_balance FROM users WHERE id = $1 FOR UPDATE`, [userId]);
      const newBalance = parseFloat(userRes.rows[0].wallet_balance) + refund;
      await client.query(`UPDATE users SET wallet_balance = $1 WHERE id = $2`, [newBalance, userId]);
      await client.query(
        `INSERT INTO wallet_transactions (user_id, amount, type, ref_id, balance_after)
         VALUES ($1, $2, $3, $4, $5)`,
        [userId, refund, 'refund', subOrderId, newBalance]
      );
    }

    const remaining = await client.query(
      `SELECT COUNT(*)::int AS cnt FROM sub_orders WHERE order_id = $1 AND status <> 'cancelled'`,
      [row.parent_order_id]
    );
    if (remaining.rows[0].cnt === 0) {
      await client.query(`UPDATE orders SET status = 'cancelled', updated_at = NOW() WHERE id = $1`, [
        row.parent_order_id,
      ]);
    }

    await client.query('COMMIT');
    sendResponse<{ refunded: number }>(res, 200, true, 'Đã hủy đơn theo shop.', { refunded: refund });
  } catch (err: unknown) {
    await client.query('ROLLBACK');
    const message = err instanceof Error ? err.message : String(err);
    if (message === 'SUB_ORDER_NOT_FOUND') sendResponse(res, 404, false, 'Không tìm thấy đơn con.');
    else if (message === 'FORBIDDEN') sendResponse(res, 403, false, 'Bạn không có quyền thực hiện');
    else if (message === 'CANNOT_CANCEL') sendResponse(res, 400, false, 'Chỉ có thể hủy khi đơn shop đang chờ xử lý.');
    else if (message === 'INVALID_AMOUNT') sendResponse(res, 400, false, 'Số tiền hoàn không hợp lệ.');
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

    const check = await db.query(`SELECT status, buyer_id FROM orders WHERE id = $1`, [id]);
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

    await db.query(`UPDATE orders SET shipping_address = $1, updated_at = NOW() WHERE id = $2`, [
      JSON.stringify(shipping_address),
      id,
    ]);

    sendResponse<null>(res, 200, true, 'Cập nhật địa chỉ thành công', null);
  } catch (err) {
    sendResponse(res, 500, false, 'Internal Server Error');
  }
};
