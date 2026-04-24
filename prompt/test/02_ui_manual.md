# QA Prompt 2: Hướng dẫn Test UI & Manual Test

**Vai trò:** Tester / QC
**Mục tiêu:** Hành vi End-user trên trình duyệt cho hệ thống phân quyền mới.

## Nhiệm vụ:
Dựa theo tài liệu TestTeam.md, chuẩn bị kịch bản Manual Test:
1. **Forms**: Mở trình duyệt, bỏ trống Name/Email và nhấn Đăng ký. Kỳ vọng hệ thống báo lỗi viền đỏ Required ngay lập tức. Xác nhận nút Show/Hide mật khẩu (hình con mắt) hoạt động ổn.
2. **Ngăn chặn Xuyên Quyền trên UI**: 
   - Cố tình mở tab ẩn danh gõ URL `/dashboard/admin`. Hệ thống phải auto nhả ra màn hình login hoặc lỗi.
3. **Thanh Log Out**: Nhấn Logout -> vào Console Tools kiểm tra `localStorage`. Kỳ vọng khóa `token` đã bị clear, website tự trở ra `/login`.
4. **Luồng Vendor Check Status**: Thao tác đăng kí Vendor -> Login lại user Vendor đó -> Check hiển thị thông báo "Đang pending chờ Admin" trên trang Vendor Dashboard. Thử click Menu khác bị khóa.
5. **Dung Lượng File**: Tải lên Avatar bằng 1 file ảnh 25MB -> Xem dòng cảnh báo hiển thị trên giao diện từ FE, kiểm chứng lại server xem nó có gửi request sang hỏng server hay không.
