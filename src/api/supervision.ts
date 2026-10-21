import api from './axios';

export type SupervisionTipo = 'MENSAJERIA' | 'LIMPIEZA';
export type Cumplimiento = 'CUMPLE' | 'PARCIAL' | 'NO_CUMPLE' | 'NA';

export const TIPO_LABEL: Record<SupervisionTipo, string> = {
  MENSAJERIA: 'Mensajería',
  LIMPIEZA: 'Limpieza',
};

export interface CriterioDef {
  key: string;
  label: string;
}

export interface SeccionDef {
  key: string;
  titulo: string;
  criterios: CriterioDef[];
}

export interface SupervisionCatalogo {
  mensajeria: { secciones: SeccionDef[]; incidencias: CriterioDef[]; valores: Cumplimiento[] };
  limpieza: {
    secciones: SeccionDef[];
    escala: { valor: number; label: string; descripcion: string }[];
  };
}

export interface PersonalItem {
  id: number;
  username: string;
  nombre: string;
}

export interface ResumenEvaluado {
  calificados: number;
  puntaje: number | null;
  total?: number;
  cumple?: number;
  parcial?: number;
  no_cumple?: number;
  incidencias?: number;
}

export interface EvaluadoPayload {
  usuario_id: number | null;
  nombre: string;
  calificaciones: Record<string, Cumplimiento | number>;
  incidencias: Record<string, boolean>;
  vehiculo: string;
  telefono: string;
  hora_salida: string | null;
  hora_retorno: string | null;
  observaciones: string;
}

export interface Evaluado extends EvaluadoPayload {
  id: number;
  orden: number;
  usuario: { id: number; username: string } | null;
  resumen: ResumenEvaluado;
}

interface RevisionUser {
  id: number;
  username: string;
  first_name: string;
  last_name: string;
}

export interface RevisionPayload {
  tipo: SupervisionTipo;
  fecha: string;
  sede: string;
  observaciones_items: Record<string, string>;
  descripcion_incidencias: string;
  observaciones_generales: string;
  compromisos: string;
  evaluados: EvaluadoPayload[];
}

export interface Revision extends Omit<RevisionPayload, 'evaluados'> {
  id: number;
  evaluados: Evaluado[];
  creator: RevisionUser | null;
  updated_by: RevisionUser | null;
  created_at: string;
  updated_at: string;
}

const BASE = '/api/supervision';

export async function getCatalogo(): Promise<SupervisionCatalogo> {
  const { data } = await api.get<SupervisionCatalogo>(`${BASE}/catalogo`);
  return data;
}

export async function getPersonal(tipo: SupervisionTipo): Promise<PersonalItem[]> {
  const { data } = await api.get<PersonalItem[]>(`${BASE}/personal`, { params: { tipo } });
  return data;
}

export async function listRevisiones(params: {
  tipo?: SupervisionTipo;
  from?: string;
  to?: string;
}): Promise<Revision[]> {
  const { data } = await api.get<Revision[]>(`${BASE}/revisiones`, { params });
  return data;
}

export async function getRevision(id: number): Promise<Revision> {
  const { data } = await api.get<Revision>(`${BASE}/revisiones/${id}`);
  return data;
}

export async function createRevision(payload: RevisionPayload): Promise<Revision> {
  const { data } = await api.post<Revision>(`${BASE}/revisiones`, payload);
  return data;
}

export async function updateRevision(id: number, payload: RevisionPayload): Promise<Revision> {
  const { data } = await api.put<Revision>(`${BASE}/revisiones/${id}`, payload);
  return data;
}

export async function deleteRevision(id: number): Promise<void> {
  await api.delete(`${BASE}/revisiones/${id}`);
}

/** "Mensajería: 92.5 %" / "Limpieza: 4.25 / 5" */
export const formatPuntaje = (tipo: SupervisionTipo, puntaje: number | null | undefined) => {
  if (puntaje == null) return '—';
  return tipo === 'MENSAJERIA' ? `${puntaje.toFixed(puntaje % 1 ? 1 : 0)} %` : `${puntaje.toFixed(2)} / 5`;
};

/** Semáforo común: bueno / a mejorar / deficiente. */
export const nivelPuntaje = (
  tipo: SupervisionTipo,
  puntaje: number | null | undefined,
): 'success' | 'warning' | 'error' | 'default' => {
  if (puntaje == null) return 'default';
  const pct = tipo === 'MENSAJERIA' ? puntaje : (puntaje / 5) * 100;
  if (pct >= 85) return 'success';
  if (pct >= 65) return 'warning';
  return 'error';
};
