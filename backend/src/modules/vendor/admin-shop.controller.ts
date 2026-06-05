import { Request, Response } from 'express';
import db from '../../core/db';
import { sendResponse } from '../../shared/response';
import { IPaginatedData } from '../../shared/types/api';

export interface IAdminShopItem {
  id: string;
  store_name: string;
  slug: string;
  status: string;
  created_at: string;
  owner_name: string;
  owner_email: string;
  products_count: number;
  sales_amount: number;
}

export interface IMonthlyRevenue {
  month: string;
  revenue: number;
}

export interface IShopStats {
  revenue_by_month: IMonthlyRevenue[];
  order_count: number;
  return_rate: number;
}

/**
 * GET /api/admin/shops
 * Get list of shops with pagination, filters, and aggregated stats (products count, sales amount).
 */
export const getShops = async (req: Request, res: Response): Promise<void> => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string || '1', 10));
    const limit = Math.max(1, parseInt(req.query.limit as string || '20', 10));
    const offset = (page - 1) * limit;

    const status = req.query.status as string | undefined;
    const q = req.query.q as string | undefined;

    const conditions: string[] = [];
    const params: (string | number)[] = [];

    if (status === 'active' || status === 'inactive' || status === 'banned') {
      params.push(status);
      conditions.push(`v.status = $${params.length}`);
    }

    if (q && q.trim().length > 0) {
      params.push(`%${q.trim()}%`);
      conditions.push(`(v.store_name ILIKE $${params.length} OR u.name ILIKE $${params.length} OR u.email ILIKE $${params.length})`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Total Count Query
    const countQuery = `
      SELECT COUNT(*)::int as total
      FROM vendors v
      INNER JOIN users u ON v.user_id = u.id
      ${whereClause}
    `;
    const countResult = await db.query(countQuery, params);
    const total = countResult.rows[0]?.total || 0;

    // Items Query
    const queryParams = [...params, limit, offset];
    const itemsQuery = `
      SELECT 
        v.id,
        v.store_name,
        v.slug,
        v.status,
        v.created_at,
        u.name as owner_name,
        u.email as owner_email,
        (SELECT COUNT(*)::int FROM products p WHERE p.vendor_id = v.id) as products_count,
        (SELECT COALESCE(SUM(so.subtotal), 0)::float FROM sub_orders so WHERE so.vendor_id = v.id AND so.status != 'cancelled') as sales_amount
      FROM vendors v
      INNER JOIN users u ON v.user_id = u.id
      ${whereClause}
      ORDER BY v.created_at DESC
      LIMIT $${queryParams.length - 1} OFFSET $${queryParams.length}
    `;

    const itemsResult = await db.query(itemsQuery, queryParams);
    const items = itemsResult.rows as IAdminShopItem[];

    const totalPages = Math.ceil(total / limit);

    const paginatedData: IPaginatedData<IAdminShopItem> = {
      items,
      total,
      page,
      limit,
      total_pages: totalPages,
    };

    console.log(`[admin-shop]: Get Shops Successful - 200 - Total: ${total}, Page: ${page}`);
    sendResponse<IPaginatedData<IAdminShopItem>>(res, 200, true, 'Shops retrieved successfully', paginatedData);
  } catch (error) {
    const err = error as Error;
    console.error(`[Error - admin-shop]: GET /api/admin/shops - 500 - ${err.message}`);
    sendResponse(res, 500, false, 'Internal Server Error');
  }
};

/**
 * PATCH /api/admin/shops/:id/status
 * Update a vendor's status and sync it to their user status inside a transaction.
 */
