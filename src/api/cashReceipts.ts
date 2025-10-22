// src/api/cashReceipts.ts
import api from './axios';

export interface Check {
  id?: number;
  number: string;
  bank: string;
  value: number;
}

export interface CashReceipt {
  id?: number;
  serie?: string | number;
  correlative?: string;
  date?: string;
  received_from: string;
  amount: string | number;
  currency?: number;
  concept: string;
  work_note_number?: string;
  bill_number?: string;
  iva_exemption?: string;
  active?: boolean;
  creator?: {
    id: number;
    username: string;
    email?: string;
  };
  checks?: Check[];
}

const cashReceiptsApi = {
  // ✅ Crear recibo
  create: (data: CashReceipt) => api.post('/cash-receipts', data),

  // ✅ Listar todos (con filtros opcionales)
  getAll: (params?: any) => api.get<CashReceipt[]>('/cash-receipts', { params }),

  // ✅ Obtener uno por ID
  getById: (id: number) => api.get<CashReceipt>(`/cash-receipts/${id}`),

  // ✅ Actualizar recibo
  update: (id: number, data: Partial<CashReceipt>) =>
    api.patch(`/cash-receipts/${id}`, data),

  // ✅ Eliminar recibo (anular)
  delete: (id: number) => api.patch(`/cash-receipts/${id}`, { active: false }),

  // ✅ Descargar PDF
  getPdf: (id: number) =>
    api.get(`/cash-receipts/${id}/pdf`, { responseType: 'blob' }),

  // ✅ Generar y enviar PDF por correo
  sendPdfByEmail: (id: number, email: string) =>
    api.get(`/cash-receipts/${id}/pdf-email`, { params: { email } }),

  // ✅ Enviar varios recibos al correo
  sendMultiple: (ids: number[], email: string) =>
    api.post(`/cash-receipts/send-multiple`, { ids, email }),
};

export default cashReceiptsApi;