# Prompt: Implement Admin Analytics & Reporting APIs

## Context
Admins need a high-level view of the platform's performance. This includes real-time KPIs, visual charts, and the ability to export raw data for external auditing.

## Reference
- Database Schema: `backend/database/schema.sql` (Tables: `orders`, `users`, `vendors`, `products`, `wallet_transactions`)

## Requirements

### 1. GET /api/admin/dashboard/stats
- **KPIs to calculate**:
  - `total_revenue`: Sum of `total_amount` from all orders with status 'delivered'.
  - `new_orders_today`: Count of orders created today.
  - `active_users`: Count of users with status 'active'.
  - `active_vendors`: Count of vendors with status 'active'.
  - `total_products`: Count of products.

### 2. GET /api/admin/dashboard/charts
- **Parameters**: `range` ('7d', '30d', '1y').
- **Line Chart Data**: Revenue grouped by day/month.
- **Pie Chart Data**: Orders count grouped by `status`.
- **Top Lists**:
  - Top 10 Shops by revenue.
  - Top 10 Products by sales count.

### 3. GET /api/admin/reports/orders/export
- **Parameters**: `startDate`, `endDate`.
- **Logic**: 
  - Fetch orders within the date range.
  - Convert JSON data to CSV format (using `json2csv` or similar).
  - Set response headers for file download: `Content-Type: text/csv`, `Content-Disposition: attachment; filename=orders_report.csv`.

## Verification
- Verify the math for `total_revenue` matches the DB.
- Ensure the CSV export includes all required columns (Date, Code, Shop, Total, Status).
- Check that the date range filtering is accurate.
