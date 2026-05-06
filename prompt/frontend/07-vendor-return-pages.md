# Prompt 07: Trang Quản lý Yêu cầu Trả hàng Vendor

## Ngữ cảnh

**API Backend cần dùng:**
- `GET /api/vendor/returns` → danh sách yêu cầu trả hàng (cần filter phía backend theo `vendor_id` từ JWT)
- `PUT /api/vendor/returns/:id/approve` → phê duyệt (xử lý Transaction: hoàn tiền + cộng kho)
- `PUT /api/vendor/returns/:id/reject` → từ chối, yêu cầu `{ reject_reason: string }` (tối thiểu 20 ký tự)

**Schema `return_requests` table:**
```
id, order_item_id, reason, description, images (JSONB/string[]),
status (pending_vendor|approved|rejected|escalated|resolved_admin),
created_at, updated_at
```

Quan hệ: `return_requests` → `order_items` → `orders` → `users` (buyer).

## Nhiệm vụ

### Tạo `frontend/storefront/src/pages/vendor/VendorReturnList.tsx`

**DataTable columns:**
| Column | Nội dung |
|---|---|
| Mã yêu cầu | `return_requests.id` (rút ngắn) |
| Sản phẩm | tên sản phẩm (join từ `order_items → products`) |
| Khách hàng | tên buyer (join từ `orders → users`) |
| Lý do | `reason` |
| Trạng thái | Badge màu (`pending_vendor` = vàng, `approved` = xanh, `rejected` = đỏ) |
| Ngày gửi | `created_at` |
| Thao tác | Nút Duyệt / Từ chối |

**Modal Duyệt (Approve):**
- Dialog xác nhận: "Bạn xác nhận duyệt trả hàng này? Hệ thống sẽ tự động hoàn tiền cho khách và cộng lại tồn kho."
- Nút xác nhận → `PUT /api/vendor/returns/:id/approve`.
- Loading state khi đang gọi API (tránh double click).

**Modal Từ chối (Reject):**
- Form nhập `reject_reason` (textarea, tối thiểu 20 ký tự, hiện đếm ký tự còn lại).
- Validate phía client trước khi submit.
- Gọi `PUT /api/vendor/returns/:id/reject` với payload `{ reject_reason }`.

**Refetch sau action:** Dùng `queryClient.invalidateQueries(['vendor-returns'])`.

## Kiểm tra

- Approve một yêu cầu → status đổi thành `approved`, kiểm tra DB: `wallet_balance` của buyer tăng đúng số tiền, `stock` sản phẩm cộng lại.
- Reject với lý do < 20 ký tự → nút Submit bị disable.
- Reject thành công → status đổi thành `rejected`.
