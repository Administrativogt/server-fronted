// src/types/comentario.ts
export interface Comentario {
  id: number;
  encargo_id?: number;
  user_id?: number;
  text: string;
  datetime: string; // ✅ Cambiado de created_at a datetime (NestJS)
  user?: {
    id: number;
    username: string;
    first_name: string;
    last_name: string;
  };
}