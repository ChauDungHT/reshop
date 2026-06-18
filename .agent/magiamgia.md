Đã đọc xong cả schema lẫn function spec. Dưới đây là câu trả lời chốt và kế hoạch đầy đủ.

---

## ✅ Đáp án chốt cho từng câu hỏi

**A. Ai chịu chi phí giảm giá?**
→ **Chủ shop (Vendor) tự chịu 100%.** Giá trị mã được trừ vào `vendor_discount` trong bảng `sub_orders`. Sàn không bù tiền.

**B. Cơ chế hiển thị và thu thập mã?**
→ **Mã công khai (Public).** Hiển thị tại trang chi tiết sản phẩm và trang giỏ hàng. User bấm "Lưu" để thu thập vào ví voucher, hoặc hệ thống tự gợi ý mã tốt nhất khi checkout.

**C. Có cho phép stacking nhiều mã không?**
→ **Không.** Mỗi sub-order (mỗi shop trong giỏ) chỉ được áp dụng **1 mã duy nhất**.

**D. Vòng đời đơn hàng ứng với mã — xử lý ngoại lệ:**

| Tình huống | Quyết định |
|---|---|
| User bấm "Đặt hàng", chờ thanh toán VNPay/MoMo | **Khóa mã ngay** khi tạo đơn (`status = 'reserved'`). Timeout = **15 phút**. Hết timeout nếu chưa thanh toán → tự động giải phóng mã về kho. |
| Hủy đơn trước khi thanh toán | Giải phóng mã ngay lập tức → trả về ví voucher của user. |
| Hủy đơn sau khi đã thanh toán (VNPay confirmed) | Giải phóng mã → trả về ví voucher của user (vì user đã không được hưởng lợi từ mã). |
| Hoàn tiền (return/refund) sau khi delivered | **Không trả lại mã** — mã đã được sử dụng thành công, chỉ hoàn tiền thực tế đã thanh toán. |

---

## 📋 Kế hoạch Module Mã Giảm Giá — Backend → Frontend

### 1. Database Schema

```sql
-- Bảng định nghĩa mã giảm giá
CREATE TYPE CouponType AS ENUM ('percentage', 'fixed');
CREATE TYPE CouponStatus AS ENUM ('active', 'inactive', 'expired');

CREATE TABLE coupons (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vendor_id       UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
    code            VARCHAR(50) UNIQUE NOT NULL,          -- VD: YONEX20
    name            VARCHAR(150) NOT NULL,                -- "Giảm 20% cho vợt Yonex"
    type            CouponType NOT NULL,                  -- 'percentage' | 'fixed'
    value           DECIMAL(15,2) NOT NULL,               -- 20 (%) hoặc 50000 (VNĐ)
    min_order_value DECIMAL(15,2) DEFAULT 0,              -- đơn tối thiểu
    max_discount    DECIMAL(15,2) DEFAULT NULL,           -- trần giảm tối đa (cho %)
    total_quantity  INT DEFAULT NULL,                     -- NULL = không giới hạn
    used_count      INT DEFAULT 0,
    per_user_limit  INT DEFAULT 1,                        -- mỗi user dùng tối đa N lần
    starts_at       TIMESTAMP WITH TIME ZONE NOT NULL,
    expires_at      TIMESTAMP WITH TIME ZONE NOT NULL,
    status          CouponStatus DEFAULT 'active',
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Ví voucher của user (đã thu thập)
CREATE TYPE UserCouponStatus AS ENUM ('collected', 'reserved', 'used', 'expired');

CREATE TABLE user_coupons (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    coupon_id   UUID NOT NULL REFERENCES coupons(id) ON DELETE CASCADE,
    status      UserCouponStatus DEFAULT 'collected',
    reserved_at TIMESTAMP WITH TIME ZONE,   -- thời điểm khóa
    used_at     TIMESTAMP WITH TIME ZONE,
    order_id    UUID REFERENCES orders(id) ON DELETE SET NULL,
    UNIQUE(user_id, coupon_id)
);

-- Index
CREATE INDEX idx_coupons_vendor_id ON coupons(vendor_id);
CREATE INDEX idx_coupons_code ON coupons(code);
CREATE INDEX idx_user_coupons_user_id ON user_coupons(user_id);
CREATE INDEX idx_user_coupons_status ON user_coupons(status);
```

`sub_orders.vendor_discount` đã có sẵn trong schema → dùng luôn để ghi giá trị giảm.

---

### 2. Backend API

