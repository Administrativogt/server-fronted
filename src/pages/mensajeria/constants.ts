// src/pages/mensajeria/constants.ts
// Vocabulario compartido del módulo de mensajería. Única fuente de verdad para
// estados, prioridades y formateo de fechas/horarios (antes duplicado en 4 páginas
// con divergencias — p. ej. estado 8 era 'purple' en unas y 'cyan' en otras).
import type { Encargo } from '../../types/encargo';

export const ESTADOS: Record<number, { label: string; color: string }> = {
  1: { label: 'Pendiente', color: 'orange' },
  2: { label: 'En proceso', color: 'blue' },
  3: { label: 'Entregado', color: 'green' },
  4: { label: 'No entregado', color: 'red' },
  5: { label: 'Extraordinario', color: 'volcano' },
  6: { label: 'Anulado', color: 'default' },
  7: { label: 'Rechazado', color: 'magenta' },
  8: { label: 'Extra Entregado', color: 'purple' },
};

export const PRIORIDADES: Record<number, string> = {
  1: 'A',
  2: 'B',
  3: 'C',
  4: 'D',
};

// Texto de prioridad como lo mostraba el Django viejo en Envíos Pendientes
export const PRIORIDADES_TEXTO: Record<number, string> = {
  1: 'Alta',
  2: 'Media',
  3: 'Baja',
  4: 'Villa Nueva',
};

/** "2026-07-20T00:00:00" → "2026-07-20"; nulos/vacíos → "—" */
export const formatFecha = (date?: string | null): string =>
  date ? date.split('T')[0] : '—';

/** "09:30:00" → "09:30" */
export const formatHora = (hora?: string | null): string =>
  hora ? hora.slice(0, 5) : '';

/**
 * Restricción de horario de entrega legible, según prioridad_hora:
 * 2 = antes de, 3 = después de, 4 = entre. 1 = sin restricción → null.
 */
export const formatHorario = (encargo: Encargo): string | null => {
  const min = formatHora(encargo.hora_minima);
  const max = formatHora(encargo.hora_maxima);
  switch (encargo.prioridad_hora) {
    case 2:
      return min ? `Antes de ${min}` : null;
    case 3:
      return min ? `Después de ${min}` : null;
    case 4:
      if (min && max) return `Entre ${min} y ${max}`;
      return min ? `Desde ${min}` : null;
    default:
      return null;
  }
};

/** ¿El encargo tiene información adicional que mostrar en la fila expandida? */
export const hasDetalles = (encargo: Encargo): boolean =>
  Boolean(
    encargo.observaciones ||
      encargo.razon_extra ||
      encargo.razon_rechazo ||
      encargo.incidencias ||
      encargo.reclamo ||
      encargo.razon_tardanza,
  );

/**
 * Descarga el blob de una respuesta Axios como archivo, usando el nombre del
 * header Content-Disposition si existe (antes duplicado en 3 páginas).
 */
export const saveExcelResponse = (
  response: { data: BlobPart; headers: Record<string, any> },
  fallbackFilename: string,
): void => {
  const contentDisposition = response.headers['content-disposition'];
  let filename = fallbackFilename;
  if (contentDisposition) {
    const match = contentDisposition.match(/filename="?([^";]+)"?/);
    if (match) filename = match[1];
  }
  const url = window.URL.createObjectURL(new Blob([response.data]));
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
};
