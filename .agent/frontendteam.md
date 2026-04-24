# KẾ HOẠCH LÀM VIỆC - ĐỘI FRONTEND (REACT + VITE + TAILWIND)
**Module:** 1 — HỆ THỐNG TÀI KHOẢN & PHÂN QUYỀN

---

## 1. Giao Điểm Kết Nối & Quy Ước (Integration Points)
- Nhận phản hồi API từ Backend: Lấy token trong biến `data.token`, lưu vào `localStorage`.
- Phân tích JWT (Sử dụng thư viện `jwt-decode`) để đọc payload lấy trường role: `customer`, `vendor` hoặc `admin` nhằm phục vụ việc render Sidebar hoặc chuyển hướng trang.

---

## 2. Quản Lý State & Axios Interceptor

### A. React Auth Context (`AuthContext`)
Tạo một Global Context cung cấp:
- **States:** `user` (Object thông tin), `role` (String), `isAuthenticated` (Boolean).
- **Functions:** `login(token)`, `logout()`, `updateProfile(data)`.
- **Luồng hoạt động:** Ngay khi ứng dụng khởi chạy (Mount), kiểm tra localStorage xem có token không. Nếu có, giải mã và set State.

### B. Axios Interceptor
Cấu hình instance Axios toàn cục:
- **Request Interceptor:** Tự động bắt mọi request gọi đi và append Header: `Authorization: Bearer ${localStorage.getItem('token')}`.
- **Response Interceptor:** Lắng nghe toàn bộ mã lỗi trả về. Nếu Server trả về `401 Unauthorized` (Token hết hạn hợc sai) → Tự động gọi hàm `logout()` (xóa localStorage) và redirect ra `/login`.

---

## 3. Danh Sách Các Trang (Pages) & Route Logic

| Route | Mức Độ Bảo Vệ | Mô Tả & Điều Hướng (Navigation Logic) |
|---|---|---|
| `/login` | Public | Trang đăng nhập. Nếu đã login, redirect đến theo role dashboard (xem phía dưới) |
| `/register` | Public | Form đăng ký Customer. Xong redirect sang `/login` |
| `/vendor/register` | Public | Form đăng ký Vendor. Xong có trang thông báo: "Đang chờ Admin duyệt" |
| `/dashboard/customer`| Customer | Phải có JWT & role=`customer`. Không có -> `/login` |
| `/dashboard/vendor` | Vendor | Phải có JWT & role=`vendor`. Nếu status pending -> Hiện cảnh báo "Chờ duyệt", khóa tính năng |
| `/dashboard/admin` | Admin | Phải có JWT & role=`admin`. Nếu sai -> `/403` trang lỗi Forbidden |
| `/profile` | Kèm Context | Trang hồ sơ chung. Dùng Route bảo vệ (Private) |

---

## 4. Danh Sách Các Components Cần Xây Dựng

### A. Layout / Route Wrappers
- `<PrivateRoute />`: Component bọc các Route cần đăng nhập. Logic: `if(!isAuthenticated) return <Navigate to="/login" />`
- `<RoleRoute allowedRoles={['admin']} />`: Component bọc các Route cần quyền. Logic: `if(user.role !== allowedRoles) return <Navigate to="/403" />`

### B. Các Form & Chức Năng (Forms Component)
- `CustomerRegisterForm`: Gồm Input Tên, Email, Password, Password Confirm. Validation Re-type Password phải khớp nhau.
- `VendorRegisterForm`: Wizard Form (2 bước):
  - *Bước 1:* Thông tin đăng nhập. 
  - *Bước 2:* Tên Shop (hỗ trợ check realtime), Mô tả ngắn, Số ĐT liên lạc.
- `LoginForm`: Form nhỏ gọn, xử lý Catch lỗi 403 (Tài khoản bị banned) hay hiển thị nhắc nhở tài khoản Vendor (Pending approval).

### C. Hồ Sơ Component (`Profile.jsx`)
- `ProfileEditForm`: Input chỉnh sửa Name, Phone, Address.
- `ChangePasswordForm`: Input: Mật khẩu cũ, mật khẩu mới, xác nhận. Có thanh progress mô tả "Độ mạnh mật khẩu" (Password Strength Meter) realtime.
- `AvatarUploader`: Component bao gồm Input Type File, preview ảnh, gọi thẳng lên API upload (Multipart/form-data) của module local storage.

---

## 5. UI/UX Validation cần lưu ý
- Xác thực email bằng Regex phía JS (onBlur) trước khi submit.
- Ràng buộc mật khẩu tối thiểu 8 ký tự, có đủ uppercase, lowercase, special char bằng Yup/Zod.
- Sử dụng thông báo (Toast notifications - e.g. React Toastify) để hiện thông báo lỗi từ phía server (VD: 409 Email đã tồn tại).
