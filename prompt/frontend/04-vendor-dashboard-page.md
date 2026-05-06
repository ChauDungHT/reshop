# Prompt 04: Trang Dashboard Vendor (Kết nối API thật)

## Ngữ cảnh

File `frontend/storefront/src/pages/dashboard/VendorDashboard.tsx` đã tồn tại với dữ liệu **mock cứng**. Cần kết nối với API thật của Backend và bổ sung biểu đồ doanh thu.

**API Backend (đã có):**
- `GET /api/vendor/dashboard` → `{ total_revenue, new_orders, active_products, chart_30_days: [{ date, revenue }] }`

**Thư viện đã cài:** `@tanstack/react-query` (đã dùng trong file hiện tại).

## Nhiệm vụ

### 1. Cập nhật `VendorDashboard.tsx`

**Thay mock data bằng `useQuery`:**
```ts
const { data: stats, isLoading } = useQuery({
  queryKey: ['vendor-dashboard'],
  queryFn: async () => (await axiosInstance.get('/vendor/dashboard')).data,
  staleTime: 5 * 60 * 1000, // 5 phút
  refetchOnWindowFocus: true,
});
```

**Thay `MetricCard` inline bằng `StatCard`** (component từ Prompt 02):
```tsx
import { StatCard } from '../../../../shared-ui/src/components';
```

**Skeleton loading:** Khi `isLoading=true` → hiện 4 ô skeleton thay cho StatCard.

### 2. Tạo `frontend/shared-ui/src/components/RevenueChart.tsx`

**Cài đặt:**
```bash
npm install recharts
```

**Props:**
```ts
interface RevenueChartProps {
  data: { date: string; revenue: number }[];
  loading?: boolean;
}
```

**Render:** `LineChart` từ Recharts với:
- Trục X: ngày (format `DD/MM`).
- Trục Y: doanh thu (format `{value / 1_000_000}M`).
- Tooltip khi hover: hiện ngày + doanh thu đầy đủ.
- Responsive qua `ResponsiveContainer`.

**Export:** Thêm vào `index.ts`.

### 3. Tích hợp vào `VendorDashboard.tsx`

```tsx
<RevenueChart data={stats?.chart_30_days ?? []} loading={isLoading} />
```

## Kiểm tra

- Đăng nhập vendor → vào `/vendor/dashboard` → StatCards hiện dữ liệu thật từ DB.
- Biểu đồ render đủ 30 điểm dữ liệu, tooltip hoạt động.
- Tắt server → component hiện lỗi (không crash trắng trang).
