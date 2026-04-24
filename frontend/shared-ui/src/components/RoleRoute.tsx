import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface RoleRouteProps {
  allowedRoles: string[];
}

export const RoleRoute = ({ allowedRoles }: RoleRouteProps) => {
  const { role, isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (!role || !allowedRoles.includes(role)) {
    console.log(`[auth-route]: Access Denied - 403 - Role mismatch (Required: ${allowedRoles}, Current: ${role})`);
    return <Navigate to="/403" replace />;
  }

  return <Outlet />;
};
