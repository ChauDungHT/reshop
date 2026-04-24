# Backend Prompt 1: Thiết Kế Database & Setup Script Đầu Tiên

**Vai trò:** Backend Developer (Node.js + PostgreSQL)
**Mục tiêu:** Setup CSDL và tài khoản Admin ban đầu dựa trên `db.md` và `backendteam.md`.

## Nhiệm vụ:
1. Tạo file migration (`schema.sql` hoặc qua ORM/Query Builder) cho các bảng theo file `db.md`:
   - Bảng `users`: Có các trường `id` (UUID), `email`, `password_hash`, `role` (enum: customer/vendor/admin), `created_at`. Chú ý mở rộng thêm `wallet_balance`, `avatar_url`, `phone` dựa theo `backendteam.md`.
   - Bảng `vendors`: Sử dụng bảng `vendors` thay vì `shops` (như trong `db.md` định nghĩa), các trường: `id` (UUID), `user_id` (FK), `store_name`, `slug`, `status`, `commission_rate`, `bank_info`.
2. Khởi tạo DB connection.
3. Viết một NodeJS script có tên `seed:admin`:
   - Lệnh: `npm run seed:admin -- --email=admin@cdshop.com --password=123456`
   - Nhiệm vụ: Sử dụng `bcrypt` (salt rounds=12) để băm mật khẩu từ tham số CLI, sau đó chèn (INSERT) vào DB với role = `admin`.
4. Run & verify xem bảng và admin user đã sinh ra thành công chưa.
