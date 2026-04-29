# PROMPT 02: KIỂM THỬ GIAO DỊCH VÍ VÀ THANH TOÁN

**Vai trò:** QA / QC Engineer
**Nhiệm vụ:** Xác minh tính chính xác của các luồng tiền trong hệ thống.

### Kịch bản kiểm thử:
1.  **Nạp tiền (Top-up):**
    *   Test case nạp số tiền âm (VD: -50,000) -> Kỳ vọng: Lỗi 400.
    *   Test case nạp số tiền hợp lệ -> Kỳ vọng: `wallet_balance` tăng đúng số lượng và có bản ghi trong `wallet_transactions`.
2.  **Thanh toán thiếu số dư (Insufficient Balance):**
    *   Dùng tài khoản có 100k mua món hàng 101k qua ví -> Kỳ vọng: Lỗi báo thiếu tiền, không tạo đơn hàng.
3.  **Hoàn tiền (Refund):**
    *   Thực hiện duyệt một yêu cầu trả hàng (`approved`) -> Kỳ vọng: Tiền tự động cộng lại vào ví buyer, tồn kho cộng lại vào product.

**Kết quả:** Log giao dịch phải khớp với số dư cuối cùng của người dùng.
