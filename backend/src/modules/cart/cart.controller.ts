import { Request, Response } from 'express';
import { sendResponse } from '../../shared/response';
import db from '../../core/db';
import { ICartItem } from '../../shared/types/models';

/**
 * Lấy danh sách sản phẩm trong giỏ hàng
 */
export const getCart = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      sendResponse(res, 401, false, 'Unauthorized');
      return;
    }

    const query = `
      SELECT 
        c.id, 
        c.user_id,
        c.product_id, 
        c.quantity, 
        c.created_at,
        c.updated_at,
        p.name as product_name, 
        p.price as product_price, 
        p.stock as product_stock,
        p.image_urls->>0 as product_image,
        p.vendor_id,
        v.store_name
      FROM cart_items c
      JOIN products p ON c.product_id = p.id
      LEFT JOIN vendors v ON p.vendor_id = v.id
      WHERE c.user_id = $1
      ORDER BY c.created_at DESC
    `;
    const result = await db.query(query, [userId]);

    console.log(`[cart]: Fetch Cart Successful - 200 - User ID: ${userId}`);
    sendResponse<ICartItem[]>(res, 200, true, 'Cart fetched successfully', result.rows as ICartItem[]);
  } catch (err) {
    console.error('Error getCart:', err);
    sendResponse(res, 500, false, 'Internal Server Error');
  }
};

/**
 * Thêm sản phẩm vào giỏ hàng
 */
export const addToCart = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { product_id, quantity } = req.body;

    if (!userId) {
      sendResponse(res, 401, false, 'Unauthorized');
      return;
    }

    if (!product_id || !quantity || quantity <= 0) {
      sendResponse(res, 400, false, 'Invalid product_id or quantity');
      return;
    }

    // 1. Kiểm tra tồn kho sản phẩm
    const productRes = await db.query('SELECT stock FROM products WHERE id = $1', [product_id]);
    if (productRes.rows.length === 0) {
      sendResponse(res, 404, false, 'Product not found');
      return;
    }

    const stock = productRes.rows[0].stock;

    // 2. Kiểm tra xem item đã có trong giỏ chưa
    const existingRes = await db.query(
      'SELECT id, quantity FROM cart_items WHERE user_id = $1 AND product_id = $2',
      [userId, product_id]
    );

    if (existingRes.rows.length > 0) {
      // Cập nhật số dư cộng dồn
      const newQuantity = existingRes.rows[0].quantity + quantity;
      
      if (newQuantity > stock) {
        sendResponse(res, 400, false, `Not enough stock. Available: ${stock}`);
        return;
      }

      await db.query(
        'UPDATE cart_items SET quantity = $1, updated_at = NOW() WHERE id = $2',
        [newQuantity, existingRes.rows[0].id]
      );
      
      console.log(`[cart]: Update Item Quantity - User ID: ${userId}, Product ID: ${product_id}`);
      sendResponse<null>(res, 200, true, 'Cart updated successfully', null);
    } else {
      // INSERT mới
      if (quantity > stock) {
        sendResponse(res, 400, false, `Not enough stock. Available: ${stock}`);
        return;
      }

      await db.query(
        'INSERT INTO cart_items (user_id, product_id, quantity) VALUES ($1, $2, $3)',
        [userId, product_id, quantity]
      );

      console.log(`[cart]: Add New Item - User ID: ${userId}, Product ID: ${product_id}`);
      sendResponse<null>(res, 201, true, 'Product added to cart', null);
    }
  } catch (err) {
    console.error('Error addToCart:', err);
    sendResponse(res, 500, false, 'Internal Server Error');
  }
};

/**
 * Cập nhật số lượng item cụ thể
 */
