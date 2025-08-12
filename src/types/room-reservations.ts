// src/types/room-reservations.ts
export type ReservationState = 0 | 1 | 2; // 0=pending, 1=accepted, 2=rejected


export interface RoomRef { id: number; name?: string }
export interface UserRef { id: number; first_name?: string; last_name?: string }

export interface CreateRoomReservationPayload {
  state: ReservationState;              // POST: 'pending'
  meeting_type: string;                 // p.ej. 'team_meeting' | 'client_call'
  creation_date: string;                // ISO
  reservation_date: string;             // 'YYYY-MM-DD'
  init_hour: string;                    // 'HH:mm'
  end_hour: string;                     // 'HH:mm'
  reason: string;
  participants: number;
  participants_emails: string[];
  use_computer: boolean;
  user_projector: boolean;              // nombre exacto del backend
  reminder_sended: boolean;
  covid_form_sended: boolean;
  use_meeting_owl: boolean;
  is_shared_cost: boolean;
  shared_with?: number[];               // requerido si is_shared_cost = true
  room_id: number;
}

export type UpdateRoomReservationPayload = Partial<
  Omit<CreateRoomReservationPayload, 'creation_date' | 'state'>
>;

export interface RoomReservation {
  id: number;
  state: ReservationState;
  meeting_type: string;
  creation_date: string;
  reservation_date: string;
  init_hour: string;
  end_hour: string;
  reason: string;
  participants: number;
  participants_emails: string[];
  use_computer: boolean;
  user_projector: boolean;
  reject_reason: string | null;
  reminder_sended: boolean;
  resources: number[] | null;
  delete_hour: string | null;
  delete_reason: string | null;
  request_user_id: number;
  room_id: number;
  user_id: number;
  user_deletes_id: number | null;
  covid_form_sended: boolean;
  use_meeting_owl: boolean;
  is_shared_cost: boolean;
  shared_with: number[] | null;
  room?: RoomRef;
  user?: UserRef;
}

export interface MonthReservationRow {
  id: number;
  reservation_date: string; // 'YYYY-MM-DD'
  init_hour: string;        // 'HH:mm'
  end_hour: string;         // 'HH:mm'
  room_id: number;
  state: ReservationState;  // strings
}