#### 2.1 Vendor quản lý mã (Vendor Dashboard)

| Method | Endpoint | Mô tả |
|---|---|---|
| `GET` | `/api/vendor/coupons` | Danh sách mã của shop |
| `POST` | `/api/vendor/coupons` | Tạo mã mới |
| `PATCH` | `/api/vendor/coupons/:id` | Sửa mã (chỉ khi chưa có ai dùng) |
| `DELETE` | `/api/vendor/coupons/:id` | Xóa / vô hiệu hóa mã |
| `GET` | `/api/vendor/coupons/:id/stats` | Thống kê lượt dùng |

#### 2.2 Customer tương tác

| Method | Endpoint | Mô tả |
|---|---|---|
| `GET` | `/api/products/:id/coupons` | Mã public của shop hiện tại sản phẩm |
| `POST` | `/api/coupons/collect` | Thu thập mã vào ví `{ coupon_code }` |
| `GET` | `/api/me/coupons` | Danh sách ví voucher của user |
| `POST` | `/api/coupons/validate` | Kiểm tra mã hợp lệ trước khi apply `{ coupon_id, sub_order_items[] }` |
| `POST` | `/api/orders` | Đặt hàng — truyền `coupon_id` per vendor, backend reserve ngay |

#### 2.3 Logic quan trọng ở Backend

**Validate & Reserve khi đặt hàng:**
```
POST /api/orders  →  trong transaction:
  1. Kiểm tra coupon: còn hàng, chưa hết hạn, user chưa dùng quá per_user_limit
  2. Tính discount → ghi vào sub_orders.vendor_discount
  3. UPDATE user_coupons SET status='reserved', reserved_at=now()
  4. Tạo order, sub_orders, order_items
  5. Trả về order_id
```

**Release mã (cron job mỗi 5 phút):**
```sql
UPDATE user_coupons 
SET status = 'collected', reserved_at = NULL
WHERE status = 'reserved'
  AND reserved_at < now() - INTERVAL '15 minutes'
  AND order_id NOT IN (SELECT id FROM orders WHERE payment_status = 'paid');
```

**Khi thanh toán thành công (VNPay IPN callback):**
```
UPDATE user_coupons SET status='used', used_at=now() WHERE order_id = :orderId
```

**Khi hủy đơn / hoàn tiền trước delivered:**
```
UPDATE user_coupons SET status='collected', reserved_at=NULL, order_id=NULL 
WHERE order_id = :orderId AND status IN ('reserved', 'used')
-- Chỉ hoàn mã nếu chưa delivered
```

---

### 3. Frontend

#### 3.1 Trang chi tiết sản phẩm
- Section "Mã giảm giá của shop" — hiển thị tối đa 3 mã active.
- Mỗi mã: badge code, mô tả ngắn, hạn dùng, nút **"Lưu"** (gọi `POST /api/coupons/collect`).
- Nếu đã lưu → hiển thị ✓ "Đã lưu".

#### 3.2 Trang giỏ hàng
- Mỗi nhóm shop có ô **"Chọn mã giảm giá"** → mở bottom sheet / dropdown.
- Hiển thị danh sách mã trong ví của user phù hợp với shop đó.
- Gợi ý tự động mã giảm được nhiều nhất (gọi `POST /api/coupons/validate`).
- Hiển thị số tiền tiết kiệm realtime khi chọn mã.

#### 3.3 Trang checkout
- Tóm tắt mã đã chọn per shop, hiển thị dòng `-{discount}` trong bảng tính tiền.
- Nếu mã hết trong lúc checkout → toast cảnh báo "Mã không còn khả dụng", tự bỏ chọn.

#### 3.4 Trang ví voucher (`/me/coupons`)
- Tabs: **Có thể dùng / Đã dùng / Hết hạn**
- Mỗi thẻ voucher: logo shop, tên mã, điều kiện, countdown hết hạn.

---

### 4. Thứ tự triển khai (Sprint)

**Sprint 1 — Backend core:**
1. Migration tạo bảng `coupons`, `user_coupons`
2. API Vendor CRUD mã
3. API `collect`, `validate`, tích hợp vào `POST /api/orders`
4. VNPay IPN → mark `used`
5. Cron job release timeout

**Sprint 2 — Frontend:**
1. Section mã ở product detail
2. Coupon picker ở cart
3. Hiển thị discount ở checkout
4. Trang ví voucher

**Sprint 3 — Vendor dashboard:**
1. Trang tạo/quản lý mã
2. Thống kê lượt dùng