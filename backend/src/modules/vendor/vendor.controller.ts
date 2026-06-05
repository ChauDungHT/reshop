import { Request, Response } from 'express';
import { sendResponse } from '../../shared/response';
import db from '../../core/db';
import puppeteer from 'puppeteer';
import handlebars from 'handlebars';
import fs from 'fs';
import path from 'path';
import { UploadRequest } from '../../shared/types/request';
import { IOrder, IReturnRequest, IProduct, IVendor } from '../../shared/types/models';
import { IPaginatedData } from '../../shared/types/api';
import { calculateVendorFee } from '../../shared/fee-calculator';

// Đăng ký helper cho handlebars
handlebars.registerHelper('formatCurrency', (value) => {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
});

/** Rollup parent `orders.status` from all `sub_orders.status` (Phase 4 / review.md). */
function rollupOrderStatusFromSubOrders(distinctStatuses: string[]): string {
  const list = [...new Set(distinctStatuses)];
  const all = (pred: (s: string) => boolean) => list.length > 0 && list.every(pred);
  const some = (pred: (s: string) => boolean) => list.some(pred);

  if (all((s) => s === 'cancelled')) return 'cancelled';
  if (all((s) => s === 'pending')) return 'pending';
  if (all((s) => s === 'delivered' || s === 'cancelled') && some((s) => s === 'delivered')) return 'delivered';
  if (some((s) => s === 'shipped')) return 'shipped';
  if (some((s) => s === 'processing')) return 'processing';
  if (some((s) => s === 'confirmed')) return 'confirmed';
  return 'pending';
}

/**
 * 1. GET /api/vendor/orders
 * Mỗi dòng = một sub_order của shop (join orders, order_items, products).
 */
export const getVendorOrders = async (req: Request, res: Response): Promise<void> => {
  try {
    const vendorId = req.user?.vendor_id;
    if (!vendorId) {
      sendResponse(res, 403, false, 'Vendor context required.', null);
      return;
    }

    const { status, page = '1', limit = '20' } = req.query;

    const queryParams: any[] = [vendorId];
    let statusClause = '';
    if (status && status !== 'all') {
      queryParams.push(status);
      statusClause = `AND so.status = $${queryParams.length}`;
    }

    const pageNum = parseInt(page as string, 10) || 1;
    const limitNum = parseInt(limit as string, 10) || 20;
    const offset = (pageNum - 1) * limitNum;

    const countQuery = `SELECT COUNT(*)::int AS c FROM sub_orders so WHERE so.vendor_id = $1::uuid ${statusClause}`;
    const countRes = await db.query(countQuery, queryParams);
    const total = countRes.rows[0].c;

    const limIdx = queryParams.length + 1;
    const offIdx = queryParams.length + 2;
    const dataQuery = `
      SELECT
        so.id,
        so.sub_order_code AS order_code,
        o.order_code AS parent_order_code,
        o.id AS parent_order_id,
        so.status AS sub_order_status,
        o.status AS parent_order_status,
        (so.subtotal + so.shipping_fee - so.vendor_discount - so.platform_discount) AS total_amount,
        so.tracking_number AS tracking_code,
        so.created_at,
        u.name AS buyer_name,
        (
          SELECT COALESCE(json_agg(item_row ORDER BY item_row.created_at), '[]'::json)
          FROM (
            SELECT oi.id, oi.order_id, oi.sub_order_id, oi.product_id, oi.quantity, oi.price_snapshot, oi.created_at,
                   p.name AS product_name, p.image_urls
            FROM order_items oi
            JOIN products p ON oi.product_id = p.id
            WHERE oi.sub_order_id = so.id
          ) item_row
        ) AS items
      FROM sub_orders so
      JOIN orders o ON o.id = so.order_id
      JOIN users u ON o.buyer_id = u.id
      WHERE so.vendor_id = $1::uuid ${statusClause}
      ORDER BY so.created_at DESC
      LIMIT $${limIdx} OFFSET $${offIdx}
    `;

    const result = await db.query(dataQuery, [...queryParams, limitNum, offset]);

    console.log(`[vendor]: Fetch Orders Successful - Vendor: ${vendorId}`);
    sendResponse<IPaginatedData<IOrder>>(res, 200, true, 'Vendor orders retrieved successfully', {
      items: result.rows as IOrder[],
      total,
      page: pageNum,
      limit: limitNum,
      total_pages: Math.ceil(total / limitNum),
    });
  } catch (err) {
    console.error('Error getVendorOrders:', err);
    sendResponse<null>(res, 500, false, 'Internal Server Error', null);
  }
};

/**
 * 2. PUT /api/vendor/orders/:id/status
 * `:id` = sub_order id. Risk 2: lock sub_order → lock parent order → read DISTINCT sub status → rollup orders.status.
 */
