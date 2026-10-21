import axios from './axios';

/**
 * Gastos por NT de Migración: líneas de cheque que Sirvo ya sincroniza
 * (coordinador LAS). Solo lectura. Ver MigracionGastosController.
 */

export type GastoEstado =
  | 'por_autorizar'
  | 'autorizado'
  | 'pendiente_liquidar'
  | 'liquidado'
  | 'cerrado_sirvo';

export const GASTO_ESTADOS: Array<{ value: GastoEstado; label: string; color: string; hint: string }> = [
  { value: 'por_autorizar', label: 'Por autorizar', color: '#06B6D4', hint: 'Solicitado en Sirvo, falta autorización' },
  { value: 'autorizado', label: 'Autorizado', color: '#3C50E0', hint: 'Autorizado, aún sin número de cheque' },
  { value: 'pendiente_liquidar', label: 'Pendiente de liquidar', color: '#F59E0B', hint: 'Cheque emitido, falta liquidar' },
  { value: 'liquidado', label: 'Liquidado', color: '#10B981', hint: 'Liquidado desde el sistema' },
  { value: 'cerrado_sirvo', label: 'Cerrado en Sirvo', color: '#64748B', hint: 'Ya no está pendiente en Sirvo (liquidado o cerrado allá)' },
];

export type GastoArea = 'MIGRACION' | 'PENAL' | 'LABORAL' | 'OTROS';

export const GASTO_AREAS: Array<{ value: GastoArea; label: string }> = [
  { value: 'MIGRACION', label: 'Migración' },
  { value: 'PENAL', label: 'Penal' },
  { value: 'LABORAL', label: 'Laboral' },
  { value: 'OTROS', label: 'Otros' },
];

export const areaLabel = (a: GastoArea) => GASTO_AREAS.find((x) => x.value === a)?.label ?? a;

export const estadoInfo = (e: GastoEstado) => GASTO_ESTADOS.find((x) => x.value === e) ?? GASTO_ESTADOS[0];

export interface GastosFilters {
  from?: string;
  to?: string;
  cliente?: string;
  nt?: number;
  area?: GastoArea;
  estado?: GastoEstado;
  q?: string;
  entrega?: 'entregado' | 'sin_entregar';
  facturacion?: 'sin_facturar' | 'facturado' | 'cobrado';
  beneficiario?: string;
  aviso?: GastoAviso;
}

export type GastoAviso =
  | 'uso_sin_cheque'
  | 'sin_entregar'
  | 'sin_liquidar_30'
  | 'listo_facturar'
  | 'facturado_sin_cobrar'
  | 'nt_sin_catalogo';

export type NtFacturacion = 'FACTURADO' | 'COBRADO';

export interface GastosSummary {
  coordinadores: string[];
  kpis: {
    monto: number;
    lineas: number;
    cheques: number;
    nts: number;
    clientes: number;
    pendiente_monto: number;
    pendiente_lineas: number;
    pendiente_cheques: number;
    sin_cheque_monto: number;
    sin_cheque_lineas: number;
    vencidos_lineas: number;
    vencidos_monto: number;
  };
  por_mes: Array<{ mes: string; monto: number; lineas: number; nts: number }>;
  por_estado: Array<{ estado: GastoEstado; monto: number; lineas: number }>;
  /** Reparto por área sin aplicar el filtro de área. */
  por_area: Array<{ area: GastoArea; monto: number; lineas: number; por_catalogo: number }>;
  top_clientes: Array<{ codigo: string; nombre: string; monto: number; lineas: number; nts: number }>;
  top_nts: Array<{ nt: number; cliente_codigo: string; cliente: string; caso: string; monto: number; lineas: number; pendiente: number }>;
  antiguedad_pendientes: Array<{ rango: '0-15' | '16-30' | '31-60' | '61+'; monto: number; lineas: number; cheques: number }>;
}

export interface GastoLinea {
  id: number;
  fecha: string;
  nt: number;
  cliente_codigo: string;
  cliente: string;
  caso_codigo: string;
  caso: string;
  concepto: string;
  cantidad: number;
  area: GastoArea;
  /** true = el área viene del catálogo de Notas de gastos; false = de palabras del caso. */
  area_por_catalogo: boolean;
  valor_unitario: number;
  monto: number;
  moneda: string;
  cheque: number | null;
  fecha_cheque: string | null;
  estado: GastoEstado;
  dias_pendiente: number | null;
  // Seguimiento (lo que Sirvo no sabe)
  fecha_uso: string | null;
  solicitado_por_id: number | null;
  solicitado_por: string | null;
  beneficiario: string | null;
  entregado_at: string | null;
  notas: string | null;
  facturacion: NtFacturacion | null;
  facturado_at: string | null;
  cobrado_at: string | null;
}

export interface GastosAvisos {
  avisos: Array<{ aviso: GastoAviso; lineas: number; cheques: number; nts: number; monto: number }>;
  sin_liquidar_por_beneficiario: Array<{ beneficiario: string; cheques: number; monto: number }>;
  avisos_desde: string;
}

export interface SeguimientoOpciones {
  equipo: Array<{ id: number; username: string; nombre: string }>;
  beneficiarios: Array<{ nombre: string; origen: 'lista' | 'equipo'; id: number }>;
}

/** Campo ausente = no se toca; null = se borra. */
export interface SeguimientoPatch {
  request_ids?: number[];
  cheques?: number[];
  fecha_uso?: string | null;
  solicitado_por_id?: number | null;
  beneficiario?: string | null;
  entregado_at?: string | null;
  notas?: string | null;
}

export interface GastosFilterOptions {
  clientes: Array<{ codigo: string; nombre: string; lineas: number }>;
  desde: string | null;
  hasta: string | null;
}

const clean = (f: GastosFilters) =>
  Object.fromEntries(Object.entries(f).filter(([, v]) => v !== undefined && v !== '' && v !== null));

export const getGastosSummary = (f: GastosFilters) =>
  axios.get<GastosSummary>('/api/migracion/gastos/summary', { params: clean(f) });

export const getGastosLines = (f: GastosFilters, page: number, pageSize: number) =>
  axios.get<{ items: GastoLinea[]; total: number; page: number; page_size: number }>(
    '/api/migracion/gastos/lines',
    { params: { ...clean(f), page, page_size: pageSize } },
  );

export const getGastosFilterOptions = () =>
  axios.get<GastosFilterOptions>('/api/migracion/gastos/filter-options');

export const getGastosAccess = () =>
  axios.get<{ canView: boolean; canEdit: boolean }>('/api/migracion/gastos/access');

export const getGastosAvisos = (f: GastosFilters) =>
  axios.get<GastosAvisos>('/api/migracion/gastos/avisos', { params: clean(f) });

export const getSeguimientoOpciones = () =>
  axios.get<SeguimientoOpciones>('/api/migracion/gastos/seguimiento/opciones');

export const updateSeguimiento = (patch: SeguimientoPatch) =>
  axios.patch<{ updated: number }>('/api/migracion/gastos/seguimiento', patch);

export const addBeneficiario = (nombre: string) =>
  axios.post('/api/migracion/gastos/beneficiarios', { nombre });

export const removeBeneficiario = (id: number) => axios.delete(`/api/migracion/gastos/beneficiarios/${id}`);

export const setNtFacturacion = (nt: number, estado: NtFacturacion | null, fecha?: string) =>
  axios.put(`/api/migracion/gastos/nt/${nt}/facturacion`, { estado, ...(fecha ? { fecha } : {}) });
