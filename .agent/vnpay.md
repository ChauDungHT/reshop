---
name: vnpay-integration
description: >
  Sử dụng skill này khi cần tích hợp cổng thanh toán VNPAY vào dự án ReShop.
  Covers: khởi tạo yêu cầu thanh toán, xử lý IPN callback, truy vấn giao dịch (querydr),
  hoàn trả đơn lẻ (refund), tạo checksum HMACSHA512, và xử lý mã lỗi.
  Bao gồm thông tin cấu hình Sandbox và luồng tích hợp đầy đủ cho môi trường
  Express/PostgreSQL + Node.js/TypeScript của ReShop.
environment: sandbox
api_version: "2.1.0"
---

# VNPAY Integration Skill for ReShop

## Thông tin cấu hình Sandbox

```
vnp_TmnCode    : NKKFNQR2
vnp_HashSecret : BSTSEN2NTVPOVL0FWO50DO14U61S46SD
vnp_Url        : https://sandbox.vnpayment.vn/paymentv2/vpcpay.html
Merchant Admin : https://sandbox.vnpayment.vn/merchantv2/
SIT Testing    : https://sandbox.vnpayment.vn/vnpaygw-sit-testing/user/login
Login          : 993rikyl@gmail.com
```

Thẻ test NCB:
```
Số thẻ  : 9704198526191432198
Tên     : NGUYEN VAN A
Ngày PH : 07/15
OTP     : 123456
```

> **QUAN TRỌNG**: Đây là thông tin Sandbox — KHÔNG dùng cho thanh toán thật.

---

## Luồng tích hợp tổng quan (5 bước)

```
[Khách hàng] → [ReShop Backend] → [VNPAY] → [Ngân hàng]
     1. Chọn thanh toán VNPAY lúc checkout
     2. Backend tạo URL thanh toán + redirect
     3. Khách nhập thông tin thẻ & OTP tại VNPAY sandbox
     4. VNPAY gửi IPN (server-to-server) → Backend cập nhật DB
     5. VNPAY redirect khách về ReturnUrl → Frontend hiển thị kết quả
```

---

## HƯỚNG DẪN THỰC THI THEO PHẦN (1 PROMPT CHO MỖI PHASE)

Dưới đây là 6 prompt tự động hóa toàn bộ quá trình tích hợp. Bạn có thể copy từng prompt và gửi trực tiếp cho AI agent để thực thi theo từng phase.

---

### PROMPT PHASE 1: Cấu hình Môi trường, Database Migration & VNPAY Utilities

