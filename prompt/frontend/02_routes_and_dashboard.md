# Frontend Prompt 2: Protected Routes & Dashboard Shell

**Vai trò:** Frontend Developer
**Mục tiêu:** Quản trị luồng truy cập trên URL, bảo vệ thành trì frontend.

## Nhiệm vụ:
Dựa theo `frontendteam.md`:
1. Xây dựng `<PrivateRoute />` bọc toàn bộ Dashboard. Nếu !isAuthenticated -> `Navigate('/login')`.
2. Xây dựng `<RoleRoute roles={['admin', 'vendor', ...]} />`. Nếu `role` sai -> văng về `/403`.
3. Tạo ra cấu trúc trang rỗng (Shell) cho 3 loại User:
   - `/dashboard/customer`
   - `/dashboard/vendor`
   - `/dashboard/admin`
4. Logic xử lý riêng: Nếu đang ở dashboard vendor nhưng Payload JWT có đánh dấu `status = 'pending_approval'`, render box cảnh báo mờ đỏ "Tài khoản của bạn đang chờ quản trị viên phê duyệt" và ẩn menu tĩnh.
