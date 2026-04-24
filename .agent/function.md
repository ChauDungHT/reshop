================================================================================
        TÀI LIỆU ĐẶC TẢ CHỨC NĂNG HỆ THỐNG
        SÀN THƯƠNG MẠI ĐIỆN TỬ ĐA NHÀ CUNG CẤP (MULTI-VENDOR)
        Stack: Node.js · PostgreSQL · React | Môi trường: Local
        Vai trò: Solution Architect
        Phiên bản: 1.0 — MVP
================================================================================

MỤC LỤC
--------
  MODULE 1  — Hệ thống Tài khoản & Phân quyền
  MODULE 2  — Chức năng Customer (Khách hàng)
  MODULE 3  — Chức năng Vendor (Chủ gian hàng)
  MODULE 4  — Chức năng Super Admin (Quản trị sàn)
  MODULE 5  — Hệ thống Thông báo (Notifications)
  MODULE 6  — AI Chatbot Hỗ trợ Sản phẩm
  MODULE 7  — Nhắn tin Real-time (Shop ↔ Khách)
  MODULE 8  — Lưu trữ File & Ảnh (Local Storage)
  PHỤ LỤC  — Sơ đồ Trạng thái Đơn hàng & Cấu trúc DB gợi ý


================================================================================
MODULE 1 — HỆ THỐNG TÀI KHOẢN & PHÂN QUYỀN
================================================================================

1.1 ĐĂNG KÝ TÀI KHOẢN (REGISTER)
----------------------------------
  [CUSTOMER]
  - Điền form: họ tên, email, mật khẩu (min 8 ký tự), xác nhận mật khẩu.
  - Validation phía client (real-time): kiểm tra định dạng email, độ mạnh mật khẩu.
  - Validation phía server: kiểm tra email đã tồn tại chưa (trả lỗi 409 nếu trùng).
  - Mật khẩu được hash bằng bcrypt (salt rounds = 12) trước khi lưu DB.
  - Tài khoản Customer được kích hoạt ngay lập tức (status = 'active').
  - Tự động cấp ví ảo với số dư ban đầu = 0.
  - Chuyển hướng về trang đăng nhập sau khi đăng ký thành công.

  [VENDOR]
  - Bước 1 — Thông tin tài khoản: họ tên, email, mật khẩu (giống Customer).
  - Bước 2 — Thông tin gian hàng: tên shop (unique), mô tả shop ngắn, số điện thoại liên hệ.
  - Tài khoản Vendor tạo ra với status = 'pending_approval' (chờ Admin duyệt).
  - Bản ghi shops được tạo cùng lúc với status = 'inactive'.
  - Hiển thị thông báo: "Tài khoản đang chờ phê duyệt từ quản trị viên."
  - Admin nhận thông báo nội bộ về yêu cầu đăng ký Vendor mới.

  [SUPER ADMIN]
  - Không có giao diện đăng ký công khai.
  - Tài khoản Admin được tạo thủ công qua script seed dưới local:
      npm run seed:admin -- --email=admin@local.com --password=AdminPass123
  - Script hash mật khẩu và INSERT trực tiếp vào bảng users với role = 'admin'.

1.2 ĐĂNG NHẬP (LOGIN)
----------------------
  - Form đăng nhập chung cho tất cả roles (email + mật khẩu).
  - Server so sánh password hash bằng bcrypt.compare().
  - Nếu xác thực thành công: ký JWT token với payload {id, role, shop_id (nếu vendor)}.
  - JWT có TTL = 7 ngày, secret key lưu trong file .env local.
  - Client lưu JWT vào localStorage.
  - Sau khi login: đọc trường "role" trong JWT để chuyển hướng đúng dashboard:
      · Customer  → /dashboard/customer
      · Vendor    → /dashboard/vendor
      · Admin     → /dashboard/admin
  - Nếu tài khoản Vendor đang status = 'pending_approval': hiển thị thông báo,
    không cho phép truy cập dashboard Vendor.
  - Nếu tài khoản bị khóa (status = 'banned'): trả lỗi với thông báo lý do.
  - Ghi log lần đăng nhập cuối (last_login_at) vào bảng users.

1.3 ĐĂNG XUẤT (LOGOUT)
-----------------------
  - Xóa JWT khỏi localStorage phía client.
  - Làm sạch AuthContext state trong React.
  - Chuyển hướng về trang chủ (/home).
  - (Tùy chọn nâng cao): Duy trì bảng token_blacklist để vô hiệu hóa token sớm
    trước khi hết hạn (hữu ích khi cần kick user ngay lập tức).

1.4 PHÂN QUYỀN & BẢO VỆ ROUTE
-------------------------------
  [BACKEND — Middleware Pipeline]
  - authMiddleware: Đọc header "Authorization: Bearer <token>", verify JWT,
    gắn req.user = {id, role, shop_id} vào request object.
  - roleGuard(roles[]): Middleware factory nhận mảng roles được phép,
    so sánh với req.user.role, trả 403 nếu không khớp.
  - ownerGuard: Kiểm tra tài nguyên (product, order...) có thuộc về
    req.user.id hoặc req.user.shop_id không, trả 403 nếu không phải chủ sở hữu.
  
  [FRONTEND — Route Protection]
  - PrivateRoute component: Nếu chưa đăng nhập → redirect /login.
  - RoleRoute component: Nếu sai role → redirect trang 403.
  - React Context (AuthContext): Cung cấp {user, role, isAuthenticated} toàn app.
  - Axios interceptor: Tự động đính kèm JWT vào mọi request,
    xử lý lỗi 401 (token hết hạn) → tự động logout và redirect /login.

1.5 QUẢN LÝ HỒ SƠ CÁ NHÂN
---------------------------
  - Xem và chỉnh sửa: họ tên, số điện thoại, địa chỉ giao hàng mặc định.
  - Upload ảnh đại diện (avatar) — lưu local vào /uploads/avatars/{user_id}/.
  - Đổi mật khẩu: nhập mật khẩu cũ → nhập mới → xác nhận mới.
    Server verify mật khẩu cũ trước khi cho phép đổi.
  - Xem lịch sử đăng nhập (last_login_at).
  - Xem số dư ví ảo và lịch sử giao dịch ví.


================================================================================
MODULE 2 — CHỨC NĂNG CUSTOMER (KHÁCH HÀNG)
================================================================================

