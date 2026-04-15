// src/api/teams.ts
import api from './axios';

export interface PracticeArea {
  id: number;
  name: string;
}

export interface Team {
  id: number;
  name: string;
  areas: PracticeArea[];
}

export async function getTeams(): Promise<Team[]> {
  const { data } = await api.get('/money-requirements/teams');
  // backend devuelve: { id, nombre, areas: [{ id, name }] }
  return data.map((t: { id: number; nombre: string; areas?: PracticeArea[] }) => ({
    id: t.id,
    name: t.nombre,
    areas: t.areas || [],
  }));
}

export async function getPracticeAreas(): Promise<PracticeArea[]> {
  const { data } = await api.get('/money-requirements/practice-areas');
  return data;
}