import axios from './axios';

/**
 * Catálogo de NT activas de Sirvo: se alimenta subiendo cada día el reporte
 * detalle_nt_….TXT. Ver MigracionNtController (backend).
 */

export interface NtItem {
  nt: number;
  cliente_codigo: string;
  /** Nombre del cliente: Excel CXC, o los cheques de LAS. */
  cliente_nombre: string | null;
  /** Nombre del caso: Excel CXC, o el TXT si trae uno (no "1"). */
  caso: string | null;
  caso_fuente: 'CXC' | 'TXT' | null;
  caso_numero: string | null;
  /** Lo que venía en el TXT después de la diagonal. */
  caso_txt: string | null;
  en_cxc: boolean;
  /** Activa y con SERV PREST SALDO > 0 o GASTOS PRESUP > 0 en el Excel. */
  es_nota_migracion: boolean;
  serv_prest_saldo: number | null;
  gastos_presup: number | null;
  gastos_usado: number | null;
  saldo: number | null;
  encargado: string | null;
  responsable: string | null;
  activa: boolean;
  primera_vez_at: string;
  ultima_vez_at: string;
  cerrada_at: string | null;
  gastos: number;
  ultimo_gasto: string | null;
}

export type NtCargaTipo = 'TXT' | 'CXC';

export interface NtCarga {
  id: number;
  tipo: NtCargaTipo;
  archivo: string;
  fecha_reporte: string | null;
  lineas: number;
  total_nt: number;
  nuevas: number;
  reabiertas: number;
  cerradas: number;
  advertencias: string[];
  created_at: string;
  uploaded_by_username: string | null;
  uploaded_by_nombre: string | null;
}

export interface NtResumen {
  activas: number;
  cerradas: number;
  clientes: number;
  notas_migracion: number;
  clientes_migracion: number;
  /** Último TXT de NT activas */
  ultima_carga: NtCarga | null;
  /** Último Excel CXC de notas de Migración */
  ultima_cxc: NtCarga | null;
}

export type NtCargaResultado = Pick<
  NtCarga,
  'archivo' | 'fecha_reporte' | 'lineas' | 'total_nt' | 'nuevas' | 'reabiertas' | 'cerradas' | 'advertencias'
> & { carga_id: number; tipo?: NtCargaTipo; con_valor?: number; notas_migracion?: number };

export interface NtListParams {
  q?: string;
  cliente?: string;
  estado?: 'activa' | 'cerrada' | 'todas';
  solo_migracion?: boolean;
  page?: number;
  page_size?: number;
}

export const getNtResumen = () => axios.get<NtResumen>('/api/migracion/nt/resumen');

export const getNtCargas = () => axios.get<NtCarga[]>('/api/migracion/nt/cargas');

export const getNts = (params: NtListParams) =>
  axios.get<{ items: NtItem[]; total: number; page: number; page_size: number }>('/api/migracion/nt', {
    params: Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined && v !== '' && v !== false)),
  });

export const getNt = (nt: number) => axios.get<NtItem>(`/api/migracion/nt/${nt}`);

/** TXT = detalle_nt de NT activas · CXC = Excel de notas de Migración (LAS). */
export const subirReporteNt = (tipo: NtCargaTipo, file: File, force = false) => {
  const form = new FormData();
  form.append('file', file);
  return axios.post<NtCargaResultado>(tipo === 'CXC' ? '/api/migracion/nt/carga-cxc' : '/api/migracion/nt/carga', form, {
    params: force ? { force: 'true' } : undefined,
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 120_000,
  });
};
