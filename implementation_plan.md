# Kế hoạch triển khai Hệ thống Hạng phí Vendor (Fee Tiers) và Khấu trừ Dòng tiền

Kế hoạch này mô tả các bước chi tiết để chuyển đổi cơ chế tính phí commission phẳng (flat 5%) sang hệ thống tính phí động theo hạng gói (Fee Tiers) gồm cả phí cố định (fixed) và phí phần trăm (percentage) khi đơn hàng hoàn thành, dựa trên yêu cầu trong tài liệu [phiSanPham.md](file:///e:/cd/reshop/prompt/phiSanPham.md).

---

## User Review Required

> [!IMPORTANT]
> **1. Thay đổi cấu trúc cơ sở dữ liệu:**
> * Cần chạy migration tạo mới 2 bảng `fee_tiers` (danh mục hạng phí) và `fee_tier_items` (cấu hình chi tiết các khoản phí cố định/phần trăm).
> * Bổ sung trường `fee_tier_id` vào bảng `vendors` để xác định gói phí của từng shop.
> 
> **2. Tác động tới luồng tính tiền khả dụng (Net Amount):**
> * Khi đơn hàng chuyển sang `delivered` hoặc được tất toán ví, số tiền thực nhận của Vendor sẽ tự động giảm đi cả phí phần trăm và phí cố định tương ứng theo hạng phí mà Vendor đang được gán.
> * Giá trị mặc định khi tạo mới shop sẽ là **Hạng Thường (Standard Tier)** (5% phí sàn + 2.000đ phí cố định mỗi đơn hàng).

---

## Open Questions

> [!NOTE]
> **Về việc cập nhật số dư đóng băng (`pending_balance`):**
> * Khi đơn hàng chuyển sang `delivered`, số tiền chuyển vào `pending_balance` sẽ là **số tiền sau khi khấu trừ tất cả các khoản phí theo gói** (Net Amount). Nhờ đó, `pending_balance` luôn phản ánh đúng giá trị thực mà Vendor sẽ nhận được khi hoàn tất tất toán, giảm thiểu rủi ro tính toán sai lệch khi giải phóng tiền.

---

## Proposed Changes

Chúng ta sẽ chia nhỏ việc thực thi thành 4 Phase:

### Phase 1: Database Migration (Nâng cấp Schema)

Tạo các bảng cấu hình gói phí và cập nhật liên kết trong bảng `vendors`.

#### [NEW] [003_create_fee_tiers.sql](file:///e:/cd/reshop/backend/database/migrations/003_create_fee_tiers.sql)
1. Tạo bảng `fee_tiers`:
   * `id` UUID PRIMARY KEY DEFAULT gen_random_uuid()
   * `tier_name` VARCHAR(50) UNIQUE NOT NULL
   * `description` TEXT
   * `created_at` & `updated_at` TIMESTAMP WITH TIME ZONE DEFAULT now()
2. Tạo bảng `fee_tier_items` để cấu hình chi tiết các loại phí:
   * `id` UUID PRIMARY KEY DEFAULT gen_random_uuid()
   * `fee_tier_id` UUID REFERENCES fee_tiers(id) ON DELETE CASCADE
   * `fee_name` VARCHAR(100) NOT NULL
   * `fee_type` VARCHAR(20) NOT NULL (chấp nhận: 'percentage', 'fixed')
   * `fee_value` DECIMAL(10, 2) NOT NULL
3. Thêm cột `fee_tier_id` vào bảng `vendors` liên kết khóa ngoại với `fee_tiers(id)`.

---

### Phase 2: Database Seeding (Nạp dữ liệu cấu hình mẫu)

Cập nhật các seeder để khởi tạo các hạng phí mặc định cho hệ thống và các shop hiện tại.

#### [MODIFY] [seed-master.js](file:///e:/cd/reshop/backend/database/seeds/seed-master.js)
1. Thêm logic tạo 2 hạng phí chính:
   * **Hạng Thường (Standard Tier):** 
     * Phí sàn phần trăm: `percentage` với giá trị `5.0` (5%)
     * Phí cố định: `fixed` với giá trị `2000.00` (2.000đ)
   * **Hạng Đã Xác Thực (Verified Tier):** 
     * Phí sàn phần trăm: `percentage` với giá trị `3.0` (3%)
     * Phí cố định: `fixed` với giá trị `1000.00` (1.000đ)
2. Gán mặc định `fee_tier_id` của "Hạng Thường" cho các shop được tạo ra trong quá trình seeding.

---

### Phase 3: Xây dựng Helper tính phí & Cập nhật các Controller

Xây dựng module tính phí động tập trung và tích hợp vào các luồng xử lý tài chính.

#### [NEW] [fee-calculator.ts](file:///e:/cd/reshop/backend/src/shared/fee-calculator.ts)
* Viết hàm `calculateVendorFee(client, vendorId, grossAmount)`:
  * Truy vấn gói phí `fee_tier_id` của Vendor từ bảng `vendors`.
  * Nếu không tìm thấy, mặc định lấy gói **Hạng Thường**.
  * Lấy danh sách các dòng chi tiết phí từ bảng `fee_tier_items`.
  * Tính toán tổng phí thu:
    * Nếu dòng phí là `percentage`: `fee = grossAmount * (fee_value / 100)`
    * Nếu dòng phí là `fixed`: `fee = fee_value`
  * Trả về: `totalFee`, `netAmount` (bằng `grossAmount - totalFee`) và danh sách `breakdown` chi tiết từng dòng phí để ghi nhận log đối soát sau này.

#### [MODIFY] [vendor.controller.ts](file:///e:/cd/reshop/backend/src/modules/vendor/vendor.controller.ts)
* Trong hàm `updateOrderStatus`, khi trạng thái chuyển sang `delivered`:
  * Gọi `calculateVendorFee` để tính `netAmount` thực tế (đã trừ cả phí phần trăm và cố định).
  * Cộng `netAmount` vào `pending_balance` của Vendor và lưu log `pending_credit`.

#### [MODIFY] [after-sales.controller.ts](file:///e:/cd/reshop/backend/src/modules/after-sales/after-sales.controller.ts)
* Trong hàm `createReview` (khi giải phóng tiền sớm do có đánh giá):
  * Gọi `calculateVendorFee` để lấy số tiền thực nhận `netAmount`.
  * Trừ `netAmount` khỏi `pending_balance` và cộng vào ví khả dụng `wallet_balance`.

#### [MODIFY] [cron.ts](file:///e:/cd/reshop/backend/src/core/cron.ts)
* Trong hàm quét tự động `autoReleaseEscrow` (khi giải phóng tiền sau 7 ngày):
  * Thay thế logic phần trăm phẳng tĩnh cũ bằng việc gọi hàm `calculateVendorFee` để giải phóng đúng số tiền `netAmount`.

#### [MODIFY] [admin-dispute.controller.ts](file:///e:/cd/reshop/backend/src/modules/after-sales/admin-dispute.controller.ts)
* Trong hàm phân xử tranh chấp `resolveDispute` (khi phân xử Vendor thắng cuộc):
  * Sử dụng `calculateVendorFee` để tính số tiền giải phóng chính xác sang ví khả dụng của Vendor.

---

### Phase 4: Cập nhật & Kiểm thử tự động (Verification & Test)

Điều chỉnh các bộ test tự động để tương thích với cơ chế tính phí cố định và phí phần trăm mới.

#### [MODIFY] [refund-escrow.test.ts](file:///e:/cd/reshop/backend/src/modules/after-sales/__tests__/refund-escrow.test.ts)
* Cập nhật các asserts kiểm tra giá trị ví khả dụng của Vendor và ví đóng băng sau khi giao hàng/đăng ký đánh giá để khớp với giá trị tính toán đã trừ 5% + 2.000đ (theo Hạng Thường mặc định).

---

## Verification Plan

### Automated Tests
* Chạy bộ test tự động sau khi cập nhật công thức tính phí:
  ```bash
  docker compose exec backend npm run test
  ```

### Manual Verification
1. Dùng tài khoản admin thay đổi hạng phí của Vendor từ Hạng Thường sang Hạng Xác Thực.
2. Tạo đơn hàng và xác nhận giao thành công, đối chiếu ví đóng băng của Vendor xem có cộng đúng `Doanh_thu - (3% + 1.000đ)` hay không.
3. Tiến hành đánh giá sản phẩm hoặc chờ 7 ngày, kiểm tra tiền khả dụng được chuyển qua khớp 100%.
