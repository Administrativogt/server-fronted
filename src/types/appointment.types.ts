// src/types/appointment.types.ts

export interface Appointment {
  id: number;
  created: string;
  deedId: string;
  startDate: string;
  finishDate: string;
  register: string;
  folio: string;
  book: string;
  representative: string;
  position: string;
  clientEmail: string;
  firstReminderSended: boolean;
  secondReminderSended: boolean;
  state: number; // 1 = activo, 2 = inactivo
  creator: {
    id: number;
    username?: string;
  };
  attachedFiles: AppointmentFile[];
}

export interface AppointmentFile {
  id: number;
  file: string; // URL del archivo
  appointment?: {
    id: number;
  };
}

export interface CreateAppointmentDto {
  deedId: string;
  startDate: string;
  finishDate: string;
  register?: string;
  folio?: string;
  book?: string;
  representative: string;
  position: string;
  clientEmail: string;
  creatorId: number;
}

export interface UpdateAppointmentDto {
  deedId?: string;
  startDate?: string;
  finishDate?: string;
  register?: string;
  folio?: string;
  book?: string;
  representative?: string;
  position?: string;
  clientEmail?: string;
}

export interface AppointmentFilters {
  deedId?: string;
  representative?: string;
  position?: string;
  register?: string;
  folio?: string;
  book?: string;
  startDate?: string;
  finishDate?: string;
  page?: number;
  limit?: number;
}

export interface AppointmentsResponse {
  data: Appointment[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}