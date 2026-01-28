// src/api/procuration.ts
import api from './axios';
import type {
  Procuration,
  CreateProcurationItem,
  UpdateProcurationDto,
  ProcurationFilters,
  ProcurationsResponse,
  StatisticsResponse,
  Comment,
  CreateCommentDto,
  UpdateCommentDto,
  CommentsResponse,
  Client,
  Entity,
  Recurrence,
  ProcurationStateEntity,
  CreateClientDto,
  CreateEntityDto,
  User,
} from '../types/procuration.types';

const BASE = '/procuration-control';

// ========== PROCURACIONES ==========

/**
 * Obtener lista de procuraciones con filtros básicos
 */
export const getProcurations = async (
  filters?: ProcurationFilters
): Promise<ProcurationsResponse> => {
  const params = new URLSearchParams();

  if (filters?.state) params.append('state', filters.state.toString());
  if (filters?.recurrence) params.append('recurrence', filters.recurrence.toString());
  if (filters?.page) params.append('page', filters.page.toString());
  if (filters?.limit) params.append('limit', filters.limit.toString());

  const { data } = await api.get<ProcurationsResponse>(
    `${BASE}/procurations?${params.toString()}`
  );
  return data;
};

/**
 * Obtener una procuración por ID
 */
export const getProcurationById = async (id: number): Promise<{ data: Procuration }> => {
  const { data } = await api.get<{ data: Procuration }>(`${BASE}/procurations/${id}`);
  return data;
};

/**
 * Crear una o múltiples procuraciones
 */
export const createProcurations = async (
  procurations: CreateProcurationItem[],
  pushSupported = true
): Promise<{ message: string }> => {
  const { data } = await api.post(`${BASE}/procurations`, {
    data: JSON.stringify(procurations),
    push_supported: pushSupported.toString(),
  });
  return data;
};

/**
 * Actualizar una procuración
 */
export const updateProcuration = async (
  id: number,
  updateData: UpdateProcurationDto
): Promise<{ message: string; data: Procuration }> => {
  const { data } = await api.patch<{ message: string; data: Procuration }>(
    `${BASE}/procurations/${id}`,
    updateData
  );
  return data;
};

/**
 * Filtro avanzado de procuraciones
 */
export const getAdvancedFilter = async (
  filters: ProcurationFilters
): Promise<ProcurationsResponse> => {
  const params = new URLSearchParams();

  if (filters.state) params.append('state', filters.state.toString());
  if (filters.states && filters.states.length > 0) {
    params.append('states', JSON.stringify(filters.states));
  }
  if (filters.procurators && filters.procurators.length > 0) {
    params.append('procurators', JSON.stringify(filters.procurators));
  }
  if (filters.init_date) params.append('init_date', filters.init_date);
  if (filters.end_date) params.append('end_date', filters.end_date);
  if (filters.recurrence) params.append('recurrence', filters.recurrence.toString());
  if (filters.client) params.append('client', filters.client.toString());
  if (filters.applicant) params.append('applicant', filters.applicant.toString());
  if (filters.entity) params.append('entity', filters.entity.toString());
  if (filters.procurator) params.append('procurator', filters.procurator.toString());

  const { data } = await api.get<ProcurationsResponse>(
    `${BASE}/procurations/filter/advanced?${params.toString()}`
  );
  return data;
};

/**
 * Filtro general de procuraciones (admin)
 */
export const getGeneralFilter = async (
  filters: ProcurationFilters
): Promise<ProcurationsResponse> => {
  const params = new URLSearchParams();

  if (filters.init_date) params.append('init_date', filters.init_date);
  if (filters.end_date) params.append('end_date', filters.end_date);
  if (filters.states && filters.states.length > 0) {
    params.append('states', JSON.stringify(filters.states));
  }
  if (filters.client) params.append('client', filters.client.toString());
  if (filters.applicant) params.append('applicant', filters.applicant.toString());
  if (filters.entity) params.append('entity', filters.entity.toString());
  if (filters.procurator) params.append('procurator', filters.procurator.toString());

  const { data } = await api.get<ProcurationsResponse>(
    `${BASE}/procurations/filter/general?${params.toString()}`
  );
  return data;
};

/**
 * Obtener estadísticas de procuraciones
 */
export const getStatistics = async (): Promise<StatisticsResponse> => {
  const { data } = await api.get<StatisticsResponse>(`${BASE}/statistics`);
  return data;
};

// ========== COMENTARIOS ==========

/**
 * Obtener comentarios de una procuración
 */
export const getCommentsByProcuration = async (
  procurationId: number,
  reject?: boolean
): Promise<CommentsResponse> => {
  const params = reject !== undefined ? `?reject=${reject}` : '';
  const { data } = await api.get<CommentsResponse>(
    `${BASE}/comments/procuration/${procurationId}${params}`
  );
  return data;
};

/**
 * Crear un comentario
 */
export const createComment = async (
  commentData: CreateCommentDto
): Promise<{ message: string; data: Comment }> => {
  const { data } = await api.post<{ message: string; data: Comment }>(
    `${BASE}/comments`,
    commentData
  );
  return data;
};

/**
 * Actualizar un comentario
 */
