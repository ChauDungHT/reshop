# 🎨 KẾ HOẠCH LÀM VIỆC ĐỘI FRONTEND (REACT + VITE + TAILWIND)

## 1. DANH SÁCH COMPONENTS UI (UI COMPONENTS LIBRARY)

| Component Name | Chức năng & Yêu cầu |
|---|---|
| `VendorLayout` | Khung giao diện chính (Layout). Bao gồm Sidebar (có hiển thị Badge tin nhắn, Badge trả hàng) và Topbar (thông báo, avatar người dùng). Responsive tự động gập Sidebar trên Mobile. |
| `DataTable` | Bảng hiển thị dữ liệu (Sản phẩm, Đơn hàng, Trả hàng). Yêu cầu: <br>- Hỗ trợ Pagination (Phân trang). <br>- Hỗ trợ Sorting (Sắp xếp theo cột). <br>- Có ô Checkbox đầu mỗi dòng để hỗ trợ Bulk Actions. |
| `StatCard` | Card hiển thị thống kê trên Dashboard (Ví dụ: Tổng doanh thu, Số đơn hàng). Có icon minh hoạ và hiển thị % tăng/giảm so với tháng trước. |
| `ImageUploader` | Component upload đa phương tiện. Yêu cầu: <br>- Hỗ trợ Drag & Drop (Kéo thả file). <br>- Giới hạn tối đa 8 ảnh, preview ảnh ngay sau khi chọn. <br>- **Tính năng nâng cao:** Hỗ trợ kéo thả để sắp xếp thứ tự ảnh (Drag and Drop Sortable). |
| `RichTextEditor` | Trình soạn thảo văn bản cho Mô tả sản phẩm. Gợi ý: Sử dụng `react-quill` hoặc `@tiptap/react`. Cần cấu hình thanh công cụ cơ bản (Bold, Italic, List, Link). |
| `RevenueChart` | Biểu đồ doanh thu 30 ngày gần nhất. Gợi ý: Sử dụng `Recharts` (LineChart) để vẽ biểu đồ tương tác tốt, có Tooltip khi hover. |

---

## 2. QUẢN LÝ STATE (STATE MANAGEMENT)

1. **Quản lý Bulk Actions (Xóa/Ẩn nhiều sản phẩm):**
   - Sử dụng React Context hoặc thư viện Zustand để lưu danh sách các ID (`selectedRowIds`) đang được tick chọn trên `DataTable`.
   - Có cơ chế Select All / Deselect All.
   - Khi thực hiện Bulk Action thành công, tự động làm sạch (clear) danh sách ID đã chọn.

2. **Quản lý Bộ lọc (Filters) & Phân trang:**
   - **BẮT BUỘC** sử dụng URL Query Params (`useSearchParams` của `react-router-dom`) thay cho Local State (`useState`) để lưu trữ Bộ lọc (Status, Date Range, Keywords).
   - *Lý do:* Đảm bảo khi User reload trang hoặc copy URL gửi cho người khác, kết quả lọc vẫn được giữ nguyên.

3. **Lưu trữ dữ liệu Dashboard & Caching:**
   - Sử dụng `@tanstack/react-query` để gọi API. Cấu hình tự động refetch (Stale time) hoặc refetch khi focus lại cửa sổ trình duyệt để dữ liệu doanh thu/đơn hàng mới luôn được cập nhật.

---

## 3. CÁC TRANG CẦN XÂY DỰNG (PAGES & NAVIGATION)

- `/vendor/dashboard`: Trang chủ Vendor. Chứa các `StatCard` và `RevenueChart`.
- `/vendor/shop-profile`: Trang chỉnh sửa thông tin gian hàng (Form cập nhật logo, banner, thông tin liên hệ).
- `/vendor/products`: Trang danh sách sản phẩm. Sử dụng `DataTable` kết hợp với Toolbar (Nút Thêm mới, Bulk Delete, Filter).
- `/vendor/products/new`: Trang thêm mới sản phẩm. Chứa form, `RichTextEditor`, `ImageUploader`.
- `/vendor/products/:id/edit`: Trang chỉnh sửa sản phẩm. Fetch dữ liệu cũ để điền vào form trước.
- `/vendor/orders`: Trang danh sách đơn hàng đến.
- `/vendor/orders/:id`: Trang chi tiết đơn hàng (Cập nhật trạng thái đơn, In hóa đơn PDF).
- `/vendor/returns`: Trang danh sách các yêu cầu trả hàng cần phê duyệt.
- `/vendor/qa`: Trang quản lý Câu hỏi & Đáp án (Inline reply form).

---

## 4. GIAO ĐIỂM KẾT NỐI VỚI BACKEND (INTEGRATION POINTS)
- **Chuẩn bị FormData:** Khi upload file ảnh, Frontend phải khởi tạo đối tượng `FormData`, append các trường text và append file ảnh dưới key là `images` để Backend (Multer) có thể đọc được.
- **Bảo mật XSS (Cross-Site Scripting):** Dữ liệu trả về từ cột `long_desc` (Mô tả chi tiết) là chuỗi HTML. Frontend khi render cần sử dụng thư viện `dompurify` để sanitize mã HTML trước khi đưa vào `dangerouslySetInnerHTML`.
- **Định dạng Export:** 
  - Với file PDF/CSV tải về, gọi API với `responseType: 'blob'`. 
  - Sau đó Frontend tạo URL ảo (`window.URL.createObjectURL(blob)`) để ép trình duyệt tải file xuống.
