# Prompt: Implement Admin Shop Oversight APIs

## Context
Admins monitor and manage all vendor shops on the platform. This includes viewing shop performance and suspending or reactivating shops.

## Reference
- Database Schema: `backend/database/schema.sql` (Tables: `vendors`, `products`)

## Requirements

### 1. GET /api/admin/shops
- **Role**: Admin only.
- **Filters**: `status` (active, inactive, banned), `q` (search by store_name).
- **Logic**: Join `vendors` with `users` (owner) and include aggregate stats:
  - Total products count.
  - Total sales amount (from orders).
- **Pagination**: Use `IPaginatedData`.

### 2. PATCH /api/admin/shops/:id/status
- **Payload**: `{ "status": "active" | "inactive" | "banned" }`
- **Logic**: Update `vendors.status`.
- **Side Effect**: If status is 'banned' or 'inactive', ensure their products are no longer returned in public searches (logic update in catalog module might be needed).

### 3. GET /api/admin/shops/:id/stats
- **Logic**: Detailed stats for a specific shop:
  - Revenue by month.
  - Order count.
  - Return rate.

## Verification
- Verify that status updates are reflected in the DB.
- Ensure the join query for stats is efficient.
