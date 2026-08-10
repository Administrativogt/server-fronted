import { Navigate, Outlet } from 'react-router-dom';
import useAuthStore from '../auth/useAuthStore';
import { canManageInduction } from '../utils/induction';

/** Guard de /dashboard/induccion: superusuarios + RRHH (ver utils/induction). */
export default function InductionRoute() {
  const isSuperuser = useAuthStore((s) => s.is_superuser);
  const username = useAuthStore((s) => s.username);
  return canManageInduction(isSuperuser, username) ? (
    <Outlet />
  ) : (
    <Navigate to="/dashboard" replace />
  );
}