```markdown
Hãy cấu hình cơ sở dữ liệu và viết các hàm tiện ích ký/xác minh chữ ký VNPAY cho dự án ReShop.

**Bối cảnh dự án**:
- Backend sử dụng Node.js (TypeScript) + Express.
- Hệ quản trị cơ sở dữ liệu: PostgreSQL (sử dụng thư viện `pg` kết nối tại `backend/src/core/db.ts`).
- Cấu hình dự án nằm ở `backend/src/core/config.ts`.
- Sử dụng Module `crypto` có sẵn trong Node.js để ký HMAC-SHA512. Để tránh lỗi biên dịch, không import các thư viện ngoài như `dayjs` hay `qs` trừ khi đã khai báo trong dependencies (chúng ta sẽ dùng các hàm Date thuần của JS và URLSearchParams để tạo query string).

**Yêu cầu chi tiết**:

1. **DB Migration**:
   - Sửa file `backend/database/schema.sql`: Thêm các cột VNPAY vào bảng `orders` hiện tại:
     - `payment_method` VARCHAR(20) DEFAULT 'cod' (đã có sẵn trong một số phiên bản, sử dụng ALTER TABLE IF NOT EXISTS)
     - `payment_status` VARCHAR(20) DEFAULT 'pending' (các giá trị: 'pending', 'paid', 'failed', 'refunding', 'refunded')
     - `vnpay_transaction_no` VARCHAR(15)
     - `vnpay_bank_code` VARCHAR(20)
     - `vnpay_card_type` VARCHAR(20)
     - `vnpay_pay_date` TIMESTAMP WITH TIME ZONE
   - Thêm bảng lưu log giao dịch `vnpay_transactions` vào `schema.sql`:
     ```sql
     CREATE TABLE IF NOT EXISTS vnpay_transactions (
       id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
       order_id           UUID REFERENCES orders(id) ON DELETE SET NULL,
       txn_ref            VARCHAR(100) NOT NULL, -- maps to orders.order_code
       transaction_no     VARCHAR(15),           -- vnp_TransactionNo từ VNPAY
       command            VARCHAR(16) NOT NULL,  -- pay | querydr | refund
       amount             DECIMAL(15, 2) NOT NULL,
       response_code      VARCHAR(2),
       transaction_status VARCHAR(2),
       bank_code          VARCHAR(20),
       card_type          VARCHAR(20),
       raw_request        JSONB,
       raw_response       JSONB,
       created_at         TIMESTAMP WITH TIME ZONE DEFAULT NOW()
     );
     CREATE INDEX IF NOT EXISTS idx_vnpay_transactions_txn_ref ON vnpay_transactions(txn_ref);
     CREATE INDEX IF NOT EXISTS idx_vnpay_transactions_order_id ON vnpay_transactions(order_id);
     ```
   - Tạo file migration mới `backend/database/migrations/005_add_vnpay.sql` chứa các câu lệnh ALTER TABLE và CREATE TABLE ở trên để có thể chạy cập nhật thủ công nếu cần.

2. **Cấu hình môi trường**:
   - Thêm cấu hình sau vào cả `.env` và `.env.example` ở thư mục gốc:
     ```env
     # VNPAY Sandbox Configuration
     VNP_TMN_CODE=NKKFNQR2
     VNP_HASH_SECRET=BSTSEN2NTVPOVL0FWO50DO14U61S46SD
     VNP_URL=https://sandbox.vnpayment.vn/paymentv2/vpcpay.html
     VNP_RETURN_URL=http://localhost:5173/payment/return
     VNP_API_URL=https://merchant.vnpay.vn/merchant_webapi/api/transaction
     ```
   - Cập nhật `backend/src/core/config.ts` để đọc các biến này, cung cấp giá trị mặc định sandbox ở trên để hệ thống hoạt động ngay cả khi chưa có file `.env`:
     ```typescript
     vnpTmnCode: process.env.VNP_TMN_CODE || 'NKKFNQR2',
     vnpHashSecret: process.env.VNP_HASH_SECRET || 'BSTSEN2NTVPOVL0FWO50DO14U61S46SD',
     vnpUrl: process.env.VNP_URL || 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html',
     vnpReturnUrl: process.env.VNP_RETURN_URL || 'http://localhost:5173/payment/return',
     vnpApiUrl: process.env.VNP_API_URL || 'https://merchant.vnpay.vn/merchant_webapi/api/transaction',
     ```

3. **Viết VNPAY Utilities**:
   - Tạo file `backend/src/modules/payment/vnpay.utils.ts` và định nghĩa các hàm:
     - `generatePaymentUrl(options: { orderCode: string; amount: number; ipAddr: string; orderInfo: string }): string`:
       - Tạo các tham số: `vnp_Version` ('2.1.0'), `vnp_Command` ('pay'), `vnp_TmnCode`, `vnp_Locale` ('vn'), `vnp_CurrCode` ('VND'), `vnp_TxnRef` (orderCode), `vnp_OrderInfo` (orderInfo), `vnp_OrderType` ('other'), `vnp_Amount` (amount * 100), `vnp_ReturnUrl`, `vnp_IpAddr`, `vnp_CreateDate` (định dạng YYYYMMDDHHmmss theo múi giờ GMT+7), `vnp_ExpireDate` (+15 phút từ vnp_CreateDate).
       - Sắp xếp các tham số theo thứ tự bảng chữ cái của key.
       - Tạo chuỗi query string sử dụng `URLSearchParams`.
       - Tính secure hash bằng HMAC-SHA512 với `vnpHashSecret` trên chuỗi query string gốc.
       - Trả về URL hoàn chỉnh: `${vnpUrl}?${queryString}&vnp_SecureHash=${secureHash}`.
     - `verifyPaymentSignature(queryParams: Record<string, string>): boolean`:
       - Tách `vnp_SecureHash` ra khỏi query parameters nhận về từ VNPAY.
       - Sắp xếp các tham số còn lại theo bảng chữ cái.
       - Ký chuỗi query parameters và so sánh (không phân biệt hoa thường) với `vnp_SecureHash`. Trả về `true` nếu khớp, ngược lại `false`.

**Kiểm tra**:
- Chạy `npm run db:migrate` trong thư mục `backend` để áp dụng cấu hình DB mới.
- Chạy `npm run test:tsc` hoặc `npm run build` để đảm bảo code TypeScript biên dịch thành công.
```

