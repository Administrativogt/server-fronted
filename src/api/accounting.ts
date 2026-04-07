import api from './axios';
import type {
  AccountingCheck,
  ContrasenaDeago,
  CreateCheckPayload,
  CreateContrasenaPayload,
  CreateProveedorPayload,
  Proveedor,
  UpdateContrasenaPayload,
} from '../types/accounting.types';

// ─── Contraseñas de pago ────────────────────────────────────────────────────

export const contrasenaApi = {
  create: (data: CreateContrasenaPayload) =>
    api.post<ContrasenaDeago>('/contabilidad/contrasenas', data),

  getAll: (params?: { start?: string; end?: string; estado?: number }) =>
    api.get<ContrasenaDeago[]>('/contabilidad/contrasenas', { params }),

  getById: (id: number) =>
    api.get<ContrasenaDeago>(`/contabilidad/contrasenas/${id}`),

  update: (id: number, data: UpdateContrasenaPayload) =>
    api.patch<ContrasenaDeago>(`/contabilidad/contrasenas/${id}`, data),

  getPendientes: (start?: string, end?: string) =>
    api.get<ContrasenaDeago[]>('/contabilidad/contrasenas/pendientes', {
      params: { ...(start && { start }), ...(end && { end }) },
    }),

  getPagadas: (start?: string, end?: string) =>
    api.get<ContrasenaDeago[]>('/contabilidad/contrasenas/pagadas', {
      params: { ...(start && { start }), ...(end && { end }) },
    }),

  getReporte: (ids: number[]) =>
    api.get('/contabilidad/contrasenas/reporte', {
      params: { ids: ids.join(',') },
      responseType: 'blob',
    }),
};

// ─── Proveedores ────────────────────────────────────────────────────────────

export const proveedorApi = {
  create: (data: CreateProveedorPayload) =>
    api.post<Proveedor>('/contabilidad/proveedores', data),

  getAll: () => api.get<Proveedor[]>('/contabilidad/proveedores'),

  getById: (id: number) =>
    api.get<Proveedor>(`/contabilidad/proveedores/${id}`),

  update: (id: number, data: Partial<CreateProveedorPayload>) =>
    api.patch<Proveedor>(`/contabilidad/proveedores/${id}`, data),
};

// ─── Liquidación de cheques ─────────────────────────────────────────────────

export const checksApi = {
  getAll: (params?: { user?: string; active?: boolean; check_number?: number }) =>
    api.get<AccountingCheck[]>('/contabilidad/checks', { params }),

  getById: (id: number) =>
    api.get<AccountingCheck>(`/contabilidad/checks/${id}`),

  create: (data: CreateCheckPayload, forceSave = false) =>
    api.post<AccountingCheck>(
      `/contabilidad/checks${forceSave ? '?force_save=true' : ''}`,
      data,
    ),

  update: (id: number, data: Partial<CreateCheckPayload>) =>
    api.patch<AccountingCheck>(`/contabilidad/checks/${id}`, data),

  search: (checkNumber: number) =>
    api.get<AccountingCheck[]>('/contabilidad/checks/search', {
      params: { check_number: checkNumber },
    }),

  uploadExcel: (file: File) => {
    const form = new FormData();
    form.append('file', file);
    return api.post<{ processed: number }>('/contabilidad/checks/upload', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  sendEmail: (userName: string, checkIds?: number[]) =>
    api.post<{ sent: boolean }>('/contabilidad/checks/send-email', {
      userName,
      checkIds,
    }),
};
