// src/types/comentario.ts
export interface Comentario {
  id: number;
  encargo_id: number;
  user_id: number;
  text: string;
  created_at: string;
  updated_at: string;
  user_nombre?: string;
}