---

### PROMPT PHASE 2: Tích hợp VNPAY vào Checkout Flow ở Backend

```markdown
Hãy tích hợp phương thức thanh toán VNPAY vào quy trình Checkout tại backend của dự án ReShop.

**Bối cảnh dự án**:
- API Checkout hiện tại nằm ở `backend/src/modules/checkout/checkout.controller.ts` thông qua hàm `processCheckout`.
- Checkout hiện hỗ trợ `payment_method = 'wallet'` (trừ tiền trực tiếp vào ví) hoặc `'cod'`.
- Khi thanh toán bằng VNPAY, chúng ta sẽ tạo đơn hàng có trạng thái ban đầu là `'pending'`, lưu `payment_method = 'vnpay'` và `payment_status = 'pending'`. Sau đó, chúng ta sẽ tạo URL thanh toán VNPAY và trả về cho client để client tự chuyển hướng.

**Yêu cầu chi tiết**:
1. Cập nhật `backend/src/modules/checkout/checkout.controller.ts`:
   - Import `generatePaymentUrl` từ `../payment/vnpay.utils` và `config` từ `../../core/config`.
   - Trong hàm `processCheckout`, khi kiểm tra `payment_method` trong `req.body`:
     - Cho phép nhận giá trị `'vnpay'` bên cạnh `'cod'` và `'wallet'`.
     - Nếu `payment_method === 'vnpay'`:
       - Lấy IP của client từ `req.headers['x-forwarded-for']` hoặc `req.socket.remoteAddress` (mặc định `'127.0.0.1'`).
       - Gọi hàm `generatePaymentUrl` với:
         - `orderCode`: chính là mã `orderCode` của đơn hàng vừa sinh ra (ví dụ: `ORD-XXXXXXXX`).
         - `amount`: tổng số tiền thanh toán `grandTotal`.
         - `ipAddr`: IP của client vừa lấy ở trên.
         - `orderInfo`: `'Thanh toan don hang ' + orderCode`.
       - Không thực hiện trừ ví `wallet_balance` và không tạo bản ghi giao dịch ví cho người mua lúc này.
     - Trong câu lệnh SQL lưu đơn hàng `orders`: cập nhật để lưu cột `payment_method` là `'vnpay'` và `payment_status` là `'pending'`.
     - Trong response trả về thành công (HTTP status 201), nếu phương thức thanh toán là VNPAY, thêm trường `vnpayUrl` vào đối tượng `data`:
       ```json
       {
         "success": true,
         "message": "Order placed successfully",
         "data": {
           "order_id": "...",
           "order_code": "...",
           "total_amount": 120000,
           "vnpayUrl": "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html?..."
         }
       }
       ```

**Kiểm tra**:
- Đảm bảo build backend thành công.
- Gọi thử API `POST /api/checkout` bằng Postman/cURL với `payment_method: 'vnpay'` và kiểm tra response trả về có chứa trường `vnpayUrl` hợp lệ.
```

---

### PROMPT PHASE 3: Tạo Payment Controller & Các Endpoint Callback VNPAY

