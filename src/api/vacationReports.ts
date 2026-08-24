import api from './axios';

const BASE = '/human-resources/vacation-reports';

export interface VacationReportRow {
  nombre: string;
  username: string;
  equipo: string;
  fechaIngreso: string;
  saldo: number;
  usados: number;
  pendientesAprobacion: number;
  proximasVacaciones: string;
}

export interface VacationReportGroup {
  jefe: { id: number; username: string; nombre: string; email: string | null };
  empleados: VacationReportRow[];
}

export interface SendVacationReportResult {
  jefes: number;
  enviados: number;
  omitidos: string[];
}

/** Grupos jefe → empleados que recibiría cada correo. */
export async function previewVacationReports(): Promise<VacationReportGroup[]> {
  const { data } = await api.get(`${BASE}/preview`);
  return data;
}

/** test=true: todos los correos van solo al usuario que lo dispara. */
export async function sendVacationReports(
  test: boolean,
): Promise<SendVacationReportResult> {
  const { data } = await api.post(`${BASE}/send`, { test });
  return data;
}