export const updateOrderStatus = async (req: Request, res: Response): Promise<void> => {
  const client = await db.pool.connect();
  try {
    const subOrderId = typeof req.params.id === 'string' ? req.params.id : req.params.id?.[0];
    const { status, tracking_code } = req.body as { status?: string; tracking_code?: string };
    const vendorId = req.user?.vendor_id;

    if (!subOrderId || !vendorId) {
      sendResponse(res, 400, false, 'Thiếu thông tin.');
      return;
    }

    await client.query('BEGIN');

    const subRes = await client.query(
      `SELECT so.id, so.status, so.order_id, so.subtotal, so.shipping_fee, so.vendor_discount, so.platform_discount
       FROM sub_orders so
       WHERE so.id = $1::uuid AND so.vendor_id = $2::uuid
       FOR UPDATE OF so`,
      [subOrderId, vendorId]
    );

    if (subRes.rows.length === 0) {
      await client.query('ROLLBACK');
      sendResponse(res, 404, false, 'Không tìm thấy đơn theo shop.');
      return;
    }

    const { order_id: orderId, status: currentSubStatus } = subRes.rows[0] as {
      order_id: string;
      status: string;
    };

    await client.query(`SELECT id, status FROM orders WHERE id = $1::uuid FOR UPDATE`, [orderId]);

    const myItemsRes = await client.query(
      `SELECT oi.id, oi.product_id, oi.quantity
       FROM order_items oi
       WHERE oi.sub_order_id = $1::uuid`,
      [subOrderId]
    );

    if (myItemsRes.rows.length === 0) {
      await client.query('ROLLBACK');
      sendResponse(res, 400, false, 'Đơn con không có dòng sản phẩm.');
      return;
    }

    const validTransitions: Record<string, string[]> = {
      pending: ['confirmed', 'cancelled'],
      confirmed: ['processing', 'shipped', 'cancelled'],
      processing: ['shipped', 'cancelled'],
      shipped: ['delivered'],
      delivered: [],
      cancelled: [],
    };

    if (!status || !validTransitions[currentSubStatus]?.includes(status)) {
      await client.query('ROLLBACK');
      sendResponse(res, 400, false, `Không thể chuyển từ "${currentSubStatus}" sang "${status || ''}".`);
      return;
    }

    if (status === 'shipped' && !tracking_code) {
      await client.query('ROLLBACK');
      sendResponse(res, 400, false, 'Cần có mã vận đơn (tracking_code) khi chuyển sang Đang giao.');
      return;
    }

    if (status === 'cancelled') {
      for (const item of myItemsRes.rows) {
        await client.query(`UPDATE products SET stock = stock + $1 WHERE id = $2`, [item.quantity, item.product_id]);
      }
    }

    if (status === 'delivered') {
      const vendorQuery = await client.query(
        `SELECT user_id 
         FROM vendors 
         WHERE id = $1::uuid`,
        [vendorId]
      );
      if (vendorQuery.rows.length === 0) {
        await client.query('ROLLBACK');
        sendResponse(res, 400, false, 'Không tìm thấy thông tin người bán.');
        return;
      }
      const { user_id: vendorUserId } = vendorQuery.rows[0];

      const subtotal = parseFloat(subRes.rows[0].subtotal);
      const shippingFee = parseFloat(subRes.rows[0].shipping_fee || 0);
      const vendorDiscount = parseFloat(subRes.rows[0].vendor_discount || 0);
      const platformDiscount = parseFloat(subRes.rows[0].platform_discount || 0);

      const grossAmount = subtotal + shippingFee - vendorDiscount - platformDiscount;
      const { netAmount } = await calculateVendorFee(client, vendorId, grossAmount);

      const userUpdateRes = await client.query(
        `UPDATE users 
         SET pending_balance = pending_balance + $1 
         WHERE id = $2::uuid 
         RETURNING wallet_balance`,
        [netAmount, vendorUserId]
      );
      if (userUpdateRes.rows.length === 0) {
        await client.query('ROLLBACK');
        sendResponse(res, 404, false, 'Không tìm thấy tài khoản người bán.');
        return;
      }
      const balanceAfter = parseFloat(userUpdateRes.rows[0].wallet_balance);

      await client.query(
        `INSERT INTO wallet_transactions (user_id, amount, type, ref_id, balance_after)
         VALUES ($1::uuid, $2, 'pending_credit', $3::uuid, $4)`,
        [vendorUserId, netAmount, subOrderId, balanceAfter]
      );

      await client.query(
        `UPDATE sub_orders
         SET status = $1,
             feedback_status = 'awaiting_feedback',
             delivered_at = NOW(),
             tracking_number = COALESCE(NULLIF(TRIM(COALESCE($2::text, '')), ''), tracking_number),
             updated_at = NOW()
         WHERE id = $3::uuid AND vendor_id = $4::uuid`,
        [status, tracking_code ?? null, subOrderId, vendorId]
      );
    } else {
      await client.query(
        `UPDATE sub_orders
         SET status = $1,
             tracking_number = COALESCE(NULLIF(TRIM(COALESCE($2::text, '')), ''), tracking_number),
             updated_at = NOW()
         WHERE id = $3::uuid AND vendor_id = $4::uuid`,
        [status, tracking_code ?? null, subOrderId, vendorId]
      );
    }

    const distinctRes = await client.query(`SELECT DISTINCT status FROM sub_orders WHERE order_id = $1::uuid`, [
      orderId,
    ]);
    const distinctStatuses = distinctRes.rows.map((r: { status: string }) => r.status);
    const newParentStatus = rollupOrderStatusFromSubOrders(distinctStatuses);

    await client.query(`UPDATE orders SET status = $1, updated_at = NOW() WHERE id = $2::uuid`, [newParentStatus, orderId]);

    await client.query('COMMIT');
    console.log(`[vendor]: Sub-order status updated - sub_order: ${subOrderId}, vendor: ${vendorId}, status: ${status}`);
    sendResponse<null>(res, 200, true, 'Cập nhật trạng thái đơn hàng thành công.', null);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error updateOrderStatus:', err);
    sendResponse<null>(res, 500, false, 'Internal Server Error', null);
  } finally {
    client.release();
  }
};


