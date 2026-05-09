# [TEST TEAM] - MODULE 4: SUPER ADMIN (QUẢN TRỊ SÀN)

## 1. TEST API (Postman / Jest)

### 1.1 Bảo mật & Phân quyền (Security)
- [ ] **TC-SEC-01**: User với role 'customer' gọi `GET /api/admin/users` -> Kết quả mong đợi: `403 Forbidden`.
- [ ] **TC-SEC-02**: User với role 'vendor' gọi `POST /api/admin/users/:id/ban` -> Kết quả mong đợi: `403 Forbidden`.
- [ ] **TC-SEC-03**: Gọi API Admin mà không đính kèm JWT -> Kết quả mong đợi: `401 Unauthorized`.

### 1.2 Ràng buộc Logic (Constraints)
- [ ] **TC-BUS-01**: Xóa danh mục đang có sản phẩm liên kết -> Kết quả mong đợi: `409 Conflict`.
- [ ] **TC-BUS-02**: Tạo danh mục mới với `slug` đã tồn tại -> Kết quả mong đợi: `400 Bad Request`.
- [ ] **TC-BUS-03**: Phê duyệt Vendor -> Kiểm tra DB: bảng `users.status` chuyển 'active', bảng `shops.status` chuyển 'active'.

---

## 2. TEST UI/UX (Manual Test)

### 2.1 Quản lý Danh mục (Tree View)
- [ ] **TC-UI-01**: Kéo thả danh mục con từ Cha A sang Cha B -> Kiểm tra UI cập nhật đúng vị trí mới.
- [ ] **TC-UI-02**: Nhấn F5 sau khi kéo thả -> Kiểm tra vị trí danh mục vẫn được duy trì (đã lưu DB).

### 2.2 Dashboard & Reports
- [ ] **TC-UI-03**: Thay đổi filter ngày trên Dashboard -> Các số liệu KPI và biểu đồ phải thay đổi tương ứng.
- [ ] **TC-UI-04**: Nhấn nút "Export CSV" -> Kiểm tra file tải về đúng định dạng, mở được bằng Excel, chứa đúng dữ liệu đang hiển thị trên bảng.

### 2.3 Quản lý Người dùng
- [ ] **TC-UI-05**: Khóa tài khoản (Ban) -> Thử dùng tài khoản đó đăng nhập lại -> Kết quả: Bị chặn và hiện thông báo lý do.
- [ ] **TC-UI-06**: Phân xử tranh chấp -> Kiểm tra số dư ví Customer (nếu thắng) và thông báo gửi đến các bên.

---

## 3. GIAO ĐIỂM KẾT NỐI (INTEGRATION POINTS)

1.  **Cấu trúc Tree**: Backend trả về **Nested JSON** (Recursive). Frontend dùng đệ quy để render.
2.  **Định dạng Biểu đồ**: 
    - `LineChart`: mảng object `{ name: "10/05", total: 1500000 }`.
    - `PieChart`: mảng object `{ name: "Đã giao", value: 45 }`.
3.  **CSV Export**: Dùng thư viện `json2csv` ở backend. Header file phải khớp với yêu cầu của PM (Date, OrderCode, Shop, Total, PaymentMethod).