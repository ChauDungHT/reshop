# Prompt 06: Xuất Hóa đơn PDF (Puppeteer)

## Ngữ cảnh
Tính năng chuyên nghiệp cho phép Nhà bán hàng in hóa đơn cho các đơn hàng đã xác nhận.

## Yêu cầu
1. **Cài đặt:** `puppeteer` và một template engine (ví dụ: `handlebars`).
2. **API GET `/api/vendor/orders/:id/pdf`:**
   - Lấy thông tin chi tiết đơn hàng, khách hàng, sản phẩm (bao gồm snapshots giá).
   - Inject dữ liệu vào HTML Template (tạo một file `.html` làm mẫu hóa đơn).
   - Dùng Puppeteer để render HTML đó thành PDF.
   - Stream file PDF trực tiếp về client: `res.setHeader('Content-Type', 'application/pdf')`.
3. **Lưu ý:** Đảm bảo xử lý lỗi nếu Puppeteer không khởi động được hoặc timeout.

## Kiểm tra
- Chạy script `scratch-gen-pdf.js` để xuất thử một file PDF ra ổ đĩa và kiểm tra định dạng hiển thị.
