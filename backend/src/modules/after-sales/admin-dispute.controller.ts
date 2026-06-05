import { Request, Response } from 'express';
import db from '../../core/db';
import { sendResponse } from '../../shared/response';
import { calculateVendorFee } from '../../shared/fee-calculator';

export interface IAdminDisputeItem {
  id: string;
  reason: string;
  description: string;
  images: any; // JSONB
  status: string;
  reject_reason: string;
  created_at: string;
  updated_at: string;
  buyer_id: string;
  buyer_name: string;
  buyer_email: string;
  vendor_id: string;
  store_name: string;
  vendor_slug: string;
  order_id: string;
  order_code: string;
  order_created_at: string;
  order_item_id: string;
  quantity: number;
  price_snapshot: number;
  product_id: string;
  product_name: string;
}

/**
 * GET /api/admin/disputes
 * Fetch all return requests that have been escalated to Admin.
 */
export const getDisputes = async (req: Request, res: Response): Promise<void> => {
  try {
    const query = `
      SELECT 
        rr.id, 
        rr.reason, 
        rr.description, 
        rr.images, 
        rr.status, 
        rr.reject_reason, 
        rr.created_at, 
        rr.updated_at,
        u.id as buyer_id, 
        u.name as buyer_name, 
        u.email as buyer_email,
        v.id as vendor_id, 
        v.store_name, 
        v.slug as vendor_slug,
        o.id as order_id, 
        o.order_code, 
        o.created_at as order_created_at,
        oi.id as order_item_id, 
        oi.quantity, 
        oi.price_snapshot::float as price_snapshot,
        p.id as product_id, 
        p.name as product_name
      FROM return_requests rr
      INNER JOIN order_items oi ON rr.order_item_id = oi.id
      INNER JOIN orders o ON oi.order_id = o.id
      INNER JOIN users u ON o.buyer_id = u.id
      INNER JOIN products p ON oi.product_id = p.id
      INNER JOIN vendors v ON p.vendor_id = v.id
      WHERE rr.status = 'escalated'
      ORDER BY rr.created_at DESC
    `;

    const result = await db.query(query);
    const disputes = result.rows as IAdminDisputeItem[];

    console.log(`[admin-disputes]: Fetch Disputes Successful - 200 - Count: ${disputes.length}`);
    sendResponse<IAdminDisputeItem[]>(res, 200, true, 'Escalated disputes retrieved successfully', disputes);
  } catch (error) {
    const err = error as Error;
    console.error(`[Error - admin-disputes]: GET /api/admin/disputes - 500 - ${err.message}`);
    sendResponse(res, 500, false, 'Internal Server Error');
  }
};

/**
 * POST /api/admin/disputes/:id/resolve
 * Resolve an escalated return request dispute in favor of either customer or vendor inside a transaction.
 */
