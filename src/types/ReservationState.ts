// Constante con los valores
export const ReservationStateValues = {
  Pending: 0,
  Approved: 1,
  Rejected: 2,
} as const;

// Tipo unión de los valores 0 | 1 | 2
export type ReservationState = typeof ReservationStateValues[keyof typeof ReservationStateValues];

// (Opcional) Etiquetas para mostrar texto
export const ReservationStateLabels: Record<ReservationState, string> = {
  [ReservationStateValues.Pending]:  'Pendiente',
  [ReservationStateValues.Approved]: 'Aceptada',
  [ReservationStateValues.Rejected]: 'Rechazada',
};
