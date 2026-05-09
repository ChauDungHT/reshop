# Prompt: Implement Admin User Management APIs

## Context
As part of the Super Admin module, we need to implement APIs for managing users (Customers, Vendors, Admins). This includes listing users with filters and pagination, banning/unbanning users, and viewing detailed profiles.

## Reference
- Database Schema: `backend/database/schema.sql` (Table: `users`)
- Interface Standard: `IPaginatedData` and `IApiResponse`.

## Requirements

### 1. GET /api/admin/users
- **Role**: Admin only.
- **Parameters**: 
  - `page`, `limit` (standard pagination).
  - `role`: Filter by 'customer', 'vendor', or 'admin'.
  - `status`: Filter by 'active', 'banned', 'pending'.
  - `q`: Search by name or email (using ILIKE).
- **Logic**: Query the `users` table and return paginated data.
- **Expected Output**:
```json
{
  "success": true,
  "message": "Users retrieved successfully",
  "data": {
    "items": [...],
    "total": 100,
    "page": 1,
    "limit": 20,
    "total_pages": 5
  }
}
```

### 2. POST /api/admin/users/:id/ban
- **Role**: Admin only.
- **Payload**: `{ "reason": "Optional reason string" }`
- **Logic**: 
  - Update `users.status` to 'banned'.
  - (Optional) Record the reason in a log or audit table if exists.
  - Return success message.

### 3. POST /api/admin/users/:id/unban
- **Role**: Admin only.
- **Logic**: Update `users.status` to 'active'.

### 4. GET /api/admin/users/:id
- **Role**: Admin only.
- **Logic**: Return full user profile including joined data from related tables (orders count, wallet balance, etc.).

## Verification
- Ensure `roleGuard(['admin'])` is applied.
- Check that pagination follows the `IPaginatedData` interface.
- Verify SQL queries are optimized with existing indexes on `email`.
