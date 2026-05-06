# Prompt 06: Manual Test UI — Xuất PDF & CSV, Render HTML An toàn

## Ngữ cảnh

**Điều kiện tiên quyết:**
- Backend chạy với Puppeteer đã được cài đặt (xem `backend/prompt/06-pdf-invoice-rendering.md`).
- Có ít nhất 1 đơn hàng với `status = 'delivered'` trong DB.
- Kiểm tra:
  ```sql
  docker exec -i reshop_postgre psql -U postgres -d cdshop -c "SELECT id, order_code, status FROM orders WHERE status='delivered' LIMIT 1;"
  ```

## Test Cases

### TC-UI-11: In hóa đơn PDF từ Chi tiết Đơn hàng

**Các bước:**
1. Đăng nhập Vendor.
2. Vào `/vendor/orders` → click vào 1 đơn hàng đã `delivered`.
3. Nhấn nút **"In hóa đơn"** hoặc **"Tải PDF"**.

**Kỳ vọng:**
- Trình duyệt tải xuống (hoặc mở tab mới) file PDF.
- Tên file: `invoice-{order_code}.pdf`.
- Mở file PDF: template đẹp, hiển thị đầy đủ thông tin: mã đơn, ngày đặt, thông tin khách, bảng sản phẩm, tổng tiền.
- Kiểm tra F12 Network: Request `GET /api/vendor/orders/:id/pdf` → Response header `Content-Type: application/pdf`.

---

### TC-UI-12: Export CSV Danh sách Đơn hàng

**Các bước:**
1. Vào `/vendor/orders`.
2. Nhấn nút **"Export CSV"** (nếu tính năng tồn tại).

**Kỳ vọng:**
- Trình duyệt tải xuống file `.csv`.
- Mở file bằng Excel hoặc Google Sheets: **không bị lỗi font Tiếng Việt** (UTF-8 with BOM).
- Các cột hiển thị đúng: Mã đơn | Khách hàng | Tổng tiền | Trạng thái | Ngày đặt.

> **Nếu FE bị lỗi chữ loằng ngoằng:** Kiểm tra FE có dùng `responseType: 'blob'` khi gọi API không. Backend cần set header `Content-Type: text/csv; charset=utf-8` và thêm BOM (`\uFEFF`) vào đầu nội dung CSV.

---

### TC-UI-13: Render Mô tả sản phẩm (HTML) — Kiểm tra bảo mật XSS

**Điều kiện:** Tạo 1 sản phẩm với mô tả chi tiết chứa đoạn HTML có script:
```
Mô tả bình thường <strong>in đậm</strong> <script>alert('XSS')</script>
```

**Các bước:**
1. Vào trang chi tiết sản phẩm (phía storefront) của sản phẩm vừa tạo.
2. Quan sát phần Mô tả chi tiết.

**Kỳ vọng:**
- Text **"in đậm"** hiển thị đúng (in đậm).
- **KHÔNG** xuất hiện dialog alert (XSS bị chặn).
- Inspect element: thẻ `<script>` đã bị `dompurify` loại bỏ khỏi DOM.

---

### TC-UI-14: Kiểm tra Error Handling — Backend trả 409

**Các bước:**
1. Thực hiện một hành động sẽ gây ra lỗi 409 (VD: xóa sản phẩm đang có đơn `pending`).

**Kỳ vọng:**
- **KHÔNG** hiện lỗi trắng trang hoặc "undefined".
- Hiện **Toast notification** hoặc **Alert** với nội dung dễ hiểu lấy từ `error.response.data.message`.
- Console F12 không có unhandled error.

## Báo cáo

Ghi lại kết quả (Pass/Fail) và mô tả lỗi nếu có vào `prompt/test/report.md`.
