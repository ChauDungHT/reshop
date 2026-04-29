# PROMPT 04: KIỂM THỬ URL QUERY PARAMS VÀ BỘ LỌC

**Vai trò:** Functional Tester
**Nhiệm vụ:** Xác minh tính nhất quán giữa bộ lọc UI và URL trình duyệt.

### Kịch bản kiểm thử:
1.  **Sync URL:** Thao tác chọn Danh mục "Điện tử" và khoảng giá "1M - 5M" trên Sidebar -> Kỳ vọng: Thanh địa chỉ URL thay đổi tương ứng.
2.  **Persistence:** Copy URL đó dán vào một trình duyệt/tab mới -> Kỳ vọng: 
    *   Danh sách sản phẩm phải được lọc đúng như link.
    *   Các checkbox và slider trên Sidebar phải hiển thị đúng vị trí đã chọn từ link.
3.  **Reset:** Bấm nút "Xóa bộ lọc" -> URL và UI phải quay về trạng thái mặc định (không còn query params).

**Kết quả:** Đảm bảo người dùng có thể chia sẻ kết quả tìm kiếm thông qua link URL.
