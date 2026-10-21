import { Navigate, Outlet } from 'react-router-dom';
import useAuthStore from '../auth/useAuthStore';

/** Control de supervisión: Mara Ortiz y TOR002 (el backend valida igual). */
export const SUPERVISION_USERS = ['MARA', 'TOR002'];

export const canAccessSupervision = (
  isSuperuser: boolean,
  username: string | null,
): boolean =>
  isSuperuser || SUPERVISION_USERS.includes((username ?? '').toUpperCase());

export default function SupervisionRoute() {
  const username = useAuthStore((s) => s.username);
  const isSuperuser = useAuthStore((s) => s.is_superuser);
  return canAccessSupervision(isSuperuser, username) ? (
    <Outlet />
  ) : (
    <Navigate to="/dashboard" replace />
  );
}
