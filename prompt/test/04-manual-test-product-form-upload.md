# Prompt 04: Manual Test UI — Form Sản phẩm & Upload Ảnh

## Ngữ cảnh

**Điều kiện tiên quyết:**
- Backend server đang chạy: `cd backend && npm run dev` (port 8000).
- Frontend đang chạy: `cd frontend/storefront && npm run dev` (port thường là 5173).
- Tài khoản Vendor đã được tạo và phê duyệt (status `active` trong bảng `vendors`). Kiểm tra:
  ```sql
  docker exec -i reshop_postgre psql -U postgres -d cdshop -c "SELECT u.email, v.status FROM users u JOIN vendors v ON u.id = v.user_id WHERE u.role='vendor';"
  ```

## Test Cases

### TC-UI-01: Validation Form Thêm Sản phẩm

**Các bước:**
1. Đăng nhập bằng tài khoản Vendor.
2. Vào `/vendor/products/new`.
3. Nhấn nút "Lưu" mà **không nhập bất kỳ thông tin nào**.

**Kỳ vọng:** Form không submit. Hiện thông báo lỗi đỏ ngay dưới từng ô bắt buộc: "Tên sản phẩm không được bỏ trống", "Giá bán không được bỏ trống".

---

**Các bước:**
1. Nhập Tên sản phẩm hợp lệ.
2. Nhập Giá bán = `-50000` (số âm).
3. Nhấn "Lưu".

**Kỳ vọng:** Form không submit. Thông báo lỗi: "Giá bán phải lớn hơn hoặc bằng 0".

---

### TC-UI-02: Upload Ảnh — Giới hạn 8 ảnh

**Các bước:**
1. Vào form Thêm sản phẩm.
2. Tại vùng `ImageUploader`, chọn cùng lúc **10 file ảnh** (jpg/png).

**Kỳ vọng:** Hiện Toast/Alert cảnh báo "Bạn chỉ được chọn tối đa 8 ảnh". Chỉ 8 ảnh đầu tiên được hiển thị preview. Counter hiện `8/8`.

---

### TC-UI-03: Upload Ảnh — Drag & Drop và Sắp xếp

**Các bước:**
1. Kéo 3 file ảnh từ máy tính thả vào vùng Drop zone.

**Kỳ vọng:** Ảnh thu nhỏ (thumbnail) xuất hiện ngay lập tức mà không cần tải lên server.

---

**Các bước:**
1. Sau khi đã có 3 ảnh preview, kéo thumbnail ảnh thứ 3 lên vị trí đầu tiên.

**Kỳ vọng:** Thứ tự ảnh thay đổi mượt mà. Ảnh vừa kéo trở thành ảnh đầu tiên.

---

### TC-UI-04: Upload File Không Hợp Lệ

**Các bước:**
1. Thử kéo/chọn file `.pdf` hoặc `.gif` vào `ImageUploader`.

**Kỳ vọng:** File bị từ chối. Thông báo lỗi "Chỉ chấp nhận file JPG hoặc PNG".

---

### TC-UI-05: Kiểm tra Network Request (F12 DevTools)

**Các bước:**
1. Mở F12 → tab Network.
2. Điền form sản phẩm hợp lệ với 2 ảnh và nhấn "Lưu".
3. Nhìn vào request `POST /api/vendor/products`.

**Kỳ vọng:**
- Request header `Content-Type` phải là `multipart/form-data; boundary=...` (KHÔNG phải `application/json`).
- Request payload (tab Payload) hiển thị được form fields và files riêng biệt.
- Response status: **201 Created**.

## Báo cáo

Ghi lại kết quả (Pass/Fail) và screenshot nếu có lỗi vào `prompt/test/report.md`.
