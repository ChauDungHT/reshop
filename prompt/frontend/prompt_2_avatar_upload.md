# PROMPT 2: PHÁT TRIỂN COMPONENT UPLOAD AVATAR VÀ TÍCH HỢP TRANG HỒ SƠ

## 1. Mục tiêu
Xây dựng component `AvatarUpload` hỗ trợ người dùng (Vendor và Customer) xem trước và tải lên ảnh đại diện cá nhân dạng tròn, có kiểm tra hợp lệ file ở client và liên kết trực tiếp với API backend.

## 2. Các yêu cầu kỹ thuật chi tiết
1. **Thiết kế giao diện Component `AvatarUpload`:**
   - Kích thước: Khung tròn cố định (ví dụ: `w-32 h-32` hoặc `w-40 h-40`).
   - Kiểu dáng: Bo tròn hoàn toàn (`rounded-full`), có viền nhẹ (`border border-gray-200`) và đổ bóng nhẹ.
   - Trạng thái chưa có ảnh: Hiển thị ảnh placeholder mặc định sử dụng hàm `getFullImageUrl` đã viết ở Prompt 1.
   - Hiệu ứng Hover: Khi di chuột vào avatar, hiển thị một lớp phủ mờ đen (opacity 40% - 50%) kèm biểu tượng chiếc máy ảnh (Camera icon) và dòng chữ nhỏ "Đổi ảnh".
2. **Kích hoạt File Selector:**
   - Khi click vào vùng Avatar, kích hoạt sự kiện click của thẻ `<input type="file" accept="image/jpeg, image/png, image/webp" className="hidden" />` ẩn để người dùng chọn ảnh từ máy tính.
3. **Kiểm tra tính hợp lệ ở Client-side:**
   - Khi người dùng chọn file, kiểm tra:
     - Loại MIME: Chỉ cho phép `image/jpeg`, `image/png`, `image/webp`.
     - Dung lượng file: Không được vượt quá **5MB** (`5 * 1024 * 1024` bytes).
   - Nếu vi phạm điều kiện, hiển thị thông báo Toast UI thông báo lỗi chi tiết cho người dùng (ví dụ: *"Chỉ chấp nhận ảnh định dạng JPG, PNG, WebP và dung lượng dưới 5MB!"*) và hủy thao tác.
4. **Call API Upload & Quản lý State:**
   - Khi file hợp lệ, hiển thị trạng thái loading (hiệu ứng mờ đục hoặc spinner đè lên ảnh đại diện).
   - Khởi tạo đối tượng `FormData` và gán file vào key `avatar`:
     ```typescript
     const formData = new FormData();
     formData.append('avatar', selectedFile);
     ```
   - Gửi request `POST` đến `/api/users/profile/avatar` (hoặc URL tương ứng của dự án) kèm token Bearer JWT trong Header.
   - Khi upload thành công (API trả về `200 OK` kèm `avatar_url` mới):
     - Hiển thị Toast thông báo thành công.
     - Cập nhật state hoặc invalidate query danh sách thông tin người dùng (ví dụ: qua React Query `queryClient.invalidateQueries(['user-profile'])`) để cập nhật ảnh đại diện trên thanh Header và Trang cá nhân lập tức.
   - Nếu upload thất bại, hiển thị Toast thông báo lỗi từ server trả về và phục hồi lại ảnh đại diện cũ.

## 3. Tích hợp Trang cá nhân (Profile Settings Page)
- Nhúng component `AvatarUpload` vào đầu trang quản lý tài khoản/cá nhân của cả Khách hàng (Customer) và Đối tác (Vendor).
- Đảm bảo layout cân đối, có khoảng cách hợp lý với các trường thông tin chữ bên dưới.
