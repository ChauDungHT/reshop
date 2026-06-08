# [FRONTEND TEAM] - MODULE 8: LƯU TRỮ FILE & ẢNH (LOCAL FILE STORAGE)

Kế hoạch triển khai chi tiết cho đội ngũ Frontend để thiết kế giao diện, quản lý state và tương tác với các API lưu trữ hình ảnh cục bộ từ Server Backend. Kế hoạch này tập trung vào các trang cá nhân (Profile), danh sách sản phẩm (Product List) và chi tiết sản phẩm (Product Detail).

---

## 1. CẤU TRÚC COMPONENTS & UTILITIES

### 1.1 Hàm Tiện ích `getFullImageUrl` (Path Normalizer)
Cần viết hàm tiện ích `getFullImageUrl(path, fallbackType)` để xử lý việc nối URL tuyệt đối từ Backend Server (đọc từ biến môi trường `VITE_API_URL`) và trả về ảnh placeholder thích hợp khi không có ảnh.

```typescript
// src/shared/utils/image.ts

export const getFullImageUrl = (
  path: string | null | undefined,
  fallbackType: 'avatar' | 'product' = 'product'
): string => {
  if (!path) {
    return fallbackType === 'avatar' 
      ? '/assets/placeholders/default-avatar.png' 
      : '/assets/placeholders/default-product.png';
  }

  // Nếu path đã là URL tuyệt đối (ví dụ từ bên thứ ba hoặc lưu đầy đủ)
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }

  const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
  // Chuẩn hóa gạch chéo
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${baseUrl}${cleanPath}`;
};

/**
 * Hàm tự động chuyển đổi đường dẫn ảnh gốc sang ảnh thumbnail 200x200
 * Ví dụ: .../main_abc.webp -> .../thumb_abc.webp
 */
export const getThumbnailUrl = (path: string | null | undefined): string => {
  if (!path) return getFullImageUrl(null, 'product');
  const mainUrl = getFullImageUrl(path, 'product');
  return mainUrl.replace(/\/main_([^/]+)$/, '/thumb_$1');
};
```

### 1.2 Component `AvatarUpload` (Tải lên Avatar tròn)
* **Tính năng:**
  - Hiển thị ảnh Avatar hiện tại dạng tròn. Nếu chưa có ảnh, tự động dùng ảnh placeholder.
  - Hover hiệu ứng (hiển thị icon camera / lớp overlay "Đổi ảnh").
  - Click-to-upload: Kích hoạt thẻ `<input type="file" accept="image/jpeg, image/png, image/webp" />` ẩn.
  - Client-side validation: Kiểm tra file tải lên có kích thước `< 5MB`, nếu sai báo lỗi qua toast UI.
  - Hiển thị chế độ loading cục bộ (Spinner hoặc giảm Opacity của ảnh cũ) trong quá trình gửi request `POST /api/users/profile/avatar`.

### 1.3 Component `ProductImageUpload` (Kéo thả, Nhiều ảnh, Đặt ảnh chính)
* **Tính năng:**
  - Vùng kéo thả file (Drag & Drop zone) sử dụng API kéo thả HTML5.
  - Xem trước (Preview) lưới danh sách ảnh đã chọn trước khi upload hoặc danh sách ảnh hiện có trên Server.
  - Hiển thị Progress bar (%) tải lên của từng file.
  - Gắn nhãn hoặc nút "Đặt làm ảnh chính" (Primary Image). Khi chọn, UI cập nhật lập tức và đồng bộ thuộc tính `is_primary = true` lên DB.
  - Nút "Xóa ảnh" (Delete icon) trên từng khung preview để gọi API xóa ảnh vật lý khỏi hệ thống.

---

## 2. QUẢN LÝ STATE & RENDERING TRÊN TRANG

### 2.1 Render danh sách sản phẩm (Product List / Search Results)
* **Yêu cầu tối ưu hóa:** 
  - Tại trang danh sách, chỉ được gọi đường dẫn thumbnail (`thumb_{uuid}.webp`) qua helper `getThumbnailUrl(imagePath)` để tiết kiệm tối đa băng thông tải trang và tăng điểm hiệu năng Google Lighthouse.
  - Đảm bảo tỷ lệ khung ảnh là `aspect-square` (1:1) để tránh méo hình.

### 2.2 Render trang chi tiết sản phẩm (Product Detail Page)
* **Yêu cầu kết xuất:**
  - Render ảnh chất lượng gốc (`main_{uuid}.webp`) qua helper `getFullImageUrl(imagePath)`.
  - Hiển thị danh sách ảnh dạng Slider/Carousel (ảnh chính hiển thị đầu tiên, các ảnh phụ hiển thị tiếp theo).
  - Tích hợp tính năng Zoom khi hover vào ảnh chính của sản phẩm.

### 2.3 Quản lý State khi Upload (React Query / React State)
* Khi thêm hoặc xóa ảnh thành công, sử dụng cơ chế `queryClient.invalidateQueries(['product', productId])` để tự động fetch lại danh sách ảnh mới nhất, tránh tình trạng UI và DB lệch nhau.

---

## 3. TỐI ƯU HÓA UI/UX TRẢI NGHIỆM NGƯỜI DÙNG

1. **Skeleton Loading:**
   Hiển thị hiệu ứng Skeleton (vùng xám chạy sáng ngang) cho avatar và ảnh sản phẩm khi trang đang tải thông tin từ API.
2. **Lazy Loading:**
   Sử dụng thuộc tính `loading="lazy"` cho các thẻ `<img>` trên trang danh sách sản phẩm để tối ưu hoá thời gian tải.
3. **Ảnh Placeholder cục bộ:**
   Lưu trữ các ảnh `default-avatar.png` và `default-product.png` trong thư mục `public/assets/placeholders/` của Frontend để luôn sẵn sàng hiển thị khi server static ngắt kết nối hoặc lỗi mạng.