/**
 * 3. GET /api/vendor/returns
 */
export const getVendorReturns = async (req: Request, res: Response): Promise<void> => {
  try {
    const vendorId = req.user?.vendor_id;
    const { status } = req.query;

    const queryParams: any[] = [vendorId];
    const queryConditions: string[] = [`p.vendor_id = $1`];

    if (status && status !== 'all') {
      queryParams.push(status);
      queryConditions.push(`rr.status = $${queryParams.length}`);
    }

    const query = `
      SELECT rr.*, p.name as product_name, u.name as buyer_name, oi.price_snapshot, oi.quantity
      FROM return_requests rr
      JOIN order_items oi ON rr.order_item_id = oi.id
      JOIN products p ON oi.product_id = p.id
      JOIN orders o ON oi.order_id = o.id
      JOIN users u ON o.buyer_id = u.id
      WHERE ${queryConditions.join(' AND ')}
      ORDER BY rr.created_at DESC
    `;

    const result = await db.query(query, queryParams);
    
    // For now, return as paginated data but without real pagination metadata if not requested
    sendResponse<IPaginatedData<IReturnRequest>>(res, 200, true, 'Vendor return requests retrieved successfully', {
      items: result.rows as IReturnRequest[],
      total: result.rowCount ?? 0,
      page: 1,
      limit: result.rowCount ?? 0,
      total_pages: 1
    });
  } catch (err) {
    console.error('Error getVendorReturns:', err);
    sendResponse<null>(res, 500, false, 'Internal Server Error', null);
  }
};

/**
 * 4. PUT /api/vendor/returns/:id/approve (Transaction)
 */
export const approveReturnByVendor = async (req: Request, res: Response): Promise<void> => {
  const client = await db.pool.connect();
  try {
    const { id } = req.params;
    const vendorId = req.user?.vendor_id;

    await client.query('BEGIN');

    // Get info & Lock
    const reqRes = await client.query(
      `SELECT rr.id, rr.status, oi.product_id, oi.quantity, oi.price_snapshot, oi.sub_order_id, o.buyer_id, p.vendor_id
       FROM return_requests rr
       JOIN order_items oi ON rr.order_item_id = oi.id
       JOIN products p ON oi.product_id = p.id
       JOIN orders o ON oi.order_id = o.id
       WHERE rr.id = $1::uuid
       FOR UPDATE OF rr`,
      [id]
    );

    if (reqRes.rows.length === 0) throw new Error('NOT_FOUND');
    if (reqRes.rows[0].vendor_id !== vendorId) throw new Error('FORBIDDEN');
    if (reqRes.rows[0].status !== 'pending_vendor') throw new Error('ALREADY_PROCESSED');

    const row = reqRes.rows[0] as {
      product_id: string;
      quantity: number;
      price_snapshot: string | number;
      buyer_id: string;
      sub_order_id: string | null;
    };
    if (!row.sub_order_id) throw new Error('MISSING_SUB_ORDER');

    const refundAmount = parseFloat(String(row.price_snapshot)) * row.quantity;

    await client.query(`SELECT id FROM sub_orders WHERE id = $1::uuid FOR UPDATE`, [row.sub_order_id]);
    await client.query(`SELECT id FROM users WHERE id = $1::uuid FOR UPDATE`, [row.buyer_id]);

    await client.query(`UPDATE return_requests SET status = 'approved', updated_at = NOW() WHERE id = $1::uuid`, [id]);

    await client.query(`UPDATE users SET wallet_balance = wallet_balance + $1 WHERE id = $2::uuid`, [
      refundAmount,
      row.buyer_id,
    ]);

    // Get the updated wallet balance for logging
    const walletRes = await client.query(`SELECT wallet_balance FROM users WHERE id = $1`, [row.buyer_id]);
    const newBalance = parseFloat(walletRes.rows[0].wallet_balance);

    await client.query(
      `INSERT INTO wallet_transactions (user_id, amount, type, ref_id, balance_after)
       VALUES ($1, $2, $3, $4, $5)`,
      [row.buyer_id, refundAmount, 'refund', row.sub_order_id, newBalance]
    );

    await client.query(
      `UPDATE sub_orders SET refunded_amount = refunded_amount + $1, updated_at = NOW() WHERE id = $2::uuid`,
      [refundAmount, row.sub_order_id]
    );

    await client.query(`UPDATE products SET stock = stock + $1 WHERE id = $2::uuid`, [row.quantity, row.product_id]);

    await client.query('COMMIT');
    console.log(`[vendor]: Return Approved - ID: ${id}`);
    sendResponse<null>(res, 200, true, 'Đã duyệt trả hàng và hoàn tiền cho khách thành công.', null);
  } catch (err: any) {
    await client.query('ROLLBACK');
    console.error('Error approveReturnByVendor:', err.message);
    if (err.message === 'NOT_FOUND') sendResponse<null>(res, 404, false, 'Không tìm thấy yêu cầu.', null);
    else if (err.message === 'FORBIDDEN') sendResponse<null>(res, 403, false, 'Bạn không có quyền xử lý yêu cầu này.', null);
    else if (err.message === 'ALREADY_PROCESSED') sendResponse<null>(res, 400, false, 'Yêu cầu này đã được xử lý hoặc không hợp lệ.', null);
    else if (err.message === 'MISSING_SUB_ORDER') {
      sendResponse<null>(res, 400, false, 'Dòng đơn không gắn sub_order.', null);
    }
    else sendResponse<null>(res, 500, false, 'Internal Server Error', null);
  } finally {
    client.release();
  }
};

