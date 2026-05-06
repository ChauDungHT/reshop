# Tài liệu triển khai Chức năng Tương tác (Reviews & Q&A)

Tài liệu này mô tả cách thức hệ thống hóa và triển khai các tính năng tương tác khách hàng trên trang chi tiết sản phẩm của dự án Reshop.

## 1. Kiến trúc Dữ liệu (Backend)

Thay vì gọi nhiều API riêng lẻ, chúng tôi sử dụng phương pháp **Data Aggregation** (Gộp dữ liệu) trong controller `getProductById`:

*   **API**: `GET /api/products/:id`
*   **Logic**:
    *   Truy vấn thông tin cơ bản của sản phẩm và thông tin Shop (`vendors`).
    *   Truy vấn 4 sản phẩm liên quan (`relatedProducts`) dựa trên cùng `category_id`.
    *   Truy vấn danh sách Đánh giá (`reviews`) kèm tên người dùng.
    *   Truy vấn danh sách Hỏi đáp (`qa`) kèm câu trả lời từ Shop.
*   **Lợi ích**: Giảm thiểu số lượng request từ Frontend, giúp trang load nhanh và đồng bộ hơn.

## 2. Triển khai Giao diện (Frontend)

Sử dụng React kết hợp với Tailwind CSS để tạo trải nghiệm người dùng cao cấp.

### A. Khu vực Đánh giá (Reviews)
*   **Star Filter**: Sử dụng một state local (`ratingFilter`) để lọc danh sách hiển thị ngay tại client mà không cần gọi lại API.
*   **UI Components**: Mỗi đánh giá được đặt trong một Card với bo góc lớn (`rounded-4xl`), hiển thị rõ số sao và thời gian đánh giá.

### B. Khu vực Hỏi đáp (Q&A)
*   **Phân biệt vai trò**: Sử dụng các Badge "Q" (Indigo) cho câu hỏi và "A" (Emerald) cho câu trả lời để người dùng dễ dàng theo dõi mạch hội thoại.
*   **Kiểm soát quyền**: Nút "Đặt câu hỏi" được bọc trong điều kiện kiểm tra `user` từ `AuthContext`. Nếu chưa đăng nhập, hệ thống sẽ hiển thị gợi ý đăng nhập thay thế.

## 3. Quy trình Kiểm thử & Seed Dữ liệu

Vì dữ liệu tương tác thường phát sinh sau khi mua hàng, chúng tôi đã tạo các script seed chuyên dụng (`scratch-seed-interactions.js`) để:
1.  Tạo đơn hàng giả lập (vì Review yêu cầu `order_id`).
2.  Tạo các mẫu câu hỏi và câu trả lời để kiểm tra giao diện hiển thị (Responsive, Line-clamp).

## 4. Các điểm lưu ý kỹ thuật
*   **Responsive**: Grid layout tự động chuyển từ 2 cột (Desktop) sang 1 cột (Mobile).
*   **Performance**: Ảnh được xử lý qua bộ lọc `BASE_URL` để đảm bảo hiển thị đúng dù là link tuyệt đối hay tương đối từ server.
*   **UX**: Hiển thị trạng thái "Chưa có đánh giá/câu hỏi" một cách tinh tế bằng border-dashed thay vì để trống trang.
