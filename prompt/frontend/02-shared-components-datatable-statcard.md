# Prompt 02: Shared UI Components — DataTable, StatCard

## Ngữ cảnh

Dự án dùng monorepo, các component dùng chung nằm tại `frontend/shared-ui/src/components/`. Hiện tại đã có `ProductCard`, `OrderStepper`, `OrderBadge`, `QuantitySelector`. Cần thêm 2 component tái sử dụng cho toàn bộ trang Vendor: **DataTable** và **StatCard**.

Axios instance đã được cấu hình tại `frontend/shared-ui/src/lib/axios.ts` (baseURL `http://localhost:8000/api`, tự động gắn JWT từ `localStorage['reshop_token']`).

## Nhiệm vụ

### 1. Tạo `frontend/shared-ui/src/components/StatCard.tsx`

Props interface:
```ts
interface StatCardProps {
  label: string;
  value: string | number;
  icon: string;          // emoji hoặc icon component
  accent?: string;       // Tailwind color class, ví dụ: 'text-emerald-400'
  sub?: string;          // dòng phụ (VD: "+12.4% so với tháng trước")
  trend?: 'up' | 'down'; // mũi tên chỉ xu hướng
}
```

Thiết kế: card tối nền `bg-slate-900`, border `border-slate-800`, hover effect nhẹ. Icon nằm góc phải, số liệu nằm bên trái nổi bật. Nếu `trend='up'` → hiện ▲ màu xanh, `trend='down'` → hiện ▼ màu đỏ.

### 2. Tạo `frontend/shared-ui/src/components/DataTable.tsx`

Props interface:
```ts
interface Column<T> {
  key: keyof T;
  header: string;
  render?: (value: any, row: T) => React.ReactNode; // custom cell render
  sortable?: boolean;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  selectable?: boolean;          // hiện checkbox
  onSelectionChange?: (ids: string[]) => void; // trả về mảng ID đã chọn
  pagination?: {
    total: number;
    page: number;
    limit: number;
    onPageChange: (page: number) => void;
  };
  loading?: boolean;
  emptyText?: string;
}
```

Yêu cầu hành vi:
- Header checkbox "Select All" → chọn/bỏ chọn tất cả row đang hiển thị.
- Mỗi row có checkbox riêng (chỉ khi `selectable=true`).
- Sort: click header cột `sortable=true` → callback hoặc local sort.
- Skeleton loading khi `loading=true`.
- Pagination: hiện `Trang {page}/{totalPages}`, nút Trước / Tiếp theo.

### 3. Cập nhật `frontend/shared-ui/src/components/index.ts`

Export 2 component mới:
```ts
export { default as StatCard } from './StatCard';
export { default as DataTable } from './DataTable';
```

## Kiểm tra

- Import `StatCard` vào `VendorDashboard.tsx` và render thử với dữ liệu cứng.
- Import `DataTable` với dữ liệu giả 5 dòng, kiểm tra checkbox và pagination render đúng.
