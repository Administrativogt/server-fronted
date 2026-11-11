import type { ReactNode } from 'react';
import { formatPuntaje, nivelPuntaje, type SupervisionTipo } from '../../api/supervision';

const NIVEL_CLASS = { success: 'is-ok', warning: 'is-mid', error: 'is-bad', default: 'is-none' } as const;
const NIVEL_LABEL = { success: 'bueno', warning: 'a mejorar', error: 'deficiente', default: 'sin calificar' } as const;

/** Puntaje con relleno sólido de semáforo (verde / ámbar / rojo). Requiere supervision.css. */
export function ScorePill({
  tipo,
  puntaje,
  children,
}: {
  tipo: SupervisionTipo;
  puntaje: number | null | undefined;
  children?: ReactNode;
}) {
  const nivel = nivelPuntaje(tipo, puntaje);
  return (
    <span className={`sv-score ${NIVEL_CLASS[nivel]}`} title={`Nivel: ${NIVEL_LABEL[nivel]}`}>
      {children ?? formatPuntaje(tipo, puntaje)}
    </span>
  );
}