```markdown
Hãy xây dựng module Payment ở backend để xử lý IPN Callback và Return URL từ VNPAY.

**Bối cảnh dự án**:
- Chúng ta cần 2 endpoint:
  1. `/api/payment/vnpay-ipn` (GET): Nhận kết quả thanh toán bất đồng bộ từ VNPAY (server-to-server). Đây là luồng chính để cập nhật DB một cách an toàn.
  2. `/api/payment/verify-return` (GET): Nhận các tham số redirect từ VNPAY ở frontend gửi lên để xác minh tính toàn vẹn và trả kết quả cho frontend hiển thị giao diện.
- Module database được import thông qua `import db from '../../core/db'`.

**Yêu cầu chi tiết**:

1. **Tạo Controller `backend/src/modules/payment/payment.controller.ts`**:
   - Hàm `handleVNPAYIPN(req: Request, res: Response)`:
     - Log toàn bộ query params nhận từ VNPAY.
     - Xác minh chữ ký `vnp_SecureHash` bằng hàm `verifyPaymentSignature`. Nếu không khớp chữ ký, trả về JSON phản hồi cho VNPAY với HTTP 200: `{ "RspCode": "97", "Message": "Invalid signature" }`.
     - Trích xuất các trường: `vnp_TxnRef` (mã đơn hàng), `vnp_Amount` (chia 100 để lấy số tiền thực tế), `vnp_ResponseCode`, `vnp_TransactionNo`, `vnp_BankCode`, `vnp_CardType`, `vnp_PayDate`, `vnp_TransactionStatus`.
     - Bắt đầu một transaction database thông qua `await db.pool.connect()`:
       - Tìm đơn hàng: `SELECT * FROM orders WHERE order_code = $1 FOR UPDATE`.
         - Nếu không tồn tại: trả về `{ "RspCode": "01", "Message": "Order not found" }`.
       - Kiểm tra số tiền đơn hàng: So sánh `total_amount` của đơn hàng với số tiền thực tế nhận từ VNPAY. Nếu lệch, trả về `{ "RspCode": "04", "Message": "Invalid amount" }`.
       - Kiểm tra đơn hàng đã xử lý chưa: Nếu đơn hàng có `payment_status === 'paid'`, trả về `{ "RspCode": "02", "Message": "Order already confirmed" }`.
       - Nếu `vnp_ResponseCode === '00'` và `vnp_TransactionStatus === '00'` (Thanh toán thành công):
         - Cập nhật đơn hàng:
           ```sql
           UPDATE orders
           SET payment_status = 'paid',
               vnpay_transaction_no = $1,
               vnpay_bank_code = $2,
               vnpay_card_type = $3,
               vnpay_pay_date = TO_TIMESTAMP($4, 'YYYYMMDDHHMISS'),
               updated_at = NOW()
           WHERE order_code = $5;
           ```
         - Cập nhật trạng thái của tất cả `sub_orders` thuộc đơn hàng này thành `'confirmed'` (hoặc giữ nguyên `'pending'` tùy theo luồng nhưng cần đồng bộ). Hãy cập nhật các đơn con sang `'confirmed'` để các shop biết đơn đã thanh toán:
           ```sql
           UPDATE sub_orders SET status = 'confirmed', updated_at = NOW() WHERE order_id = $1;
           ```
         - Log giao dịch: Thêm một bản ghi vào bảng `vnpay_transactions` với `command = 'pay'`, `amount`, `response_code = '00'`, `transaction_status = '00'`, `bank_code`, `card_type`, và raw query.
         - Trả về phản hồi thành công cho VNPAY: `{ "RspCode": "00", "Message": "Confirm Success" }`.
       - Ngược lại (Giao dịch thất bại / khách hủy):
         - Cập nhật đơn hàng: `UPDATE orders SET payment_status = 'failed', status = 'cancelled', updated_at = NOW() WHERE order_code = $1`.
         - Cập nhật các đơn hàng con: `UPDATE sub_orders SET status = 'cancelled', updated_at = NOW() WHERE order_id = $1`.
         - Hoàn trả lại tồn kho sản phẩm: Với mỗi dòng trong `order_items` của đơn hàng này, thực hiện cộng lại tồn kho: `UPDATE products SET stock = stock + $1 WHERE id = $2`.
         - Log giao dịch thất bại vào `vnpay_transactions`.
         - Trả về `{ "RspCode": "00", "Message": "Confirm Success" }`. (Lưu ý: Luôn trả về RspCode 00 cho VNPAY để xác nhận server đã xử lý IPN thành công).
   - Hàm `verifyPaymentReturn(req: Request, res: Response)`:
     - Xác minh chữ ký query params từ VNPAY. Nếu sai, trả về HTTP 400 `{ "success": false, "message": "Chữ ký không hợp lệ" }`.
     - Nếu đúng chữ ký, kiểm tra mã lỗi `vnp_ResponseCode`:
       - Nếu `'00'`: Trả về `{ "success": true, "message": "Thanh toán thành công", "data": { "orderCode": vnp_TxnRef } }`.
       - Nếu khác `'00'`: Trả về `{ "success": false, "message": "Thanh toán không thành công", "code": vnp_ResponseCode }`.

2. **Tạo Router `backend/src/modules/payment/payment.route.ts`**:
   - Khai báo các endpoint công khai (không cần đi qua authMiddleware vì VNPAY gọi server-to-server):
     - `GET /vnpay-ipn` -> `handleVNPAYIPN`
     - `GET /verify-return` -> `verifyPaymentReturn`
   - Export router.

3. **Đăng ký Router**:
   - Sửa file `backend/src/server.ts` để đăng ký router mới:
     ```typescript
     import paymentRoutes from './modules/payment/payment.route';
     // ...
     app.use('/api/payment', paymentRoutes);
     ```

**Kiểm tra**:
- Đảm bảo backend chạy và build ổn định.
```

