# PROMPT 05: QUY TRÌNH CHECKOUT ATOMIC (TRANSACTION)

**Vai trò:** Senior Back-end Developer
**Nhiệm vụ:** Xây dựng hệ thống thanh toán và đặt hàng đảm bảo an toàn dữ liệu tuyệt đối.

### Yêu cầu chi tiết (Luồng POST /api/checkout):
1.  **DB Transaction (BEGIN):** Toàn bộ các bước sau phải nằm trong 1 transaction.
2.  **Lock & Check Stock:** 
    *   Với mỗi item: `SELECT stock FROM products WHERE id=? FOR UPDATE`.
    *   Kiểm tra `stock >= quantity`. Nếu không đủ -> ROLLBACK ngay lập tức và báo lỗi `ERR_OUT_OF_STOCK`.
    *   `UPDATE products SET stock = stock - quantity`.
3.  **Tạo Đơn Hàng:**
    *   INSERT `orders` với mã định dạng: `ORD-YYYYMMDD-XXXXX`.
    *   INSERT `order_items` kèm theo **Price Snapshot** (Lưu giá sản phẩm tại thời điểm mua, không phụ thuộc vào việc Vendor đổi giá sau này).
4.  **Thanh Toán Ví (Nếu chọn phương thức Wallet):**
    *   `SELECT wallet_balance FROM users WHERE id=? FOR UPDATE`.
    *   Kiểm tra `balance >= total_amount`. Nếu không đủ -> ROLLBACK và báo lỗi `ERR_INSUFFICIENT_BALANCE`.
    *   `UPDATE users SET wallet_balance = balance - total_amount`.
    *   Ghi log vào `wallet_transactions`.
5.  **Dọn dẹp:** Xóa các item tương ứng trong `cart_items`.
6.  **COMMIT & Trả kết quả.**

**Output mong đợi:** API Checkout cực kỳ an toàn, không bị lỗi âm kho hay mất tiền vô lý.
