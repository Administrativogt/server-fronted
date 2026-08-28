import { Navigate, Outlet } from 'react-router-dom';
import useAuthStore from '../auth/useAuthStore';

/** Páginas reservadas a superusuarios Django (p. ej. el panel de Auditoría). */
const SuperuserRoute = () => {
  const isSuperuser = useAuthStore((s) => s.is_superuser);
  return isSuperuser === true ? <Outlet /> : <Navigate to="/dashboard" replace />;
};

export default SuperuserRoute;
