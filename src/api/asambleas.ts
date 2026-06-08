// src/api/asambleas.ts — submódulo Asambleas (Actas de Nombramiento)
import api from './axios';
import type {
  Asamblea,
  Sociedad,
  ReglaNotificacion,
  CreateAsambleaDto,
  UpdateAsambleaDto,
  CreateSociedadDto,
  UpdateSociedadDto,
  CreateReglaDto,
  UpdateReglaDto,
  EstadoAsamblea,
} from '../types/asambleas.types';

// ─── Asambleas ───────────────────────────────────────────────────────────────
export interface AsambleaFilters {
  estado?: EstadoAsamblea;
  periodo?: number;
  anio?: number;
  sociedadId?: number;
}

export const getAsambleas = async (f: AsambleaFilters = {}): Promise<Asamblea[]> => {
  const params = new URLSearchParams();
  if (f.estado) params.append('estado', f.estado);
  if (f.periodo) params.append('periodo', String(f.periodo));
  if (f.anio) params.append('anio', String(f.anio));
  if (f.sociedadId) params.append('sociedadId', String(f.sociedadId));
  const { data } = await api.get<{ data: Asamblea[] }>(`/api/asambleas?${params.toString()}`);
  return data.data;
};

export const getAsambleasPendientes = async (anio?: number): Promise<Asamblea[]> => {
  const { data } = await api.get<{ data: Asamblea[] }>(
    `/api/asambleas/pendientes${anio ? `?anio=${anio}` : ''}`,
  );
  return data.data;
};

export const getAsambleasHistorial = async (sociedadId?: number): Promise<Asamblea[]> => {
  const { data } = await api.get<{ data: Asamblea[] }>(
    `/api/asambleas/historial${sociedadId ? `?sociedadId=${sociedadId}` : ''}`,
  );
  return data.data;
};

export const getAsamblea = async (id: number): Promise<Asamblea> => {
  const { data } = await api.get<{ data: Asamblea }>(`/api/asambleas/${id}`);
  return data.data;
};

// ─── Disparos manuales de recordatorios (envían correos reales) ──────────────
export const dispararPreAlerta = async (mes: number, anio?: number) => {
  const { data } = await api.post<{ message: string; batches: number }>(
    '/api/asambleas/disparar/pre-alerta',
    { mes, anio },
  );
  return data;
};

export const dispararFinal = async (mes: number, anio?: number) => {
  const { data } = await api.post<{ message: string; sent: number }>(
    '/api/asambleas/disparar/final',
    { mes, anio },
  );
  return data;
};

export const createAsamblea = async (dto: CreateAsambleaDto) => {
  const { data } = await api.post<{ message: string; data: Asamblea }>('/api/asambleas', dto);
  return data;
};

export const updateAsamblea = async (id: number, dto: UpdateAsambleaDto) => {
  const { data } = await api.patch<{ message: string; data: Asamblea }>(`/api/asambleas/${id}`, dto);
  return data;
};

export const completarAsamblea = async (id: number) => {
  const { data } = await api.post<{ message: string; data: Asamblea }>(
    `/api/asambleas/${id}/completar`,
    {},
  );
  return data;
};

// ─── Sociedades ──────────────────────────────────────────────────────────────
export const getSociedades = async (onlyActive = false): Promise<Sociedad[]> => {
  const { data } = await api.get<{ data: Sociedad[] }>(
    `/api/sociedades${onlyActive ? '?active=true' : ''}`,
  );
  return data.data;
};

export const getSociedad = async (id: number): Promise<Sociedad> => {
  const { data } = await api.get<{ data: Sociedad }>(`/api/sociedades/${id}`);
  return data.data;
};

export const createSociedad = async (dto: CreateSociedadDto) => {
  const { data } = await api.post<{ message: string; data: Sociedad }>('/api/sociedades', dto);
  return data;
};

export const updateSociedad = async (id: number, dto: UpdateSociedadDto) => {
  const { data } = await api.patch<{ message: string; data: Sociedad }>(`/api/sociedades/${id}`, dto);
  return data;
};

export const deleteSociedad = async (id: number) => {
  const { data } = await api.delete<{ message: string }>(`/api/sociedades/${id}`);
  return data;
};

// ─── Reglas de notificación ──────────────────────────────────────────────────
export const getReglas = async (onlyActive = false): Promise<ReglaNotificacion[]> => {
  const { data } = await api.get<{ data: ReglaNotificacion[] }>(
    `/api/reglas-notificacion${onlyActive ? '?active=true' : ''}`,
  );
  return data.data;
};

export const getRegla = async (id: number): Promise<ReglaNotificacion> => {
  const { data } = await api.get<{ data: ReglaNotificacion }>(`/api/reglas-notificacion/${id}`);
  return data.data;
};

export const createRegla = async (dto: CreateReglaDto) => {
  const { data } = await api.post<{ message: string; data: ReglaNotificacion }>(
    '/api/reglas-notificacion',
    dto,
  );
  return data;
};

export const updateRegla = async (id: number, dto: UpdateReglaDto) => {
  const { data } = await api.patch<{ message: string; data: ReglaNotificacion }>(
    `/api/reglas-notificacion/${id}`,
    dto,
  );
  return data;
};

export const deleteRegla = async (id: number) => {
  const { data } = await api.delete<{ message: string }>(`/api/reglas-notificacion/${id}`);
  return data;
};
