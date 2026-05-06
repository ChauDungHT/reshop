# Prompt 02: Unit Test API — Duyệt Trả hàng (Transaction Logic)

## Ngữ cảnh

Đây là test case **quan trọng nhất** của hệ thống vì logic duyệt trả hàng thực hiện **Database Transaction** gồm nhiều bước liên tiếp (hoàn tiền, ghi wallet_transactions, cộng kho). Bất kỳ lỗi nào ở bước giữa phải kéo theo ROLLBACK toàn bộ.

**Controller hiện có:** `backend/src/modules/after-sales/after-sales.controller.ts`
- Hàm `approveReturn` đã được implement với Transaction (`BEGIN`/`COMMIT`/`ROLLBACK`).
- Mock cần dùng `pool.connect()` → trả về `client` với `query`, `release`.

**Tạo file:** `backend/src/modules/after-sales/__tests__/after-sales.api.test.ts`

## Hướng dẫn mock Transaction DB

```ts
// Pattern mock pool.connect() cho transaction
const mockClient = {
  query: jest.fn(),
  release: jest.fn(),
};

jest.mock('../../../core/db', () => ({
  __esModule: true,
  default: {
    query: jest.fn(),
    pool: {
      connect: jest.fn().mockResolvedValue(mockClient),
    },
  },
}));
```

## Các test case cần viết

### PUT `/api/vendor/returns/:id/approve`
| ID | Scenario | Mock DB | Expected |
|---|---|---|---|
| R01 | Duyệt hợp lệ — đơn đang `pending_vendor` | `client.query` mock: (1) SELECT → trả về return request đầy đủ, (2) UPDATE return status, (3) UPDATE wallet, (4) INSERT wallet_transactions, (5) UPDATE stock → tất cả thành công | **200 OK** — `{ success: true }`. Xác nhận `client.query` được gọi đúng 5 lần theo đúng thứ tự. `COMMIT` được gọi. |
| R02 | Return request không tồn tại | `client.query` SELECT → trả về `rows: []` | **500** hoặc **404** với ROLLBACK được gọi |
| R03 | Lỗi ở bước UPDATE wallet (bước 3) | Mock `client.query` lần thứ 3 throw Error | ROLLBACK được gọi. Response trả về **500 Internal Server Error** |
| R04 | Gọi bằng Customer token | JWT `role: 'customer'` | **403 Forbidden** — không bao giờ mở transaction |

### PUT `/api/vendor/returns/:id/reject`
| ID | Scenario | Input | Expected |
|---|---|---|---|
| R05 | Từ chối hợp lệ | `{ reject_reason: "Sản phẩm bị hỏng do lỗi vận chuyển không phải của shop" }` (>20 ký tự) | **200 OK** |
| R06 | `reject_reason` quá ngắn | `{ reject_reason: "Không" }` (<20 ký tự) | **400 Bad Request** — message "Lý do từ chối phải ít nhất 20 ký tự" |
| R07 | Thiếu `reject_reason` | Body rỗng `{}` | **400 Bad Request** |

### POST `/api/after-sales/returns` — Customer yêu cầu trả hàng
| ID | Scenario | Mock DB | Expected |
|---|---|---|---|
| R08 | Đơn hàng `delivered`, trong 7 ngày | `updated_at = now - 3 days`, `status = 'delivered'` | **201 Created** |
| R09 | Đơn hàng chưa `delivered` | `status = 'shipped'` | **400 Bad Request** |
| R10 | Quá 7 ngày kể từ ngày giao | `updated_at = now - 10 days` | **400 Bad Request** — "Đã quá thời hạn 7 ngày" |

## Chạy và báo cáo

```bash
cd backend
npm test -- --testPathPattern=after-sales.api.test
```

Ghi kết quả vào `prompt/test/report.md`.
