# 🛡️ BÁO CÁO TỔNG HỢP KIỂM THỬ (TEST REVIEW REPORT)

**Dự án:** Reshop E-commerce Platform
**Ngày cập nhật:** 2026-05-06
**Người thực hiện:** Antigravity AI Assistant

---

## 📋 [TEST-01] Kiểm thử API Race Condition (Concurrency Test)

### 1.1. Thông tin chung
- **Mã bài test:** `01-test-api-race-condition`
- **Mục tiêu:** Xác minh tính toàn vẹn của dữ liệu tồn kho khi có nhiều yêu cầu mua hàng đồng thời.

### 1.2. Kịch bản thực hiện
1. **Chuẩn bị:** Sản phẩm mẫu có `stock = 1`.
2. **Thực thi:** Gửi đồng thời **10 request** POST `/api/checkout`.
3. **Kỳ vọng:** Chỉ 1 request thành công, stock về 0, không âm.

### 1.3. Kết quả chi tiết
| Request # | Trạng thái | Thông điệp |
|:---:|:---:|:---|
| 1 | ✅ SUCCESS | 201 Created |
| 2-10 | ❌ FAILED | 400 - Sản phẩm đã hết hàng |

**Thống kê:** Thành công: 1/10 | Thất bại: 9/10 | Tồn kho cuối: 0

### 1.4. Đánh giá
- **Trạng thái:** ✅ **PASSED**
- **Nhận xét:** Cơ chế `FOR UPDATE` trong Transaction hoạt động chính xác, ngăn chặn hoàn toàn hiện tượng overselling.

---

## 📋 [TEST-02] Kiểm thử Giao dịch Ví và Thanh toán

### 2.1. Thông tin chung
- **Mã bài test:** `02-test-giao-dich-vi-va-thanh-toan`
- **Mục tiêu:** Xác minh tính chính xác của luồng tiền, nạp tiền, thanh toán và hoàn tiền.

### 2.2. Kịch bản thực hiện
1. **Top-up:** Kiểm tra nạp tiền số âm và nạp tiền hợp lệ.
2. **Thanh toán:** Kiểm tra thanh toán khi số dư không đủ.
3. **Hoàn tiền:** Kiểm tra hoàn tiền tự động khi đơn hàng được trả lại.

### 2.3. Kết quả chi tiết
| STT | Nội dung kiểm thử | Kết quả | Chi tiết phản hồi |
|:---:|:---|:---:|:---|
| 1 | Nạp tiền số âm (-50,000) | ✅ PASSED | Trả về lỗi 400 (Invalid amount) |
| 2 | Nạp tiền hợp lệ (+100,000) | ✅ PASSED | Thành công, số dư cập nhật lên 100,000 |
| 3 | Thanh toán thiếu số dư | ✅ PASSED | Trả về lỗi 400 (Số dư không đủ) |
| 4 | Duyệt hoàn tiền (Refund) | ✅ PASSED | Tiền về ví + Tồn kho khôi phục thành công |

### 2.4. Đánh giá
- **Trạng thái:** ✅ **PASSED**
- **Nhận xét:** Logic tài chính được ràng buộc chặt chẽ. Hệ thống log giao dịch (`wallet_transactions`) ghi nhận đầy đủ và chính xác.

---

## 🏁 KẾT LUẬN CHUNG
Tất cả các bài test quan trọng về **Race Condition** và **Giao dịch tài chính** đều đã vượt qua. Hệ thống Backend đảm bảo được tính nhất quán và bảo mật của dữ liệu trong các tình huống thực tế phức tạp.

---

## 📋 [TEST-03] Kiểm thử UI Responsive và Trạng thái (State)

### 3.1. Thông tin chung
- **Mã bài test:** `03-test-ui-responsive-va-state`
- **Mục tiêu:** Kiểm tra khả năng tương thích trên thiết bị di động và tính logic của việc hiển thị trạng thái dữ liệu (Giỏ hàng, Tiến trình đơn hàng).

### 3.2. Kết quả kiểm thử
#### 1. Responsive Layout (Giao diện di động - 375px)
- **Grid sản phẩm:** Tự động chuyển đổi mượt mà sang giao diện **2 cột** (`grid-cols-2`), hiển thị hình ảnh và thông tin không bị vỡ bố cục. ✅ **PASSED**
- **Sidebar bộ lọc:** Trên màn hình di động, bộ lọc tự động đẩy lên phía trên danh sách sản phẩm theo dạng block (stack layout). Dù không ẩn vào Drawer menu, nhưng cách hiển thị này vẫn đảm bảo tính khả dụng (usable) và không che khuất nội dung. ✅ **PASSED** (Chấp nhận được)

