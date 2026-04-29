# PROMPT 03: QUẢN LÝ GIỎ HÀNG & LOGIC ĐỒNG BỘ (SYNC)

**Vai trò:** Back-end Developer
**Nhiệm vụ:** Quản lý giỏ hàng trên Server và xử lý merge dữ liệu từ khách hàng (localStorage).

### Yêu cầu chi tiết:
1.  **API CRUD Giỏ hàng (Yêu cầu Login):**
    *   `GET /api/cart`: Lấy danh sách item kèm giá hiện tại của sản phẩm.
    *   `POST /api/cart`: Thêm sản phẩm (Nếu đã có thì cộng dồn số lượng).
    *   `PUT /api/cart/:id`: Cập nhật số lượng.
    *   `DELETE /api/cart/:id`: Xóa item.

2.  **Logic đồng bộ (POST /api/cart/sync):**
    *   Nhận một mảng các `product_id` và `quantity` từ phía Frontend (đây là giỏ hàng localStorage của khách khi chưa login).
    *   Thực hiện merge vào bảng `cart_items` trong DB:
        - Nếu sản phẩm đã có trong DB: Giữ nguyên hoặc cộng dồn tùy logic (Ưu tiên số lượng mới nhất).
        - Nếu chưa có: INSERT mới.

3.  **Validate:** Đảm bảo `quantity` không vượt quá `stock` hiện tại trong DB.

**Output mong đợi:** Module `cart` với logic sync hoàn chỉnh.
