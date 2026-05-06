# Prompt 04: Quản lý Đơn hàng & Phê duyệt Trả hàng

## Ngữ cảnh
Xử lý quy trình sau bán hàng: xem đơn hàng, cập nhật trạng thái vận chuyển và xử lý yêu cầu trả hàng từ khách hàng.

## Yêu cầu
Thực hiện trong `backend/src/modules/after-sales` và `backend/src/modules/checkout`:

1. **GET `/api/vendor/orders`:** Danh sách đơn hàng của Shop, hỗ trợ filter theo trạng thái.
2. **PUT `/api/vendor/orders/:id/status`:** 
   - Cập nhật trạng thái (`confirmed`, `shipped`, `delivered`, `cancelled`).
   - Nếu là `shipped`, yêu cầu `tracking_code`.
3. **Transaction Phê duyệt Trả hàng (PUT `/api/vendor/returns/:id/approve`):**
   - Phải sử dụng Database Transaction (BEGIN/COMMIT).
   - Cập nhật trạng thái `return_requests` thành `approved`.
   - Hoàn tiền: `UPDATE users SET wallet_balance = wallet_balance + refundAmount` (cho Buyer).
   - Lưu lịch sử: `INSERT INTO wallet_transactions`.
   - Hoàn tồn kho: `UPDATE products SET stock = stock + quantity`.
   - Xử lý Rollback nếu lỗi.
4. **PUT `/api/vendor/returns/:id/reject`:** Yêu cầu `reject_reason` (tối thiểu 20 ký tự).

## Kiểm tra
- Tạo script `scratch-test-return.js` test logic Transaction (giả lập lỗi ở bước hoàn tồn kho để xem tiền có bị hoàn lại không).
