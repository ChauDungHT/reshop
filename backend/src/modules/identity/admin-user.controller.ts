import { Request, Response } from 'express';
import db from '../../core/db';
import { sendResponse } from '../../shared/response';
import { IUser } from '../../shared/types/models';
import { IPaginatedData } from '../../shared/types/api';

export interface IUserDetail extends IUser {
  orders_count: number;
  wallet_transactions_count: number;
  vendor_profile: {
    id: string;
    store_name: string;
    slug: string;
    status: string;
    commission_rate: number;
    bank_info?: unknown;
    logo_url?: string | null;
    banner_url?: string | null;
    phone?: string | null;
    address?: string | null;
    email?: string | null;
    return_policy_days: number;
    return_policy_desc?: string | null;
    products_count: number;
    created_at: string;
    updated_at: string;
  } | null;
}

export const getUsers = async (req: Request, res: Response): Promise<void> => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string || '1', 10));
    const limit = Math.max(1, parseInt(req.query.limit as string || '20', 10));
    const role = req.query.role as string | undefined;
    const status = req.query.status as string | undefined;
    const q = req.query.q as string | undefined;

    const conditions: string[] = [];
    const params: (string | number)[] = [];

    if (role === 'customer' || role === 'vendor' || role === 'admin') {
      params.push(role);
      conditions.push(`role = $${params.length}`);
    }

    if (status === 'active' || status === 'banned' || status === 'pending') {
      params.push(status);
      conditions.push(`status = $${params.length}`);
    }

    if (q && q.trim().length > 0) {
      params.push(`%${q.trim()}%`);
      conditions.push(`(name ILIKE $${params.length} OR email ILIKE $${params.length})`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countQuery = `SELECT COUNT(*)::int as total FROM users ${whereClause}`;
    const countResult = await db.query(countQuery, params);
    const total = countResult.rows[0]?.total || 0;

    const offset = (page - 1) * limit;
    
    // Add pagination limit and offset
    const queryParams = [...params, limit, offset];
    const itemsQuery = `
      SELECT id, name, email, role, status, wallet_balance::float as wallet_balance, phone, address, avatar_url, last_login_at, created_at
      FROM users
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${queryParams.length - 1} OFFSET $${queryParams.length}
    `;

    const itemsResult = await db.query(itemsQuery, queryParams);
    const items = itemsResult.rows as IUser[];

    const totalPages = Math.ceil(total / limit);

    const paginatedData: IPaginatedData<IUser> = {
      items,
      total,
      page,
      limit,
      total_pages: totalPages,
    };

    console.log(`[admin-user]: List Users Successful - 200 - Total: ${total}, Page: ${page}`);
    sendResponse<IPaginatedData<IUser>>(res, 200, true, 'Users retrieved successfully', paginatedData);
  } catch (error: unknown) {
    const err = error as Error;
    console.error(`[Error - admin-user]: GET /api/admin/users - 500 - ${err.message}`);
    sendResponse(res, 500, false, 'Internal Server Error');
  }
};

export const getUserDetail = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const userResult = await db.query(`
      SELECT id, name, email, role, status, wallet_balance::float as wallet_balance, phone, address, avatar_url, last_login_at, created_at
      FROM users
      WHERE id = $1
    `, [id]);

    if (userResult.rows.length === 0) {
      console.log(`[admin-user]: Fetch User Detail Failed - 404 - User ID: ${id} Not Found`);
      sendResponse(res, 404, false, 'User not found');
      return;
    }

    const user = userResult.rows[0] as IUser;

    const statsResult = await db.query(`
      SELECT 
        (SELECT COUNT(*)::int FROM orders WHERE buyer_id = $1) as orders_count,
        (SELECT COUNT(*)::int FROM wallet_transactions WHERE user_id = $1) as wallet_transactions_count
    `, [id]);

    const ordersCount = statsResult.rows[0]?.orders_count || 0;
    const walletTransactionsCount = statsResult.rows[0]?.wallet_transactions_count || 0;

    let vendorProfile = null;

    if (user.role === 'vendor') {
      const vendorResult = await db.query(`
        SELECT id, store_name, slug, status, commission_rate::float as commission_rate, bank_info, logo_url, banner_url, phone, address, email, return_policy_days, return_policy_desc, created_at, updated_at
        FROM vendors
        WHERE user_id = $1
      `, [id]);

      if (vendorResult.rows.length > 0) {
        const vendor = vendorResult.rows[0];
        
        const productsCountResult = await db.query(`
          SELECT COUNT(*)::int as count FROM products WHERE vendor_id = $1
        `, [vendor.id]);
        
        const productsCount = productsCountResult.rows[0]?.count || 0;

        vendorProfile = {
          id: vendor.id,
          store_name: vendor.store_name,
          slug: vendor.slug,
          status: vendor.status,
          commission_rate: vendor.commission_rate,
          bank_info: vendor.bank_info,
          logo_url: vendor.logo_url,
          banner_url: vendor.banner_url,
          phone: vendor.phone,
          address: vendor.address,
          email: vendor.email,
          return_policy_days: vendor.return_policy_days,
          return_policy_desc: vendor.return_policy_desc,
          products_count: productsCount,
          created_at: vendor.created_at,
          updated_at: vendor.updated_at,
        };
      }
    }

    const detailedProfile: IUserDetail = {
      ...user,
      orders_count: ordersCount,
      wallet_transactions_count: walletTransactionsCount,
      vendor_profile: vendorProfile,
    };

    console.log(`[admin-user]: Fetch User Detail Successful - 200 - User ID: ${id}`);
    sendResponse<IUserDetail>(res, 200, true, 'User profile fetched successfully', detailedProfile);
  } catch (error: unknown) {
    const err = error as Error;
    console.error(`[Error - admin-user]: GET /api/admin/users/${req.params.id} - 500 - ${err.message}`);
    sendResponse(res, 500, false, 'Internal Server Error');
  }
};

