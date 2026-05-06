# Prompt 01: Đồng bộ Schema Database (Vendor & Products)

## Ngữ cảnh
Dựa trên @db.md và @backendteam.md, bảng `vendors` (hoặc `shops`) và `products` hiện tại trong @schema.sql đang thiếu một số trường quan trọng để phục vụ tính năng cho Nhà bán hàng.

## Yêu cầu
Cập nhật file `backend/database/schema.sql` và thực thi migration để đồng bộ các thay đổi sau:

1. **Bảng `vendors` (giữ tên hiện tại hoặc đổi thành `shops` nếu cần, nhưng ưu tiên giữ `vendors` để tránh break code cũ):**
   - Thêm các trường:
     - `logo_url` (VARCHAR, Nullable)
     - `banner_url` (VARCHAR, Nullable)
     - `phone` (VARCHAR, Nullable)
     - `address` (TEXT, Nullable)
     - `email` (VARCHAR, Nullable)
     - `return_policy_days` (INT, Default 7)
     - `return_policy_desc` (TEXT, Nullable)
   - Đảm bảo `vendor_id` (hoặc `user_id`) là UNIQUE.

2. **Bảng `products`:**
   - Thêm trường `deleted_at` (TIMESTAMP, Nullable) để phục vụ Soft Delete.
   - Kiểm tra ràng buộc `price >= 0` và `stock >= 0`.
   - Đảm bảo các FK `vendor_id` và `category_id` hoạt động đúng.

3. **Bảng `product_images` (Tùy chọn):**
   - Mặc dù `products` có `image_urls` (JSONB), nhưng `backendteam.md` đề xuất bảng riêng. Hãy quyết định: nếu dùng bảng riêng, tạo bảng `product_images(id, product_id, url, is_primary, display_order)`.

## Thực thi
- Tạo file `scratch-sync-db.js` để chạy lệnh SQL cập nhật database.
- Kiểm tra lại cấu trúc bảng bằng cách truy vấn `information_schema.columns`.
- Xóa file scratch sau khi hoàn thành.
