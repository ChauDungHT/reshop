import { Request, Response } from 'express';
import { sendResponse } from '../../shared/response';
import db from '../../core/db';
import { IProduct, IReview, IQAItem } from '../../shared/types/models';
import { IPaginatedData } from '../../shared/types/api';

export const getProducts = async (req: Request, res: Response): Promise<void> => {
  try {
    const { category, category_id, min_price, max_price, is_featured, q, sort, page = '1', limit = '20' } = req.query;

    const queryParams: (string | number | boolean)[] = [];
    const queryConditions: string[] = ["p.status = 'active'"];

    if (category_id) {
      queryParams.push(category_id as string);
      queryConditions.push(`p.category_id = $${queryParams.length}`);
    } else if (category) {
      const categoryValue = category as string;
      queryParams.push(categoryValue);
      queryConditions.push(`(c.slug = $${queryParams.length} OR c.name ILIKE $${queryParams.length})`);
    }

    if (min_price) {
      queryParams.push(min_price as string);
      queryConditions.push(`p.price >= $${queryParams.length}`);
    }

    if (max_price) {
      queryParams.push(max_price as string);
      queryConditions.push(`p.price <= $${queryParams.length}`);
    }

    if (is_featured === 'true') {
      queryConditions.push(`p.is_featured = true`);
    }

    if (q) {
      queryParams.push(`%${q}%`);
      queryConditions.push(`(p.name ILIKE $${queryParams.length} OR p.description ILIKE $${queryParams.length})`);
    }

    const whereClause = queryConditions.length > 0 ? `WHERE ${queryConditions.join(' AND ')}` : '';

    let orderByClause = 'ORDER BY p.created_at DESC'; // default
    if (sort === 'price_asc') {
      orderByClause = 'ORDER BY p.price ASC';
    } else if (sort === 'price_desc') {
      orderByClause = 'ORDER BY p.price DESC';
    } else if (sort === 'latest') {
      orderByClause = 'ORDER BY p.created_at DESC';
    } else if (sort === 'rating') {
      orderByClause = 'ORDER BY p.average_rating DESC';
    }

    const pageNum = parseInt(page as string, 10) || 1;
    const limitNum = parseInt(limit as string, 10) || 20;
    const offset = (pageNum - 1) * limitNum;

    const baseFromClause = `FROM products p JOIN categories c ON p.category_id = c.id`;
    const countQuery = `SELECT COUNT(*) ${baseFromClause} ${whereClause}`;
    const countResult = await db.query(countQuery, queryParams);
    const total = parseInt(countResult.rows[0].count, 10);

    const queryParamsWithPagination = [...queryParams, limitNum, offset];
    const dataQuery = `
      SELECT p.id,
             p.name,
             p.price,
             p.image_urls,
             p.average_rating,
             p.is_featured,
             p.stock,
             p.category_id,
             c.name AS category_name,
             c.slug AS category_slug,
             p.vendor_id,
             p.status,
             p.created_at,
             p.updated_at
      ${baseFromClause}
      ${whereClause}
      ${orderByClause}
      LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}
    `;

    const result = await db.query(dataQuery, queryParamsWithPagination);

    console.log(`[catalog]: Fetch Products Successful - 200 - Page ${pageNum}`);
    sendResponse<IPaginatedData<IProduct>>(res, 200, true, 'Products retrieved successfully', {
      items: result.rows as IProduct[],
      total,
      page: pageNum,
      limit: limitNum,
      total_pages: Math.ceil(total / limitNum)
    });
  } catch (err) {
    console.error('Error getProducts:', err);
    console.log(`[Error - catalog]: GET /api/products - 500 - Internal Server Error`);
    sendResponse(res, 500, false, 'Internal Server Error');
  }
};

export const getProductById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const productQuery = `
      SELECT p.*, 
             v.store_name, v.slug as vendor_slug, v.status as vendor_status, v.id as vendor_id
      FROM products p
      JOIN vendors v ON p.vendor_id = v.id
      WHERE p.id = $1 AND p.status = 'active'
    `;
    const productResult = await db.query(productQuery, [id]);

    if (productResult.rows.length === 0) {
      console.log(`[catalog]: Fetch Product Failed - 404 - Product not found: ${id}`);
      sendResponse(res, 404, false, 'Product not found');
      return;
    }

    const product = productResult.rows[0];

    const relatedQuery = `
      SELECT id, name, price, image_urls, average_rating
      FROM products
      WHERE category_id = $1 AND id != $2 AND status = 'active'
      ORDER BY created_at DESC
      LIMIT 4
    `;
    const relatedResult = await db.query(relatedQuery, [product.category_id, id]);

    // Fetch Reviews
    const reviewsQuery = `
      SELECT r.*, u.name as user_name, u.avatar_url
      FROM reviews r
      JOIN users u ON r.user_id = u.id
      WHERE r.product_id = $1
      ORDER BY r.created_at DESC
    `;
    const reviewsResult = await db.query(reviewsQuery, [id]);

    // Fetch QA
    const qaQuery = `
      SELECT q.*, u.name as user_name
      FROM qa q
      JOIN users u ON q.user_id = u.id
      WHERE q.product_id = $1
      ORDER BY q.created_at DESC
    `;
    const qaResult = await db.query(qaQuery, [id]);

    console.log(`[catalog]: Fetch Product By ID Successful - 200 - Product: ${id}`);
    sendResponse<{ product: IProduct; relatedProducts: IProduct[]; reviews: IReview[]; qa: IQAItem[]; }>(res, 200, true, 'Product details retrieved successfully', {
      product: product as IProduct,
      relatedProducts: relatedResult.rows as IProduct[],
      reviews: reviewsResult.rows as IReview[],
      qa: qaResult.rows as IQAItem[],
    });
  } catch (err) {
    console.error('Error getProductById:', err);
    console.log(`[Error - catalog]: GET /api/products/${req.params.id} - 500 - Internal Server Error`);
    sendResponse(res, 500, false, 'Internal Server Error');
  }
};


export const createQuestion = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id: product_id } = req.params;
    const { question } = req.body;
    const user_id = (req as any).user.id;

    if (!question || question.trim().length === 0) {
      sendResponse(res, 400, false, 'Question content is required');
      return;
    }

    const insertQuery = `
      INSERT INTO qa (product_id, user_id, question)
      VALUES ($1, $2, $3)
      RETURNING *
    `;
    const result = await db.query(insertQuery, [product_id, user_id, question]);

    console.log(`[catalog]: Create QA Successful - 201 - Product: ${product_id}, User: ${user_id}`);
    sendResponse(res, 201, true, 'Question submitted successfully', result.rows[0]);
  } catch (err) {
    console.error('Error createQuestion:', err);
    console.log(`[Error - catalog]: POST /api/products/${req.params.id}/qa - 500 - Internal Server Error`);
    sendResponse(res, 500, false, 'Internal Server Error');
  }
};
