// src/api/comentarios.ts
import axios from './axios';

export interface Comentario {
  id: number;
  encargo_id: number;
  user_id: number;
  text: string;
  created_at: string;
  updated_at: string;
  // Opcional: si el backend devuelve nombre del usuario
  user_nombre?: string;
}



export const createComentario = (encargo_id: number, text: string) =>
  axios.post<Comentario>('/api/comentarios', { encargo_id, text });

export const getComentariosByEncargo = (encargo_id: number) =>
  axios.get<Comentario[]>(`/api/comentarios/encargo/${encargo_id}`);

export const deleteComentario = (id: number) =>
  axios.delete(`/api/comentarios/${id}`);