export const banUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { reason } = req.body as { reason?: string };

    const userCheck = await db.query('SELECT id, role FROM users WHERE id = $1', [id]);
    if (userCheck.rows.length === 0) {
      console.log(`[admin-user]: Ban User Failed - 404 - User ID: ${id} Not Found`);
      sendResponse(res, 404, false, 'User not found');
      return;
    }

    const user = userCheck.rows[0];
    if (user.role === 'admin') {
      console.log(`[admin-user]: Ban User Failed - 400 - Cannot ban admin user`);
      sendResponse(res, 400, false, 'Cannot ban an administrator');
      return;
    }

    // Update status to 'banned'
    await db.query("UPDATE users SET status = 'banned' WHERE id = $1", [id]);

    // If user is a vendor, sync their vendor record status to 'banned'
    if (user.role === 'vendor') {
      await db.query("UPDATE vendors SET status = 'banned' WHERE user_id = $1", [id]);
    }

    console.log(`[admin-user]: User banned successfully - 200 - User ID: ${id}, Reason: ${reason || 'None'}`);
    sendResponse<null>(res, 200, true, 'User banned successfully', null);
  } catch (error: unknown) {
    const err = error as Error;
    console.error(`[Error - admin-user]: POST /api/admin/users/${req.params.id}/ban - 500 - ${err.message}`);
    sendResponse(res, 500, false, 'Internal Server Error');
  }
};

export const unbanUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const userCheck = await db.query('SELECT id, role FROM users WHERE id = $1', [id]);
    if (userCheck.rows.length === 0) {
      console.log(`[admin-user]: Unban User Failed - 404 - User ID: ${id} Not Found`);
      sendResponse(res, 404, false, 'User not found');
      return;
    }

    const user = userCheck.rows[0];

    // Update status to 'active'
    await db.query("UPDATE users SET status = 'active' WHERE id = $1", [id]);

    // If user is a vendor, sync their vendor record status to 'active'
    if (user.role === 'vendor') {
      await db.query("UPDATE vendors SET status = 'active' WHERE user_id = $1", [id]);
    }

    console.log(`[admin-user]: User unbanned successfully - 200 - User ID: ${id}`);
    sendResponse<null>(res, 200, true, 'User unbanned successfully', null);
  } catch (error: unknown) {
    const err = error as Error;
    console.error(`[Error - admin-user]: POST /api/admin/users/${req.params.id}/unban - 500 - ${err.message}`);
    sendResponse(res, 500, false, 'Internal Server Error');
  }
};

export interface IPendingVendorItem {
  user_id: string;
  name: string;
  email: string;
  user_status: string;
  user_created_at: string;
  vendor_id: string;
  store_name: string;
  slug: string;
  vendor_status: string;
  logo_url: string | null;
  banner_url: string | null;
  phone: string | null;
  address: string | null;
  vendor_email: string | null;
  return_policy_days: number;
  return_policy_desc: string | null;
  vendor_created_at: string;
}

