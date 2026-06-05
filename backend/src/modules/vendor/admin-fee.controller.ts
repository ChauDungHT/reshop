import { Request, Response } from 'express';
import db from '../../core/db';
import { sendResponse } from '../../shared/response';

/**
 * GET /api/admin/fees/tiers
 * Get list of all fee tiers with their configured items
 */
export const getFeeTiers = async (req: Request, res: Response): Promise<void> => {
  try {
    const query = `
      SELECT 
        ft.id,
        ft.tier_name,
        ft.description,
        COALESCE(
          json_agg(
            json_build_object(
              'id', fti.id,
              'fee_name', fti.fee_name,
              'fee_type', fti.fee_type,
              'fee_value', fti.fee_value
            )
          ) FILTER (WHERE fti.id IS NOT NULL),
          '[]'::json
        ) as items
      FROM fee_tiers ft
      LEFT JOIN fee_tier_items fti ON ft.id = fti.fee_tier_id
      GROUP BY ft.id
      ORDER BY ft.created_at ASC
    `;
    const result = await db.query(query);
    console.log(`[admin-fee]: Get Fee Tiers Successful - 200 - Total: ${result.rowCount}`);
    sendResponse(res, 200, true, 'Fee tiers retrieved successfully', result.rows);
  } catch (error) {
    const err = error as Error;
    console.error(`[Error - admin-fee]: GET /api/admin/fees/tiers - 500 - ${err.message}`);
    sendResponse(res, 500, false, 'Internal Server Error');
  }
};

/**
 * GET /api/admin/fees/shops
 * Get list of shops with their associated fee tier information
 */
export const getShopsWithFeeTier = async (req: Request, res: Response): Promise<void> => {
  try {
    const query = `
      SELECT 
        v.id,
        v.store_name,
        v.slug,
        v.status,
        v.fee_tier_id,
        ft.tier_name as fee_tier_name,
        u.name as owner_name,
        u.email as owner_email
      FROM vendors v
      INNER JOIN users u ON v.user_id = u.id
      LEFT JOIN fee_tiers ft ON v.fee_tier_id = ft.id
      ORDER BY v.store_name ASC
    `;
    const result = await db.query(query);
    console.log(`[admin-fee]: Get Shops With Fee Tier Successful - 200 - Total: ${result.rowCount}`);
    sendResponse(res, 200, true, 'Shops fee tiers retrieved successfully', result.rows);
  } catch (error) {
    const err = error as Error;
    console.error(`[Error - admin-fee]: GET /api/admin/fees/shops - 500 - ${err.message}`);
    sendResponse(res, 500, false, 'Internal Server Error');
  }
};

/**
 * PUT /api/admin/fees/shops/:id
 * Assign a fee tier to a specific shop
 */
export const updateShopFeeTier = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const { fee_tier_id } = req.body as { fee_tier_id?: string };

  if (!fee_tier_id) {
    console.log(`[admin-fee]: Update Shop Fee Tier Failed - 400 - Missing fee_tier_id`);
    sendResponse(res, 400, false, 'Missing fee_tier_id parameter');
    return;
  }

  try {
    // 1. Verify vendor exists
    const vendorCheck = await db.query('SELECT id FROM vendors WHERE id = $1', [id]);
    if (vendorCheck.rowCount === 0) {
      console.log(`[admin-fee]: Update Shop Fee Tier Failed - 404 - Shop not found: ${id}`);
      sendResponse(res, 404, false, 'Shop not found');
      return;
    }

    // 2. Verify fee tier exists
    const tierCheck = await db.query('SELECT id FROM fee_tiers WHERE id = $1', [fee_tier_id]);
    if (tierCheck.rowCount === 0) {
      console.log(`[admin-fee]: Update Shop Fee Tier Failed - 400 - Invalid fee tier ID: ${fee_tier_id}`);
      sendResponse(res, 400, false, 'Invalid fee tier ID');
      return;
    }

    // 3. Update shop
    await db.query('UPDATE vendors SET fee_tier_id = $1, updated_at = now() WHERE id = $2', [fee_tier_id, id]);

    console.log(`[admin-fee]: Update Shop Fee Tier Successful - 200 - Shop ID: ${id}, Tier ID: ${fee_tier_id}`);
    sendResponse(res, 200, true, 'Vendor fee tier updated successfully');
  } catch (error) {
    const err = error as Error;
    console.error(`[Error - admin-fee]: PUT /api/admin/fees/shops/${id} - 500 - ${err.message}`);
    sendResponse(res, 500, false, 'Internal Server Error');
  }
};
