import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { sendResponse } from '../../shared/response';
import db from '../../core/db';

export const registerCustomer = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      console.log(`[auth]: Register Customer Failed - 400`);
      sendResponse(res, 400, false, 'Missing require fields: name, email, password');
      return;
    }

    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    const query = `
      INSERT INTO users (name, email, password_hash, role, status)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, email, role, status
    `;
    const values = [name, email, passwordHash, 'customer', 'active'];

    const result = await db.query(query, values);

    console.log(`[auth]: Register Customer Successful - 201`);
    sendResponse(res, 201, true, 'Registered customer successfully', result.rows[0]);
  } catch (err: any) {
    if (err.code === '23505') {
      console.log(`[auth]: Register Customer Failed - 409`);
      sendResponse(res, 409, false, 'Email is already taken');
      return;
    }
    console.error('Error registerCustomer:', err);
    console.log(`[auth]: Register Customer Failed - 500`);
    sendResponse(res, 500, false, 'Internal Server Error');
  }
};

export const registerVendor = async (req: Request, res: Response): Promise<void> => {
  const client = await db.pool.connect();
  try {
    const { email, password, name, store_name, slug, bank_info } = req.body;

    if (!email || !password || !name || !store_name || !slug) {
      console.log(`[auth]: Register Vendor Failed - 400`);
      sendResponse(res, 400, false, 'Missing required fields');
      client.release();
      return;
    }

    await client.query('BEGIN');

    // 1. Insert into users with 'vendor' role and 'pending_approval' status
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    const userQuery = `
      INSERT INTO users (name, email, password_hash, role, status)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id
    `;
    const userResult = await client.query(userQuery, [name, email, passwordHash, 'vendor', 'pending_approval']);
    const userId = userResult.rows[0].id;

    // 2. Insert into vendors
    const vendorQuery = `
      INSERT INTO vendors (user_id, store_name, slug, status, bank_info)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, store_name, status
    `;
    const vendorResult = await client.query(vendorQuery, [userId, store_name, slug, 'inactive', bank_info || {}]);

    await client.query('COMMIT');

    console.log(`[auth]: Register Vendor Successful - 201`);
    sendResponse(res, 201, true, 'Vendor registration submitted, awaiting approval', {
      user_id: userId,
      vendor: vendorResult.rows[0]
    });
  } catch (err: any) {
    await client.query('ROLLBACK');
    if (err.code === '23505') {
      console.log(`[auth]: Register Vendor Failed - 409`);
      sendResponse(res, 409, false, 'Email or Slug is already taken');
    } else {
      console.error('Error registerVendor:', err);
      console.log(`[auth]: Register Vendor Failed - 500`);
      sendResponse(res, 500, false, 'Internal Server Error');
    }
  } finally {
    client.release();
  }
};

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      console.log(`[auth]: Login Failed - 400`);
      sendResponse(res, 400, false, 'Missing email or password');
      return;
    }

    const result = await db.query('SELECT * FROM users WHERE email = $1', [email]);
    if (result.rows.length === 0) {
      console.log(`[auth]: Login Failed - 401`);
      sendResponse(res, 401, false, 'Invalid credentials');
      return;
    }

    const user = result.rows[0];

    if (user.status === 'banned') {
      console.log(`[auth]: Login Failed - 403`);
      sendResponse(res, 403, false, 'Account is banned');
      return;
    }

    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      console.log(`[auth]: Login Failed - 401`);
      sendResponse(res, 401, false, 'Invalid credentials');
      return;
    }

    // Determine payload
    let vendorId = null;
    if (user.role === 'vendor') {
      const vendorRes = await db.query('SELECT id FROM vendors WHERE user_id = $1', [user.id]);
      if (vendorRes.rows.length > 0) {
        vendorId = vendorRes.rows[0].id;
      }
    }

    const payload = {
      id: user.id,
      role: user.role,
      vendor_id: vendorId
    };

    const secret = process.env.JWT_SECRET || 'super-secret-key-fallback';
    const token = jwt.sign(payload, secret, { expiresIn: '7d' });

    console.log(`[auth]: Login Successful - 200`);
    sendResponse(res, 200, true, 'Login successful', { 
      token, 
      user: { 
        id: user.id, 
        name: user.name, 
        email: user.email,
        role: user.role, 
        status: user.status,
        wallet_balance: user.wallet_balance,
        phone: user.phone,
        address: user.address
      } 
    });
  } catch (err) {
    console.error('Error login:', err);
    console.log(`[auth]: Login Failed - 500`);
    sendResponse(res, 500, false, 'Internal Server Error');
  }
};

export const logout = async (req: Request, res: Response): Promise<void> => {
  const userId = req.user?.id;
  const userRole = req.user?.role;
  console.log(`[auth]: Logout Successful - 200 - User ID: ${userId}, Role: ${userRole}`);
  sendResponse(res, 200, true, 'Logged out successfully');
};
