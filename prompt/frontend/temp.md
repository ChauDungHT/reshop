# Layout Implementation: Medusa Store Ecommerce

## Mô tả tổng quan

Dựa trên file PDF cung cấp, đây là layout của một **Ecommerce Store** (Medusa Store) gồm các trang:
- **Trang chủ** (Homepage): Hero section + Footer với danh mục và links
- **Trang danh sách sản phẩm** (All Products): Sidebar lọc/sort + grid sản phẩm
- **Trang thanh toán** (Checkout): Địa chỉ nhận hàng + Cart summary + Payment
- **Trang tài khoản** (Account): Sidebar menu + Profile overview + Orders

---

## Bước 1: Tạo Layout Component

**Đường dẫn file:** `frontend/shared-ui/src/layouts/StorefrontLayout.tsx`

```tsx
import { Outlet, Link, useNavigate } from 'react-router-dom';
import { useState } from 'react';

const StorefrontLayout = () => {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="min-h-screen flex flex-col bg-white text-gray-900 font-sans">
      {/* ===================== HEADER ===================== */}
      <header className="border-b border-gray-200 px-6 py-4 flex items-center justify-between sticky top-0 bg-white z-50">
        {/* Left: Menu */}
        <button
          className="text-sm font-medium tracking-widest uppercase hover:opacity-60 transition"
          onClick={() => setMenuOpen(!menuOpen)}
        >
          Menu
        </button>

        {/* Center: Logo */}
        <Link
          to="/"
          className="text-sm font-bold tracking-[0.2em] uppercase absolute left-1/2 -translate-x-1/2"
        >
          MEDUSA STORE
        </Link>

        {/* Right: Account + Cart */}
        <div className="flex items-center gap-6 text-sm">
          <Link to="/account" className="hover:opacity-60 transition">
            Account
          </Link>
          <Link to="/cart" className="hover:opacity-60 transition">
            Cart (0)
          </Link>
        </div>
      </header>

      {/* ===================== MOBILE MENU (optional) ===================== */}
      {menuOpen && (
        <nav className="border-b border-gray-200 px-6 py-4 bg-white z-40">
          <ul className="flex flex-col gap-3 text-sm">
            <li><Link to="/store" onClick={() => setMenuOpen(false)}>All Products</Link></li>
            <li><Link to="/categories/shirts" onClick={() => setMenuOpen(false)}>Shirts</Link></li>
            <li><Link to="/categories/pants" onClick={() => setMenuOpen(false)}>Pants</Link></li>
            <li><Link to="/categories/merch" onClick={() => setMenuOpen(false)}>Merch</Link></li>
            <li><Link to="/categories/sweatshirts" onClick={() => setMenuOpen(false)}>Sweatshirts</Link></li>
          </ul>
        </nav>
      )}

      {/* ===================== MAIN CONTENT ===================== */}
      <main className="flex-1">
        {/* Outlet renders child pages: Home, Products, Checkout, Account... */}
        <Outlet />
      </main>

      {/* ===================== FOOTER ===================== */}
      <footer className="border-t border-gray-200 px-6 py-12 mt-auto">
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Brand */}
          <div>
            <p className="text-sm font-bold tracking-[0.2em] uppercase">MEDUSA STORE</p>
          </div>

          {/* Categories */}
          <div>
            <p className="text-sm font-semibold mb-3">Categories</p>
            <ul className="space-y-2 text-sm text-gray-600">
              <li><Link to="/categories/shirts" className="hover:text-gray-900 transition">Shirts</Link></li>
              <li><Link to="/categories/pants" className="hover:text-gray-900 transition">Pants</Link></li>
              <li><Link to="/categories/merch" className="hover:text-gray-900 transition">Merch</Link></li>
              <li><Link to="/categories/sweatshirts" className="hover:text-gray-900 transition">Sweatshirts</Link></li>
            </ul>
          </div>

          {/* Medusa links */}
          <div>
            <p className="text-sm font-semibold mb-3">Medusa</p>
            <ul className="space-y-2 text-sm text-gray-600">
              <li><a href="https://github.com/medusajs/medusa" target="_blank" rel="noreferrer" className="hover:text-gray-900 transition">GitHub</a></li>
              <li><a href="https://docs.medusajs.com" target="_blank" rel="noreferrer" className="hover:text-gray-900 transition">Documentation</a></li>
              <li><a href="https://github.com/medusajs/nextjs-starter-medusa" target="_blank" rel="noreferrer" className="hover:text-gray-900 transition">Source code</a></li>
            </ul>
          </div>
        </div>

        {/* Copyright */}
        <div className="max-w-5xl mx-auto mt-8 pt-6 border-t border-gray-100 flex items-center justify-between text-xs text-gray-400">
          <span>© 2026 Medusa Store. All rights reserved.</span>
          <span>Powered by Medusa & Next.js</span>
        </div>
      </footer>
    </div>
  );
};

export default StorefrontLayout;
```

---