---

### PROMPT PHASE 4: Tích hợp Frontend Checkout & Tạo Trang Payment Return

```markdown
Hãy tích hợp phương thức thanh toán VNPAY vào giao diện Checkout của Storefront và tạo trang nhận kết quả thanh toán.

**Bối cảnh dự án**:
- Giao diện checkout nằm ở `frontend/storefront/src/pages/shop/CheckoutPage.tsx`.
- Router ứng dụng được định nghĩa tại `frontend/storefront/src/App.tsx`.
- Giao diện storefront sử dụng TailwindCSS, thiết kế tối giản, tông tối (dark theme).

**Yêu cầu chi tiết**:

1. **Cập nhật `CheckoutPage.tsx`**:
   - Thêm lựa chọn thanh toán "VNPAY" tại Step 3 (Phương thức thanh toán):
     ```tsx
     <label className={`flex items-center justify-between p-6 rounded-3xl border cursor-pointer transition ${
       paymentMethod === 'vnpay' ? 'bg-indigo-600/10 border-indigo-500' : 'bg-slate-950 border-white/5'
     }`}>
       <div className="flex items-center gap-4">
         <input type="radio" name="pay" checked={paymentMethod === 'vnpay'} onChange={() => setPaymentMethod('vnpay')} className="hidden" />
         <span className="text-2xl">💳</span>
         <div>
           <p className="font-bold text-white">Thanh toán qua cổng VNPAY</p>
           <p className="text-xs text-slate-500">Hỗ trợ thẻ ATM nội địa, QR Code, ví điện tử hoặc thẻ quốc tế Visa/MasterCard</p>
         </div>
       </div>
     </label>
     ```
   - Trong hàm xử lý thanh toán `handlePlaceOrder`:
     - Nếu `paymentMethod === 'vnpay'`: Sau khi gọi API `/checkout` thành công và nhận về phản hồi chứa `vnpayUrl`, hãy thực hiện xóa giỏ hàng `clearCart()` và chuyển hướng trình duyệt của khách hàng đến địa chỉ `res.data.data.vnpayUrl` bằng `window.location.href = res.data.data.vnpayUrl`.

2. **Tạo trang nhận kết quả `frontend/storefront/src/pages/shop/PaymentReturnPage.tsx`**:
   - Trang này sẽ hứng các tham số query do VNPAY redirect về trình duyệt (ví dụ: `?vnp_Amount=...&vnp_ResponseCode=...`).
   - Sử dụng `useSearchParams` từ `react-router-dom` để lấy toàn bộ query params.
   - Khi component mount, gửi request đến backend: `GET /api/payment/verify-return?` kèm theo toàn bộ query parameters nhận được.
   - Hiển thị trạng thái kiểm tra (Loading...) với icon chuyển động mượt mà.
   - **Nếu kết quả trả về là Thành công**:
     - Hiển thị màn hình chúc mừng tuyệt đẹp với các thông tin: Mã đơn hàng, Số tiền, Trạng thái (Thành công).
     - Hiển thị nút "Xem đơn hàng của tôi" chuyển hướng tới `/dashboard` và nút "Tiếp tục mua sắm" chuyển hướng tới trang chủ `/`.
   - **Nếu kết quả thất bại (ví dụ khách hàng hủy thanh toán mã lỗi 24, hoặc lỗi ngân hàng)**:
     - Hiển thị màn hình thông báo lỗi với mô tả chi tiết tương ứng với mã lỗi (VD: Mã lỗi 24 - Bạn đã hủy giao dịch; Mã lỗi 51 - Số dư tài khoản không đủ...).
     - Hiển thị nút "Thử lại thanh toán" đưa khách về trang `/checkout` và nút "Quay về trang chủ".

3. **Cấu hình Router ở `App.tsx`**:
   - Import `PaymentReturnPage` từ `./pages/shop/PaymentReturnPage`.
   - Khai báo route `/payment/return` nằm trong cấu trúc layout của `StorefrontLayout` (để thừa hưởng header/footer):
     ```tsx
     <Route path="/payment/return" element={<PaymentReturnPage />} />
     ```

**Kiểm tra**:
- Đảm bảo dự án frontend compile bình thường.
- Chạy thử luồng checkout, chọn VNPAY, nhập thẻ NCB test (NCB, 9704198526191432198, NGUYEN VAN A, 07/15, OTP 123456) và kiểm tra màn hình kết quả sau khi được redirect quay lại ứng dụng.
```

