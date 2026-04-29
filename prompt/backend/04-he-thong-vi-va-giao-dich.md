# PROMPT 04: HỆ THỐNG VÍ ẢO & GIAO DỊCH (WALLET)

**Vai trò:** Back-end Developer
**Nhiệm vụ:** Xây dựng tính năng nạp tiền và theo dõi biến động số dư.

### Yêu cầu chi tiết:
1.  **API /api/wallet:**
    *   `GET /api/wallet/balance`: Trả về số dư hiện tại của user.
    *   `POST /api/wallet/topup`: API giả lập nạp tiền (User gửi lên số tiền muốn nạp). Cộng thẳng vào `users.wallet_balance`.
    *   `GET /api/wallet/history`: Lấy danh sách giao dịch từ bảng `wallet_transactions` (phân trang).

2.  **Logic Ghi Log Giao Dịch:**
    *   Mọi thay đổi số dư (Nạp tiền, Thanh toán, Hoàn tiền) đều phải được tạo 1 bản ghi trong `wallet_transactions` kèm theo giá trị `balance_after` để đối soát.

3.  **Validate:** Số tiền nạp phải là số dương (>0).

**Output mong đợi:** Module `wallet` hoạt động ổn định và ghi log giao dịch chính xác.
