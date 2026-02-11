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

// ✅ NUEVO: Obtener todos los usuarios (usar solo si es necesario)
export const getUsuarios = () =>
  axios.get<Usuario[]>('/users');

// ✅ NUEVO: Obtener solo solicitantes activos (ordenados alfabéticamente)
export const getSolicitantes = () =>
  axios.get<Usuario[]>('/users/solicitantes');

// ✅ NUEVO: Obtener solo mensajeros activos (ordenados alfabéticamente)
export const getMensajeros = () =>
  axios.get<Usuario[]>('/users/mensajeros');

// ✅ NUEVO: Buscar usuarios por nombre/apellido (autocomplete)
export const searchUsuarios = (query: string) =>
  axios.get<Usuario[]>(`/users/search?q=${query}`);

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

// ✅ NUEVO: Descargar Excel con filtros mejorados
export const downloadEncargosExcel = (params?: {
  mensajeroId?: number;
  type?: 1 | 2; // 1 = en ruta (estados 2, 5), 2 = pendientes (estados 1, 2, 5)
  encargoIds?: number[];
  startDate?: string; // YYYY-MM-DD
  endDate?: string;   // YYYY-MM-DD
}) => {
  const queryParams = new URLSearchParams();
  
  if (params?.mensajeroId) {
    queryParams.append('id', params.mensajeroId.toString());
  }
  
  if (params?.type) {
    queryParams.append('type', params.type.toString());
  }
  
  if (params?.encargoIds && params.encargoIds.length > 0) {
    queryParams.append('params', JSON.stringify(params.encargoIds));
  }
  
  if (params?.startDate) {
    queryParams.append('start', params.startDate);
  }
  
  if (params?.endDate) {
    queryParams.append('end', params.endDate);
  }

  return axios.get(`/api/encargos/reportes/excel?${queryParams}`, { 
    responseType: 'blob' 
  });
};

// ✅ NUEVO: Tiempos de entrega del mensajero (a tiempo vs tarde)
export const getTiemposEntregaMensajero = async (mensajeroId: number, params?: { start?: string; end?: string }) => {
  const queryParams = new URLSearchParams();
  if (params?.start) queryParams.append('start', params.start);
  if (params?.end) queryParams.append('end', params.end);
  
  const response = await axios.get(`/api/charts/mensajero/${mensajeroId}/time?${queryParams}`);
  return response.data;
};

// ✅ NUEVO: Zonas atendidas por mensajero
export const getZonasMensajero = async (mensajeroId: number, params?: { start?: string; end?: string }) => {
  const queryParams = new URLSearchParams();
  if (params?.start) queryParams.append('start', params.start);
  if (params?.end) queryParams.append('end', params.end);
  
  const response = await axios.get(`/api/charts/mensajero/${mensajeroId}/zones?${queryParams}`);
  return response.data;
};

// ✅ NUEVO: Entregas tardías del mensajero
export const getEntregasTardiaMensajero = async (mensajeroId: number, params?: { start?: string; end?: string }) => {
  const queryParams = new URLSearchParams();
  if (params?.start) queryParams.append('start', params.start);
  if (params?.end) queryParams.append('end', params.end);
  
  const response = await axios.get(`/api/charts/mensajero/${mensajeroId}/late?${queryParams}`);
  return response.data;
};

// ✅ NUEVO: Encargos problemáticos (rechazados e incidencias)
export const getEncargosProblematicos = async (params?: { start?: string; end?: string; pk?: number; team?: number }) => {
  const queryParams = new URLSearchParams();
  if (params?.start) queryParams.append('start', params.start);
  if (params?.end) queryParams.append('end', params.end);
  if (params?.pk) queryParams.append('pk', params.pk.toString());
  if (params?.team) queryParams.append('team', params.team.toString());
  
  const response = await axios.get(`/api/charts/problematic?${queryParams}`);
  return response.data;
};