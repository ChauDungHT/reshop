# GLOBAL PROJECT RULES & CONTEXT 
*(Project: Sàn Thương Mại Điện Tử Đa Nhà Cung Cấp - Multi-vendor E-Commerce)*

> **MỤC ĐÍCH FILE NÀY**: Đóng vai trò là Kim Chỉ Nam (System Guidelines) cho các AI Assistant hoặc các Developer tham gia vào dự án. Bất kỳ prompt sinh code hoặc file tài liệu nào từ nay về sau **BẮT BUỘC** phải tuân thủ nghiêm ngặt các quy ước thống nhất được tổng hợp từ 3 tài liệu cơ sở: `function.md`, `db.md`, `structure.md`.

---

## 1. TECH STACK
Bất cứ giải pháp sinh code nào cũng phải ưu tiên sử dụng tập công nghệ lõi này trừ khi có yêu cầu khác:
- **Backend**: Node.js (kiến trúc Modular Monolith), PostgreSQL cho Database.
- **Frontend**: React.js kết hợp Vite. Styling bằng Tailwind CSS. Quản lý trạng thái bằng React Context.
- **Communication & Real-time**: Axios API Client, Socket.IO.
- **File Upload**: Sử dụng Local Disk (với `multer` + `sharp`), trỏ public folder `/uploads`.

---

## 2. QUY TẮC CẤU TRÚC (Dựa theo `structure.md`)
Hệ thống KHÔNG code theo kiểu kiến trúc MVC truyền thống tách rời ngang (controllers/ models/ routes/ ở root) mà phải code theo kiểu **Domain-Driven Design (Modular Monolith)**.
- **Backend (`backend/src/modules/`)**: Code chức năng thuộc về domain nào thì nhét chung vào folder đó: `identity` (auth), `catalog` (product/review), `vendor`, `order` (checkout), `message` (chat), `wallet`, `notif`. Mỗi module tự kiểm soát Route và Service của nó.
- **Frontend (`frontend/`)**: UI được chia thành 3 mảng Web Độc Lập cho 3 Role sử dụng:
  - `storefront/`: Dành cho Customer (Sắp xếp layout chuẩn B2C / E-commerce).
  - `vendor-portal/`: Dành cho Vendor (CMS).
  - `admin-dashboard/`: Dành cho Super Admin.
  - `shared-ui/`: Chỉ chứa các component chung (Ví dụ: Nút bấm, Table, Form core elements).

---

## 3. QUY TẮC DỮ LIỆU & NAMING CONVENTION (Dựa theo `db.md`)
Khi thiết kế truy vấn, ORM Models chạy trên PostgreSQL, tuyệt đối tôn trọng Schema thiết kế:
- **Khóa chính (PK/FK)**: Tuyệt đối dùng kiểu `UUID` đi kèm `gen_random_uuid()` cho ID thay vì Integer tự tăng (Auto Increment ID).
- **Tên Bảng**: Sử dụng số nhiều (users, vendors, products).
- **Phân tách thực thể Vendor**: Vendor là một user sở hữu cửa hàng. Tên bảng của cửa hàng là `vendors` (Chứ không phải `shops`). ID của vendor sẽ liên kết `user_id FK` với bảng users.
- **Phân tách Đơn hàng (Orders)**: Giỏ hàng chung đặt 1 lệnh tạo `orders`. Đơn hàng này sẽ rẽ nhánh thành các đơn con ở bảng `vendor_orders` tùy thuộc mua của bao nhiêu gian hàng. `order_items` sẽ ăn theo khóa ngoại `vendor_order_id` (Chứ không dính trực tiếp với ID của order tổng lớn).
- **Tồn Kho (Inventory)**: Không gộp số lượng hàng vào bảng Products trực tiếp mà tách riêng qua bảng `inventory` để xử lý khóa Lock/Release tồn kho chuẩn E-commerce.

---

## 4. QUY TẮC NGHIỆP VỤ CỐT LÕI (Dựa theo `function.md`)
- **Response Format API**: API luôn trả về 1 chuẩn JSON duy nhất: `{ "success": boolean, "message": string, "data": Object/Array/null }`.
- **Mã lỗi HTTP Chuẩn (Error Status)**: 
  - `400` (Lỗi Validate Form), 
  - `401` (Hết hạn Token / Thiếu Bearer Token Header), 
  - `403` (Sai Role phạt cấm - ví dụ Customer leo rào vào URL Admin, hoặc tài khoản đang bị Banned/Pending),
  - `409` (Trùng lặp dữ liệu ví dụ đăng ký email trùng).
- **Luật Mật Khẩu (Bcrypt)**: LUÔN băm với tham số muối `Salt Rounds = 12`.
- **Luật JWT**: Token expiration = `7 ngày`. Payload tối thiểu phải rọi xuống: `{ id: "uuid", role: "customer/vendor/admin" }`.
- **Bảo Vệ Chéo Backend (Middleware)**: Bất kì Endpoint thao tác dữ liệu nào cũng phải qua `authMiddleware` (để hứng user_id) và `roleGuard(allowedRoles)`. Các Endpoint update/xóa/đọc thông tin riêng tư bắt buộc kẹp thêm `ownerGuard` (Check xem cái ID của sản phẩm đang xóa có khớp với ông Vendor đang gọi xóa hay không).
- **Frontend Interceptor Logic**: Axios trên Frontend phải viết interceptor ngầm định đẩy Header Authorization và bắt lỗi ngầm tự Logout khi văng lỗi `401 Unauthorized`.

> KHI THỰC HIỆN CÁC PROMPT HOẶC TASK TIẾP THEO: Nếu có xung đột về Logic, hãy quay lại tra cứu và ưu tiên tuân thủ theo rule ở file `.agent/rule.md` này!