2.1 DUYỆT & TÌM KIẾM SẢN PHẨM
--------------------------------
  [Trang Chủ]
  - Hiển thị banner giới thiệu (ảnh tĩnh, cấu hình bởi Admin).
  - Khu vực "Sản phẩm nổi bật": lấy từ DB theo flag is_featured = true.
  - Khu vực "Mới nhất": 8 sản phẩm có created_at gần nhất.
  - Khu vực "Danh mục phổ biến": hiển thị icon + tên danh mục.
  - Khu vực "Shop nổi bật": các shop có số lượng đơn hàng cao nhất.

  [Trang Danh Sách Sản Phẩm]
  - Hiển thị sản phẩm dạng lưới (grid 4 cột desktop, 2 cột mobile).
  - Mỗi card sản phẩm: ảnh chính, tên, giá, tên shop, số đánh giá trung bình (★).
  - Phân trang: 20 sản phẩm/trang, điều hướng bằng nút Prev/Next và số trang.

  [Tìm Kiếm]
  - Thanh tìm kiếm full-text ở header, có debounce 300ms để giảm request.
  - Backend: tìm kiếm bằng PostgreSQL ILIKE trên các trường: name, description, tags.
  - Hiển thị gợi ý autocomplete (dropdown) với tối đa 5 kết quả khi đang gõ.
  - Trang kết quả tìm kiếm hiển thị số lượng kết quả tìm thấy.
  - Lưu lịch sử tìm kiếm gần đây vào localStorage (tối đa 5 từ khóa).

  [Bộ Lọc Sản Phẩm — Sidebar]
  - Lọc theo danh mục (Category): checkbox đa lựa chọn, có thể chọn nhiều danh mục.
  - Lọc theo khoảng giá: slider 2 đầu (min/max price), hoặc nhập tay vào input.
  - Lọc theo đánh giá: chọn từ ★ trở lên (4★+, 3★+, ...).
  - Lọc theo tình trạng: "Còn hàng" (stock > 0) hoặc tất cả.
  - Lọc theo shop: chọn một shop cụ thể.
  - Sắp xếp (Sort): Mới nhất / Giá tăng dần / Giá giảm dần / Bán chạy nhất / Đánh giá cao nhất.
  - Nút "Xóa bộ lọc" để reset tất cả filter về mặc định.
  - Bộ lọc được phản ánh trên URL dưới dạng query params
    (ví dụ: /products?category=3&min_price=100000&sort=price_asc)
    để người dùng có thể copy/share link lọc.

  [Trang Chi Tiết Sản Phẩm]
  - Gallery ảnh: ảnh chính lớn, thumbnail phụ bên dưới, click để chuyển ảnh chính.
  - Thông tin: tên sản phẩm, giá, tình trạng tồn kho ("Còn X sản phẩm" / "Hết hàng").
  - Mô tả chi tiết (hỗ trợ rich text — render HTML từ trường description trong DB).
  - Thông tin shop: tên shop, avatar, số đánh giá, nút "Xem Shop" và nút "Nhắn tin".
  - Điều chỉnh số lượng (quantity selector): nút +/-, không vượt quá stock hiện tại.
  - Nút "Thêm vào giỏ hàng" — disabled nếu hết hàng.
  - Nút "Mua ngay" — thêm vào giỏ và chuyển thẳng đến trang checkout.
  - Khu vực đánh giá & nhận xét (Reviews): xem đánh giá từ những khách đã mua.
  - Khu vực Q&A công khai (xem phần 2.5).
  - Sản phẩm liên quan: 4 sản phẩm cùng danh mục.

2.2 GIỎ HÀNG (SHOPPING CART)
------------------------------
  - Icon giỏ hàng trên navbar hiển thị badge số lượng item.
  - Thêm sản phẩm: cộng dồn số lượng nếu sản phẩm đã có trong giỏ.
  - Lưu trữ giỏ hàng:
      · Chưa đăng nhập: lưu vào localStorage dưới dạng JSON.
      · Đã đăng nhập: lưu vào bảng cart_items trong DB.
      · Khi đăng nhập: merge giỏ hàng localStorage vào DB (ưu tiên item trong DB
        nếu trùng product_id, cộng dồn số lượng).
  - Trang giỏ hàng:
      · Danh sách item: ảnh thumbnail, tên sản phẩm, tên shop, giá đơn vị.
      · Điều chỉnh số lượng từng item (nút +/-), không vượt quá stock.
      · Nút xóa từng item khỏi giỏ.
      · Nút "Xóa tất cả".
      · Checkbox chọn item để checkout (hỗ trợ mua một phần giỏ hàng).
      · Tóm tắt đơn hàng bên phải: tổng tiền hàng, phí vận chuyển (giả lập cố định
        hoặc miễn phí), tổng thanh toán.
      · Nút "Tiến hành Đặt hàng" — chỉ active khi có ít nhất 1 item được chọn.
  - Nếu giá hoặc tồn kho sản phẩm thay đổi sau khi thêm vào giỏ:
      · Hiển thị cảnh báo màu vàng ngay trên item bị thay đổi.
      · Nếu hết hàng: item bị gray-out và không thể chọn để checkout.

