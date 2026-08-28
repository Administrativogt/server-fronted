// src/api/adminAudit.ts — Panel de auditoría (solo superusuarios)
import api from './axios';

export type AuditModuleKey = 'general' | 'salas' | 'cheques' | 'notificaciones';
export type AuditParamType = 'date' | 'text' | 'int' | 'number' | 'select';
export type AuditColumnType =
  | 'text'
  | 'int'
  | 'number'
  | 'money'
  | 'datetime'
  | 'date'
  | 'bool'
  | 'badge';

export interface AuditParam {
  key: string;
  label: string;
  type: AuditParamType;
  required?: boolean;
  placeholder?: string;
  help?: string;
  options?: { value: string | number; label: string }[];
  valueType?: 'int' | 'text';
  default?: string | number;
}

export interface AuditColumn {
  key: string;
  title: string;
  type?: AuditColumnType;
  width?: number;
}

export interface AuditQueryDef {
  key: string;
  module: AuditModuleKey;
  title: string;
  description: string;
  hint?: string;
  params: AuditParam[];
  columns: AuditColumn[];
  defaultLimit: number;
  sql: string;
}

export interface AuditModuleDef {
  key: AuditModuleKey;
  label: string;
  /** Explicación en lenguaje llano (vista sencilla). */
  description: string;
  /** Tablas/bitácoras involucradas (solo vista técnica). */
  technicalNote?: string;
  logContexts: string[];
}

export interface AuditCatalog {
  modules: AuditModuleDef[];
  queries: AuditQueryDef[];
  limits: { default: number; max: number; statementTimeout: string };
}

export interface AuditRunResult {
  key: string;
  title: string;
  columns: AuditColumn[];
  rows: Record<string, unknown>[];
  rowCount: number;
  limit: number;
  truncated: boolean;
  elapsedMs: number;
  sql: string;
  values: unknown[];
  paramsEcho: Record<string, unknown>;
}

export interface AuditOverview {
  generatedAt: string;
  salas: { hoy: number; pendientesAprobacion: number; canceladas7d: number };
  cheques: {
    pendientesAutorizar: number;
    pendientesLiquidar: number;
    conErrorSirvo: number;
    cambios24h: number;
  };
  notificaciones: {
    pendientes: number;
    hoy: number;
    cambios24h: number;
    ultimoReporte5pm: {
      report_date: string;
      status: string;
      attempts: number;
      sent_at: string | null;
      last_error: string | null;
    } | null;
  };
  cancelaciones7d: { total: number; salas: number; cheques: number; notificaciones: number };
  logs: {
    available: boolean;
    errores24h: number;
    warnings24h: number;
    file: string;
    fileSizeBytes: number;
  };
}

export interface AppLogEntry {
  timestamp: string;
  level: string;
  context?: string;
  message: string;
  trace?: string;
  meta?: Record<string, unknown>;
}

export interface LogQueryResult {
  entries: AppLogEntry[];
  scannedLines: number;
  matched: number;
  truncated: boolean;
  file: string;
  fileSizeBytes: number;
  available: boolean;
}

export interface LogQueryParams {
  module?: AuditModuleKey;
  contexts?: string[];
  level?: string;
  q?: string;
  from?: string;
  to?: string;
  limit?: number;
  file?: 'combined' | 'error';
}

/** Series agregadas para las gráficas de un módulo (filas ya listas para nivo). */
export interface AuditChartsResponse {
  module: AuditModuleKey;
  days: number;
  porDia?: Record<string, unknown>[];
  porPersona?: { quien: string; total: number }[];
  porSala?: { sala: string; reservas: number; horas: number }[];
  porSemana?: Record<string, unknown>[];
  porEstado?: { estado: string; n: number }[];
  reporte5pm?: { dia: string; fecha: string; status: string; attempts: number; hora: string | null }[];
}

const adminAuditApi = {
  getCatalog: () => api.get<AuditCatalog>('/api/admin-audit/catalog'),
  getCharts: (module: AuditModuleKey, days: number) =>
    api.get<AuditChartsResponse>(`/api/admin-audit/charts/${module}`, { params: { days } }),
  getOverview: () => api.get<AuditOverview>('/api/admin-audit/overview'),
  runQuery: (key: string, params: Record<string, unknown>) =>
    api.get<AuditRunResult>(`/api/admin-audit/queries/${encodeURIComponent(key)}/run`, {
      params,
    }),
  getLogs: (params: LogQueryParams) =>
    api.get<LogQueryResult>('/api/admin-audit/logs', {
      params: { ...params, contexts: params.contexts?.join(',') || undefined },
    }),
  getLogContexts: () =>
    api.get<{ context: string; count: number }[]>('/api/admin-audit/logs/contexts'),
};

export default adminAuditApi;
