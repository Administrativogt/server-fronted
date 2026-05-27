import api from './axios';

const BASE = '/api/holidays';

export interface Holiday {
  id: number;
  day: number;
  month: number;
  year: number; // 0 = se repite cada año
  name: string;
  type: number;
}

export async function fetchHolidays(year?: number): Promise<Holiday[]> {
  const params = year ? { year } : {};
  const res = await api.get(BASE, { params });
  return res.data;
}

export async function createHoliday(dto: {
  day: number;
  month: number;
  name: string;
  year?: number;
}): Promise<Holiday> {
  const res = await api.post(BASE, dto);
  return res.data;
}

export async function deleteHoliday(id: number): Promise<void> {
  await api.delete(`${BASE}/${id}`);
}
