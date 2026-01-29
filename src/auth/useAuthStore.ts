// src/auth/useAuthStore.ts
import { create } from 'zustand';
import { message } from 'antd';
import { isTokenExpired, isValidJwt } from '../utils/auth';

interface AuthState {
  token: string | null;
  username: string;
  userId: number | null;
  refreshToken: string | null;
  tipo_usuario: number | null; // 👈 Añadido
  setToken: (token: string) => void;
  setUsername: (username: string) => void;
  setUserId: (id: number) => void;
  setRefreshToken: (token: string) => void;
  setTipoUsuario: (tipo: number) => void; // 👈 Añadido
  logout: (redirect?: boolean) => void;
  isAuthenticated: () => boolean;
}

const useAuthStore = create<AuthState>((set) => {
  const rawToken = sessionStorage.getItem('token');
  const rawUsername = sessionStorage.getItem('username') || '';
  const rawUserId = Number(sessionStorage.getItem('userId'));
  const rawRefresh = sessionStorage.getItem('refreshToken');
  const rawTipoUsuario = sessionStorage.getItem('tipo_usuario');
  const parsedTipoUsuario = rawTipoUsuario ? Number(rawTipoUsuario) : null;

  const expiredOrInvalid = !isValidJwt(rawToken) || isTokenExpired(rawToken);

  if (expiredOrInvalid) {
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('username');
    sessionStorage.removeItem('userId');
    sessionStorage.removeItem('refreshToken');
    sessionStorage.removeItem('tipo_usuario');
  }

  return {
    token: expiredOrInvalid ? null : rawToken,
    username: expiredOrInvalid ? '' : rawUsername,
    userId: expiredOrInvalid ? null : rawUserId,
    refreshToken: expiredOrInvalid ? null : rawRefresh,
    tipo_usuario: expiredOrInvalid ? null : parsedTipoUsuario, // 👈

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

    logout: (redirect = true) => {
      sessionStorage.removeItem('token');
      sessionStorage.removeItem('username');
      sessionStorage.removeItem('userId');
      sessionStorage.removeItem('refreshToken');
      sessionStorage.removeItem('tipo_usuario');
      set({
        token: null,
        username: '',
        userId: null,
        refreshToken: null,
        tipo_usuario: null,
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





