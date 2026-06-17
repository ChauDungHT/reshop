# Hệ thống ReShop - Sơ đồ Trình tự Thanh toán trực tuyến & Ví điện tử (Sequence Diagram)

Tài liệu này mô tả chi tiết các luồng trình tự (Sequence Diagram) của **Hệ thống Thanh toán trực tuyến** và **Ví điện tử ảo** thuộc nền tảng ReShop, bao gồm cả luồng giao tiếp nội bộ và luồng tương tác với cổng thanh toán VNPAY.

---

## 1. Sơ đồ Trình tự Ví điện tử ảo (Nạp tiền & Trừ tiền)

Sơ đồ dưới đây thể hiện chi tiết cơ chế khóa dòng dữ liệu tài chính (`FOR UPDATE`), rẽ nhánh kiểm tra số dư (`ROLLBACK`/`COMMIT`) và đồng bộ thời gian thực qua `WebSocket`:

```mermaid
sequenceDiagram
    autonumber
    actor User as 👤 Khách hàng (Client UI)
    participant API as 💻 Hệ thống Backend (API Server)
    participant DB as 🗄️ Cơ sở dữ liệu (PostgreSQL)
    participant WS as 🔌 Máy chủ WebSocket (WS Server)

    %% Kịch bản 1: Nạp tiền (Credit)
    rect rgb(240, 248, 255)
        note right of User: KỊCH BẢN 1: NẠP TIỀN VÀO VÍ (CREDIT)
        User->>API: POST /api/wallet/topup { amount }
        activate API
        API->>DB: Kết nối & Thực thi BEGIN (Bắt đầu Transaction)
        activate DB
        
        %% Khóa dòng dữ liệu phòng ngừa tranh chấp đồng thời
        API->>DB: SELECT status, wallet_balance FROM users WHERE id = userId FOR UPDATE
        DB-->>API: Trả về thông tin số dư hiện tại (Đã khóa dòng)
        
        API->>DB: UPDATE users SET wallet_balance = wallet_balance + amount WHERE id = userId
        API->>DB: INSERT INTO wallet_transactions (type = 'deposit', balance_after)
        API->>DB: Thực thi COMMIT (Lưu thay đổi)
        DB-->>API: Xác nhận giao dịch thành công (Transaction Committed)
        deactivate DB
        
        API-->>User: Trả về kết quả thành công (200 OK & new_balance)
        
        %% Đẩy thông báo WebSocket cập nhật giao diện ngay lập tức
        API->>WS: Phát sự kiện 'balance_update' (userId, new_balance)
        activate WS
        WS-->>User: Đẩy tin nhắn WebSocket (Cập nhật số dư thời gian thực)
        deactivate WS
        deactivate API
    end

    %% Kịch bản 2: Trừ tiền thanh toán (Debit)
    rect rgb(255, 240, 245)
        note right of User: KỊCH BẢN 2: THANH TOÁN ĐƠN HÀNG QUA VÍ (DEBIT)
        User->>API: POST /api/checkout { payment_method: 'wallet', items }
        activate API
        API->>DB: Kết nối & Thực thi BEGIN (Bắt đầu Transaction)
        activate DB
        
        %% Khóa dữ liệu sản phẩm để cập nhật tồn kho trước
        API->>DB: SELECT stock FROM products WHERE id = productId FOR UPDATE
        DB-->>API: Trả về tồn kho hiện tại (Đã khóa dòng sản phẩm)
        
        alt Tồn kho không đủ (Out of Stock)
            API->>DB: Thực thi ROLLBACK (Hủy giao dịch)
            API-->>User: Phản hồi lỗi: Sản phẩm hết hàng (400 Bad Request)
        else Tồn kho hợp lệ
            API->>DB: UPDATE products SET stock = stock - quantity WHERE id = productId
            
            %% Khóa ví người dùng để trừ tiền thanh toán
            API->>DB: SELECT status, wallet_balance FROM users WHERE id = userId FOR UPDATE
            DB-->>API: Trả về trạng thái & số dư ví (Đã khóa dòng người dùng)
            
            alt Số dư không đủ (wallet_balance < grandTotal) hoặc Tài khoản bị khóa (status != 'active')
                API->>DB: Thực thi ROLLBACK (Hủy giao dịch tài chính)
                DB-->>API: Xác nhận Rollback hoàn tất
                API-->>User: Phản hồi lỗi: Số dư không đủ / Ví bị khóa (400/403 Error)
            else Số dư hợp lệ & Tài khoản hoạt động
                API->>DB: UPDATE users SET wallet_balance = wallet_balance - grandTotal WHERE id = userId
                API->>DB: INSERT INTO wallet_transactions (type = 'payment', ref_id = orderId, balance_after)
                API->>DB: INSERT INTO orders & sub_orders & order_items (price_snapshot)
                API->>DB: Thực thi COMMIT (Lưu thay đổi)
                DB-->>API: Xác nhận giao dịch thành công (Transaction Committed)
                deactivate DB
                
                API-->>User: Trả về kết quả Đặt hàng thành công (201 Created)
                
                %% Đẩy thông báo WebSocket cập nhật số dư giao diện tức thời
                API->>WS: Phát sự kiện 'balance_update' (userId, new_balance)
                activate WS
                WS-->>User: Đẩy tin nhắn WebSocket (Cập nhật số dư mới trên UI)
                deactivate WS
            end
        end
        deactivate API
    end
```

