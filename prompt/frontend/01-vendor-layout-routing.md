# Prompt 01: Cập nhật VendorLayout & Routing Vendor

## Ngữ cảnh

Ứng dụng hiện có `DashboardLayout` (`frontend/shared-ui/src/layouts/DashboardLayout.tsx`) là layout chung cho tất cả vai trò (customer, vendor, admin). Hiện tại, sidebar của vendor chỉ có 3 mục đơn giản và **chưa đủ navigation** cho đầy đủ các trang vendor. Routing vendor cũng chưa được khai báo trong `frontend/storefront/src/App.tsx`.

## Nhiệm vụ

### 1. Cập nhật `DashboardLayout.tsx` — Nav items cho Vendor

Cập nhật mảng `navByRole.vendor` để bổ sung đầy đủ các mục sidebar:

```ts
vendor: [
  { label: 'Dashboard',    path: '/vendor/dashboard',   icon: '📊' },
  { label: 'Sản phẩm',    path: '/vendor/products',    icon: '🗂' },
  { label: 'Đơn hàng',    path: '/vendor/orders',      icon: '📦' },
  { label: 'Trả hàng',    path: '/vendor/returns',     icon: '↩️' },
  { label: 'Hỏi & Đáp',  path: '/vendor/qa',          icon: '💬' },
  { label: 'Gian hàng',   path: '/vendor/shop-profile',icon: '🏪' },
]
```

> **Lưu ý:** Sidebar đã có Badge 🔔 placeholder nhưng chưa có data thật. Thêm Badge số lượng (inline) vào mục **Trả hàng** và **Đơn hàng** — tạm thời để props hoặc state cứng, sẽ kết nối API ở bước sau.

### 2. Cập nhật routing trong `frontend/storefront/src/App.tsx`

Trong block `<Route element={<PrivateRoute />}>` → `<Route element={<DashboardLayout />}>`, thêm các route cho vendor:

```tsx
{/* Vendor Routes */}
<Route element={<RoleRoute allowedRoles={['vendor']} />}>
  <Route path="/vendor/dashboard"    element={<VendorDashboard />} />
  <Route path="/vendor/shop-profile" element={<VendorShopProfile />} />
  <Route path="/vendor/products"     element={<VendorProductList />} />
  <Route path="/vendor/products/new" element={<VendorProductForm />} />
  <Route path="/vendor/products/:id/edit" element={<VendorProductForm />} />
  <Route path="/vendor/orders"       element={<VendorOrderList />} />
  <Route path="/vendor/orders/:id"   element={<VendorOrderDetail />} />
  <Route path="/vendor/returns"      element={<VendorReturnList />} />
  <Route path="/vendor/qa"           element={<VendorQAPage />} />
</Route>
```

> **Lưu ý:** Các Page components chưa tồn tại — tạm thời tạo placeholder stub (`const XxxPage = () => <div>Coming soon</div>`) để routing không bị lỗi. Các prompt tiếp theo sẽ implement từng trang.

## Cấu trúc file mới

```
frontend/storefront/src/pages/vendor/
├── VendorShopProfile.tsx    ← stub
├── VendorProductList.tsx    ← stub
├── VendorProductForm.tsx    ← stub
├── VendorOrderList.tsx      ← stub
├── VendorOrderDetail.tsx    ← stub
├── VendorReturnList.tsx     ← stub
└── VendorQAPage.tsx         ← stub
```

## Kiểm tra

- Đăng nhập bằng tài khoản Vendor, vào `/vendor/dashboard` → không bị redirect về `/forbidden`.
- Nhấn các mục Sidebar → URL thay đổi tương ứng.
- Đăng nhập bằng Customer → truy cập `/vendor/dashboard` → nhận trang Forbidden.
