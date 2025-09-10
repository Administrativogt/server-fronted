import api from "./axios";

export interface NotificationDto {
  id: number;
  receptionDatetime: string;
  cedule: string;
  expedientNum: string;
  directedTo: string;
  provenience?: { name?: string } | null;
  hall?: { name?: string } | null;
  recepReceives?: { first_name?: string; last_name?: string } | null;
}

export async function fetchPendingNotifications(): Promise<NotificationDto[]> {
  const { data } = await api.get('/notifications/pending');
  return data;
}

export interface DeliverNotificationsPayload {
  ids: number[];
  action: 1 | 2; // 1=entregar / 2=re-entregar
  deliverTo: number; // notificaciones siempre a user id
}

export async function deliverNotifications(payload: DeliverNotificationsPayload) {
  const { data } = await api.patch('/notifications/deliver', payload);
  return data;
}

export interface CreateNotificationPayload {
  creator: number;
  provenience?: number;
  creationPlace: number;
  otherProvenience?: string;
  hall?: number;
  cedule: string;
  expedientNum: string;
  directedTo: string;
  recepReceives: number;
  deliveryDatetime?: string;
  recepDelivery?: number;
  deliverTo?: number;
  deleteReason?: string;
  returned?: boolean;
  selectedAction?: boolean;
}

export async function createNotification(payload: CreateNotificationPayload) {
  const { data } = await api.post('/notifications', payload);
  return data;
}

