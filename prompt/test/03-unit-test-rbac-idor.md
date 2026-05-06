# Prompt 03: Unit Test API — Phân quyền & RBAC (IDOR Prevention)

## Ngữ cảnh

Dự án đã có `authMiddleware`, `roleGuard`, `ownerGuard` và test cho chúng tại `backend/src/shared/middlewares/__tests__/middlewares.test.ts`. Prompt này mở rộng test bảo mật sang các **API nghiệp vụ thực tế** để đảm bảo không có lỗ hổng IDOR (Insecure Direct Object Reference) hoặc leo thang đặc quyền.

**Tạo file:** `backend/src/modules/catalog/__tests__/vendor-rbac.test.ts`

## Các test case cần viết

### Kiểm tra Guard Vendor-only Endpoints

Tạo một Express app giả lập gắn tất cả các route `/api/vendor/*`, dùng token JWT khác nhau để test:

```ts
const customerToken = jwt.sign({ id: 'cust-1', role: 'customer' }, secret);
const vendorToken   = jwt.sign({ id: 'vend-1', role: 'vendor', vendor_id: 'shop-1' }, secret);
const adminToken    = jwt.sign({ id: 'adm-1',  role: 'admin' }, secret);
```

| ID | Request | Token | Expected |
|---|---|---|---|
| RBAC01 | `GET /api/vendor/dashboard` | Không có token | **401 Unauthorized** |
| RBAC02 | `GET /api/vendor/dashboard` | `customerToken` | **403 Forbidden** |
| RBAC03 | `GET /api/vendor/dashboard` | `vendorToken` | **200 OK** (hoặc mock DB để không throw) |
| RBAC04 | `POST /api/vendor/products` | Không có token | **401 Unauthorized** |
| RBAC05 | `DELETE /api/vendor/products/bulk` | `customerToken` | **403 Forbidden** |

### Kiểm tra IDOR — Vendor không được thao tác dữ liệu của Vendor khác

| ID | Scenario | Token | Mock DB | Expected |
|---|---|---|---|---|
| IDOR01 | Vendor A approve return request thuộc về sản phẩm của Vendor B | `vendor_id: 'shop-A'` | SELECT trả về `{ vendor_id: 'shop-B' }` | **403 Forbidden** |
| IDOR02 | Vendor A trả lời câu hỏi Q&A cho sản phẩm Vendor B | `vendor_id: 'shop-A'` | SELECT sản phẩm trả về `vendor_id: 'shop-B'` | **403 Forbidden** |
| IDOR03 | Vendor A cập nhật thông tin shop của Vendor B | `PUT /api/vendor/shop` với `vendor_id: 'shop-A'` nhưng DB của Vendor B | **403 Forbidden** |

### Kiểm tra Review Fraud — Vendor tự đánh giá sản phẩm của mình

| ID | Scenario | Mock DB | Expected |
|---|---|---|---|
| FRAUD01 | Vendor gửi review cho sản phẩm thuộc shop của mình | `products.vendor_id` = `req.user.vendor_id` | **403 Forbidden** — "Nhà bán hàng không được phép tự đánh giá" |
| FRAUD02 | Customer gửi review cho sản phẩm của Vendor | `products.vendor_id` ≠ `req.user.id` | **201 Created** (nếu đơn đã delivered) |

## Chạy và báo cáo

```bash
cd backend
npm test -- --testPathPattern=vendor-rbac.test
```

Ghi kết quả vào `prompt/test/report.md`.