2.3 QUY TRÌNH CHECKOUT & THANH TOÁN
-------------------------------------
  [Trang Checkout]
  - Bước 1 — Địa chỉ giao hàng:
      · Hiển thị địa chỉ mặc định đã lưu trong hồ sơ.
      · Cho phép chọn địa chỉ khác hoặc nhập địa chỉ mới (không lưu vào hồ sơ).
      · Trường: họ tên người nhận, số điện thoại, địa chỉ đầy đủ.
  - Bước 2 — Phương thức vận chuyển (Giả lập):
      · "Giao hàng tiêu chuẩn" — phí cố định 30,000đ — thời gian 3-5 ngày.
      · "Giao hàng nhanh" — phí cố định 60,000đ — thời gian 1-2 ngày.
  - Bước 3 — Phương thức thanh toán:
      · Ví ảo (Virtual Wallet):
          – Hiển thị số dư hiện tại.
          – Nếu số dư không đủ: hiển thị cảnh báo và nút "Nạp thêm ví".
          – Nếu đủ: hiển thị số dư sau khi thanh toán.
      · COD (Thanh toán khi nhận hàng):
          – Không cần điều kiện số dư.
          – Ghi chú: "Vui lòng chuẩn bị tiền mặt khi nhận hàng."
  - Bước 4 — Xem lại đơn hàng:
      · Danh sách sản phẩm đã chọn, số lượng, giá.
      · Địa chỉ giao hàng (tóm tắt).
      · Tổng tiền hàng + phí ship + tổng thanh toán.
      · Ô ghi chú (note) cho người bán (tuỳ chọn).
      · Nút "Đặt hàng" — gọi API với toàn bộ thông tin trên.

  [Backend — Xử lý Đặt hàng (Transaction Atomics)]
  - Bước 1: Validate tất cả sản phẩm: kiểm tra còn tồn tại, còn hàng, giá không đổi.
  - Bước 2: Bắt đầu DB Transaction (BEGIN).
  - Bước 3: Với mỗi sản phẩm: SELECT stock FROM products WHERE id=? FOR UPDATE
             → Kiểm tra stock >= quantity → UPDATE products SET stock = stock - qty.
  - Bước 4: INSERT vào bảng orders và order_items (snapshot giá tại thời điểm đặt).
  - Bước 5 (nếu thanh toán ví):
             SELECT wallet_balance FROM users WHERE id=? FOR UPDATE
             → Kiểm tra balance >= total → UPDATE users SET wallet_balance = balance - total
             → INSERT wallet_transactions (type='debit', ref_order_id=order.id).
  - Bước 6: COMMIT Transaction.
  - Bước 7: Xóa các item đã đặt khỏi cart_items.
  - Bước 8: Gửi thông báo đến Vendor tương ứng (INSERT notifications).
  - Nếu bất kỳ bước nào lỗi: ROLLBACK toàn bộ.

  [Trang Xác nhận Đặt hàng Thành công]
  - Hiển thị mã đơn hàng (order code dạng ORD-YYYYMMDD-XXXXX).
  - Tóm tắt đơn hàng: sản phẩm, số lượng, tổng tiền.
  - Thông tin giao hàng đã chọn.
  - Nút "Xem đơn hàng của tôi" và nút "Tiếp tục mua sắm".

  [Ví ảo — Nạp tiền (Mock)]
  - Trang /dashboard/customer/wallet.
  - Hiển thị số dư hiện tại.
  - Form nạp tiền: chọn mệnh giá (50k, 100k, 200k, 500k, 1 triệu) hoặc nhập tuỳ ý.
  - Nút "Nạp tiền" → gọi POST /api/wallet/topup → server cộng thẳng vào DB.
  - Bảng lịch sử giao dịch: ngày giờ, loại (nạp/trừ), số tiền, đơn hàng liên quan, số dư sau.

2.4 QUẢN LÝ ĐƠN HÀNG & THEO DÕI TRẠNG THÁI
----------------------------------------------
  [Trang Lịch sử Đơn hàng]
  - Tab lọc theo trạng thái: Tất cả / Chờ xác nhận / Đang xử lý /
    Đang giao / Đã giao / Đã huỷ / Trả hàng.
  - Mỗi đơn hàng hiển thị: mã đơn, ngày đặt, tên shop, ảnh sản phẩm (thumbnail),
    tổng tiền, trạng thái hiện tại.
  - Ô tìm kiếm đơn hàng theo mã order code.

  [Trang Chi tiết Đơn hàng]
  - Thanh tiến trình trạng thái (stepper): Đặt hàng → Xác nhận → Đang giao → Đã giao.
  - Danh sách sản phẩm: ảnh, tên, số lượng, giá snapshot, thành tiền.
  - Thông tin giao hàng: địa chỉ, người nhận, số điện thoại, phương thức vận chuyển.
  - Thông tin thanh toán: phương thức, trạng thái thanh toán.
  - Ghi chú của khách gửi cho vendor.
  - Nút "Huỷ đơn hàng" — chỉ hiển thị khi status = 'pending' hoặc 'confirmed'.
  - Nút "Xác nhận đã nhận hàng" — chỉ hiển thị khi status = 'shipped'.
  - Nút "Yêu cầu trả hàng" — chỉ hiển thị khi status = 'delivered'
    và trong vòng thời hạn trả hàng (ví dụ: 7 ngày).
  - Nút "Đánh giá sản phẩm" — chỉ hiển thị khi status = 'delivered'.

2.5 ĐÁNH GIÁ SẢN PHẨM (REVIEWS)
-----------------------------------
  - Chỉ khách hàng đã mua sản phẩm (order status = 'delivered') mới được đánh giá.
  - Mỗi khách chỉ được đánh giá 1 lần cho mỗi sản phẩm trong đơn hàng.
  - Giao diện đánh giá:
      · Chọn số sao (1-5 sao) bằng cách click vào icon ★.
      · Ô nhập nhận xét văn bản (tuỳ chọn, tối đa 500 ký tự).
      · Upload ảnh thực tế (tuỳ chọn, tối đa 3 ảnh).
      · Nút "Gửi đánh giá".
  - Hiển thị đánh giá trên trang chi tiết sản phẩm:
      · Điểm trung bình tổng (★★★★☆ 4.2/5 — 128 đánh giá).
      · Biểu đồ phân bố sao (thanh % cho từng mức 1-5 sao).
      · Danh sách đánh giá: avatar, tên khách, ngày, số sao, nội dung, ảnh.
      · Vendor có thể trả lời đánh giá (reply) — 1 reply/đánh giá.
  - Điểm trung bình sao được cập nhật tự động qua DB trigger hoặc tính lại khi query.

2.6 HỎI ĐÁP CÔNG KHAI (Q&A)
------------------------------
  - Khu vực Q&A hiển thị trên trang chi tiết sản phẩm (bên dưới Reviews).
  - Bất kỳ user đã đăng nhập nào cũng có thể đặt câu hỏi.
  - Form đặt câu hỏi: ô nhập text (tối đa 300 ký tự) + nút "Gửi câu hỏi".
  - Hiển thị danh sách câu hỏi theo thứ tự mới nhất (phân trang nếu > 10 câu).
  - Mỗi câu hỏi hiển thị: avatar + tên người hỏi, thời gian, nội dung câu hỏi.
  - Vendor có thể trả lời câu hỏi từ dashboard của mình.
  - Câu trả lời của Vendor hiển thị ngay bên dưới câu hỏi, có badge "Phản hồi từ Shop".
  - Nếu câu hỏi chưa có trả lời: hiển thị "Chờ phản hồi từ Shop".
  - User đặt câu hỏi nhận thông báo khi câu hỏi được Vendor trả lời.
  - Người hỏi hoặc Admin có thể xóa câu hỏi của mình.

