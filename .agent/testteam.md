# KẾ HOẠCH LÀM VIỆC - ĐỘI TEST (QA / QC)
**Module:** 1 — HỆ THỐNG TÀI KHOẢN & PHÂN QUYỀN

---

## 1. Mục Tiêu Test (Test Objectives)
Đảm bảo luồng đi cơ bản (Happy path) hoạt động trơn tru. Hệ thống phân quyền hoạt động nghiêm ngặt không có lỗ hổng (Ví dụ Vendor không truy cập được link Admin).

---

## 2. Test API (Postman / Automation)

### A. Đăng ký & Đăng nhập (Authentication APIs)
Tạo Collection Postman gọi trực tiếp vào API Server. Chú ý các Case sau:

| Tên Test Case | Payload Truyền Vào | Expected (Trạng Thái Kỳ Vọng) |
|---|---|---|
| Đăng ký Customer thành công | Email mới, valid password | Success `201 Created` |
| Đăng ký trùng Email | Email đã có trong DB | Failure `409 Conflict` (Báo trùng) |
| Đăng ký sai format email/pass | Password 3 ký tự | Failure `400 Bad Request` |
| Đăng nhập tài khoản Valid | Đúng email, pass | Success `200 OK` + Lấy được chuỗi JWT |
| Đăng nhập sai Pass | Đúng email, sai pass | Failure `401 Unauthorized` |
| Đăng nhập User bị Banned | Acc đã set `status=banned` | Failure `403 Forbidden` |

### B. Kiểm Tra Phân Quyền (Authorization APIs)
Yêu cầu: Lấy Token từ file Postman Enviroment Set để truyền vào Header `Authorization: Bearer <token>`.

| Tên Test Case | Chuẩn Bị Token | Action & Expected |
|---|---|---|
| Lấy Profile khi không đính Token | Không set Token | Return `401 Unauthorized` |
| Truy cập API Admin bằng Customer Token | Token có Role = `customer` | Gọi `/api/admin/...` -> Return `403 Forbidden` |
| Change Password đúng / sai | Token hợp lệ | Cung cấp Mật khẩu cũ sai -> Dữ liệu trả lỗi. Cung cấp đúng -> Success. |

---

## 3. Test Giao Diện và UI/UX (Manual Test trên Trình Duyệt)

Đội QC mở trình duyệt web lên và test bằng các Scenario dựa trên hành vi người dùng:

### A. Luồng Đăng ký (Sign Up Form Validation)
- Để trống tất cả các ô chọn Submit → Kết quả mong muốn: Form báo lỗi đỏ (như required field) không hề tải lại trang/gọi API.
- Nhập Password Confirm không giống với Password → Kết quả: Nút Submit bị disable hoặc hiện thông báo realtime "Mật khẩu không khớp".
- Kiểm tra tính năng che/hiện (Eye icon) ở ô Mật khẩu.

### B. Luồng Nhận diện Phân quyền & Route Bảo Vệ
- **Test Chưa Đăng Nhập:** Copy URL `/dashboard/customer` và Paste vào thanh địa chỉ. → Kết quả: Web tự động hất văng về trang `/login`. 
- **Test Chuyển Hướng Login:** 
  1. Đăng nhập user là `role=customer`.
  2. Bấm Login thành công.
  3. Quan sát: Dashboard phải chuyển đúng vào giao diện của người mua (`/dashboard/customer`).
- **Test Chống Xuyên Quyền Trình Duyệt:** 
  1. Đang là user `Customer`. Gõ thẳng lên thanh địa chỉ `/dashboard/admin`. 
  2. Mong muốn: Màn hình báo "403 - Bạn không có quyền truy cập trang này".
- **Test Logout:** Nhấn nút Logout. -> Kiểm tra localStorage xem Key `token` đã bốc hơi chưa.

### C. Luồng Vendor Verification
- **Test trạng thái Pending:** Đăng ký Vendor mới, tiến hành login bằng tài khoản này. -> Mong muốn: Load vào trang báo hiệu lệnh "Tài khoản của bạn đang chờ phê duyệt" / Bị chặn không cho thấy biểu đồ hay sản phẩm dashboard nội bộ shop.
- Đăng nhập quyền Admin tiến hành duyệt Shop (Sang Module 4). Đăng nhập lại Shop, lúc này các chức năng sẽ hiển thị đầy đủ.

### D. File Avatar Upload
- Đổi ảnh nhỏ hơn 5MB (Bình thường).
- Ném một file ảnh 20MB hoặc tệp .pdf -> Front end / Backend phải chửi thẳng lỗi File Type hoặc File Size.
