// src/api/encargos.ts
import axios from './axios';
import type { Usuario, Municipio, EncargoFormValues, Encargo } from '../types/encargo';

// ─── ENCARGOS ─────────────────────────────────────────────

// Crear un nuevo encargo
export const createEncargo = (data: EncargoFormValues) =>
  axios.post<Encargo>('/api/encargos', data);

// Obtener todos los encargos (con filtros opcionales)
export const getEncargos = (params?: Record<string, any>) =>
  axios.get<Encargo[]>('/api/encargos', { params });

// Obtener encargos pendientes (estado = 1)
export const getPendingEncargos = () =>
  axios.get<Encargo[]>('/api/encargos/pending');

// Obtener un encargo por ID
export const getEncargoById = (id: number) =>
  axios.get<Encargo>(`/api/encargos/${id}`);

// Actualizar un encargo
export const updateEncargo = (id: number, data: Partial<EncargoFormValues>) =>
  axios.patch<Encargo>(`/api/encargos/${id}`, data);

// Eliminar un encargo
export const deleteEncargo = (id: number) =>
  axios.delete(`/api/encargos/${id}`);

// Rechazar un encargo
export const rejectEncargo = (id: number, razon_rechazo: string) =>
  axios.patch(`/api/encargos/${id}/reject`, { razon_rechazo });

// Reportar incidencia
export const reportIncidence = (id: number, incidencias: string) =>
  axios.patch(`/api/encargos/${id}/incidence`, { incidencias });

// Enviar reclamo
export const sendComplaint = (id: number, reclamo: string) =>
  axios.patch(`/api/encargos/${id}/complaint`, { reclamo });

// ─── USUARIOS Y MUNICIPIOS ───────────────────────────────

// Obtener todos los usuarios (incluye solicitantes y mensajeros)
export const getUsuarios = () =>
  axios.get<Usuario[]>('/users');

// Obtener solo los mensajeros (filtro en frontend por tipo_usuario 8 o 10)
export const getMensajeros = () =>
  axios.get<Usuario[]>('/users');

// Obtener municipios
export const getMunicipios = () =>
  axios.get<Municipio[]>('/api/municipios');




// ─── GRÁFICAS ─────────────────────────────────────────────

// Tipos de respuesta del backend
interface MonthResponse {
  solicitudes: { mes: number; total_solicitudes: number }[];
}

interface ZoneResponse {
  zona: number;
  total_solicitudes: string;
}

interface PriorityResponse {
  A: number;
  B: number;
  C: number;
  D: number;
}

interface StateResponse {
  user: string;
  solicitudes: { correctos: number; rechazados: number; incidencia: number }[];
}

interface MensajeroResponse {
  mensajero_id: number;
  solicitudes: { mes?: number; total_solicitudes?: number }[];
}

// Tipo común para charts
export interface ChartData {
  labels: string[];
  data: number[];
}

const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

// Chart por mes
export const getChartByMonth = async (params: { start?: string; end?: string }): Promise<{ data: ChartData }> => {
  const res = await axios.get<MonthResponse>('/api/charts/month', { params });
  const solicitudes = res.data.solicitudes || [];
  return {
    data: {
      labels: solicitudes.map(s => MESES[s.mes - 1] || `Mes ${s.mes}`),
      data: solicitudes.map(s => s.total_solicitudes),
    }
  };
};

// Chart por zona
export const getChartByZone = async (params: { start?: string; end?: string }): Promise<{ data: ChartData }> => {
  const res = await axios.get<ZoneResponse[]>('/api/charts/zone', { params });
  const zonas = res.data || [];
  return {
    data: {
      labels: zonas.map(z => `Zona ${z.zona}`),
      data: zonas.map(z => parseInt(z.total_solicitudes) || 0),
    }
  };
};

// Chart por prioridad
export const getChartByPriority = async (params: { start?: string; end?: string }): Promise<{ data: ChartData }> => {
  const res = await axios.get<PriorityResponse[]>('/api/charts/priority', { params });
  const prioridad = res.data[0] || { A: 0, B: 0, C: 0, D: 0 };
  return {
    data: {
      labels: ['A (mismo día)', 'B (2 días)', 'C (3+ días)', 'D (Villanueva)'],
      data: [prioridad.A, prioridad.B, prioridad.C, prioridad.D],
    }
  };
};

// Chart por estado (correctos, rechazados, incidencias)
export const getChartByState = async (params: { start?: string; end?: string }): Promise<{ data: ChartData }> => {
  const res = await axios.get<StateResponse>('/api/charts/state', { params });
  const sol = res.data.solicitudes?.[0] || { correctos: 0, rechazados: 0, incidencia: 0 };
  return {
    data: {
      labels: ['Correctos', 'Rechazados', 'Incidencias'],
      data: [sol.correctos, sol.rechazados, sol.incidencia],
    }
  };
};

// Chart por mensajero
export const getChartByMensajero = async (params: { mensajero_id: number; start?: string; end?: string }): Promise<{ data: ChartData }> => {
  const res = await axios.get<MensajeroResponse>(`/api/charts/mensajero/${params.mensajero_id}`, {
    params: { start: params.start, end: params.end }
  });
  const solicitudes = res.data.solicitudes || [];
  return {
    data: {
      labels: solicitudes.map(s => MESES[s.mes! - 1] || `Mes ${s.mes}`),
      data: solicitudes.map(s => s.total_solicitudes || 0),
    }
  };
};

// Obtener todos los envíos (con filtros)
export const getAllEncargos = (params?: Record<string, any>) =>
  axios.get<Encargo[]>('/api/encargos', { params });



// Registrar email
export const registerEmail = (email: string, password: string) =>
  axios.post('/api/encargos/register-email', { email, password });

// Descargar Excel
export const downloadEncargosExcel = () =>
  axios.get('/api/encargos/report/excel', { responseType: 'blob' });