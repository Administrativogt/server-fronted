export interface Group {
  id: number;
  name: string;
}

export interface Permission {
  id: number;
  name: string;
  codename?: string;
}

export interface CreateUserPayload {
  username: string;
  password: string;
  first_name: string;
  last_name: string;
  email: string;
  employee_code?: string;
  extension?: string;
  codigo_directorio?: string;
  tipo_usuario?: number;
  equipo_id?: number;
  area_id?: number;
  jefe_id?: number;
  groupIds?: number[];
  permissionIds?: number[];
  is_superuser?: boolean;
  is_staff?: boolean;
  estado?: number;
  send_checks?: boolean;
}

export interface UpdateUserPayload {
  first_name?: string;
  last_name?: string;
  email?: string;
  employee_code?: string;
  extension?: string;
  codigo_directorio?: string;
  tipo_usuario?: number;
  equipo_id?: number;
  area_id?: number;
  jefe_id?: number;
  groupIds?: number[];
  permissionIds?: number[];
  is_superuser?: boolean;
  is_staff?: boolean;
  estado?: number;
  send_checks?: boolean;
}

export interface UserArea {
  id: number;
  nombre: string;
  descripcion?: string;
}

export interface UserEquipo {
  id: number;
  nombre: string;
  descripcion?: string;
}

export interface User {
  id: number;
  username: string;
  first_name: string;
  last_name: string;
  email: string;
  employee_code?: string;
  extension?: string;
  codigo_directorio?: string;
  tipo_usuario?: number;
  estado: number;
  is_active: boolean;
  is_superuser: boolean;
  is_staff: boolean;
  send_checks: boolean;
  cambio_contrasena: number;
  date_joined: string;
  last_login?: string;
  equipo?: UserEquipo;
  area?: UserArea;
  jefe?: User;
  groups?: Group[];
  permissions?: Permission[];
}

export const TIPOS_USUARIO = [
  { value: 1, label: 'Socio', color: 'red' },
  { value: 2, label: 'Gerencia', color: 'magenta' },
  { value: 3, label: 'Asociado', color: 'green' },
  { value: 4, label: 'Asistente', color: 'cyan' },
  { value: 5, label: 'Procurador', color: 'gold' },
  { value: 6, label: 'Secretaria', color: 'lime' },
  { value: 7, label: 'Recepcionista', color: 'geekblue' },
  { value: 8, label: 'Mensajero', color: 'blue' },
  { value: 9, label: 'Contabilidad', color: 'orange' },
  { value: 10, label: 'Personal Administrativo', color: 'purple' },
  { value: 11, label: 'Socio de Práctica', color: 'volcano' },
  { value: 12, label: 'Cliente', color: 'default' },
];

export const getTipoUsuarioLabel = (tipoId?: number): string => {
  if (!tipoId) return 'Sin asignar';
  const tipo = TIPOS_USUARIO.find(t => t.value === tipoId);
  return tipo?.label || `Tipo ${tipoId}`;
};

export const getTipoUsuarioColor = (tipoId?: number): string => {
  if (!tipoId) return 'default';
  const tipo = TIPOS_USUARIO.find(t => t.value === tipoId);
  return tipo?.color || 'default';
};

export interface UserFilters {
  search?: string;
  tipo_usuario?: number;
  equipo_id?: number;
  area_id?: number;
  estado?: number;
}
