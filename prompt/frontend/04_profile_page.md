# Frontend Prompt 4: Hồ sơ người dùng (Profile & Change Password)

**Vai trò:** Frontend Developer
**Mục tiêu:** Trang Profile của user

## Nhiệm vụ:
1. Xây dựng trang `/profile` chung hiển thị hồ sơ cá nhân. Lấy thông tin từ Endpoint GET Profile.
2. Form chỉnh sửa thông tin hiển thị cơ bản (`Address`, `Phone`).
3. Form Change Password: Yêu cầu cung cấp Pass cũ + Pass Nhập Lại. Real-time Password Strength thanh đo sức mạnh.
4. Xây dựng Component `AvatarUploader`: 
   - Vùng drag & drop ảnh hoặc click chọn.
   - Xem trước ảnh (preview blob / base64).
   - Validation kiểm tra size < 5MB và format JPG/PNG/WebP.
   - Gửi req upload Form Data.
