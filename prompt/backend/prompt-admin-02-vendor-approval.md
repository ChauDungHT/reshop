# Prompt: Implement Admin Vendor Approval APIs

## Context
New vendors register and are placed in a 'pending' state. Admins must review and approve or reject these requests to activate their shops.

## Reference
- Database Schema: `backend/database/schema.sql` (Tables: `users`, `vendors`)

## Requirements

### 1. GET /api/admin/vendors/pending
- **Role**: Admin only.
- **Logic**: Fetch all users with `role = 'vendor'` and `status = 'pending'`, joined with their `vendors` table record.
- **Pagination**: Use `IPaginatedData`.

### 2. POST /api/admin/vendors/:id/approve
- **Role**: Admin only.
- **Logic (Transaction Required)**:
  - `BEGIN`
  - Update `users` table: set `status = 'active'` for the user ID.
  - Update `vendors` table: set `status = 'active'` for the vendor record.
  - (Optional) Create a welcome notification for the vendor.
  - `COMMIT`

### 3. POST /api/admin/vendors/:id/reject
- **Role**: Admin only.
- **Payload**: `{ "reason": "Reason for rejection" }`
- **Logic**:
  - Update `users` table: set `status = 'rejected'` for the user ID.
  - Return success message.

## Verification
- Ensure atomicity using a database transaction for approval.
- Check that `roleGuard(['admin'])` is properly integrated.
- Verify that only vendors in 'pending' status can be approved.
