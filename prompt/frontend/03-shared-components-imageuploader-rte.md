# Prompt 03: Shared UI Components — ImageUploader & RichTextEditor

## Ngữ cảnh

Hai component phức tạp nhất của form thêm/sửa sản phẩm Vendor. Chúng sẽ được dùng ở `VendorProductForm.tsx` (Prompt 05). Cần build độc lập trước để dễ test.

Dự án dùng **Tailwind CSS** và **React 18+**. File entry `frontend/storefront/src/main.tsx` đã có Provider setup cơ bản.

## Nhiệm vụ

### 1. Tạo `frontend/shared-ui/src/components/ImageUploader.tsx`

**Cài đặt thư viện:**
```bash
npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```
(Thêm vào `frontend/shared-ui/package.json`)

**Props:**
```ts
interface ImageUploaderProps {
  maxImages?: number;           // mặc định 8
  onChange: (files: File[]) => void; // trả về mảng File đã sắp xếp
  initialPreviews?: string[];   // URL ảnh có sẵn khi edit sản phẩm
}
```

**Hành vi:**
- Vùng Drop zone: kéo file vào hoặc click chọn file (`accept="image/jpeg, image/png"`).
- Hiện preview thumbnail ngay sau khi chọn (dùng `URL.createObjectURL`).
- Badge số `{n}/8` ảnh hiện tại.
- Nút `✕` trên mỗi thumbnail để xoá.
- **Kéo thả sắp xếp thứ tự** bằng `@dnd-kit/sortable` (SortableContext + useSortable).
- Disable thêm ảnh khi đã đạt `maxImages`.

### 2. Tạo `frontend/shared-ui/src/components/RichTextEditor.tsx`

**Cài đặt thư viện:**
```bash
npm install @tiptap/react @tiptap/starter-kit @tiptap/extension-link
```

**Props:**
```ts
interface RichTextEditorProps {
  value: string;              // HTML string
  onChange: (html: string) => void;
  placeholder?: string;
}
```

**Toolbar tối thiểu:** Bold, Italic, Underline, Bullet List, Ordered List, Link.

**Lưu ý bảo mật:**
- Component chỉ dùng để **soạn thảo** (input) → không cần sanitize tại đây.
- Khi component khác **render HTML từ API trả về** (read-only), phải dùng `dompurify`:
  ```tsx
  import DOMPurify from 'dompurify';
  <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(htmlString) }} />
  ```

### 3. Cập nhật `index.ts`

```ts
export { default as ImageUploader } from './ImageUploader';
export { default as RichTextEditor } from './RichTextEditor';
```

## Kiểm tra

- Tạo file `frontend/storefront/src/pages/vendor/__test_upload.tsx` (stub page) để:
  - Render `ImageUploader` → chọn 3 ảnh, kéo đổi thứ tự, xoá 1 ảnh.
  - Render `RichTextEditor` → gõ text, bôi đậm, thêm link.
- Xoá file test sau khi xác nhận hoạt động.
