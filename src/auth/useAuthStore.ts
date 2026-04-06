// src/auth/useAuthStore.ts
import { create } from 'zustand';
import { message } from 'antd';
import { isTokenExpired, isValidJwt } from '../utils/auth';
import type { ModuleAccessItem } from '../types/module-access.types';

let lastSessionExpiredWarnAt = 0;
const SESSION_WARN_COOLDOWN_MS = 3000;

interface AuthState {
  token: string | null;
  username: string;
  userId: number | null;
  refreshToken: string | null;
  tipo_usuario: number | null;
  is_superuser: boolean;
  areaId: number | null;
  permissions: string[];
  modules: ModuleAccessItem[];
  setAreaId: (id: number | null) => void;
  setToken: (token: string) => void;
  setUsername: (username: string) => void;
  setUserId: (id: number) => void;
  setRefreshToken: (token: string) => void;
  setTipoUsuario: (tipo: number | null) => void;
  setIsSuperuser: (value: boolean) => void;
  setPermissions: (permissions: string[]) => void;
  setModules: (modules: ModuleAccessItem[]) => void;
  logout: (redirect?: boolean) => void;
  isAuthenticated: () => boolean;
}

const useAuthStore = create<AuthState>((set) => {
  const rawToken = sessionStorage.getItem('token');
  const rawUsername = sessionStorage.getItem('username') || '';
  const rawUserId = Number(sessionStorage.getItem('userId'));
  const rawRefresh = sessionStorage.getItem('refreshToken');
  const rawTipoUsuario = sessionStorage.getItem('tipo_usuario');
  const rawAreaId = sessionStorage.getItem('areaId');
  const rawIsSuperuser = sessionStorage.getItem('is_superuser');
  const rawPermissions = sessionStorage.getItem('permissions');
  const rawModules = sessionStorage.getItem('modules');
  const parsedTipoUsuario = rawTipoUsuario ? Number(rawTipoUsuario) : null;
  const parsedAreaId = rawAreaId ? Number(rawAreaId) : null;
  const parsedIsSuperuser = rawIsSuperuser === 'true';
  const parsedPermissions = rawPermissions ? JSON.parse(rawPermissions) : [];
  const parsedModules = rawModules ? JSON.parse(rawModules) : [];

  const expiredOrInvalid = !isValidJwt(rawToken) || isTokenExpired(rawToken);

  if (expiredOrInvalid) {
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('username');
    sessionStorage.removeItem('userId');
    sessionStorage.removeItem('refreshToken');
    sessionStorage.removeItem('tipo_usuario');
    sessionStorage.removeItem('areaId');
    sessionStorage.removeItem('is_superuser');
    sessionStorage.removeItem('permissions');
    sessionStorage.removeItem('modules');
  }

  return {
    token: expiredOrInvalid ? null : rawToken,
    username: expiredOrInvalid ? '' : rawUsername,
    userId: expiredOrInvalid ? null : rawUserId,
    refreshToken: expiredOrInvalid ? null : rawRefresh,
    tipo_usuario: expiredOrInvalid ? null : parsedTipoUsuario,
    areaId: expiredOrInvalid ? null : parsedAreaId,
    is_superuser: expiredOrInvalid ? false : parsedIsSuperuser,
    permissions: expiredOrInvalid ? [] : parsedPermissions,
    modules: expiredOrInvalid ? [] : parsedModules,

    setToken: (token) => {
      if (isValidJwt(token) && !isTokenExpired(token)) {
        sessionStorage.setItem('token', token);
        set({ token });
      } else {
        message.error('Token inválido o expirado');
      }
    },

    setUsername: (username) => {
      sessionStorage.setItem('username', username);
      set({ username });
    },

    setUserId: (id) => {
      sessionStorage.setItem('userId', id.toString());
      set({ userId: id });
    },

    setRefreshToken: (token) => {
      sessionStorage.setItem('refreshToken', token);
      set({ refreshToken: token });
    },

    setTipoUsuario: (tipo) => {
      if (tipo === null || Number.isNaN(tipo)) {
        sessionStorage.removeItem('tipo_usuario');
        set({ tipo_usuario: null });
        return;
      }
      sessionStorage.setItem('tipo_usuario', tipo.toString());
      set({ tipo_usuario: tipo });
    },

    setIsSuperuser: (value) => {
      sessionStorage.setItem('is_superuser', value.toString());
      set({ is_superuser: value });
    },

    setAreaId: (id) => {
      if (id === null || Number.isNaN(id)) {
        sessionStorage.removeItem('areaId');
        set({ areaId: null });
        return;
      }
      sessionStorage.setItem('areaId', id.toString());
      set({ areaId: id });
    },

    setPermissions: (permissions) => {
      sessionStorage.setItem('permissions', JSON.stringify(permissions));
      set({ permissions });
    },

    setModules: (modules) => {
      sessionStorage.setItem('modules', JSON.stringify(modules));
      set({ modules });
    },

    logout: (redirect = true) => {
      const hadToken = !!sessionStorage.getItem('token');
      sessionStorage.removeItem('token');
      sessionStorage.removeItem('username');
      sessionStorage.removeItem('userId');
      sessionStorage.removeItem('refreshToken');
      sessionStorage.removeItem('tipo_usuario');
      sessionStorage.removeItem('areaId');
      sessionStorage.removeItem('is_superuser');
      sessionStorage.removeItem('permissions');
      sessionStorage.removeItem('modules');
      set({
        token: null,
        username: '',
        userId: null,
        refreshToken: null,
        tipo_usuario: null,
        areaId: null,
        is_superuser: false,
        permissions: [],
        modules: [],
      });

      const now = Date.now();
      if (hadToken && now - lastSessionExpiredWarnAt > SESSION_WARN_COOLDOWN_MS) {
        lastSessionExpiredWarnAt = now;
        message.warning('Tu sesión ha expirado. Por favor, vuelve a iniciar sesión.', 3);
      }

      if (redirect) {
        setTimeout(() => {
          window.location.replace('/login');
        }, 800);
      }
    },

    isAuthenticated: () => {
      const token = sessionStorage.getItem('token');
      return !!token && isValidJwt(token) && !isTokenExpired(token);
    },
  };
});

export default useAuthStore;




