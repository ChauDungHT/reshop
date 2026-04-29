# KẾ HOẠCH LÀM VIỆC - ĐỘI FRONTEND (REACT + VITE + TAILWIND)
**Module:** 2 — CHỨC NĂNG CUSTOMER (KHÁCH HÀNG)

---

## 1. Hệ Thống Components (Shared & Module Specific)

### A. Core Components
- **`ProductCard`**: Hiển thị ảnh, giá (format currency), rating sao, và badge "Nổi bật" (nếu is_featured). Support grid 4 cột.
- **`FilterSidebar`**: Slider giá (dùng thư viện hoặc custom input), danh mục (checkbox list), và radio buttons cho Sort.
- **`ImageGallery`**: Một ảnh lớn + hàng ngang thumbnails nhỏ phía dưới.
- **`OrderStepper`**: Thanh trạng thái đơn hàng (Chờ xác nhận -> Đang xử lý -> Đang giao -> Đã giao).
- **`ReviewForm`**: Chọn 1-5 sao (interactive stars), upload hình ảnh, và textarea.

---

## 2. Quản Lý State & Logic Nghiệp Vụ

### A. Giỏ Hàng (Cart Logic)
- **Persist:** Lưu giỏ hàng vào `localStorage` khi chưa login.
- **Sync:** Khi `AuthContext` phát hiện trạng thái Login thành công -> Gọi API `/api/cart/sync` để đồng bộ dữ liệu.
- **UI Feedback:** Cảnh báo "Gray-out" hoặc thông báo lỗi nếu sản phẩm trong giỏ bị hết hàng (Stock=0).

### B. Tìm Kiếm & Bộ Lọc (Search & Filter)
- **Debounce:** Xử lý Search input với `useDebounce` (300ms) trước khi gọi API suggest/search.
- **URL Sync:** Sử dụng `URLSearchParams` để đồng bộ bộ lọc lên thanh địa chỉ (Hỗ trợ người dùng copy/paste link mà vẫn giữ nguyên bộ lọc).
- **Autocomplete:** Khi user đang gõ, hiện dropdown tối đa 5 kết quả gợi ý nhanh.

---

## 3. Danh Sách Trang (Pages)

| Trang | Route | Chức năng chính |
|---|---|---|
| **Trang chủ** | `/` | Banner, Featured Products (is_featured), New Arrivals. |
| **Danh sách SP** | `/products` | Filter Sidebar + Grid sản phẩm. |
| **Chi tiết SP** | `/products/:id` | Gallery, Thông tin Shop, Q&A section, Related products. |
| **Giỏ hàng** | `/cart` | Danh sách item, chọn item để checkout. |
| **Checkout** | `/checkout` | Stepper 4 bước: Địa chỉ -> Vận chuyển -> Thanh toán -> Xác nhận. |
| **Ví điện tử** | `/wallet` | Nạp tiền, xem lịch sử giao dịch. |
| **Lịch sử mua hàng**| `/orders` | Danh sách đơn hàng theo tab trạng thái. |

---

## 4. integration Points (Giao điểm Backend)
- **Object CartItem:** `{ product_id, quantity, price, image }`.
- **Object Order:** `{ order_code, items: [], total_amount, address, status, payment_method }`.
- **Format:** Tiền tệ dùng `VND`, mã đơn hàng theo chuẩn `ORD-YYYYMMDD-XXXXX`.
- **Error Handlers:** Bắt lỗi `400` (Hết hàng tại thời điểm checkout) để yêu cầu user cập nhật lại giỏ hàng.