---

### PROMPT PHASE 5: Tích hợp Cron Job Tự động Đối soát (querydr)

```markdown
Hãy xây dựng tiến trình chạy ngầm (cron job) tự động kiểm tra trạng thái các đơn hàng thanh toán VNPAY chưa hoàn tất.

**Bối cảnh dự án**:
- Đôi khi kết nối IPN từ VNPAY sang server của chúng ta bị gián đoạn, khiến đơn hàng ở trạng thái `payment_status = 'pending'` vô thời hạn.
- Dự án sử dụng `node-cron` để quản lý các cron job tại `backend/src/core/cron.ts`.

**Yêu cầu chi tiết**:

1. **Xây dựng hàm truy vấn trạng thái ở `backend/src/modules/payment/vnpay.utils.ts`**:
   - Hàm `queryTransactionStatus(options: { orderCode: string; createDate: string; ipAddr: string }): Promise<any>`:
     - Tạo JSON payload cho API `querydr` của VNPAY (Version 2.1.0).
     - Định dạng chữ ký bảo mật `vnp_SecureHash` của API querydr bằng cách nối chuỗi phân tách bởi dấu gạch đứng `|`:
       `vnp_RequestId|vnp_Version|vnp_Command|vnp_TmnCode|vnp_TxnRef|vnp_TransactionDate|vnp_CreateDate|vnp_IpAddr|vnp_OrderInfo`
     - Sử dụng HMAC-SHA512 để ký và gửi HTTP POST request dạng JSON lên cổng `config.vnpApiUrl`.
     - Trả về dữ liệu kết quả phân tích được từ VNPAY.

2. **Tạo tiến trình đối soát tự động ở `backend/src/core/cron.ts`**:
   - Hàm `reconcileVNPAYOrders()`:
     - Truy vấn tất cả đơn hàng có: `payment_method = 'vnpay' AND payment_status = 'pending' AND created_at BETWEEN NOW() - INTERVAL '2 days' AND NOW() - INTERVAL '15 minutes'`.
     - Với mỗi đơn hàng tìm thấy:
       - Thực hiện gọi hàm `queryTransactionStatus` để truy vấn trạng thái thực tế từ hệ thống VNPAY.
       - Nếu VNPAY xác nhận giao dịch thành công (ResponseCode == '00' và TransactionStatus == '00'):
         - Thực hiện cập nhật đơn hàng thành `payment_status = 'paid'`, cập nhật trạng thái các đơn con `sub_orders` thành `'confirmed'`, và ghi log giao dịch thành công vào bảng `vnpay_transactions`.
       - Nếu VNPAY xác nhận giao dịch thất bại hoặc không tồn tại giao dịch:
         - Cập nhật đơn hàng thành `payment_status = 'failed'` và `status = 'cancelled'`.
         - Cập nhật trạng thái các đơn con `sub_orders` thành `'cancelled'`.
         - Hoàn trả lại tồn kho của các sản phẩm thuộc đơn hàng này.
         - Ghi log giao dịch thất bại vào bảng `vnpay_transactions`.
   - Trong hàm `initCronJobs()`:
     - Đăng ký lịch chạy cho `reconcileVNPAYOrders` cứ mỗi 30 phút một lần:
       ```typescript
       cron.schedule('*/30 * * * *', async () => {
         console.log('[cron]: Running VNPAY order reconciliation...');
         try {
           await reconcileVNPAYOrders();
         } catch (e) {
           console.error('[cron]: VNPAY reconciliation failed:', e);
         }
       });
       ```

**Kiểm tra**:
- Biên dịch lại backend và khởi động server. Theo dõi log xem tác vụ cron có được khởi tạo thành công không.
```

