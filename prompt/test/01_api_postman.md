# QA Prompt 1: Thiết Bị Postman Collection & Phân Quyền API

**Vai trò:** Tester / QA / QC
**Mục tiêu:** Chạy kịch bản Backend trên Postman.

## Nhiệm vụ:
1. Tạo 1 Collection Request:
   - Request `Register Customer` (Trả mã 201). Request Duplicate Register báo 409.
   - Request `Login` (Trả mã 200). Setup Environment Variables tự động bắt JWT Token vào mảng Environment thông qua `Tests` script sau response.
   - Request `Login` báo 401 khi sai password.
   - Request `Login` báo 403 nếu cố tình đăng nhập acc `banned`.
2. Kiểm tra Test Xuyên Quyền Auth Guard:
   - Lấy token Customer, gắn Authorization Header chọc vào endpoint dành cho Admin / Vendor. Kỳ vọng: Back end hất văng bằng JSON 403.
   - Lấy Profile ko gắn kèm chuỗi Bearer. Kỳ vọng: văng 401.
