# Frontend Prompt 1: Cấu trúc cơ sở & Trạng thái Toàn cục (AuthContext)

**Vai trò:** Frontend Developer (React/Vite/Tailwind)
**Mục tiêu:** Khởi tạo lớp bao bọc State Auth & API Client.

## Nhiệm vụ:
1. Tạo 1 React App Vite + Tailwind nếu chưa có.
2. Xây dựng **AuthContext**:
   - Quản lý State: `{ user, role, isAuthenticated }`.
   - Implement func `login(token)` bóc tách Payload bằng `jwt-decode`, sau đó lưu localStorage.
   - Implement func `logout()` dọn dẹp localStorage và cập nhật null state.
3. Thiết lập **Axios Instance**:
   - Thêm Auto Request Interceptor đẩy `Bearer token`.
   - Thêm Response Interceptor bắt mã HTTP `401` gọi tự động `logout()` và nhảy ra login.
