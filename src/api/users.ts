import api from "./axios";

export interface UserLite {
  id: number;
  first_name?: string;
  last_name?: string;
  email?: string;
}

export function fullName(u?: UserLite | null) {
  if (!u) return '';
  return `${u.first_name ?? ''} ${u.last_name ?? ''}`.trim();
}

export async function fetchUsers(): Promise<UserLite[]> {
  // ajusta si tu endpoint es distinto
  const { data } = await api.get('/users');
  return data;
}