/**
 * 5. PUT /api/vendor/returns/:id/reject
 */
export const rejectReturnByVendor = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { reject_reason } = req.body;
    const vendorId = req.user?.vendor_id;

    if (!reject_reason || reject_reason.length < 20) {
      sendResponse(res, 400, false, 'Lý do từ chối phải có ít nhất 20 ký tự.');
      return;
    }

    const checkRes = await db.query(
      `SELECT p.vendor_id FROM return_requests rr 
       JOIN order_items oi ON rr.order_item_id = oi.id 
       JOIN products p ON oi.product_id = p.id WHERE rr.id = $1`,
      [id]
    );

    if (checkRes.rows.length === 0) {
      sendResponse(res, 404, false, 'Không tìm thấy yêu cầu.');
      return;
    }
    if (checkRes.rows[0].vendor_id !== vendorId) {
      sendResponse(res, 403, false, 'Unauthorized');
      return;
    }

    await db.query(
      `UPDATE return_requests SET status = 'rejected', reject_reason = $1, updated_at = NOW() WHERE id = $2`,
      [reject_reason, id]
    );

    console.log(`[vendor]: Return Rejected - ID: ${id}`);
    sendResponse<null>(res, 200, true, 'Đã từ chối yêu cầu trả hàng.', null);
  } catch (err) {
    console.error('Error rejectReturnByVendor:', err);
    sendResponse<null>(res, 500, false, 'Internal Server Error', null);
  }
};

/**
 * --- PRODUCT MANAGEMENT (Moved from Catalog) ---
 */

export const getVendorProducts = async (req: Request, res: Response): Promise<void> => {
  try {
    const vendor_id = req.user?.vendor_id;
    if (!vendor_id) {
      sendResponse(res, 403, false, 'Not authorized as a vendor');
      return;
    }

    const { status, q, page = '1', limit = '20' } = req.query;
    const queryParams: any[] = [vendor_id];
    const queryConditions: string[] = ["p.vendor_id = $1", "p.status != 'deleted'"];

    if (status && status !== 'all') {
      queryParams.push(status);
      queryConditions.push(`p.status = $${queryParams.length}`);
    }

    if (q) {
      queryParams.push(`%${q}%`);
      queryConditions.push(`(p.name ILIKE $${queryParams.length} OR p.description ILIKE $${queryParams.length})`);
    }

    const whereClause = `WHERE ${queryConditions.join(' AND ')}`;
    const pageNum = parseInt(page as string, 10) || 1;
    const limitNum = parseInt(limit as string, 10) || 20;
    const offset = (pageNum - 1) * limitNum;

    const countQuery = `SELECT COUNT(*) FROM products p ${whereClause}`;
    const countResult = await db.query(countQuery, queryParams);
    const total = parseInt(countResult.rows[0].count, 10);

    const dataQuery = `
      SELECT p.*, c.name as category_name
      FROM products p
      JOIN categories c ON p.category_id = c.id
      ${whereClause}
      ORDER BY p.created_at DESC
      LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}
    `;
    const result = await db.query(dataQuery, [...queryParams, limitNum, offset]);

    console.log(`[vendor]: Vendor Fetch Products Successful - Vendor: ${vendor_id}`);
    sendResponse<IPaginatedData<IProduct>>(res, 200, true, 'Vendor products retrieved successfully', {
      items: result.rows as IProduct[],
      total,
      page: pageNum,
      limit: limitNum,
      total_pages: Math.ceil(total / limitNum)
    });
  } catch (err) {
    console.error('Error getVendorProducts:', err);
    sendResponse<null>(res, 500, false, 'Internal Server Error', null);
  }
};

