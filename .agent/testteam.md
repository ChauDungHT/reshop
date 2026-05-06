# 🧪 KẾ HOẠCH LÀM VIỆC ĐỘI TEST (QA/QC TEAM)

## 1. QUY TRÌNH KIỂM THỬ TỔNG QUAN
Đội Test sẽ chia thành hai mảng song song: **Test API (bằng Postman/Insomnia)** và **Test UI/UX (Manual Test trên Trình duyệt)**.

---

## 2. BỘ TEST CASE CHI TIẾT - TEST API (POSTMAN)

Mục tiêu: Đảm bảo Backend xử lý đúng nghiệp vụ và ném ra các mã HTTP Status chính xác.

| Chức năng | Hành động / Request | Kỳ vọng kết quả (Expected Result) |
|---|---|---|
| **Thêm Sản phẩm** | `POST /api/vendor/products` (Payload hợp lệ) | Thành công -> HTTP **201 Created**. Có chứa `product_id`. |
| | `POST /api/vendor/products` (Thiếu field bắt buộc như tên/giá) | Thất bại -> HTTP **400 Bad Request**. Message báo thiếu trường. |
| **Xóa Sản phẩm** | `DELETE /api/vendor/products/bulk` (Sản phẩm không có đơn hàng) | Thành công -> HTTP **200 OK**. DB cập nhật `deleted_at = NOW()`. |
| | `DELETE /api/vendor/products/bulk` (Sản phẩm ĐANG có đơn `pending`) | Thất bại -> HTTP **409 Conflict**. Báo lỗi "Sản phẩm đang nằm trong đơn hàng chưa xử lý". |
| **Duyệt Trả hàng** | `PUT /api/vendor/returns/:id/approve` (Ví đủ số dư) | Thành công -> HTTP **200 OK**. Ví bị trừ tiền, Stock được cộng lại. |
| | `PUT /api/vendor/returns/:id/approve` (Trạng thái đơn hàng không đúng) | Thất bại -> HTTP **400 Bad Request**. Trạng thái return request không phải là pending. |
| **Phân quyền** | `GET /api/vendor/dashboard` (Gửi request không có JWT Token) | Thất bại -> HTTP **401 Unauthorized**. |
| | `GET /api/vendor/dashboard` (Gửi request bằng Token của Customer) | Thất bại -> HTTP **403 Forbidden**. Báo lỗi không có quyền truy cập. |

---

## 3. BỘ TEST CASE CHI TIẾT - TEST UI/UX (MANUAL TEST)

Mục tiêu: Đảm bảo trải nghiệm người dùng (UX) mượt mà, Frontend xử lý form và hiển thị dữ liệu chính xác.

| Chức năng | Hành động / Các bước Test | Kỳ vọng kết quả (Expected Result) |
|---|---|---|
| **Validation Form (Thêm Sản phẩm)** | Bấm nút "Lưu" nhưng bỏ trống ô Tên SP, hoặc nhập Giá bán là số âm (-50000). | Form không được submit đi. Hiển thị thông báo lỗi màu đỏ ngay dưới input: "Tên không được bỏ trống", "Giá không hợp lệ". |
| **Upload & Preview Ảnh** | Chọn 1 lúc 10 file ảnh để upload. | Hiển thị Alert/Toast cảnh báo: "Bạn chỉ được chọn tối đa 8 ảnh". Chỉ nhận 8 ảnh đầu. |
| | Kéo thả ảnh (Drag & drop) từ máy tính vào khung. | File được nhận dạng, ảnh thu nhỏ (preview) hiện ra lập tức. Kéo thả các ảnh preview để thay đổi vị trí dễ dàng. |
| **Bulk Actions** | Tick chọn 2 sản phẩm bất kỳ, ấn nút "Ẩn sản phẩm". | Bảng danh sách load lại, cột trạng thái của 2 SP đó chuyển thành "Đã ẩn". Thanh công cụ Bulk Action tự động biến mất/reset trạng thái chọn. |
| **Export File CSV** | Truy cập danh sách Đơn hàng, bấm nút "Export CSV". | Trình duyệt tải xuống file `.csv`. Mở file bằng Excel, kiểm tra thấy dữ liệu các cột không bị lỗi font Tiếng Việt (UTF-8) và hiển thị đúng thông tin. |
| **View PDF Hóa Đơn** | Vào Chi tiết Đơn hàng -> Click "In hóa đơn". | Trình duyệt tự động mở tab mới chứa file PDF, hoặc tải trực tiếp file `order_xxx.pdf`. Template PDF đẹp, rõ nét, đầy đủ thông tin đơn. |

---

## 4. GIAO ĐIỂM KẾT NỐI (INTEGRATION CHECKLIST)
QA/QC Team cần kiểm tra các điểm giao tiếp sau để đảm bảo FE và BE đồng bộ:
- **Test File Upload Format:** Dùng Inspect Network (F12) để xem Request Payload của tính năng Upload Ảnh, đảm bảo FE đang gửi Header `Content-Type: multipart/form-data` chứ không phải là `application/json`.
- **Test Render File PDF/CSV:** Nếu nhấn Export mà FE bị lỗi chữ loằng ngoằng, QA cần nhắc nhở FE kiểm tra lại việc hứng `Blob` response từ API thay vì xử lý như text thông thường.
- **Xử lý Error Message:** Check xem lỗi từ BE gửi lên (VD: 409 Conflict) có được FE hiển thị thành Toast notification/Alert dễ hiểu cho User không, hay lại ném lỗi "Server Error" mặc định.