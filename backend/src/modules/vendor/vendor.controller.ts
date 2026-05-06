import { Request, Response } from 'express';
import { sendResponse } from '../../shared/response';
import db from '../../core/db';
import puppeteer from 'puppeteer';
import handlebars from 'handlebars';
import fs from 'fs';
import path from 'path';

// Đăng ký helper cho handlebars
handlebars.registerHelper('formatCurrency', (value) => {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
});

/**
 * 1. GET /api/vendor/orders
 * Lấy danh sách đơn hàng có chứa sản phẩm của Shop
 */
export const getVendorOrders = async (req: Request, res: Response): Promise<void> => {
  try {
    const vendorId = req.user?.vendor_id;
    const { status, page = '1', limit = '20' } = req.query;

    const queryParams: any[] = [vendorId];
    const queryConditions: string[] = [
      `EXISTS (SELECT 1 FROM order_items oi JOIN products p ON oi.product_id = p.id WHERE oi.order_id = o.id AND p.vendor_id = $1)`
    ];

    if (status && status !== 'all') {
      queryParams.push(status);
      queryConditions.push(`o.status = $${queryParams.length}`);
    }

    const whereClause = `WHERE ${queryConditions.join(' AND ')}`;
    const pageNum = parseInt(page as string, 10) || 1;
    const limitNum = parseInt(limit as string, 10) || 20;
    const offset = (pageNum - 1) * limitNum;

    const countQuery = `SELECT COUNT(*) FROM orders o ${whereClause}`;
    const countRes = await db.query(countQuery, queryParams);
    const total = parseInt(countRes.rows[0].count);

    const dataQuery = `
      SELECT o.*, u.name as buyer_name,
             (SELECT json_agg(item_info) FROM (
               SELECT oi.*, p.name as product_name, p.image_urls
               FROM order_items oi
               JOIN products p ON oi.product_id = p.id
               WHERE oi.order_id = o.id AND p.vendor_id = $1
             ) item_info) as items
      FROM orders o
      JOIN users u ON o.buyer_id = u.id
      ${whereClause}
      ORDER BY o.created_at DESC
      LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}
    `;

    const result = await db.query(dataQuery, [...queryParams, limitNum, offset]);

    console.log(`[vendor]: Fetch Orders Successful - Vendor: ${vendorId}`);
    sendResponse(res, 200, true, 'Vendor orders retrieved successfully', {
      orders: result.rows,
      total,
      page: pageNum,
      limit: limitNum,
    });
  } catch (err) {
    console.error('Error getVendorOrders:', err);
    sendResponse(res, 500, false, 'Internal Server Error');
  }
};

/**
 * 2. PUT /api/vendor/orders/:id/status
 */
