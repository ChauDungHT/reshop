import { Request, Response } from 'express';
import { sendResponse } from '../../shared/response';
import db from '../../core/db';
import { PoolClient } from 'pg';

/**
 * Helper to calculate discounts for cart items and coupon IDs.
 * Used by validate API and checkout process to ensure consistency.
 */
export interface DiscountCalculationResult {
  vendorDiscounts: Map<string, { coupon_id: string; code: string; discount: number }>;
  totalDiscount: number;
  errors: string[];
}

export async function calculateDiscounts(
  userId: string,
  items: Array<{ product_id: string; quantity: number }>,
  couponIds: string[],
  client: PoolClient | typeof db
): Promise<DiscountCalculationResult> {
  const result: DiscountCalculationResult = {
    vendorDiscounts: new Map(),
    totalDiscount: 0,
    errors: [],
  };

  if (items.length === 0) return result;

  // 1. Fetch products to get prices and vendor IDs
  const productIds = items.map((i) => i.product_id);
  const prodRes = await client.query(
    `SELECT id, price, vendor_id, name FROM products WHERE id = ANY($1::uuid[])`,
    [productIds]
  );

  const productMap = new Map<string, { price: number; vendor_id: string; name: string }>();
  for (const row of prodRes.rows) {
    productMap.set(row.id, {
      price: parseFloat(row.price),
      vendor_id: row.vendor_id,
      name: row.name,
    });
  }

  // Group subtotals by vendor
  const vendorSubtotals = new Map<string, number>();
  for (const item of items) {
    const p = productMap.get(item.product_id);
    if (!p) {
      result.errors.push(`Không tìm thấy sản phẩm với ID ${item.product_id}`);
      continue;
    }
    const cost = p.price * item.quantity;
    vendorSubtotals.set(p.vendor_id, (vendorSubtotals.get(p.vendor_id) || 0) + cost);
  }

  if (couponIds.length === 0) return result;

  // 2. Fetch coupons
  const coupRes = await client.query(
    `SELECT * FROM coupons WHERE id = ANY($1::uuid[]) AND status = 'active'`,
    [couponIds]
  );

  for (const coupon of coupRes.rows) {
    const vendorId = coupon.vendor_id;
    const subtotal = vendorSubtotals.get(vendorId) || 0;

    // Check if the user is buying anything from this vendor
    if (subtotal === 0) {
      result.errors.push(`Mã ${coupon.code} không áp dụng được vì không có sản phẩm nào của shop này trong giỏ hàng.`);
      continue;
    }

    // Check dates
    const now = new Date();
    const startsAt = new Date(coupon.starts_at);
    const expiresAt = new Date(coupon.expires_at);
    if (now < startsAt || now > expiresAt) {
      result.errors.push(`Mã ${coupon.code} đã hết hạn hoặc chưa đến thời gian áp dụng.`);
      continue;
    }

    // Check min order value
    const minOrderVal = parseFloat(coupon.min_order_value || 0);
    if (subtotal < minOrderVal) {
      result.errors.push(`Mã ${coupon.code} yêu cầu giá trị đơn hàng tối thiểu từ shop là ${minOrderVal.toLocaleString('vi-VN')}đ (hiện tại: ${subtotal.toLocaleString('vi-VN')}đ).`);
      continue;
    }

    // Check if user has collected this coupon
    const collectedRes = await client.query(
      `SELECT 1 FROM user_coupons WHERE user_id = $1::uuid AND coupon_id = $2::uuid`,
      [userId, coupon.id]
    );
    if (collectedRes.rows.length === 0) {
      result.errors.push(`Mã ${coupon.code} chưa được thu thập vào ví voucher của bạn.`);
      continue;
    }

    // Check user usage limit
    const userUsageRes = await client.query(
      `SELECT COUNT(*)::int AS count 
       FROM sub_orders so 
       JOIN orders o ON so.order_id = o.id 
       WHERE o.buyer_id = $1::uuid 
         AND so.coupon_id = $2::uuid 
         AND o.status <> 'cancelled'`,
      [userId, coupon.id]
    );
    const userUsedCount = userUsageRes.rows[0].count;
    if (userUsedCount >= coupon.per_user_limit) {
      result.errors.push(`Mã ${coupon.code} đã đạt giới hạn sử dụng tối đa của bạn (${coupon.per_user_limit} lần).`);
      continue;
    }

    // Check total quantity limit across all users
    if (coupon.total_quantity !== null) {
      const totalUsageRes = await client.query(
        `SELECT COUNT(*)::int AS count 
         FROM sub_orders so 
         JOIN orders o ON so.order_id = o.id 
         WHERE so.coupon_id = $1::uuid 
           AND o.status <> 'cancelled'`,
        [coupon.id]
      );
      const totalUsedCount = totalUsageRes.rows[0].count;
      if (totalUsedCount >= coupon.total_quantity) {
        result.errors.push(`Mã ${coupon.code} đã hết lượt sử dụng trên hệ thống.`);
        continue;
      }
    }

    // Calculate discount value
    let discount = 0;
    const val = parseFloat(coupon.value);
    if (coupon.type === 'percentage') {
      discount = subtotal * (val / 100);
      if (coupon.max_discount !== null) {
        const maxD = parseFloat(coupon.max_discount);
        discount = Math.min(discount, maxD);
      }
    } else if (coupon.type === 'fixed') {
      discount = Math.min(val, subtotal);
    }

    // Round discount
    discount = Math.round(discount);

    result.vendorDiscounts.set(vendorId, {
      coupon_id: coupon.id,
      code: coupon.code,
      discount,
    });
    result.totalDiscount += discount;
  }

  return result;
}

