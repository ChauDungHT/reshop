# PROMPT 01: XÂY DỰNG CÁC UI COMPONENTS CỐT LÕI (SHARED-UI)

**Vai trò:** Frontend Developer (React + Tailwind)
**Nhiệm vụ:** Xây dựng các component dùng chung cho Module Customer.

### Yêu cầu chi tiết:
1.  **ProductCard**: 
    *   Hiển thị ảnh sản phẩm, tên, giá (VNĐ), và số sao đánh giá.
    *   Có badge "Nổi bật" cho sản phẩm `is_featured`.
    *   Hover hiệu ứng scale nhẹ và bóng đổ (Shadow-lg).

2.  **OrderStepper**: 
    *   Thanh trạng thái đơn hàng (Stepper) với các bước: Đã đặt -> Xác nhận -> Đang giao -> Thành công.
    *   Hỗ trợ trạng thái `active`, `completed`, và `disabled`.

3.  **Badge Content**: Các loại badge trạng thái đơn hàng (Chờ duyệt, Đang giao, Đã hủy) với màu sắc Tailwind chuẩn.

4.  **QuantitySelector**: Nút +/- để điều chỉnh số lượng mua, có validate min=1 và max=stock.

**Output mong đợi:** Các component được đặt trong `frontend/shared-ui/src/components/` và sẵn sàng sử dụng.
