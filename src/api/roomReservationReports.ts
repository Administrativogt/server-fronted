import api from './axios';

const BASE = '/room-reservations/report';

export interface RoomReportDefaults {
  to: string[];
  cc: string[];
  from: string;
}

export interface SendRoomReportPayload {
  to: string[];
  cc?: string[];
  nota?: string;
  includeCanceled?: boolean;
  /** true: el correo va solo al usuario que lo dispara (para revisar). */
  test?: boolean;
}

export interface SendRoomReportResult {
  ok: boolean;
  to: string[];
  cc: string[];
  mes: string;
  reservaciones: number;
  totalHoras: number;
  totalValor: number;
  archivo: string;
}

/** Destinatarios por defecto (configurados en el servidor) y buzón emisor. */
export async function getRoomReportDefaults(): Promise<RoomReportDefaults> {
  const { data } = await api.get(`${BASE}/send-defaults`);
  return data;
}

/** Descarga el Excel oficial (RESUMEN POR EQUIPO + DETALLE) del mes. */
export async function downloadRoomReportExcel(
  year: number,
  month: number,
  includeCanceled = false,
): Promise<{ blob: Blob; filename: string }> {
  const res = await api.get(`${BASE}/month/${year}/${month}/excel`, {
    params: includeCanceled ? { includeCanceled: 1 } : {},
    responseType: 'blob',
  });
  const cd: string = res.headers?.['content-disposition'] ?? '';
  const m = /filename\*=UTF-8''([^;]+)|filename="?([^";]+)"?/i.exec(cd);
  const filename = m
    ? decodeURIComponent(m[1] || m[2])
    : `REPORTE RESERVA DE SALAS (${year}-${String(month).padStart(2, '0')}).xlsx`;
  return { blob: res.data as Blob, filename };
}

// ─── Reporte personalizado ──────────────────────────────────────────────────

export type EstadoKey = 'pending' | 'accepted' | 'rejected' | 'canceled' | 'deleted';
export type GroupKey = 'equipo' | 'area' | 'usuario' | 'sala' | 'estado' | 'mes';

export interface CustomReportFilter {
  from: string; // YYYY-MM-DD
  to: string; // YYYY-MM-DD
  equipos?: number[];
  areas?: number[];
  salas?: number[];
  usuarios?: number[];
  estados?: EstadoKey[];
  groupBy?: GroupKey;
}

export interface CustomReportOptions {
  equipos: { id: number; nombre: string }[];
  areas: { id: number; nombre: string }[];
  salas: { id: number; nombre: string; tarifa: number | null; activa: boolean }[];
  usuarios: { id: number; nombre: string }[];
  estados: { id: EstadoKey; nombre: string }[];
  agrupaciones: { id: GroupKey; nombre: string }[];
}

export interface CustomReportRow {
  id: number;
  state: number;
  eliminada: boolean;
  estado: string;
  fecha: string;
  mes: string;
  sala: string;
  hora_inicio: string;
  hora_fin: string;
  horas: number;
  tarifa: number;
  valor: number;
  usuario: string;
  equipo: string;
  area: string;
  reservo: string;
  motivo: string;
  participantes: number;
}

export interface CustomReport {
  filtros: {
    from: string; to: string; equipos: string[]; areas: string[]; salas: string[];
    usuarios: string[]; estados: string[]; groupBy: GroupKey;
  };
  meses: string[];
  resumen: { clave: string; reservas: number; horas: number; valor: number }[];
  porMes: { clave: string; meses: Record<string, { horas: number; valor: number }> }[];
  totales: { reservas: number; horas: number; valor: number };
  rows: CustomReportRow[];
}

const toParams = (f: CustomReportFilter) => ({
  from: f.from,
  to: f.to,
  equipos: f.equipos?.length ? f.equipos.join(',') : undefined,
  areas: f.areas?.length ? f.areas.join(',') : undefined,
  salas: f.salas?.length ? f.salas.join(',') : undefined,
  usuarios: f.usuarios?.length ? f.usuarios.join(',') : undefined,
  estados: f.estados?.length ? f.estados.join(',') : undefined,
  groupBy: f.groupBy,
});

export async function getCustomReportOptions(): Promise<CustomReportOptions> {
  const { data } = await api.get(`${BASE}/custom/options`);
  return data;
}

export async function getCustomReport(f: CustomReportFilter): Promise<CustomReport> {
  const { data } = await api.get(`${BASE}/custom`, { params: toParams(f) });
  return data;
}

export async function downloadCustomReportExcel(
  f: CustomReportFilter,
): Promise<{ blob: Blob; filename: string }> {
  const res = await api.get(`${BASE}/custom/excel`, {
    params: toParams(f),
    responseType: 'blob',
  });
  const cd: string = res.headers?.['content-disposition'] ?? '';
  const m = /filename\*=UTF-8''([^;]+)|filename="?([^";]+)"?/i.exec(cd);
  const filename = m
    ? decodeURIComponent(m[1] || m[2])
    : `REPORTE SALAS PERSONALIZADO (${f.from} a ${f.to}).xlsx`;
  return { blob: res.data as Blob, filename };
}

/** Envía el correo (desde el buzón de socios) con el Excel adjunto. */
export async function sendRoomReport(
  year: number,
  month: number,
  payload: SendRoomReportPayload,
): Promise<SendRoomReportResult> {
  const { data } = await api.post(`${BASE}/month/${year}/${month}/send`, payload);
  return data;
}
