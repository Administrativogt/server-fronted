// src/types/room-reservations.ts
export type ReservationState = 0 | 1 | 2 | 3; // 0=pending, 1=accepted, 2=rejected, 3=canceled

export type RecurrencePattern = 'daily' | 'weekly' | 'biweekly' | 'monthly';

export interface RecurringSummary {
  message?: string;
  created_count: number;
  failed_dates: string[];
}

export interface RoomRef {
  id: number;
  name?: string;
  email?: string; // Email del encargado de la sala
}

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
  user_id?: number;                     // Usuario para quien se hace la reserva

  // ===== CAMPOS DE RECURRENCIA =====
  is_recurring?: boolean;               // Indica si es recurrente
  recurrence_pattern?: RecurrencePattern; // Patrón de recurrencia
  recurrence_end_date?: string;         // 'YYYY-MM-DD' - Fecha fin de recurrencia
  parent_reservation_id?: number;       // ID de la reserva padre (si es instancia recurrente)
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

  // ===== CAMPOS DE RECURRENCIA =====
  is_recurring?: boolean;
  recurrence_pattern?: RecurrencePattern;
  recurrence_end_date?: string | null;
  parent_reservation_id?: number | null;
  recurring_instances?: RoomReservation[]; // Instancias hijas si es reserva padre
  recurring_summary?: RecurringSummary;
}

export interface MonthReservationRow {
  id: number;
  reservation_date: string; // 'YYYY-MM-DD'
  init_hour: string;        // 'HH:mm'
  end_hour: string;         // 'HH:mm'
  room_id: number;
  state: ReservationState;  // strings
}