2.7 QUY TRÌNH TRẢ HÀNG (RETURN REQUEST)
-----------------------------------------
  [Gửi Yêu cầu Trả hàng]
  - Điều kiện: đơn hàng có status = 'delivered' và chưa quá thời hạn trả (7 ngày).
  - Form yêu cầu trả hàng:
      · Chọn sản phẩm muốn trả (nếu đơn có nhiều item).
      · Nhập số lượng muốn trả (tối đa bằng số lượng đã mua).
      · Chọn lý do: Sản phẩm lỗi / Không đúng mô tả / Đổi ý / Sản phẩm hỏng khi vận chuyển / Khác.
      · Nhập mô tả chi tiết (bắt buộc, tối thiểu 20 ký tự).
      · Upload ảnh minh chứng (tối đa 5 ảnh — bắt buộc nếu lý do là "Lỗi/Hỏng").
      · Chọn hình thức hoàn tiền: Hoàn vào ví ảo (mặc định).
      · Nút "Gửi yêu cầu".
  - Sau khi gửi: status đơn hàng chuyển sang 'return_requested',
    return_requests record được tạo với status = 'pending_vendor'.
  - Vendor nhận thông báo về yêu cầu trả hàng mới.

  [Theo dõi Trạng thái Trả hàng]
  - Trang "Đơn trả hàng" trong dashboard Customer:
      · Danh sách tất cả return request.
      · Mỗi request hiển thị: mã đơn gốc, sản phẩm, ngày gửi, trạng thái hiện tại.
  - Các trạng thái có thể có:
      · pending_vendor   — Chờ Vendor xử lý.
      · approved         — Vendor đã duyệt, đang hoàn tiền.
      · rejected         — Vendor từ chối (kèm lý do).
      · escalated        — Khiếu nại lên Admin (sau khi Vendor từ chối).
      · resolved_admin   — Admin đã phân xử.
  - Nút "Khiếu nại lên Admin" — hiển thị khi status = 'rejected',
    cho phép Customer leo thang tranh chấp lên Super Admin.
  - Customer nhận thông báo tại mỗi lần trạng thái thay đổi.

  [Hoàn Tiền]
  - Khi return request được duyệt (bởi Vendor hoặc Admin):
      · INSERT wallet_transactions (type='refund', amount=refund_amount).
      · UPDATE users SET wallet_balance = wallet_balance + refund_amount.
      · UPDATE products SET stock = stock + return_qty (cộng lại tồn kho).
      · UPDATE orders SET status = 'returned'.
      · Gửi thông báo cho Customer: "Hoàn tiền X đồng vào ví thành công."


================================================================================
MODULE 3 — CHỨC NĂNG VENDOR (CHỦ GIAN HÀNG)
================================================================================

3.1 QUẢN LÝ GIAN HÀNG (SHOP MANAGEMENT)
-----------------------------------------
  - Xem trang hồ sơ gian hàng công khai (URL: /shops/:shop_slug).
  - Chỉnh sửa thông tin gian hàng:
      · Tên shop, mô tả (rich text), số điện thoại, địa chỉ, email liên hệ.
      · Upload logo shop và ảnh banner shop (lưu local).
      · Thay đổi "shop slug" (URL định danh), kiểm tra unique trước khi lưu.
  - Xem thống kê tổng quan trên dashboard:
      · Tổng doanh thu (tháng này / tổng cộng).
      · Số đơn hàng mới (chưa xử lý).
      · Số sản phẩm đang bán.
      · Số câu hỏi Q&A chưa trả lời.
      · Số tin nhắn chưa đọc.
      · Đánh giá trung bình shop.
  - Biểu đồ doanh thu 30 ngày gần nhất (line chart đơn giản bằng Recharts).
  - Cài đặt chính sách trả hàng của shop: thời hạn trả hàng (ngày), điều kiện.

3.2 QUẢN LÝ SẢN PHẨM (PRODUCT MANAGEMENT)
--------------------------------------------
  [Danh Sách Sản Phẩm]
  - Bảng danh sách sản phẩm của shop: tên, ảnh thumbnail, giá, tồn kho,
    trạng thái (đang bán/ẩn), số đơn hàng, ngày tạo.
  - Lọc theo trạng thái: Tất cả / Đang bán / Đã ẩn / Hết hàng.
  - Tìm kiếm sản phẩm theo tên.
  - Xóa nhiều sản phẩm cùng lúc (checkbox + bulk delete).
  - Ẩn/Hiện nhiều sản phẩm cùng lúc (bulk toggle visibility).

  [Thêm Sản Phẩm Mới]
  - Form thêm sản phẩm:
      · Tên sản phẩm (bắt buộc, max 200 ký tự).
      · Danh mục (chọn từ danh mục Admin đã tạo, hỗ trợ danh mục con).
      · Giá bán (số nguyên VNĐ, bắt buộc).
      · Giá gốc/giá so sánh (tuỳ chọn, để hiển thị % giảm giá).
      · Số lượng tồn kho (stock, bắt buộc, >= 0).
      · Mô tả ngắn (plaintext, max 300 ký tự) — hiển thị trong card sản phẩm.
      · Mô tả chi tiết (Rich text editor — dùng react-quill hoặc TipTap,
        lưu dạng HTML string vào DB).
      · Upload ảnh sản phẩm:
          – Tối đa 8 ảnh.
          – Drag & drop hoặc click để chọn file.
          – Preview ảnh ngay sau khi chọn.
          – Kéo thả để sắp xếp thứ tự ảnh (ảnh đầu tiên = ảnh chính).
          – Backend: Multer nhận file, sharp resize về max 1200px và convert WebP,
            lưu vào /uploads/products/{shop_id}/{uuid}.webp.
      · Tags/từ khoá (nhập và nhấn Enter để thêm tag, hỗ trợ tìm kiếm).
      · Trạng thái: Đang bán / Ẩn.
      · Nút "Lưu nháp" và nút "Đăng bán".

  [Chỉnh Sửa Sản Phẩm]
  - Tất cả các trường giống form Thêm mới.
  - Khu vực quản lý ảnh: xem ảnh hiện có, xóa ảnh cũ, thêm ảnh mới, sắp xếp lại.
  - Cập nhật nhanh tồn kho (quick edit stock) ngay trong danh sách sản phẩm.
  - Cập nhật nhanh giá (quick edit price).
  - Xem lịch sử thay đổi giá (price history) — lưu trong bảng price_history.

  [Xóa Sản Phẩm]
  - Soft delete: đánh dấu deleted_at thay vì xóa khỏi DB (bảo toàn lịch sử đơn hàng).
  - Cảnh báo nếu sản phẩm đang có trong đơn hàng pending.

