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
  serie?: number;
  correlative?: string;
  date?: string;
  received_from: string;
  amount: number;
  currency?: number;
  concept: string;
  work_note_number?: string;
  bill_number?: string;
  iva_exemption?: string;
  active?: boolean;
  creatorId?: number;   // ✅ agregar esta propiedad
  creator?: { id: number; username: string };
  checks?: Check[];
}

const cashReceiptsApi = {
  create: (data: CashReceipt) => api.post('/cash-receipts', data), // 👈 aquí con guion
  getAll: () => api.get<CashReceipt[]>('/cash-receipts'),
  getById: (id: number) => api.get<CashReceipt>(`/cash-receipts/${id}`),
  update: (id: number, data: Partial<CashReceipt>) =>
    api.put(`/cash-receipts/${id}`, data),
  delete: (id: number) => api.delete(`/cash-receipts/${id}`),
  addChecks: (id: number, checks: Omit<Check, 'id'>[]) =>
    api.post(`/cash-receipts/${id}/checks`, checks),
};


export default cashReceiptsApi;