export const updateOrderStatus = async (req: Request, res: Response): Promise<void> => {
  const client = await db.pool.connect();
  try {
    const { id } = req.params;
    const { status, tracking_code } = req.body;
    const vendorId = req.user?.vendor_id;

    await client.query('BEGIN');

    // 1. Kiểm tra quyền sở hữu và trạng thái hiện tại
    const orderRes = await client.query(
      `SELECT o.status, o.order_code
       FROM orders o
       JOIN order_items oi ON o.id = oi.order_id
       JOIN products p ON oi.product_id = p.id
       WHERE o.id = $1 AND p.vendor_id = $2
       LIMIT 1 FOR UPDATE`,
      [id, vendorId]
    );

    if (orderRes.rows.length === 0) {
      sendResponse(res, 403, false, 'Bạn không có quyền cập nhật đơn hàng này.');
      await client.query('ROLLBACK');
      return;
    }

    const currentStatus = orderRes.rows[0].status;

    if (status === 'shipped' && !tracking_code) {
      sendResponse(res, 400, false, 'Cần có mã vận đơn (tracking code) khi chuyển sang trạng thái Đang giao.');
      await client.query('ROLLBACK');
      return;
    }

    // 2. Logic xử lý khi TỪ CHỐI (cancelled)
    if (status === 'cancelled') {
      if (currentStatus !== 'pending' && currentStatus !== 'confirmed') {
        sendResponse(res, 400, false, 'Không thể hủy đơn hàng ở trạng thái hiện tại.');
        await client.query('ROLLBACK');
        return;
      }

      // Hoàn lại tồn kho cho sản phẩm của vendor này
      const itemsRes = await client.query(
        `SELECT oi.product_id, oi.quantity 
         FROM order_items oi 
         JOIN products p ON oi.product_id = p.id
         WHERE oi.order_id = $1 AND p.vendor_id = $2`,
        [id, vendorId]
      );

      for (const item of itemsRes.rows) {
        await client.query('UPDATE products SET stock = stock + $1 WHERE id = $2', [item.quantity, item.product_id]);
      }
    }

    // 3. Cập nhật trạng thái
    await client.query(
      `UPDATE orders SET status = $1, updated_at = NOW() WHERE id = $2`,
      [status, id]
    );

    await client.query('COMMIT');
    console.log(`[vendor]: Order Status Updated - ID: ${id}, Status: ${status}`);
    sendResponse(res, 200, true, `Đã ${status === 'processing' ? 'duyệt' : 'từ chối'} đơn hàng thành công.`);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error updateOrderStatus:', err);
    sendResponse(res, 500, false, 'Internal Server Error');
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
    sendResponse(res, 200, true, 'Vendor return requests retrieved successfully', result.rows);
  } catch (err) {
    console.error('Error getVendorReturns:', err);
    sendResponse(res, 500, false, 'Internal Server Error');
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
      `SELECT rr.id, rr.status, oi.product_id, oi.quantity, oi.price_snapshot, o.buyer_id, p.vendor_id
       FROM return_requests rr
       JOIN order_items oi ON rr.order_item_id = oi.id
       JOIN products p ON oi.product_id = p.id
       JOIN orders o ON oi.order_id = o.id
       WHERE rr.id = $1 FOR UPDATE`,
      [id]
    );

    if (reqRes.rows.length === 0) throw new Error('NOT_FOUND');
    if (reqRes.rows[0].vendor_id !== vendorId) throw new Error('FORBIDDEN');
    if (reqRes.rows[0].status !== 'pending_vendor') throw new Error('ALREADY_PROCESSED');

    const { product_id, quantity, price_snapshot, buyer_id } = reqRes.rows[0];
    const refundAmount = parseFloat(price_snapshot) * quantity;

    // A. Update status
    await client.query(`UPDATE return_requests SET status = 'approved', updated_at = NOW() WHERE id = $1`, [id]);

    // B. Refund to buyer wallet
    await client.query(`UPDATE users SET wallet_balance = wallet_balance + $1 WHERE id = $2`, [refundAmount, buyer_id]);
    
    // C. Log Transaction
    await client.query(
      `INSERT INTO wallet_transactions (user_id, amount, type, ref_id, balance_after) 
       VALUES ($1, $2, 'refund', $3, (SELECT wallet_balance FROM users WHERE id = $1))`,
      [buyer_id, refundAmount, id]
    );

    // D. Return Stock
    await client.query(`UPDATE products SET stock = stock + $1 WHERE id = $2`, [quantity, product_id]);

    await client.query('COMMIT');
    console.log(`[vendor]: Return Approved - ID: ${id}`);
    sendResponse(res, 200, true, 'Đã duyệt trả hàng và hoàn tiền cho khách thành công.');
  } catch (err: any) {
    await client.query('ROLLBACK');
    console.error('Error approveReturnByVendor:', err.message);
    if (err.message === 'NOT_FOUND') sendResponse(res, 404, false, 'Không tìm thấy yêu cầu.');
    else if (err.message === 'FORBIDDEN') sendResponse(res, 403, false, 'Bạn không có quyền xử lý yêu cầu này.');
    else if (err.message === 'ALREADY_PROCESSED') sendResponse(res, 400, false, 'Yêu cầu này đã được xử lý hoặc không hợp lệ.');
    else sendResponse(res, 500, false, 'Internal Server Error');
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
    sendResponse(res, 200, true, 'Đã từ chối yêu cầu trả hàng.');
  } catch (err) {
    console.error('Error rejectReturnByVendor:', err);
    sendResponse(res, 500, false, 'Internal Server Error');
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
    sendResponse(res, 200, true, 'Vendor products retrieved successfully', {
      products: result.rows,
      total,
      page: pageNum,
      limit: limitNum,
    });
  } catch (err) {
    console.error('Error getVendorProducts:', err);
    sendResponse(res, 500, false, 'Internal Server Error');
  }
};

export const createProduct = async (req: Request, res: Response): Promise<void> => {
  try {
    const vendor_id = req.user?.vendor_id;
    const { name, description, price, stock, category_id, is_featured } = req.body;
    const image_urls = (req as any).processedImages || [];

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
    sendResponse(res, 201, true, 'Product created successfully', { product_id: productId });
  } catch (err) {
    console.error('Error createProduct:', err);
    sendResponse(res, 500, false, 'Internal Server Error');
  }
};