3.3 QUẢN LÝ ĐƠN HÀNG (ORDER MANAGEMENT)
-----------------------------------------
  [Danh Sách Đơn Hàng]
  - Bảng đơn hàng đến từ tất cả khách: mã đơn, ngày đặt, tên khách, sản phẩm,
    số lượng, tổng tiền, phương thức thanh toán, trạng thái.
  - Tab lọc theo trạng thái: Mới / Đã xác nhận / Đang giao / Đã giao / Đã huỷ.
  - Lọc theo ngày: chọn khoảng ngày (date range picker).
  - Tìm kiếm theo mã đơn hàng hoặc tên khách.
  - Highlight đơn hàng mới (chưa xem) bằng màu nền khác.
  - Export danh sách đơn hàng ra file CSV.

  [Chi Tiết Đơn Hàng]
  - Thông tin đầy đủ: sản phẩm, số lượng, giá snapshot, ghi chú của khách.
  - Thông tin người nhận và địa chỉ giao hàng.
  - Cập nhật trạng thái đơn:
      · pending → confirmed: Xác nhận đơn hàng.
      · confirmed → shipped: Đánh dấu đã giao cho đơn vị vận chuyển.
        Nhập mã vận đơn (tracking code) — lưu vào DB.
      · shipped → delivered: Xác nhận đã giao thành công (hoặc tự động sau N ngày).
  - Huỷ đơn hàng (chỉ khi status = 'pending'): nhập lý do huỷ.
    → Hoàn tiền tự động vào ví nếu đã thanh toán ví.
    → Cộng lại stock.
  - In hoá đơn PDF: render template HTML ra PDF bằng thư viện puppeteer (headless)
    hoặc html2pdf, tải về file order_{id}.pdf.
    Template hoá đơn gồm: logo shop, thông tin đơn, thông tin khách, bảng sản phẩm,
    tổng tiền, thông tin thanh toán, chữ ký số mô phỏng.

3.4 XỬ LÝ YÊU CẦU TRẢ HÀNG
------------------------------
  - Danh sách yêu cầu trả hàng chưa xử lý (badge đếm số chưa đọc).
  - Mỗi yêu cầu hiển thị: tên khách, sản phẩm, lý do, mô tả, ảnh minh chứng,
    ngày gửi yêu cầu, deadline xử lý (ví dụ: phải phản hồi trong 48h).
  - Hành động xử lý:
      · Phê duyệt (Approve): Chọn hình thức hoàn tiền (Hoàn ví).
        → Server thực hiện transaction hoàn tiền và cộng lại stock.
      · Từ chối (Reject): Bắt buộc nhập lý do từ chối (min 20 ký tự).
        → Customer có thể escalate lên Admin sau khi bị từ chối.
  - Xem lịch sử tất cả return request đã xử lý.

3.5 PHẢN HỒI TIN NHẮN VÀ CÂU HỎI
------------------------------------
  [Q&A]
  - Tab "Câu hỏi chưa trả lời" trong dashboard Vendor.
  - Danh sách câu hỏi kèm tên sản phẩm được hỏi.
  - Form trả lời inline: nhập câu trả lời → Gửi.
  - Chỉnh sửa hoặc xóa câu trả lời đã gửi (trong vòng 30 phút).
  - Người đặt câu hỏi nhận thông báo khi có câu trả lời.

  [Nhắn tin trực tiếp — xem chi tiết tại Module 7]
  - Danh sách hội thoại từ tất cả khách, sắp xếp theo tin nhắn mới nhất.
  - Badge số tin nhắn chưa đọc tổng trên menu sidebar.


================================================================================
MODULE 4 — CHỨC NĂNG SUPER ADMIN (QUẢN TRỊ SÀN)
================================================================================

4.1 QUẢN LÝ NGƯỜI DÙNG (USER MANAGEMENT)
------------------------------------------
  [Danh Sách Người Dùng]
  - Bảng tất cả users: ID, họ tên, email, role, ngày đăng ký, trạng thái, số đơn hàng.
  - Lọc theo role (Customer / Vendor / Admin), trạng thái (Active / Pending / Banned).
  - Tìm kiếm theo tên hoặc email.
  - Export danh sách users ra CSV.

  [Phê Duyệt Tài Khoản Vendor]
  - Tab riêng "Vendor chờ duyệt" với badge đếm số đang chờ.
  - Chi tiết yêu cầu: họ tên, email, tên shop đề xuất, mô tả shop, số điện thoại, ngày đăng ký.
  - Nút "Phê duyệt": UPDATE users SET status='active', UPDATE shops SET status='active'.
    Gửi thông báo cho Vendor: "Gian hàng của bạn đã được phê duyệt."
  - Nút "Từ chối": Bắt buộc nhập lý do. UPDATE users SET status='rejected'.
    Gửi thông báo cho Vendor kèm lý do.
  - Vendor bị từ chối có thể đăng ký lại với thông tin mới.

  [Chi Tiết Hồ Sơ Người Dùng]
  - Xem toàn bộ thông tin: profile, lịch sử đơn hàng, lịch sử ví, tài khoản shop (nếu Vendor).
  - Khoá tài khoản (Ban): nhập lý do, UPDATE users SET status='banned'.
    JWT hiện tại của user sẽ bị từ chối (kiểm tra status ở mỗi request với authMiddleware).
  - Mở khoá tài khoản: UPDATE users SET status='active'.
  - Đặt lại mật khẩu thủ công (Reset Password): Admin nhập mật khẩu mới thay cho user
    (chỉ dùng trong môi trường local/dev).
  - Xem log hoạt động gần đây của user.

4.2 QUẢN LÝ DANH MỤC (CATEGORY MANAGEMENT)
---------------------------------------------
  - Danh sách danh mục dạng cây (tree view): Danh mục cha → Danh mục con.
  - Thêm danh mục mới:
      · Tên danh mục (bắt buộc, unique).
      · Slug (tự động generate từ tên, có thể chỉnh sửa).
      · Danh mục cha (tuỳ chọn — nếu để trống = danh mục gốc).
      · Upload icon/ảnh đại diện danh mục.
      · Thứ tự hiển thị (sort order) để sắp xếp trên giao diện.
  - Chỉnh sửa tên, icon, thứ tự của danh mục đã có.
  - Ẩn/Hiện danh mục (không xóa — giữ liên kết với sản phẩm cũ).
  - Xóa danh mục (chỉ cho phép nếu không có sản phẩm nào đang thuộc danh mục đó).
  - Drag & drop để sắp xếp thứ tự các danh mục.
  - Số lượng sản phẩm trong mỗi danh mục (hiển thị badge).

