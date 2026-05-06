# Prompt 05: Trang Danh sách & Form Sản phẩm Vendor

## Ngữ cảnh

**API Backend cần dùng:**
- `GET /api/vendor/products?status=&q=&page=&limit=` → `{ products: [...], total, page }`
- `POST /api/vendor/products` → `FormData` (fields + `images[]`)
- `DELETE /api/vendor/products/bulk` → `{ ids: string[] }`
- `PUT /api/vendor/products/bulk-toggle` → `{ ids: string[], status: 'active'|'hidden' }`

**Schema sản phẩm từ DB (`products` table):**
```
id, vendor_id, category_id, name, description (TEXT/HTML),
price, stock, is_featured, image_urls (JSONB/string[]),
status (active|inactive|out_of_stock), average_rating, created_at
```

**Components sẵn có:** `DataTable`, `StatCard` (Prompt 02), `ImageUploader`, `RichTextEditor` (Prompt 03).

## Nhiệm vụ

### 1. Tạo `frontend/storefront/src/pages/vendor/VendorProductList.tsx`

**State/URL Params (BẮT BUỘC dùng `useSearchParams`):**
```ts
const [searchParams, setSearchParams] = useSearchParams();
const status = searchParams.get('status') || '';
const q = searchParams.get('q') || '';
const page = Number(searchParams.get('page') || 1);
```

**Layout trang:**
- Toolbar: Input tìm kiếm, Dropdown lọc `status`, nút **Thêm sản phẩm** (link đến `/vendor/products/new`).
- Nút Bulk Action: **Xoá đã chọn** (gọi `DELETE /bulk`) và **Ẩn/Hiện đã chọn** (gọi `PUT /bulk-toggle`). Hai nút này chỉ hiện khi có ít nhất 1 item được chọn.
- `DataTable` với columns: Ảnh chính | Tên | Giá | Tồn kho | Trạng thái | Đánh giá | Thao tác (Edit / Xóa).
- Column **Thao tác**: nút Edit → navigate `/vendor/products/:id/edit`, nút Xóa → xác nhận dialog rồi gọi API.

**State quản lý Bulk:**
```ts
const [selectedIds, setSelectedIds] = useState<string[]>([]);
// Sau khi bulk action thành công → setSelectedIds([]) và refetch
```

**Sau khi Bulk Action** → gọi `queryClient.invalidateQueries(['vendor-products'])` để refresh list.

### 2. Tạo `frontend/storefront/src/pages/vendor/VendorProductForm.tsx`

Dùng chung cho **thêm mới** (`/vendor/products/new`) và **chỉnh sửa** (`/vendor/products/:id/edit`).

**Phân biệt mode:**
```ts
const { id } = useParams();
const isEditMode = Boolean(id);
// Nếu isEditMode → fetch dữ liệu sản phẩm trước, điền vào form
```

**Fields form:**
| Field | Input |
|---|---|
| Tên sản phẩm | text input |
| Danh mục | Select (gọi `GET /api/categories` để lấy options) |
| Giá bán | number input |
| Giá gốc (optional) | number input |
| Tồn kho | number input |
| Mô tả ngắn | textarea (max 300 ký tự) |
| Mô tả chi tiết | `RichTextEditor` |
| Ảnh sản phẩm | `ImageUploader` (max 8) |
| Nổi bật | checkbox `is_featured` |

**Submit logic — gửi FormData:**
```ts
const formData = new FormData();
formData.append('name', values.name);
formData.append('price', String(values.price));
// ... append các fields khác
files.forEach(file => formData.append('images', file));

await axiosInstance.post('/vendor/products', formData, {
  headers: { 'Content-Type': 'multipart/form-data' }
});
```

**Sau khi submit thành công** → navigate về `/vendor/products`.

## Kiểm tra

- Tạo sản phẩm mới với 3 ảnh → kiểm tra trong DB có `image_urls` là mảng đường dẫn `/uploads/products/...`.
- Filter theo `status=active` → URL thay đổi, reload trang giữ nguyên filter.
- Bulk xóa 2 sản phẩm → chúng không hiện trong list (soft deleted, status=`deleted`).
