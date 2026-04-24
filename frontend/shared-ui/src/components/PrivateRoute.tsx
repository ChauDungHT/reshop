import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export const PrivateRoute = () => {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    console.log('[auth-route]: Access Denied - 401 - Redirecting to /login');
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
};
