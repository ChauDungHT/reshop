import { Request, Response } from 'express';
import db from '../../core/db';
import { sendResponse } from '../../shared/response';

export const getDashboardStats = async (req: Request, res: Response): Promise<void> => {
  try {
    // 1. Total Revenue (total_amount of delivered orders)
    const revenueResult = await db.query(`
      SELECT COALESCE(SUM(total_amount), 0)::float as total_revenue 
      FROM orders 
      WHERE status = 'delivered'
    `);
    const totalRevenue = revenueResult.rows[0]?.total_revenue || 0;

    // 2. New Orders Today (created starting from today's midnight UTC/Local)
    const newOrdersTodayResult = await db.query(`
      SELECT COUNT(*)::int as count 
      FROM orders 
      WHERE created_at >= CURRENT_DATE
    `);
    const newOrdersToday = newOrdersTodayResult.rows[0]?.count || 0;

    // 2b. Old KPI: Orders Today (last 24 hours - for backward compatibility with existing tests)
    const ordersResult = await db.query(`
      SELECT COUNT(*)::int as orders_today 
      FROM orders 
      WHERE created_at >= NOW() - INTERVAL '24 hours'
    `);
    const ordersToday = ordersResult.rows[0]?.orders_today || 0;

    // 3. Active Users Count (customers and vendors active)
    const usersResult = await db.query(`
      SELECT COUNT(*)::int as active_users 
      FROM users 
      WHERE status = 'active'
    `);
    const activeUsers = usersResult.rows[0]?.active_users || 0;

    // 3b. Active Vendors Count (new requirement)
    const vendorsResult = await db.query(`
      SELECT COUNT(*)::int as active_vendors 
      FROM vendors 
      WHERE status = 'active'
    `);
    const activeVendors = vendorsResult.rows[0]?.active_vendors || 0;

    // 4. Total Products Count (new requirement)
    const totalProductsResult = await db.query(`
      SELECT COUNT(*)::int as total_products 
      FROM products 
      WHERE deleted_at IS NULL
    `);
    const totalProducts = totalProductsResult.rows[0]?.total_products || 0;

    // 4b. Old KPI: Active Products Count (for backward compatibility with existing tests)
    const productsResult = await db.query(`
      SELECT COUNT(*)::int as active_products 
      FROM products 
      WHERE status = 'active' AND deleted_at IS NULL
    `);
    const activeProducts = productsResult.rows[0]?.active_products || 0;

    // 5. Top 10 Shops by Revenue (limit increased to 10)
    const topShopsResult = await db.query(`
      SELECT 
        v.id, 
        v.store_name, 
        v.slug,
        COALESCE(SUM(so.subtotal), 0)::float as revenue
      FROM vendors v
      LEFT JOIN sub_orders so ON v.id = so.vendor_id AND so.status != 'cancelled'
      GROUP BY v.id, v.store_name, v.slug
      ORDER BY revenue DESC
      LIMIT 10
    `);
    const topShops = topShopsResult.rows;

    // 6. Top 10 Products by Sales (limit increased to 10)
    const topProductsResult = await db.query(`
      SELECT 
        p.id, 
        p.name, 
        COALESCE(SUM(oi.quantity), 0)::int as sales_count,
        COALESCE(SUM(oi.quantity * oi.price_snapshot), 0)::float as sales_amount
      FROM products p
      LEFT JOIN order_items oi ON p.id = oi.product_id
      GROUP BY p.id, p.name
      ORDER BY sales_count DESC
      LIMIT 10
    `);
    const topProducts = topProductsResult.rows;

    console.log('[admin-stats]: Dashboard stats fetched successfully');
    sendResponse(res, 200, true, 'Dashboard stats retrieved successfully', {
      total_revenue: totalRevenue,
      new_orders_today: newOrdersToday,
      orders_today: ordersToday, // compatibility
      active_users: activeUsers,
      active_vendors: activeVendors,
      total_products: totalProducts,
      active_products: activeProducts, // compatibility
      top_shops: topShops,
      top_products: topProducts,
    });
  } catch (error: unknown) {
    const err = error as Error;
    console.error(`[Error - admin-stats]: GET /api/admin/dashboard/stats - 500 - ${err.message}`);
    sendResponse(res, 500, false, 'Internal Server Error');
  }
};

