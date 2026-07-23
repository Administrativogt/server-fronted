import api from './axios';

const BASE = '/human-resources/vacations';

// ============================================
// INTERFACES
// ============================================

export type VacationStatus = 'PENDIENTE' | 'APROBADA' | 'RECHAZADA' | 'CANCELADA';

export type VacationRequestTypeValue =
  | 'full_day' | '0.5' | '1' | '1.5' | '2' | '2.5' | '3' | '3.5' | '4';

export type TimeOffTypeValue =
  | 'vacaciones'
  | 'dias_ausencia_sp'
  | 'licencia_sin_goce'
  | 'licencia_con_goce'
  | 'permiso'
  | 'cita_igss_medica'
  | 'enfermedad';

export interface VacationUser {
  id: number;
  first_name: string;
  last_name: string;
  username?: string;
}

export interface VacationRequest {
  id: number;
  fecha_inicio: string;
  fecha_fin: string;
  dias_solicitados: number;
  estado: VacationStatus;
  request_type: VacationRequestTypeValue;
  time_off_type: TimeOffTypeValue;
  hora_inicio?: string | null;
  comentarios?: string;
  motivo_cancelacion?: string;
  created_at: string;
  user?: VacationUser;
}

export interface VacationBalance {
  id: number;
  user: VacationUser;
  time_off_type: string;
  time_off_label?: string;
  fecha_ingreso: string | null;
  saldo_dias: number;
  earned_this_year: number;
  used_this_year: number;
  previous_year: number;
  available: number;
  current_period?: string;
  previous_period?: string;
}

export interface BalanceBreakdown {
  id: number;
  time_off_type: string;
  time_off_label: string;
  fecha_ingreso: string | null;
  earned_this_year: number;
  used_this_year: number;
  previous_year: number;
  available: number;
  saldo_dias: number;
  current_period?: string;
  previous_period?: string;
}

export interface MyVacationsResponse {
  saldo_dias: number | null;
  fecha_ingreso: string | null;
  balances: BalanceBreakdown[];
  solicitudes: VacationRequest[];
}

export interface DaysUsedTeamRow {
  equipo_id: number | null;
  equipo_nombre: string;
  total_days: number;
  employee_count: number;
}

export interface DaysUsedStats {
  year: number;
  total_days: number;
  by_team: DaysUsedTeamRow[];
}

export type BalanceLogType = 'DESCUENTO' | 'DEVOLUCION' | 'ANIVERSARIO' | 'AJUSTE_MANUAL';

export interface VacationBalanceLogEntry {
  id: number;
  tipo: BalanceLogType;
  dias: number;
  saldo_anterior: number;
  saldo_nuevo: number;
  created_at: string;
  solicitud?: { id: number } | null;
}

// ============================================
// API - Mis Vacaciones (todos los usuarios)
// ============================================

export async function fetchMyVacations(): Promise<MyVacationsResponse> {
  const { data } = await api.get(`${BASE}/my`);
  return data;
}

export async function createVacationRequest(payload: {
  fecha_inicio: string;
  fecha_fin?: string;
  request_type?: VacationRequestTypeValue;
  time_off_type?: TimeOffTypeValue;
  hora_inicio?: string;
  comentarios?: string;
}): Promise<VacationRequest> {
  const { data } = await api.post(BASE, payload);
  return data;
}

export async function cancelVacationRequest(id: number): Promise<VacationRequest> {
  const { data } = await api.patch(`${BASE}/${id}/cancel`);
  return data;
}

// ============================================
// API - Gestión (solo RRHH)
// ============================================

export async function fetchAllVacationRequests(): Promise<VacationRequest[]> {
  const { data } = await api.get(BASE);
  return data;
}

export async function approveVacationRequest(id: number): Promise<VacationRequest> {
  const { data } = await api.patch(`${BASE}/${id}/approve`);
  return data;
}

export async function resendVacationApprovalEmail(
  id: number,
  approverId?: number,
): Promise<{ sent: boolean }> {
  const { data } = await api.post(
    `${BASE}/${id}/resend-approval`,
    approverId ? { approver_id: approverId } : {},
  );
  return data;
}

export async function rejectVacationRequest(
  id: number,
  motivo_cancelacion?: string,
): Promise<VacationRequest> {
  const { data } = await api.patch(`${BASE}/${id}/reject`, { motivo_cancelacion });
  return data;
}

