# PROMPT 05: KIỂM THỬ QUY TRÌNH TRẢ HÀNG VÀ HẬU MÃI

**Vai trò:** Manual Tester / Business Analyst
**Nhiệm vụ:** Kiểm tra các ràng buộc nghiệp vụ (Business Rules) của quy trình trả hàng.

### Kịch bản kiểm thử:
1.  **Chính sách 7 ngày:** 
    *   Tạo đơn hàng thành công, đổi `delivered_at` lùi về 8 ngày trước.
    *   Vào trang chi tiết đơn hàng -> Kỳ vọng: Nút "Yêu cầu trả hàng" không hiển thị.
2.  **Giới hạn số lượng trả:**
    *   Mua đơn hàng số lượng 2. Trong form trả hàng, nhập số lượng 3 -> Kỳ vọng: Frontend/Backend báo lỗi "Số lượng trả không hợp lệ".
3.  **Điều kiện Review:** 
    *   Truy cập trang review của một sản phẩm chưa mua hoặc chưa được giao thành công -> Kỳ vọng: Bị chặn không cho gửi đánh giá.

**Yêu cầu:** Đảm bảo mọi Business Rule trong `function.md` được thực thi nghiêm ngặt.
