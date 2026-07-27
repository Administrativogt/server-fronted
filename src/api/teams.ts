// src/api/teams.ts
import api from './axios';
import type { UserLite } from './users';

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
  // backend devuelve money_requirements_team: { id, name, areas: [{ id, name }] }
  return data.map((t: { id: number; name: string; areas?: PracticeArea[] }) => ({
    id: t.id,
    name: t.name,
    areas: t.areas || [],
  }));
}

/**
 * Autorizadores válidos para el usuario logueado: los de su mismo equipo que
 * están en el grupo "money requirements authorizers" y activos. Es la misma
 * regla que usaba el Django viejo para llenar "Responsable de firmar".
 */
export async function getAuthorizers(allTeams = false): Promise<UserLite[]> {
  const { data } = await api.get('/money-requirements/authorizers', {
    params: allTeams ? { allTeams: true } : undefined,
  });
  return data;
}