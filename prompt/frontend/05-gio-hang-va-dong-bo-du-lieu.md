# PROMPT 05: GIỎ HÀNG & LOGIC ĐỒNG BỘ DỮ LIỆU (CART SYNC)

**Vai trò:** Frontend Developer (State Management)
**Nhiệm vụ:** Xây dựng tính năng giỏ hàng và đồng bộ hóa với Backend.

### Yêu cầu chi tiết:
1.  **Cart Store:**
    *   Lưu giỏ hàng vào `localStorage` khi người dùng chưa đăng nhập. 
    *   Hỗ trợ `addItem`, `removeItem`, `updateQuantity`.

2.  **Logic Đồng Bộ (Sync):**
    *   Sau khi user đăng nhập thành công (`AuthContext.user` có giá trị) -> Gọi API `/api/cart/sync` để đẩy dữ liệu từ `localStorage` lên server.
    *   Cập nhật lại Global State của giỏ hàng từ kết quả trả về của Backend.

3.  **UI Giỏ hàng:**
    *   Hiển thị danh sách sản phẩm, giá đơn vị, thành tiền.
    *   Nút Checkbox để chọn những sản phẩm muốn Checkout.
    *   **Gray-out**: Nếu sản phẩm bị hết hàng trong DB, làm mờ item đó và không cho chọn.

**Output mong đợi:** Giỏ hàng hoạt động mượt mà cả khi online/offline và tự động sync khi login.
