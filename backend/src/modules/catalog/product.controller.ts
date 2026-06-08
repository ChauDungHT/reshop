import { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { sendResponse } from '../../shared/response';
import db from '../../core/db';
import { IProduct, IReview, IQAItem } from '../../shared/types/models';
import { IPaginatedData } from '../../shared/types/api';
import { processProductMainImage, processProductThumbImage } from '../../shared/utils/image-processor';

export const getProducts = async (req: Request, res: Response): Promise<void> => {
  try {
    const { category, category_id, min_price, max_price, is_featured, q, sort, page = '1', limit = '20' } = req.query;

    const queryParams: (string | number | boolean)[] = [];
    const queryConditions: string[] = ["p.status = 'active'", "v.status = 'active'"];

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

    const baseFromClause = `FROM products p JOIN categories c ON p.category_id = c.id JOIN vendors v ON p.vendor_id = v.id`;
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
      WHERE p.id = $1 AND p.status = 'active' AND v.status = 'active'
    `;
    const productResult = await db.query(productQuery, [id]);

    if (productResult.rows.length === 0) {
      console.log(`[catalog]: Fetch Product Failed - 404 - Product not found: ${id}`);
      sendResponse(res, 404, false, 'Product not found');
      return;
    }

    const product = productResult.rows[0];

    const relatedQuery = `
      SELECT p.id, p.name, p.price, p.image_urls, p.average_rating
      FROM products p
      JOIN vendors v ON p.vendor_id = v.id
      WHERE p.category_id = $1 AND p.id != $2 AND p.status = 'active' AND v.status = 'active'
      ORDER BY p.created_at DESC
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

export const uploadProductImages = async (req: Request, res: Response): Promise<void> => {
  try {
    const productId = req.params.id;
    const vendorId = req.user?.vendor_id;

    if (typeof productId !== 'string' || !vendorId) {
      console.log(`[catalog]: Upload Product Images Failed - 403 - User is not a vendor or invalid product ID`);
      sendResponse(res, 403, false, 'Forbidden');
      return;
    }

    // 1. Check product existence and ownership
    const productResult = await db.query(
      'SELECT vendor_id FROM products WHERE id = $1',
      [productId]
    );

    if (productResult.rows.length === 0) {
      console.log(`[catalog]: Upload Product Images Failed - 404 - Product not found: ${productId}`);
      sendResponse(res, 404, false, 'Product not found');
      return;
    }

    const product = productResult.rows[0];
    if (product.vendor_id !== vendorId) {
      console.log(`[catalog]: Upload Product Images Failed - 403 - Vendor ${vendorId} does not own product ${productId}`);
      sendResponse(res, 403, false, 'Forbidden');
      return;
    }

    const files = req.files as Express.Multer.File[];
    if (!files || files.length === 0) {
      console.log(`[catalog]: Upload Product Images Failed - 400 - No files provided`);
      sendResponse(res, 400, false, 'No files uploaded');
      return;
    }

    const uploadDir = path.join(process.cwd(), 'uploads', 'products', vendorId, productId);
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    // Check if there are any existing images for this product
    const imgCheck = await db.query(
      'SELECT COUNT(*) FROM product_images WHERE product_id = $1',
      [productId]
    );
    const existingCount = parseInt(imgCheck.rows[0].count, 10);
    const hasPrimary = await db.query(
      'SELECT id FROM product_images WHERE product_id = $1 AND is_primary = true LIMIT 1',
      [productId]
    );
    let nextPrimaryIndex = hasPrimary.rows.length === 0 ? 0 : -1;

    const uploadedImages = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const uuid = crypto.randomUUID();
      const mainFilename = `main_${uuid}.webp`;
      const thumbFilename = `thumb_${uuid}.webp`;

      if (process.env.NODE_ENV !== 'test') {
        const mainBuffer = await processProductMainImage(file.buffer);
        const thumbBuffer = await processProductThumbImage(file.buffer);

        fs.writeFileSync(path.join(uploadDir, mainFilename), mainBuffer);
        fs.writeFileSync(path.join(uploadDir, thumbFilename), thumbBuffer);
      }

      const relativeUrl = `/uploads/products/${vendorId}/${productId}/${mainFilename}`;
      const isPrimary = (i === nextPrimaryIndex);
      const displayOrder = existingCount + i;

      const insertResult = await db.query(
        `INSERT INTO product_images (product_id, url, is_primary, display_order)
         VALUES ($1, $2, $3, $4)
         RETURNING id, product_id, url, is_primary, display_order, created_at`,
        [productId, relativeUrl, isPrimary, displayOrder]
      );

      uploadedImages.push(insertResult.rows[0]);
    }

    await syncProductImageUrls(productId);
    console.log(`[catalog]: Upload Product Images Successful - 201 - Product: ${productId}, Images uploaded: ${files.length}`);
    sendResponse(res, 201, true, 'Product images uploaded successfully', uploadedImages);
  } catch (error: any) {
    console.error('Error uploadProductImages:', error);
    console.log(`[Error - catalog]: POST /api/products/${req.params.id}/images - 500 - ${error.message}`);
    sendResponse(res, 500, false, 'Internal Server Error');
  }
};

const syncProductImageUrls = async (productId: string) => {
  try {
    const images = await db.query(
      'SELECT url FROM product_images WHERE product_id = $1 ORDER BY is_primary DESC, display_order ASC, created_at ASC',
      [productId]
    );
    if (!images || !images.rows) {
      return;
    }
    const urls = images.rows.map((r: any) => r.url);
    await db.query(
      'UPDATE products SET image_urls = $1 WHERE id = $2',
      [JSON.stringify(urls), productId]
    );
  } catch (err) {
    console.error('Error in syncProductImageUrls:', err);
  }
};

export const deleteProductImage = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id: productId, imageId } = req.params;
    const vendorId = req.user?.vendor_id;

    if (typeof productId !== 'string' || typeof imageId !== 'string' || !vendorId) {
      console.log(`[catalog]: Delete Product Image Failed - 403 - User is not a vendor or invalid parameters`);
      sendResponse(res, 403, false, 'Forbidden');
      return;
    }

    // 1. Check product existence and ownership
    const productResult = await db.query(
      'SELECT vendor_id FROM products WHERE id = $1',
      [productId]
    );

    if (productResult.rows.length === 0) {
      console.log(`[catalog]: Delete Product Image Failed - 404 - Product not found: ${productId}`);
      sendResponse(res, 404, false, 'Product not found');
      return;
    }

    const product = productResult.rows[0];
    if (product.vendor_id !== vendorId) {
      console.log(`[catalog]: Delete Product Image Failed - 403 - Vendor ${vendorId} does not own product ${productId}`);
      sendResponse(res, 403, false, 'Forbidden');
      return;
    }

    // 2. Check image existence
    const imageResult = await db.query(
      'SELECT id, url, is_primary FROM product_images WHERE id = $1 AND product_id = $2',
      [imageId, productId]
    );

    if (imageResult.rows.length === 0) {
      console.log(`[catalog]: Delete Product Image Failed - 404 - Image ${imageId} not found for product ${productId}`);
      sendResponse(res, 404, false, 'Image not found');
      return;
    }

    const image = imageResult.rows[0];

    // 3. Delete from DB
    await db.query('DELETE FROM product_images WHERE id = $1', [imageId]);

    // 4. Delete files from disk
    if (process.env.NODE_ENV !== 'test') {
      const relativeUrl = image.url;
      const mainPath = path.join(process.cwd(), relativeUrl);
      const thumbPath = mainPath.replace('/main_', '/thumb_');

      if (fs.existsSync(mainPath)) {
        fs.unlinkSync(mainPath);
      }
      if (fs.existsSync(thumbPath)) {
        fs.unlinkSync(thumbPath);
      }
    }

    // 5. Handle primary image re-assignment
    if (image.is_primary) {
      const otherImages = await db.query(
        'SELECT id FROM product_images WHERE product_id = $1 ORDER BY display_order ASC, created_at ASC LIMIT 1',
        [productId]
      );
      if (otherImages.rows.length > 0) {
        await db.query(
          'UPDATE product_images SET is_primary = true WHERE id = $1',
          [otherImages.rows[0].id]
        );
      }
    }

    await syncProductImageUrls(productId);
    console.log(`[catalog]: Delete Product Image Successful - 200 - Image ID: ${imageId}, Product: ${productId}`);
    sendResponse(res, 200, true, 'Product image deleted successfully', null);
  } catch (error: any) {
    console.error('Error deleteProductImage:', error);
    console.log(`[Error - catalog]: DELETE /api/products/${req.params.id}/images/${req.params.imageId} - 500 - ${error.message}`);
    sendResponse(res, 500, false, 'Internal Server Error');
  }
};

