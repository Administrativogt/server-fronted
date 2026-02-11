import api from "./axios";
import type { User } from "../types/user.types";

//
// Tipos de datos
//

/** Referencia corta a un usuario (como viene en relaciones de la API) */
export interface UserRef {
  id: number;
  first_name?: string;
  last_name?: string;
  email?: string;
}

export interface HallDto {
  id: number;
  name: string;
}

export interface ProvenienceDto {
  id: number;
  name: string;
  halls?: HallDto[];
}

export interface PlaceDto {
  id: number;
  name: string;
}

/** Estados de notificaciones */
export const NOTIFICATION_STATES = {
  PENDING: 1,
  DELIVERED: 2,
  FINALIZED: 3,
  DELETED: 4,
} as const;

export interface NotificationDto {
  id: number;
  state: number;
  receptionDatetime: string;
  cedule: string;
  expedientNum: string;
  directedTo: string;
  otherProvenience?: string | null;
  send?: boolean;
  reminderSended?: boolean;
  deleteReason?: string | null;
  returned?: boolean;
  selectedAction?: boolean;
  deliveryDatetime?: string | null;
  provenience?: { id: number; name?: string } | null;
  hall?: { id: number; name?: string } | null;
  creationPlace?: PlaceDto | null;
  creator?: UserRef | null;
  recepReceives?: UserRef | null;
  deliverTo?: UserRef | null;
  recepDelivery?: UserRef | null;
}

//
// Crear notificación
//
export interface CreateNotificationPayload {
  creator: number;
  creationPlace: number;
  provenience?: number;
  hall?: number;
  otherProvenience?: string;
  cedule: string;
  expedientNum: string;
  directedTo: string;
  recepReceives: number;
  deliveryDatetime?: string;
  recepDelivery?: number;
  deliverTo?: number;
  receptionDatetime?: string;
  deleteReason?: string;
}

export async function createNotification(payload: CreateNotificationPayload) {
  const { data } = await api.post("/notifications", payload);
  return data as NotificationDto;
}

//
// Listar pendientes
//
export async function fetchPendingNotifications(): Promise<NotificationDto[]> {
  const { data } = await api.get("/notifications/pending");
  return data;
}

//
// Listar entregadas
//
export async function fetchDeliveredNotifications(params?: { sameMonth?: string }): Promise<NotificationDto[]> {
  const { data } = await api.get("/notifications/delivered", { params });
  return data;
}

//
// Filtrar notificaciones
//
export async function filterNotifications(filters?: Record<string, unknown>): Promise<NotificationDto[]> {
  const { data } = await api.get("/notifications/filter", { params: filters });
  return data;
}

//
// Obtener una notificación
//
export async function fetchNotificationById(id: number): Promise<NotificationDto> {
  const { data } = await api.get(`/notifications/${id}`);
  return data;
}

//
// Actualizar notificación
//
export async function updateNotification(id: number, payload: Partial<NotificationDto> & { removeProvenience?: boolean }) {
  const { data } = await api.patch(`/notifications/${id}`, payload);
  return data as NotificationDto;
}

//
// Entregar / Re-entregar
//
export interface DeliverNotificationsPayload {
  ids: number[];
  action: 1 | 2; // 1=entregar, 2=re-entregar
  deliverTo: number;
}

export async function deliverNotifications(payload: DeliverNotificationsPayload) {
  const { ids, action, deliverTo } = payload;
  const { data } = await api.patch(`/notifications/deliver/${action}`, {
    notificationIds: ids,
    deliverTo,
  });
  return data;
}

//
// Acciones: aceptar/rechazar/seleccionar
//
export async function applyActionToNotifications(action: 1 | 2 | 3, ids: number[]) {
  const encoded = btoa(JSON.stringify(ids));
  const { data } = await api.patch("/notifications/actions", {}, {
    params: { action, notifications: encoded },
  });
  return data;
}

//
// Selección parcial: aceptar unos, rechazar otros
//
export async function applySelectedNotifications(acceptedIds: number[], rejectedIds: number[]) {
  const acc = btoa(JSON.stringify(acceptedIds));
  const rej = btoa(JSON.stringify(rejectedIds));
  const { data } = await api.patch("/notifications/actions/selected", {}, {
    params: { notificationsAccepted: acc, notificationsRejected: rej },
  });
  return data;
}

//
// Exportar a Excel
//
export async function exportNotificationsExcel(fecha?: string): Promise<Blob> {
  const { data } = await api.get("/notifications/export/excel", {
    params: { fecha },
    responseType: "blob",
  });
  return data;
}

//
// Catálogos
//
export async function fetchHalls(): Promise<HallDto[]> {
  const { data } = await api.get("/notifications/halls");
  return data;
}

export async function fetchProveniences(): Promise<ProvenienceDto[]> {
  const { data } = await api.get("/notifications/proveniences");
  return data;
}

export async function fetchPlaces(): Promise<PlaceDto[]> {
  const { data } = await api.get("/notifications/places");
  return data;
}

//
// Salas por entidad
//
export async function fetchHallsByProvenience(provenienceId: number): Promise<HallDto[]> {
  const { data } = await api.get("/notifications/halls", {
    params: { provenienceId },
  });
  return data;
}

//
// Crear entidad y sala
//
export interface CreateProveniencePayload {
  name: string;
  halls?: number[];
  hallName?: string;
}

export async function createProvenience(payload: CreateProveniencePayload): Promise<ProvenienceDto> {
  const { data } = await api.post("/notifications/proveniences", payload);
  return data;
}

export async function createHallForProvenience(payload: { provenienceId: number; name: string }): Promise<HallDto> {
  const { data } = await api.post("/notifications/halls", payload);
  return data;
}

//
// Obtener lista de usuarios activos (para dropdowns de recepReceives, deliverTo, etc.)
//
export async function fetchUsers(): Promise<User[]> {
  const { data } = await api.get("/users");
  return data;
}
