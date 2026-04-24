# Backend Prompt 4: API Hồ Sơ Cá Nhân & Tải Lên Tệp

**Vai trò:** Backend Developer
**Mục tiêu:** Quản trị các Endpoint hồ sơ sử dụng các Middleware vừa tạo ở Prompt 3.

## Nhiệm vụ:
1. **GET `/api/users/profile`**: Trả về public details (bao gồm ví wallet_balance). Protect qua `authMiddleware`.
2. **PUT `/api/users/profile`**: Cập nhật thông tin `phone`, `address`...
3. **PUT `/api/users/password`**: Nhận `old_password` và `new_password`. Kiểm tra `old_password` với dạng bcrypt gốc trong DB trước khi đổi mật khẩu mới.
4. **POST `/api/users/avatar`**:
   - Sử dụng thư viện `Multer` (và optionally `Sharp` resize) xử lý request `multipart/form-data`.
   - Lưu tệp vào HDD `/uploads/avatars/{user_id}/...`.
   - Cập nhật đường dẫn vào cột `avatar_url` trong bảng `users`.