export const setPrimaryImage = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id: productId, imageId } = req.params;
    const vendorId = req.user?.vendor_id;

    if (typeof productId !== 'string' || typeof imageId !== 'string' || !vendorId) {
      console.log(`[catalog]: Set Primary Image Failed - 403 - User is not a vendor or invalid parameters`);
      sendResponse(res, 403, false, 'Forbidden');
      return;
    }

    // 1. Check product existence and ownership
    const productResult = await db.query(
      'SELECT vendor_id FROM products WHERE id = $1',
      [productId]
    );

    if (productResult.rows.length === 0) {
      console.log(`[catalog]: Set Primary Image Failed - 404 - Product not found: ${productId}`);
      sendResponse(res, 404, false, 'Product not found');
      return;
    }

    const product = productResult.rows[0];
    if (product.vendor_id !== vendorId) {
      console.log(`[catalog]: Set Primary Image Failed - 403 - Vendor ${vendorId} does not own product ${productId}`);
      sendResponse(res, 403, false, 'Forbidden');
      return;
    }

    // 2. Verify image belongs to product
    const imageResult = await db.query(
      'SELECT id FROM product_images WHERE id = $1 AND product_id = $2',
      [imageId, productId]
    );

    if (imageResult.rows.length === 0) {
      console.log(`[catalog]: Set Primary Image Failed - 404 - Image ${imageId} not found for product ${productId}`);
      sendResponse(res, 404, false, 'Image not found');
      return;
    }

    // 3. Clear is_primary on all other images for this product
    await db.query(
      'UPDATE product_images SET is_primary = false WHERE product_id = $1',
      [productId]
    );

    // 4. Set this image as primary
    await db.query(
      'UPDATE product_images SET is_primary = true WHERE id = $1',
      [imageId]
    );

    await syncProductImageUrls(productId);
    console.log(`[catalog]: Set Primary Image Successful - 200 - Image ID: ${imageId}, Product: ${productId}`);
    sendResponse(res, 200, true, 'Product primary image set successfully', null);
  } catch (error: any) {
    console.error('Error setPrimaryImage:', error);
    console.log(`[Error - catalog]: PUT /api/products/${req.params.id}/images/${req.params.imageId}/primary - 500 - ${error.message}`);
    sendResponse(res, 500, false, 'Internal Server Error');
  }
};
