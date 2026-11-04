import axios from './axios';

/**
 * Control de dinero de Migración (reemplaza la hoja "DINERO 2026" del Excel
 * "NT Honorarios y Gastos"). Ver MigracionDineroController (backend).
 */

export type DineroEstatus =
  | 'solicitado'
  | 'por_autorizar'
  | 'autorizado'
  | 'cheque_emitido'
  | 'liquidado'
  | 'cerrado_sirvo'
  | 'anulado';

export const DINERO_ESTATUS: Array<{ value: DineroEstatus; label: string; color: string; hint: string }> = [
  { value: 'solicitado', label: 'Solicitado', color: 'blue', hint: 'Aún no aparece en Sirvo' },
  { value: 'por_autorizar', label: 'Por autorizar', color: 'cyan', hint: 'En Sirvo, falta autorización' },
  { value: 'autorizado', label: 'Autorizado', color: 'geekblue', hint: 'Autorizado, aún sin cheque' },
  { value: 'cheque_emitido', label: 'Cheque emitido', color: 'orange', hint: 'Cheque emitido, falta liquidar' },
  { value: 'liquidado', label: 'Liquidado', color: 'green', hint: 'Liquidado' },
  { value: 'cerrado_sirvo', label: 'Cerrado en Sirvo', color: 'default', hint: 'Ya no está pendiente en Sirvo' },
  { value: 'anulado', label: 'Anulado / rechazado', color: 'red', hint: 'Anulado o rechazado en Sirvo' },
];

export const estatusInfo = (e: DineroEstatus) => DINERO_ESTATUS.find((x) => x.value === e) ?? DINERO_ESTATUS[0];

export const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

export interface DineroItem {
  id: number;
  anio: number;
  mes: number;
  fecha_solicitud: string | null;
  fecha_uso: string | null;
  solicitado_por_id: number | null;
  solicitado_por_iniciales: string;
  solicitado_por_nombre: string | null;
  nt: number | null;
  cliente_codigo: string | null;
  cliente_nombre: string | null;
  caso_nombre: string | null;
  concepto: string;
  cantidad: number | null;
  monto: number | null;
  beneficiario: string | null;
  /** De Sirvo si está ligado; si no, el escrito a mano. */
  numero_cheque: string | null;
  numero_cheque_manual: string | null;
  fecha_entrega: string | null;
  estatus_liquidacion: string | null;
  notas: string | null;
  request_id: number | null;
  ligado_manual: boolean;
  estatus: DineroEstatus;
  sirvo_descripcion: string | null;
  sirvo_monto: number | null;
  sirvo_fecha_cheque: string | null;
  sirvo_fecha: string | null;
  nt_activa: boolean | null;
  origen: 'CAPTURA' | 'EXCEL';
  created_at: string;
  updated_at: string;
  creado_por: string | null;
}

export interface DineroFilters {
  anio?: number;
  mes?: number;
  nt?: number;
  estatus?: DineroEstatus;
  solicitado_por?: string;
  beneficiario?: string;
  entrega?: 'entregado' | 'sin_entregar';
  q?: string;
}

export interface DineroList {
  items: DineroItem[];
  total: number;
  monto_total: number;
  por_estatus: Array<{ estatus: DineroEstatus; n: number; monto: number }>;
  page: number;
  page_size: number;
}

export interface DineroOpciones {
  anios: number[];
  iniciales: string[];
  equipo: Array<{ id: number; username: string; nombre: string }>;
  beneficiarios: Array<{ nombre: string; origen: 'lista' | 'equipo'; id: number }>;
}

export interface DineroInput {
  nt?: number;
  concepto?: string;
  fecha_solicitud?: string;
  fecha_uso?: string | null;
  solicitado_por_id?: number | null;
  cantidad?: number | null;
  monto?: number;
  beneficiario?: string | null;
  fecha_entrega?: string | null;
  estatus_liquidacion?: string | null;
  notas?: string | null;
  numero_cheque?: string | null;
}

export interface SirvoCandidato {
  request_id: number;
  numero_cheque: string | null;
  description: string;
  monto: number;
  fecha: string;
  fecha_cheque: string | null;
  state_id: number;
  invoice_name: string | null;
  ligado_a: number | null;
}

const clean = (o: object) =>
  Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined && v !== '' && v !== null));

export const getDinero = (f: DineroFilters, page: number, pageSize: number) =>
  axios.get<DineroList>('/api/migracion/dinero', { params: { ...clean(f), page, page_size: pageSize } });

export const getDineroOpciones = () => axios.get<DineroOpciones>('/api/migracion/dinero/opciones');

export const createDinero = (body: DineroInput) => axios.post<DineroItem>('/api/migracion/dinero', body);

export const updateDinero = (id: number, body: DineroInput) => axios.patch<DineroItem>(`/api/migracion/dinero/${id}`, body);

export const deleteDinero = (id: number) => axios.delete(`/api/migracion/dinero/${id}`);

export const getCandidatosSirvo = (id: number) => axios.get<SirvoCandidato[]>(`/api/migracion/dinero/${id}/candidatos`);

export const ligarSirvo = (id: number, requestId: number | null) =>
  axios.put<DineroItem>(`/api/migracion/dinero/${id}/sirvo`, { request_id: requestId });

export const buscarEnSirvo = () => axios.post<{ ligadas: number }>('/api/migracion/dinero/ligar-sirvo');

export const importarDineroExcel = (file: File, anio: number, force = false) => {
  const form = new FormData();
  form.append('file', file);
  return axios.post<{ hoja: string; filas: number; reemplazadas: number; ligadas: number; advertencias: string[] }>(
    '/api/migracion/dinero/importar',
    form,
    { params: { anio, ...(force ? { force: 'true' } : {}) }, headers: { 'Content-Type': 'multipart/form-data' }, timeout: 180_000 },
  );
};
