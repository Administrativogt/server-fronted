// src/api/teams.ts
import api from './axios';

export interface Team {
  id: number;
  name: string; // normalizamos a name
}

export async function getTeams(): Promise<Team[]> {
  const { data } = await api.get('/equipos');
  // backend devuelve: { id, nombre }
  return data.map((t: { id: number; nombre: string }) => ({
    id: t.id,
    name: t.nombre,
  }));
}