export const updateComment = async (
  id: number,
  updateData: UpdateCommentDto
): Promise<{ message: string; data: Comment }> => {
  const { data } = await api.patch<{ message: string; data: Comment }>(
    `${BASE}/comments/${id}`,
    updateData
  );
  return data;
};

// ========== DATOS MAESTROS - CLIENTES ==========

/**
 * Obtener todos los clientes
 */
export const getClients = async (): Promise<{ data: Client[] }> => {
  const { data } = await api.get<{ data: Client[] }>(`${BASE}/master-data/clients`);
  return data;
};

/**
 * Obtener un cliente por ID
 */
export const getClientById = async (id: number): Promise<{ data: Client }> => {
  const { data } = await api.get<{ data: Client }>(`${BASE}/master-data/clients/${id}`);
  return data;
};

/**
 * Crear un cliente
 */
export const createClient = async (
  clientData: CreateClientDto
): Promise<{ message: string; data: Client }> => {
  const { data } = await api.post<{ message: string; data: Client }>(
    `${BASE}/master-data/clients`,
    clientData
  );
  return data;
};

/**
 * Actualizar un cliente
 */
export const updateClient = async (
  id: number,
  clientData: Partial<CreateClientDto>
): Promise<{ message: string; data: Client }> => {
  const { data } = await api.patch<{ message: string; data: Client }>(
    `${BASE}/master-data/clients/${id}`,
    clientData
  );
  return data;
};

/**
 * Eliminar un cliente
 */
export const deleteClient = async (id: number): Promise<{ message: string }> => {
  const { data } = await api.delete<{ message: string }>(`${BASE}/master-data/clients/${id}`);
  return data;
};

// ========== DATOS MAESTROS - ENTIDADES ==========

/**
 * Obtener todas las entidades
 */
export const getEntities = async (): Promise<{ data: Entity[] }> => {
  const { data } = await api.get<{ data: Entity[] }>(`${BASE}/master-data/entities`);
  return data;
};

/**
 * Obtener una entidad por ID
 */
export const getEntityById = async (id: number): Promise<{ data: Entity }> => {
  const { data } = await api.get<{ data: Entity }>(`${BASE}/master-data/entities/${id}`);
  return data;
};

/**
 * Crear una entidad
 */
export const createEntity = async (
  entityData: CreateEntityDto
): Promise<{ message: string; data: Entity }> => {
  const { data } = await api.post<{ message: string; data: Entity }>(
    `${BASE}/master-data/entities`,
    entityData
  );
  return data;
};

/**
 * Actualizar una entidad
 */
export const updateEntity = async (
  id: number,
  entityData: Partial<CreateEntityDto>
): Promise<{ message: string; data: Entity }> => {
  const { data } = await api.patch<{ message: string; data: Entity }>(
    `${BASE}/master-data/entities/${id}`,
    entityData
  );
  return data;
};

/**
 * Eliminar una entidad
 */
export const deleteEntity = async (id: number): Promise<{ message: string }> => {
  const { data } = await api.delete<{ message: string }>(`${BASE}/master-data/entities/${id}`);
  return data;
};

// ========== DATOS MAESTROS - RECURRENCIAS ==========

/**
 * Obtener todas las recurrencias
 */
export const getRecurrences = async (): Promise<{ data: Recurrence[] }> => {
  const { data } = await api.get<{ data: Recurrence[] }>(`${BASE}/master-data/recurrences`);
  return data;
};

/**
 * Crear una recurrencia
 */
export const createRecurrence = async (
  recurrenceData: { lapse: string }
): Promise<{ message: string; data: Recurrence }> => {
  const { data } = await api.post<{ message: string; data: Recurrence }>(
    `${BASE}/master-data/recurrences`,
    recurrenceData
  );
  return data;
};

// ========== DATOS MAESTROS - ESTADOS ==========

/**
 * Obtener todos los estados
 */
export const getStates = async (): Promise<{ data: ProcurationStateEntity[] }> => {
  const { data } = await api.get<{ data: ProcurationStateEntity[] }>(
    `${BASE}/master-data/states`
  );
  return data;
};

/**
 * Crear un estado
 */
export const createState = async (
  stateData: { name: string }
): Promise<{ message: string; data: ProcurationStateEntity }> => {
  const { data } = await api.post<{ message: string; data: ProcurationStateEntity }>(
    `${BASE}/master-data/states`,
    stateData
  );
  return data;
};

// ========== USUARIOS (para selects) ==========

/**
 * Obtener todos los usuarios
 */
export const getUsers = async (): Promise<User[]> => {
  const { data } = await api.get<User[]>('/users');
  return data;
};

/**
 * Obtener usuarios procuradores (tipo_usuario = 5)
 */
export const getProcurators = async (): Promise<{ data: User[] }> => {
  try {
    // Intenta obtener solo procuradores si el endpoint lo soporta
    const { data } = await api.get<User[]>('/users?tipo_usuario=5');
    return { data };
  } catch {
    // Si falla, obtiene todos los usuarios y filtra en el cliente
    const allUsers = await getUsers();
    // Retorna todos - el filtrado se hace en el componente si es necesario
    return { data: allUsers };
  }
};

/**
 * Obtener usuarios solicitantes
 */
export const getApplicants = async (): Promise<{ data: User[] }> => {
  const data = await getUsers();
  return { data };
};
