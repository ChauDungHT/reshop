# KẾ HOẠCH LÀM VIỆC - ĐỘI BACKEND (NODE.JS + POSTGRESQL)
**Module:** 2 — CHỨC NĂNG CUSTOMER (KHÁCH HÀNG)

---

## 1. Thiết Kế Schema Database (Chi Tiết)

### A. Các Bảng Mới
| Bảng | Mô Tả | Ghi Chú |
|---|---|---|
| `categories` | Danh mục sản phẩm | `id`, `name`, `slug`, `parent_id` (FK) |
| `products` | Thông tin sản phẩm | `id`, `vendor_id` (FK), `category_id` (FK), `name`, `description` (TEXT), `price`, `stock`, `is_featured` (BOOLEAN), `image_urls` (JSONB) |
| `cart_items` | Giỏ hàng lưu trên DB | `id`, `user_id` (FK), `product_id` (FK), `quantity` |
| `orders` | Đơn hàng tổng | `id`, `buyer_id` (FK), `order_code` (ORD-YYYYMMDD-XXXXX), `total_amount`, `status` (Enum), `shipping_address` (JSONB), `payment_method` |
| `order_items` | Chi tiết từng sản phẩm trong đơn | `id`, `order_id` (FK), `product_id` (FK), `quantity`, `price_snapshot` (Giá tại thời điểm mua) |
| `wallet_transactions` | Lịch sử ví | `id`, `user_id` (FK), `amount`, `type` (deposit/withdraw/refund), `ref_id` (order_id), `balance_after` |
| `reviews` | Đánh giá sản phẩm | `id`, `order_id` (FK), `product_id` (FK), `user_id` (FK), `stars` (1-5), `comment`, `images` (JSONB), `vendor_reply` |
| `qa` | Hỏi đáp công khai | `id`, `product_id` (FK), `user_id` (FK), `question`, `answer`, `answered_by` (vendor_id) |
| `return_requests` | Yêu cầu trả hàng | `id`, `order_item_id` (FK), `reason`, `description`, `images` (JSONB), `status` (pending/approved/rejected) |

### B. Cơ Chế Đặc Biệt
- **Trigger Cập Nhật Sao:** Viết function trigger trên PostgreSQL để mỗi khi có record mới trong `reviews`, tự động tính toán lại `average_rating` trong bảng `products`.
- **Constraint:** `CHECK (stars >= 1 AND stars <= 5)`.

---

## 2. Danh Sách API Endpoints

### A. Sản Phẩm & Tìm Kiếm
- `GET /api/products`: Lấy danh sách (Query: `category`, `min_price`, `max_price`, `sort`, `is_featured`, `q` for search).
- `GET /api/products/:id`: Chi tiết sản phẩm + Related products.
- `GET /api/products/search/suggest`: Autocomplete (ILIKE).

### B. Giỏ Hàng
- `GET /api/cart`: Lấy giỏ hàng của User hiện tại.
- `POST /api/cart/sync`: Merge giỏ hàng từ localStorage (gửi mảng items lên) vào DB khi login.
- `PUT /api/cart/:id`: Cập nhật số lượng.
- `DELETE /api/cart/:id`: Xóa item.

### C. Checkout & Ví (Trọng Tâm)
- **`POST /api/checkout`**: 
    - Sử dụng **Database Transaction (Atomicity)**.
    - Dùng `SELECT ... FOR UPDATE` để lock dòng `stock` của sản phẩm và `wallet_balance` của user.
    - Snapshot giá sản phẩm vào `order_items`.
- `POST /api/wallet/topup`: Nạp tiền ảo (Mock).
- `GET /api/wallet/history`: Xem lịch sử giao dịch.

### D. Sau Bán Hàng
- `POST /api/reviews`: Gửi đánh giá (Check status = 'delivered').
- `POST /api/qa/ask`: Đặt câu hỏi.
- `POST /api/returns`: Yêu cầu trả hàng (Check < 7 ngày).

---

## 3. Business Logic Logic "Xương Sống"
1. **Merge Cart:** Khi login, Backend nhận danh sách từ Frontend. Nếu `product_id` đã tồn tại trong DB -> Cộng dồn số lượng. Ngược lại -> Thêm mới.
2. **Snapshot:** Lưu giá tại thời điểm đặt hàng vào bảng `order_items`. Nếu sau này Vendor đổi giá, đơn hàng cũ vẫn giữ nguyên giá cũ.
3. **Transaction Safety:** Đảm bảo khi thanh toán ví, nếu trừ tiền thành công nhưng trừ stock thất bại (do người khác mua mất) -> Toàn bộ transaction phải Rollback (Hoàn tiền ngay lập tức).