export const resolveDispute = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const { winner, admin_notes } = req.body as { winner?: string; admin_notes?: string };

  if (winner !== 'customer' && winner !== 'vendor') {
    console.log(`[admin-disputes]: Resolve Dispute Failed - 400 - Invalid winner: ${winner}`);
    sendResponse(res, 400, false, 'Winner must be either customer or vendor');
    return;
  }

  if (!admin_notes || admin_notes.trim().length === 0) {
    console.log(`[admin-disputes]: Resolve Dispute Failed - 400 - Missing admin notes`);
    sendResponse(res, 400, false, 'Admin notes are required to resolve a dispute');
    return;
  }

  const client = await db.pool.connect();

  try {
    await client.query('BEGIN');

    // Retrieve return request details with Row locking (FOR UPDATE)
    const selectQuery = `
      SELECT 
        rr.id, 
        rr.status,
        o.buyer_id, 
        o.id as order_id,
        oi.quantity, 
        oi.price_snapshot::float as price_snapshot,
        oi.sub_order_id,
        p.id as product_id,
        p.vendor_id
      FROM return_requests rr
      INNER JOIN order_items oi ON rr.order_item_id = oi.id
      INNER JOIN orders o ON oi.order_id = o.id
      INNER JOIN products p ON oi.product_id = p.id
      WHERE rr.id = $1 FOR UPDATE
    `;
    const checkResult = await client.query(selectQuery, [id]);

    if (!checkResult.rowCount || checkResult.rowCount === 0) {
      await client.query('ROLLBACK');
      console.log(`[admin-disputes]: Resolve Dispute Failed - 404 - Dispute not found: ${id}`);
      sendResponse(res, 404, false, 'Dispute not found');
      return;
    }

    const requestData = checkResult.rows[0];

    if (requestData.status !== 'escalated') {
      await client.query('ROLLBACK');
      console.log(`[admin-disputes]: Resolve Dispute Failed - 400 - Dispute already resolved: ${id}`);
      sendResponse(res, 400, false, 'Dispute is not in escalated status');
      return;
    }

    const subOrderId = requestData.sub_order_id;
    const vendorId = requestData.vendor_id;

    // Get Vendor details
    const vendorQuery = await client.query(
      `SELECT user_id 
       FROM vendors 
       WHERE id = $1::uuid`,
      [vendorId]
    );

    if (vendorQuery.rows.length === 0) {
      throw new Error('Vendor not found');
    }
    const { user_id: vendorUserId } = vendorQuery.rows[0];
    const refundAmount = requestData.quantity * requestData.price_snapshot;
    const { netAmount: refundNetAmount } = await calculateVendorFee(client, vendorId, refundAmount);

    // 1. Update Return Request status
    await client.query(
      `UPDATE return_requests 
       SET status = 'resolved_admin', admin_notes = $1, resolved_at = now(), updated_at = now() 
       WHERE id = $2`,
      [admin_notes, id]
    );

    if (winner === 'customer') {
      // 2. Increment Buyer's Wallet Balance
      const walletUpdateQuery = `
        UPDATE users 
        SET wallet_balance = wallet_balance + $1 
        WHERE id = $2 
        RETURNING wallet_balance::float as balance
      `;
      const walletResult = await client.query(walletUpdateQuery, [refundAmount, requestData.buyer_id]);
      
      if (!walletResult.rowCount || walletResult.rowCount === 0) {
        throw new Error('Failed to update buyer wallet balance');
      }

      const balanceAfter = walletResult.rows[0].balance;

      // 3. Insert Refund Wallet Transaction for Buyer
      const transactionQuery = `
        INSERT INTO wallet_transactions (user_id, amount, type, ref_id, balance_after)
        VALUES ($1, $2, 'refund', $3, $4)
      `;
      await client.query(transactionQuery, [
        requestData.buyer_id,
        refundAmount,
        requestData.order_id,
        balanceAfter
      ]);

      // 4. Trừ pending_balance của Vendor và log pending_release âm
      const vendorUserRes = await client.query(
        `UPDATE users 
         SET pending_balance = GREATEST(pending_balance - $1, 0) 
         WHERE id = $2::uuid 
         RETURNING wallet_balance`,
         [refundNetAmount, vendorUserId]
      );
      if (vendorUserRes.rows.length > 0) {
        const vendorBalanceAfter = parseFloat(vendorUserRes.rows[0].wallet_balance);
        await client.query(
          `INSERT INTO wallet_transactions (user_id, amount, type, ref_id, balance_after)
           VALUES ($1::uuid, $2, 'pending_release', $3::uuid, $4)`,
          [vendorUserId, -refundNetAmount, subOrderId, vendorBalanceAfter]
        );
      }

      // 5. Cập nhật refunded_amount và feedback_status trên sub_orders
      if (subOrderId) {
        await client.query(
          `UPDATE sub_orders 
           SET refunded_amount = refunded_amount + $1, 
               feedback_status = 'disputed', 
               updated_at = NOW() 
           WHERE id = $2::uuid`,
          [refundAmount, subOrderId]
        );
      }

      // 6. Increment Product Stock
      const stockQuery = `
        UPDATE products 
        SET stock = stock + $1 
        WHERE id = $2
      `;
      await client.query(stockQuery, [requestData.quantity, requestData.product_id]);

      // 7. Update Order Status to 'returned'
      const orderQuery = `
        UPDATE orders 
        SET status = 'returned', updated_at = now() 
        WHERE id = $1
      `;
      await client.query(orderQuery, [requestData.order_id]);
    } else {
      // winner === 'vendor': Giải phóng tiền tranh chấp từ pending_balance sang wallet_balance của Vendor
      const vendorUserRes = await client.query(
        `UPDATE users 
         SET pending_balance = GREATEST(pending_balance - $1, 0),
             wallet_balance = wallet_balance + $1 
         WHERE id = $2::uuid 
         RETURNING wallet_balance`,
         [refundNetAmount, vendorUserId]
      );

      if (vendorUserRes.rows.length > 0) {
        const vendorBalanceAfter = parseFloat(vendorUserRes.rows[0].wallet_balance);
        // Ghi nhận pending_release dương cho Vendor
        await client.query(
          `INSERT INTO wallet_transactions (user_id, amount, type, ref_id, balance_after)
           VALUES ($1::uuid, $2, 'pending_release', $3::uuid, $4)`,
          [vendorUserId, refundNetAmount, subOrderId, vendorBalanceAfter]
        );
      }

      // 3. Cập nhật feedback_status của sub_order thành auto_completed
      if (subOrderId) {
        await client.query(
          `UPDATE sub_orders 
           SET feedback_status = 'auto_completed', 
               updated_at = NOW() 
           WHERE id = $1::uuid`,
          [subOrderId]
        );
      }

      // 4. Update parent order status to delivered
      const orderQuery = `
        UPDATE orders 
        SET status = 'delivered', updated_at = now() 
        WHERE id = $1
      `;
      await client.query(orderQuery, [requestData.order_id]);
    }

    await client.query('COMMIT');

    // 6. Mock notifications to both parties
    console.log(`[Notification]: Sent dispute resolution notification to Customer (${requestData.buyer_id}) and Vendor (${requestData.vendor_id})`);

    console.log(`[admin-disputes]: Resolve Dispute Successful - 200 - ID: ${id}, Winner: ${winner}`);
    sendResponse(res, 200, true, `Dispute resolved successfully in favor of ${winner}`);
  } catch (error) {
    await client.query('ROLLBACK');
    const err = error as Error;
    console.error(`[Error - admin-disputes]: POST /api/admin/disputes/${id}/resolve - 500 - ${err.message}`);
    sendResponse(res, 500, false, 'Internal Server Error');
  } finally {
    client.release();
  }
};
