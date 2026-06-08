import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

// Shared
import PrivateRoute from '../../shared-ui/src/components/PrivateRoute';
import RoleRoute from '../../shared-ui/src/components/RoleRoute';
import DashboardLayout from '../../shared-ui/src/layouts/DashboardLayout';
import StorefrontLayout from '../../shared-ui/src/layouts/StorefrontLayout';

// Pages
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import CustomerDashboard from './pages/dashboard/CustomerDashboard';
import AdminDashboard from './pages/dashboard/AdminDashboard';
import AccountPage from './pages/account/AccountPage';
import ShopPage from './pages/shop/ShopPage';
import ProductDetailPage from './pages/shop/ProductDetailPage';
import CartPage from './pages/shop/CartPage';
import CheckoutPage from './pages/shop/CheckoutPage';
import ForbiddenPage from './pages/error/ForbiddenPage';

// Vendor Pages
import VendorDashboard from './pages/vendor/VendorDashboard';
import VendorShopProfile from './pages/vendor/VendorShopProfile';
import VendorProductList from './pages/vendor/VendorProductList';
import VendorProductForm from './pages/vendor/VendorProductForm';
import VendorOrderList from './pages/vendor/VendorOrderList';
import VendorOrderDetail from './pages/vendor/VendorOrderDetail';
import VendorReturnList from './pages/vendor/VendorReturnList';
import VendorQAPage from './pages/vendor/VendorQAPage';
import VendorFees from './pages/vendor/VendorFees';

import { useAuth } from '../../shared-ui/src/context/AuthContext';
import DisputeList from './pages/admin/disputes/DisputeList';
import DisputeDetail from './pages/admin/disputes/DisputeDetail';
import AdminRoute from '../../shared-ui/src/components/AdminRoute';
import AdminLayout from '../../shared-ui/src/layouts/AdminLayout';
import UserList from './pages/admin/users/UserList';
import CategoryManagement from './pages/admin/categories/CategoryManagement';
import ShopOversight from './pages/admin/shops/ShopOversight';
import FeeTierManagement from './pages/admin/fees/FeeTierManagement';

const AdminPlaceholder = ({ title }: { title: string }) => (
  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-10 text-center flex flex-col items-center justify-center space-y-4 shadow-xl">
    <span className="text-4xl">🛠️</span>
    <h3 className="text-xl font-bold text-slate-100">{title}</h3>
    <p className="text-slate-500 text-sm max-w-md">
      Trang quản trị này đang được phát triển theo lộ trình và sẽ sớm hoàn thành trong các bước tiếp theo.
    </p>
  </div>
);

const DashboardRouter = () => {
  const { user } = useAuth();
  if (user?.role === 'customer') return <CustomerDashboard />;
  if (user?.role === 'vendor') return <Navigate to="/vendor/dashboard" replace />;
  if (user?.role === 'admin') return <Navigate to="/admin/dashboard" replace />;
  return <Navigate to="/forbidden" replace />;
};

const App = () => {
  return (
    <Routes>
      {/* Public Storefront (không cần đăng nhập) */}
      <Route element={<StorefrontLayout />}>
        <Route path="/" element={<ShopPage />} />
        <Route path="/shop" element={<ShopPage />} />
        <Route path="/product/:id" element={<ProductDetailPage />} />
        <Route path="/cart" element={<CartPage />} />
      </Route>

      {/* Auth */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/forbidden" element={<ForbiddenPage />} />

      {/* Protected — tất cả user đã login */}
      <Route element={<PrivateRoute />}>
        <Route element={<StorefrontLayout />}>
          <Route path="/checkout" element={<CheckoutPage />} />
        </Route>

        <Route element={<DashboardLayout />}>

          <Route path="/dashboard" element={<DashboardRouter />} />

          {/* Customer & Vendor Personal Profile */}
          <Route element={<RoleRoute allowedRoles={['customer', 'vendor']} />}>
            <Route path="/account" element={<AccountPage />} />
          </Route>

          {/* Vendor */}
          <Route element={<RoleRoute allowedRoles={['vendor']} />}>
            <Route path="/vendor/dashboard" element={<VendorDashboard />} />
            <Route path="/vendor/shop-profile" element={<VendorShopProfile />} />
            <Route path="/vendor/products" element={<VendorProductList />} />
            <Route path="/vendor/products/new" element={<VendorProductForm />} />
            <Route path="/vendor/products/:id/edit" element={<VendorProductForm />} />
            <Route path="/vendor/orders" element={<VendorOrderList />} />
            <Route path="/vendor/orders/:id" element={<VendorOrderDetail />} />
            <Route path="/vendor/returns" element={<VendorReturnList />} />
            <Route path="/vendor/qa" element={<VendorQAPage />} />
            <Route path="/vendor/fees" element={<VendorFees />} />
          </Route>

          {/* Admin (Old Routes fallback or direct /admin) */}
          <Route element={<RoleRoute allowedRoles={['admin']} />}>
            <Route path="/disputes" element={<Navigate to="/admin/disputes" replace />} />
            <Route path="/disputes/:id" element={<Navigate to="/admin/disputes" replace />} />
          </Route>

        </Route>

        {/* New Super Admin Panel Group */}
        <Route element={<AdminRoute />}>
          <Route element={<AdminLayout />}>
            <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
            <Route path="/admin/dashboard" element={<AdminDashboard />} />
            <Route path="/admin/users" element={<UserList />} />
            <Route path="/admin/categories" element={<CategoryManagement />} />
            <Route path="/admin/shops" element={<ShopOversight />} />
            <Route path="/admin/fees" element={<FeeTierManagement />} />
            <Route path="/admin/disputes" element={<DisputeList />} />
            <Route path="/admin/disputes/:id" element={<DisputeDetail />} />
            <Route path="/admin/settings" element={<AdminPlaceholder title="Cấu Hình Hệ Thống" />} />
          </Route>
        </Route>

      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default App;
