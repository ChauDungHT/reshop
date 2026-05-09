# [FRONTEND TEAM] - MODULE 4: SUPER ADMIN (QUẢN TRỊ SÀN)

## 1. UI COMPONENTS (React + Tailwind)

### 1.1 Layout & Navigation
- **AdminLayout**: Wrapper chứa Sidebar (trái) và Header (trên), Content (phải).
- **SidebarMenu**: Accordion menu (Quản lý User, Sản phẩm, Danh mục, Tranh chấp, Thống kê).
- **AdminHeader**: Hiển thị Breadcrumbs, nút Profile và Thông báo Admin.

### 1.2 Data & Logic Components
- **AdminDataGrid**: Component bảng dùng chung, hỗ trợ:
  - Phân trang (Pagination).
  - Tìm kiếm (Search bar).
  - Lọc (Filters dropdown).
  - Nút Export CSV.
- **CategoryTree**: Component hiển thị cây danh mục, hỗ trợ kéo thả (Dnd-kit hoặc React-beautiful-dnd) để sắp xếp `sort_order`.
- **DashboardCharts**: Sử dụng **Recharts**:
  - `LineChart`: Thống kê doanh thu theo thời gian.
  - `PieChart`: Tỷ lệ đơn hàng theo trạng thái.

---

## 2. QUẢN LÝ STATE & ROUTING

### 2.1 State Management (React Query)
- **Nested Categories State**: Khi cập nhật `parent_id` qua kéo thả, invalidate query `['categories', 'tree']`.
- **Global Date Filter**: Lưu `startDate`, `endDate` trong URL params để tất cả biểu đồ Dashboard tự động đồng bộ.

### 2.2 Pages & Routing
| Path | Component | Yêu cầu logic |
| :--- | :--- | :--- |
| `/admin/dashboard` | `AdminDashboard` | Thẻ KPI + 2 biểu đồ chính. |
| `/admin/users` | `UserManagement` | Tab: All, Pending Vendors, Banned. |
| `/admin/categories` | `CategoryManagement` | TreeView + Form Add/Edit Category. |
| `/admin/disputes` | `DisputeManagement` | Danh sách tranh chấp escalated. |

- **AdminRouteGuard**: HOC hoặc Wrapper component kiểm tra `user.role === 'admin'`. Nếu không phải, redirect về `/403`.

---

## 3. FLOW XỬ LÝ CHÍNH

1.  **Phê duyệt Vendor**: 
    - Xem chi tiết hồ sơ -> Bấm "Approve" -> Gọi API -> Hiện Toast thông báo thành công -> Invalidate danh sách.
2.  **Kéo thả Danh mục**:
    - Khi kết thúc kéo (onDragEnd) -> Tính toán `parent_id` và `sort_order` mới -> Gọi API Bulk Update -> Cập nhật UI lạc quan (Optimistic Update).
3.  **Xử lý Tranh chấp**:
    - Hiển thị đầy đủ bằng chứng ảnh + lịch sử chat (nhúng từ Module 7) -> Form phán quyết (Chọn bên thắng + Ghi chú) -> Submit.