export async function hrUpdateVacationRequest(
  id: number,
  payload: {
    fecha_inicio?: string;
    fecha_fin?: string;
    request_type?: VacationRequestTypeValue;
    time_off_type?: TimeOffTypeValue;
    hora_inicio?: string;
    comentarios?: string;
  },
): Promise<VacationRequest> {
  const { data } = await api.patch(`${BASE}/${id}/hr-update`, payload);
  return data;
}

export async function hrCancelVacationRequest(
  id: number,
  motivo_cancelacion?: string,
): Promise<VacationRequest> {
  const { data } = await api.patch(`${BASE}/${id}/hr-cancel`, { motivo_cancelacion });
  return data;
}

export async function fetchVacationBalances(): Promise<VacationBalance[]> {
  const { data } = await api.get(`${BASE}/balances`);
  return data;
}

export async function setVacationBalance(
  userId: number,
  payload: {
    fecha_ingreso: string;
    time_off_type?: string;
    earned_this_year?: number;
    used_this_year?: number;
    previous_year?: number;
    saldo_dias?: number;
  },
): Promise<VacationBalance> {
  const { data } = await api.post(`${BASE}/balances/${userId}`, payload);
  return data;
}

export async function importBalancesExcel(
  file: File,
): Promise<{ imported: number; skipped: string[] }> {
  const form = new FormData();
  form.append('file', file);
  const { data } = await api.post(`${BASE}/import/balances`, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
}

export async function rolloverYear(): Promise<{ updated: number }> {
  const { data } = await api.post(`${BASE}/rollover`);
  return data;
}

export async function creditAnniversaryDays(userId: number): Promise<VacationBalance> {
  const { data } = await api.post(`${BASE}/balances/${userId}/anniversary`);
  return data;
}

export async function downloadVacationIcs(id: number): Promise<void> {
  const response = await api.get(`${BASE}/${id}/ics`, { responseType: 'blob' });
  const url = URL.createObjectURL(new Blob([response.data], { type: 'text/calendar' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = `vacaciones-${id}.ics`;
  a.click();
  URL.revokeObjectURL(url);
}

export async function fetchMyBalanceLog(): Promise<VacationBalanceLogEntry[]> {
  const { data } = await api.get(`${BASE}/my-balance-log`);
  return data;
}

export async function fetchCalendar(year: number, month: number): Promise<VacationRequest[]> {
  const { data } = await api.get(`${BASE}/calendar`, { params: { year, month } });
  return data;
}

export async function downloadVacationRequestsExcel(): Promise<void> {
  const response = await api.get(`${BASE}/export/requests`, { responseType: 'blob' });
  const url = URL.createObjectURL(new Blob([response.data]));
  const a = document.createElement('a');
  a.href = url;
  a.download = 'solicitudes-vacaciones.xlsx';
  a.click();
  URL.revokeObjectURL(url);
}

export async function downloadVacationBalancesExcel(): Promise<void> {
  const response = await api.get(`${BASE}/export/balances`, { responseType: 'blob' });
  const url = URL.createObjectURL(new Blob([response.data]));
  const a = document.createElement('a');
  a.href = url;
  a.download = 'saldos-vacaciones.xlsx';
  a.click();
  URL.revokeObjectURL(url);
}

export interface VacationSettingsData {
  id: number;
  max_days_request: number;
  updated_at: string;
}

export async function fetchVacationSettings(): Promise<VacationSettingsData> {
  const res = await api.get(`${BASE}/settings`);
  return res.data;
}

export async function updateVacationSettings(
  dto: { max_days_request?: number },
): Promise<VacationSettingsData> {
  const res = await api.patch(`${BASE}/settings`, dto);
  return res.data;
}

export async function createVacationRequestForUser(
  userId: number,
  dto: Parameters<typeof createVacationRequest>[0],
): Promise<VacationRequest> {
  const res = await api.post(`${BASE}/create-for/${userId}`, dto);
  return res.data;
}

export async function fetchDaysUsedStats(year?: number, equipoId?: number): Promise<DaysUsedStats> {
  const params = new URLSearchParams();
  if (year) params.set('year', String(year));
  if (equipoId) params.set('equipo_id', String(equipoId));
  const res = await api.get(`${BASE}/stats/days-used?${params.toString()}`);
  return res.data;
}