4.3 QUẢN LÝ GIAN HÀNG (SHOP OVERSIGHT)
-----------------------------------------
  - Danh sách tất cả shops: tên shop, chủ shop, ngày tạo, trạng thái, tổng doanh thu, số sản phẩm.
  - Lọc theo trạng thái: Active / Inactive / Banned.
  - Xem chi tiết shop: thông tin đầy đủ, danh sách sản phẩm, lịch sử đơn hàng của shop.
  - Kích hoạt / Vô hiệu hoá shop:
      · Khi vô hiệu hoá: tất cả sản phẩm của shop biến mất khỏi kết quả tìm kiếm
        (lọc WHERE shops.status='active' trong mọi query sản phẩm).
  - Xem thống kê shop: doanh thu theo tháng, số đơn, tỷ lệ hoàn hàng.

4.4 XỬ LÝ TRANH CHẤP (DISPUTE MANAGEMENT)
-------------------------------------------
  - Danh sách tranh chấp bị leo thang (escalated disputes):
      · Thông tin: mã đơn hàng, tên khách, tên shop, lý do trả hàng, lý do từ chối của Vendor,
        ảnh minh chứng từ Customer, ngày leo thang.
  - Admin có thể xem toàn bộ lịch sử hội thoại tin nhắn giữa Customer và Vendor liên quan.
  - Hành động phân xử của Admin:
      · Phán quyết về phía Customer (Customer Wins):
          – Hoàn tiền cho Customer (INSERT wallet transaction + UPDATE balance).
          – Cộng lại stock cho Vendor.
          – Cập nhật return_requests SET status='resolved_admin'.
          – Gửi thông báo cho cả hai bên.
      · Phán quyết về phía Vendor (Vendor Wins):
          – Đóng tranh chấp, giữ nguyên đơn hàng = 'delivered'.
          – Gửi thông báo cho Customer kèm lý do.
      · Nhập ghi chú phân xử (admin_notes) — lưu vào DB để tra cứu sau.
  - Lịch sử tranh chấp đã phân xử (filter by resolved).

4.5 BÁO CÁO & THỐNG KÊ (ANALYTICS DASHBOARD)
-----------------------------------------------
  [Tổng quan Sàn]
  - Thẻ KPI tổng hợp:
      · Tổng doanh thu (tổng tất cả đơn hàng đã giao, trạng thái = 'delivered').
      · Tổng số đơn hàng / Đơn mới hôm nay.
      · Tổng số Users / Tổng số Vendors đang hoạt động.
      · Tổng số sản phẩm đang bán.
  - Biểu đồ doanh thu theo thời gian (line chart): chọn khoảng 7 ngày / 30 ngày / 3 tháng / 1 năm.
  - Biểu đồ phân bổ đơn theo trạng thái (pie chart / donut chart).

  [Top Bảng Xếp Hạng]
  - Top 10 shops doanh thu cao nhất trong kỳ.
  - Top 10 sản phẩm bán chạy nhất (theo số lượng đã bán).
  - Top 10 khách hàng chi tiêu nhiều nhất.

  [Báo Cáo Export]
  - Export báo cáo doanh thu theo khoảng thời gian ra CSV:
      Gồm: ngày, mã đơn, tên shop, sản phẩm, doanh thu, phương thức thanh toán.
  - Export danh sách tất cả giao dịch ví trong khoảng thời gian.


================================================================================
MODULE 5 — HỆ THỐNG THÔNG BÁO (NOTIFICATIONS)
================================================================================

5.1 CẤU TRÚC & LƯU TRỮ
------------------------
  - Bảng notifications(id, user_id, type, title, message, data_json, is_read, created_at).
  - Trường data_json lưu context để tạo deep link (ví dụ: {order_id: 123} → link /orders/123).
  - Các loại thông báo (type enum):
      · order_placed       — Khách đặt đơn hàng mới (gửi cho Vendor).
      · order_confirmed    — Vendor xác nhận đơn (gửi cho Customer).
      · order_shipped      — Đơn hàng đang giao (gửi cho Customer).
      · order_delivered    — Đơn hàng đã giao (gửi cho Customer).
      · order_cancelled    — Đơn bị huỷ (gửi cho bên còn lại).
      · return_requested   — Yêu cầu trả hàng mới (gửi cho Vendor).
      · return_approved    — Yêu cầu trả hàng được duyệt (gửi cho Customer).
      · return_rejected    — Yêu cầu trả hàng bị từ chối (gửi cho Customer).
      · dispute_escalated  — Tranh chấp leo thang (gửi cho Admin).
      · dispute_resolved   — Admin đã phân xử (gửi cho cả Vendor và Customer).
      · qa_answered        — Câu hỏi Q&A được trả lời (gửi cho người hỏi).
      · new_message        — Tin nhắn mới (gửi cho người nhận).
      · vendor_approved    — Tài khoản Vendor được duyệt (gửi cho Vendor).
      · vendor_rejected    — Tài khoản Vendor bị từ chối (gửi cho Vendor).
      · wallet_credit      — Ví được cộng tiền (gửi cho Customer).

5.2 PUSH REAL-TIME QUA SOCKET.IO
----------------------------------
  - Sau khi login, client JOIN vào room cá nhân: user:{user_id}.
  - Server emit event 'notification' tới room user:{user_id} ngay khi có thông báo mới.
  - Client nhận event → cập nhật badge count +1 trên icon chuông (không cần reload trang).
  - Nếu Socket.io không khả dụng: fallback polling GET /api/notifications?unread=true
    mỗi 15 giây bằng setInterval.

5.3 GIAO DIỆN THÔNG BÁO
-------------------------
  - Icon chuông (🔔) trên navbar với badge số thông báo chưa đọc.
  - Dropdown khi click icon chuông: hiển thị 5 thông báo gần nhất.
    Mỗi thông báo: icon phân loại, tiêu đề, thời gian tương đối ("5 phút trước").
    Click vào thông báo: đánh dấu đã đọc + điều hướng đến trang liên quan.
  - Trang /notifications: xem toàn bộ thông báo, phân trang, nút "Đánh dấu tất cả đã đọc".
  - Thông báo chưa đọc có nền màu nhạt để phân biệt với đã đọc.


