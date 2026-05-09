# Chỉ mục các vị trí sử dụng kiểu dữ liệu `any`

Dưới đây là danh sách phân tích các vị trí sử dụng kiểu `any` trong dự án Reshop nhằm phục vụ cho việc tracking Technical Debt và lên kế hoạch refactor type sau này.

## Chi tiết các vị trí

| File Path | Line | Variable/Entity | Context (Tại sao dùng any?) | Mức độ rủi ro |
| :--- | :--- | :--- | :--- | :--- |
| **Backend: Modules** | | | | |
| `backend/src/modules/vendor/vendor.controller.ts` | 23, 157, 300, 637 | `queryParams: any[]` | Mảng tham số truyền vào hàm query của `pg` (chấp nhận mọi kiểu primitive). | Thấp |
| `backend/src/modules/vendor/vendor.controller.ts` | 349, 392, 647, 648 | `(req as any).xxx` | Ép kiểu `req` để lấy giá trị từ custom middleware upload (như `processedImages`, `logoUrl`). Nên mở rộng `Express.Request`. | Trung bình |
| `backend/src/modules/vendor/vendor.controller.ts` | 232 | `catch (err: any)` | Bắt lỗi tổng quát trong block try/catch. | Thấp |
| `backend/src/modules/identity/__tests__/user.api.test.ts` | 18 | `req: any`, `res: any`, `next: any` | Mock params cho Express middleware trong test. | Thấp |
| `backend/src/modules/identity/__tests__/auth.api.test.ts` | 135 | `jwt.decode(...) as any` | Ép kiểu kết quả decode JWT trong môi trường test. | Thấp |
| `backend/src/modules/identity/user.controller.ts` | 20, 43, 87, 108 | `catch (error: any)` | Bắt lỗi tổng quát trong block try/catch. | Thấp |
| `backend/src/modules/identity/auth.controller.ts` | 31, 84 | `catch (err: any)` | Bắt lỗi tổng quát trong block try/catch. | Thấp |
| `backend/src/modules/checkout/checkout.controller.ts` | 121, 207 | `catch (err: any)` | Bắt lỗi tổng quát trong block try/catch. | Thấp |
| `backend/src/modules/after-sales/after-sales.controller.ts` | 258 | `catch (err: any)` | Bắt lỗi tổng quát trong block try/catch. | Thấp |
| `backend/src/modules/after-sales/after-sales.controller.ts` | 275 | `queryParams: any[]` | Mảng tham số truyền vào hàm query của `pg`. | Thấp |
| **Backend: Shared** | | | | |
| `backend/src/shared/response.ts` | 8 | `data: any` | Generic response payload format chung của toàn API. Đề xuất dùng Generics `<T>`. | Trung bình |
| `backend/src/shared/middlewares/upload.middleware.ts` | 31 | `Error(...) as any` | Ép kiểu Error để pass qua signature của Multer callback. | Thấp |
| `backend/src/shared/middlewares/upload.middleware.ts` | 68, 76, 84 | `(req as any)` | Ép kiểu để gán dữ liệu sau khi upload lên Req object. Nên định nghĩa `CustomRequest`. | Trung bình |
| `backend/src/shared/middlewares/auth.middleware.ts` | 37 | `catch (error: any)` | Bắt lỗi JWT. | Thấp |
| **Frontend: Shared UI** | | | | |
| `frontend/shared-ui/src/context/CartContext.tsx` | 18, 101 | `product: any` | Thiếu interface định nghĩa `IProduct` khi add vào giỏ hàng. | Cao |
| `frontend/shared-ui/src/context/CartContext.tsx` | 45, 81, 86, 106 | `item: any`, `i: any` | Mapping dữ liệu trả về từ API giỏ hàng. Đề xuất: `ICartItemResponse`. | Cao |
| `frontend/shared-ui/src/components/RichTextEditor.tsx` | 13 | `editor: any` | Thiếu type từ thư viện Editor (ví dụ: TipTap Editor type). | Trung bình |
| `frontend/shared-ui/src/components/DataTable.tsx` | 6 | `value: any` | Generic Table cell value. Thường khó định nghĩa vì phụ thuộc data. | Thấp |
| **Frontend: Storefront Pages** | | | | |
| `src/pages/vendor/VendorShopProfile.tsx` | 12 | `useQuery<any>` | Thiếu interface `IVendorShop` cho API `GET /vendor/shop`. | Cao |
| `src/pages/vendor/VendorQAPage.tsx` | 10 | `useQuery<any[]>` | Thiếu interface `IQAItem` cho API `GET /vendor/qa`. | Cao |
| `src/pages/vendor/VendorQAPage.tsx` | 49 | `tab.id as any` | Ép kiểu strict enum type (`'all' | 'unanswered' | 'answered'`). | Thấp |
| `src/pages/vendor/VendorQAPage.tsx` | 79 | `qa: any`, `answerMutation: any` | Props của component con thiếu định nghĩa Type an toàn. | Cao |
| `src/pages/vendor/VendorProductForm.tsx` | 27 | `useQuery<any[]>` | Thiếu interface `ICategory` cho API lấy danh mục. | Cao |
| `src/pages/vendor/VendorDashboard.tsx` | 31, 66, 72 | `useQuery<{ orders: any[]... }>`, `Column<any>` | Thiếu interface `IVendorOrder` cho cấu trúc dữ liệu Dashboard. | Cao |
| `src/pages/dashboard/CustomerDashboard.tsx` | 44, 45, 46 | `useState<any>` | Quản lý state cho order selected, review order. Cần interface `IOrder`. | Cao |
| `src/pages/dashboard/CustomerDashboard.tsx` | 50, 58, 67 | `useQuery<any[]>`, `<any>` | Dữ liệu trả về từ API Orders, Wallet History, Profile. Đề xuất `IOrderResponse`, `IWalletTransaction`, `IUserProfile`. | Cao |
| `src/pages/dashboard/CustomerDashboard.tsx` | 103, 113, 127 | `mutationFn: async (data: any)` | Payload gửi lên Mutation chưa có type validation. | Trung bình |
| `src/pages/dashboard/CustomerDashboard.tsx` | 131, 150 | `onSuccess: (res: any)` | Kết quả trả về của React Query. | Thấp |
| `src/pages/dashboard/CustomerDashboard.tsx` | 209, 499 | `item: any` | Render map vòng lặp. Cần dùng `IOrderItem`. | Cao |
| `src/pages/dashboard/AdminDashboard.tsx` | 34, 110 | `useQuery<any[]>`, `entry: any` | Audit log API. Đề xuất `IAuditLog`. | Cao |
| `src/pages/shop/CheckoutPage.tsx` | 23 | `useState<any>` | State quản lý `successOrder`. Nên dùng `IOrder`. | Cao |
| *Various Components* | *Various* | `catch (err: any)`, `onError: (err: any)` | Exception objects từ Axios hoặc logic. Có thể dùng `AxiosError`. | Thấp |


