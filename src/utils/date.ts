/**
 * Formatea una fecha "YYYY-MM-DD" (o ISO con hora) como "DD/MM/YYYY" sin pasar
 * por `new Date()`, que interpreta la fecha como medianoche UTC y la corre un
 * día atrás en Guatemala (UTC-6).
 */
export function formatDateGT(value: string | null | undefined): string {
  if (!value) return '—';
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (!match) return value;
  const [, year, month, day] = match;
  return `${Number(day)}/${Number(month)}/${year}`;
}
