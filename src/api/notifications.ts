import api from "./axios";

//
// 📌 Tipos de datos compartidos
//
 export interface NotificationDto {
  id: number;
  receptionDatetime: string;
  cedule: string;
  expedientNum: string;
  directedTo: string;
  provenience?: { id: number; name?: string } | null;
  otherProvenience?: string; // ✅ ← Agregar esto
  hall?: { id: number; name?: string } | null;
  recepReceives?: { id: number; first_name?: string; last_name?: string } | null;
  deliverTo?: { id: number; first_name?: string; last_name?: string; email?: string } | null;
  recepDelivery?: { id: number; first_name?: string; last_name?: string } | null;
  state?: number;
  creationPlace?: number;
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

//
// 📌 Crear notificación
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
}

export async function createNotification(payload: CreateNotificationPayload) {
  const { data } = await api.post("/notifications", payload);
  return data as NotificationDto;
}

//
// 📌 Listar pendientes
//
export async function fetchPendingNotifications(): Promise<NotificationDto[]> {
  const { data } = await api.get("/notifications/pending");
  return data;
}

//
// 📌 Listar entregadas con filtros
//
export async function fetchDeliveredNotifications(filters?: Record<string, unknown>) {
  const { data } = await api.get("/notifications/filter", { params: filters });
  return data as NotificationDto[];
}

//
// 📌 Entregar / Re-entregar
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
// 📌 Acciones: aceptar/rechazar/seleccionar
//
export async function applyActionToNotifications(action: 1 | 2 | 3, ids: number[]) {
  const encoded = btoa(JSON.stringify(ids));
  const { data } = await api.patch("/notifications/actions", null, {
    params: { action, notifications: encoded },
  });
  return data;
}

//
// 📌 Catálogos
//
export async function fetchHalls(): Promise<HallDto[]> {
  const { data } = await api.get("/notifications/halls");
  return data;
}

export async function fetchProveniences(): Promise<ProvenienceDto[]> {
  const { data } = await api.get("/notifications/proveniences");
  return data;
}

export async function fetchPlaces(): Promise<{ id: number; name: string }[]> {
  const { data } = await api.get("/notifications/places");
  return data;
}

//
// 📌 Salas por entidad
//
export async function fetchHallsByProvenience(provenienceId: number): Promise<HallDto[]> {
  const { data } = await api.get("/notifications/halls", {
    params: { provenienceId },
  });
  return data;
}

//
// 📌 Crear entidad y sala
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



// 📌 Obtener lista de receptores (alternativa)
export async function fetchReceivers(): Promise<{ id: number; first_name: string; last_name: string }[]> {
  // Puedes usar el endpoint de usuarios o crear uno específico
  const { data } = await api.get("/users?role=receiver"); // Ajusta según tu API
  return data;
}
