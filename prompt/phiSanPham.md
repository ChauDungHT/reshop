Toàn bộ logic này được xây dựng ngầm ở phía sau, đảm bảo tính đóng gói và chỉ tác động trực tiếp lên ví của Vendor.

---

## 1. Thiết kế chi tiết các bảng trong Database

Dựa trên cấu trúc mối quan hệ **Product $\rightarrow$ Shop $\rightarrow$ Fee Tier $\rightarrow$ Fees**, cấu trúc database được thiết kế tinh gọn như sau:

### Bảng 1: `fee_tiers` (Danh mục các hạng phí)

Lưu trú danh sách các thứ hạng gói phí mà sàn cung cấp.

- **Các cột dữ liệu:**
- `id`: Khóa chính (Mã định danh duy nhất).
- `tier_name`: Tên hạng phí (Ví dụ: "Hạng Thường", "Hạng Đã Xác Thực").
- `description`: Mô tả ngắn về điều kiện áp dụng hạng phí này.

### Bảng 2: `fee_tier_items` (Chi tiết cấu hình các loại phí)

Mỗi hạng phí tại bảng 1 sẽ chứa nhiều dòng cấu hình chi tiết tại bảng này. Ở đây chúng ta thiết lập cứng cho 2 hạng phí:

1. **Hạng Thường (Dành cho shop mới tạo, chưa định danh):** Sàn chịu rủi ro cao hơn nên sẽ áp mức phí cao hơn để bù đắp chi phí vận hành.
2. **Hạng Đã Xác Thực (Đã KYC - xác minh danh tính):** Shop uy tín, được sàn ưu đãi mức phí thấp hơn để giữ chân họ.

- **Các cột dữ liệu:**
- `id`: Khóa chính.
- `fee_tier_id`: Khóa ngoại (Nối đến bảng 1).
- `fee_name`: Tên loại phí cụ thể (Ví dụ: "Phí cố định", "Phí sàn phần trăm", "Phí cổng thanh toán").
- `fee_type`: Hình thức tính phí (`percentage` - theo phần trăm hoặc `fixed` - số tiền cố định).
- `fee_value`: Giá trị của mức phí (Ví dụ: `5.0` cho 5% hoặc `2000` cho 2.000đ).

### Bảng 3: `shops` (Quản lý thông tin Vendor)

Nơi trực tiếp quyết định xem sản phẩm của Shop này bán ra sẽ bị tính phí theo biểu mẫu nào.

- **Các cột dữ liệu:**
- `id`: Khóa chính của cửa hàng.
- `shop_name`: Tên của cửa hàng.
- **`fee_tier_id`**: Khóa ngoại (Nối đến bảng 1). Mặc định khi một shop vừa đăng ký, hệ thống sẽ gán cho họ ID của "Hạng Thường". Khi họ gửi căn cước/giấy phép và được duyệt, Admin sẽ cập nhật cột này thành ID của "Hạng Đã Xác Thực".

---

## 2. Ngữ cảnh kích hoạt Logic tính và trừ phí

Logic tài chính này chỉ được đánh thức khi và chỉ khi **Vendor đã hoàn thành hoàn toàn trách nhiệm đối với Customer**. Có hai cột mốc kích hoạt sự kiện này:

- **Cột mốc 1 (Chủ động):** Khách hàng bấm xác nhận đã nhận hàng và hoàn tất việc viết Đánh giá sản phẩm trong vòng 3 ngày.
- **Cột mốc 2 (Tự động):** Quá 3 ngày (72 giờ) kể từ khi giao hàng, khách hàng hoàn toàn im lặng, không có khiếu nại hay trả hàng.

Lúc này, rủi ro hoàn trả bằng 0. Hệ thống bắt đầu rút tiền từ **"Ngăn đóng băng (Pending Balance)"** ra để xử lý chia phần.

---

## 3. Diễn đạt Luồng Logic Tính và Trừ phí bên trong Vendor

