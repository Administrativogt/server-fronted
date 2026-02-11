// Constante con los valores
export const ReservationStateValues = {
  Pending: 0,
  Approved: 1,
  Rejected: 2,
  Canceled: 3,
} as const;

// Tipo unión de los valores 0 | 1 | 2 | 3
export type ReservationState = typeof ReservationStateValues[keyof typeof ReservationStateValues];

// Etiquetas para mostrar texto
export const ReservationStateLabels: Record<ReservationState, string> = {
  [ReservationStateValues.Pending]:  'Pendiente',
  [ReservationStateValues.Approved]: 'Aceptada',
  [ReservationStateValues.Rejected]: 'Rechazada',
  [ReservationStateValues.Canceled]: 'Cancelada',
};

// Colores para los estados
export const ReservationStateColors: Record<ReservationState, string> = {
  [ReservationStateValues.Pending]:  'gold',
  [ReservationStateValues.Approved]: 'green',
  [ReservationStateValues.Rejected]: 'red',
  [ReservationStateValues.Canceled]: 'default',
};

// Patrones de recurrencia
export const RecurrencePatternLabels: Record<string, string> = {
  daily: 'Diaria',
  weekly: 'Semanal',
  biweekly: 'Quincenal',
  monthly: 'Mensual',
};
