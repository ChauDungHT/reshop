# PROMPT 03: KIỂM THỬ UI RESPONSIVE VÀ TRẠNG THÁI (STATE)

**Vai trò:** UI/UX Tester
**Nhiệm vụ:** Đảm bảo giao diện hiển thị đúng trên mọi thiết bị và phản ứng đúng với dữ liệu.

### Kịch bản kiểm thử:
1.  **Responsive Layout:**
    *   Sửa Browser sang kích thước Mobile (375px) -> Grid sản phẩm phải tự chuyển sang 2 cột.
    *   Kiểm tra Sidebar bộ lọc trên Mobile: Phải ẩn vào menu drawer hoặc hiển thị hợp lý.
2.  **Trạng thái giỏ hàng (Gray-out):**
    *   Cho sản phẩm A vào giỏ hàng.
    *   Vào database sửa `stock = 0` cho sản phẩm A.
    *   F5 lại trang giỏ hàng -> Kỳ vọng: Sản phẩm A bị làm mờ (gray-out), có label "Hết hàng" và không thể tích chọn checkbox để checkout.
3.  **Stepper đơn hàng:** Kiểm tra thanh tiến trình trong trang chi tiết đơn hàng hiển thị đúng logic từ Backend (Pending -> Shipped -> Delivered).

**Yêu cầu:** Ghi lại các lỗi vỡ layout hoặc sai logic hiển thị.
