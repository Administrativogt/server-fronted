import axios from 'axios';
import useAuthStore from '../auth/useAuthStore';
import { isValidJwt, isTokenExpired } from '../utils/auth';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use(async (config) => {
  // ✅ CAMBIAR: usar sessionStorage en lugar de localStorage
  const token = sessionStorage.getItem('token');
  const refreshToken = sessionStorage.getItem('refreshToken');
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
    // Solo hacer logout si es 401 Y hay un token guardado (sesión expirada)
    // No hacer logout si no hay token (usuario no autenticado intentando acceder a ruta protegida)
    const token = sessionStorage.getItem('token');
    if (err.response?.status === 401 && token) {
      // Verificar si el token expiró
      if (isTokenExpired(token)) {
        const { logout } = useAuthStore.getState();
        logout();
      }
    }
    return Promise.reject(err);
  }
);

export default api;