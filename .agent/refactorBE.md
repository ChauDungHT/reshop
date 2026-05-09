# Kế hoạch Refactor Backend: Đồng bộ Interface với Frontend

Dưới đây là kế hoạch chia nhỏ (phân đoạn) để đồng bộ kiểu dữ liệu giữa Backend và Frontend nhằm giảm thiểu rủi ro, kiểm soát độ phức tạp và dễ dàng nghiệm thu (verify) sau mỗi bước. Phương án tiếp cận được chọn là **Clone Types & Type tại Response** để đảm bảo an toàn cao nhất trong một lần chạy.

---

## Giai đoạn 1: Khởi tạo Hệ thống Types cho Backend

**Context:**
Backend hiện tại không có các định nghĩa kiểu dữ liệu (Interfaces/Types) cho các entity trong Database và chuẩn Response trả về. Trong khi đó, Frontend đã có một bộ chuẩn tại `frontend/shared-ui/src/types`. Để backend nhận diện được cấu trúc trả về, cần đưa các types này vào backend.

**Yêu cầu:**
1. Tạo thư mục `backend/src/shared/types` (nếu chưa có).
2. Copy 2 file `models.ts` và `api.ts` từ `frontend/shared-ui/src/types/` sang `backend/src/shared/types/`.
3. Xử lý các lỗi import/export phát sinh (nếu có) khi chuyển file.

**Kết quả mong đợi:**
- Backend có sẵn các Interface như `IUser`, `IProduct`, `IApiResponse`, `IPaginatedResponse`...
- Lệnh `npm run test:tsc` (hoặc `tsc --noEmit`) của backend chạy thành công, không báo lỗi ở thư mục `types`.

---

## Giai đoạn 2: Cập nhật hàm `sendResponse`

**Context:**
Hàm xử lý response chung của Backend (`backend/src/shared/response.ts`) đang sử dụng `export const sendResponse = <T = any>(...)`. Điều này không ràng buộc chặt chẽ với cấu trúc `IApiResponse` mà Frontend đang mong đợi, dẫn tới việc truyền thiếu/dư dữ liệu.

**Yêu cầu:**
1. Cập nhật `sendResponse` để sử dụng các Interface từ `api.ts`. 
2. Chắc chắn rằng hàm trả về định dạng `{ success, message, data }` và đối số `data` phải khớp với type `T` truyền vào.

**Kết quả mong đợi:**
- Hàm `sendResponse` được Type chặt chẽ. Các Controller khi gọi hàm này buộc phải truyền dữ liệu đúng cấu trúc hoặc báo lỗi TypeScript nếu truyền sai.

---

## Giai đoạn 3: Refactor Module Identity (Auth & Users)

**Context:**
Các API liên quan đến xác thực (Login, Register) và người dùng (Profile) tại `auth.controller.ts` và `user.controller.ts` đang trả về dữ liệu tuỳ biến (ví dụ: gộp thẳng role, status, ví vào response không báo trước type).

**Yêu cầu:**
1. Áp dụng Interface `IUser` và `IVendor` vào các phản hồi (response) của module Identity.
2. Tại các lệnh gọi `sendResponse(...)`, định nghĩa rõ Type Parameter: ví dụ `sendResponse<{ token: string; user: IUser }>(...)`.
3. Map các trường trả về từ `db.query` sao cho khớp đúng với Interface (loại bỏ trường thừa như `password_hash` nếu lỡ bị trả về, đảm bảo các trường `snake_case` khớp với `models.ts`).

**Kết quả mong đợi:**
- Mọi API của module `Identity` đều trả về cấu trúc chuẩn. `tsc --noEmit` không báo lỗi trên 2 file controller này.

---

## Giai đoạn 4: Refactor Module Catalog & Cart

**Context:**
Sản phẩm (Product) và Giỏ hàng (Cart) là 2 module có dữ liệu phức tạp nhất do chứa mảng hình ảnh, phân trang và dữ liệu join bảng (ví dụ: `ICartItem` cần join thêm `product_name`, `product_price`).

**Yêu cầu:**
1. Cập nhật `catalog` controllers (Product, Category) để dùng `IProduct`, `ICategory`, và `IPaginatedResponse<IProduct>` cho list api.
2. Cập nhật `cart` controllers để dùng `ICartItem`. Chú ý ép kiểu cho các trường được join từ DB sao cho khớp với các trường mở rộng (Extended fields) đã định nghĩa trong `ICartItem`.

**Kết quả mong đợi:**
- API danh sách sản phẩm, chi tiết sản phẩm và giỏ hàng có type chuẩn.
- Các hàm tính toán số lượng/giá trong giỏ hàng không bị báo lỗi `any`.

---

## Giai đoạn 5: Refactor các Module còn lại (Vendor, Checkout, After-sales, Wallet)

**Context:**
Các module phục vụ quy trình sau mua (Checkout, Order, Return, QA, Transaction) cần phải đồng bộ nốt để hoàn thiện quy trình.

**Yêu cầu:**
1. Áp dụng các interface `IOrder`, `IOrderItem`, `IReturnRequest`, `IQAItem`, và `IWalletTransaction` tương ứng cho từng Controller.
2. Đảm bảo những field dưới định dạng `JSONB` từ Postgres (như `bank_info`, `shipping_address`) được parse và cast về đúng kiểu hoặc ít nhất là `any` một cách có chủ đích theo `models.ts`.

**Kết quả mong đợi:**
- Toàn bộ 100% các Controller của Backend đều đã sử dụng Strict Type tại điểm trả về API (`sendResponse`).
- Biên dịch Typescript backend hoàn toàn sạch (`0 errors`).
- Frontend call API hoạt động trơn tru mà không bị sai lệch cấu trúc dữ liệu.