export const updateShopStatus = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const { status } = req.body as { status?: string };

  if (status !== 'active' && status !== 'inactive' && status !== 'banned') {
    console.log(`[admin-shop]: Update Shop Status Failed - 400 - Invalid status: ${status}`);
    sendResponse(res, 400, false, 'Invalid status value. Must be active, inactive, or banned');
    return;
  }

  const client = await db.pool.connect();

  try {
    await client.query('BEGIN');

    // Fetch vendor and verify existence
    const vendorCheck = await client.query(
      'SELECT id, user_id FROM vendors WHERE id = $1 FOR UPDATE',
      [id]
    );

    if (!vendorCheck.rowCount || vendorCheck.rowCount === 0) {
      await client.query('ROLLBACK');
      console.log(`[admin-shop]: Update Shop Status Failed - 404 - Shop not found: ${id}`);
      sendResponse(res, 404, false, 'Shop not found');
      return;
    }

    const userId = vendorCheck.rows[0].user_id;

    // 1. Update vendors table status
    await client.query(
      "UPDATE vendors SET status = $1, updated_at = now() WHERE id = $2",
      [status, id]
    );

    // 2. Update users table status
    await client.query(
      "UPDATE users SET status = $1 WHERE id = $2",
      [status, userId]
    );

    await client.query('COMMIT');

    console.log(`[admin-shop]: Update Shop Status Successful - 200 - ID: ${id}, Status: ${status}`);
    sendResponse(res, 200, true, 'Shop status updated successfully');
  } catch (error) {
    await client.query('ROLLBACK');
    const err = error as Error;
    console.error(`[Error - admin-shop]: PATCH /api/admin/shops/${id}/status - 500 - ${err.message}`);
    sendResponse(res, 500, false, 'Internal Server Error');
  } finally {
    client.release();
  }
};

/**
 * GET /api/admin/shops/:id/stats
 * Retrieve detailed stats for a specific shop: Revenue by month, total orders count, and return rate.
 */
export const getShopStats = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    // Verify vendor exists first
    const vendorCheck = await db.query(
      'SELECT id FROM vendors WHERE id = $1 LIMIT 1',
      [id]
    );

    if (!vendorCheck.rowCount || vendorCheck.rowCount === 0) {
      console.log(`[admin-shop]: Get Shop Stats Failed - 404 - Shop not found: ${id}`);
      sendResponse(res, 404, false, 'Shop not found');
      return;
    }

    // 1. Revenue by Month
    const revenueQuery = `
      SELECT TO_CHAR(created_at, 'YYYY-MM') as month, COALESCE(SUM(subtotal), 0)::float as revenue
      FROM sub_orders
      WHERE vendor_id = $1 AND status != 'cancelled'
      GROUP BY month
      ORDER BY month DESC
      LIMIT 12
    `;
    const revenueResult = await db.query(revenueQuery, [id]);
    const revenueByMonth = revenueResult.rows as IMonthlyRevenue[];

    // 2. Order Count
    const orderCountQuery = `
      SELECT COUNT(*)::int as count 
      FROM sub_orders 
      WHERE vendor_id = $1
    `;
    const orderCountResult = await db.query(orderCountQuery, [id]);
    const orderCount = orderCountResult.rows[0]?.count || 0;

    // 3. Return Rate
    const itemsQuery = `
      SELECT 
        (SELECT COUNT(*)::int FROM order_items oi JOIN products p ON oi.product_id = p.id WHERE p.vendor_id = $1) as total_items,
        (SELECT COUNT(*)::int FROM return_requests rr JOIN order_items oi ON rr.order_item_id = oi.id JOIN products p ON oi.product_id = p.id WHERE p.vendor_id = $1) as return_items
    `;
    const itemsResult = await db.query(itemsQuery, [id]);
    const totalItems = itemsResult.rows[0]?.total_items || 0;
    const returnItems = itemsResult.rows[0]?.return_items || 0;

    const returnRate = totalItems > 0 ? parseFloat(((returnItems / totalItems) * 100).toFixed(2)) : 0.0;

    const stats: IShopStats = {
      revenue_by_month: revenueByMonth,
      order_count: orderCount,
      return_rate: returnRate,
    };

    console.log(`[admin-shop]: Get Shop Stats Successful - 200 - ID: ${id}`);
    sendResponse<IShopStats>(res, 200, true, 'Shop statistics retrieved successfully', stats);
  } catch (error) {
    const err = error as Error;
    console.error(`[Error - admin-shop]: GET /api/admin/shops/${req.params.id}/stats - 500 - ${err.message}`);
    sendResponse(res, 500, false, 'Internal Server Error');
  }
};
