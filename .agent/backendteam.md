# KẾ HOẠCH LÀM VIỆC - ĐỘI BACKEND (NODE.JS + POSTGRESQL)
**Module:** 1 — HỆ THỐNG TÀI KHOẢN & PHÂN QUYỀN

---

## 1. Giao Điểm Kết Nối & Quy Ước (Integration Points)
Thống nhất với đội Frontend về chuẩn giao tiếp dữ liệu:
- **Cấu trúc Response:** `{ "success": boolean, "message": string, "data": object | null }`
- **Cách truyền Token:** Header `Authorization: Bearer <JWT_TOKEN>`
- **Cấu trúc JWT Payload:**
  ```json
  {
    "id": "uuid / numeric",
    "role": "customer" | "vendor" | "admin",
    "shop_id": "uuid / numeric / null (nếu có)"
  }
  ```

---

## 2. Thiết Kế Schema Database

### Bảng `users`
| Tên Trường (Column) | Kiểu Dữ Liệu | Ràng buộc (Constraints) | Mô Tả |
|---|---|---|---|
| `id` | `UUID / SERIAL` | Primary Key | ID người dùng |
| `name` | `VARCHAR(100)` | Not Null | Họ và tên |
| `email` | `VARCHAR(150)` | Unique, Not Null | Email đăng nhập |
| `password_hash` | `VARCHAR(255)` | Not Null | Mật khẩu đã được mã hóa |
| `role` | `VARCHAR(20)` | Default 'customer' | 'customer', 'vendor', 'admin' |
| `status` | `VARCHAR(20)` | Default 'active' | 'active', 'pending_approval', 'banned' |
| `wallet_balance`| `DECIMAL(15,2)` | Default 0 | Số dư ví ảo |
| `phone` | `VARCHAR(20)` | Nullable | Số điện thoại |
| `address` | `TEXT` | Nullable | Địa chỉ giao hàng mặc định |
| `avatar_url` | `VARCHAR(255)` | Nullable | Đường dẫn ảnh đại diện (local) |
| `last_login_at` | `TIMESTAMP` | Nullable | Thời gian đăng nhập cuối |
| `created_at` | `TIMESTAMP` | Default NOW() | Thời gian tạo tài khoản |

### Bảng `shops` (Dành cho Vendor)
| Tên Trường (Column) | Kiểu Dữ Liệu | Ràng buộc (Constraints) | Mô Tả |
|---|---|---|---|
| `id` | `UUID / SERIAL` | Primary Key | ID shop |
| `user_id` | `UUID / INT` | Foreign Key, Unique | Liên kết tới bảng `users` |
| `name` | `VARCHAR(150)` | Unique, Not Null | Tên gian hàng |
| `description` | `TEXT` | Nullable | Mô tả ngắn gian hàng |
| `phone` | `VARCHAR(20)` | Nullable | Số điện thoại liên hệ shop |
| `status` | `VARCHAR(20)` | Default 'inactive' | 'active', 'inactive', 'banned' |

---

## 3. Danh Sách API Endpoints

| Method | Endpoint | Payload Yêu Cầu (Body) | Ý Nghĩa / Dữ liệu trả về |
|:---:|---|---|---|
| `POST` | `/api/auth/register-customer` | `name`, `email`, `password` | **Tạo tài khoản Customer.** <br>Trả về `{ success: true, message: "Đăng ký thành công" }` |
| `POST` | `/api/auth/register-vendor` | `name`, `email`, `password`, `shop_name`, `shop_desc`, `shop_phone` | **Tạo Vendor + Shop (pending).** <br>Trả về `{ success: true, message: "Chờ phê duyệt" }` |
| `POST` | `/api/auth/login` | `email`, `password` | **Xác thực và trả về JWT.** <br>Trả về `{ token: "...", user: {id, role} }` |
| `POST` | `/api/auth/logout` | Không | (Tùy chọn) Thêm token vào blacklist để vô hiệu hóa token sớm |
| `GET` | `/api/users/profile` | Không (Lấy ID từ JWT) | **Lấy hồ sơ cá nhân / Số dư ví** |
| `PUT` | `/api/users/profile` | `name`, `phone`, `address` | **Cập nhật thông tin User** |
| `PUT` | `/api/users/password`| `old_password`, `new_password` | **Đổi mật khẩu** (Verify mật khẩu cũ) |
| `POST` | `/api/users/avatar` | Form-data: `avatar` (file) | **Upload ảnh đại diện** lưu vào `/uploads/avatars/{user_id}` |

---

## 4. Các Logic Cốt Lõi (Business Logic)

### A. Xử lý Mật khẩu & Token
- **Bcrypt:** Quá trình đăng ký phải dùng `bcrypt.hash(password, 12)` trước khi INSERT vào DB. Ở endpoint login, dùng `bcrypt.compare()`.
- **JWT:** Generate token bằng thư viện `jsonwebtoken` với secret lưu trong `.env` (`JWT_SECRET`). Set TTL là `7d` (7 ngày). Ghi lưu `last_login_at` khi ký token thành công.

### B. Middleware Phân Quyền Pipeline
Đội backend cần xây dựng 3 middleware chính cho toàn hệ thống:
1. `authMiddleware`: Parse `Bearer <token>` từ Request Header. Verify token. Gắn thông tin đã giải mã vào `req.user`. Nếu không hợp lệ trả về `401 Unauthorized`.
2. `roleGuard(allowedRoles)`: Nhận mảng vai trò hợp lệ (VD: `['admin', 'vendor']`). So khớp `req.user.role`. Nếu sai trả `403 Forbidden`.
3. `ownerGuard`: Kiểm duyệt xem resource đang truy cập có khớp với `id` của user hoặc `shop_id` của user hay không.

### C. Seed Database
- **Script Admin:** Viết file `seed.js` để tự động băm mật khẩu và truyền parameter: `npm run seed:admin -- --email=... --password=...` trực tiếp nhập DB để setup tài khoản quản trị sàn ban đầu.
