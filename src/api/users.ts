import axios from './axios';
import type { CreateUserPayload, UpdateUserPayload } from '../types/user.types';

// Re-exportar para compatibilidad
export type { CreateUserPayload, UpdateUserPayload };

// ============================================
// INTERFACES
// ============================================

/**
 * Usuario simplificado (para listas y selects)
 */
export interface UserLite {
  id: number;
  username: string;
  first_name: string;
  last_name: string;
  email: string;
  estado?: number;
  tipo_usuario?: number;
  area?: {
    id: number;
    name?: string;
    nombre?: string;
  };
  equipo?: {
    id: number;
    name?: string;
    nombre?: string;
  };
}

/**
 * Helper: Obtener nombre completo de usuario
 */
export const fullName = (user: UserLite | null | undefined): string => {
  if (!user) return 'Desconocido';
  return `${user.first_name} ${user.last_name}`.trim() || user.username;
};

// ============================================
// USERS API
// ============================================

/**
 * Obtener todos los usuarios activos
 */
export const getAllUsers = () => axios.get('/users');

/** Asegura recibir un array tanto si el backend devuelve [] como { data: [] } */
function ensureUserArray(data: UserLite[] | { data?: UserLite[] } | null | undefined): UserLite[] {
  if (Array.isArray(data)) return data;
  if (data && typeof data === 'object' && Array.isArray((data as { data?: UserLite[] }).data)) {
    return (data as { data: UserLite[] }).data;
  }
  return [];
}

/**
 * Obtener lista simplificada de usuarios (alias de getAllUsers para compatibilidad)
 */
export const fetchUsers = async (): Promise<UserLite[]> => {
  const response = await axios.get<UserLite[] | { data: UserLite[] }>('/users');
  return ensureUserArray(response.data);
};

/**
 * Obtener todos los usuarios (incluidos inactivos)
 */
export const getAllUsersIncludingInactive = () => axios.get('/users/all-including-inactive');

/**
 * Obtener usuario por ID
 */
export const getUserById = (id: number) => axios.get(`/users/${id}`);

/**
 * Crear usuario
 */
export const createUser = (data: CreateUserPayload) => axios.post('/users', data);

/**
 * Actualizar usuario
 */
export const updateUser = (id: number, data: UpdateUserPayload) => axios.patch(`/users/${id}`, data);

/**
 * Desactivar usuario (soft delete)
 */
export const deactivateUser = (id: number) => axios.delete(`/users/${id}`);

/**
 * Resetear contraseña de usuario
 */
export const resetUserPassword = (id: number, newPassword: string, forceChange: boolean = false) =>
  axios.post(`/users/${id}/reset-password`, { password: newPassword, forceChange });

/**
 * Buscar usuarios por nombre/username
 */
export const searchUsers = (query: string) => axios.get(`/users/search?q=${query}`);

/**
 * Obtener solicitantes activos
 */
export const getSolicitantes = () => axios.get('/users/solicitantes');

/**
 * Obtener mensajeros activos
 */
export const getMensajeros = () => axios.get('/users/mensajeros');

// ============================================
// AREAS, EQUIPOS, GRUPOS, PERMISOS
// ============================================

/**
 * Obtener todas las áreas (retorna con campo 'nombre')
 */
export const getAreas = async () => {
  const response = await axios.get('/areas');
  // El backend puede devolver 'name' o 'nombre', normalizamos a 'nombre'
  return {
    ...response,
    data: response.data.map((item: any) => ({
      id: item.id,
      nombre: item.nombre || item.name,
      descripcion: item.descripcion || item.description,
    }))
  };
};

/**
 * Obtener todos los equipos (retorna con campo 'nombre')
 */
export const getEquipos = async () => {
  const response = await axios.get('/equipos');
  // El backend devuelve 'nombre'
  return {
    ...response,
    data: response.data.map((item: any) => ({
      id: item.id,
      nombre: item.nombre || item.name,
      descripcion: item.descripcion || item.description,
    }))
  };
};

/**
 * Obtener todos los grupos (roles)
 */
export const getGroups = () => axios.get('/groups');

/**
 * Obtener todos los permisos
 */
export const getPermissions = () => axios.get('/permissions');
