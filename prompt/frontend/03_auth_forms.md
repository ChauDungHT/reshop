# Frontend Prompt 3: Các Form Đăng Nhập & Đăng Ký (UI/UX)

**Vai trò:** Frontend Developer
**Mục tiêu:** Forms tương tác tốt, bám sát các luồng dữ liệu (fields) của Backend. Dựa trên `db.md` để define fields chuẩn xác.

## Nhiệm vụ:
1. Dùng `Yup`/`Zod` tích hợp Form (vd React Hook Form) cho trang **Đăng nhập (`/login`)**.
2. **Customer Đăng ký (`/register`)**: Input `Email`, `Name`, `Password`, `Confirm Password`. Check password strength. Show Toast Reactify nếu backend báo lỗi (vd 409).
3. **Vendor Đăng ký (`/vendor/register`)** - Wizard Form:
   - Bước 1: Tài khoản (`Email`, `Password`).
   - Bước 2: Thông tin shop dựa vào `db.md`: `store_name` (Tên Shop), `slug` (đường dẫn định danh), `bank_info` (Tài khoản NH), có thể thêm số liên hệ phone.
4. Đẩy API request qua Axios. Xử lý UI báo loading khi đang request. 
