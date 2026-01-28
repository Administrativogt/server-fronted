// src/types/procuration.types.ts

// Estados de Procuración
export enum ProcurationState {
  SOLICITADO = 1,
  EN_PROCESO = 2,
  RECHAZADO = 3,
  FINALIZADO = 4,
  EN_SUSPENSO = 5,
  FUERA_DE_TIEMPO = 6,
}

// Prioridades
export enum ProcurationPriority {
  A = 1, // Alta/Urgente
  B = 2, // Media
  C = 3, // Baja
}

// Labels para mostrar en UI
export const STATE_LABELS: Record<number, string> = {
  1: 'Solicitado',
  2: 'En Proceso',
  3: 'Rechazado',
  4: 'Finalizado',
  5: 'En Suspenso',
  6: 'Fuera de Tiempo',
};

export const STATE_COLORS: Record<number, string> = {
  1: 'blue',
  2: 'processing',
  3: 'red',
  4: 'green',
  5: 'gold',
  6: 'orange',
};

export const PRIORITY_LABELS: Record<number, string> = {
  1: 'A - Urgente',
  2: 'B - Media',
  3: 'C - Baja',
};

export const PRIORITY_COLORS: Record<number, string> = {
  1: 'red',
  2: 'orange',
  3: 'green',
};

// Entidades relacionadas
export interface Client {
  id: number;
  code: string;
  name: string;
}

export interface Entity {
  id: number;
  name: string;
}

export interface Recurrence {
  id: number;
  lapse: string;
}

export interface ProcurationStateEntity {
  id: number;
  name: string;
}

export interface Area {
  id: number;
  name: string;
}

export interface User {
  id: number;
  username: string;
  email?: string;
  first_name?: string;
  last_name?: string;
  area?: Area;
}

// Procuración principal
export interface Procuration {
  id: number;
  create_date: string;
  applicant: User;
  client: Client;
  nt_number?: number;
  entity: Entity;
  description: string;
  documents: string;
  date: string;
  procurator?: User;
  limit_date?: string;
  limit_hour?: string;
  priority: number;
  recurrence?: Recurrence;
  state: number;
  finalized?: string;
  user_finalized?: User;
}

// Comentario
export interface Comment {
  id: number;
  user: User;
  comment: string;
  creation: string;
  state: number;
  procuration: { id: number };
}

// Desglose de documentos
export interface DocumentBreakdown {
  client: number;
  amount: number;
}

// DTOs para crear
export interface CreateProcurationItem {
  client: number;
  entity: number;
  description: string;
  documents: string;
  date: string;
  applicant?: number;
  procurator?: number;
  limit_date?: string;
  limit_hour?: string;
  priority?: number;
  state?: number;
  recurrence?: number;
  nt_number?: number;
  document_breakdown?: DocumentBreakdown[];
}

export interface CreateProcurationPayload {
  data: string; // JSON stringified array of CreateProcurationItem
  push_supported?: string;
}

export interface CreateCommentDto {
  procuration: number;
  comment: string;
  state: number;
  push_supported?: string;
  reject?: string;
  suspend?: string;
}

// DTOs para actualizar
export interface UpdateProcurationDto {
  state?: number;
  description?: string;
  documents?: string;
  procurator?: number;
  client?: number;
  entity?: number;
  limit_date?: string;
  limit_hour?: string;
  priority?: number;
  nt_number?: number;
  finalized?: string;
  user_finalized?: number;
}

export interface UpdateCommentDto {
  comment?: string;
  state?: number;
}

// Filtros
export interface ProcurationFilters {
  state?: number;
  states?: number[];
  recurrence?: number;
  procurators?: number[];
  init_date?: string;
  end_date?: string;
  client?: number;
  applicant?: number;
  entity?: number;
  procurator?: number;
  page?: number;
  limit?: number;
}

// Respuestas
export interface ProcurationsResponse {
  data: Procuration[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface CommentsResponse {
  data: Comment[];
}

export interface StatisticsResponse {
  pendings: number;
  rejected: number;
  finalized: number;
  suspend: number;
}

// Para crear/editar datos maestros
export interface CreateClientDto {
  code: string;
  name: string;
}

export interface CreateEntityDto {
  name: string;
}

export interface CreateRecurrenceDto {
  lapse: string;
}

export interface CreateStateDto {
  name: string;
}
