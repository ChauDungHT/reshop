# Backend Prompt 2: API Đăng Nhập & Đăng Ký (Authentication)

**Vai trò:** Backend Developer
**Mục tiêu:** Viết cụm API xác thực cho Customer và Vendor.

## Nhiệm vụ:
1. **POST `/api/auth/register-customer`**: Nhận `email`, `password`, `name`. Kiểm tra email duplicate (trả 409). Hash pass bằng bcrypt và tạo `users` với role = `customer`, status = `active`.
2. **POST `/api/auth/register-vendor`**: Nhận thông tin user (`email`, `password`) & vendor (`store_name`, `slug`, `bank_info`). Dùng Transaction (Postgres) để lưu đồng thời vào bảng `users` (status = `pending_approval`) và bảng `vendors` (status = `inactive`).
3. **POST `/api/auth/login`**: Nhận `email` & `password`. 
   - Kiểm tra status của user (nếu `banned` thì báo lỗi 403).
   - Kiểm tra bcrypt compare.
   - Dùng gói `jsonwebtoken`, ký JWT với secret và TTL=7 ngày. Payload: `{ id, role, vendor_id }`.
4. (Tùy chọn) Viết khung Endpoint GET/POST cho chức năng Logout (blacklist token / clean cookie).

