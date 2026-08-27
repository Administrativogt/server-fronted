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
  delete_reason?: string;
  creator?: {
    id: number;
    username: string;
    email?: string;
  };
  user_deleting?: {
    id: number;
    username: string;
    email?: string;
  } | null;
  checks?: Check[];
}

export interface CashReceiptFilters {
  filter?: number;
  data?: string;
  init_date?: string;
  end_date?: string;
  is_active?: '0' | '1';
}

/** Filtros combinables (GET /cash-receipts/search). Todos opcionales, se aplican con AND. */
export interface CashReceiptSearchParams {
  is_active?: '0' | '1' | 'all';
  serie?: number;
  correlative?: string;
  correlative_from?: string;
  correlative_to?: string;
  received_from?: string;
  concept?: string;
  amount?: number;
  amount_min?: number;
  amount_max?: number;
  currency?: number;
  bill_number?: string;
  work_note_number?: string;
  check_number?: string;
  bank?: string;
  date_from?: string;
  date_to?: string;
  created_from?: string;
  created_to?: string;
  creator_id?: number;
  q?: string;
  sort?: 'id' | 'correlative' | 'date' | 'created' | 'amount' | 'received_from' | 'concept';
  sort_dir?: 'asc' | 'desc';
  page?: number;
  page_size?: number;
}

export interface CashReceiptFilterOptions {
  can_view_all: boolean;
  series: { serie: number; letter: string; count: number }[];
  currencies: { currency: number; count: number }[];
  concepts: { value: string; count: number }[];
  banks: { value: string; count: number }[];
  creators: {
    id: number;
    username: string;
    first_name?: string;
    last_name?: string;
    label: string;
    count: number;
  }[];
}

export interface PaginatedCashReceipts {
  items: CashReceipt[];
  total: number;
  page: number;
  pageSize: number;
}

export interface CashReceiptPreview {
  serie: number;
  serie_letter: string;
  correlative: string;
  correlative_number: number;
  is_superuser?: boolean;
  message?: string;
}

const cashReceiptsApi = {
  // ✅ Crear recibo
  create: (data: CashReceipt) => api.post('/cash-receipts', data),

  // ✅ Listar todos (con filtros opcionales) — trae TODO; preferir getPage
  getAll: (params?: CashReceiptFilters) =>
    api.get<CashReceipt[]>('/cash-receipts', { params }),

  // ✅ Listar paginado en servidor
  getPage: (params: CashReceiptFilters, page: number, pageSize: number) =>
    api.get<PaginatedCashReceipts>('/cash-receipts', {
      params: { ...params, page, page_size: pageSize },
    }),

  // ✅ Búsqueda con filtros combinables, paginada y ordenada en el servidor
  search: (params: CashReceiptSearchParams) =>
    api.get<PaginatedCashReceipts>('/cash-receipts/search', { params }),

  // ✅ Catálogos para el panel de filtros (series, conceptos, bancos, usuarios)
  getFilterOptions: () =>
    api.get<CashReceiptFilterOptions>('/cash-receipts/filter-options'),

  // ✅ Obtener uno por ID
  getById: (id: number) => api.get<CashReceipt>(`/cash-receipts/${id}`),

  // ✅ Obtener serie/correlativo sugerido para el usuario actual
  getNextCorrelative: (serie?: number) =>
    api.get<CashReceiptPreview>('/cash-receipts/next-correlative', {
      params: serie !== undefined ? { serie } : undefined,
    }),

  // ✅ Actualizar recibo
  update: (id: number, data: Partial<CashReceipt>) =>
    api.patch(`/cash-receipts/${id}`, data),

  // ✅ Eliminar recibo (anular)
  delete: (id: number, delete_reason?: string) =>
    api.patch(`/cash-receipts/${id}`, { active: false, delete_reason }),

  // ✅ Restaurar recibo anulado
  restore: (id: number) => api.patch(`/cash-receipts/${id}`, { active: true }),

  // ✅ Descargar PDF
  getPdf: (id: number) =>
    api.get(`/cash-receipts/${id}/pdf`, {
      responseType: 'blob',
      params: { _ts: Date.now() },
    }),

  // ✅ Generar y enviar PDF por correo
  sendPdfByEmail: (id: number, email: string) =>
    api.get(`/cash-receipts/${id}/pdf-email`, { params: { email } }),

  // ✅ Enviar varios recibos al correo
  sendMultiple: (ids: number[], email: string) =>
    api.post(`/cash-receipts/send-multiple`, { ids, email }),
};

export default cashReceiptsApi;