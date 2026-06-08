# PROMPT 1: THIẾT KẾ SCHEMA DATABASE VÀ MIGRATION CHO FILE STORAGE

## 1. Mục tiêu
Thiết kế và cập nhật cấu trúc cơ sở dữ liệu PostgreSQL cho hệ thống lưu trữ avatar người dùng và danh sách hình ảnh sản phẩm. Cần tạo file migration để đảm bảo tính nhất quán của cơ sở dữ liệu.

## 2. Các yêu cầu kỹ thuật chi tiết

1. **Cập nhật Bảng `users`:**
   - Đảm bảo trường `avatar_url` có kiểu dữ liệu `VARCHAR(255)` và là `NULLABLE` (chấp nhận giá trị `NULL`). Trường này dùng để lưu đường dẫn tương đối của ảnh đại diện người dùng. Ví dụ: `/uploads/avatars/{user_id}/avatar.webp`.
   - Nếu trường `avatar_url` đã tồn tại, hãy viết câu lệnh SQL kiểm tra và chỉ thay đổi kiểu dữ liệu hoặc ràng buộc nếu cần.

2. **Tạo Bảng `product_images`:**
   - Tạo bảng `product_images` để quản lý nhiều hình ảnh của sản phẩm. Mỗi sản phẩm có thể có tối đa nhiều hình ảnh.
   - Các cột của bảng bao gồm:
     - `id`: Kiểu dữ liệu `UUID`, là khóa chính (`PRIMARY KEY`), giá trị mặc định sinh tự động là `gen_random_uuid()` (hoặc `uuid_generate_v4()`).
     - `product_id`: Kiểu dữ liệu `UUID`, liên kết khóa ngoại (`FOREIGN KEY`) với cột `id` của bảng `products`. Thiết lập ràng buộc `ON DELETE CASCADE` (khi sản phẩm bị xóa, toàn bộ ảnh liên kết cũng tự động bị xóa trong DB).
     - `url`: Kiểu dữ liệu `VARCHAR(255)`, không được để trống (`NOT NULL`). Dùng để lưu đường dẫn tương đối của ảnh gốc. Ví dụ: `/uploads/products/{shop_id}/{product_id}/main_{uuid}.webp`.
     - `is_primary`: Kiểu dữ liệu `BOOLEAN`, mặc định là `FALSE` (`DEFAULT FALSE`). Đánh dấu xem ảnh này có phải là ảnh đại diện chính của sản phẩm hay không.
     - `display_order`: Kiểu dữ liệu `INTEGER`, mặc định là `0` (`DEFAULT 0`). Dùng để sắp xếp thứ tự hiển thị các ảnh của sản phẩm.
     - `created_at`: Kiểu dữ liệu `TIMESTAMP WITH TIME ZONE` hoặc `TIMESTAMP`, giá trị mặc định tự động là `now()` hoặc `CURRENT_TIMESTAMP`.
   
3. **Tạo Index:**
   - Để tối ưu hóa truy vấn tìm kiếm ảnh theo sản phẩm, hãy tạo index trên cột `product_id` của bảng `product_images`:
     ```sql
     CREATE INDEX IF NOT EXISTS idx_product_images_product_id ON product_images (product_id);
     ```

## 3. Hướng dẫn thực hiện
- Viết mã nguồn SQL migration mới trong thư mục migrations của backend (ví dụ: `backend/database/migrations/004_create_product_images.sql`).
- Chạy lệnh chạy migration để kiểm tra tính đúng đắn của schema (ví dụ: `npm run db:migrate`).
