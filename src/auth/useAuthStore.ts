// src/auth/useAuthStore.ts
import { create } from 'zustand';
import { message } from 'antd';
import { isTokenExpired, isValidJwt } from '../utils/auth';

interface AuthState {
  token: string | null;
  username: string;
  userId: number | null;
  refreshToken: string | null;
  tipo_usuario: number | null;
  is_superuser: boolean;
  permissions: string[];
  setToken: (token: string) => void;
  setUsername: (username: string) => void;
  setUserId: (id: number) => void;
  setRefreshToken: (token: string) => void;
  setTipoUsuario: (tipo: number) => void;
  setIsSuperuser: (value: boolean) => void;
  setPermissions: (permissions: string[]) => void;
  logout: (redirect?: boolean) => void;
  isAuthenticated: () => boolean;
}

const useAuthStore = create<AuthState>((set) => {
  const rawToken = sessionStorage.getItem('token');
  const rawUsername = sessionStorage.getItem('username') || '';
  const rawUserId = Number(sessionStorage.getItem('userId'));
  const rawRefresh = sessionStorage.getItem('refreshToken');
  const rawTipoUsuario = sessionStorage.getItem('tipo_usuario');
  const rawIsSuperuser = sessionStorage.getItem('is_superuser');
  const rawPermissions = sessionStorage.getItem('permissions');
  const parsedTipoUsuario = rawTipoUsuario ? Number(rawTipoUsuario) : null;
  const parsedIsSuperuser = rawIsSuperuser === 'true';
  const parsedPermissions = rawPermissions ? JSON.parse(rawPermissions) : [];

  const expiredOrInvalid = !isValidJwt(rawToken) || isTokenExpired(rawToken);

  if (expiredOrInvalid) {
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('username');
    sessionStorage.removeItem('userId');
    sessionStorage.removeItem('refreshToken');
    sessionStorage.removeItem('tipo_usuario');
    sessionStorage.removeItem('is_superuser');
    sessionStorage.removeItem('permissions');
  }

  return {
    token: expiredOrInvalid ? null : rawToken,
    username: expiredOrInvalid ? '' : rawUsername,
    userId: expiredOrInvalid ? null : rawUserId,
    refreshToken: expiredOrInvalid ? null : rawRefresh,
    tipo_usuario: expiredOrInvalid ? null : parsedTipoUsuario,
    is_superuser: expiredOrInvalid ? false : parsedIsSuperuser,
    permissions: expiredOrInvalid ? [] : parsedPermissions,

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
      sessionStorage.setItem('tipo_usuario', tipo.toString());
      set({ tipo_usuario: tipo });
    },

    setIsSuperuser: (value) => {
      sessionStorage.setItem('is_superuser', value.toString());
      set({ is_superuser: value });
    },

    setPermissions: (permissions) => {
      sessionStorage.setItem('permissions', JSON.stringify(permissions));
      set({ permissions });
    },

    logout: (redirect = true) => {
      sessionStorage.removeItem('token');
      sessionStorage.removeItem('username');
      sessionStorage.removeItem('userId');
      sessionStorage.removeItem('refreshToken');
      sessionStorage.removeItem('tipo_usuario');
      sessionStorage.removeItem('is_superuser');
      sessionStorage.removeItem('permissions');
      set({
        token: null,
        username: '',
        userId: null,
        refreshToken: null,
        tipo_usuario: null,
        is_superuser: false,
        permissions: [],
      });
      message.warning('Tu sesión ha expirado. Por favor, vuelve a iniciar sesión.', 3);

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