export const getDashboardCharts = async (req: Request, res: Response): Promise<void> => {
  try {
    const rangeParam = (req.query.range as string) || '7d';

    let interval = '7 days';
    let dateFormat = 'YYYY-MM-DD';

    if (rangeParam === '30d' || rangeParam === '30days') {
      interval = '30 days';
      dateFormat = 'YYYY-MM-DD';
    } else if (rangeParam === '1y' || rangeParam === '1year') {
      interval = '1 year';
      dateFormat = 'YYYY-MM';
    }

    // 1. Revenue and Orders trend over time
    const trendResult = await db.query(`
      SELECT 
        TO_CHAR(created_at, $1) as date,
        COALESCE(SUM(total_amount), 0)::float as revenue,
        COUNT(*)::int as orders_count
      FROM orders
      WHERE status != 'cancelled' AND created_at >= NOW() - CAST($2 AS INTERVAL)
      GROUP BY TO_CHAR(created_at, $1)
      ORDER BY date ASC
    `, [dateFormat, interval]);
    const trend = trendResult.rows;

    // 2. Order status distribution counts
    const distributionResult = await db.query(`
      SELECT 
        status,
        COUNT(*)::int as count
      FROM orders
      GROUP BY status
    `);
    const distribution = distributionResult.rows;

    // 3. Top 10 Shops by Revenue for charts
    const topShopsResult = await db.query(`
      SELECT 
        v.id, 
        v.store_name, 
        v.slug,
        COALESCE(SUM(so.subtotal), 0)::float as revenue
      FROM vendors v
      LEFT JOIN sub_orders so ON v.id = so.vendor_id AND so.status != 'cancelled'
      GROUP BY v.id, v.store_name, v.slug
      ORDER BY revenue DESC
      LIMIT 10
    `);
    const topShops = topShopsResult.rows;

    // 4. Top 10 Products by Sales for charts
    const topProductsResult = await db.query(`
      SELECT 
        p.id, 
        p.name, 
        COALESCE(SUM(oi.quantity), 0)::int as sales_count,
        COALESCE(SUM(oi.quantity * oi.price_snapshot), 0)::float as sales_amount
      FROM products p
      LEFT JOIN order_items oi ON p.id = oi.product_id
      GROUP BY p.id, p.name
      ORDER BY sales_count DESC
      LIMIT 10
    `);
    const topProducts = topProductsResult.rows;

    console.log(`[admin-stats]: Dashboard charts fetched successfully with range: ${rangeParam}`);
    sendResponse(res, 200, true, 'Dashboard charts retrieved successfully', {
      trend,
      distribution,
      top_shops: topShops,
      top_products: topProducts,
    });
  } catch (error: unknown) {
    const err = error as Error;
    console.error(`[Error - admin-stats]: GET /api/admin/dashboard/charts - 500 - ${err.message}`);
    sendResponse(res, 500, false, 'Internal Server Error');
  }
};

// Helper to convert JSON objects to CSV string safely
function convertToCSV(data: Record<string, unknown>[]): string {
  if (data.length === 0) return '';
  const headers = Object.keys(data[0]);
  const csvRows = [headers.join(',')];

  for (const row of data) {
    const values = headers.map(header => {
      const val = row[header];
      const escaped = String(val === null || val === undefined ? '' : val).replace(/"/g, '""');
      return `"${escaped}"`;
    });
    csvRows.push(values.join(','));
  }
  return csvRows.join('\n');
}

export const exportOrdersReport = async (req: Request, res: Response): Promise<void> => {
  try {
    const startDate = req.query.startDate as string | undefined;
    const endDate = req.query.endDate as string | undefined;

    let query = `
      SELECT 
        TO_CHAR(o.created_at, 'YYYY-MM-DD HH24:MI:SS') as "Date",
        o.order_code as "Code",
        COALESCE(STRING_AGG(DISTINCT v.store_name, ', '), '') as "Shop",
        o.total_amount as "Total",
        o.status as "Status"
      FROM orders o
      LEFT JOIN sub_orders so ON o.id = so.order_id
      LEFT JOIN vendors v ON so.vendor_id = v.id
      WHERE 1=1
    `;
    const params: string[] = [];

    if (startDate) {
      params.push(startDate);
      query += ` AND o.created_at >= $${params.length}::timestamp`;
    }
    if (endDate) {
      if (typeof endDate === 'string' && endDate.length === 10) {
        params.push(endDate + ' 23:59:59');
      } else {
        params.push(endDate);
      }
      query += ` AND o.created_at <= $${params.length}::timestamp`;
    }

    query += `
      GROUP BY o.id, o.created_at, o.order_code, o.total_amount, o.status
      ORDER BY o.created_at DESC
    `;

    const result = await db.query(query, params);
    
    // Typecast rows to compile safely without "as any"
    const rows = result.rows as unknown as Record<string, unknown>[];
    const csvContent = convertToCSV(rows);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=orders_report.csv');
    res.status(200).send(csvContent);
  } catch (error: unknown) {
    const err = error as Error;
    console.error(`[Error - admin-stats]: GET /api/admin/reports/orders/export - 500 - ${err.message}`);
    // For raw file download endpoints, we still return a clean 500
    res.status(500).json({
      success: false,
      message: 'Internal Server Error',
      data: null
    });
  }
};
