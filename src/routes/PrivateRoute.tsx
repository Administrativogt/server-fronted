import { Navigate, Outlet, useLocation } from 'react-router-dom';
import useAuthStore from '../auth/useAuthStore';

export default function PrivateRoute() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const location = useLocation();

  if (isAuthenticated()) return <Outlet />;

  // Preservar la URL original (incluye search y hash) para volver tras login
  const from = `${location.pathname}${location.search}${location.hash}`;
  return <Navigate to="/login" replace state={{ from }} />;
}
