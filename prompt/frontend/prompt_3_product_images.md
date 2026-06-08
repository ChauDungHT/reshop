# PROMPT 3: UPLOAD ẢNH SẢN PHẨM VÀ TỐI ƯU HÓA HIỂN THỊ TRÊN CÁC TRANG GIAO DIỆN

## 1. Mục tiêu
Xây dựng component `ProductImageUpload` cho trang quản lý sản phẩm của Vendor để quản lý danh sách hình ảnh (upload nhiều ảnh bằng kéo thả, đặt ảnh chính, xóa ảnh). Đồng thời cập nhật render ảnh sản phẩm tại trang Danh sách (sử dụng thumbnail) và trang Chi tiết (sử dụng ảnh gốc kèm Carousel).

## 2. Các yêu cầu kỹ thuật chi tiết

### 2.1 Phát triển Component `ProductImageUpload` (Giao diện Quản lý ảnh của Vendor)
1. **Giao diện kéo thả (Drag & Drop Zone):**
   - Tạo một vùng nét đứt (`border-dashed border-2 border-gray-300 rounded-lg p-6 bg-gray-50 text-center hover:bg-gray-100 transition-colors cursor-pointer`).
   - Hỗ trợ kéo thả file ảnh trực tiếp hoặc click để chọn file. Cho phép chọn nhiều file cùng lúc.
2. **Preview Grid (Lưới hiển thị ảnh):**
   - Hiển thị danh sách các ảnh sản phẩm hiện tại của sản phẩm dưới dạng Grid (ví dụ: 4-5 cột).
   - Mỗi ô ảnh hiển thị:
     - Hình ảnh sản phẩm (sử dụng ảnh thumbnail `thumb_`).
     - Thanh Progress Bar biểu thị tiến trình upload (%) khi ảnh đang được tải lên.
     - Nhãn "Ảnh chính" (Primary) hoặc nút "Đặt làm ảnh chính" (Set as Primary) nổi lên khi hover.
     - Nút "Xóa" (icon Thùng rác đỏ) ở góc trên bên phải để xóa ảnh khỏi danh sách.
3. **Xử lý Call API & State:**
   - **Upload:** Khi người dùng chọn/kéo thả các file ảnh mới, kiểm tra dung lượng (< 5MB) và định dạng (JPG/PNG/WebP). Khởi tạo `FormData` với key `product_images` và append tất cả file hợp lệ. Gọi `POST /api/products/:productId/images` để tải lên server.
   - **Đặt ảnh chính:** Khi người dùng click "Đặt làm ảnh chính", gọi API cập nhật trạng thái ảnh chính của sản phẩm (hoặc cập nhật thuộc tính `is_primary = true` trong state tải lên). Invalidate query sản phẩm để render lại.
   - **Xóa ảnh:** Khi click icon xóa, hiển thị hộp thoại xác nhận (Modal confirm). Nếu xác nhận, gọi `DELETE /api/products/:productId/images/:imageId`. Sau khi thành công, xóa ảnh khỏi UI và hiển thị toast thành công.

### 2.2 Tối ưu hiển thị ảnh sản phẩm tại các trang giao diện (Customer View)

1. **Trang Danh sách sản phẩm (Product List / Search Page):**
   - Tại component thẻ sản phẩm (Product Card), hiển thị ảnh đại diện của sản phẩm.
   - **QUY TẮC BẮT BUỘC:** Chỉ được dùng hàm `getThumbnailUrl(product.primary_image_url)` để tải ảnh thumbnail kích thước `200x200px` từ server. Tuyệt đối không dùng ảnh gốc chất lượng cao để tránh làm giảm tốc độ load trang.
   - Định dạng khung chứa ảnh dạng vuông tỉ lệ `1:1` (`aspect-square object-cover`) để tránh bị bóp méo hình ảnh.

2. **Trang Chi tiết sản phẩm (Product Detail Page):**
   - **Gallery Carousel:** Hiển thị khu vực xem ảnh lớn ở trung tâm và một hàng ngang các ảnh nhỏ (thumbnail) ở bên dưới.
   - **QUY TẮC BẮT BUỘC:** Ảnh chính hiển thị ở trung tâm phải sử dụng đường dẫn chất lượng gốc (`main_{uuid}.webp`) qua hàm helper `getFullImageUrl(url)`.
   - Khi click hoặc hover vào các ảnh nhỏ bên dưới, ảnh chính ở trung tâm sẽ thay đổi tương ứng.
   - Tích hợp hiệu ứng zoom nhẹ hoặc hover phóng to ảnh chính để khách hàng nhìn rõ chi tiết sản phẩm.
   - Trạng thái trống ảnh: Nếu sản phẩm không có ảnh nào trong DB, hiển thị ảnh placeholder mặc định thông qua helper `getFullImageUrl(null, 'product')`.

## 3. Tối ưu hóa Trải nghiệm UX
- Sử dụng component Skeleton Loading cho khung ảnh sản phẩm trong lúc chờ API trả về dữ liệu.
- Phản hồi trực quan thông qua các toast thông báo (Success/Error) khi upload hoặc xóa ảnh thành công/thất bại.