export const updateQuantity = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;
    const { quantity } = req.body;

    if (!userId) {
      sendResponse(res, 401, false, 'Unauthorized');
      return;
    }

    if (!quantity || quantity <= 0) {
      sendResponse(res, 400, false, 'Quantity must be greater than 0');
      return;
    }

    // Kiểm tra quyền sở hữu và tồn kho
    const query = `
      SELECT c.id, p.stock 
      FROM cart_items c
      JOIN products p ON c.product_id = p.id
      WHERE c.id = $1 AND c.user_id = $2
    `;
    const checkRes = await db.query(query, [id, userId]);
    
    if (checkRes.rows.length === 0) {
      sendResponse(res, 404, false, 'Cart item not found or unauthorized');
      return;
    }

    if (quantity > checkRes.rows[0].stock) {
      sendResponse(res, 400, false, `Not enough stock. Available: ${checkRes.rows[0].stock}`);
      return;
    }

    await db.query('UPDATE cart_items SET quantity = $1, updated_at = NOW() WHERE id = $2', [quantity, id]);

    console.log(`[cart]: Update Item Success - ID: ${id}`);
    sendResponse<null>(res, 200, true, 'Quantity updated', null);
  } catch (err) {
    console.error('Error updateQuantity:', err);
    sendResponse(res, 500, false, 'Internal Server Error');
  }
};

/**
 * Xóa item khỏi giỏ hàng
 */
export const removeFromCart = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;

    if (!userId) {
      sendResponse(res, 401, false, 'Unauthorized');
      return;
    }

    const result = await db.query('DELETE FROM cart_items WHERE id = $1 AND user_id = $2', [id, userId]);
    
    if (result.rowCount === 0) {
      sendResponse(res, 404, false, 'Cart item not found or unauthorized');
      return;
    }

    console.log(`[cart]: Remove Item Success - ID: ${id}`);
    sendResponse<null>(res, 200, true, 'Item removed from cart', null);
  } catch (err) {
    console.error('Error removeFromCart:', err);
    sendResponse(res, 500, false, 'Internal Server Error');
  }
};

/**
 * Đồng bộ giỏ hàng từ LocalStorage
 */
export const syncCart = async (req: Request, res: Response): Promise<void> => {
  const client = await db.pool.connect();
  try {
    const userId = req.user?.id;
    const { items } = req.body; // Array of { product_id, quantity }

    if (!userId) {
      sendResponse(res, 401, false, 'Unauthorized');
      return;
    }

    if (!Array.isArray(items)) {
      sendResponse(res, 400, false, 'Items must be an array');
      return;
    }

    await client.query('BEGIN');

    for (const item of items) {
      const { product_id, quantity } = item;
      
      // 1. Check stock
      const prodRes = await client.query('SELECT stock FROM products WHERE id = $1', [product_id]);
      if (prodRes.rows.length === 0) continue; // Skip if product doesn't exist

      const stock = prodRes.rows[0].stock;
      const syncQuantity = Math.min(quantity, stock);

      if (syncQuantity <= 0) continue; // Skip if no stock or invalid quantity

      // 2. Upsert logic
      const existingRes = await client.query(
        'SELECT id, quantity FROM cart_items WHERE user_id = $1 AND product_id = $2',
        [userId, product_id]
      );

      if (existingRes.rows.length > 0) {
        // Ưu tiên lấy số lượng từ local hoặc cộng dồn? 
        // Thường sync sau khi login thì cộng dồn là tốt nhất, nhưng phải kẹp stock
        const totalQty = Math.min(existingRes.rows[0].quantity + syncQuantity, stock);
        await client.query(
          'UPDATE cart_items SET quantity = $1, updated_at = NOW() WHERE id = $2',
          [totalQty, existingRes.rows[0].id]
        );
      } else {
        await client.query(
          'INSERT INTO cart_items (user_id, product_id, quantity) VALUES ($1, $2, $3)',
          [userId, product_id, syncQuantity]
        );
      }
    }

    await client.query('COMMIT');
    console.log(`[cart]: Sync Successful - User ID: ${userId}`);
    sendResponse<null>(res, 200, true, 'Cart synced successfully', null);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error syncCart:', err);
    sendResponse(res, 500, false, 'Internal Server Error');
  } finally {
    client.release();
  }
};
