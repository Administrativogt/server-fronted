import api from './axios';

export type NotaGastoArea = 'MIGRACION' | 'PENAL' | 'LABORAL';

export const NOTA_GASTO_AREAS: { value: NotaGastoArea; label: string }[] = [
  { value: 'MIGRACION', label: 'Migración' },
  { value: 'PENAL', label: 'Penal' },
  { value: 'LABORAL', label: 'Laboral' },
];

export interface NotaGastoUser {
  id: number;
  username: string;
  first_name: string;
  last_name: string;
}

export interface NotaGasto {
  id: number;
  area: NotaGastoArea;
  cliente: string;
  caso: string | null;
  nombre: string;
  nt: number | null;
  observaciones: string;
  activo: boolean;
  creator: NotaGastoUser | null;
  updated_by: NotaGastoUser | null;
  created_at: string;
  updated_at: string;
}

export interface NotaGastoPayload {
  area: NotaGastoArea;
  cliente: string;
  caso?: string | null;
  nombre: string;
  nt?: number | null;
  observaciones?: string;
  activo?: boolean;
}

const BASE = '/api/notas-gastos';

export async function listNotasGastos(includeInactive = false): Promise<NotaGasto[]> {
  const { data } = await api.get<NotaGasto[]>(BASE, {
    params: { include_inactive: includeInactive },
  });
  return data;
}

export async function createNotaGasto(payload: NotaGastoPayload): Promise<NotaGasto> {
  const { data } = await api.post<NotaGasto>(BASE, payload);
  return data;
}

export async function updateNotaGasto(
  id: number,
  payload: Partial<NotaGastoPayload>,
): Promise<NotaGasto> {
  const { data } = await api.patch<NotaGasto>(`${BASE}/${id}`, payload);
  return data;
}

export async function deactivateNotaGasto(id: number): Promise<NotaGasto> {
  const { data } = await api.delete<NotaGasto>(`${BASE}/${id}`);
  return data;
}
