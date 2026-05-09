# Prompt: Implement Admin Shop Oversight and Vendor Approval UI

## Context
Admins must oversee vendor performance and handle the initial approval of new shop registrations.

## Reference
- API Endpoint: `GET /api/admin/shops`, `POST /api/admin/vendors/:id/approve`
- Interface: `IPaginatedData<IShop>`.

## Requirements

### 1. Shop Data Grid
- Columns: Shop Name, Vendor Owner, Joined Date, Products Count, Total Revenue, Status (Badge).
- Tabs for Filtering: **Tất cả**, **Đang hoạt động**, **Chờ phê duyệt**, **Bị khóa**.

### 2. Vendor Approval Flow
- In the "Chờ phê duyệt" tab, clicking on a shop opens a **Review Modal**.
- Show vendor details (Name, Store Name, Phone, Description).
- Buttons: **Phê duyệt (Approve)** and **Từ chối (Reject)**.
- If rejecting, provide a text area for the reason.

### 3. Shop Status Management
- Ability to deactivate/activate a shop directly from the list.
- Warning modal: "Vô hiệu hóa shop sẽ làm ẩn toàn bộ sản phẩm của họ khỏi khách hàng. Tiếp tục?".

## Expected Output
- `ShopOversight.tsx`
- `VendorApprovalModal.tsx`
- `ShopStatusBadge.tsx`

## Verification
- Approval should immediately update the UI and remove the item from the "Chờ phê duyệt" tab.
- Stats (Revenue, Product Count) should be formatted correctly.
