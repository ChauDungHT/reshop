Để quản lý trạng thái phản hồi và kiểm soát dòng tiền một cách mượt mà cho dự án **reshop**, chúng ta cần xây dựng một bộ logic có tính bọc lót tốt. Dưới đây là diễn đạt chi tiết về ngữ cảnh hệ thống và luồng logic vận hành mà không dùng code, giúp bạn dễ dàng hình dung cấu trúc khi thiết kế.

---

## 1. Ngữ cảnh hệ thống khi bước vào Logic (Context)

Logic này bắt đầu hoạt động ngay khi hệ thống ghi nhận một sự kiện mang tính bước ngoặt: **Đơn hàng đã được giao thành công cho khách hàng.**

* **Trạng thái đơn hàng gốc:** Chuyển từ `DELIVERING` (Đang giao) sang `DELIVERED` (Đã giao thành công).
* **Trạng thái dòng tiền tại nguồn:** Số tiền khách hàng trả (Ví dụ: 100.000đ) hiện đang nằm ở tài khoản đảm bảo của Sàn (Admin giữ). Hệ thống lập tức khấu trừ phí sàn (Ví dụ: 5.000đ), phần còn lại (95.000đ) được đẩy thẳng vào **Ngăn đóng băng (Pending Balance)** của Vendor.
* **Điểm mấu chốt:** Lúc này, nút "Rút tiền" cho đơn hàng này của Vendor chưa được kích hoạt. Hệ thống bắt đầu bật một **"Cơ chế giám sát phản hồi"** trong thời gian tối đa là 3 ngày (72 giờ).

---

## 2. Các trạng thái phản hồi cần quản lý (Sub-states)

Trong vòng 3 ngày này, đơn hàng sẽ có một trạng thái phụ (Sub-status) để tracking. Bạn quản lý 3 trạng thái phản hồi chính:

1. `AWAITING_FEEDBACK` (Chờ phản hồi): Trạng thái mặc định ngay sau khi giao thành công.
2. `REVIEWED` (Đã đánh giá): Khách hàng đã viết đánh giá, chấm sao cho sản phẩm.
3. `DISPUTED` (Khiếu nại/Trả hàng): Khách hàng không hài lòng và bấm nút yêu cầu hoàn tiền.

---

## 3. Luồng logic xử lý chi tiết (Business Logic Flow)

Hệ thống sẽ chạy theo mô hình rẽ nhánh tự động dựa trên hành vi của Khách hàng hoặc sự dịch chuyển của Thời gian:

### Nhánh 1: Khách hàng chủ động Đánh giá sản phẩm (Giải phóng sớm)

* **Điều kiện kích hoạt:** Khách hàng vào app, bấm vào đơn hàng và hoàn tất việc viết Review/Chấm sao.
* **Hành động của hệ thống:**
1. Ghi nhận nội dung đánh giá vào database để hiển thị lên trang sản phẩm.
2. Chuyển trạng thái phản hồi của đơn hàng từ `AWAITING_FEEDBACK` sang `REVIEWED`.
3. Ngay lập tức mở khóa dòng tiền: Trừ 95.000đ ở ngăn *Pending Balance* và cộng vào ngăn *Available Balance* (Số dư khả dụng) của Vendor.
4. Gửi một thông báo (Notification) cho Vendor: *"Đơn hàng #XYZ đã được đánh giá. Tiền đã về ví khả dụng của bạn!"*.


* **Kết thúc logic:** Đơn hàng đóng lại hoàn toàn, tiền thuộc toàn quyền sở hữu của Vendor.

### Nhánh 2: Khách hàng Im lặng quá 3 ngày (Giải phóng tự động)

* **Điều kiện kích hoạt:** Hệ thống chạy ngầm (Cron Job) quét các đơn hàng có trạng thái `AWAITING_FEEDBACK` và kiểm tra thấy thời gian hiện tại đã vượt quá mốc [Thời gian giao hàng + 72 giờ].
* **Hành động của hệ thống:**
1. Tự động chuyển trạng thái phản hồi của đơn hàng từ `AWAITING_FEEDBACK` sang `AUTO_COMPLETED` (Tự động hoàn thành).
2. Thực hiện lệnh dịch chuyển tiền từ ngăn đóng băng sang ngăn khả dụng cho Vendor (tương tự như Nhánh 1).
3. (Tùy chọn) Hệ thống có thể tự động chấm 5 sao mặc định hoặc ẩn phần đánh giá của đơn này đi vì đã quá hạn phản hồi.


* **Kết thúc logic:** Đơn hàng đóng lại, Vendor an toàn nhận tiền.

### Nhánh 3: Khách hàng bấm nút Khiếu nại/Trả hàng (Chặn dòng tiền)

* **Điều kiện kích hoạt:** Trong vòng 3 ngày, khách hàng không đánh giá mà bấm nút "Trả hàng/Hoàn tiền".
* **Hành động của hệ thống:**
1. Đóng băng lập tức lệnh đếm ngược 3 ngày của đơn hàng đó.
2. Chuyển trạng thái phản hồi sang `DISPUTED`.
3. Khóa chặt số tiền 95.000đ trong ngăn *Pending Balance*, không cho phép bất kỳ cơ chế tự động nào giải phóng số tiền này sang ví khả dụng.
4. Chờ Admin hoặc hai bên vào đối thoại phân xử (Nếu Vendor thắng -> Tiền về ví khả dụng; Nếu Khách thắng -> Lấy tiền từ ví đóng băng trả lại Khách).



---

## Tóm tắt tư duy vận hành

Với logic này, bạn đã biến hành động **Đánh giá** của khách hàng thành một **quyền lợi sát sườn của Vendor**.

Vendor muốn lấy tiền sớm thì phải chủ động bỏ thư cảm ơn vào gói hàng, chủ động nhắn tin chăm sóc khách hàng nhờ đánh giá. Ngược lại, nếu khách hàng lười không phản hồi, sàn vẫn bảo vệ Vendor bằng cách tự động trả tiền sau 3 ngày chứ không ngâm vốn của họ quá lâu. Quy trình này vừa tự động hóa 100% bằng hệ thống, vừa đảm bảo an toàn tuyệt đối cho dòng tiền của Admin **reshop**.