## Summary - Đánh giá Technical Debt

| Thư mục | Số lần dùng `any` (ước tính) | Trọng tâm cần Fix |
| :--- | :--- | :--- |
| **Backend/Modules** | ~17 lần | Hầu hết là `catch (err: any)` hoặc `queryParams: any[]` (Rủi ro Thấp). Có 4 lần ép kiểu `req as any` cần cải thiện bằng cách extends Express Request Interface. |
| **Backend/Shared** | 6 lần | Cần sử dụng TypeScript Generics (`<T>`) cho `APIResponse` object. Cần định nghĩa Interface cho `CustomRequest`. |
| **Frontend/Shared UI** | 6 lần | Cực kì quan trọng: Cần định nghĩa `IProduct`, `ICartItem` tại `CartContext`. |
| **Frontend/Storefront Pages** | ~35 lần | Phần lớn technical debt nằm ở đây do dùng React Query lấy data (`useQuery<any>`, `useState<any>`). Cần ưu tiên thiết lập thư mục `types/` chứa các Interface cho `Order`, `Product`, `VendorShop`, `QA`, v.v. |

**Nhận xét chung:** 
Tần suất sử dụng `any` ở Frontend (đặc biệt trong các Dashboard) là khá cao, gây nguy cơ lỗi Runtime nếu API thay đổi schema. Đề xuất thực thi một đợt Refactor riêng biệt chỉ để khai báo Model Interface cho ứng dụng.
