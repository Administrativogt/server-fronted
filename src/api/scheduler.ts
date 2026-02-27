import api from './axios';
import type {
  SchedulerEvent,
  CreateSchedulerEventDto,
  UpdateSchedulerEventDto,
  SchedulerFilters,
  SchedulerListResponse,
} from '../types/scheduler.types';

const BASE = ((import.meta as any).env?.VITE_SCHEDULER_BASE || '/scheduler').replace(/\/+$/, '');
const EVENTS_PATH = `${BASE}/events`;

export const getSchedulerEvents = async (
  filters?: SchedulerFilters
): Promise<SchedulerListResponse> => {
  const params = new URLSearchParams();
  if (filters?.page) params.append('page', String(filters.page));
  if (filters?.limit) params.append('limit', String(filters.limit));
  const { data } = await api.get<SchedulerListResponse>(`${EVENTS_PATH}?${params.toString()}`);
  return data;
};

export const createSchedulerEvent = async (
  payload: CreateSchedulerEventDto
): Promise<{ message?: string; data: SchedulerEvent }> => {
  const { data } = await api.post<{ message?: string; data: SchedulerEvent }>(EVENTS_PATH, payload);
  return data;
};

export const updateSchedulerEvent = async (
  id: number,
  payload: UpdateSchedulerEventDto
): Promise<{ message?: string; data: SchedulerEvent }> => {
  const { data } = await api.patch<{ message?: string; data: SchedulerEvent }>(
    `${EVENTS_PATH}/${id}`,
    payload
  );
  return data;
};

export const deleteSchedulerEvent = async (id: number): Promise<{ message?: string }> => {
  const { data } = await api.delete<{ message?: string }>(`${EVENTS_PATH}/${id}`);
  return data;
};
