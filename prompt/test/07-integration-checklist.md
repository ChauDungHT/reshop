# Prompt 07: Integration Checklist — Kiểm tra Tích hợp FE + BE

## Ngữ cảnh

Prompt này tổng hợp **checklist tích hợp** cuối cùng, xác nhận Frontend và Backend đang giao tiếp đúng chuẩn ở tất cả các điểm kết nối quan trọng. Thực hiện **sau khi** tất cả các prompt test 01-06 đã pass.

**Tool cần dùng:** Browser DevTools (F12) → tab Network, tab Console.

## Checklist Tích hợp

### ✅ IC-01: Content-Type Upload Ảnh

| Bước | Kỳ vọng |
|---|---|
| Mở F12 → Network | — |
| Tạo/sửa sản phẩm với ảnh đính kèm, nhấn Lưu | — |
| Nhìn vào request `POST /api/vendor/products` | Header `Content-Type` phải là `multipart/form-data; boundary=...` |

> **Fail condition:** Nếu thấy `application/json` → FE chưa dùng `FormData` đúng cách.

---

### ✅ IC-02: Cấu trúc JWT Token

| Bước | Kỳ vọng |
|---|---|
| Đăng nhập bằng tài khoản Vendor | — |
| Lấy token từ `localStorage['reshop_token']` (Console: `localStorage.getItem('reshop_token')`) | — |
| Decode token tại [jwt.io](https://jwt.io) | Payload phải chứa: `{ id, role: "vendor", vendor_id, name }` |

> **Fail condition:** Thiếu `vendor_id` → các API vendor sẽ không xác định được shop của Vendor.

---

### ✅ IC-03: Hiển thị lỗi từ Backend — Toast Notification

Đối với mỗi lỗi HTTP sau, xác nhận Frontend hiện thông báo đúng:

| HTTP Status | Scenario | FE hiển thị |
|---|---|---|
| **400** | Thiếu field bắt buộc | Toast đỏ với nội dung từ `message` của BE |
| **401** | Token hết hạn / không có | Redirect tự động về `/login` |
| **403** | Sai role / IDOR | Toast đỏ "Bạn không có quyền thực hiện thao tác này" |
| **409** | Conflict (xóa SP có đơn pending) | Toast đỏ với message cụ thể từ BE |
| **500** | Server error | Toast đỏ "Có lỗi xảy ra, vui lòng thử lại" (KHÔNG hiện stack trace) |

---

### ✅ IC-04: Đường dẫn ảnh sau Upload

| Bước | Kỳ vọng |
|---|---|
| Tạo sản phẩm với 2 ảnh | — |
| Kiểm tra DB: `SELECT image_urls FROM products ORDER BY created_at DESC LIMIT 1;` | Mảng JSON chứa đường dẫn `/uploads/products/{vendor_id}/{uuid}.webp` |
| Mở đường dẫn đó trong trình duyệt: `http://localhost:8000/uploads/products/...` | Ảnh hiển thị được (server có serve static files) |

---

### ✅ IC-05: Transaction Hoàn tiền — Tính nhất quán dữ liệu

| Bước | Kỳ vọng |
|---|---|
| Ghi nhớ `wallet_balance` của buyer và `stock` sản phẩm | — |
| Vendor phê duyệt 1 return request (qua UI hoặc Postman) | — |
| Kiểm tra DB: `SELECT wallet_balance FROM users WHERE id = '{buyer_id}';` | Tăng đúng = `price_snapshot * quantity` |
| Kiểm tra DB: `SELECT stock FROM products WHERE id = '{product_id}';` | Tăng đúng = `quantity` của order_item |
| Kiểm tra DB: `SELECT * FROM wallet_transactions WHERE ref_id = '{return_id}';` | Có 1 bản ghi `type = 'refund'` với `amount` đúng |

---

### ✅ IC-06: PDF Download — Blob Handling

| Bước | Kỳ vọng |
|---|---|
| Nhấn "Tải hóa đơn" trong chi tiết đơn hàng | File PDF được tải xuống |
| F12 → Network → request `/api/vendor/orders/:id/pdf` | Response header: `Content-Type: application/pdf` |
| Nếu FE nhận sai (text thay vì blob) | Kiểm tra axios call có `responseType: 'blob'` không |

## Tổng hợp báo cáo

Cập nhật `prompt/test/report.md` với:
- Tổng số checklist: 6 mục
- Số mục Pass / Fail
- Mô tả chi tiết các mục Fail và đề xuất fix
