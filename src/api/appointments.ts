// src/api/appointments.ts
import api from './axios';
import type {
  Appointment,
  CreateAppointmentDto,
  UpdateAppointmentDto,
  AppointmentFilters,
  AppointmentsResponse,
} from '../types/appointment.types';

/**
 * Obtener lista de actas con filtros y paginación
 */
export const getAppointments = async (
  filters?: AppointmentFilters
): Promise<AppointmentsResponse> => {
  const params = new URLSearchParams();

  if (filters?.deedId) params.append('deedId', filters.deedId);
  if (filters?.representative) params.append('representative', filters.representative);
  if (filters?.position) params.append('position', filters.position);
  if (filters?.register) params.append('register', filters.register);
  if (filters?.folio) params.append('folio', filters.folio);
  if (filters?.book) params.append('book', filters.book);
  if (filters?.startDate) params.append('startDate', filters.startDate);
  if (filters?.finishDate) params.append('finishDate', filters.finishDate);
  if (filters?.page) params.append('page', filters.page.toString());
  if (filters?.limit) params.append('limit', filters.limit.toString());

  const { data } = await api.get<AppointmentsResponse>(`/appointments?${params.toString()}`);
  return data;
};

/**
 * Obtener una acta por ID
 */
export const getAppointmentById = async (id: number): Promise<{ data: Appointment }> => {
  const { data } = await api.get<{ data: Appointment }>(`/appointments/${id}`);
  return data;
};

/**
 * Crear acta con archivos
 */
export const createAppointment = async (
  appointmentData: CreateAppointmentDto,
  files: File[]
): Promise<{ message: string; data: Appointment }> => {
  const formData = new FormData();

  // Agregar campos del formulario
  formData.append('deedId', appointmentData.deedId);
  formData.append('startDate', appointmentData.startDate);
  formData.append('finishDate', appointmentData.finishDate);
  formData.append('representative', appointmentData.representative);
  formData.append('position', appointmentData.position);
  formData.append('clientEmail', appointmentData.clientEmail);
  formData.append('creatorId', appointmentData.creatorId.toString());

  if (appointmentData.register) formData.append('register', appointmentData.register);
  if (appointmentData.folio) formData.append('folio', appointmentData.folio);
  if (appointmentData.book) formData.append('book', appointmentData.book);

  // Agregar archivos
  files.forEach((file) => {
    formData.append('certificate_file', file);
  });

  const { data } = await api.post<{ message: string; data: Appointment }>(
    '/appointments',
    formData,
    {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    }
  );

  return data;
};

/**
 * Actualizar acta
 */
export const updateAppointment = async (
  id: number,
  appointmentData: UpdateAppointmentDto
): Promise<{ message: string; data: Appointment }> => {
  const { data } = await api.patch<{ message: string; data: Appointment }>(
    `/appointments/${id}`,
    appointmentData
  );
  return data;
};

/**
 * Eliminar acta (soft delete)
 */
export const deleteAppointment = async (id: number): Promise<{ message: string }> => {
  const { data } = await api.delete<{ message: string }>(`/appointments/${id}`);
  return data;
};

/**
 * Enviar recordatorios manualmente
 */
export const sendReminders = async (): Promise<{ message: string; sent: number }> => {
  const { data } = await api.get<{ message: string; sent: number }>(
    '/appointments/reminder/send'
  );
  return data;
};