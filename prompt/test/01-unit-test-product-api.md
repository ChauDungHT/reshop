# Prompt 01: Unit Test API — Quản lý Sản phẩm Vendor

## Ngữ cảnh

Dự án dùng **Jest + ts-jest + Supertest** (xem `backend/jest.config.js`). Pattern mock DB đã được thiết lập trong các test hiện có:
- Mock DB: `jest.mock('../../../core/db', () => ({ default: { query: jest.fn(), pool: { connect: jest.fn() } } }))`
- Chạy test: `cd backend && npm test`

**Files cần test:** `backend/src/modules/catalog/product.controller.ts` và route của nó.

**Tạo file:** `backend/src/modules/catalog/__tests__/product.api.test.ts`

## Các test case cần viết

### POST `/api/vendor/products` — Thêm sản phẩm mới
| ID | Scenario | Input | Expected |
|---|---|---|---|
| P01 | Payload hợp lệ | `name`, `price`, `category_id`, `stock` hợp lệ (mock Multer trả về 2 files) | **201 Created** — body chứa `product_id` |
| P02 | Thiếu field `name` | Bỏ trống `name` | **400 Bad Request** — message báo thiếu trường |
| P03 | Thiếu field `price` | Bỏ trống `price` | **400 Bad Request** |
| P04 | `price` âm | `price = -50000` | **400 Bad Request** — "Giá không hợp lệ" |
| P05 | Gọi không có JWT Token | Không gửi header Authorization | **401 Unauthorized** |
| P06 | Gọi bằng token Customer | JWT với `role: 'customer'` | **403 Forbidden** |

### DELETE `/api/vendor/products/bulk` — Soft Delete
| ID | Scenario | Mock DB | Expected |
|---|---|---|---|
| P07 | Xóa sản phẩm không có đơn pending | `{ ids: ['uuid1'] }`, DB mock trả về 0 đơn pending | **200 OK** — `deleted_count: 1`, DB gọi UPDATE với `deleted_at = NOW()` |
| P08 | Xóa sản phẩm đang có đơn `pending` | DB mock trả về 1 đơn pending liên quan | **409 Conflict** — message "Sản phẩm đang nằm trong đơn hàng chưa xử lý" |
| P09 | `ids` là mảng rỗng | `{ ids: [] }` | **400 Bad Request** |

### PUT `/api/vendor/products/bulk-toggle` — Ẩn/Hiện
| ID | Scenario | Expected |
|---|---|---|
| P10 | Toggle `status = 'hidden'` hợp lệ | **200 OK** — `updated_count` > 0 |
| P11 | `status` không hợp lệ (VD: `"deleted"`) | **400 Bad Request** |

## Hướng dẫn mock Multer

```ts
jest.mock('multer', () => {
  const multer = () => ({
    array: () => (req: any, res: any, next: any) => {
      req.files = [
        { originalname: 'p1.jpg', mimetype: 'image/jpeg', filename: 'uuid1.webp', path: '/uploads/products/vendor-id/uuid1.webp' },
      ];
      next();
    }
  });
  multer.diskStorage = () => jest.fn();
  return multer;
});
```

## Chạy và báo cáo

```bash
cd backend
npm test -- --testPathPattern=product.api.test
```

Ghi lại kết quả (pass/fail) và số lượng test case vào `prompt/test/report.md`.