export const getPendingVendors = async (req: Request, res: Response): Promise<void> => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string || '1', 10));
    const limit = Math.max(1, parseInt(req.query.limit as string || '20', 10));
    const offset = (page - 1) * limit;

    const countQuery = `
      SELECT COUNT(*)::int as total 
      FROM users u
      INNER JOIN vendors v ON v.user_id = u.id
      WHERE u.role = 'vendor' AND u.status = 'pending'
    `;
    const countResult = await db.query(countQuery);
    const total = countResult.rows[0]?.total || 0;

    const itemsQuery = `
      SELECT 
        u.id as user_id, u.name, u.email, u.status as user_status, u.created_at as user_created_at,
        v.id as vendor_id, v.store_name, v.slug, v.status as vendor_status, v.logo_url, v.banner_url, v.phone, v.address, v.email as vendor_email, v.return_policy_days, v.return_policy_desc, v.created_at as vendor_created_at
      FROM users u
      INNER JOIN vendors v ON v.user_id = u.id
      WHERE u.role = 'vendor' AND u.status = 'pending'
      ORDER BY u.created_at DESC
      LIMIT $1 OFFSET $2
    `;
    const itemsResult = await db.query(itemsQuery, [limit, offset]);
    const items = itemsResult.rows as IPendingVendorItem[];

    const totalPages = Math.ceil(total / limit);

    const paginatedData: IPaginatedData<IPendingVendorItem> = {
      items,
      total,
      page,
      limit,
      total_pages: totalPages,
    };

    console.log(`[admin-user]: List Pending Vendors Successful - 200 - Total: ${total}, Page: ${page}`);
    sendResponse<IPaginatedData<IPendingVendorItem>>(res, 200, true, 'Pending vendors retrieved successfully', paginatedData);
  } catch (error: unknown) {
    const err = error as Error;
    console.error(`[Error - admin-user]: GET /api/admin/vendors/pending - 500 - ${err.message}`);
    sendResponse(res, 500, false, 'Internal Server Error');
  }
};

export const approveVendor = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const client = await db.pool.connect();

  try {
    await client.query('BEGIN');

    const checkResult = await client.query(
      'SELECT id, role, status FROM users WHERE id = $1 FOR UPDATE',
      [id]
    );

    if (checkResult.rows.length === 0) {
      await client.query('ROLLBACK');
      console.log(`[admin-user]: Approve Vendor Failed - 404 - User ID: ${id} Not Found`);
      sendResponse(res, 404, false, 'User not found');
      return;
    }

    const user = checkResult.rows[0];

    if (user.role !== 'vendor') {
      await client.query('ROLLBACK');
      console.log(`[admin-user]: Approve Vendor Failed - 400 - User ID: ${id} is not a vendor`);
      sendResponse(res, 400, false, 'User is not a vendor');
      return;
    }

    if (user.status !== 'pending') {
      await client.query('ROLLBACK');
      console.log(`[admin-user]: Approve Vendor Failed - 400 - Vendor ID: ${id} is not pending (status: ${user.status})`);
      sendResponse(res, 400, false, 'Only pending vendors can be approved');
      return;
    }

    // 1. Update users table status
    await client.query(
      "UPDATE users SET status = 'active' WHERE id = $1",
      [id]
    );

    // 2. Update vendors table status
    await client.query(
      "UPDATE vendors SET status = 'active' WHERE user_id = $1",
      [id]
    );

    await client.query('COMMIT');

    console.log(`[admin-user]: Vendor approved successfully - 200 - User ID: ${id}`);
    sendResponse<null>(res, 200, true, 'Vendor approved successfully', null);
  } catch (error: unknown) {
    await client.query('ROLLBACK');
    const err = error as Error;
    console.error(`[Error - admin-user]: POST /api/admin/vendors/${id}/approve - 500 - ${err.message}`);
    sendResponse(res, 500, false, 'Internal Server Error');
  } finally {
    client.release();
  }
};

export const rejectVendor = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { reason } = req.body as { reason?: string };

    const userResult = await db.query(
      'SELECT id, role, status FROM users WHERE id = $1',
      [id]
    );

    if (userResult.rows.length === 0) {
      console.log(`[admin-user]: Reject Vendor Failed - 404 - User ID: ${id} Not Found`);
      sendResponse(res, 404, false, 'User not found');
      return;
    }

    const user = userResult.rows[0];

    if (user.role !== 'vendor') {
      console.log(`[admin-user]: Reject Vendor Failed - 400 - User ID: ${id} is not a vendor`);
      sendResponse(res, 400, false, 'User is not a vendor');
      return;
    }

    if (user.status !== 'pending') {
      console.log(`[admin-user]: Reject Vendor Failed - 400 - Vendor ID: ${id} is not pending (status: ${user.status})`);
      sendResponse(res, 400, false, 'Only pending vendors can be rejected');
      return;
    }

    // 1. Update users table
    await db.query(
      "UPDATE users SET status = 'rejected' WHERE id = $1",
      [id]
    );

    // 2. Update vendors status to 'inactive'
    await db.query(
      "UPDATE vendors SET status = 'inactive' WHERE user_id = $1",
      [id]
    );

    console.log(`[admin-user]: Vendor rejected successfully - 200 - User ID: ${id}, Reason: ${reason || 'None'}`);
    sendResponse<null>(res, 200, true, 'Vendor rejected successfully', null);
  } catch (error: unknown) {
    const err = error as Error;
    console.error(`[Error - admin-user]: POST /api/admin/vendors/${req.params.id}/reject - 500 - ${err.message}`);
    sendResponse(res, 500, false, 'Internal Server Error');
  }
};
