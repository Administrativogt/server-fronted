import useAuthStore from './useAuthStore';
import type { ModuleAccessItem } from '../types/module-access.types';

const decodeJwt = (token: string) => {
  try {
    return JSON.parse(atob(token.split('.')[1]));
  } catch {
    return null;
  }
};

/**
 * Guarda en el store la respuesta de un login (usuario/contraseña o
 * Microsoft): `{ access_token, user }` de AuthService.login.
 */
export function applySession(access_token: string, user: any, fallbackUsername = '') {
  const decoded = decodeJwt(access_token);
  if (!decoded) throw new Error('Token inválido');
  const s = useAuthStore.getState();
  s.setToken(access_token);
  s.setRefreshToken('');
  s.setUsername(decoded.username || user?.username || fallbackUsername);
  s.setFirstName(user?.first_name || '');
  s.setLastName(user?.last_name || '');
  s.setUserId(decoded.sub);
  s.setTipoUsuario(user?.tipo_usuario ?? null);
  s.setAreaId(user?.area?.id ?? null);
  s.setEquipoId(user?.equipo?.id ?? null);
  s.setIsSuperuser(user?.is_superuser === true);
  s.setPermissions(Array.isArray(user?.codenames) ? user.codenames : []);
  s.setModules(Array.isArray(user?.modules) ? (user.modules as ModuleAccessItem[]) : []);
  return decoded;
}
