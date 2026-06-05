[ ] Thanh toán Online (vnpay, paypal, momo, zalopay,...)
[ ] Quét mã QR
[x] Tính phí vận chuyển
[x] Hoàn trả hàng
[x] Hoàn tiền
[x] Ví điện tử
[ ] Mã giảm giá
[ ] Phí bán hàng
[ ] Thuế sản phẩm
[x] Chatbot
[ ] Gợi ý sản phẩm
[ ] Tìm kiếm theo hình ảnh
[ ] Đọc thông tin từ hình ảnh
[x] Kho hàng
[x] Đánh giá của khách hàng
[ ] Tư vấn khách hàng

tóm tắt lại theo hướng này giúp tôi:

- đi theo luồng: Product -> Shop -> Fee Tier -> Fees

- Thiết kế chi tiết các bảng trong Database:

+ Bảng 1: fee_tiers (Danh mục các hạng/gói phí)

+ Bảng 2: fee_tier_items (Chi tiết các loại phí trong 1 hạng): chỉ xây dựng hạng thường và hạng đã xác thực thông tin

+ Bảng 3: shops (Thêm cột fee_tier_id tại đây)

- chỉ để logic trừ phí ở phía vendor

- xử lí khi sau khi đơn hàng thành công