================================================================================
MODULE 6 — AI CHATBOT HỖ TRỢ SẢN PHẨM
================================================================================

6.1 KIẾN TRÚC
--------------
  - Endpoint: POST /api/chatbot/ask
  - Input: { message: string, product_id?: number, conversation_history: [] }
  - Luồng xử lý:
      1. Nếu có product_id: truy vấn DB lấy thông tin sản phẩm (tên, mô tả, giá,
         tồn kho, danh mục, tên shop, điểm đánh giá trung bình).
      2. Xây dựng system prompt với context sản phẩm + hướng dẫn cho AI.
      3. Gọi AI API (chọn một trong các option bên dưới).
      4. Stream response về client.

6.2 CÁC OPTION AI BACKEND (ƯU TIÊN LOCAL)
-------------------------------------------
  Option A — Ollama (Khuyến nghị cho Local):
    · Cài Ollama: https://ollama.com
    · Chạy model: ollama run llama3.2:3b (nhẹ ~2GB) hoặc mistral:7b.
    · Gọi từ Node.js: POST http://localhost:11434/api/chat
    · Ưu điểm: hoàn toàn offline, miễn phí, không rò rỉ dữ liệu.

  Option B — OpenAI / Anthropic API:
    · Thêm OPENAI_API_KEY hoặc ANTHROPIC_API_KEY vào file .env.
    · Dùng SDK chính thức (@anthropic-ai/sdk hoặc openai).
    · Hỗ trợ streaming response.

  Option C — Rule-based Fallback (không cần API):
    · Phân tích từ khoá trong câu hỏi (giá, tồn kho, danh mục, shop, đánh giá...).
    · Tìm kiếm full-text trong DB products.
    · Trả về câu trả lời được build từ template + dữ liệu DB.
    · Ví dụ: Hỏi "giá bao nhiêu?" → Template: "Sản phẩm [tên] có giá [giá] đồng."

6.3 GIAO DIỆN CHATBOT
----------------------
  - Widget nổi (floating) ở góc phải dưới màn hình, icon bubble chat.
  - Click icon → mở cửa sổ chat nhỏ (300x450px).
  - Khi đang ở trang chi tiết sản phẩm: tự động đính kèm context sản phẩm hiện tại.
  - Welcome message: "Xin chào! Tôi có thể giúp bạn tìm hiểu về [tên sản phẩm]."
  - Gợi ý câu hỏi nhanh (quick suggestions): "Giá bao nhiêu?" / "Còn hàng không?" / "Ship từ đâu?"
  - Lịch sử chat lưu trong sessionStorage (mất khi đóng tab).
  - Hỗ trợ streaming: hiển thị text từng chữ một (typing effect).
  - Nút xóa lịch sử chat.


================================================================================
MODULE 7 — NHẮN TIN REAL-TIME (SHOP ↔ KHÁCH HÀNG)
================================================================================

7.1 KIẾN TRÚC SOCKET.IO
-------------------------
  - Server: socket.io tích hợp vào Express server.
  - Mỗi user khi login: JOIN room cá nhân user:{id}.
  - Room hội thoại: conversation:{min(user_a_id, user_b_id)}_{max(user_a_id, user_b_id)}
    (format đảm bảo unique cho mỗi cặp user).
  - Khi gửi tin nhắn:
      1. Validate user đã xác thực (kiểm tra JWT trong socket handshake).
      2. INSERT message vào DB (messages table).
      3. Emit event 'new_message' tới room hội thoại tương ứng.
  - Typing indicator: emit 'typing_start' và 'typing_stop', timeout 3 giây.
  - Online status: khi user connect/disconnect, emit 'user_online'/'user_offline'
    tới các room liên quan.

7.2 CẤU TRÚC DỮ LIỆU
----------------------
  - conversations(id, participant_a_id, participant_b_id, product_id, last_message_at)
  - messages(id, conv_id, sender_id, content, message_type, is_read, created_at)
    · message_type: 'text' | 'image' | 'order_ref' (gắn link đơn hàng).
  - Unread count: đếm messages WHERE conv_id=? AND sender_id != me AND is_read=false.

7.3 GIAO DIỆN NHẮN TIN
------------------------
  [Customer]
  - Nút "Nhắn tin với Shop" trên trang sản phẩm / trang shop.
    Nếu chưa có hội thoại: tạo mới và chuyển hướng đến trang chat.
    Nếu đã có: chuyển hướng đến hội thoại cũ.
  - Trang /messages: danh sách tất cả hội thoại.
    Mỗi hội thoại: avatar shop, tên shop, tin nhắn cuối, thời gian, badge unread.
  - Cửa sổ chat:
      · Lịch sử tin nhắn cuộn từ dưới lên (newest at bottom).
      · Ngày/giờ gửi hiển thị theo nhóm (Today, Yesterday, DD/MM).
      · Input gửi: ô text + Enter để gửi + nút gửi.
      · Dấu check ✓ (đã gửi) và ✓✓ (đã đọc).
      · Chỉ báo "đang gõ..." khi bên kia đang nhập.
      · Nút gắn đơn hàng: chọn đơn hàng để gửi link tham chiếu vào chat.

  [Vendor]
  - Hộp thư đến Vendor: danh sách hội thoại từ tất cả khách hàng.
  - Chức năng tương tự bên Customer.
  - Badge tổng tin nhắn chưa đọc trên menu sidebar dashboard.

7.4 FALLBACK (LONG POLLING — nếu không dùng Socket.io)
-------------------------------------------------------
  - GET /api/messages/poll?conv_id={id}&since={timestamp}
  - Client setInterval gọi mỗi 3 giây, nhận messages mới kể từ timestamp.
  - Ít real-time hơn nhưng đơn giản hơn khi triển khai.


================================================================================
MODULE 8 — LƯU TRỮ FILE & ẢNH (LOCAL FILE STORAGE)
================================================================================

8.1 CẤU TRÚC THƯ MỤC
----------------------
  /uploads/
  ├── avatars/
  │   └── {user_id}/
  │       └── avatar.webp
  ├── shops/
  │   └── {shop_id}/
  │       ├── logo.webp
  │       └── banner.webp
  ├── products/
  │   └── {shop_id}/
  │       └── {product_id}/
  │           ├── main_{uuid}.webp
  │           ├── thumb_{uuid}.webp  (200x200 thumbnail)
  │           └── ...
  └── returns/
      └── {return_id}/
          └── evidence_{uuid}.webp

