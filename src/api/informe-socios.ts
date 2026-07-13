import api from './axios';
import type {
  InformeSocio,
  InformeStats,
  PreviewReporte,
  GenerarReporteResult,
  ImportResult,
  InformeCasoRow,
  InformeClienteRow,
} from '../types/informe-socios.types';

export const informeSociosApi = {
  // Socios CRUD
  getSocios: () => api.get<InformeSocio[]>('/api/informe-socios/socios'),
  createSocio: (data: Omit<InformeSocio, 'id'>) =>
    api.post<InformeSocio>('/api/informe-socios/socios', data),
  updateSocio: (id: number, data: Partial<Omit<InformeSocio, 'id'>>) =>
    api.patch<InformeSocio>(`/api/informe-socios/socios/${id}`, data),
  deleteSocio: (id: number) =>
    api.delete(`/api/informe-socios/socios/${id}`),

  // Stats
  getStats: () => api.get<InformeStats>('/api/informe-socios/stats'),

  // Datos importados
  getCasos: () => api.get<InformeCasoRow[]>('/api/informe-socios/casos'),
  getClientes: () =>
    api.get<InformeClienteRow[]>('/api/informe-socios/clientes'),

  // Import
  importarCasos: (file: File) => {
    const form = new FormData();
    form.append('file', file);
    return api.post<ImportResult>('/api/informe-socios/importar-casos', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  importarClientes: (file: File) => {
    const form = new FormData();
    form.append('file', file);
    return api.post<ImportResult>('/api/informe-socios/importar-clientes', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  // Reports
  preview: (fecha_inicio: string, fecha_fin: string) =>
    api.get<PreviewReporte>('/api/informe-socios/preview', {
      params: { fecha_inicio, fecha_fin },
    }),
  generarReportes: (body: {
    fecha_inicio: string;
    fecha_fin: string;
    emails_admin?: string[];
    enviar_email?: boolean;
  }) => api.post<GenerarReporteResult>('/api/informe-socios/generar-reportes', body),
};
