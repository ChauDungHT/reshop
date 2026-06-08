# [TEST TEAM] - MODULE 8: LƯU TRỮ FILE & ẢNH (LOCAL FILE STORAGE)

Kế hoạch kiểm thử chi tiết (Test Plan) dành cho đội ngũ Tester (QA/QC). Kế hoạch này hướng dẫn kiểm thử các API lưu trữ hình ảnh thông qua Postman và kiểm thử thủ công (Manual Test) trên giao diện người dùng (UI/UX) cho cả 2 luồng: Avatar người dùng và Hình ảnh sản phẩm.

---

## 1. KIỂM THỬ API (Postman / Integration Test)

Các API phải được kiểm thử với đầy đủ tham số đầu vào, định dạng header và các token xác thực tương ứng.

### 1.1 Kiểm thử Luồng Avatar Người dùng
| Mã Test Case | Tên Test Case | Mô tả kiểm thử | Dữ liệu đầu vào | Kết quả mong đợi |
| :--- | :--- | :--- | :--- | :--- |
| **TC-API-AVT-01** | Upload Avatar Thành công | Upload file hợp lệ dưới 5MB, định dạng PNG/JPEG/WebP. | Headers: `Authorization: Bearer <CustomerToken>`, `Content-Type: multipart/form-data`. Body: `avatar` = [file 2MB.png] | Trả về `200 OK`, có `avatar_url` dạng relative path. Kiểm tra vật lý trên Server: file `avatar.webp` có tồn tại trong thư mục `uploads/avatars/{user_id}/`. |
| **TC-API-AVT-02** | Upload Avatar Quá dung lượng | Upload file lớn hơn giới hạn cho phép (>5MB). | Body: `avatar` = [file 6.5MB.jpg] | Trả về `400 Bad Request`, có thông báo lỗi dung lượng vượt quá giới hạn. |
| **TC-API-AVT-03** | Upload Avatar Sai định dạng | Upload file không phải ảnh (ví dụ: PDF, ZIP) hoặc định dạng ảnh không được hỗ trợ (GIF). | Body: `avatar` = [file document.pdf] hoặc [image.gif] | Trả về `400 Bad Request`, thông báo lỗi định dạng file không được chấp nhận. |
| **TC-API-AVT-04** | Upload không có Authentication | Thử upload khi chưa đăng nhập. | Headers: Không có `Authorization`. Body: `avatar` = [file 1MB.png] | Trả về `401 Unauthorized`. |

### 1.2 Kiểm thử Luồng Ảnh Sản phẩm
| Mã Test Case | Tên Test Case | Mô tả kiểm thử | Dữ liệu đầu vào | Kết quả mong đợi |
| :--- | :--- | :--- | :--- | :--- |
| **TC-API-PROD-01** | Upload Nhiều ảnh sản phẩm | Upload danh sách nhiều ảnh cùng lúc cho sản phẩm thuộc quyền sở hữu của Shop. | Headers: `Authorization: Bearer <VendorToken>`. Body (FormData): `product_images` (chọn 3 file ảnh) | Trả về `201 Created` kèm mảng chi tiết ảnh lưu trong DB. File vật lý trên Server tạo đủ ảnh `main_{uuid}.webp` và `thumb_{uuid}.webp` tương ứng. |
| **TC-API-PROD-02** | Hack Upload vào sản phẩm shop khác | Vendor A cố gắng upload hình ảnh vào sản phẩm của Vendor B. | Headers: `Authorization: Bearer <VendorA_Token>`. URL: `/api/products/{VendorB_ProductId}/images` | Trả về `403 Forbidden`. |
| **TC-API-PROD-03** | Xóa ảnh sản phẩm | Gọi API xóa 1 ảnh cụ thể. | URL: `DELETE /api/products/:productId/images/:imageId` | Trả về `200 OK`. Record trong DB bị xóa. File vật lý `main_` và `thumb_` trên server bị xóa sạch khỏi disk. |

---