export const getVendorProductById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const vendor_id = req.user?.vendor_id;

    const result = await db.query(
      "SELECT * FROM products WHERE id = $1 AND vendor_id = $2",
      [id, vendor_id]
    );

    if (result.rows.length === 0) {
      sendResponse(res, 404, false, 'Product not found or unauthorized');
      return;
    }

    sendResponse<IProduct>(res, 200, true, 'Product retrieved successfully', result.rows[0] as IProduct);
  } catch (err) {
    console.error('Error getVendorProductById:', err);
    sendResponse<null>(res, 500, false, 'Internal Server Error', null);
  }
};

export const createProduct = async (req: UploadRequest, res: Response): Promise<void> => {
  try {
    const vendor_id = req.user?.vendor_id;
    const { name, description, price, stock, category_id, is_featured } = req.body;
    const image_urls = req.processedImages || [];

    const result = await db.query(
      `INSERT INTO products (vendor_id, name, description, price, stock, category_id, is_featured, image_urls, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'active')
       RETURNING id`,
      [vendor_id, name, description, price, stock, category_id, is_featured === 'true' || is_featured === true, JSON.stringify(image_urls)]
    );

    const productId = result.rows[0].id;

    // Save to product_images table
    if (image_urls.length > 0) {
      const imgValues = image_urls.map((url: string, index: number) => 
        `('${productId}', '${url}', ${index === 0}, ${index})`
      ).join(',');
      await db.query(`INSERT INTO product_images (product_id, url, is_primary, display_order) VALUES ${imgValues}`);
    }

    console.log(`[vendor]: Product Created Successful - ID: ${productId}`);
    sendResponse<{ product_id: string }>(res, 201, true, 'Product created successfully', { product_id: productId });
  } catch (err) {
    console.error('Error createProduct:', err);
    sendResponse<null>(res, 500, false, 'Internal Server Error', null);
  }
};

export const updateProduct = async (req: UploadRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const vendor_id = req.user?.vendor_id;
    const { name, description, price, stock, category_id, is_featured, status } = req.body;
    
    // Merge existing images with newly uploaded ones
    let existing_images = [];
    try {
        existing_images = typeof req.body.existing_images === 'string' 
            ? JSON.parse(req.body.existing_images) 
            : (req.body.existing_images || []);
    } catch (e) {
        existing_images = [];
    }
    
    const new_images = req.processedImages || [];
    const raw_final_image_urls = [...existing_images, ...new_images];
    
    // Safety: Ensure all URLs are relative paths starting with /uploads/
    const final_image_urls = raw_final_image_urls.map((url: string) => {
        const uploadsIndex = url.indexOf('/uploads/');
        return uploadsIndex !== -1 ? url.substring(uploadsIndex) : url;
    });

    // Check ownership
    const check = await db.query("SELECT vendor_id FROM products WHERE id = $1", [id]);
    if (check.rows.length === 0) {
      sendResponse(res, 404, false, 'Product not found');
      return;
    }
    if (check.rows[0].vendor_id !== vendor_id) {
      sendResponse(res, 403, false, 'Unauthorized to update this product');
      return;
    }

    await db.query(
      `UPDATE products 
       SET name = $1, description = $2, price = $3, stock = $4, category_id = $5, is_featured = $6, status = $7, 
           image_urls = $8, updated_at = NOW()
       WHERE id = $9`,
      [name, description, price, stock, category_id, is_featured === 'true' || is_featured === true, status, JSON.stringify(final_image_urls), id]
    );

    // Sync product_images table
    await db.query('DELETE FROM product_images WHERE product_id = $1', [id]);
    if (final_image_urls.length > 0) {
      const imgValues = final_image_urls.map((url: string, index: number) => 
        `('${id}', '${url}', ${index === 0}, ${index})`
      ).join(',');
      await db.query(`INSERT INTO product_images (product_id, url, is_primary, display_order) VALUES ${imgValues}`);
    }

    console.log(`[vendor]: Product Updated Successful - ID: ${id}`);
    sendResponse<null>(res, 200, true, 'Product updated successfully', null);
  } catch (err) {
    console.error('Error updateProduct:', err);
    sendResponse<null>(res, 500, false, 'Internal Server Error', null);
  }
};

