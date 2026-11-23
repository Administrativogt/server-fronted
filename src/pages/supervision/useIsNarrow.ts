import { useSyncExternalStore } from 'react';

const QUERY = '(max-width: 767px)';

const subscribe = (cb: () => void) => {
  const mq = window.matchMedia(QUERY);
  mq.addEventListener('change', cb);
  return () => mq.removeEventListener('change', cb);
};

/** true en teléfonos (< 768 px). Lectura síncrona: sin parpadeo de la vista de escritorio. */
export function useIsNarrow(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(QUERY).matches,
    () => false,
  );
}
