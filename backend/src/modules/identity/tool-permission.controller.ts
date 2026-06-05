import { Request, Response } from 'express';
import db from '../../core/db';
import { sendResponse } from '../../shared/response';

/**
 * Get all tool permissions (Public)
 */
export const getToolPermissions = async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await db.query(
      'SELECT tool_code, tool_name, allowed_roles FROM tool_permissions ORDER BY created_at ASC'
    );
    sendResponse(res, 200, true, 'Tool permissions retrieved successfully', result.rows);
  } catch (error) {
    console.error('[Error - tool-permissions]: Get failed', error);
    sendResponse(res, 500, false, 'Failed to retrieve tool permissions');
  }
};

/**
 * Bulk update tool permissions (Admin only)
 */
export const updateToolPermissionsBulk = async (req: Request, res: Response): Promise<void> => {
  const { permissions } = req.body;

  if (!Array.isArray(permissions)) {
    sendResponse(res, 400, false, 'Permissions must be an array of updates');
    return;
  }

  try {
    // Start transaction
    await db.query('BEGIN');

    for (const item of permissions) {
      const { tool_code, allowed_roles } = item;

      if (!tool_code || !Array.isArray(allowed_roles)) {
        await db.query('ROLLBACK');
        sendResponse(res, 400, false, 'Each permission item must contain tool_code and allowed_roles array');
        return;
      }

      // Update DB
      await db.query(
        'UPDATE tool_permissions SET allowed_roles = $1, updated_at = NOW() WHERE tool_code = $2',
        [JSON.stringify(allowed_roles), tool_code]
      );
    }

    await db.query('COMMIT');
    sendResponse(res, 200, true, 'All tool permissions updated successfully');
  } catch (error) {
    await db.query('ROLLBACK');
    console.error('[Error - tool-permissions]: Bulk update failed', error);
    sendResponse(res, 500, false, 'Failed to update tool permissions');
  }
};