export const bulkDeleteProducts = async (req: Request, res: Response): Promise<void> => {
  try {
    const { ids } = req.body;
    const vendor_id = req.user?.vendor_id;

    if (!ids || !Array.isArray(ids)) {
      sendResponse(res, 400, false, 'Invalid product IDs');
      return;
    }

    // Check if products have pending orders
    const pendingCheck = await db.query(
      `SELECT DISTINCT p.name FROM products p
       JOIN order_items oi ON p.id = oi.product_id
       JOIN orders o ON oi.order_id = o.id
       WHERE p.id = ANY($1) AND o.status IN ('pending', 'confirmed', 'processing', 'shipped')`,
      [ids]
    );

    if (pendingCheck.rows.length > 0) {
      console.log(`[vendor]: Bulk Delete Conflict - 409 - Products in pending orders`);
      sendResponse(res, 409, false, `Cannot delete: Some products are currently in active orders.`, {
        conflicting_products: pendingCheck.rows.map(r => r.name)
      });
      return;
    }

    // Soft delete
    await db.query(
      `UPDATE products SET status = 'deleted', deleted_at = NOW() WHERE id = ANY($1) AND vendor_id = $2`,
      [ids, vendor_id]
    );

    console.log(`[vendor]: Bulk Delete Successful - Vendor: ${vendor_id}`);
    sendResponse<null>(res, 200, true, 'Products successfully soft-deleted', null);
  } catch (err) {
    console.error('Error bulkDeleteProducts:', err);
    sendResponse<null>(res, 500, false, 'Internal Server Error', null);
  }
};

export const bulkToggleProducts = async (req: Request, res: Response): Promise<void> => {
  try {
    const { ids, status } = req.body;
    const vendor_id = req.user?.vendor_id;

    if (!['active', 'inactive', 'out_of_stock'].includes(status)) {
      sendResponse(res, 400, false, 'Invalid status value');
      return;
    }

    await db.query(
      `UPDATE products SET status = $1, updated_at = NOW() WHERE id = ANY($2) AND vendor_id = $3`,
      [status, ids, vendor_id]
    );

    console.log(`[vendor]: Bulk Toggle Successful - Status: ${status}`);
    sendResponse<null>(res, 200, true, `Products status updated to ${status}`, null);
  } catch (err) {
    console.error('Error bulkToggleProducts:', err);
    sendResponse<null>(res, 500, false, 'Internal Server Error', null);
  }
};

export const bulkUpdateStock = async (req: Request, res: Response): Promise<void> => {
  const client = await db.pool.connect();
  try {
    const { updates } = req.body; // Array of { id: string, stock: number }
    const vendor_id = req.user?.vendor_id;

    if (!updates || !Array.isArray(updates)) {
      sendResponse(res, 400, false, 'Invalid update data');
      return;
    }

    await client.query('BEGIN');

    for (const item of updates) {
      // Ensure the product belongs to the vendor
      const updateRes = await client.query(
        `UPDATE products 
         SET stock = $1, updated_at = NOW() 
         WHERE id = $2 AND vendor_id = $3`,
        [item.stock, item.id, vendor_id]
      );
      
      if (updateRes.rowCount === 0) {
        console.warn(`[vendor]: Stock update failed for product ${item.id} - not found or unauthorized`);
      }
    }

    await client.query('COMMIT');
    console.log(`[vendor]: Bulk Stock Update Successful - Vendor: ${vendor_id}, Count: ${updates.length}`);
    sendResponse<null>(res, 200, true, `Đã cập nhật tồn kho cho ${updates.length} sản phẩm thành công.`, null);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error bulkUpdateStock:', err);
    sendResponse<null>(res, 500, false, 'Internal Server Error', null);
  } finally {
    client.release();
  }
};

/**
 * --- DASHBOARD & SHOP SETTINGS (Prompt 05) ---
 */

