import api from './axios';
import type { UserLite } from './users';
import type {
  CheckEntity,
  CheckListResponse,
  CheckRequest,
  SyncChecksPayload,
  SyncChecksResponse,
  RequestAuthorizationPayload,
  ManageAuthorizationPayload,
  LiquidateCheckPayload,
  Liquidation,
  InmobiliarioExpenseListResponse,
  CreateExpensePayload,
  InmobiliarioExpense,
  UpdateExpensePayload,
  LitigioExpenseListResponse,
  CreateLitigioExpensePayload,
  LitigioExpense,
  UpdateLitigioExpensePayload,
  ParentCheckResponse,
} from '../types/checks.types';

export const getCheckEntities = async (): Promise<CheckEntity[]> => {
  const { data } = await api.get<CheckEntity[] | { data: CheckEntity[] }>('/checks/entities');
  return Array.isArray(data) ? data : (data?.data ?? []);
};

export const syncPendingAuthorization = async (
  payload: SyncChecksPayload,
): Promise<SyncChecksResponse> => {
  const { data } = await api.post('/checks/sync/pending-authorization', payload);
  return data;
};

export const syncPendingLiquidation = async (
  payload: SyncChecksPayload,
): Promise<SyncChecksResponse> => {
  const { data } = await api.post('/checks/sync/pending-liquidation', payload);
  return data;
};

export const getPendingAuthorization = async (
  params?: Record<string, unknown>,
): Promise<CheckListResponse> => {
  const { data } = await api.get('/checks/pending-authorization', { params });
  return data;
};

export const getPendingLiquidation = async (
  params?: Record<string, unknown>,
): Promise<CheckListResponse> => {
  const { data } = await api.get('/checks/pending-liquidation', { params });
  return data;
};

export const getLiquidatedChecks = async (
  params?: Record<string, unknown>,
): Promise<CheckListResponse> => {
  const { data } = await api.get('/checks/liquidated', { params });
  return data;
};

export const getLiquidationDocumentUrl = async (liquidationId: number): Promise<string> => {
  const { data } = await api.get(`/checks/liquidations/${liquidationId}/document-url`);
  return data.url;
};

export const requestChecksAuthorization = async (
  payload: RequestAuthorizationPayload,
): Promise<{ sent: boolean; checks: number }> => {
  const { data } = await api.post('/checks/authorization/request', payload);
  return data;
};

export const getCoordinatorMembers = async (checkIds: number[]): Promise<UserLite[]> => {
  const { data } = await api.get('/checks/coordinator-members', {
    params: { check_ids: JSON.stringify(checkIds) },
  });
  return Array.isArray(data) ? data : (data?.members ?? data?.data ?? []);
};

export const manageChecksAuthorization = async (
  payload: ManageAuthorizationPayload,
): Promise<{ processed: number; action: string }> => {
  const { data } = await api.post('/checks/authorization/manage', payload);
  return data;
};

export const liquidateCheck = async (
  checkRequestId: number,
  payload: LiquidateCheckPayload | FormData,
): Promise<Liquidation> => {
  const isFormData = payload instanceof FormData;
  const { data } = await api.post(`/checks/${checkRequestId}/liquidate`, payload, {
    headers: isFormData ? { 'Content-Type': 'multipart/form-data' } : undefined,
  });
  return data;
};

export const revertLiquidation = async (
  checkRequestId: number,
  eliminationReason: string,
): Promise<{ success: boolean }> => {
  const { data } = await api.post(`/checks/${checkRequestId}/revert-liquidation`, {
    elimination_reason: eliminationReason,
  });
  return data;
};

export const getInmobiliarioExpenses = async (
  params?: Record<string, unknown>,
): Promise<InmobiliarioExpenseListResponse> => {
  const { data } = await api.get('/checks/inmobiliario-expenses', { params });
  return data;
};

export const getCheckByRequestId = async (requestId: number): Promise<CheckRequest> => {
  const { data } = await api.get(`/checks/request/${requestId}`);
  return data;
};

export const verifyParentCheck = async (requestId: number): Promise<ParentCheckResponse> => {
  try {
    const { data } = await api.get(`/checks/verify-parent/${requestId}`);
    return data;
  } catch (error: any) {
    const responseData = error?.response?.data;
    if (error?.response?.status === 400 && responseData?.has_parent) {
      return responseData as ParentCheckResponse;
    }
    throw error;
  }
};

export const createInmobiliarioExpense = async (
  payload: CreateExpensePayload,
): Promise<InmobiliarioExpense> => {
  const { data } = await api.post('/checks/inmobiliario-expenses', payload);
  return data;
};

