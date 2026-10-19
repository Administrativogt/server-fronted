import { Navigate, Outlet } from 'react-router-dom';
import useAuthStore from '../auth/useAuthStore';

/**
 * Liquidaciones: solo estos usuarios; ser superusuario NO da acceso
 * (espejo de VacationLiquidationGuard en el backend).
 */
export const VACATION_HR_USERS = ['MEJ000', 'TOR002', 'BAR000'];

export const canAccessVacationHr = (username: string | null): boolean =>
  VACATION_HR_USERS.includes((username ?? '').toUpperCase());

export default function VacationHrRoute() {
  const username = useAuthStore((s) => s.username);
  return canAccessVacationHr(username) ? (
    <Outlet />
  ) : (
    <Navigate to="/dashboard" replace />
  );
}
