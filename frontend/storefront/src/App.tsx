import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

// Shared
import PrivateRoute from '../../shared-ui/src/components/PrivateRoute';
import RoleRoute from '../../shared-ui/src/components/RoleRoute';
import DashboardLayout from '../../shared-ui/src/layouts/DashboardLayout';

// Pages
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import CustomerDashboard from './pages/dashboard/CustomerDashboard';
import VendorDashboard from './pages/dashboard/VendorDashboard';
import AdminDashboard from './pages/dashboard/AdminDashboard';
import AccountPage from './pages/account/AccountPage';
import ShopPage from './pages/shop/ShopPage';
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
      {/* Public */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/forbidden" element={<ForbiddenPage />} />

      {/* Protected — tất cả user đã login */}
      <Route element={<PrivateRoute />}>
        <Route element={<DashboardLayout />}>
          
          <Route path="/dashboard" element={<DashboardRouter />} />

          {/* Customer */}
          <Route element={<RoleRoute allowedRoles={['customer']} />}>
            <Route path="/shop" element={<ShopPage />} />
            <Route path="/account" element={<AccountPage />} />
          </Route>

          {/* Superadmin / Vendor / Other routes here...  */}

        </Route>
      </Route>

      {/* Default redirect: nếu cố vào các link linh tinh, đẩy về dashboard (PrivateRoute sẽ lo việc đá ra login nếu chưa đăng nhập) */}
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
};

export default App;
