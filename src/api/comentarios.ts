// src/api/comentarios.ts
import axios from './axios';
import type { Comentario } from '../types/comentario';

export type { Comentario };

export const createComentario = (encargo_id: number, text: string) =>
  axios.post<Comentario>('/api/comentarios', { encargo_id, text });

export const getComentariosByEncargo = (encargo_id: number) =>
  axios.get<Comentario[]>(`/api/comentarios/encargo/${encargo_id}`);

export const deleteComentario = (id: number) =>
  axios.delete(`/api/comentarios/${id}`);