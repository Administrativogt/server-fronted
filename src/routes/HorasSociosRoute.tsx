import { Navigate, Outlet } from 'react-router-dom';
import useAuthStore from '../auth/useAuthStore';

/** Usuarios con acceso al submódulo Horas Socios (el backend valida igual). */
export const HORAS_SOCIOS_USERS = ['BAR000', 'TOR002'];

export const canAccessHorasSocios = (
  isSuperuser: boolean,
  username: string | null,
): boolean =>
  isSuperuser || HORAS_SOCIOS_USERS.includes((username ?? '').toUpperCase());

export default function HorasSociosRoute() {
  const username = useAuthStore((s) => s.username);
  const isSuperuser = useAuthStore((s) => s.is_superuser);
  return canAccessHorasSocios(isSuperuser, username) ? (
    <Outlet />
  ) : (
    <Navigate to="/dashboard" replace />
  );
}