// ==================== VENDOR CONTROLLERS ====================

/**
 * GET /api/vendor/coupons
 * Lấy danh sách mã giảm giá của cửa hàng
 */
export const getVendorCoupons = async (req: Request, res: Response): Promise<void> => {
  try {
    const vendorId = req.user?.vendor_id;
    if (!vendorId) {
      sendResponse(res, 403, false, 'Yêu cầu quyền Vendor.');
      return;
    }

    const result = await db.query(
      `SELECT *,
         (SELECT COUNT(*)::int 
          FROM sub_orders so 
          JOIN orders o ON so.order_id = o.id 
          WHERE so.coupon_id = c.id AND o.status <> 'cancelled'
         ) AS used_count
       FROM coupons c 
       WHERE c.vendor_id = $1::uuid 
       ORDER BY c.created_at DESC`,
      [vendorId]
    );

    sendResponse(res, 200, true, 'Lấy danh sách mã giảm giá thành công.', result.rows);
  } catch (err) {
    console.error('Error getVendorCoupons:', err);
    sendResponse(res, 500, false, 'Internal Server Error');
  }
};

/**
 * POST /api/vendor/coupons
 * Tạo mã giảm giá mới
 */
export const createVendorCoupon = async (req: Request, res: Response): Promise<void> => {
  try {
    const vendorId = req.user?.vendor_id;
    if (!vendorId) {
      sendResponse(res, 403, false, 'Yêu cầu quyền Vendor.');
      return;
    }

    const {
      code,
      name,
      type,
      value,
      min_order_value,
      max_discount,
      total_quantity,
      per_user_limit,
      starts_at,
      expires_at,
    } = req.body;

    if (!code || !name || !type || !value || !starts_at || !expires_at) {
      sendResponse(res, 400, false, 'Vui lòng cung cấp đầy đủ thông tin bắt buộc.');
      return;
    }

    if (!['percentage', 'fixed'].includes(type)) {
      sendResponse(res, 400, false, 'Loại giảm giá không hợp lệ.');
      return;
    }

    const formattedCode = String(code).trim().toUpperCase();

    // Check if code is already used by this vendor
    const dupRes = await db.query(
      `SELECT 1 FROM coupons WHERE vendor_id = $1::uuid AND code = $2`,
      [vendorId, formattedCode]
    );
    if (dupRes.rows.length > 0) {
      sendResponse(res, 400, false, 'Mã giảm giá này đã tồn tại trong cửa hàng của bạn.');
      return;
    }

    const result = await db.query(
      `INSERT INTO coupons (
         vendor_id, code, name, type, value, min_order_value, 
         max_discount, total_quantity, per_user_limit, starts_at, expires_at, status
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'active')
       RETURNING *`,
      [
        vendorId,
        formattedCode,
        name,
        type,
        value,
        min_order_value || 0,
        max_discount || null,
        total_quantity || null,
        per_user_limit || 1,
        starts_at,
        expires_at,
      ]
    );

    console.log(`[coupon]: Vendor ${vendorId} created coupon ${formattedCode}`);
    sendResponse(res, 201, true, 'Tạo mã giảm giá thành công.', result.rows[0]);
  } catch (err) {
    console.error('Error createVendorCoupon:', err);
    sendResponse(res, 500, false, 'Internal Server Error');
  }
};

