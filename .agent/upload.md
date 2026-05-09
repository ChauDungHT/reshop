# Skill: Standardized Image Upload & Storage Management

## Purpose
To ensure consistent, optimized, and secure image handling across the Reshop platform. This skill governs how images are received, processed, stored, and served.

---

## 1. Directory Structure & Organization

### Asset Types
- **Static Assets (`/public/assets/`)**: UI icons, logos, static banners. Committed to Git.
- **Dynamic Uploads (`/uploads/`)**: User-generated content. **Excluded from Git** via `.gitignore`.

### Partitioning Rules (Date-Based + Entity-Based)
To prevent performance degradation on large datasets, files must be partitioned by date:
`uploads/{entity}/{YYYY}/{MM}/{DD}/{filename}`

**Examples:**
- `uploads/avatars/2026/05/07/user-uuid.webp`
- `uploads/products/2026/05/07/prod-uuid-1.webp`

---

## 2. Backend Implementation (Node.js/Multer)

### Naming Convention
- **Requirement**: Use UUID v4 for all filenames to prevent collisions and information leakage (obfuscation of upload sequence).
- **Format**: `{UUID}.webp`

### Storage Configuration
Use `diskStorage` with dynamic destination creation:
```javascript
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const now = new Date();
    const path = `uploads/${req.entityType}/${now.getFullYear()}/${(now.getMonth()+1).toString().padStart(2, '0')}/${now.getDate()}`;
    fs.mkdirSync(path, { recursive: true });
    cb(null, path);
  },
  filename: (req, file, cb) => {
    cb(null, `${uuidv4()}.webp`);
  }
});
```

### Image Processing (Sharp)
All uploaded images **must** be processed before final storage:
1. **Convert to WebP**: Maximum compression with minimal quality loss.
2. **Resize**:
   - Avatars: 256x256 (Square crop).
   - Products: Max 1200px width (maintain aspect ratio).
3. **Strip Metadata**: Remove EXIF data for privacy and size.

---

## 3. Database Rules

- **Relative Paths ONLY**: Store as `/uploads/...`. Never include domain or absolute OS paths.
- **JSONB for Multiple Images**: Products should use a `JSONB` array of strings for `image_urls`.

---

## 4. Frontend Integration

- **Component**: Use the shared `ImageUploader.tsx`.
- **Preview**: Generate local `URL.createObjectURL(file)` for immediate feedback before upload.
- **Handling Deletion**: When an image is replaced or deleted in the UI, the frontend must notify the backend to cleanup the physical file if necessary.

---

## 5. Security & Validation

- **MIME Type Check**: Only allow `image/jpeg`, `image/png`, `image/webp`.
- **File Size Limit**:
  - Avatars: 2MB.
  - Product Images: 5MB.
- **Public Access**: Serve the `/uploads` directory as static content via Express:
  `app.use('/uploads', express.static(path.join(__dirname, 'uploads')));`

---

## 6. Vendor-Specific Storage Rules

To comply with multi-vendor isolation and potential auditing, vendor assets should be grouped separately:
- **Path**: `uploads/vendors/{vendor_id}/{entity}/{filename}`
- **Entities**: `logos`, `banners`, `product-images`, `certificates`.

## 7. Orphan File Management (Cleanup)

Files in `/uploads` should be kept in sync with the database to avoid "bloat":
- **Replacement logic**: When a user updates their avatar, the backend should attempt to delete the old file associated with that record before saving the new path.
- **Cleanup script**: Implement a monthly task to identify files in `uploads/` that have no corresponding reference in the `users`, `vendors`, or `products` tables.

## 8. Frontend Display Best Practices

### Performance
- **Lazy Loading**: Always use `loading="lazy"` for product images below the fold.
- **Aspect Ratio**: Use CSS `aspect-ratio` or fixed containers to prevent Layout Shift (CLS) while images are loading.
- **Fallback**: Provide a standard "placeholder.webp" if an image fails to load or the URL is invalid.

### Accessibility
- **Alt Text**: Always include descriptive `alt` tags. For products, use `{product_name} - {vendor_name}`.

---

## 9. Quick Checklist for New Upload Implementation
- [ ] Multer configured with UUID and destination partitioning?
- [ ] Sharp used for WebP conversion and resizing?
- [ ] Database storing relative path only?
- [ ] Old files cleaned up on update/delete?
- [ ] Frontend uses shared `ImageUploader` and handles loading states?