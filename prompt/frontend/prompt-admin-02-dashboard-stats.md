# Prompt: Implement Admin Dashboard KPI Cards and Charts

## Context
The Admin Dashboard provides a high-level overview of the platform's health. We need to display key performance indicators (KPIs) and visual data charts.

## Reference
- API Endpoint: `GET /api/admin/dashboard/stats`, `GET /api/admin/dashboard/charts`
- Library: **Recharts**.

## Requirements

### 1. KPI Cards
- Display 4 main metrics at the top:
  - **Tổng doanh thu**: formatted as VND.
  - **Đơn hàng mới hôm nay**: counter badge.
  - **Người dùng hoạt động**: count.
  - **Sản phẩm đang bán**: count.
- Each card should have an icon and a subtle hover effect.

### 2. Revenue Chart (LineChart)
- Use `Recharts.LineChart` to show revenue trends.
- Support a global date range filter (7 days, 30 days, 1 year) that updates the query.

### 3. Order Status Distribution (PieChart)
- Use `Recharts.PieChart` to show the breakdown of orders by status (Pending, Delivered, Cancelled, etc.).

### 4. Top Rankings
- Simple tables for:
  - Top 5 Shops by Revenue.
  - Top 5 Products by Sales.

## Expected Output
- `AdminDashboard.tsx`
- `StatCard.tsx`
- `RevenueChart.tsx`
- Integration with React Query for data fetching.

## Verification
- Charts should be responsive.
- Hovering over chart points should show tooltips with formatted values.
