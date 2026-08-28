/**
 * Convierte las filas "planas" que devuelven las consultas de auditoría en
 * ítems narrativos para la vista de lista (quién · qué · cuándo · por qué).
 * Solo las consultas con forma de "evento" tienen shape; las agregadas
 * (resúmenes, conteos) se muestran siempre como tabla.
 */
import dayjs from 'dayjs';

export type FeedTone = 'neutral' | 'ok' | 'warn' | 'bad' | 'info';

export interface FeedItem {
  /** 'YYYY-MM-DD HH:mm:ss' (hora GT) o 'YYYY-MM-DD' */
  when: string | null;
  who: string | null;
  title: string;
  /** Fragmentos secundarios (se unen con " · "), vacíos se descartan */
  meta: (string | null | undefined)[];
  /** Motivo / nota / error: se muestra como cita debajo */
  note?: string | null;
  /** Etiqueta de estado (se pinta como pill con el tono) */
  badge?: string | null;
  tone: FeedTone;
}

type Row = Record<string, unknown>;
const s = (v: unknown) => (v === null || v === undefined ? '' : String(v));
const nz = (v: unknown) => (s(v).trim() ? s(v).trim() : null);
const money = (v: unknown) => {
  const n = Number(s(v).replace(/[^0-9.-]/g, ''));
  return Number.isFinite(n) && s(v) !== '' ? `Q ${n.toLocaleString('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : null;
};
const fmtDate = (v: unknown) => {
  const d = dayjs(s(v).slice(0, 10));
  return d.isValid() ? d.format('DD/MM/YYYY') : s(v);
};

export const toneFor = (label: string): FeedTone => {
  const t = label.toLowerCase();
  if (/cancel|rechaz|elimin|anulad|fall|failed|error/.test(t)) return 'bad';
  if (/revert|devuel|alert|modific/.test(t)) return 'warn';
  if (/pendiente|pending|espera/.test(t)) return 'warn';
  if (/liquidad|entregad|aceptad|autorizad|enviado|sent|vigente/.test(t)) return 'ok';
  return 'neutral';
};

/** Mapeadores por consulta. Devuelven null si la fila no se puede narrar. */
const trailTone = (accion: string): FeedTone => {
  const a = accion.toLowerCase();
  if (/elimin|anul|cancel|rechaz|fallido/.test(a)) return 'bad';
  if (/cre[oó]|ingres/.test(a)) return 'ok';
  if (/modific|reasign|devolv/.test(a)) return 'warn';
  if (/autoriz|liquid|entreg|acept/.test(a)) return 'info';
  return 'neutral';
};

export const FEED_SHAPES: Record<string, (r: Row) => FeedItem> = {
  'general.bitacora': (r) => ({
    when: nz(r.cuando),
    who: nz(r.quien),
    title: `${s(r.accion).replace(/^\w/, (c) => c.toUpperCase())} · ${s(r.que) || s(r.referencia)}`,
    meta: [nz(r.modulo), nz(r.referencia), nz(r.ip) ? `IP ${s(r.ip)}` : null],
    note: nz(r.cambios),
    badge: nz(r.accion),
    tone: trailTone(s(r.accion)),
  }),
  'general.historia': (r) => ({
    when: nz(r.cuando),
    who: nz(r.quien),
    title: `${s(r.accion).replace(/^\w/, (c) => c.toUpperCase())}`,
    meta: [nz(r.que), nz(r.ip) ? `IP ${s(r.ip)}` : null],
    note: nz(r.cambios),
    badge: nz(r.accion),
    tone: trailTone(s(r.accion)),
  }),
  'general.sesiones': (r) => ({
    when: nz(r.cuando),
    who: nz(r.quien),
    title: s(r.accion) === 'ingresó' ? 'Inició sesión' : 'Intento de ingreso fallido',
    meta: [nz(r.ip) ? `IP ${s(r.ip)}` : null],
    badge: s(r.accion) === 'ingresó' ? 'Ingresó' : 'Fallido',
    tone: s(r.accion) === 'ingresó' ? 'ok' : 'bad',
  }),
  'general.cancelaciones': (r) => ({
    when: nz(r.cuando),
    who: nz(r.quien),
    title: `${s(r.accion)} — ${s(r.referencia)}`,
    meta: [nz(r.modulo), nz(r.detalle)],
    note: nz(r.motivo),
    badge: nz(r.modulo),
    tone: toneFor(s(r.accion)),
  }),
  'salas.reservaciones': (r) => ({
    when: nz(r.creada_el),
    who: nz(r.creada_por),
    title: `${s(r.sala)} · ${fmtDate(r.fecha)} ${s(r.horario)}`,
    meta: [
      nz(r.tipo),
      nz(r.motivo),
      nz(r.a_nombre_de) && s(r.a_nombre_de) !== s(r.creada_por) ? `para ${s(r.a_nombre_de)}` : null,
      nz(r.cancelada_el) ? `cancelada el ${s(r.cancelada_el).slice(0, 16)} por ${s(r.cancelada_por) || '?'}` : null,
    ],
    note: nz(r.motivo_cancelacion) ?? nz(r.motivo_rechazo),
    badge: nz(r.estado),
    tone: toneFor(s(r.estado)),
  }),
  'salas.cancelaciones': (r) => ({
    when: nz(r.cancelada_el),
    who: nz(r.cancelada_por),
    title: `Canceló ${s(r.sala)} · ${fmtDate(r.fecha)} ${s(r.horario)}`,
    meta: [
      nz(r.reservada_por) ? `reservada por ${s(r.reservada_por)}` : null,
      nz(r.anticipacion_horas) ? `${Number(r.anticipacion_horas) < 0 ? 'ya iniciada' : `${s(r.anticipacion_horas)} h antes`}` : null,
      nz(r.motivo_reserva),
    ],
    note: nz(r.motivo),
    badge: nz(r.estado),
    tone: 'bad',
  }),
  'general.ultima_hora': (r) => ({
    when: nz(r.cancelada_el),
    who: nz(r.cancelada_por),
    title: `Canceló ${s(r.sala)} · ${fmtDate(r.fecha)} ${s(r.horario)}`,
    meta: [Number(r.anticipacion_horas) < 0 ? 'reunión ya iniciada' : `${s(r.anticipacion_horas)} h antes`, nz(r.reservada_por) ? `reservada por ${s(r.reservada_por)}` : null, nz(r.motivo_reserva)],
    note: nz(r.motivo),
    badge: 'Última hora',
    tone: 'bad',
  }),
  'cheques.bitacora': (r) => ({
    when: nz(r.cuando),
    who: nz(r.usuario),
    title: `${s(r.accion).replace(/_/g, ' ').toLowerCase().replace(/^\w/, (c) => c.toUpperCase())} · solicitud ${s(r.request_id)}`,
    meta: [nz(r.cliente), nz(r.descripcion), money(r.valor), nz(r.estado_anterior) && nz(r.estado_nuevo) ? `${s(r.estado_anterior)} → ${s(r.estado_nuevo)}` : null],
    note: nz(r.notas),
    badge: nz(r.estado_nuevo),
    tone: toneFor(s(r.accion)),
  }),
  'cheques.buscar': (r) => ({
    when: nz(r.creado_el),
    who: nz(r.responsable),
    title: `Solicitud ${s(r.request_id)} · ${fmtDate(r.fecha)}`,
    meta: [nz(r.cliente), nz(r.descripcion), money(r.valor), nz(r.autorizo) ? `autorizó ${s(r.autorizo)}` : null, nz(r.documento)],
    note: nz(r.error_liquidacion),
    badge: nz(r.estado),
    tone: toneFor(s(r.estado)),
  }),
  'cheques.historial_django': (r) => ({
    when: nz(r.cuando),
    who: nz(r.usuario),
    title: `${s(r.tipo)} · solicitud ${s(r.request_id)}`,
    meta: [nz(r.estado), nz(r.cliente), nz(r.descripcion), money(r.valor)],
    note: nz(r.motivo),
    badge: nz(r.tipo),
    tone: toneFor(s(r.tipo)),
  }),
  'cheques.liquidaciones': (r) => ({
    when: nz(r.registrada_el),
    who: nz(r.registro),
    title: `Liquidación · solicitud ${s(r.request_id)}`,
    meta: [nz(r.a_nombre_de), nz(r.factura) ? `factura ${s(r.factura)}` : null, money(r.valor), nz(r.descripcion)],
    note: nz(r.motivo_eliminacion),
    badge: nz(r.estado),
    tone: toneFor(s(r.estado)),
  }),
  'notif.buscar': (r) => ({
    when: nz(r.recibida_el),
    who: nz(r.recibio_recepcion),
    title: `${nz(r.procedencia) ?? 'Notificación'} · cédula ${s(r.cedula) || '—'}`,
    meta: [
      nz(r.dirigido_a) ? `para ${s(r.dirigido_a)}` : null,
      nz(r.expediente) ? `exp. ${s(r.expediente)}` : null,
      nz(r.sala),
      nz(r.entregada_el) ? `entregada ${s(r.entregada_el).slice(0, 16)}${nz(r.entrego) ? ` por ${s(r.entrego)}` : ''}${nz(r.entregada_a) ? ` a ${s(r.entregada_a)}` : ''}` : null,
    ],
    note: nz(r.motivo_eliminacion),
    badge: nz(r.estado),
    tone: toneFor(s(r.estado)),
  }),
  'notif.bitacora': (r) => ({
    when: nz(r.cuando),
    who: nz(r.usuario),
    title: `Cambió "${s(r.campo)}" en ${r.document_id ? `documento ${s(r.document_id)}` : `notificación ${s(r.notification_id)}`}`,
    meta: [`${s(r.anterior) || '—'} → ${s(r.nuevo) || '—'}`, nz(r.cedula) ? `cédula ${s(r.cedula)}` : null, nz(r.dirigido_a)],
    tone: 'info',
  }),
  'notif.documentos': (r) => ({
    when: nz(r.recibido_el),
    who: nz(r.recibio),
    title: `${s(r.tipo) || 'Documento'} de ${s(r.entregado_por) || '?'} para ${s(r.para) || '?'}`,
    meta: [nz(r.entregado_el) ? `entregado ${s(r.entregado_el).slice(0, 16)}${nz(r.entrego) ? ` por ${s(r.entrego)}` : ''}` : null, nz(r.observaciones)],
    note: nz(r.motivo_eliminacion),
    badge: nz(r.estado),
    tone: toneFor(s(r.estado)),
  }),
  'notif.reporte_5pm': (r) => ({
    when: nz(r.enviado_el) ?? nz(r.fecha),
    who: null,
    title: `Reporte de las 5 PM del ${fmtDate(r.fecha)}`,
    meta: [`${s(r.intentos)} intento(s)`, nz(r.alerta_el) ? `alerta ${s(r.alerta_el).slice(11, 16)}` : null, r.vacio === true ? 'sin notificaciones ese día' : null],
    note: nz(r.ultimo_error),
    badge: s(r.estado),
    tone: toneFor(s(r.estado)),
  }),
  'general.recibos_anulados': (r) => ({
    when: nz(r.registrado_el),
    who: nz(r.anulado_por),
    title: `Recibo ${s(r.recibo)} anulado · ${fmtDate(r.fecha)}`,
    meta: [nz(r.recibido_de), money(r.monto), nz(r.concepto), nz(r.creado_por) ? `creado por ${s(r.creado_por)}` : null],
    note: nz(r.motivo),
    badge: 'Anulado',
    tone: 'bad',
  }),
};

export const hasFeedShape = (queryKey: string) => Boolean(FEED_SHAPES[queryKey]);

/** "APELLIDO NOMBRE (COD001)" → { name: 'Apellido Nombre', code: 'COD001', initials: 'AN' } */
export const parsePerson = (raw: string | null) => {
  if (!raw) return null;
  const m = /^(.*?)\s*\(([^)]+)\)\s*$/.exec(raw);
  const name = (m ? m[1] : raw).trim();
  const code = m ? m[2] : null;
  const words = name.split(/\s+/).filter(Boolean);
  const initials = (words.length >= 2 ? words[0][0] + words[1][0] : (words[0] ?? '?').slice(0, 2)).toUpperCase();
  // Title case suave para nombres en MAYÚSCULAS
  const pretty = name === name.toUpperCase() ? name.toLowerCase().replace(/(^|\s|-)\p{L}/gu, (c) => c.toUpperCase()) : name;
  return { name: pretty, code, initials };
};

/** Hue determinista por persona (misma persona = mismo color siempre). */
export const hueFor = (key: string) => {
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
  return h % 360;
};

export const dayLabel = (when: string | null) => {
  if (!when) return 'Sin fecha';
  const d = dayjs(when.slice(0, 10));
  if (!d.isValid()) return when;
  const today = dayjs().startOf('day');
  const diff = today.diff(d.startOf('day'), 'day');
  if (diff === 0) return 'Hoy';
  if (diff === 1) return 'Ayer';
  const label = d.format('dddd D [de] MMMM');
  return label.charAt(0).toUpperCase() + label.slice(1) + (d.year() !== today.year() ? ` ${d.year()}` : '');
};

export const timeLabel = (when: string | null) => {
  if (!when) return '';
  const m = /\d{2}:\d{2}/.exec(when.slice(10));
  return m ? m[0] : '';
};
