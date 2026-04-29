# PROMPT 01: MIGRATION CƠ SỞ DỮ LIỆU (MODULE 2)

**Vai trò:** Back-end Developer / Database Engineer
**Nhiệm vụ:** Cập nhật schema cơ sở dữ liệu để hỗ trợ các chức năng của Customer.

### Yêu cầu chi tiết:
1.  **Tạo các Type mới (Enum):**
    *   `OrderStatus`: 'pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'returned'.
    *   `WalletTransactionType`: 'deposit', 'withdraw', 'refund', 'payment'.
    *   `ReturnStatus`: 'pending_vendor', 'approved', 'rejected', 'escalated', 'resolved_admin'.

2.  **Tạo các bảng mới:**
    *   `categories`: id, name, slug, parent_id.
    *   `products`: Bổ sung `category_id`, `stock`, `is_featured`, `image_urls` (JSONB).
    *   `cart_items`: user_id, product_id, quantity.
    *   `orders`: buyer_id, order_code (ORD-...), total_amount, status, shipping_address.
    *   `order_items`: order_id, product_id, quantity, price_snapshot.
    *   `wallet_transactions`: user_id, amount, type, ref_id, balance_after.
    *   `reviews`, `qa`, `return_requests`.

3.  **Trigger:** Viết hàm PL/pgSQL để tự động cập nhật số sao trung bình của sản phẩm sau mỗi lượt review mới.

4.  **Migration:** Cập nhật file `backend/database/schema.sql` và chạy script để áp dụng thay đổi vào DB.

**Output mong đợi:** File `schema.sql` hoàn chỉnh và cơ sở dữ liệu đã sẵn sàng với các bảng mới.