#### 2. Trạng thái Giỏ hàng (Sản phẩm hết hàng)
- Khi sản phẩm trong giỏ bị hết hàng (`stock = 0`), giao diện cập nhật chính xác:
  - Hiệu ứng làm mờ: `opacity-50 grayscale` được áp dụng. ✅ **PASSED**
  - Nhãn cảnh báo: Hiển thị chữ "HẾT HÀNG" màu đỏ (`text-rose-500`). ✅ **PASSED**
  - Vô hiệu hóa chọn: Checkbox bị `disabled`, ngăn người dùng tích chọn để thanh toán. ✅ **PASSED**

#### 3. Stepper Tiến trình đơn hàng
- Thanh tiến trình trong **Chi tiết đơn hàng** hiển thị đúng luồng: *Chờ duyệt -> Xác nhận -> Xử lý -> Giao hàng -> Thành công*.
- Logic tính toán bước hoàn thành dựa trên `indexOf(status)` hoạt động chính xác với dữ liệu Backend trả về. Các bước đã qua được tô sáng bằng màu xanh indigo. ✅ **PASSED**

### 3.3. Đánh giá
- **Trạng thái:** ✅ **PASSED**
- **Nhận xét:** Frontend xử lý các Edge Case (hết hàng) rất trực quan. Responsive layout cơ bản đáp ứng tốt. Khuyến nghị nâng cấp Sidebar bộ lọc trên Mobile thành dạng Drawer để tiết kiệm không gian hiển thị hơn trong tương lai.

---

## 📋 [TEST-04] Kiểm thử URL Query Params và Bộ lọc

### 4.1. Thông tin chung
- **Mã bài test:** `04-test-url-params-va-bo-loc`
- **Mục tiêu:** Xác minh tính nhất quán giữa bộ lọc UI và URL trình duyệt (Sync, Persistence, Reset).

### 4.2. Kết quả kiểm thử
#### 1. Đồng bộ URL (Sync URL)
- Khi thực hiện chọn Danh mục và nhập Khoảng giá trên Sidebar, thanh địa chỉ URL tự động cập nhật ngay lập tức các param tương ứng (VD: `?category=vot-cau-long&min_price=1000000`). ✅ **PASSED**

#### 2. Tính bền vững (Persistence)
- Khi copy URL đã lọc và dán vào tab/trình duyệt mới:
  - Danh sách sản phẩm được tự động fetch và lọc theo đúng các điều kiện trên URL. ✅ **PASSED**
  - Các state trên UI (radio button danh mục, input giá, radio đánh giá) hiển thị chính xác trạng thái đã chọn từ URL. ✅ **PASSED**

#### 3. Xóa bộ lọc (Reset)
- **Cập nhật:** Đã bổ sung nút "Xóa bộ lọc" (`Clear filters`) vào Header của Sidebar khi có ít nhất một bộ lọc được kích hoạt.
- Khi bấm nút "Xóa bộ lọc": Toàn bộ trạng thái UI (Category, Price, Rating) được reset về mặc định và các query param liên quan lập tức bị xóa khỏi URL. ✅ **PASSED**

### 4.3. Đánh giá
- **Trạng thái:** ✅ **PASSED** (> 80%)
- **Nhận xét:** Logic quản lý state bằng `useSearchParams` hoạt động cực kỳ hiệu quả, giúp State của App và URL luôn nhất quán. Chức năng chia sẻ Link tìm kiếm (Shareable links) đã hoạt động hoàn hảo.

---

## 📋 [TEST-05] Kiểm thử Quy trình Trả hàng và Hậu mãi

### 5.1. Thông tin chung
- **Mã bài test:** `05-test-quy-trinh-tra-hang-va-hau-mai`
- **Mục tiêu:** Kiểm tra các ràng buộc nghiệp vụ (Business Rules) của quy trình trả hàng và viết đánh giá.

### 5.2. Kết quả kiểm thử
#### 1. Chính sách 7 ngày (Return Policy)
- **Cập nhật:** Đã cập nhật `CustomerDashboard.tsx` để bổ sung logic ẩn nút "Trả hàng" dựa trên số ngày giao hàng.
- **Kết quả:** Nếu đơn hàng có trạng thái `delivered` và thời gian từ lúc giao hàng đến hiện tại **vượt quá 7 ngày**, nút "Trả hàng" sẽ bị ẩn hoàn toàn khỏi giao diện người dùng. Hơn nữa, Backend (`after-sales.controller.ts`) cũng chặn request và trả về lỗi 400 nếu quá hạn. ✅ **PASSED**

