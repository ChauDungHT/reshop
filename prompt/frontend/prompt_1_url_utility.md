# PROMPT 1: XÂY DỰNG UTILITY CHUẨN HÓA ĐƯỜNG DẪN ẢNH VÀ TẠO THUMBNAIL

## 1. Mục tiêu
Xây dựng các hàm tiện ích (utility functions) trong dự án React + Vite để chuẩn hóa đường dẫn từ tương đối (relative path) ở cơ sở dữ liệu thành URL tuyệt đối (absolute URL) để tải từ static server của Backend, hỗ trợ suy luận ảnh thumbnail và hiển thị ảnh mặc định (placeholder) nếu ảnh không tồn tại.

## 2. Các yêu cầu kỹ thuật chi tiết
1. **Vị trí lưu trữ file:** Tạo file tiện ích tại `src/shared/utils/image.ts` (hoặc vị trí tương tự tùy theo cấu trúc thư mục frontend hiện tại).
2. **Hàm tiện ích `getFullImageUrl(path, fallbackType)`:**
   - Đầu vào: 
     - `path`: Đường dẫn tương đối từ DB (kiểu `string | null | undefined`).
     - `fallbackType`: Kiểu ảnh mặc định (`'avatar'` hoặc `'product'`), mặc định là `'product'`.
   - Logic xử lý:
     - Nếu `path` rỗng/null/undefined: Trả về đường dẫn ảnh placeholder tương ứng lưu trong thư mục public:
       - Với `'avatar'`: `/assets/placeholders/default-avatar.png`
       - Với `'product'`: `/assets/placeholders/default-product.png`
     - Nếu `path` bắt đầu bằng `http://` hoặc `https://`: Giữ nguyên và trả về `path`.
     - Ngược lại: Nối `path` với biến môi trường `import.meta.env.VITE_API_URL` (nếu biến này rỗng, mặc định dùng `http://localhost:8000`). Đảm bảo chuẩn hóa dấu gạch chéo `/` ở giữa để không xảy ra lỗi trùng dấu gạch chéo (ví dụ: `http://localhost:8000//uploads/...`).
3. **Hàm tiện ích `getThumbnailUrl(path)`:**
   - Đầu vào: `path` (đường dẫn ảnh chính gốc).
   - Logic xử lý:
     - Nếu `path` rỗng: Trả về ảnh placeholder mặc định cho sản phẩm thông qua `getFullImageUrl(null, 'product')`.
     - Lấy URL tuyệt đối từ `getFullImageUrl(path, 'product')`.
     - Thay thế tên file gốc từ định dạng `main_{uuid}.webp` sang định dạng `thumb_{uuid}.webp` ở cuối đường dẫn (Ví dụ sử dụng regex: `url.replace(/\/main_([^/]+)$/, '/thumb_$1')`).
     - Trả về đường dẫn thumbnail đã chuyển đổi.

## 3. Hướng dẫn tích hợp
- Tạo sẵn 2 ảnh placeholder và lưu trữ tại thư mục frontend:
  - `public/assets/placeholders/default-avatar.png`
  - `public/assets/placeholders/default-product.png`
- Export cả hai hàm trên để có thể sử dụng dễ dàng tại mọi component.

## 4. Kết quả mong đợi (Ví dụ kiểm thử nhanh)
- `getFullImageUrl(null, 'avatar')` -> `"/assets/placeholders/default-avatar.png"`
- `getFullImageUrl('/uploads/avatars/1/avatar.webp', 'avatar')` -> `"http://localhost:8000/uploads/avatars/1/avatar.webp"`
- `getThumbnailUrl('/uploads/products/1/42/main_abc.webp')` -> `"http://localhost:8000/uploads/products/1/42/thumb_abc.webp"`