---

## 2. Sơ đồ Trình tự Thanh toán trực tuyến qua cổng VNPAY

Dưới đây là luồng xử lý giao dịch thanh toán trực tuyến qua cổng VNPAY, bao gồm cả hai nhánh: **Nạp tiền ví (WL-)** và **Thanh toán trực tiếp đơn hàng (ORD-)** thông qua kênh xử lý bất đồng bộ IPN (Server-to-Server) nhằm bảo vệ tính toàn vẹn dữ liệu:

```mermaid
sequenceDiagram
    autonumber
    actor User as 👤 Khách hàng (Client UI)
    participant API as 💻 Hệ thống Backend (API Server)
    participant VNPAY as 💳 Cổng thanh toán VNPAY
    participant DB as 🗄️ Cơ sở dữ liệu (PostgreSQL)

    %% 1. Khởi tạo thanh toán
    note over User, API: Giai đoạn 1: Khởi tạo thanh toán & Tạo liên kết (Redirect URL)
    User->>API: Gửi yêu cầu Checkout (vnpay) / Nạp tiền ví
    activate API
    API->>DB: Ghi nhận giao dịch nháp ở trạng thái 'pending'
    API->>API: Sinh mã giao dịch độc nhất & Tạo chữ ký số (Secure Hash)
    API-->>User: Trả về Payment URL (Đường dẫn thanh toán VNPAY)
    deactivate API
    
    User->>VNPAY: Chuyển hướng sang VNPAY & thực hiện thanh toán trực tuyến
    activate VNPAY
    VNPAY-->>User: Trả kết quả trực quan trên giao diện VNPAY
    deactivate VNPAY

    %% 2. Xử lý IPN Callback bất đồng bộ từ VNPAY
    note over VNPAY, API: Giai đoạn 2: Xác thực & Cập nhật trạng thái bất đồng bộ (IPN Callback)
    VNPAY->>API: GET /api/payment/vnpay-ipn (Query params)
    activate API
    API->>API: Kiểm tra và xác minh chữ ký bảo mật (Verify Signature)
    
    alt Chữ ký số không hợp lệ
        API-->>VNPAY: Phản hồi lỗi chữ ký { RspCode: '97', Message: 'Invalid signature' }
    else Chữ ký số hợp lệ
        API->>DB: Kết nối & Thực thi BEGIN (Bắt đầu Transaction)
        activate DB
        
        alt Trường hợp A: Nạp tiền ví (Mã giao dịch bắt đầu bằng 'WL-')
            API->>DB: SELECT * FROM vnpay_transactions WHERE txn_ref = orderCode FOR UPDATE
            DB-->>API: Trả về giao dịch nạp tiền (Đã khóa dòng)
            
            alt Giao dịch đã xử lý trước đó (response_code != null)
                API->>DB: COMMIT (Không làm gì thêm)
                API-->>VNPAY: Phản hồi { RspCode: '02', Message: 'Transaction already confirmed' }
            else Giao dịch chưa được xử lý
                alt Thanh toán VNPAY thành công (vnp_ResponseCode == '00')
                    API->>DB: UPDATE users SET wallet_balance = wallet_balance + vnpayTotal WHERE id = userId
                    API->>DB: INSERT INTO wallet_transactions (type = 'deposit', balance_after)
                    API->>DB: UPDATE vnpay_transactions SET response_code = '00', status = 'success'
                    API->>DB: COMMIT
                    API-->>VNPAY: Phản hồi thành công { RspCode: '00', Message: 'Confirm Success' }
                else Thanh toán VNPAY thất bại
                    API->>DB: UPDATE vnpay_transactions SET response_code = vnp_ResponseCode, status = 'failed'
                    API->>DB: COMMIT
                    API-->>VNPAY: Phản hồi thành công { RspCode: '00', Message: 'Confirm Success' }
                end
            end

        else Trường hợp B: Thanh toán đơn hàng trực tiếp (Mã giao dịch bắt đầu bằng 'ORD-')
            API->>DB: SELECT * FROM orders WHERE order_code = orderCode FOR UPDATE
            DB-->>API: Trả về đơn hàng khớp mã (Đã khóa dòng đơn hàng)
            
            alt Sai lệch số tiền thanh toán (amountMismatch)
                API->>DB: ROLLBACK
                API-->>VNPAY: Phản hồi lỗi { RspCode: '04', Message: 'Invalid amount' }
            else Đơn hàng đã được thanh toán trước đó (payment_status == 'paid')
                API->>DB: COMMIT
                API-->>VNPAY: Phản hồi { RspCode: '02', Message: 'Order already confirmed' }
            else Đơn hàng chưa xử lý
                alt Thanh toán VNPAY thành công (vnp_ResponseCode == '00')
                    API->>DB: UPDATE orders SET payment_status = 'paid', status = 'confirmed', vnpay_transaction_no = ... WHERE id = orderId
                    API->>DB: UPDATE sub_orders SET status = 'confirmed' WHERE order_id = orderId
                    API->>DB: INSERT INTO vnpay_transactions (command = 'pay', response_code = '00')
                    API->>DB: COMMIT
                    API-->>VNPAY: Phản hồi thành công { RspCode: '00', Message: 'Confirm Success' }
                else Thanh toán VNPAY thất bại / Người dùng hủy
                    API->>DB: UPDATE orders SET payment_status = 'failed', status = 'cancelled' WHERE id = orderId
                    API->>DB: UPDATE sub_orders SET status = 'cancelled' WHERE order_id = orderId
                    
                    %% Hoàn trả lại số lượng tồn kho sản phẩm về cửa hàng
                    API->>DB: SELECT product_id, quantity FROM order_items WHERE order_id = orderId
                    DB-->>API: Danh sách sản phẩm & số lượng đặt mua
                    API->>DB: UPDATE products SET stock = stock + quantity WHERE id = productId (Hoàn kho)
                    
                    API->>DB: INSERT INTO vnpay_transactions (command = 'pay', response_code = vnp_ResponseCode)
                    API->>DB: COMMIT
                    API-->>VNPAY: Phản hồi thành công { RspCode: '00', Message: 'Confirm Success' }
                end
            end
        end
        deactivate DB
    end
    deactivate API
```

