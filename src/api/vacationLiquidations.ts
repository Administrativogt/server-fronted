import api from './axios';

const BASE = '/human-resources/vacation-liquidations';

// ============================================
// INTERFACES
// ============================================

export type LiquidationStatus = 'CONFIRMADA' | 'ANULADA';

export interface LiquidationPeriod {
  id?: number;
  orden?: number;
  periodo_inicio: string;
  periodo_fin: string;
  dias_correspondientes: number;
  dias_gozados: number;
  dias_pendientes: number;
  es_proporcional: boolean;
}

export interface LiquidationPreview {
  user: { id: number; username: string; nombre: string };
  fecha_ingreso: string;
  fecha_salida: string;
  saldo_actual: number | null;
  periodos: LiquidationPeriod[];
  total_dias_pendientes: number;
}

export interface VacationLiquidation {
  id: number;
  user: { id: number; username: string; first_name: string; last_name: string };
  fecha_ingreso: string;
  fecha_salida: string;
  total_dias_pendientes: number;
  saldo_cerrado: number;
  estado: LiquidationStatus;
  observaciones: string | null;
  periodos: LiquidationPeriod[];
  created_at: string;
  anulada_at: string | null;
}

// ============================================
// API (solo RRHH)
// ============================================

export async function previewLiquidation(
  userId: number,
  fechaSalida: string,
  fechaIngreso?: string,
): Promise<LiquidationPreview> {
  const params = new URLSearchParams({ userId: String(userId), fechaSalida });
  if (fechaIngreso) params.set('fechaIngreso', fechaIngreso);
  const { data } = await api.get(`${BASE}/preview?${params.toString()}`);
  return data;
}

export async function createLiquidation(payload: {
  user_id: number;
  fecha_ingreso: string;
  fecha_salida: string;
  observaciones?: string;
  periodos: Omit<LiquidationPeriod, 'id' | 'orden'>[];
}): Promise<VacationLiquidation> {
  const { data } = await api.post(BASE, payload);
  return data;
}

export async function fetchLiquidations(): Promise<VacationLiquidation[]> {
  const { data } = await api.get(BASE);
  return data;
}

export async function anularLiquidation(id: number): Promise<VacationLiquidation> {
  const { data } = await api.patch(`${BASE}/${id}/anular`);
  return data;
}

export async function downloadLiquidationPdf(
  id: number,
  username?: string,
): Promise<void> {
  const response = await api.get(`${BASE}/${id}/pdf`, { responseType: 'blob' });
  const url = URL.createObjectURL(
    new Blob([response.data], { type: 'application/pdf' }),
  );
  const a = document.createElement('a');
  a.href = url;
  a.download = `liquidacion-vacaciones-${username ?? id}.pdf`;
  a.click();
  URL.revokeObjectURL(url);
}
