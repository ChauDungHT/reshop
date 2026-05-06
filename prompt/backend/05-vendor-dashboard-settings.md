# Prompt 05: Dashboard Thống kê & Cài đặt Shop

## Ngữ cảnh
Nhà bán hàng cần cái nhìn tổng quan về tình hình kinh doanh và khả năng cập nhật thông tin cửa hàng.

## Yêu cầu
1. **PUT `/api/vendor/shop`:**
   - Cập nhật thông tin: `name`, `phone`, `address`, `email`, `return_policy_days`, `return_policy_desc`.
   - Xử lý upload `logo_url` và `banner_url`.
2. **GET `/api/vendor/dashboard`:**
   - Tính toán các chỉ số:
     - `total_revenue`: Tổng doanh thu từ các đơn hàng `delivered`.
     - `new_orders`: Số đơn hàng `pending`.
     - `active_products`: Số sản phẩm đang hiển thị.
     - `chart_30_days`: Mảng dữ liệu doanh thu theo ngày trong 30 ngày gần nhất.

## Kiểm tra
- Script `scratch-test-dashboard.js` kiểm tra độ chính xác của các con số thống kê so với dữ liệu trong DB.
