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

  // Último envío + período sugerido para encadenar el próximo
  getUltimoEnvio: () =>
    api.get<{
      ultimo_envio: {
        fecha_envio: string;
        fecha_inicio: string;
        fecha_fin: string;
        emails_enviados: number;
      } | null;
      sugerido: { fecha_inicio: string | null; fecha_fin: string };
    }>('/api/informe-socios/ultimo-envio'),

  // Datos importados (opcionalmente filtrados por período)
  getCasos: (fechaInicio?: string, fechaFin?: string) =>
    api.get<InformeCasoRow[]>('/api/informe-socios/casos', {
      params:
        fechaInicio && fechaFin
          ? { fecha_inicio: fechaInicio, fecha_fin: fechaFin }
          : undefined,
    }),
  getClientes: (fechaInicio?: string, fechaFin?: string) =>
    api.get<InformeClienteRow[]>('/api/informe-socios/clientes', {
      params:
        fechaInicio && fechaFin
          ? { fecha_inicio: fechaInicio, fecha_fin: fechaFin }
          : undefined,
    }),

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