/**
 * DELETE /api/vendor/coupons/:id
 * Vô hiệu hóa mã giảm giá (Soft delete / Set inactive)
 */
export const deleteVendorCoupon = async (req: Request, res: Response): Promise<void> => {
  try {
    const vendorId = req.user?.vendor_id;
    const { id } = req.params;

    if (!vendorId) {
      sendResponse(res, 403, false, 'Yêu cầu quyền Vendor.');
      return;
    }

    const check = await db.query(
      `SELECT id, code FROM coupons WHERE id = $1::uuid AND vendor_id = $2::uuid`,
      [id, vendorId]
    );

    if (check.rows.length === 0) {
      sendResponse(res, 404, false, 'Không tìm thấy mã giảm giá.');
      return;
    }

    // Set status to inactive to soft-delete
    await db.query(
      `UPDATE coupons SET status = 'inactive' WHERE id = $1::uuid`,
      [id]
    );

    console.log(`[coupon]: Vendor ${vendorId} inactivated coupon ${check.rows[0].code}`);
    sendResponse(res, 200, true, 'Đã vô hiệu hóa mã giảm giá thành công.', null);
  } catch (err) {
    console.error('Error deleteVendorCoupon:', err);
    sendResponse(res, 500, false, 'Internal Server Error');
  }
};

// ==================== CUSTOMER CONTROLLERS ====================

/**
 * GET /api/products/:id/coupons
 * Lấy các mã giảm giá công khai của shop hiện tại sản phẩm
 */
export const getProductCoupons = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    // Find vendor of this product
    const prodRes = await db.query(
      `SELECT vendor_id FROM products WHERE id = $1::uuid`,
      [id]
    );
    if (prodRes.rows.length === 0) {
      sendResponse(res, 404, false, 'Không tìm thấy sản phẩm.');
      return;
    }
    const vendorId = prodRes.rows[0].vendor_id;

    let query = `
      SELECT c.*,
        (SELECT COUNT(*)::int 
         FROM sub_orders so 
         JOIN orders o ON so.order_id = o.id 
         WHERE so.coupon_id = c.id AND o.status <> 'cancelled'
        ) AS used_count
    `;

    const params: any[] = [vendorId];

    if (userId) {
      query += `, 
        EXISTS(SELECT 1 FROM user_coupons WHERE user_id = $2::uuid AND coupon_id = c.id) AS is_collected`;
      params.push(userId);
    } else {
      query += `, false AS is_collected`;
    }

    query += `
      FROM coupons c
      WHERE c.vendor_id = $1::uuid 
        AND c.status = 'active'
        AND c.starts_at <= NOW()
        AND c.expires_at >= NOW()
      ORDER BY c.created_at DESC`;

    const result = await db.query(query, params);
    sendResponse(res, 200, true, 'Lấy danh sách mã giảm giá của sản phẩm thành công.', result.rows);
  } catch (err) {
    console.error('Error getProductCoupons:', err);
    sendResponse(res, 500, false, 'Internal Server Error');
  }
};

