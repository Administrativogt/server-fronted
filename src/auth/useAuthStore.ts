import { create } from 'zustand';

interface AuthState {
  token: string | null;
  username: string;
  setToken: (token: string) => void;
  setUsername: (username: string) => void;
  logout: () => void;
}

const useAuthStore = create<AuthState>((set) => ({
  token: localStorage.getItem('token'),
  username: localStorage.getItem('username') || '',
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
  },
}));

export default useAuthStore;
