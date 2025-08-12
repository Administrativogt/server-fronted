// src/services/roomReservations.ts
import api from '../api/axios'; // ajusta la ruta si tu árbol difiere
import type {
  CreateRoomReservationPayload,
  UpdateRoomReservationPayload,
  RoomReservation,
  MonthReservationRow,
  ReservationState,
} from '../types/room-reservations';

export const ReservationsAPI = {
  // Público
  findByMonth(year: number, month: number) {
    return api.get<MonthReservationRow[]>(`/room-reservations/fast/month/${year}/${month}`)
      .then(r => r.data);
  },

  // Autenticado
  list() {
    return api.get<RoomReservation[]>(`/room-reservations`).then(r => r.data);
  },

  get(id: number) {
    return api.get<RoomReservation>(`/room-reservations/${id}`).then(r => r.data);
  },

  create(payload: CreateRoomReservationPayload) {
    return api.post<RoomReservation>(`/room-reservations`, payload).then(r => r.data);
  },

  update(id: number, payload: UpdateRoomReservationPayload) {
    return api.patch<RoomReservation>(`/room-reservations/${id}`, payload).then(r => r.data);
  },

  accept(id: number) {
    return api.patch<{ id: number; state: ReservationState }>(`/room-reservations/${id}/accept`, {})
      .then(r => r.data);
  },

  reject(id: number, reject_reason: string) {
    return api.patch<{ id: number; state: ReservationState; reject_reason: string }>(
      `/room-reservations/${id}/reject`,
      { reject_reason }
    ).then(r => r.data);
  },

  remove(id: number, delete_reason: string) {
    return api.delete(`/room-reservations/${id}`, { data: { delete_reason } });
  },

  // Auxiliares
  getTeamUsers() {
    return api.get<string[]>(`/room-reservations/team/users`).then(r => r.data);
  },

  getMyPermissions() {
    return api.get<string[]>(`/users/me/permissions`).then(r => r.data);
  },
};
