// src/api/moneyRequirements.ts
import api from './axios';

export interface MoneyRequirement {
  id: number;
  correlative: string;
  payableTo: string;
  nit?: string;
  amount: number;
  currency: string;
  date: string;
  description: string;
  state: number;
  teamId?: number;
  areaIds?: number[];
  applicantId?: number;
  responsibleForAuthorizingId?: number;
  teamName?: string;
  areaName?: string;
}

// Crear
export async function createMoneyRequirement(payload: Partial<MoneyRequirement>) {
  const { data } = await api.post('/money-requirements', payload);
  return data;
}

// Listar con filtros enriquecidos (usamos /read SIEMPRE)
export async function getMoneyRequirements(params?: Record<string, unknown>): Promise<MoneyRequirement[]> {
  const { data } = await api.get('/money-requirements/read', { params });
  return data;
}

// Actualizar
export async function updateMoneyRequirement(id: number, payload: Partial<MoneyRequirement>) {
  const { data } = await api.patch(`/money-requirements/${id}`, payload);
  return data;
}

// Acciones con múltiples IDs
export async function authorizeMoneyRequirements(ids: number[]) {
  const { data } = await api.post('/money-requirements/authorize', { ids });
  return data;
}

export async function denyMoneyRequirements(ids: number[]) {
  const { data } = await api.post('/money-requirements/deny', { ids });
  return data;
}

// Enviar correo de autorización
export async function sendAuthorizationEmail(to: string, ids: number[]) {
  const { data } = await api.post('/money-requirements/send-authorization-email', {
    to,
    requirements: ids.map((id) => ({ id })), // backend espera { id }
  });
  return data;
}