export const getVendorDashboard = async (req: Request, res: Response): Promise<void> => {
  try {
    const vendorId = req.user?.vendor_id;

    // 1. Total Revenue (Delivered orders only)
    const revenueRes = await db.query(
      `SELECT COALESCE(SUM(oi.price_snapshot * oi.quantity), 0) as total_revenue
       FROM order_items oi
       JOIN products p ON oi.product_id = p.id
       JOIN orders o ON oi.order_id = o.id
       WHERE p.vendor_id = $1 AND o.status = 'delivered'`,
      [vendorId]
    );

    // 2. New Orders (Pending)
    const newOrdersRes = await db.query(
      `SELECT COUNT(DISTINCT o.id) as new_orders
       FROM orders o
       JOIN order_items oi ON o.id = oi.order_id
       JOIN products p ON oi.product_id = p.id
       WHERE p.vendor_id = $1 AND o.status = 'pending'`,
      [vendorId]
    );

    // 3. Active Products
    const activeProductsRes = await db.query(
      `SELECT COUNT(*) as active_products FROM products WHERE vendor_id = $1 AND status = 'active'`,
      [vendorId]
    );

    // 4. Chart 30 days
    const chartRes = await db.query(
      `SELECT DATE(o.created_at) as date, SUM(oi.price_snapshot * oi.quantity) as revenue
       FROM order_items oi
       JOIN products p ON oi.product_id = p.id
       JOIN orders o ON oi.order_id = o.id
       WHERE p.vendor_id = $1 AND o.status = 'delivered' AND o.created_at >= NOW() - INTERVAL '30 days'
       GROUP BY DATE(o.created_at)
       ORDER BY DATE(o.created_at) ASC`,
      [vendorId]
    );

    // 5. Pending Returns
    const pendingReturnsRes = await db.query(
      `SELECT COUNT(*) as pending_returns
       FROM return_requests rr
       JOIN order_items oi ON rr.order_item_id = oi.id
       JOIN products p ON oi.product_id = p.id
       WHERE p.vendor_id = $1 AND rr.status = 'pending_vendor'`,
      [vendorId]
    );

    // 6. Unanswered QA
    const unansweredQARes = await db.query(
      `SELECT COUNT(*) as unanswered_qa
       FROM qa q
       JOIN products p ON q.product_id = p.id
       WHERE p.vendor_id = $1 AND q.answer IS NULL`,
      [vendorId]
    );

    // 7. Low Stock Count
    const lowStockRes = await db.query(
      `SELECT COUNT(*) as low_stock FROM products WHERE vendor_id = $1 AND stock <= 5 AND status = 'active'`,
      [vendorId]
    );

    sendResponse<any>(res, 200, true, 'Dashboard stats retrieved successfully', {
      total_revenue: parseFloat(revenueRes.rows[0].total_revenue),
      new_orders: parseInt(newOrdersRes.rows[0].new_orders),
      active_products: parseInt(activeProductsRes.rows[0].active_products),
      pending_returns: parseInt(pendingReturnsRes.rows[0].pending_returns),
      unanswered_qa: parseInt(unansweredQARes.rows[0].unanswered_qa),
      low_stock_count: parseInt(lowStockRes.rows[0].low_stock),
      chart_30_days: chartRes.rows
    });
  } catch (err) {
    console.error('Error getVendorDashboard:', err);
    sendResponse<null>(res, 500, false, 'Internal Server Error', null);
  }
};

export const getVendorProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    const vendorId = req.user?.vendor_id;
    const result = await db.query("SELECT * FROM vendors WHERE id = $1", [vendorId]);
    sendResponse<IVendor>(res, 200, true, 'Vendor profile retrieved successfully', result.rows[0] as IVendor);
  } catch (err) {
    console.error('Error getVendorProfile:', err);
    sendResponse<null>(res, 500, false, 'Internal Server Error', null);
  }
};

export const updateVendorProfile = async (req: UploadRequest, res: Response): Promise<void> => {
  try {
    const vendorId = req.user?.vendor_id;
    const { store_name, phone, address, email, return_policy_days, return_policy_desc } = req.body;
    
    const updates: string[] = [];
    const values: any[] = [];
    
    if (store_name) { updates.push(`store_name = $${updates.length + 1}`); values.push(store_name); }
    if (phone) { updates.push(`phone = $${updates.length + 1}`); values.push(phone); }
    if (address) { updates.push(`address = $${updates.length + 1}`); values.push(address); }
    if (email) { updates.push(`email = $${updates.length + 1}`); values.push(email); }
    if (return_policy_days) { updates.push(`return_policy_days = $${updates.length + 1}`); values.push(parseInt(return_policy_days)); }
    if (return_policy_desc) { updates.push(`return_policy_desc = $${updates.length + 1}`); values.push(return_policy_desc); }
    
    // Images from middleware
    const logoUrl = req.logoUrl;
    const bannerUrl = req.bannerUrl;
    
    if (logoUrl) { updates.push(`logo_url = $${updates.length + 1}`); values.push(logoUrl); }
    if (bannerUrl) { updates.push(`banner_url = $${updates.length + 1}`); values.push(bannerUrl); }

    if (updates.length === 0) {
      sendResponse(res, 400, false, 'Không có thông tin nào để cập nhật.');
      return;
    }

    values.push(vendorId);
    await db.query(`UPDATE vendors SET ${updates.join(', ')}, updated_at = NOW() WHERE id = $${values.length}`, values);

    console.log(`[vendor]: Profile Updated - Vendor: ${vendorId}`);
    sendResponse<null>(res, 200, true, 'Cập nhật thông tin cửa hàng thành công.', null);
  } catch (err) {
    console.error('[Error - updateVendorProfile]:', err);
    sendResponse<null>(res, 500, false, 'Internal Server Error', null);
  }
};

/**
 * --- INVOICE EXPORT (Prompt 06) ---
 */

