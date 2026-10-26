import api from './axios';
import type {
  HorasEquipo,
  HorasTimekeeper,
  HorasCasoEspecial,
  HorasClienteEspecial,
  CategoriaNF,
  NoFacturablesResult,
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
  getNoFacturables: (id: number) =>
    api.get<NoFacturablesResult>(`${BASE}/importaciones/${id}/no-facturables`),
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
  descargarDetalleIndividual: async (id: number, usuario: string) => {
    const { data } = await api.get(
      `${BASE}/importaciones/${id}/detalle/${encodeURIComponent(usuario)}`,
      { responseType: 'blob' },
    );
    descargarBlob(data, `Horas ${nombrePropio(usuario)}.xlsx`);
  },
  descargarDetalleCoordinador: async (id: number, socio: string) => {
    const { data } = await api.get(
      `${BASE}/importaciones/${id}/coordinador/${socio}`,
      { responseType: 'blob' },
    );
    descargarBlob(data, `Detalle horas Coordinador ${socio}.xlsx`);
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
    detalle_individual?: boolean;
    coordinador_reporte?: boolean;
  }) => api.post<HorasTimekeeper>(`${BASE}/timekeepers`, data),
  updateTimekeeper: (
    id: number,
    data: {
      nombre?: string;
      equipo_id?: number;
      activo?: boolean;
      detalle_individual?: boolean;
      coordinador_reporte?: boolean;
    },
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

  createClienteEspecial: (data: Omit<HorasClienteEspecial, 'id'>) =>
    api.post<HorasClienteEspecial>(`${BASE}/clientes-especiales`, data),
  updateClienteEspecial: (
    id: number,
    data: Partial<Omit<HorasClienteEspecial, 'id'>>,
  ) => api.patch<HorasClienteEspecial>(`${BASE}/clientes-especiales/${id}`, data),
  deleteClienteEspecial: (id: number) =>
    api.delete(`${BASE}/clientes-especiales/${id}`),

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

/** Categorías de horas no facturables, en el orden del Mapa de Horas. */
export const CATEGORIAS_NF: { value: CategoriaNF; label: string }[] = [
  { value: 'FORMACION', label: 'Formación' },
  { value: 'CONSORTIUM', label: 'Horas Consortium' },
  { value: 'COBRO_FACTURACION', label: 'Cobro y Facturación' },
  { value: 'PRO_BONO', label: 'Pro Bono' },
  { value: 'GESTION_ADMINISTRATIVA', label: 'Gestión Administrativa' },
  { value: 'CNC', label: 'Cobrables que no se cobran (CNC)' },
];

/** "IVONNE COLLOY MALDONADO" → "Ivonne Colloy Maldonado" (mismo criterio que el backend). */
export const nombrePropio = (nombre: string): string =>
  nombre
    .trim()
    .toLowerCase()
    .replace(/(^|\s|-)([a-záéíóúñü])/g, (_, sep: string, ch: string) => sep + ch.toUpperCase());

/** 6786 minutos → "113:06" */
export const minutosAHoras = (min: number): string => {
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  return `${h}:${String(m).padStart(2, '0')}`;
};
