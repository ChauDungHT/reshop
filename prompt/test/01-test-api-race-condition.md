# PROMPT 01: KIỂM THỬ API RACE CONDITION (CONCURRENCY TEST)

**Vai trò:** QA / QC Engineer
**Nhiệm vụ:** Kiểm tra tính toàn vẹn của dữ liệu tồn kho khi có tranh chấp tài nguyên cao.

### Kịch bản kiểm thử:
1.  **Chuẩn bị:** 
    *   Tạo 1 sản phẩm mẫu với `stock = 1`.
    *   Sử dụng Postman Runner, JMeter hoặc Script (Node.js/Python) để gửi đồng thời **10 request POST /api/checkout** mua sản phẩm đó.
2.  **Kết quả kỳ vọng:**
    *   Chỉ có **1 request thành công** (Status 201).
    *   **9 request còn lại thất bại** với mã lỗi `400` hoặc mã lỗi đặc thù `ERR_OUT_OF_STOCK`.
    *   Kiểm tra Database: `stock` của sản phẩm phải bằng `0`, tuyệt đối không được âm.

**Ghi chú:** Đây là bài test quan trọng nhất để check logic `FOR UPDATE` trong Backend.
