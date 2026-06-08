# PROMPT 3: XÂY DỰNG CÁC API ENDPOINTS UPLOAD VÀ XÓA ẢNH

## 1. Mục tiêu
Xây dựng các controller và route Express để xử lý việc upload/cập nhật avatar người dùng, upload nhiều ảnh sản phẩm và xóa hình ảnh sản phẩm.

## 2. Các yêu cầu kỹ thuật chi tiết

### 2.1 API Upload/Cập nhật Avatar Người dùng
* **Method:** `POST` (hoặc `PUT` tùy cấu trúc hiện tại)
* **URL:** `/api/users/profile/avatar`
* **Xác thực:** Yêu cầu đăng nhập (Middleware `auth` hợp lệ để lấy `req.user.id`).
* **Middleware upload:** Sử dụng Multer cấu hình ở Prompt 2, nhận 1 file qua key `avatar`.
* **Logic xử lý:**
  1. Trích xuất `userId` từ token.
  2. Tạo thư mục vật lý lưu trữ: `uploads/avatars/{user_id}/` (nếu chưa có).
  3. Đọc buffer file ảnh đại diện, gọi Sharp để crop vuông `400x400` px, nén WebP 85%.
  4. Lưu file vật lý với tên `avatar.webp` vào thư mục trên.
  5. Cập nhật trường `avatar_url` của user trong database thành: `/uploads/avatars/{user_id}/avatar.webp`.
  6. Trả về response `200 OK` kèm đường dẫn tương đối `/uploads/avatars/{user_id}/avatar.webp`.

### 2.2 API Upload Hình ảnh Sản phẩm (Nhiều ảnh)
* **Method:** `POST`
* **URL:** `/api/products/:productId/images`
* **Xác thực:** Yêu cầu đăng nhập. Đồng thời kiểm tra xem sản phẩm `:productId` có thuộc quyền sở hữu của Shop/Vendor hiện tại hay không. Nếu không, trả về `403 Forbidden`.
* **Middleware upload:** Nhận tối đa 5 file ảnh qua key `product_images`.
* **Logic xử lý:**
  1. Lấy thông tin shop của vendor và verify quyền sở hữu sản phẩm.
  2. Tạo thư mục lưu trữ: `uploads/products/{shop_id}/{product_id}/` (nếu chưa có).
  3. Duyệt qua danh sách các file ảnh tải lên. Với mỗi file:
     - Tạo một `uuid` ngẫu nhiên.
     - Dùng Sharp resize ảnh gốc (max width 1200px) lưu thành `main_{uuid}.webp`.
     - Dùng Sharp tạo ảnh thumbnail (200x200px crop) lưu thành `thumb_{uuid}.webp`.
     - Lưu thông tin ảnh chính gốc vào database (bảng `product_images`), cột `url` lưu đường dẫn tương đối `/uploads/products/{shop_id}/{product_id}/main_{uuid}.webp`.
     - Thiết lập ảnh đầu tiên là ảnh chính (`is_primary = true`) nếu sản phẩm chưa có ảnh chính nào trước đó, còn lại đặt là `FALSE`.
  4. Trả về response `201 Created` kèm danh sách thông tin chi tiết các ảnh vừa được thêm thành công (id, url, is_primary, display_order).

### 2.3 API Xóa Hình ảnh Sản phẩm
* **Method:** `DELETE`
* **URL:** `/api/products/:productId/images/:imageId`
* **Xác thực:** Yêu cầu đăng nhập và verify quyền sở hữu sản phẩm của Shop/Vendor.
* **Logic xử lý:**
  1. Tìm kiếm hình ảnh `:imageId` liên kết với `:productId`.
  2. Nếu không tìm thấy, trả về `404 Not Found`.
  3. Lấy trường `url` của ảnh từ DB để phục vụ việc xóa file vật lý (sẽ được xử lý chi tiết ở Prompt 4).
  4. Xóa record hình ảnh khỏi bảng `product_images`.
  5. Trả về response `200 OK` thông báo thành công.
