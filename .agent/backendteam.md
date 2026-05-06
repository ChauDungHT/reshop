# 🏗️ KẾ HOẠCH LÀM VIỆC ĐỘI BACKEND (NODE.JS + POSTGRESQL)

## 1. THIẾT KẾ SCHEMA DATABASE (PostgreSQL)

| Bảng | Trường (Fields) | Kiểu dữ liệu | Ràng buộc (Constraints) |
|---|---|---|---|
| **shops** | `id` | UUID | PK, Default gen_random_uuid() |
| | `vendor_id` | UUID | FK -> users.id, Unique |
| | `name`, `slug` | VARCHAR(255) | Not Null, Unique (slug) |
| | `description` | TEXT | Nullable |
| | `phone`, `address`, `email` | VARCHAR | Nullable |
| | `logo_url`, `banner_url` | VARCHAR | Nullable |
| | `return_policy_days` | INT | Default 7 |
| | `return_policy_desc` | TEXT | Nullable |
| | `created_at`, `updated_at` | TIMESTAMP | Default NOW() |
| **products** | `id` | UUID | PK |
| | `shop_id` | UUID | FK -> shops.id |
| | `category_id` | UUID | FK -> categories.id |
| | `name`, `slug` | VARCHAR(255) | Not Null, Unique (slug) |
| | `price` | DECIMAL | Not Null, Check >= 0 |
| | `original_price` | DECIMAL | Nullable |
| | `stock` | INT | Not Null, Check >= 0 |
| | `short_desc` | VARCHAR(300) | Nullable |
| | `long_desc` | TEXT | Nullable |
| | `status` | ENUM | 'active', 'hidden', 'deleted' (Default 'active') |
| | `deleted_at` | TIMESTAMP | Nullable (Soft delete) |
| **product_images** | `id` | UUID | PK |
| | `product_id` | UUID | FK -> products.id ON DELETE CASCADE |
| | `url` | VARCHAR | Not Null |
| | `is_primary` | BOOLEAN | Default FALSE |
| | `display_order` | INT | Default 0 |
| **orders** | `id` | UUID | PK |
| | `buyer_id`, `shop_id` | UUID | FK -> users.id, FK -> shops.id |
| | `order_code` | VARCHAR | Not Null, Unique |
| | `total_amount` | DECIMAL | Not Null |
| | `payment_method` | VARCHAR | Not Null |
| | `status` | ENUM | 'pending', 'confirmed', 'shipped', 'delivered', 'cancelled' |
| | `shipping_address` | JSONB | Not Null |
| | `tracking_code` | VARCHAR | Nullable |
| **order_items** | `id` | UUID | PK |
| | `order_id` | UUID | FK -> orders.id |
| | `product_id` | UUID | FK -> products.id |
| | `quantity` | INT | Not Null, Check > 0 |
| | `price_snapshot` | DECIMAL | Not Null |
| **return_requests**| `id` | UUID | PK |
| | `order_item_id` | UUID | FK -> order_items.id |
| | `reason` | VARCHAR | Not Null |
| | `description` | TEXT | Nullable |
| | `images` | JSONB | Nullable |
| | `status` | ENUM | 'pending', 'approved', 'rejected' (Default 'pending') |
| | `reject_reason` | TEXT | Nullable (Min 20 chars nếu rejected) |
| **qa** | `id` | UUID | PK |
| | `product_id`, `user_id` | UUID | FK -> products.id, FK -> users.id |
| | `question` | TEXT | Not Null |
| | `answer` | TEXT | Nullable |
| | `answered_at` | TIMESTAMP | Nullable |

---

## 2. DANH SÁCH API ENDPOINTS

