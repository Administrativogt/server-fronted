// src/types/encargo.ts

export interface Usuario {
  id: number;
  username?: string;
  first_name: string;
  last_name: string;
  tipo_usuario: number;
  email?: string;
}

export interface Municipio {
  id: number;
  nombre: string;
  exception: boolean;
}

export interface TipoSolicitud {
  id: number;
  nombre: string;
  estado: number;
}

export interface EncargoFormValues {
  tipo_solicitud_id: number;
  mensajeria_enviada: string;
  empresa: string;
  destinatario: string;
  solicitante_id: number;
  direccion: string;
  zona: number;
  municipio_id: number;
  fecha_realizacion: string; // "YYYY-MM-DD"
  prioridad: number; // 1, 2, 3, 4
  prioridad_hora: number; // 1, 2, 3, 4
  observaciones?: string;
  hora_minima?: string; // "HH:mm:ss"
  hora_maxima?: string; // "HH:mm:ss"
  mensajero_id?: number;
}

// Estructura real que devuelve el backend
export interface Encargo {
  id: number;
  estado: number; // 1 = pendiente, 2 = en proceso, etc.
  prioridad: number;
  prioridad_hora: number;
  mensajeria_enviada: string;
  empresa: string;
  destinatario: string;
  direccion: string;
  zona: number;
  fecha_realizacion: string;
  fecha_creacion: string;
  fecha_entrega?: string;
  hora_minima?: string;
  hora_maxima?: string;
  observaciones?: string;
  razon_rechazo?: string;
  incidencias?: string;
  reclamo?: string;
  razon_tardanza?: string;
  // Relaciones como objetos
  solicitante: Usuario;
  mensajero?: Usuario;
  municipio: Municipio;
  tipo_solicitud: TipoSolicitud;
  usuario_creador: Usuario;
}