export const updateInmobiliarioExpense = async (
  id: number,
  payload: UpdateExpensePayload,
): Promise<InmobiliarioExpense> => {
  const { data } = await api.patch(`/checks/inmobiliario-expenses/${id}`, payload);
  return data;
};

export const deleteInmobiliarioExpense = async (
  id: number,
): Promise<{ deleted: boolean }> => {
  const { data } = await api.delete(`/checks/inmobiliario-expenses/${id}`);
  return data;
};

export const liquidateInmobiliarioExpense = async (
  id: number,
): Promise<{ updated: boolean }> => {
  const { data } = await api.post(`/checks/inmobiliario-expenses/${id}/liquidate`);
  return data;
};

export const getAuthorizationDetails = async (encodedIds: string): Promise<CheckRequest[]> => {
  const { data } = await api.get(`/checks/authorization/details/${encodedIds}`);
  return Array.isArray(data) ? data : [];
};

export const manageAuthorizationLink = async (
  action: 'authorize' | 'deny',
  encodedIds: string,
  authorizerId: number,
): Promise<void> => {
  await api.get(`/checks/manage/${action}/${encodedIds}`, {
    params: { authorizer_id: authorizerId },
  });
};

export const batchDecision = async (
  decisions: { check_id: number; action: 'authorize' | 'deny' }[],
  authorizerId: number,
): Promise<void> => {
  await api.post('/checks/manage/batch-decision', { decisions }, {
    params: { authorizer_id: authorizerId },
  });
};

export const getLitigioExpenses = async (
  params?: Record<string, unknown>,
): Promise<LitigioExpenseListResponse> => {
  const { data } = await api.get('/checks/litigio-expenses', { params });
  return data;
};

export const createLitigioExpense = async (
  payload: CreateLitigioExpensePayload,
): Promise<LitigioExpense> => {
  const { data } = await api.post('/checks/litigio-expenses', payload);
  return data;
};

export const updateLitigioExpense = async (
  id: number,
  payload: UpdateLitigioExpensePayload,
): Promise<LitigioExpense> => {
  const { data } = await api.patch(`/checks/litigio-expenses/${id}`, payload);
  return data;
};

export const deleteLitigioExpense = async (
  id: number,
): Promise<{ deleted: boolean }> => {
  const { data } = await api.delete(`/checks/litigio-expenses/${id}`);
  return data;
};

export const liquidateLitigioExpense = async (
  id: number,
): Promise<{ updated: boolean }> => {
  const { data } = await api.post(`/checks/litigio-expenses/${id}/liquidate`);
  return data;
};

const downloadBlob = async (url: string, params?: Record<string, unknown>, filename?: string) => {
  const response = await api.get(url, { params, responseType: 'blob' });
  const blobUrl = window.URL.createObjectURL(new Blob([response.data]));
  const link = document.createElement('a');
  link.href = blobUrl;
  link.setAttribute('download', filename || 'reporte');
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(blobUrl);
};

export const downloadPendingLiquidationReport = async (userId?: number) =>
  downloadBlob(
    '/checks/reports/pending-liquidation.xlsx',
    userId ? { user_id: userId } : undefined,
    'reporte_cheques_pendientes.xlsx',
  );

export const downloadLiquidatedReport = async (filters?: {
  invoice_number?: string;
  invoice_serie?: string;
  init_date?: string;
  end_date?: string;
  responsible_id?: number;
}) =>
  downloadBlob(
    '/checks/reports/liquidated.xlsx',
    filters,
    'reporte_cheques_liquidados.xlsx',
  );

export const downloadExpensesReport = async (requestId?: number) =>
  downloadBlob(
    '/checks/reports/inmobiliario-expenses.xlsx',
    requestId ? { request_id: requestId } : undefined,
    'reporte_gastos_inmobiliarios.xlsx',
  );

export const downloadLitigioExpensesReport = async (requestId?: number) =>
  downloadBlob(
    '/checks/reports/litigio-expenses.xlsx',
    requestId ? { request_id: requestId } : undefined,
    'reporte_gastos_litigio.xlsx',
  );

export const downloadMergedLiquidationDocuments = async (checkIds: number[]) => {
  const response = await api.post(
    '/checks/reports/liquidation-documents/merge.pdf',
    { check_ids: checkIds },
    { responseType: 'blob' },
  );
  const blobUrl = window.URL.createObjectURL(new Blob([response.data]));
  const link = document.createElement('a');
  link.href = blobUrl;
  link.setAttribute('download', 'reporte_documentos_liquidacion.pdf');
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(blobUrl);
};
