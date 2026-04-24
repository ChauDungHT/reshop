# prompt thực thi các bước:
```
bạn được phép yêu cầu các công cụ cần thiết để tôi xem xét nhưng trong khuôn khổ của @contextScopeItemMention để thực thi yêu cầu trong file @contextScopeItemMention, trong khi lên kế hoạch thì kèm theo quy tắc ghi log trong file @contextScopeItemMention và tuân thủ cấu trúc trông file @contextScopeItemMention và sử dụng các test trong @contextScopeItemMention để kiểm tra
```

# prompt yêu cầu chia nhỏ các file backendteam, frontendteam, testteam:
```
Hãy đóng vai một Project Manager kiêm Tech Lead. Dựa trên dữ liệu chi tiết của [MODULE 1 — HỆ THỐNG TÀI KHOẢN & PHÂN QUYỀN] dưới đây, hãy lập một kế hoạch chi tiết thành 3 file backendteam.md, frontendteam.md, testteam.md cho 3 đội thực hiện: Backend, Frontend và Đội Test để họ có thể làm việc song song hiệu quả. Trình bày dưới dạng bảng hoặc các phân mục rõ ràng theo các yêu cầu sau:
1. Cho Đội Backend (Node.js + PostgreSQL):
Thiết kế Schema Database chi tiết (tên bảng, các trường, kiểu dữ liệu, các ràng buộc như Unique, Nullable).
Danh sách các API Endpoints cần viết (Method, URL, Payload yêu cầu, Dữ liệu trả về mẫu).
Các Logic cần xử lý (Hash mật khẩu, JWT, Middleware kiểm tra quyền).

2. Cho Đội Frontend (React + Vite + Tailwind):
Danh sách các Components cần tạo (Form, Button, Layout, PrivateRoute...).
Quản lý State: Cần lưu trữ gì trong AuthContext? Xử lý lưu JWT vào LocalStorage như thế nào?
Các trang (Pages) cần xây dựng và logic chuyển hướng (Navigation logic).

3. Cho Đội Test (Postman + Manual Test):
Xây dựng bộ Test Case chi tiết cho từng chức năng.
Phân chia rõ:
Test API (Postman): Các trường hợp Success (200, 201) và Failure (400, 401, 403, 409).
Test UI/UX: Kiểm tra Validation form, hiển thị thông báo lỗi, kiểm tra phân quyền Route trên trình duyệt.

4. Giao điểm kết nối (Integration points):
Thống kê các dữ liệu mà Backend và Frontend cần thống nhất trước (Ví dụ: Cấu trúc object User trả về trong JWT).

Dưới đây là nội dung Module:
```