| Method | URL | Payload Yêu Cầu | Dữ Liệu Trả Về Mẫu (Success 200/201) |
|---|---|---|---|
| **PUT** | `/api/vendor/shop` | FormData (Logo/Banner), text fields | `{ success: true, message: "Cập nhật thành công", data: ShopObject }` |
| **GET** | `/api/vendor/dashboard` | (Chỉ JWT Token) | `{ total_revenue: 5000000, new_orders: 5, active_products: 120, chart_30_days: [...] }` |
| **GET** | `/api/vendor/products` | Query: `?status=active&q=A&page=1` | `{ products: [...], total: 50, page: 1 }` |
| **POST** | `/api/vendor/products` | FormData (fields + up to 8 images) | `{ success: true, product_id: "uuid" }` |
| **DELETE**| `/api/vendor/products/bulk` | `{ "ids": ["uuid1", "uuid2"] }` | `{ success: true, deleted_count: 2 }` |
| **PUT** | `/api/vendor/products/bulk-toggle`| `{ "ids": ["uuid"], "status": "hidden" }`| `{ success: true, updated_count: 1 }` |
| **GET** | `/api/vendor/orders` | Query: `?status=pending&date_from=...` | `{ orders: [...], total: 20 }` |
| **PUT** | `/api/vendor/orders/:id/status`| `{ "status": "shipped", "tracking_code": "GHN123" }` | `{ success: true }` |
| **GET** | `/api/vendor/orders/:id/pdf` | (Chỉ JWT Token) | `Trả về File Stream (Content-Type: application/pdf)` |
| **PUT** | `/api/vendor/returns/:id/approve`| `{}` | `{ success: true, message: "Đã duyệt và hoàn tiền" }` |
| **PUT** | `/api/vendor/returns/:id/reject` | `{ "reject_reason": "Sản phẩm hỏng do KH..." }`| `{ success: true }` |
| **PUT** | `/api/vendor/qa/:id/answer` | `{ "answer": "Sản phẩm còn hàng bạn nhé" }`| `{ success: true }` |

---

## 3. LOGIC CỐT LÕI (CORE LOGIC) CẦN XỬ LÝ

1. **Transaction Phê Duyệt Trả Hàng (Approve Return):**
   - Phải bọc trong `BEGIN` và `COMMIT`.
   - Update trạng thái yêu cầu (`return_requests`).
   - `UPDATE users SET wallet_balance = wallet_balance + refundAmount`.
   - `INSERT INTO wallet_transactions` (Lưu lịch sử hoàn tiền).
   - `UPDATE products SET stock = stock + quantity` (Hoàn lại tồn kho).
   - Nếu có bất kỳ lỗi nào -> `ROLLBACK`.

2. **Middleware Upload Ảnh (Multer & Sharp):**
   - Chặn định dạng file không hợp lệ (chỉ nhận JPG/PNG).
   - Chặn kích thước file lớn (> 5MB).
   - Dùng thư viện `sharp` để: resize (max-width: 1200px), chuyển đổi định dạng sang WebP nhằm tối ưu tốc độ tải.
   - Lưu trữ với thư mục phân cấp: `/uploads/products/{shop_id}/{uuid}.webp`.

3. **Render PDF Hóa Đơn (Puppeteer):**
   - Thiết kế sẵn file HTML/CSS Template cho hóa đơn.
   - Khi có request `GET /pdf`, dùng Handlebars hoặc EJS để inject dữ liệu Order vào HTML.
   - Dùng `puppeteer` chụp màn hình HTML đó dưới định dạng PDF.
   - Stream kết quả về Client (`res.download` hoặc `res.setHeader`).

4. **Soft Delete Sản Phẩm:**
   - Override phương thức `DELETE`. KHÔNG chạy lệnh `DELETE FROM products`.
   - Lệnh đúng: `UPDATE products SET status = 'deleted', deleted_at = NOW() WHERE id IN (...)`.
   - Kiểm tra logic: Nếu sản phẩm đang nằm trong các đơn hàng `status = 'pending'`, từ chối việc xóa và ném lỗi HTTP 409 Conflict.

---

## 4. GIAO ĐIỂM KẾT NỐI VỚI FRONTEND (INTEGRATION POINTS)
- **Upload dữ liệu đa phương tiện:** Phải gửi dưới dạng `multipart/form-data`. API sẽ trả về đường dẫn tương đối `/uploads/...` để Frontend map với biến môi trường `BASE_URL`.
- **Bulk Action:** Payload Backend mong đợi là 1 Array ID `{"ids": ["id1", "id2"]}`.
- **Rich Text HTML:** Backend nhận và lưu trữ trực tiếp chuỗi HTML sinh ra từ Rich Text Editor. (Cảnh báo Frontend cần parse `dangerouslySetInnerHTML` cẩn thận).
