import { Routes, Route, Navigate } from 'react-router-dom';
import { PrivateRoute } from '../../shared-ui/src/components/PrivateRoute';
import { RoleRoute } from '../../shared-ui/src/components/RoleRoute';
import { DashboardLayout } from '../../shared-ui/src/layouts/DashboardLayout';

// Pages
import LoginPage from './pages/auth/LoginPage';
import ForbiddenPage from './pages/error/ForbiddenPage';
import CustomerDashboard from './pages/dashboard/CustomerDashboard';
import VendorDashboard from './pages/dashboard/VendorDashboard';
import AdminDashboard from './pages/dashboard/AdminDashboard';

function App() {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/403" element={<ForbiddenPage />} />

      {/* Protected Dashboard Routes */}
      <Route element={<PrivateRoute />}>
        <Route element={<DashboardLayout />}>
          {/* Mặc định đưa về dashboard theo role sẽ tính sau, tạm thời redirect */}
          <Route path="/dashboard" element={<Navigate to="/dashboard/customer" replace />} />
          
          <Route element={<RoleRoute allowedRoles={['customer']} />}>
            <Route path="/dashboard/customer" element={<CustomerDashboard />} />
          </Route>

          <Route element={<RoleRoute allowedRoles={['vendor']} />}>
            <Route path="/dashboard/vendor" element={<VendorDashboard />} />
          </Route>

          <Route element={<RoleRoute allowedRoles={['admin']} />}>
            <Route path="/dashboard/admin" element={<AdminDashboard />} />
          </Route>
        </Route>
      </Route>

      {/* Fallback */}
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/403" replace />} />
    </Routes>
  );
}

export default App;
