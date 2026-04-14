import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import db from '../../core/db';
import { sendResponse } from '../../shared/response';

export const getProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const query = 'SELECT id, name, email, role, phone, address, avatar_url, wallet_balance FROM users WHERE id = $1';
    const result = await db.query(query, [userId]);

    if (result.rows.length === 0) {
      console.log(`[identity]: Fetch Profile Failed - 404 - User not found`);
      sendResponse(res, 404, false, 'User not found');
      return;
    }

    console.log(`[identity]: Fetch Profile Successful - 200 - User ID: ${userId}`);
    sendResponse(res, 200, true, 'User profile fetched successfully', result.rows[0]);
  } catch (error: any) {
    console.log(`[Error - identity]: GET /api/users/profile - 500 - ${error.message}`);
    sendResponse(res, 500, false, 'Internal Server Error');
  }
};

export const updateProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { phone, address, name } = req.body;
    
    const query = `
      UPDATE users 
      SET phone = COALESCE($1, phone), 
          address = COALESCE($2, address),
          name = COALESCE($3, name)
      WHERE id = $4
      RETURNING id, name, email, phone, address, avatar_url, wallet_balance
    `;
    const result = await db.query(query, [phone, address, name, userId]);

    console.log(`[identity]: Update Profile Successful - 200 - User ID: ${userId}`);
    sendResponse(res, 200, true, 'Profile updated successfully', result.rows[0]);
  } catch (error: any) {
    if (error.code === '42703') { // Undefined column in postgres
      console.log(`[Error - identity]: PUT /api/users/profile - 500 - Missing schema column (phone/address)`);
      sendResponse(res, 500, false, 'Database schema not updated');
      return;
    }
    console.log(`[Error - identity]: PUT /api/users/profile - 500 - ${error.message}`);
    sendResponse(res, 500, false, 'Internal Server Error');
  }
};

export const updatePassword = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { old_password, new_password } = req.body;

    if (!old_password || !new_password) {
      console.log(`[identity]: Update Password Failed - 400 - Missing fields`);
      sendResponse(res, 400, false, 'Missing old or new password');
      return;
    }

    const userResult = await db.query('SELECT password_hash FROM users WHERE id = $1', [userId]);
    const user = userResult.rows[0];

    if (!user) {
      sendResponse(res, 404, false, 'User not found');
      return;
    }

    const isValidPassword = await bcrypt.compare(old_password, user.password_hash);
    if (!isValidPassword) {
      console.log(`[identity]: Update Password Failed - 400 - Wrong Old Password`);
      sendResponse(res, 400, false, 'Incorrect old password');
      return;
    }

    const saltRounds = 12;
    const newPasswordHash = await bcrypt.hash(new_password, saltRounds);

    await db.query('UPDATE users SET password_hash = $1 WHERE id = $2', [newPasswordHash, userId]);

    console.log(`[identity]: Update Password Successful - 200 - User ID: ${userId}`);
    sendResponse(res, 200, true, 'Password updated successfully');
  } catch (error: any) {
    console.log(`[Error - identity]: PUT /api/users/password - 500 - ${error.message}`);
    sendResponse(res, 500, false, 'Internal Server Error');
  }
};

export const uploadAvatar = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!req.file) {
      console.log(`[identity]: Upload Avatar Failed - 400 - No file provided`);
      sendResponse(res, 400, false, 'No file uploaded');
      return;
    }

    const avatarUrl = `/uploads/avatars/${userId}/${req.file.filename}`;

    await db.query('UPDATE users SET avatar_url = $1 WHERE id = $2', [avatarUrl, userId]);

    console.log(`[identity]: Upload Avatar Successful - 200 - URL: ${avatarUrl}`);
    sendResponse(res, 200, true, 'Avatar uploaded successfully', { avatar_url: avatarUrl });
  } catch (error: any) {
    console.log(`[Error - identity]: POST /api/users/avatar - 500 - ${error.message}`);
    sendResponse(res, 500, false, 'Internal Server Error');
  }
};