export const updateProduct = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const vendor_id = req.user?.vendor_id;
    const { name, description, price, stock, category_id, is_featured, status } = req.body;

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
       SET name = $1, description = $2, price = $3, stock = $4, category_id = $5, is_featured = $6, status = $7, updated_at = NOW()
       WHERE id = $8`,
      [name, description, price, stock, category_id, is_featured, status, id]
    );

    console.log(`[vendor]: Product Updated Successful - ID: ${id}`);
    sendResponse(res, 200, true, 'Product updated successfully');
  } catch (err) {
    console.error('Error updateProduct:', err);
    sendResponse(res, 500, false, 'Internal Server Error');
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
    sendResponse(res, 200, true, 'Products successfully soft-deleted');
  } catch (err) {
    console.error('Error bulkDeleteProducts:', err);
    sendResponse(res, 500, false, 'Internal Server Error');
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
    sendResponse(res, 200, true, `Products status updated to ${status}`);
  } catch (err) {
    console.error('Error bulkToggleProducts:', err);
    sendResponse(res, 500, false, 'Internal Server Error');
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

    sendResponse(res, 200, true, 'Dashboard stats retrieved successfully', {
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
    sendResponse(res, 500, false, 'Internal Server Error');
  }
};

export const getVendorProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    const vendorId = req.user?.vendor_id;
    const result = await db.query("SELECT * FROM vendors WHERE id = $1", [vendorId]);
    sendResponse(res, 200, true, 'Vendor profile retrieved successfully', result.rows[0]);
  } catch (err) {
    console.error('Error getVendorProfile:', err);
    sendResponse(res, 500, false, 'Internal Server Error');
  }
};

export const updateVendorProfile = async (req: Request, res: Response): Promise<void> => {
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
    const logoUrl = (req as any).logoUrl;
    const bannerUrl = (req as any).bannerUrl;
    
    if (logoUrl) { updates.push(`logo_url = $${updates.length + 1}`); values.push(logoUrl); }
    if (bannerUrl) { updates.push(`banner_url = $${updates.length + 1}`); values.push(bannerUrl); }

    if (updates.length === 0) {
      sendResponse(res, 400, false, 'Không có thông tin nào để cập nhật.');
      return;
    }

    values.push(vendorId);
    await db.query(`UPDATE vendors SET ${updates.join(', ')}, updated_at = NOW() WHERE id = $${values.length}`, values);

    console.log(`[vendor]: Profile Updated - Vendor: ${vendorId}`);
    sendResponse(res, 200, true, 'Cập nhật thông tin cửa hàng thành công.');
  } catch (err) {
    console.error('[Error - updateVendorProfile]:', err);
    sendResponse(res, 500, false, 'Internal Server Error');
  }
};

/**
 * --- INVOICE EXPORT (Prompt 06) ---
 */

export const exportOrderPDF = async (req: Request, res: Response): Promise<void> => {
  let browser;
  try {
    const { id } = req.params;
    const vendorId = req.user?.vendor_id;

    // 1. Lấy dữ liệu đơn hàng
    const orderRes = await db.query(`
      SELECT o.*, u.name as buyer_name
      FROM orders o
      JOIN users u ON o.buyer_id = u.id
      WHERE o.id = $1
    `, [id]);

    if (orderRes.rows.length === 0) {
      sendResponse(res, 404, false, 'Không tìm thấy đơn hàng');
      return;
    }

    const order = orderRes.rows[0];

    // 2. Lấy danh sách sản phẩm thuộc vendor này trong đơn hàng
    const itemsRes = await db.query(`
      SELECT oi.*, p.name as product_name, (oi.price_snapshot * oi.quantity) as subtotal
      FROM order_items oi
      JOIN products p ON oi.product_id = p.id
      WHERE oi.order_id = $1 AND p.vendor_id = $2
    `, [id, vendorId]);

    if (itemsRes.rows.length === 0) {
      sendResponse(res, 403, false, 'Bạn không có quyền xuất hóa đơn cho đơn hàng này');
      return;
    }

    // 3. Lấy thông tin Vendor
    const vendorRes = await db.query("SELECT * FROM vendors WHERE id = $1", [vendorId]);

    // 4. Chuẩn bị Template HTML
    const templatePath = path.join(__dirname, '../../shared/templates/invoice.html');
    if (!fs.existsSync(templatePath)) {
      throw new Error('Template file not found');
    }
    const templateHtml = fs.readFileSync(templatePath, 'utf8');
    const template = handlebars.compile(templateHtml);

    const data = {
      ...order,
      created_at: new Date(order.created_at).toLocaleDateString('vi-VN'),
      shipping_address: typeof order.shipping_address === 'string' ? JSON.parse(order.shipping_address) : order.shipping_address,
      items: itemsRes.rows,
      vendor: vendorRes.rows[0]
    };

    const html = template(data);

    // 5. Render sang PDF bằng Puppeteer
    browser = await puppeteer.launch({ 
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'] // Quan trọng khi chạy trong container/linux
    });
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    const pdfBuffer = await page.pdf({ 
      format: 'A4', 
      printBackground: true,
      margin: { top: '20px', right: '20px', bottom: '20px', left: '20px' }
    });

    // 6. Gửi phản hồi PDF
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=invoice-${order.order_code}.pdf`);
    res.send(pdfBuffer);

    console.log(`[vendor]: Invoice Exported Successful - Order: ${order.order_code}`);
  } catch (err) {
    console.error('[Error - exportOrderPDF]:', err);
    sendResponse(res, 500, false, 'Internal Server Error');
  } finally {
    if (browser) await browser.close();
  }
};
