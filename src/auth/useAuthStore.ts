import { create } from 'zustand';
import { message } from 'antd';
import { isTokenExpired, isValidJwt } from '../utils/auth';

interface AuthState {
  token: string | null;
  username: string;
  refreshToken: string | null;
  setToken: (token: string) => void;
  setUsername: (username: string) => void;
  setRefreshToken: (token: string) => void;
  logout: (redirect?: boolean) => void;
  isAuthenticated: () => boolean;
}

const useAuthStore = create<AuthState>((set) => {
  const rawToken = localStorage.getItem('token');
  const rawUsername = localStorage.getItem('username') || '';
  const rawRefresh = localStorage.getItem('refreshToken');
  const expiredOrInvalid = !isValidJwt(rawToken) || isTokenExpired(rawToken);

  if (expiredOrInvalid) {
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    localStorage.removeItem('refreshToken');
  }

  return {
    token: expiredOrInvalid ? null : rawToken,
    username: expiredOrInvalid ? '' : rawUsername,
    refreshToken: expiredOrInvalid ? null : rawRefresh,

    setToken: (token) => {
      if (isValidJwt(token) && !isTokenExpired(token)) {
        localStorage.setItem('token', token);
        set({ token });
      } else {
        message.error('Token inválido o expirado');
      }
    },

    setUsername: (username) => {
      localStorage.setItem('username', username);
      set({ username });
    },

    setRefreshToken: (token) => {
      localStorage.setItem('refreshToken', token);
      set({ refreshToken: token });
    },

    logout: (redirect = true) => {
      localStorage.removeItem('token');
      localStorage.removeItem('username');
      localStorage.removeItem('refreshToken');
      set({ token: null, username: '', refreshToken: null });
      message.warning('Tu sesión ha expirado. Por favor, vuelve a iniciar sesión.', 3);

      if (redirect) {
        setTimeout(() => {
          window.location.replace('/login');
        }, 800);
      }
    },

    isAuthenticated: () => {
      const token = localStorage.getItem('token');
      return !!token && isValidJwt(token) && !isTokenExpired(token);
    },
  };
});

export default useAuthStore;