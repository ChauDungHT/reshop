# PROMPT 02: API DUYỆT & TÌM KIẾM SẢN PHẨM

**Vai trò:** Back-end Developer
**Nhiệm vụ:** Xây dựng các API phục vụ việc duyệt và tìm kiếm sản phẩm cho Customer.

### Yêu cầu chi tiết:
1.  **GET /api/products**:
    *   Hỗ trợ filter theo `category_id`, `min_price`, `max_price`.
    *   Hỗ trợ flag `is_featured` để lấy sản phẩm nổi bật cho trang chủ.
    *   Hỗ trợ tìm kiếm từ khóa `q` bằng PostgreSQL `ILIKE` trên trường `name` và `description`.
    *   Sắp xếp (`sort`): `price_asc`, `price_desc`, `latest`, `rating`.
    *   Phân trang (Pagination) mặc định 20 item.

2.  **GET /api/products/:id**:
    *   Trả về chi tiết sản phẩm + thông tin Shop (join với bảng vendors).
    *   Gợi ý 4 sản phẩm liên quan (cùng category).

3.  **Ghi log:** Tuân thủ chuẩn `[catalog]: Action - Status - [Detail]` từ file `.agent/log.md`.

**Output mong đợi:** Các Route và Controller hoàn chỉnh trong `backend/src/modules/catalog/`.
