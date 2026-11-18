import api from './axios';
import type { NotificationDto } from './notifications';
import type { DocumentDto } from './documents';

export interface DashboardStats {
  notifications: {
    pending:   number;
    delivered: number;
    finalized: number;
    myPending: number;
    recent:    NotificationDto[];
  };
  documents: {
    pending:   number;
    delivered: number;
    finalized: number;
    rejected:  number;
    myPending: number;
    recent:    DocumentDto[];
  };
}

export async function fetchDashboardStats(): Promise<DashboardStats> {
  const { data } = await api.get('/api/dashboard/stats');
  return data;
}

export interface VacationSummary {
  pending: number;
  onVacation: { name: string; fechaFin: string }[];
  upcoming: { name: string; fechaInicio: string; dias: number }[];
}

export interface UpcomingEncargo {
  id: number;
  destinatario: string;
  empresa: string;
  municipio: string;
  prioridad: number;
  hora_minima: string | null;
  hora_maxima: string | null;
  fecha_realizacion: string;
}

export interface UpcomingItems {
  today: UpcomingEncargo[];
  nextDays: UpcomingEncargo[];
}

export async function fetchVacationSummary(): Promise<VacationSummary> {
  const { data } = await api.get('/api/dashboard/vacations');
  return data;
}

export async function fetchUpcomingItems(): Promise<UpcomingItems> {
  const { data } = await api.get('/api/dashboard/upcoming');
  return data;
}

/**
 * Bandeja del inicio. Llave ausente = el módulo no aplica al usuario;
 * número = conteo real (0 = al día); null = la fuente falló (no es 0).
 */
export type InboxKey =
  | 'checksToAuthorize'
  | 'checksToLiquidate'
  | 'moneyReqToAuthorize'
  | 'roomsToApprove'
  | 'vacationsToApprove'
  | 'notificationsToAccept'
  | 'documentsToAccept'
  | 'encargosToday'
  | 'sirvoRequests'
  | 'appointmentsExpiring'
  // Antigüedad: matizan la fila "Cheques por liquidar", no son filas propias
  | 'checksToLiquidateOver30'
  | 'checksToLiquidateOver60';

/** Contexto de una fila de la bandeja (solo filas con conteo > 0). */
export interface InboxDetail {
  oldest?: string | null;     // YYYY-MM-DD del más antiguo
  next?: string | null;       // YYYY-MM-DD del próximo
  nextTime?: string | null;   // HH:MM
  nextLabel?: string | null;  // referencia corta (acta/cliente)
  amounts?: { currency: 'Q' | '$'; total: number }[];
  today?: number;
  priorityA?: number;
}

export type Inbox = Partial<Record<InboxKey, number | null>> & {
  details?: Partial<Record<InboxKey, InboxDetail>>;
};

export async function fetchInbox(): Promise<Inbox> {
  const { data } = await api.get('/api/dashboard/inbox');
  return data;
}

/* ─── Mis solicitudes + agenda (/api/dashboard/mine) ─────────────────────── */
export type MyRequestKey = 'checksAwaitingAuth' | 'moneyReqPending' | 'roomsPending' | 'vacationPending';

export interface AgendaItem {
  id: number;
  date: string;   // YYYY-MM-DD
  start: string;  // HH:MM
  end: string;    // HH:MM
  room: string;
  pending: boolean;
  reason: string | null;
}

export interface RoomNow {
  id: number;
  name: string;
  free: boolean;
  /** libre: hora de la próxima reserva (null = resto del día); ocupada: hora en que se libera */
  until: string | null;
}

export interface VacationBalance {
  /** ya descuenta lo que está por aprobar */
  days: number;
  pendingDays: number;
}

export interface Mine {
  requests: Partial<Record<MyRequestKey, number | null>>;
  requestDetails?: Partial<Record<MyRequestKey, InboxDetail>>;
  /** ausente = sin módulo de salas; null = la consulta falló */
  agenda?: AgendaItem[] | null;
  /** ausente = sin módulo de salas; null = la consulta falló */
  roomsNow?: RoomNow[] | null;
  /** ausente = sin saldo registrado; null = la consulta falló */
  vacationBalance?: VacationBalance | null;
}

export async function fetchMine(): Promise<Mine> {
  const { data } = await api.get('/api/dashboard/mine');
  return data;
}

/* ─── Búsqueda global (/api/dashboard/search) ────────────────────────────── */
export interface SearchItem {
  id: string;
  title: string;
  subtitle: string | null;
  /** null = existe pero no hay pantalla para abrirlo */
  path: string | null;
}

export interface SearchGroup {
  key: 'cheques' | 'recibos' | 'clientes' | 'requerimientos' | 'encargos';
  label: string;
  items: SearchItem[];
  failed?: boolean;
}

export async function globalSearch(q: string): Promise<{ q: string; groups: SearchGroup[] }> {
  const { data } = await api.get('/api/dashboard/search', { params: { q } });
  return data;
}
