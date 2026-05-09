# Đánh giá Khả thi & Kế hoạch Refactor (Loại bỏ `any`)

## 1. Đánh giá: Có thể chạy cả 4 bước trong 1 lần không?

**Trả lời: KHÔNG NÊN VÀ KHÔNG THỂ THỰC THI AN TOÀN TRONG 1 LẦN CHẠY.**

**Lý do rủi ro (Technical Bottlenecks):**
1. **Hiệu ứng Thác đổ (Cascading Errors):** Khi bạn thay thế `any` bằng một Interface nghiêm ngặt (ví dụ `IOrder`), tất cả các component con đang sử dụng thuộc tính của `order` sẽ ngay lập tức bị TypeScript báo lỗi nếu có bất kỳ sự sai lệch nào về kiểu dữ liệu (ví dụ: `order.total_amount` là string hay number?). Việc sửa hàng loạt file cùng lúc sẽ gây ra hàng chục lỗi Compile Error liên đới.
2. **Quá tải Context Window:** Có khoảng ~40 vị trí dùng `any` rải rác trên cả Backend, Shared-UI và Storefront. Việc đọc, phân tích JSON, tạo interface và sửa đổi toàn bộ các file này trong một lần chạy sẽ vượt quá khả năng xử lý an toàn của AI, dễ dẫn đến việc sửa sót hoặc sinh ra mã lỗi.
3. **Khó Debug:** Nếu làm trong 1 lần và lệnh `npm run build` thất bại, việc dò tìm xem Interface nào bị định nghĩa sai hay Component nào truyền sai Props sẽ mất rất nhiều thời gian.

---

## 2. Lộ trình Triển khai Cụ thể (Chia để trị)

Để đảm bảo hệ thống luôn ở trạng thái **Pass Build** sau mỗi bước, tôi đề xuất chia quá trình Refactor này thành **4 Phase (Giai đoạn)**. Mỗi Phase sẽ được thực thi và test độc lập.

### Phase 1: Nền tảng (Foundation & Core Types)
*Trọng tâm: Bước 1 & Bước 2*
* **Công việc:**
  1. Tạo thư mục `frontend/shared-ui/src/types/` làm Single Source of Truth.
  2. Xây dựng Generic Type cho API Response: `interface IApiResponse<T> { status: string; message: string; data: T; }`.
  3. Cập nhật file `backend/src/shared/response.ts` và `frontend/shared-ui/src/lib/axios.ts` để sử dụng cấu trúc Base này.
* **Mục tiêu test:** Đảm bảo hệ thống Axios và API Handler vẫn hoạt động bình thường, không vỡ build.

### Phase 2: Định nghĩa Model và Refactor Global Contexts
*Trọng tâm: Bước 3 & Bước 4 (Ưu tiên Cao nhất)*
* **Công việc:**
  1. Dựa vào Database Schema, tạo các Interface cốt lõi: `IUser`, `IProduct`, `ICartItem`, `IOrder`.
  2. Áp dụng các interface này để loại bỏ `any` trong **`CartContext.tsx`** và **`AuthContext.tsx`**.
* **Mục tiêu test:** Đây là 2 context quan trọng nhất, chi phối luồng mua hàng. Sau khi Refactor, chạy `npm run build` và Unit Tests để xác nhận.

### Phase 3: Làm sạch Frontend Storefront (Customer & Vendor Pages)
*Trọng tâm: Bước 4 (Khối lượng lớn nhất)*
* **Công việc:**
  1. Định nghĩa thêm Interface: `IQAItem`, `IVendorShop`, `IAuditLog`.
  2. Lần lượt thay thế `useQuery<any>` và `useState<any>` tại:
     - `CustomerDashboard.tsx`
     - `VendorDashboard.tsx`
     - `VendorQAPage.tsx` & `VendorShopProfile.tsx`
     - `AdminDashboard.tsx`
* **Mục tiêu test:** Mỗi lần sửa xong 1 trang, chạy `npx tsc --noEmit` ngay lập tức để fix lỗi tương thích Props.

### Phase 4: Backend Cleanup & Edge Cases
*Trọng tâm: Hoàn thiện*
* **Công việc:**
  1. Xử lý lỗi ép kiểu `(req as any)` ở backend bằng cách định nghĩa `CustomRequest extends Express.Request` (chứa `processedImages`, `logoUrl`, v.v.).
  2. Typings cho các middleware (Upload, Auth).
* **Mục tiêu test:** Đảm bảo Backend Build thành công và không bị vướng Strict Type.

---