export const exportOrderPDF = async (req: Request, res: Response): Promise<void> => {
  let browser;
  try {
    const subOrderId = typeof req.params.id === 'string' ? req.params.id : req.params.id?.[0];
    const vendorId = req.user?.vendor_id;

    if (!subOrderId || !vendorId) {
      sendResponse(res, 400, false, 'Thiếu thông tin.');
      return;
    }

    const subRes = await db.query(
      `
      SELECT
        so.id AS sub_order_pk,
        so.sub_order_code,
        so.subtotal,
        so.shipping_fee,
        so.vendor_discount,
        so.platform_discount,
        so.created_at AS sub_order_created_at,
        o.id,
        o.order_code AS parent_order_code,
        o.buyer_id,
        o.total_amount AS parent_total_amount,
        o.status,
        o.shipping_address,
        o.created_at,
        u.name AS buyer_name
      FROM sub_orders so
      JOIN orders o ON o.id = so.order_id
      JOIN users u ON o.buyer_id = u.id
      WHERE so.id = $1::uuid AND so.vendor_id = $2::uuid
    `,
      [subOrderId, vendorId]
    );

    if (subRes.rows.length === 0) {
      sendResponse(res, 404, false, 'Không tìm thấy đơn theo shop hoặc không thuộc shop của bạn.');
      return;
    }

    const row = subRes.rows[0];
    const order = row;
    const lineTotal =
      parseFloat(String(row.subtotal)) +
      parseFloat(String(row.shipping_fee)) -
      parseFloat(String(row.vendor_discount)) -
      parseFloat(String(row.platform_discount));

    const itemsRes = await db.query(
      `
      SELECT oi.*, p.name AS product_name, (oi.price_snapshot * oi.quantity) AS subtotal
      FROM order_items oi
      JOIN products p ON oi.product_id = p.id
      WHERE oi.sub_order_id = $1::uuid
    `,
      [subOrderId]
    );

    if (itemsRes.rows.length === 0) {
      sendResponse(res, 400, false, 'Không có dòng sản phẩm cho đơn này.');
      return;
    }

    const vendorRes = await db.query('SELECT * FROM vendors WHERE id = $1', [vendorId]);

    const templatePath = path.join(__dirname, '../../shared/templates/invoice.html');
    if (!fs.existsSync(templatePath)) {
      throw new Error('Template file not found');
    }
    const templateHtml = fs.readFileSync(templatePath, 'utf8');
    const template = handlebars.compile(templateHtml);

    const data = {
      ...order,
      order_code: row.sub_order_code,
      total_amount: lineTotal,
      created_at: new Date(row.sub_order_created_at).toLocaleDateString('vi-VN'),
      shipping_address:
        typeof order.shipping_address === 'string' ? JSON.parse(order.shipping_address) : order.shipping_address,
      items: itemsRes.rows,
      vendor: vendorRes.rows[0],
    };

    const html = template(data);

    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'load' });
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '20px', right: '20px', bottom: '20px', left: '20px' },
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=invoice-${row.sub_order_code}.pdf`);
    res.send(pdfBuffer);

    console.log(`[vendor]: Invoice Exported Successful - Sub-order: ${row.sub_order_code}`);
  } catch (err) {
    console.error('[Error - exportOrderPDF]:', err);
    sendResponse(res, 500, false, 'Internal Server Error');
  } finally {
    if (browser) await browser.close();
  }
};

export const getVendorFees = async (req: Request, res: Response): Promise<void> => {
  try {
    const vendorId = req.user?.vendor_id;
    if (!vendorId) {
      sendResponse(res, 403, false, 'Vendor context required.', null);
      return;
    }

    const vendorRes = await db.query(
      `SELECT v.id as vendor_id, v.store_name, v.fee_tier_id, ft.tier_name, ft.description
       FROM vendors v
       LEFT JOIN fee_tiers ft ON v.fee_tier_id = ft.id
       WHERE v.id = $1::uuid`,
      [vendorId]
    );

    if (!vendorRes.rows || vendorRes.rows.length === 0) {
      sendResponse(res, 404, false, 'Không tìm thấy thông tin người bán.', null);
      return;
    }

    let feeTierId = vendorRes.rows[0].fee_tier_id;
    let tierName = vendorRes.rows[0].tier_name;
    let description = vendorRes.rows[0].description;

    // Fallback if no tier is explicitly set
    if (!feeTierId) {
      const defaultTierRes = await db.query(
        "SELECT id, tier_name, description FROM fee_tiers WHERE tier_name = 'Hạng Thường' LIMIT 1"
      );
      if (defaultTierRes.rows && defaultTierRes.rows.length > 0) {
        feeTierId = defaultTierRes.rows[0].id;
        tierName = defaultTierRes.rows[0].tier_name;
        description = defaultTierRes.rows[0].description;
      } else {
        tierName = 'Hạng Thường';
        description = 'Hạng phí mặc định dành cho nhà bán hàng chưa xác thực.';
      }
    }


    let items = [];
    if (feeTierId) {
      const itemsRes = await db.query(
        `SELECT id, fee_name, fee_type, fee_value 
         FROM fee_tier_items 
         WHERE fee_tier_id = $1::uuid`,
        [feeTierId]
      );
      items = itemsRes.rows;
    }

    sendResponse(res, 200, true, 'Lấy thông tin biểu phí của shop thành công.', {
      vendor_id: vendorId,
      store_name: vendorRes.rows[0].store_name,
      fee_tier_id: feeTierId,
      tier_name: tierName,
      description: description,
      items: items
    });
  } catch (err) {
    console.error('Error getVendorFees:', err);
    sendResponse(res, 500, false, 'Internal Server Error', null);
  }
};

