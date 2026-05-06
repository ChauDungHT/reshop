# Reshop API Development Skill (Quy trình chuẩn)

Tài liệu này định nghĩa quy trình 5 bước thống nhất để tạo một API mới trong dự án Reshop, đảm bảo tuân thủ kiến trúc **Modular Monolith** và các tiêu chuẩn bảo mật.

---

## Bước 1: Phân tích & Database
- **Schema**: Kiểm tra `.agent/db.md` để xác định bảng và quan hệ dữ liệu.
- **Migration**: Nếu cần bảng mới, cập nhật `backend/database/schema.sql` và chạy migration.

## Bước 2: Khởi tạo Module (Domain-Driven)
Tạo thư mục module mới trong `backend/src/modules/` nếu chức năng đó thuộc về một domain mới.
Cấu trúc tiêu chuẩn:
```text
modules/
  └── <module_name>/
      ├── <module_name>.controller.ts  # Xử lý logic nghiệp vụ
      └── <module_name>.route.ts       # Định nghĩa các endpoint
```

## Bước 3: Triển khai Controller
Mọi Controller phải tuân thủ các quy tắc:
1.  **Response**: Luôn sử dụng hàm `sendResponse(res, status, success, message, data)` từ `shared/response.ts`.
2.  **Database**: Sử dụng `import db from '../../core/db'`.
3.  **Transactions**: Đối với các thao tác nhạy cảm (như Wallet, Checkout), sử dụng `const client = await db.pool.connect()` và `BEGIN/COMMIT/ROLLBACK`.
4.  **Logging**: Ghi log rõ ràng theo format `[module]: Action Description - Status - Metadata`.

## Bước 4: Định nghĩa Route & Middleware
- **HTTP Methods**: Sử dụng đúng ngữ nghĩa (GET: lấy, POST: tạo, PUT: cập nhật, DELETE: xóa).
- **Security**: 
    - Sử dụng `authMiddleware` cho mọi route yêu cầu định danh.
    - Sử dụng `roleGuard(['admin', 'vendor'])` để phân quyền.
    - Sử dụng `ownerGuard` để bảo vệ tài nguyên cá nhân.

## Bước 5: Đăng ký & Verification
1.  **Register**: Import và gắn router vào `backend/src/server.ts` với prefix `/api/<module_name>`.
2.  **Lint & Type-check**:
    - `npm run lint` (Xử lý hết các lỗi đỏ).
    - `npm run test:tsc` (Đảm bảo không lỗi kiểu dữ liệu).
3.  **Scratch Test**: Viết file `scratch-<name>.js` để gọi logic trực tiếp từ terminal nhằm xác minh tính đúng đắn của dữ liệu trước khi ghép Frontend.

---
> **Lưu ý**: Tuyệt đối không viết logic xử lý dữ liệu trực tiếp trong file Route. Luôn tách biệt Controller để dễ dàng bảo trì và viết Unit Test.
