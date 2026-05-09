# Prompt: Implement Admin Dispute Resolution APIs

## Context
When a vendor rejects a return request, the customer can escalate it to the Admin. The Admin makes the final decision, which involves financial transactions and inventory updates.

## Reference
- Database Schema: `backend/database/schema.sql` (Tables: `return_requests`, `users`, `wallet_transactions`, `products`)

## Requirements

### 1. GET /api/admin/disputes
- **Filters**: `status = 'escalated'`.
- **Logic**: Fetch return requests with status 'escalated', including customer info, shop info, and original order details.

### 2. POST /api/admin/disputes/:id/resolve
- **Payload**: 
```json
{
  "winner": "customer" | "vendor",
  "admin_notes": "..."
}
```
- **Logic (Complex Transaction)**:
  - `BEGIN`
  - Update `return_requests`: set `status = 'resolved_admin'`, `admin_notes`, and `resolved_at`.
  - **IF winner is 'customer'**:
    1.  Calculate refund amount (from original order item).
    2.  Update `users.wallet_balance`: Increment by refund amount for the customer.
    3.  Insert `wallet_transactions`: Type 'refund', reference order ID, balance after update.
    4.  Update `products.stock`: Increment stock by the returned quantity.
    5.  Update `orders.status`: Set to 'returned'.
  - **IF winner is 'vendor'**:
    1.  Keep order status as 'delivered'.
  - `COMMIT`

## Verification
- **CRITICAL**: Test the transaction flow. Ensure that if the wallet update fails, the return request status is NOT updated (ROLLBACK).
- Verify that `wallet_transactions` records the correct `balance_after`.
- Check that notifications are sent to both parties.