---

## 3. Các Logic Ràng buộc Kỹ thuật của Thanh toán VNPAY

### 3.1 Tránh xử lý trùng lặp (Idempotency)
Hệ thống sử dụng cơ chế kiểm tra trạng thái trước khi xử lý:
* Đối với Ví: Kiểm tra `vnpay_transactions.response_code IS NOT NULL`.
* Đối với Đơn hàng: Kiểm tra `orders.payment_status = 'paid'`.
> [!IMPORTANT]
> Cơ chế kiểm tra này kết hợp với khóa dòng `FOR UPDATE` giúp loại bỏ hoàn toàn rủi ro cộng tiền/xác nhận đơn hàng hai lần khi cổng thanh toán VNPAY gửi nhiều thông báo IPN trùng lặp cho cùng một giao dịch.

### 3.2 Khôi phục tồn kho khi giao dịch thất bại
* Khác với hình thức thanh toán COD (nhận hàng trả tiền) hoặc ví điện tử (trừ tiền tức thì), thanh toán qua cổng ngoài (VNPAY) có độ trễ lớn và rủi ro người dùng huỷ thanh toán tại trang cổng.
* Do đó, khi tạo đơn hàng, hệ thống đã trừ tồn kho tạm thời. Nếu nhận được IPN báo lỗi hoặc huỷ giao dịch, hệ thống sẽ thực hiện truy vấn các `order_items` tương ứng và thực hiện **hoàn trả tồn kho** (`stock = stock + quantity`) để đảm bảo không bị thất thoát số lượng sản phẩm bán thực tế của các shop.
