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

/**
 * jefeIds: selección de jefes (vacío = todos).
 * test=true: todos los correos van al usuario que lo dispara más `testEmails`
 * (copias de prueba); nunca a los jefes. El envío real lleva copia fija a RR.HH.
 */
export async function sendVacationReports(
  test: boolean,
  testEmails: string[] = [],
  jefeIds: number[] = [],
): Promise<SendVacationReportResult> {
  const { data } = await api.post(`${BASE}/send`, {
    test,
    jefeIds,
    ...(test ? { testEmails } : {}),
  });
  return data;
}
