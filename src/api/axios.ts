// api.ts
import axios from 'axios';
import useAuthStore from '../auth/useAuthStore';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      const logout = useAuthStore.getState().logout;
      logout(); // Llama a la función logout de zustand
    }
    return Promise.reject(err);
  }
);

export default api;