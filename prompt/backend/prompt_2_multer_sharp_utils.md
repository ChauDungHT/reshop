# PROMPT 2: CẤU HÌNH MULTER VÀ XỬ LÝ ẢNH BẰNG SHARP

## 1. Mục tiêu
Xây dựng middleware Multer để nhận file ảnh từ client thông qua `multipart/form-data` và viết các hàm tiện ích xử lý ảnh bằng Sharp (chuyển đổi sang WebP, nén ảnh, tạo ảnh gốc và ảnh thumbnail).

## 2. Các yêu cầu kỹ thuật chi tiết

1. **Cấu hình Multer Middleware:**
   - Sử dụng lưu trữ bộ nhớ đệm `multer.memoryStorage()` để lấy buffer file trực tiếp xử lý qua Sharp, tránh ghi file tạm lên đĩa cứng.
   - Thiết lập giới hạn dung lượng file (`limits`): tối đa **5MB** mỗi file.
   - Thiết lập bộ lọc file (`fileFilter`): Chỉ chấp nhận các file ảnh có kiểu MIME là `image/jpeg`, `image/png`, hoặc `image/webp`. 
   - Nếu file không hợp lệ, trả về lỗi `400 Bad Request` kèm thông báo lỗi chi tiết cho client: *"Chỉ chấp nhận ảnh định dạng JPEG, PNG, WebP dưới 5MB."*

2. **Quy trình Xử lý hình ảnh bằng Sharp:**
   - Tất cả hình ảnh tải lên đều phải được chuyển sang định dạng **WebP** với chất lượng nén **85%** để tối ưu dung lượng.
   - **Đối với ảnh Avatar:**
     - Cắt (crop) và thay đổi kích thước ảnh về dạng hình vuông: `400x400` pixel, căn giữa (`position: 'center'`).
     - Tên file lưu trên đĩa cố định là: `avatar.webp`.
   - **Đối với ảnh Sản phẩm (Gốc - Main):**
     - Resize chiều rộng tối đa là `1200px` (chiều cao tự động tính toán theo tỷ lệ của ảnh gốc, không co giãn, chỉ thu nhỏ và không phóng to ảnh nếu ảnh gốc nhỏ hơn 1200px).
     - Định dạng tên file: `main_{uuid}.webp`.
   - **Đối với ảnh Sản phẩm (Thumbnail - Thumb):**
     - Tạo ảnh thumbnail từ ảnh gốc bằng cách resize về kích thước `200x200` pixel, căn giữa crop cover (`fit: 'cover', position: 'center'`).
     - Định dạng tên file: `thumb_{uuid}.webp` (sử dụng chung `{uuid}` của ảnh gốc tương ứng để dễ dàng suy luận đường dẫn ở frontend).

## 3. Hướng dẫn thực hiện
- Viết file middleware Multer và utility xử lý ảnh bằng thư viện `sharp` trong thư mục code chung (ví dụ: `src/shared/middleware/upload.ts` hoặc `src/shared/utils/image-processor.ts`).
- Xuất các hàm tiện ích để controller có thể gọi trực tiếp khi upload file.
