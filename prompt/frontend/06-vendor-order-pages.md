# Prompt 06: Trang Danh sách & Chi tiết Đơn hàng Vendor

## Ngữ cảnh

**API Backend cần dùng:**
- `GET /api/vendor/orders?status=&date_from=&date_to=&page=` → `{ orders: [...], total }`
- `PUT /api/vendor/orders/:id/status` → `{ status, tracking_code? }`
- `GET /api/vendor/orders/:id/pdf` → file stream PDF

**Schema `orders` table:**
```
id, buyer_id, order_code (unique), total_amount,
status (pending|confirmed|processing|shipped|delivered|cancelled|returned),
shipping_address (JSONB: { name, phone, address, city }),
created_at, updated_at
```

**Schema `order_items` table:**
```
id, order_id, product_id, quantity, price_snapshot, created_at
```

## Nhiệm vụ

### 1. Tạo `frontend/storefront/src/pages/vendor/VendorOrderList.tsx`

**Filter bằng URL Params:**
```ts
const status = searchParams.get('status') || '';
const dateFrom = searchParams.get('date_from') || '';
const dateTo = searchParams.get('date_to') || '';
```

**DataTable columns:** Mã đơn | Khách hàng | Tổng tiền | Trạng thái | Ngày đặt | Thao tác (Xem chi tiết).

**`OrderBadge`** (đã có tại `shared-ui/src/components/OrderBadge.tsx`) → dùng để hiển thị trạng thái đơn hàng có màu sắc.

### 2. Tạo `frontend/storefront/src/pages/vendor/VendorOrderDetail.tsx`

**Layout trang:**
- Section thông tin đơn hàng: mã đơn, ngày đặt, địa chỉ giao hàng (`shipping_address` JSONB).
- Bảng sản phẩm: ảnh | tên | số lượng | đơn giá (lấy từ `price_snapshot`) | thành tiền.
- Section tổng tiền.

**Cập nhật trạng thái — Dropdown + Button Xác nhận:**
```tsx
const [newStatus, setNewStatus] = useState('');
const [trackingCode, setTrackingCode] = useState('');

// Hiện input tracking_code khi newStatus === 'shipped'
const handleUpdate = async () => {
  await axiosInstance.put(`/vendor/orders/${id}/status`, {
    status: newStatus,
    tracking_code: trackingCode || undefined,
  });
};
```

> Luồng trạng thái hợp lệ: `pending → confirmed → processing → shipped → delivered`. Dropdown chỉ cho phép chọn trạng thái tiếp theo hợp lệ.

**Tải PDF hóa đơn:**
```ts
const handleDownloadPdf = async () => {
  const res = await axiosInstance.get(`/vendor/orders/${id}/pdf`, {
    responseType: 'blob',
  });
  const url = window.URL.createObjectURL(new Blob([res.data]));
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `invoice-${order.order_code}.pdf`);
  document.body.appendChild(link);
  link.click();
  link.remove();
};
```

## Kiểm tra

- Vào danh sách đơn hàng → filter theo `status=pending` → URL thay đổi, reload giữ filter.
- Vào chi tiết đơn hàng → cập nhật status `confirmed` → badge đổi màu tương ứng.
- Nhấn "Tải hóa đơn PDF" → file PDF được tải xuống.
