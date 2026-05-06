# Prompt 03: API Quản lý Sản phẩm (Vendor)

## Ngữ cảnh
Nhà bán hàng cần quản lý danh sách sản phẩm của họ, bao gồm thêm mới, sửa, xóa (soft delete) và ẩn/hiện sản phẩm.

## Yêu cầu
Thực hiện trong `backend/src/modules/catalog/product.controller.ts` (hoặc tạo mới nếu cần):

1. **POST `/api/vendor/products`:**
   - Tiếp nhận `multipart/form-data`.
   - Sử dụng middleware xử lý ảnh từ Prompt 02.
   - Lưu thông tin sản phẩm và mảng URL ảnh vào database.
2. **GET `/api/vendor/products`:**
   - Query params: `status`, `q` (search), `page`, `limit`.
   - Chỉ trả về sản phẩm thuộc về Vendor đang đăng nhập (lấy từ JWT).
3. **DELETE `/api/vendor/products/bulk`:**
   - Nhận mảng IDs `{"ids": [...]}`.
   - Thực hiện **Soft Delete**: `UPDATE products SET status = 'deleted', deleted_at = NOW()`.
   - **Ràng buộc:** Nếu sản phẩm có trong đơn hàng `pending`, từ chối xóa và trả về 409 Conflict.
4. **PUT `/api/vendor/products/bulk-toggle`:**
   - Cập nhật trạng thái `active`/`hidden` cho danh sách IDs.

## Kiểm tra
- Sử dụng Postman hoặc tạo script `scratch-test-product.js` để test các endpoint.
- Đảm bảo logic Soft Delete hoạt động (sản phẩm không bị xóa khỏi DB nhưng không hiện trong list thường).