---

### PROMPT PHASE 6: Tích hợp Hoàn tiền VNPAY Tự động (refund) khi Hủy đơn hoặc Duyệt Trả hàng

```markdown
Hãy tích hợp tính năng hoàn tiền tự động qua cổng VNPAY khi đơn hàng thanh toán qua VNPAY bị hủy hoặc khi người bán (Vendor) duyệt yêu cầu trả hàng/hoàn tiền.

**Bối cảnh dự án**:
- Khi đơn hàng bị hủy bởi người mua, logic nằm trong `backend/src/modules/checkout/checkout.controller.ts` (các hàm `cancelOrder` và `cancelSubOrder`).
- Khi yêu cầu trả hàng được duyệt bởi người bán, logic nằm ở `backend/src/modules/vendor/vendor.controller.ts` (hàm `approveReturnByVendor`).
- Hiện tại, hệ thống mặc định hoàn tiền về ví ReShop (`wallet_balance`). Với các đơn hàng thanh toán qua VNPAY, chúng ta phải gọi API hoàn tiền (`refund`) của VNPAY thay vì/cộng thêm việc cập nhật ví.

**Yêu cầu chi tiết**:

1. **Xây dựng hàm hoàn tiền ở `backend/src/modules/payment/vnpay.utils.ts`**:
   - Hàm `refundTransaction(options: { orderCode: string; amount: number; transactionNo: string; transactionDate: string; createBy: string; ipAddr: string }): Promise<any>`:
     - Tạo payload gửi lên API hoàn tiền của VNPAY (phiên bản 2.1.0, command `refund`).
     - `vnp_TransactionType` sử dụng `'02'` (hoàn trả toàn phần) hoặc `'03'` (hoàn trả một phần).
     - Định dạng chữ ký bảo mật `vnp_SecureHash` cho API hoàn tiền bằng cách ghép chuỗi phân tách bởi dấu gạch đứng `|`:
       `vnp_RequestId|vnp_Version|vnp_Command|vnp_TmnCode|vnp_TransactionType|vnp_TxnRef|vnp_Amount|vnp_TransactionNo|vnp_TransactionDate|vnp_CreateBy|vnp_CreateDate|vnp_IpAddr|vnp_OrderInfo`
     - Sử dụng HMAC-SHA512 để ký và gửi HTTP POST request dạng JSON lên `config.vnpApiUrl`.
     - Trả về dữ liệu kết quả từ VNPAY.

2. **Cập nhật Logic Hủy đơn hàng ở `backend/src/modules/checkout/checkout.controller.ts`**:
   - Trong các hàm `cancelOrder` và `cancelSubOrder`:
     - Kiểm tra nếu đơn hàng có `payment_method === 'vnpay'` và `payment_status === 'paid'`:
       - Lấy thông tin giao dịch VNPAY từ cơ sở dữ liệu (`vnpay_transaction_no` và `vnpay_pay_date`).
       - Gọi hàm `refundTransaction` với số tiền cần hoàn (hoàn toàn phần đối với `cancelOrder`, hoặc hoàn một phần tương ứng với giá trị đơn con đối với `cancelSubOrder`).
       - Nếu VNPAY phản hồi thành công (ResponseCode == '00'):
         - Cập nhật đơn hàng/đơn hàng con thành trạng thái `'cancelled'`, ghi nhận số tiền đã hoàn vào cột `refunded_amount` của bảng `orders`/`sub_orders`.
         - Cập nhật `payment_status = 'refunded'` (nếu đã hoàn hết tổng giá trị đơn hàng).
         - Ghi log giao dịch hoàn tiền vào `vnpay_transactions` với `command = 'refund'`.
         - **Không** thực hiện cộng tiền vào ví người dùng (`wallet_balance`) để tránh hoàn tiền kép.

3. **Cập nhật Logic Duyệt Trả hàng ở `backend/src/modules/vendor/vendor.controller.ts`**:
   - Trong hàm `approveReturnByVendor`:
     - Kiểm tra xem đơn hàng gốc có phải thanh toán bằng VNPAY (`payment_method === 'vnpay'`) hay không.
     - Nếu có:
       - Thực hiện gọi hàm `refundTransaction` để yêu cầu VNPAY hoàn tiền đơn hàng tương ứng với giá trị của sản phẩm được duyệt trả lại.
       - Nếu hoàn tiền thành công, cập nhật trạng thái yêu cầu trả hàng thành `'approved'`, cộng dồn số tiền đã hoàn vào `refunded_amount` của đơn hàng con và đơn hàng cha, đồng thời ghi log vào `vnpay_transactions`.
       - **Không** cộng tiền vào ví người dùng `wallet_balance`.

**Kiểm tra**:
- Đảm bảo backend build thành công không lỗi cú pháp/kiểu dữ liệu.
```

