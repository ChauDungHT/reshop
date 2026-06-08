# [BACKEND TEAM] - MODULE 8: LƯU TRỮ FILE & ẢNH (LOCAL FILE STORAGE)

Kế hoạch triển khai chi tiết cho đội ngũ Backend để xây dựng hệ thống lưu trữ file và ảnh cục bộ (Local Storage). Kế hoạch này tập trung vào 3 nghiệp vụ cốt lõi: xử lý avatar người dùng, xử lý hình ảnh sản phẩm (kèm thumbnail), và render hình ảnh.

---

## 1. DATABASE SCHEMA (PostgreSQL)

Chúng ta cần cập nhật bảng `users` và quản lý bảng hình ảnh sản phẩm `product_images`.

### 1.1 Bảng `users` (Cập nhật cột avatar)
Bảng `users` đã tồn tại cột `avatar_url`. Chúng ta cần đảm bảo định nghĩa chuẩn của nó như sau:

| Tên trường | Kiểu dữ liệu | Ràng buộc | Ghi chú |
| :--- | :--- | :--- | :--- |
| `avatar_url` | `VARCHAR(255)` | `NULLABLE`, `DEFAULT NULL` | Lưu đường dẫn tương đối. Ví dụ: `/uploads/avatars/{user_id}/avatar.webp` |

### 1.2 Bảng `product_images` (Lưu trữ danh sách ảnh sản phẩm)
Mỗi sản phẩm có thể có nhiều ảnh. Chúng ta chỉ lưu đường dẫn ảnh chính (`main_{uuid}.webp`). Ảnh thu nhỏ (`thumb_{uuid}.webp`) sẽ nằm cùng thư mục và được sinh tự động, Frontend sẽ tự suy luận đường dẫn mà không cần lưu thêm một trường trong DB.

| Tên trường | Kiểu dữ liệu | Ràng buộc | Ghi chú |
| :--- | :--- | :--- | :--- |
| `id` | `UUID` | `PRIMARY KEY`, `DEFAULT gen_random_uuid()` | Định danh duy nhất cho ảnh. |
| `product_id` | `UUID` | `FOREIGN KEY REFERENCES products(id) ON DELETE CASCADE` | Liên kết đến sản phẩm. |
| `url` | `VARCHAR(255)` | `NOT NULL` | Đường dẫn tương đối của ảnh chính gốc. Ví dụ: `/uploads/products/{shop_id}/{product_id}/main_{uuid}.webp` |
| `is_primary` | `BOOLEAN` | `DEFAULT false` | Đánh dấu ảnh đại diện sản phẩm. |
| `display_order` | `INT` | `DEFAULT 0` | Thứ tự hiển thị hình ảnh trên slide/gallery. |
| `created_at` | `TIMESTAMP WITH TIME ZONE` | `DEFAULT now()` | Thời gian tải lên. |

---

## 2. DANH SÁCH API ENDPOINTS

Tất cả các API upload đều trả về đường dẫn tương đối (relative path) bắt đầu bằng `/uploads/...`.

### 2.1 Upload/Cập nhật Avatar Người dùng
* **Method:** `POST`
* **URL:** `/api/users/profile/avatar`
* **Headers:** `Content-Type: multipart/form-data`, `Authorization: Bearer <token>`
* **Body (FormData):** 
  - Key: `avatar` (Chỉ chấp nhận 1 file ảnh)
* **Response Mẫu (200 OK):**
  ```json
  {
    "success": true,
    "message": "Avatar updated successfully",
    "avatar_url": "/uploads/avatars/ee067f5e-8882-4d32-89ce-714786c04165/avatar.webp"
  }
  ```

### 2.2 Upload/Thêm Hình ảnh Sản phẩm
* **Method:** `POST`
* **URL:** `/api/products/:productId/images`
* **Headers:** `Content-Type: multipart/form-data`, `Authorization: Bearer <token>`
* **Body (FormData):** 
  - Key: `product_images` (Hỗ trợ upload nhiều file, tối đa 5 file)
* **Response Mẫu (201 Created):**
  ```json
  {
    "success": true,
    "message": "Product images uploaded successfully",
    "images": [
      {
        "id": "e2ba34a6-7789-411a-85d1-d2495b6a782b",
        "url": "/uploads/products/46c52822-e353-428b-a9ff-1d55ec5341a2/3f9b6a26-7adf-4c51-b75f-ff2c2a6a99bc/main_8f7b3a9c.webp",
        "is_primary": true,
        "display_order": 0
      }
    ]
  }
  ```

### 2.3 Xóa Hình ảnh Sản phẩm
* **Method:** `DELETE`
* **URL:** `/api/products/:productId/images/:imageId`
* **Headers:** `Authorization: Bearer <token>`
* **Response Mẫu (200 OK):**
  ```json
  {
    "success": true,
    "message": "Product image deleted successfully"
  }
  ```

