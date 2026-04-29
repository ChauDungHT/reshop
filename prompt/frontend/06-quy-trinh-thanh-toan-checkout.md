# PROMPT 06: QUY TRÌNH THANH TOÁN (CHECKOUT STEPPER)

**Vai trò:** Frontend Developer
**Nhiệm vụ:** Xây dựng quy trình đặt hàng 4 bước.

### Yêu cầu chi tiết:
1.  **Bước 1: Địa chỉ giao hàng**: Form nhập thông tin người nhận (Họ tên, SĐT, Địa chỉ). Hỗ trợ lấy từ profile mặc định.
2.  **Bước 2: Phương thức vận chuyển**: Radio chọn giữa "Giao hàng tiêu chuẩn" và "Giao hàng nhanh".
3.  **Bước 3: Phương thức thanh toán**: 
    *   Tùy chọn: COD hoặc Ví ảo.
    *   Nếu chọn Ví ảo: Hiển thị số dư hiện tại. Nếu thiếu tiền -> Hiện nút "Nạp thêm".
4.  **Bước 4: Xem lại đơn hàng**: Tóm tắt danh sách sản phẩm, địa chỉ, phí ship, tổng tiền. Nút "Đặt hàng".

5.  **Xác nhận**: Trang "Đặt hàng thành công" hiển thị mã đơn hàng `ORD-...`.

**Output mong đợi:** Luồng Checkout chuyên nghiệp với Stepper và phản hồi người dùng rõ ràng.