Khi sự kiện trên được kích hoạt, Backend của **reshop** sẽ âm thầm thực hiện tuần tự các bước xử lý sau:

### Bước 1: Tra cứu thông tin gốc của đơn hàng

Hệ thống truy xuất thông tin của đơn hàng vừa kết thúc để lấy ra:

- Mã cửa hàng (`shop_id`).
- Tổng số tiền thực tế mà khách hàng đã thanh toán cho các sản phẩm của shop đó (Tổng doanh thu thô của đơn hàng).

### Bước 2: Truy tìm cấu hình phí (Truy vết luồng dữ liệu)

Hệ thống sử dụng mã `shop_id` của shop, nhìn sang bảng `shops` để tìm xem cột `fee_tier_id` của họ đang là Hạng Thường hay Hạng Đã Xác Thực.

- Tiếp theo, hệ thống vào bảng `fee_tier_items`, lọc ra toàn bộ các dòng chi tiết phí ứng với `fee_tier_id` đó để chuẩn bị tính toán.

### Bước 3: Thực hiện phép toán tính phí

Hệ thống khởi tạo một biến có tên là `Tổng_Phí_Admin_Thu = 0`. Sau đó duyệt qua từng dòng phí đã lấy ở Bước 2 để tính toán:

- Nếu gặp dòng phí dạng `fixed` (Cố định): `Tổng_Phí_Admin_Thu = Tổng_Phí_Admin_Thu + Giá_trị_phí`.
- Nếu gặp dòng phí dạng `percentage` (Phần trăm): `Số_tiền_phí = Tổng_tiền_đơn_hàng * (Giá_trị_phí / 100)`. Sau đó gộp vào: `Tổng_Phí_Admin_Thu = Tổng_Phí_Admin_Thu + Số_tiền_phí`.

### Bước 4: Tính số tiền thực nhận của Vendor

Hệ thống thực hiện phép trừ tại nguồn:

- `Tiền_Vendor_Thực_Nhận = Tổng_tiền_đơn_hàng - Tổng_Phí_Admin_Thu`.

### Bước 5: Cập nhật số dư Ví Vendor và Lưu vết tài chính (Database Transaction)

Để tránh rủi ro mất mát dữ liệu hoặc lỗi hệ thống giữa chừng, toàn bộ các hành động sau phải được thực hiện đồng thời hoặc không hành động nào được thực hiện:

1. **Trừ tiền ngăn đóng băng:** Giảm số dư ở ngăn `Pending Balance` của Vendor đi một khoản bằng đúng `Tổng_tiền_đơn_hàng`.
2. **Cộng tiền ví khả dụng:** Tăng số dư ở ngăn `Available Balance` (Số dư có thể rút) của Vendor thêm một khoản bằng đúng `Tiền_Vendor_Thực_Nhận`.
3. **Ghi nhận doanh thu sàn:** Tạo một bản ghi lưu vết vào sổ cái doanh thu của Admin với số tiền `Tổng_Phí_Admin_Thu` kèm lý do: "Khấu trừ phí hoàn tất đơn hàng #Mã_Đơn_Hàng".
4. **Lập biên bản đối soát cho Vendor:** Tạo một lịch sử giao dịch trong ví người bán, ghi rõ: Tổng tiền khách trả, chi tiết các khoản phí bị trừ theo hạng gói họ đang dùng, và số tiền cuối cùng họ được sở hữu.

### Bước 6: Bắn thông báo kết thúc luồng

Hệ thống gửi một thông báo đẩy (Push Notification) đến tài khoản Vendor Dashboard: *"Đơn hàng #Mã*Đơn*Hàng đã tất toán thành công. Tài khoản khả dụng của bạn đã được cộng thêm [Số tiền thực nhận]đ"*.

Chu trình kết thúc, dòng tiền được phân định minh bạch và an toàn 100%.
