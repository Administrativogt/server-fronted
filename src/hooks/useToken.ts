import { useCallback } from 'react';
import { isTokenExpired, isValidJwt } from '../utils/auth';
import useAuthStore from '../auth/useAuthStore';
import api from '../api/axios';

export function useToken() {
  const { setToken, logout } = useAuthStore();

  const getToken = useCallback(() => {
    const token = localStorage.getItem('token');
    if (!token || !isValidJwt(token) || isTokenExpired(token)) {
      return null;
    }
    return token;
  }, []);

  const clearToken = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    localStorage.removeItem('refreshToken');
  }, []);

  const isAuthenticated = useCallback(() => {
    const token = getToken();
    return !!token;
  }, [getToken]);

  const refreshAccessToken = useCallback(async () => {
    const storedRefresh = localStorage.getItem('refreshToken');
    if (!storedRefresh) return false;

    try {
      const res = await api.post('/auth/refresh', { refreshToken: storedRefresh });
      if (res.data?.accessToken) {
        setToken(res.data.accessToken);
        return true;
      }
      return false;
    } catch {
      logout();
      return false;
    }
  }, [setToken, logout]);

  return {
    getToken,
    clearToken,
    isAuthenticated,
    refreshAccessToken,
  };
}