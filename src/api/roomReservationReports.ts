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

/** Envía el correo (desde el buzón de socios) con el Excel adjunto. */
export async function sendRoomReport(
  year: number,
  month: number,
  payload: SendRoomReportPayload,
): Promise<SendRoomReportResult> {
  const { data } = await api.post(`${BASE}/month/${year}/${month}/send`, payload);
  return data;
}
