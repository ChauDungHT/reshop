# PROMPT 03: LOGIC TÌM KIẾM DEBOUNCE & URL SYNC

**Vai trò:** Frontend Developer
**Nhiệm vụ:** Tối ưu hóa trải nghiệm tìm kiếm và bộ lọc.

### Yêu cầu chi tiết:
1.  **Search Debounce (300ms):**
    *   Sử dụng custom hook `useDebounce`. 
    *   Chỉ gọi API tìm kiếm khi người dùng ngừng gõ sau 300ms để tiết kiệm tài nguyên.
    *   Hiển thị dropdown gợi ý (tối đa 5 kết quả) ngay dưới thanh search.

2.  **URL Query Params Sync:**
    *   Mọi thay đổi trên Filter Sidebar (giá, danh mục, sắp xếp) phải được cập nhật ngay lên thanh địa chỉ URL. 
    *   Ví dụ: `/products?min_price=100&category=2`.
    *   Khi người dùng load lại trang hoặc paste link, UI phải tự động apply các filter này từ URL.

**Output mong đợi:** Hệ thống tìm kiếm mượt mà và bộ lọc có thể chia sẻ (Shareable URLs).