---

## Bảng mã lỗi quan trọng

### vnp_ResponseCode (VNPAY → Merchant)

| Mã | Ý nghĩa |
|---|---|
| `00` | **Thành công** |
| `07` | Trừ tiền OK nhưng giao dịch bị nghi ngờ gian lận — cần xác nhận tại Merchant Admin |
| `09` | Tài khoản chưa đăng ký InternetBanking |
| `10` | Xác thực thông tin sai quá 3 lần |
| `11` | Hết hạn thanh toán |
| `12` | Thẻ/tài khoản bị khóa |
| `24` | Khách hàng hủy giao dịch |
| `51` | Không đủ số dư |
| `65` | Vượt hạn mức giao dịch ngày |
| `75` | Ngân hàng đang bảo trì |
| `97` | Sai checksum chữ ký |
| `99` | Lỗi khác |

### vnp_TransactionStatus

| Mã | Ý nghĩa |
|---|---|
| `00` | **Thành công** — cập nhật đơn hàng → `paid` |
| `01` | Chưa hoàn tất — chờ thêm |
| `02` | Bị lỗi |
| `04` | Giao dịch đảo — liên hệ VNPAY |
| `05` | VNPAY đang xử lý hoàn tiền |
| `06` | Đã gửi yêu cầu hoàn tiền sang ngân hàng |
| `07` | Nghi ngờ gian lận |
| `09` | Hoàn trả bị từ chối |
| `11` | Giao dịch bị hủy |

---

## Lưu ý bảo mật

- **KHÔNG** cập nhật trạng thái thanh toán đơn hàng dựa trên ReturnUrl — chỉ sử dụng kết quả xác nhận từ IPN hoặc API querydr.
- **LUÔN** verify checksum trước khi xử lý bất kỳ callback nào từ VNPAY.
- Kiểm tra `vnp_Amount` khớp với giá trị đơn hàng trong DB trước khi cập nhật trạng thái thành công.
- Lưu `vnp_HashSecret` trong environment variable (`.env`), không hardcode trong source code.
- Với mã `07` (suspected fraud): ghi nhận vào DB nhưng KHÔNG giao hàng ngay — cần xác nhận tại Merchant Admin hoặc đối soát lại sau.