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
