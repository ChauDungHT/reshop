## Test (phải pass hết mới xong)

### 1. Kiểm tra lỗi cú pháp và Format (Linting)
Sử dụng ESLint và Prettier để quét toàn bộ file vừa viết:
* **Lệnh:** `npm run lint` hoặc `npx eslint ./src --fix`
* **Mục tiêu:** Đảm bảo không có biến thừa, đúng chuẩn quy tắc viết code (Clean Code) và thống nhất format giữa các thành viên trong dự án.

### 2. Kiểm tra kiểu dữ liệu (Nếu dùng TypeScript)
* **Lệnh:** `npx tsc --noEmit`
* **Mục tiêu:** Kiểm tra lỗi logic về kiểu dữ liệu (Type-checking) mà không xuất file build. Đảm bảo các Interface/Type giữa Backend và Database (PostgreSQL) khớp nhau.

### 3. Kiểm tra bảo mật thư viện (Security Audit)
Quét các lỗ hổng bảo mật trong các gói phụ thuộc (dependencies).
* **Lệnh:** `npm audit`
* **Mục tiêu:** Phát hiện và xử lý các thư viện bên thứ ba có lỗ hổng bảo mật (ví dụ: lỗi SQL Injection hoặc XSS trong các thư viện cũ) trước khi đẩy code lên GitHub.


### 4. Kiểm tra logic nghiệp vụ (Unit/Integration Test)
Chạy các bài test tự động cho các hàm xử lý logic hoặc API.
* **Lệnh:** `npm run test` (thường sử dụng Jest hoặc Mocha)
* **Mục tiêu:** Xác minh các chức năng quan trọng (như đăng ký, đăng nhập, tính toán đơn hàng trong reshop) hoạt động đúng như mong đợi. Đảm bảo code mới không làm hỏng các tính năng cũ.


### 5. Chạy Build thử nghiệm
Để chắc chắn code có thể đóng gói mà không bị lỗi module:
* **Lệnh:** `npm run build`
* **Mục tiêu:** Chuyển đổi code (ES6/TypeScript) sang mã máy (CommonJS) ổn định trong thư mục `dist/` hoặc `build/`. Đây là bước kiểm tra xem dự án đã sẵn sàng để triển khai thực tế chưa.

### 6. Xác minh Runtime (Dry Run)
* **Lệnh:** `node --check dist/index.js` (hoặc file entry point của hệ thống).
* **Mục tiêu:** Kiểm tra xem có lỗi `Internal Module` hay lỗi `Require/Import` nào xảy ra sau khi code đã được build xong hay không (phát hiện lỗi thiếu file hoặc sai đường dẫn).

---
**Lời khuyên cho dự án reshop:** Bạn nên cấu hình **GitHub Actions** để mỗi khi bạn `git push` lên repository `ChauDungHT/reshop.git`, hệ thống sẽ tự động chạy toàn bộ danh sách này. Nếu bất kỳ bước nào thất bại, code sẽ không được phép merge.