## 2. KIỂM THỬ UI/UX (Manual Test trên Trình duyệt)

Đảm bảo giao diện phản hồi mượt mà và hiển thị chính xác các phiên bản hình ảnh tương ứng.

### 2.1 Kiểm thử Luồng Avatar trên Trang Cá nhân
1. **TC-UI-AVT-01 (Upload & Preview):** 
   - Truy cập trang thông tin cá nhân. Click vào avatar hiện tại -> Chọn một ảnh mới từ máy tính.
   - *Yêu cầu:* Ảnh preview hiển thị ngay lập tức trước khi bấm "Lưu" (nếu có chế độ xem trước) hoặc cập nhật ngay sau khi upload thành công với viền bo tròn (`rounded-full`).
2. **TC-UI-AVT-02 (Xử lý lỗi Client):**
   - Cố tình kéo thả/chọn một file `.zip` hoặc ảnh nặng 10MB vào ô upload avatar.
   - *Yêu cầu:* Frontend chặn ngay lập tức, không gửi request lên backend, hiển thị thông báo toast lỗi rõ ràng: *"Vui lòng chọn file ảnh dưới 5MB"*.

### 2.2 Kiểm thử Hiển thị ảnh Sản phẩm trên Giao diện
1. **TC-UI-PROD-01 (Tải ảnh thumbnail tại Trang danh sách):**
   - Truy cập Trang chủ hoặc Trang Danh mục sản phẩm.
   - Mở Chrome Developer Tools -> thẻ **Network** -> filter **Img**.
   - *Yêu cầu:* Kiểm tra các đường dẫn ảnh sản phẩm tải về phải có định dạng `thumb_{uuid}.webp` để đảm bảo tốc độ tải trang nhanh, không tải ảnh `main_` gốc.
2. **TC-UI-PROD-02 (Tải ảnh gốc tại Trang Chi tiết sản phẩm):**
   - Click vào 1 sản phẩm để vào trang Chi tiết sản phẩm.
   - *Yêu cầu:* Ảnh chính hiển thị sắc nét, đường dẫn tải về phải là ảnh gốc `main_{uuid}.webp`. Kiểm tra tính năng Carousel trượt chuyển ảnh mượt mà, và tính năng zoom ảnh hoạt động đúng tỷ lệ.

### 2.3 Kiểm thử Trường hợp đặc biệt (Placeholders)
1. **TC-UI-PLC-01 (Placeholder Avatar):**
   - Tạo tài khoản người dùng mới (chưa từng upload avatar).
   - *Yêu cầu:* Trang cá nhân và thanh header phải hiển thị ảnh đại diện mặc định hình người màu xám (không bị lỗi hiển thị biểu tượng ảnh vỡ).
2. **TC-UI-PLC-02 (Placeholder Sản phẩm):**
   - Xem một sản phẩm không có hình ảnh trong cơ sở dữ liệu.
   - *Yêu cầu:* Giao diện hiển thị hình ảnh placeholder *"No Image Available"* hoặc ảnh mặc định của Reshop, không để trống hoặc vỡ layout.

---

## 3. GIAO ĐIỂM KẾT NỐI (INTEGRATION POINTS)

Để hai đội Frontend và Backend tích hợp nhanh chóng và không bị lệch nhịp, cần thống nhất các điểm kết nối sau:

1. **Khóa Form Data (FormData Keys):**
   - Trường tải lên Avatar: `avatar` (Chỉ chứa 1 file).
   - Trường tải lên Ảnh sản phẩm: `product_images` (Hỗ trợ mảng file).
2. **Cấu trúc URL Static Asset:**
   - URL tuyệt đối được kết hợp: `BASE_URL` + `/uploads/products/{shop_id}/{product_id}/main_{uuid}.webp`.
   - Thumbnail path suy luận: Thay thế `main_` thành `thumb_` từ URL gốc.
3. **Quy tắc CORS:**
   - Backend cấu hình `cors` cho phép Frontend origin (`http://localhost:5173`) truy cập đọc static file `/uploads/*`.