#### 2. Giới hạn số lượng trả (Quantity Limit)
- **Cập nhật:** Đã bổ sung trường nhập "Số lượng trả" vào form yêu cầu trả hàng ở Frontend cùng với logic validate.
- **Kết quả:** Khi mua số lượng 2 nhưng nhập trả số lượng 3, hệ thống Frontend lập tức báo lỗi Alert: "Số lượng trả không hợp lệ" và chặn gửi request đi. Người dùng chỉ có thể trả số lượng $\le$ số lượng đã mua. ✅ **PASSED**

#### 3. Điều kiện viết đánh giá (Review Conditions)
- Khi truy cập hoặc gửi request đánh giá cho một sản phẩm chưa được giao thành công hoặc chưa từng mua, Backend (`createReview`) kiểm tra truy vấn JOIN giữa bảng `orders` và `order_items` với điều kiện `status = 'delivered'`.
- Kết quả: Request bị từ chối với lỗi 403: "Bạn chỉ có thể đánh giá sản phẩm sau khi đơn hàng đã được giao." Hệ thống không cho phép Spam Review. ✅ **PASSED**

### 5.3. Đánh giá
- **Trạng thái:** ✅ **PASSED** (> 80%)
- **Nhận xét:** Mọi ràng buộc nghiệp vụ (Business Rules) quan trọng trong quy trình hậu mãi đều được tuân thủ nghiêm ngặt ở cả 2 lớp (Frontend chặn hiển thị/validate, Backend từ chối xử lý). Hệ thống xử lý hoàn tiền rất an toàn.

---

## 📋 [TEST-06] Kiểm thử Bảo mật và Phân quyền (RBAC)

### 6.1. Thông tin chung
- **Mã bài test:** `06-test-bao-mat-va-phan-quyen`
- **Mục tiêu:** Tìm kiếm các lỗ hổng phân quyền tiềm ẩn và IDOR (Insecure Direct Object Reference) để đảm bảo không có hiện tượng "leo rào" dữ liệu giữa các User.

### 6.2. Kết quả kiểm thử
#### 1. Quyền sở hữu Q&A (Q&A Ownership)
- **Kịch bản:** User B gọi API `DELETE /api/qa/:id_của_A` để cố tình xóa câu hỏi của User A.
- **Kết quả:** Backend (`after-sales.controller.ts`) thực hiện truy vấn đối chiếu `user_id` của câu hỏi với `userId` từ JWT Token. Nếu không khớp và không phải Admin, API từ chối ngay lập tức với mã lỗi 403 (Forbidden). ✅ **PASSED**

#### 2. Quyền riêng tư của Ví (Wallet Privacy)
- **Kịch bản:** User A truyền param `/api/wallet/history?user_id=ID_của_B` để xem trộm lịch sử giao dịch.
- **Kết quả:** API `getHistory` bỏ qua hoàn toàn tham số `user_id` truyền từ Client. Lệnh SQL luôn được bind cứng với `$1 = req.user.id` (lấy từ Token). Điều này giúp triệt tiêu hoàn toàn lỗ hổng IDOR. ✅ **PASSED**

#### 3. Điều kiện Đánh giá (Review Logic - Anti-Fraud)
- **Kịch bản:** Vendor tự đưa sản phẩm của mình vào giỏ hàng, tự đặt, tự giao và tự lên bài đánh giá 5 sao (Seeding ảo).
- **Cập nhật:** Trong quá trình kiểm tra, phát hiện lỗ hổng cho phép Vendor tự đánh giá sản phẩm nếu tự mua hàng. Tôi đã lập tức **vá lỗ hổng này** trong `createReview`. Backend giờ đây sẽ query thêm trường `vendor_id` của bảng `products`, nếu `vendor_id === req.user.id` thì trả về lỗi 403: "Nhà bán hàng không được phép tự đánh giá sản phẩm của chính mình."
- **Kết quả sau khi vá:** ✅ **PASSED**

### 6.3. Đánh giá
- **Trạng thái:** ✅ **PASSED** (> 80%)
- **Nhận xét:** Hệ thống kiểm soát quyền (RBAC) trên các Object rất tốt. Việc thiết kế lấy ID trực tiếp từ Token giúp ứng dụng cực kỳ an toàn trước các cuộc tấn công thay đổi tham số IDOR. Lỗ hổng seeding ảo đã được khắc phục triệt để.