8.2 XỬ LÝ UPLOAD (BACKEND)
----------------------------
  - Multer middleware: nhận file từ multipart/form-data.
  - Giới hạn: 5MB/file, chỉ nhận MIME types: image/jpeg, image/png, image/webp.
  - Sharp để xử lý ảnh sau khi nhận:
      · Resize ảnh sản phẩm: max width 1200px (giữ tỷ lệ).
      · Tạo thumbnail: 200x200px, crop center.
      · Convert tất cả sang WebP format (nén tốt hơn JPEG ~30%).
      · Chất lượng WebP: 85%.
  - Lưu đường dẫn tương đối vào DB (ví dụ: /uploads/products/1/42/main_abc.webp).

8.3 SERVE FILE TĨNH
--------------------
  - Express: app.use('/uploads', express.static(path.join(__dirname, 'uploads')))
  - Client truy cập ảnh qua URL: http://localhost:3001/uploads/products/...
  - CORS: chỉ cho phép origin localhost:3000 (React dev server).

8.4 XÓA FILE
-------------
  - Khi xóa sản phẩm hoặc ảnh: gọi fs.unlink() để xóa file vật lý khỏi disk.
  - Khi thay avatar/logo: xóa file cũ trước khi lưu file mới.
  - Định kỳ (tuỳ chọn): script npm run cleanup:orphan-files để tìm và xóa
    file trong /uploads không còn bản ghi nào trong DB trỏ tới.


================================================================================
PHỤ LỤC A — SƠ ĐỒ TRẠNG THÁI ĐƠN HÀNG
================================================================================

  [pending] ──────────────────────────────────────────► [cancelled]
      │  (Vendor confirm)                               (by Customer/Vendor)
      ▼
  [confirmed] ─────────────────────────────────────────► [cancelled]
      │  (Vendor mark shipped)                          (by Vendor only)
      ▼
  [shipped]
      │  (Customer confirm / auto after 7 days)
      ▼
  [delivered] ─────────────────────────────────────────► [return_requested]
      │                                                  │  (by Customer, within 7 days)
      ▼                                                  ▼
    [done]                                          [return_approved] ──► [returned]
                                                    [return_rejected] ──► [escalated]
                                                                          │
                                                                  (Admin resolves)
                                                                          ▼
                                                              [resolved_refund] or [resolved_denied]

  Trạng thái thanh toán (payment_status) tách biệt với order status:
  unpaid → paid → refunded (một phần hoặc toàn bộ)


================================================================================
PHỤ LỤC B — CẤU TRÚC CƠ SỞ DỮ LIỆU (GỢI Ý)
================================================================================

  BẢNG CHÍNH:
  ──────────────────────────────────────────────────────
  users              (id, name, email, password_hash, role, status, wallet_balance,
                      last_login_at, created_at)

  shops              (id, user_id FK, name, slug UNIQUE, description, logo_url,
                      banner_url, phone, status, return_policy_days, created_at)

  categories         (id, parent_id FK self, name, slug, icon_url, sort_order,
                      is_visible, created_at)

  products           (id, shop_id FK, category_id FK, name, slug, description_short,
                      description_html, price, original_price, stock, is_featured,
                      is_visible, deleted_at, created_at, updated_at)

  product_images     (id, product_id FK, url, is_main, sort_order)

  product_tags       (product_id FK, tag)

  orders             (id, user_id FK, code UNIQUE, status, payment_method,
                      payment_status, shipping_address_json, shipping_method,
                      shipping_fee, subtotal, total, note, tracking_code, created_at)

  order_items        (id, order_id FK, product_id FK, quantity, price_snapshot,
                      product_name_snapshot)

  return_requests    (id, order_id FK, items_json, reason, description, evidence_urls,
                      status, admin_notes, created_at, resolved_at)

  reviews            (id, product_id FK, user_id FK, order_id FK, rating,
                      comment, image_urls, created_at)

  review_replies     (id, review_id FK, shop_id FK, content, created_at)

  qa_questions       (id, product_id FK, user_id FK, question, created_at)

  qa_answers         (id, question_id FK, shop_id FK, answer, created_at)

  conversations      (id, participant_a_id FK, participant_b_id FK, product_id FK,
                      last_message_at)

  messages           (id, conv_id FK, sender_id FK, content, message_type,
                      is_read, created_at)

  notifications      (id, user_id FK, type, title, message, data_json,
                      is_read, created_at)

  wallet_transactions (id, user_id FK, type, amount, balance_after,
                       ref_order_id FK, description, created_at)

  cart_items         (id, user_id FK, product_id FK, quantity, created_at)

  price_history      (id, product_id FK, old_price, new_price, changed_at)

  INDEX QUAN TRỌNG:
  ──────────────────────────────────────────────────────
  · products(shop_id), products(category_id), products(is_visible, deleted_at)
  · products USING gin(to_tsvector('english', name || ' ' || description_short))
    -- Full-text search index
  · orders(user_id), orders(status), orders(created_at)
  · messages(conv_id, created_at), messages(sender_id, is_read)
  · notifications(user_id, is_read)


================================================================================
PHỤ LỤC C — BIẾN MÔI TRƯỜNG (.ENV LOCAL)
================================================================================

  # Server
  PORT=3001
  NODE_ENV=development
  CLIENT_URL=http://localhost:3000

  # Database
  DATABASE_URL=postgresql://postgres:password@localhost:5432/multivendor_db

  # JWT
  JWT_SECRET=your_super_secret_key_at_least_32_chars
  JWT_EXPIRES_IN=7d

  # File Upload
  UPLOAD_DIR=./uploads
  MAX_FILE_SIZE=5242880  # 5MB in bytes

  # AI Chatbot (chọn một)
  OLLAMA_BASE_URL=http://localhost:11434
  OLLAMA_MODEL=llama3.2:3b
  # OPENAI_API_KEY=sk-...
  # ANTHROPIC_API_KEY=sk-ant-...

  # Misc
  RETURN_WINDOW_DAYS=7
  DISPUTE_RESPONSE_HOURS=48


================================================================================
      KẾT THÚC TÀI LIỆU
      Phiên bản: 1.0 — MVP | Tổng: 8 Modules + 3 Phụ lục
================================================================================
