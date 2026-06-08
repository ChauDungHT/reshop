# PROMPT 4: QUẢN LÝ DISK I/O (DỌN DẸP FILE) VÀ STATIC ASSETS

## 1. Mục tiêu
Thực hiện các thao tác dọn dẹp file vật lý trên ổ đĩa cứng khi thay đổi avatar, xóa hình ảnh sản phẩm hoặc xóa toàn bộ sản phẩm nhằm tránh lưu trữ rác dữ liệu. Đồng thời cấu hình serve tĩnh và CORS tài nguyên ảnh.

## 2. Các yêu cầu kỹ thuật chi tiết

### 2.1 Logic Dọn dẹp File vật lý trên Disk
Sử dụng module `fs` (hoặc `fs/promises`) của Node.js để tương tác trực tiếp với hệ thống tập tin vật lý.

1. **Khi Cập nhật Avatar mới:**
   - Trước khi ghi đè file `avatar.webp` mới vào thư mục `uploads/avatars/{user_id}/`, hãy kiểm tra xem file `avatar.webp` cũ đã tồn tại chưa.
   - Nếu tồn tại, gọi `fs.unlink()` (hoặc `fs.promises.unlink()`) để xóa file cũ đi nhằm tránh tranh chấp ghi file hoặc giữ file rác.

2. **Khi Xóa 1 ảnh sản phẩm:**
   - Khi nhận được yêu cầu xóa hình ảnh `:imageId` thành công khỏi database, lấy đường dẫn lưu trữ tương đối (ví dụ: `/uploads/products/1/42/main_abc.webp`).
   - Tìm và xóa ảnh sản phẩm gốc (`main_abc.webp`) bằng `fs.unlink()`.
   - Đồng thời, suy luận ra đường dẫn ảnh thumbnail tương ứng (`thumb_abc.webp` nằm cùng thư mục) và tiến hành xóa nó bằng `fs.unlink()`.

3. **Khi Xóa toàn bộ sản phẩm:**
   - Khi sản phẩm bị xóa hoàn toàn khỏi DB (hoặc khi Vendor xóa sản phẩm), cần giải phóng toàn bộ thư mục ảnh của sản phẩm đó: `uploads/products/{shop_id}/{product_id}/`.
   - Gọi hàm xóa thư mục đệ quy:
     ```javascript
     const fs = require('fs');
     const productDir = path.join(__dirname, '../../uploads/products', shopId, productId);
     if (fs.existsSync(productDir)) {
       fs.rmSync(productDir, { recursive: true, force: true });
     }
     ```

### 2.2 Cấu hình Static File Serving và CORS
Để client Frontend (React) có thể hiển thị trực tiếp hình ảnh, Backend cần mở cổng phục vụ file tĩnh và cấu hình CORS đầy đủ.

1. **Serve tĩnh thư mục `uploads`:**
   - Thêm cấu hình Express middleware để phục vụ tài nguyên tĩnh từ thư mục `/uploads` ở thư mục gốc của dự án:
     ```javascript
     const path = require('path');
     app.use('/uploads', express.static(path.join(__dirname, '../../uploads')));
     ```
2. **Cấu hình CORS:**
   - Cập nhật thư viện `cors` cấu hình cho phép domain của frontend (được cấu hình trong file `.env` qua biến `FRONTEND_URL` hoặc mặc định là `http://localhost:5173`) truy cập static assets này. Thiết lập `credentials: true`.
