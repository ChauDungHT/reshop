# Backend Prompt 3: Middleware Phân Quyền (Authorization Pipelines)

**Vai trò:** Backend Developer
**Mục tiêu:** Đảm bảo hệ thống bắt Token và chặn/mở quyền bảo mật đúng đắn.

## Nhiệm vụ:
Viết 3 Middleware (ví dụ nằm trong thư mục `src/shared/middlewares`):
1. `authMiddleware`:  
   - Bắt header `Authorization: Bearer <TOKEN>`.
   - Nếu không có token -> `401 Unauthorized`.
   - `jwt.verify` -> Nếu sai chặn `401`. Nếu đúng gán thông tin payload vào `req.user`.
2. `roleGuard(allowedRoles)`: 
   - Factory function trả về middleware. Lấy `req.user.role` để so sánh với mảng `[allowedRoles...]`. Nếu không thuộc -> `403 Forbidden`.
3. `ownerGuard`: 
   - Middleware bắt buộc kiểm tra resource (ví dụ order, vendor info, user profile) có đang được chỉnh sửa bởi chính người tạo hay không (check ID resource vs `req.user.id` hoặc `req.user.vendor_id`).
