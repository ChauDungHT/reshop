# Prompt 08: Trang Hỏi & Đáp (Q&A) và Cài đặt Gian hàng Vendor

## Ngữ cảnh

**API Backend cần dùng:**
- `GET /api/vendor/qa` → danh sách câu hỏi (filter theo sản phẩm của vendor, chưa/đã trả lời)
- `PUT /api/vendor/qa/:id/answer` → `{ answer: string }`
- `GET /api/vendor/shop` → thông tin gian hàng hiện tại (nếu endpoint tồn tại)
- `PUT /api/vendor/shop` → `FormData` (text fields + logo/banner file)

**Schema `qa` table:**
```
id, product_id, user_id, question, answer (nullable),
answered_by (FK → vendors.id, nullable), created_at, updated_at
```

**Schema `vendors` table (sau Prompt Backend 01):**
```
id, user_id, store_name, slug, status, commission_rate, bank_info,
logo_url, banner_url, phone, address, email,
return_policy_days (default 7), return_policy_desc
```

## Nhiệm vụ

### 1. Tạo `frontend/storefront/src/pages/vendor/VendorQAPage.tsx`

**Layout:** Danh sách câu hỏi dạng card hoặc bảng.

**Mỗi card/row hiển thị:**
- Tên người hỏi + Ảnh avatar (nếu có)
- Tên sản phẩm liên quan (link đến `/product/:id`)
- Nội dung câu hỏi
- Badge trạng thái: `Chưa trả lời` (vàng) / `Đã trả lời` (xanh)
- Nếu `answer` có giá trị → hiện câu trả lời bên dưới (readonly)
- Nếu chưa có `answer` → hiện **Inline Reply Form**:
  ```tsx
  const [answer, setAnswer] = useState('');
  const handleAnswer = async (qaId: string) => {
    await axiosInstance.put(`/vendor/qa/${qaId}/answer`, { answer });
    queryClient.invalidateQueries(['vendor-qa']);
  };
  ```

**Filter tab:** "Tất cả" | "Chưa trả lời" | "Đã trả lời".

### 2. Tạo `frontend/storefront/src/pages/vendor/VendorShopProfile.tsx`

**Form thông tin gian hàng:**

| Field | Input |
|---|---|
| Tên gian hàng | text (readonly nếu đã được duyệt) |
| Số điện thoại | text |
| Địa chỉ | text |
| Email gian hàng | email input |
| Chính sách trả hàng (số ngày) | number (mặc định 7) |
| Mô tả chính sách trả hàng | textarea |
| Logo | `ImageUploader` (max 1 ảnh) |
| Banner | `ImageUploader` (max 1 ảnh) |

**Submit — gửi FormData:**
```ts
const formData = new FormData();
formData.append('phone', values.phone);
// ... các trường text
if (logoFile) formData.append('logo', logoFile);
if (bannerFile) formData.append('banner', bannerFile);

await axiosInstance.put('/vendor/shop', formData, {
  headers: { 'Content-Type': 'multipart/form-data' }
});
```

**Fetch dữ liệu hiện tại khi vào trang:**
```ts
const { data: shop } = useQuery({
  queryKey: ['vendor-shop'],
  queryFn: () => axiosInstance.get('/vendor/shop').then(r => r.data),
});
// Dùng để điền sẵn giá trị vào form
```

## Kiểm tra

- Trả lời một câu hỏi → badge đổi thành "Đã trả lời", form ẩn đi.
- Câu hỏi đã trả lời → không hiện form inline nữa.
- Cập nhật số điện thoại shop → reload trang → giá trị mới được hiển thị.
- Upload logo → hình mới hiển thị trong form sau khi lưu.
