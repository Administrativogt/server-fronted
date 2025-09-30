// src/auth/useAuthStore.ts
import { create } from 'zustand';
import { isTokenExpired } from '../utils/auth';
import { message } from 'antd';

interface AuthState {
  token: string | null;
  username: string;
  setToken: (token: string) => void;
  setUsername: (username: string) => void;
  logout: () => void;
  isAuthenticated: () => boolean;
}

const useAuthStore = create<AuthState>((set) => {
  const rawToken = localStorage.getItem('token');
  const rawUsername = localStorage.getItem('username') || '';
  const expired = isTokenExpired(rawToken);

  if (expired) {
    localStorage.removeItem('token');
    localStorage.removeItem('username');
  }

  return {
    token: expired ? null : rawToken,
    username: expired ? '' : rawUsername,

    setToken: (token) => {
      localStorage.setItem('token', token);
      set({ token });
    },

    setUsername: (username) => {
      localStorage.setItem('username', username);
      set({ username });
    },

    logout: () => {
      localStorage.removeItem('token');
      localStorage.removeItem('username');

      set({ token: null, username: '' });

      // 🔔 Mostrar mensaje
      message.warning('Tu sesión ha expirado. Por favor, vuelve a iniciar sesión.');

      // Redirigir
      window.location.href = '/login';
    },

    isAuthenticated: () => {
      const currentToken = localStorage.getItem('token');
      return !!currentToken && !isTokenExpired(currentToken);
    },
  };
});

export default useAuthStore;