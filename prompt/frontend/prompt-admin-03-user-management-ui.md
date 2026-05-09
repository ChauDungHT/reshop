# Prompt: Implement Admin User Management Data Grid

## Context
Admins need an efficient way to manage thousands of users. We need a robust data grid with server-side pagination, filtering, and quick actions.

## Reference
- API Endpoint: `GET /api/admin/users`, `POST /api/admin/users/:id/ban`
- Interface: `IPaginatedData<IUser>`.

## Requirements

### 1. User Data Grid
- Columns: ID (shortened), Name, Email, Role (Badge), Status (Badge), Join Date, Actions.
- Server-side pagination using a footer component.
- **Filters**:
  - Search bar (Debounced search by name/email).
  - Role dropdown (Customer, Vendor, Admin).
  - Status dropdown (Active, Banned, Pending).

### 2. User Actions
- **Ban/Unban**: Button that opens a confirmation modal. If banning, ask for a reason.
- **View Profile**: Link to a detail page showing order history and wallet transactions.
- **Reset Password**: Simple modal to set a new password for local testing.

### 3. Export CSV
- A button at the top that triggers the CSV export API.

## Expected Output
- `UserList.tsx`
- `UserTable.tsx`
- `BanUserModal.tsx`

## Verification
- Search should trigger a new API call after 300ms debounce.
- Changing a filter should reset pagination to page 1.
- Role/Status badges should have distinct Tailwind colors (e.g., green for active, red for banned).
