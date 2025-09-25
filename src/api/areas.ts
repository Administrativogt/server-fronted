// src/api/areas.ts
import api from './axios';

export interface Area {
  id: number;
  name: string; // normalizamos a name
}

export async function getAreas(): Promise<Area[]> {
  const { data } = await api.get('/areas');
  // backend devuelve: { id, name }
  return data.map((a: { id: number; name: string }) => ({
    id: a.id,
    name: a.name,
  }));
}