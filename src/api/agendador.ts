import api from './axios';
import type {
  Installment,
  InstallmentsResponse,
  CreateInstallmentDto,
  ProcessType,
  Stage,
  UpdateStageDto,
} from '../types/agendador.types';

const BASE = ((import.meta as any).env?.VITE_AGENDADOR_BASE || '/agendador').replace(/\/+$/, '');

export const getInstallments = async (params?: {
  page?: number;
  limit?: number;
  q?: string;
}): Promise<InstallmentsResponse> => {
  const qs = new URLSearchParams();
  if (params?.page) qs.append('page', String(params.page));
  if (params?.limit) qs.append('limit', String(params.limit));
  if (params?.q) qs.append('q', params.q);
  const { data } = await api.get<InstallmentsResponse>(`${BASE}/installments?${qs.toString()}`);
  return data;
};

export const getInstallment = async (id: number): Promise<Installment> => {
  const { data } = await api.get<Installment>(`${BASE}/installments/${id}`);
  return data;
};

export const createInstallment = async (
  payload: CreateInstallmentDto
): Promise<{ message?: string; data: Installment }> => {
  const { data } = await api.post<{ message?: string; data: Installment }>(
    `${BASE}/installments`,
    payload
  );
  return data;
};

export const deleteInstallment = async (id: number): Promise<{ message?: string }> => {
  const { data } = await api.delete<{ message?: string }>(`${BASE}/installments/${id}`);
  return data;
};

export const finalizeInstallment = async (id: number): Promise<{ message?: string }> => {
  const { data } = await api.get<{ message?: string }>(`${BASE}/installments/finalize/${id}`);
  return data;
};

export const updateStage = async (id: number, payload: UpdateStageDto): Promise<Stage> => {
  const { data } = await api.patch<Stage>(`${BASE}/stages/${id}`, payload);
  return data;
};

export const sendReport = async (
  id: number,
  emails: string[]
): Promise<{ message: string }> => {
  const { data } = await api.post<{ message: string }>(
    `${BASE}/installments/send-report/${id}`,
    { emails }
  );
  return data;
};

export const getProcessTypes = async (): Promise<ProcessType[]> => {
  const { data } = await api.get<unknown>(`${BASE}/process-types`);
  // Soporta tanto respuesta en array directo como { data: [...] }
  if (Array.isArray(data)) return data as ProcessType[];
  // @ts-expect-error estructura flexible
  return (data && (data.data as ProcessType[])) || [];
};
