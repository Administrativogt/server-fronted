import { Navigate, Outlet } from 'react-router-dom';
import useAuthStore from '../auth/useAuthStore';

/** Usuarios del área de RR.HH. de vacaciones (el backend valida igual). */
export const VACATION_HR_USERS = ['MEJ000', 'TOR002', 'BAR000'];

export const canAccessVacationHr = (
  isSuperuser: boolean,
  username: string | null,
): boolean =>
  isSuperuser || VACATION_HR_USERS.includes((username ?? '').toUpperCase());

export default function VacationHrRoute() {
  const username = useAuthStore((s) => s.username);
  const isSuperuser = useAuthStore((s) => s.is_superuser);
  return canAccessVacationHr(isSuperuser, username) ? (
    <Outlet />
  ) : (
    <Navigate to="/dashboard" replace />
  );
}
