# KẾ HOẠCH LÀM VIỆC - ĐỘI TEST (QA / QC)
**Module:** 2 — CHỨC NĂNG CUSTOMER (KHÁCH HÀNG)

---

## 1. API Testing (Postman / Automation)

### A. Race Condition & Concurrency (Quan trọng nhất)
- **Test Case:** Giả lập 10 request đồng thời (Dùng Postman Runner hoặc Script) mua 1 sản phẩm chỉ còn 1 tồn kho.
- **Kết quả kỳ vọng:** CHỈ 1 người mua thành công (Status 201), 9 người còn lại nhận lỗi `400 Out of stock`. Không được phép âm kho.

### B. Wallet & Transaction
- **Topup:** Test nạp tiền âm hoặc ký tự lạ (Expected 400).
- **Checkout:** Thanh toán khi số dư ví thiếu 1đ (Expected 400 + "Insufficient balance").
- **Refund:** Verify sau khi Admin/Vendor duyệt trả hàng, số tiền phải được cộng lại vào `users.wallet_balance` và ghi log `wallet_transactions` chính xác.

---

## 2. UI/UX Testing (Manual Test)

### A. Trải Nghiệm Sản Phẩm
- **Responsive:** Co giãn màn hình để kiểm tra Grid sản phẩm (Desktop: 4 cột, Mobile: 2 cột).
- **Gray-out:** Sửa `stock=0` trong DB của một sản phẩm đang có trong giỏ hàng. Kiểm tra xem Frontend có làm mờ (gray-out) và không cho chọn item đó không.
- **URL Params:** Chọn filter "Giá từ 100k-500k", copy URL sang tab ẩn danh. Verify danh sách hiển thị đúng filter đó.

### B. Quy Trình Trả Hàng (Return Policy)
- **Thời hạn 7 ngày:** Test đơn hàng đã giao quá 7 ngày -> Nút "Yêu cầu trả hàng" phải ẩn.
- **Số lượng tối đa:** Mua 3 cái, yêu cầu trả 4 cái -> Hệ thống phải báo lỗi.

---

## 3. Bảo Mật & Phân Quyền (Security)

| Chức năng | Phân quyền kỳ vọng |
|---|---|
| **Đánh giá** | Chỉ User đã mua SP (status=delivered) mới được gửi review. |
| **Q&A - Xóa câu hỏi** | Chỉ Người đặt câu hỏi hoặc Admin mới có quyền xóa. |
| **Q&A - Trả lời** | Chỉ Vendor đại diện cho sản phẩm đó mới được trả lời. |
| **Wallet History** | Không ai được xem lịch sử ví của người khác qua API. |

---

## 4. Quy Ước Lỗi (Error Codes)
Thống nhất các mã lỗi đặc thù:
- `ERR_OUT_OF_STOCK`: Hết hàng khi đang checkout.
- `ERR_PRICE_CHANGED`: Giá sản phẩm thay đổi quá lớn so với lúc bỏ vào giỏ.
- `ERR_TRANSACTION_FAILED`: Lỗi database rollback do tranh chấp tài nguyên.