## Bước 2: Export Layout từ Index

**Đường dẫn file:** `frontend/shared-ui/src/layouts/index.ts`

Thêm dòng sau vào cuối file (hoặc tạo mới nếu chưa có):

```typescript
export { default as StorefrontLayout } from './StorefrontLayout';
// Giữ nguyên các export cũ nếu có, ví dụ:
// export { default as AdminLayout } from './AdminLayout';
```

---

## Bước 3: Đăng ký Layout trong App.tsx

**Đường dẫn file:** `frontend/<app-name>/src/App.tsx`

> Thay `<app-name>` bằng tên app thực tế trong monorepo (ví dụ: `storefront`, `web`, `customer-app`).

```tsx
import { Routes, Route } from 'react-router-dom';
import { StorefrontLayout } from '@layouts'; // hoặc đường dẫn tương đối nếu alias chưa được cấu hình

// Import các trang
import HomePage from './pages/HomePage';
import ProductsPage from './pages/ProductsPage';
import ProductDetailPage from './pages/ProductDetailPage';
import CartPage from './pages/CartPage';
import CheckoutPage from './pages/CheckoutPage';
import AccountPage from './pages/AccountPage';
import LoginPage from './pages/LoginPage';

function App() {
  return (
    <Routes>
      {/* Tất cả các trang dùng chung StorefrontLayout */}
      <Route element={<StorefrontLayout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/store" element={<ProductsPage />} />
        <Route path="/products/:handle" element={<ProductDetailPage />} />
        <Route path="/cart" element={<CartPage />} />
        <Route path="/checkout" element={<CheckoutPage />} />
        <Route path="/account" element={<AccountPage />} />
      </Route>

      {/* Trang không dùng StorefrontLayout (ví dụ login standalone) */}
      <Route path="/login" element={<LoginPage />} />
    </Routes>
  );
}

export default App;
```

---

## Cấu trúc trang con (Pages) cần tạo

Dựa trên PDF, các trang con cần implement với nội dung tương ứng:

### `HomePage.tsx`
```tsx
// Hero section: tiêu đề lớn, nút "View on GitHub"
// Không có header/footer vì đã có trong Layout
const HomePage = () => (
  <section className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
    <h1 className="text-3xl font-light text-gray-500 mb-2">Ecommerce Starter Template</h1>
    <p className="text-3xl font-light text-gray-400 mb-6">Powered by Medusa and Next.js</p>
    <a
      href="https://github.com/medusajs/nextjs-starter-medusa"
      target="_blank"
      rel="noreferrer"
      className="border border-gray-300 px-4 py-2 text-sm rounded hover:bg-gray-50 transition"
    >
      View on GitHub
    </a>
  </section>
);
export default HomePage;
```

### `ProductsPage.tsx`
```tsx
// Layout 2 cột:
// - Sidebar trái: Sort by (Latest Arrivals, Price Low→High, Price High→Low)
// - Phần phải: Grid sản phẩm (tên + giá, ảnh sản phẩm)
// Tiêu đề: "All products"
```

### `CheckoutPage.tsx`
```tsx
// Layout 2 cột:
// - Cột trái: Địa chỉ nhận hàng, Vận chuyển, Payment (COD / VNPay)
// - Cột phải: "In your Cart" - danh sách items, subtotal, shipping, taxes, total
// Nút: "Continue to review" → "Xác nhận đơn hàng"
```

### `AccountPage.tsx`
```tsx
// Layout 2 cột:
// - Sidebar trái: Overview, Profile, Addresses, Orders, Log out
// - Phần phải: Greeting (Hello [Name]), Profile completion %, Addresses count, Recent orders
// Section: "Got questions?" + Customer Service link
```

---

## Lưu ý kỹ thuật

| Vấn đề | Giải pháp |
|--------|-----------|
| `<Outlet />` không render | Đảm bảo các Route con nằm **bên trong** `<Route element={<StorefrontLayout />}>` |
| Layout bị re-render | Dùng `<Outlet />` thay vì truyền `children` để React Router tối ưu |
| Import alias `@layouts` | Cấu hình trong `tsconfig.json` và `vite.config.ts`: `"@layouts": ["src/layouts/index.ts"]` |
| Cart count động | Dùng Context hoặc Zustand store, truyền vào Header trong StorefrontLayout |
| Active menu item | Dùng `NavLink` thay `Link` để tự động thêm class `active` |

---

## Kiểm tra sau khi implement

- [ ] Header hiển thị đúng: Menu (trái) | MEDUSA STORE (giữa) | Account + Cart (phải)
- [ ] Footer hiển thị 3 cột: Brand | Categories | Medusa links
- [ ] Trang chủ render hero section trong `<main>`
- [ ] Trang sản phẩm có sidebar sort + grid
- [ ] Trang checkout có 2 cột: form + cart summary
- [ ] Trang account có sidebar menu + overview
- [ ] Navigation giữa các trang không reload layout (Header/Footer giữ nguyên)