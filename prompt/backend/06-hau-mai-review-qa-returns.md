# PROMPT 06: HẬU MÃI (REVIEW, Q&A, RETURNS)

**Vai trò:** Back-end Developer
**Nhiệm vụ:** Hoàn thiện các tính năng tương tác sau mua hàng.

### Yêu cầu chi tiết:
1.  **Reviews:**
    *   `POST /api/reviews`: Kiểm tra user đã mua SP (status = 'delivered'). Một user chỉ review 1 sản phẩm 1 lần.
    *   Hỗ trợ upload tối đa 3 ảnh minh chứng.
    *   Sau khi INSERT, verify trigger đã cập nhật rating trung bình trong bảng `products`.

2.  **Q&A:**
    *   `POST /api/qa/ask`: Cho phép user đặt câu hỏi về sản phẩm.
    *   `DELETE /api/qa/:id`: Kiểm tra logic: Chỉ người đặt hoặc Admin mới được xóa.

3.  **Returns (Trả hàng):**
    *   `POST /api/returns`: Kiểm tra điều kiện status đơn hàng là `delivered` và thời gian giao hàng chưa quá 7 ngày.
    *   Tính toán số lượng trả không vượt quá số lượng đã mua.
    *   Khi Admin/Vendor duyệt (`status=approved`): Tự động hoàn tiền vào ví user và cộng lại tồn kho cho sản phẩm.

**Output mong đợi:** Hệ thống tương tác sau bán hàng đầy đủ và bảo mật.
