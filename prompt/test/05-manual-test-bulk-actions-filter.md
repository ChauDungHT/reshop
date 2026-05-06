# Prompt 05: Manual Test UI — Bulk Actions & URL Filter State

## Ngữ cảnh

**Điều kiện tiên quyết:**
- Server backend + frontend đang chạy.
- Đã đăng nhập bằng tài khoản Vendor.
- Vendor có ít nhất **5 sản phẩm** trong DB (kiểm tra: `GET /api/vendor/products` trả về >= 5 items).
- Ít nhất 1 sản phẩm đang `active`, 1 sản phẩm đang `hidden`.

## Test Cases

### TC-UI-06: Bulk Toggle — Ẩn nhiều sản phẩm

**Các bước:**
1. Vào `/vendor/products`.
2. Tick checkbox ở dòng đầu tiên của danh sách.
3. Tick tiếp checkbox dòng thứ 2.
4. Nhấn nút **"Ẩn sản phẩm"** trên toolbar.

**Kỳ vọng:**
- Loading indicator xuất hiện trong lúc gọi API.
- Sau khi API trả về: danh sách tải lại, cột Trạng thái của 2 sản phẩm đó chuyển thành `hidden`.
- **Toolbar Bulk Action tự động biến mất** (hoặc reset: không còn item nào được chọn).
- API call (F12 Network): `PUT /api/vendor/products/bulk-toggle` với payload `{ ids: [...], status: "hidden" }` → **200 OK**.

---

### TC-UI-07: Bulk Delete — Xóa mềm sản phẩm

**Các bước:**
1. Tick chọn 2 sản phẩm.
2. Nhấn **"Xóa đã chọn"**.
3. Xác nhận trong dialog "Bạn có chắc chắn muốn xóa 2 sản phẩm này không?".

**Kỳ vọng:**
- 2 sản phẩm biến mất khỏi danh sách.
- Kiểm tra DB: `SELECT status, deleted_at FROM products WHERE id IN ('...', '...')` → `status = 'deleted'`, `deleted_at` có giá trị (KHÔNG phải bị xóa hoàn toàn).
- Toolbar reset, không còn item được chọn.

---

### TC-UI-08: Bulk Delete — Sản phẩm có đơn hàng pending

**Điều kiện:** Cần 1 sản phẩm đang có đơn hàng `status = 'pending'`.

**Các bước:**
1. Tick chọn sản phẩm đó.
2. Nhấn "Xóa đã chọn" và xác nhận.

**Kỳ vọng:**
- API trả về **409 Conflict**.
- Frontend hiển thị **Toast/Alert** thông báo lỗi rõ ràng: "Không thể xóa: Sản phẩm đang nằm trong đơn hàng chưa xử lý".
- Danh sách **không thay đổi** (sản phẩm vẫn còn đó).

---

### TC-UI-09: Filter URL Params — Persistence sau Reload

**Các bước:**
1. Trên trang `/vendor/products`, chọn filter `status = active` từ dropdown.
2. Nhập từ khóa tìm kiếm "cầu lông" vào input search.
3. Kiểm tra URL thanh địa chỉ trình duyệt.

**Kỳ vọng:** URL thay đổi thành `/vendor/products?status=active&q=c%E1%BA%A7u+l%C3%B4ng`.

---

**Các bước (tiếp):**
4. Copy URL ở bước trên.
5. Mở tab mới trong trình duyệt, paste URL vào và nhấn Enter.

**Kỳ vọng:** Trang tải với đúng filter đã chọn — danh sách hiện các sản phẩm `active` có chứa "cầu lông". **Không bị reset về mặc định.**

---

### TC-UI-10: Select All / Deselect All

**Các bước:**
1. Tick vào **header checkbox** (Select All) của DataTable.

**Kỳ vọng:** Tất cả rows trong trang hiện tại được chọn. Toolbar Bulk Action xuất hiện với số lượng đúng.

---

**Các bước:**
2. Tick lại header checkbox (Deselect All).

**Kỳ vọng:** Tất cả rows bỏ chọn. Toolbar Bulk Action biến mất.

## Báo cáo

Ghi lại kết quả (Pass/Fail) vào `prompt/test/report.md`.