/**
 * POST /api/coupons/collect
 * Thu thập mã giảm giá vào ví
 */
export const collectCoupon = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { coupon_id } = req.body;

    if (!userId) {
      sendResponse(res, 401, false, 'Chưa đăng nhập.');
      return;
    }

    if (!coupon_id) {
      sendResponse(res, 400, false, 'Thiếu coupon_id.');
      return;
    }

    // Verify coupon is active & valid
    const couponRes = await db.query(
      `SELECT * FROM coupons 
       WHERE id = $1::uuid 
         AND status = 'active'
         AND starts_at <= NOW()
         AND expires_at >= NOW()`,
      [coupon_id]
    );

    if (couponRes.rows.length === 0) {
      sendResponse(res, 404, false, 'Mã giảm giá không tồn tại hoặc đã hết hạn.');
      return;
    }

    // Insert into user_coupons
    try {
      await db.query(
        `INSERT INTO user_coupons (user_id, coupon_id) VALUES ($1, $2)`,
        [userId, coupon_id]
      );
      sendResponse(res, 201, true, 'Lưu mã giảm giá thành công.', null);
    } catch (dbErr: any) {
      if (dbErr.code === '23505') { // Unique violation
        sendResponse(res, 400, false, 'Bạn đã sở hữu mã giảm giá này trong ví rồi.');
      } else {
        throw dbErr;
      }
    }
  } catch (err) {
    console.error('Error collectCoupon:', err);
    sendResponse(res, 500, false, 'Internal Server Error');
  }
};

/**
 * GET /api/me/coupons
 * Lấy danh sách ví voucher của user (phục vụ hiển thị trang ví)
 */
export const getMyCoupons = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      sendResponse(res, 401, false, 'Chưa đăng nhập.');
      return;
    }

    const result = await db.query(
      `SELECT c.*, v.store_name, v.logo_url,
         (SELECT COUNT(*)::int 
          FROM sub_orders so 
          JOIN orders o ON so.order_id = o.id 
          WHERE o.buyer_id = $1::uuid AND so.coupon_id = c.id AND o.status <> 'cancelled'
         ) AS my_used_count
       FROM user_coupons uc
       JOIN coupons c ON uc.coupon_id = c.id
       JOIN vendors v ON c.vendor_id = v.id
       WHERE uc.user_id = $1::uuid
       ORDER BY uc.created_at DESC`,
      [userId]
    );

    sendResponse(res, 200, true, 'Lấy ví voucher thành công.', result.rows);
  } catch (err) {
    console.error('Error getMyCoupons:', err);
    sendResponse(res, 500, false, 'Internal Server Error');
  }
};

/**
 * POST /api/coupons/validate
 * Validate trước khi checkout
 */
export const validateCouponsForCheckout = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { items, coupon_ids } = req.body as {
      items: Array<{ product_id: string; quantity: number }>;
      coupon_ids?: string[];
    };

    if (!userId) {
      sendResponse(res, 401, false, 'Chưa đăng nhập.');
      return;
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      sendResponse(res, 400, false, 'Giỏ hàng trống.');
      return;
    }

    const calcResult = await calculateDiscounts(userId, items, coupon_ids || [], db);

    // Convert map to plain object/array for JSON response
    const plainDiscounts: Record<string, { coupon_id: string; code: string; discount: number }> = {};
    calcResult.vendorDiscounts.forEach((val, key) => {
      plainDiscounts[key] = val;
    });

    sendResponse(res, 200, true, 'Kiểm tra mã giảm giá thành công.', {
      vendorDiscounts: plainDiscounts,
      totalDiscount: calcResult.totalDiscount,
      errors: calcResult.errors,
    });
  } catch (err) {
    console.error('Error validateCouponsForCheckout:', err);
    sendResponse(res, 500, false, 'Internal Server Error');
  }
};
