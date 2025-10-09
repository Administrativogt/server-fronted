import axios from 'axios';
import useAuthStore from '../auth/useAuthStore';
import { isValidJwt, isTokenExpired } from '../utils/auth';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use(async (config) => {
  const token = localStorage.getItem('token');
  const refreshToken = localStorage.getItem('refreshToken');
  const { setToken, logout } = useAuthStore.getState();

  if (token && isValidJwt(token)) {
    if (isTokenExpired(token)) {
      // Intenta refrescar el token automáticamente
      try {
        const res = await axios.post(`${import.meta.env.VITE_API_URL}/auth/refresh`, {
          refreshToken,
        });
        if (res.data?.accessToken) {
          setToken(res.data.accessToken);
          config.headers.Authorization = `Bearer ${res.data.accessToken}`;
        } else {
          logout();
        }
      } catch {
        logout();
      }
    } else {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }

  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      const { logout } = useAuthStore.getState();
      logout();
    }
    return Promise.reject(err);
  }
);

export default api;