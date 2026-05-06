# Prompt 02: Middleware Upload & Xử lý Ảnh (Multer & Sharp)

## Ngữ cảnh
Hệ thống cần xử lý tải lên nhiều ảnh sản phẩm cho Nhà bán hàng, yêu cầu tối ưu hóa dung lượng và định dạng.

## Yêu cầu
1. **Cài đặt thư viện:** `multer` và `sharp` (nếu chưa có).
2. **Tạo middleware `backend/src/shared/middlewares/upload.middleware.ts`:**
   - Cấu hình Multer lưu tạm vào thư mục `uploads/temp`.
   - Chặn các file không phải JPG/PNG.
   - Chặn file > 5MB.
3. **Logic xử lý ảnh:**
   - Sau khi upload, dùng `sharp` để resize ảnh (max-width: 1200px).
   - Chuyển đổi định dạng sang `.webp` để tối ưu SEO và tốc độ.
   - Lưu vào cấu trúc thư mục: `uploads/products/{vendor_id}/{uuid}.webp`.
   - Tạo thư mục tự động nếu chưa tồn tại.
4. **Export helper/middleware** để các route sau này sử dụng (ví dụ: `uploadImages.array('images', 8)`).

## Kiểm tra
- Viết một script test nhỏ `scratch-test-upload.js` giả lập upload file và kiểm tra xem file `.webp` có xuất hiện đúng thư mục không.
- Xóa file scratch sau khi hoàn thành.