---

## 3. LOGIC XỬ LÝ TRUNG GIAN & NGHIỆP VỤ

### 3.1 Cấu hình Multer (Memory Storage)
Sử dụng `multer.memoryStorage()` để lấy buffer file trực tiếp xử lý qua Sharp nhằm giảm Disk I/O thừa.

```javascript
const multer = require('multer');

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp'];
  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('INVALID_FILE_TYPE: Only JPEG, PNG, and WebP are allowed!'), false);
  }
};

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // Giới hạn 5MB
  },
  fileFilter: fileFilter
});
```

### 3.2 Xử lý ảnh với Sharp
Toàn bộ ảnh upload phải được convert sang định dạng WebP với chất lượng (quality) nén là 85% nhằm tối ưu hóa băng thông tải trang.

1. **Đối với Avatar:**
   - Resize và crop vuông: `400x400` pixel, crop center.
   - Lưu tên file cố định: `avatar.webp`.
2. **Đối với Ảnh sản phẩm (Gốc):**
   - Resize: Chiều rộng tối đa `1200px` (giữ nguyên tỷ lệ chiều cao, không kéo giãn).
   - Lưu tên file định dạng: `main_{uuid}.webp`.
3. **Đối với Ảnh sản phẩm (Thumbnail):**
   - Tạo ảnh thumbnail kích thước: `200x200` pixel, crop center (`fit: 'cover'`).
   - Lưu tên file định dạng: `thumb_{uuid}.webp` (sử dụng chung `{uuid}` của ảnh gốc).

```javascript
const sharp = require('sharp');
const { v4: uuidv4 } = require('uuid');

// Ví dụ xử lý ảnh sản phẩm gốc và thumbnail
const uuid = uuidv4();
const mainFileName = `main_${uuid}.webp`;
const thumbFileName = `thumb_${uuid}.webp`;

// Lưu ảnh gốc (Max width 1200px)
await sharp(file.buffer)
  .resize({ width: 1200, withoutEnlargement: true })
  .toFormat('webp', { quality: 85 })
  .toFile(path.join(uploadDir, mainFileName));

// Lưu ảnh thumbnail (200x200px crop center)
await sharp(file.buffer)
  .resize(200, 200, { fit: 'cover', position: 'center' })
  .toFormat('webp', { quality: 85 })
  .toFile(path.join(uploadDir, thumbFileName));
```

### 3.3 Quản lý Disk I/O (Lưu & Xóa vật lý)

1. **Cấu trúc thư mục lưu trữ:**
   - Thư mục avatar: `uploads/avatars/{user_id}/avatar.webp`
   - Thư mục sản phẩm: `uploads/products/{shop_id}/{product_id}/` chứa `main_{uuid}.webp` và `thumb_{uuid}.webp`.
   - Trước khi lưu file, sử dụng `fs.mkdirSync(dir, { recursive: true })` để tự động tạo thư mục nếu chưa tồn tại.
   
2. **Logic dọn dẹp Disk (fs.unlink):**
   - **Khi cập nhật avatar mới:** Tìm và xóa file `avatar.webp` cũ tại thư mục `uploads/avatars/{user_id}/` (nếu có) trước khi ghi đè file mới.
   - **Khi xóa 1 hình ảnh sản phẩm:**
     - Truy vấn DB để lấy đường dẫn relative URL (ví dụ: `/uploads/products/1/42/main_abc.webp`).
     - Xác định đường dẫn tuyệt đối của cả 2 file: ảnh gốc (`main_abc.webp`) và ảnh thumbnail tương ứng (`thumb_abc.webp`).
     - Gọi `fs.unlink()` cho cả 2 file để dọn dẹp disk trước khi xóa record trong DB.
   - **Khi xóa toàn bộ sản phẩm:**
     - Xóa thư mục vật lý chứa sản phẩm đó: `uploads/products/{shop_id}/{product_id}/` bằng cách gọi `fs.rmSync(productDir, { recursive: true, force: true })`.

---

## 4. SERVE FILE TĨNH & CORS

1. **Serve tĩnh thư mục `uploads/` tại Server Node.js:**
   ```javascript
   const path = require('path');
   app.use('/uploads', express.static(path.join(__dirname, '../../uploads')));
   ```
2. **Cấu hình CORS:**
   Đảm bảo cấu hình CORS cho phép domain Frontend truy cập tài nguyên tĩnh trên server backend.
   ```javascript
   const cors = require('cors');
   app.use(cors({
     origin: process.env.FRONTEND_URL || 'http://localhost:5173',
     credentials: true
   }));
   ```
