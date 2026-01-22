import api from './axios';
import type { CargabilityUser, CargabilityReport, SendEmailResponse } from '../types/cargability.types';

export const cargabilityApi = {
  // ✅ AGREGAR /api/ al inicio
  uploadExcel: (file: File) => {
    const formData = new FormData();
    formData.append('file_data', file);
    return api.post('/api/cargability/calculate-hours', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  // ✅ AGREGAR /api/ al inicio
  getUsersList: () => api.get<CargabilityUser[]>('/api/cargability/users-list'),

  // ✅ AGREGAR /api/ al inicio
  getUsersForEmail: () => api.get<CargabilityUser[]>('/api/cargability/users-for-email'),

  // ✅ AGREGAR /api/ al inicio
  getReport: (username: string) => api.get<CargabilityReport>(`/api/cargability/report/${username}`),

  // ✅ AGREGAR /api/ al inicio
  sendEmailToOne: (username: string) => 
    api.get<SendEmailResponse>(`/api/cargability/send-report/${username}/send-one`),

  // ✅ AGREGAR /api/ al inicio
  sendEmailToAll: () => 
    api.get<SendEmailResponse>(`/api/cargability/send-report/all/send-all`),

  // ✅ AGREGAR /api/ al inicio
  sendEmailsBulk: (usernames: string[]) => 
    api.post<SendEmailResponse>('/api/cargability/send-emails-bulk', { usernames }),
};