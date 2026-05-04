import { Request, Response } from 'express';
import { sendResponse } from '../../shared/response';
import db from '../../core/db';

export const getCategories = async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await db.query(
      `SELECT id, name, slug, parent_id FROM categories ORDER BY parent_id NULLS FIRST, name ASC`
    );

    console.log(`[catalog]: Fetch Categories Successful - 200 - ${result.rowCount} categories`);
    sendResponse(res, 200, true, 'Categories retrieved successfully', {
      categories: result.rows,
    });
  } catch (err) {
    console.error('Error getCategories:', err);
    console.log(`[Error - catalog]: GET /api/categories - 500 - Internal Server Error`);
    sendResponse(res, 500, false, 'Internal Server Error');
  }
};
