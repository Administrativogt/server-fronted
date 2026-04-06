import api from './axios';

const BASE = '/procuration-control';

export interface ChartParams {
  team?: number;
  init_date?: string;
  end_date?: string;
}

export const getMonthChart = (params?: ChartParams) =>
  api.get(`${BASE}/month/chart`, { params }).then((r) => r.data);

export const getTeamChart = (params?: Pick<ChartParams, 'init_date' | 'end_date'>) =>
  api.get(`${BASE}/team/chart`, { params }).then((r) => r.data);

export const getPriorityChart = (params?: ChartParams) =>
  api.get(`${BASE}/priority/chart`, { params }).then((r) => r.data);

export const getPerApplicantChart = (params?: ChartParams & { view_all?: boolean }) =>
  api.get(`${BASE}/per_applicant/chart`, { params }).then((r) => r.data);

export const getPerProcuratorChart = (params?: ChartParams & { view_all?: boolean }) =>
  api.get(`${BASE}/per_procurator/chart`, { params }).then((r) => r.data);

export const getPriorityPerApplicantChart = (params?: ChartParams) =>
  api.get(`${BASE}/priority/per_applicant/chart`, { params }).then((r) => r.data);

export const getPriorityPerProcuratorChart = (params?: ChartParams) =>
  api.get(`${BASE}/priority/per_procurator/chart`, { params }).then((r) => r.data);

export const getTimeChart = (params?: { team?: number; init_date?: string; end_date?: string }) =>
  api.get(`${BASE}/time/chart`, { params }).then((r) => r.data);

export const getIndividualPriorityChart = (params?: ChartParams) =>
  api.get(`${BASE}/individual/priority`, { params }).then((r) => r.data);

export const getIndividualPriorityApplicantChart = (params?: ChartParams) =>
  api.get(`${BASE}/individual/priority/applicant`, { params }).then((r) => r.data);

export const getClientChart = (params?: { client?: number; team?: number; init_date?: string; end_date?: string }) =>
  api.get(`${BASE}/client/chart`, { params }).then((r) => r.data);

export const getProductivityChart = (params?: { area?: number }) =>
  api.get(`${BASE}/productivity/chart`, { params }).then((r) => r.data);

export const uploadClientsCSV = (file: File) => {
  const form = new FormData();
  form.append('clients', file);
  return api.post(`${BASE}/upload-clients`, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }).then((r) => r.data);
};
