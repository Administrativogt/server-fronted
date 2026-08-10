import api from './axios';
import type {
  HorasEquipo,
  HorasTimekeeper,
  HorasCasoEspecial,
  HorasDestinatario,
  HorasImportacion,
  ReporteHoras,
  ImportarResult,
  EnviarResult,
  HorasEnvio,
} from '../types/horas-socios.types';

const BASE = '/api/horas-socios';

/** Descarga un blob como archivo. */
const descargarBlob = (data: Blob, filename: string) => {
  const url = URL.createObjectURL(data);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};

export const horasSociosApi = {
  // Importación
  importar: (file: File) => {
    const form = new FormData();
    form.append('file', file);
    return api.post<ImportarResult>(`${BASE}/importar`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  getImportaciones: () => api.get<HorasImportacion[]>(`${BASE}/importaciones`),
  deleteImportacion: (id: number) => api.delete(`${BASE}/importaciones/${id}`),
  getPreview: (id: number) =>
    api.get<ReporteHoras>(`${BASE}/importaciones/${id}/preview`),
  getEnvios: (id: number) =>
    api.get<HorasEnvio[]>(`${BASE}/importaciones/${id}/envios`),

  // Excel
  descargarExcel: async (id: number, nombre: string) => {
    const { data } = await api.get(`${BASE}/importaciones/${id}/excel`, {
      responseType: 'blob',
    });
    descargarBlob(data, nombre);
  },
  descargarExcelSocio: async (id: number, socio: string) => {
    const { data } = await api.get(
      `${BASE}/importaciones/${id}/excel/${socio}`,
      { responseType: 'blob' },
    );
    descargarBlob(data, `${socio}.xlsx`);
  },

  // Envío de correos
  enviar: (id: number, body: { socios?: string[]; dryRun?: boolean }) =>
    api.post<EnviarResult>(`${BASE}/importaciones/${id}/enviar`, body),

  // Catálogos
  getEquipos: () => api.get<HorasEquipo[]>(`${BASE}/equipos`),
  createEquipo: (data: Omit<HorasEquipo, 'id'>) =>
    api.post<HorasEquipo>(`${BASE}/equipos`, data),
  updateEquipo: (id: number, data: Partial<Omit<HorasEquipo, 'id'>>) =>
    api.patch<HorasEquipo>(`${BASE}/equipos/${id}`, data),
  deleteEquipo: (id: number) => api.delete(`${BASE}/equipos/${id}`),

  getTimekeepers: () => api.get<HorasTimekeeper[]>(`${BASE}/timekeepers`),
  createTimekeeper: (data: {
    nombre: string;
    equipo_id: number;
    activo?: boolean;
  }) => api.post<HorasTimekeeper>(`${BASE}/timekeepers`, data),
  updateTimekeeper: (
    id: number,
    data: { nombre?: string; equipo_id?: number; activo?: boolean },
  ) => api.patch<HorasTimekeeper>(`${BASE}/timekeepers/${id}`, data),
  deleteTimekeeper: (id: number) => api.delete(`${BASE}/timekeepers/${id}`),

  getCasosEspeciales: () =>
    api.get<HorasCasoEspecial[]>(`${BASE}/casos-especiales`),
  createCasoEspecial: (data: Omit<HorasCasoEspecial, 'id'>) =>
    api.post<HorasCasoEspecial>(`${BASE}/casos-especiales`, data),
  updateCasoEspecial: (
    id: number,
    data: Partial<Omit<HorasCasoEspecial, 'id'>>,
  ) => api.patch<HorasCasoEspecial>(`${BASE}/casos-especiales/${id}`, data),
  deleteCasoEspecial: (id: number) =>
    api.delete(`${BASE}/casos-especiales/${id}`),

  getDestinatarios: () =>
    api.get<HorasDestinatario[]>(`${BASE}/destinatarios`),
  createDestinatario: (data: Omit<HorasDestinatario, 'id'>) =>
    api.post<HorasDestinatario>(`${BASE}/destinatarios`, data),
  updateDestinatario: (
    id: number,
    data: Partial<Omit<HorasDestinatario, 'id'>>,
  ) => api.patch<HorasDestinatario>(`${BASE}/destinatarios/${id}`, data),
  deleteDestinatario: (id: number) =>
    api.delete(`${BASE}/destinatarios/${id}`),
};

/** 6786 minutos → "113:06" */
export const minutosAHoras = (min: number): string => {
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  return `${h}:${String(m).padStart(2, '0')}`;
};
