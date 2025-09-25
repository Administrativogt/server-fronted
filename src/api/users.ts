import api from './axios';

export interface UserLite {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  area?: { id: number; name: string };
  equipo?: { id: number; nombre: string };
}

export function fullName(u?: UserLite | null) {
  if (!u) return '';
  return `${u.first_name ?? ''} ${u.last_name ?? ''}`.trim();
}

export async function fetchUsers(): Promise<UserLite[]> {
  const { data } = await api.get('/users');
  return data;
}