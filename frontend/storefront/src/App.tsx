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
import VendorDashboard from './pages/dashboard/VendorDashboard';
import AdminDashboard from './pages/dashboard/AdminDashboard';
import AccountPage from './pages/account/AccountPage';
import ShopPage from './pages/shop/ShopPage';
import ProductDetailPage from './pages/shop/ProductDetailPage';
import CartPage from './pages/shop/CartPage';
import CheckoutPage from './pages/shop/CheckoutPage';
import ForbiddenPage from './pages/error/ForbiddenPage';

import { useAuth } from '../../shared-ui/src/context/AuthContext';

const DashboardRouter = () => {
  const { user } = useAuth();
  if (user?.role === 'customer') return <CustomerDashboard />;
  if (user?.role === 'vendor') return <VendorDashboard />;
  if (user?.role === 'admin') return <AdminDashboard />;
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

          {/* Customer */}
          <Route element={<RoleRoute allowedRoles={['customer']} />}>
            <Route path="/account" element={<AccountPage />} />
          </Route>

          {/* Superadmin / Vendor / Other routes here...  */}

        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default App;
