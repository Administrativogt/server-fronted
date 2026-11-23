import { useEffect, useRef, useState } from 'react';
import { ReloadOutlined } from '@ant-design/icons';

/** Deslizar hacia abajo desde arriba de la página para recargar. */
export function usePullToRefresh(onRefresh: () => Promise<unknown>) {
  const [pull, setPull] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const startY = useRef<number | null>(null);
  const pullRef = useRef(0);
  const cb = useRef(onRefresh);
  cb.current = onRefresh;
  // Un solo refresco a la vez y una pausa entre refrescos: el trackpad del
  // emulador (o varios deslizamientos seguidos) generaba decenas de recargas
  // por segundo y el backend respondía 429 (límite de 100 peticiones/min).
  const busy = useRef(false);
  const lastAt = useRef(0);

  useEffect(() => {
    const THRESHOLD = 64;
    const COOLDOWN_MS = 1500;
    const onStart = (e: TouchEvent) => {
      if (busy.current || e.touches.length > 1) {
        startY.current = null;
        return;
      }
      startY.current = window.scrollY <= 0 ? e.touches[0].clientY : null;
    };
    const onMove = (e: TouchEvent) => {
      if (startY.current === null) return;
      const dy = e.touches[0].clientY - startY.current;
      pullRef.current = dy > 0 ? Math.min(dy * 0.5, 90) : 0;
      setPull(pullRef.current);
    };
    const onEnd = async () => {
      if (startY.current === null) return;
      startY.current = null;
      const reached = pullRef.current >= THRESHOLD;
      pullRef.current = 0;
      setPull(0);
      if (!reached || busy.current || Date.now() - lastAt.current < COOLDOWN_MS) return;
      busy.current = true;
      setRefreshing(true);
      try {
        await cb.current();
      } finally {
        lastAt.current = Date.now();
        busy.current = false;
        setRefreshing(false);
      }
    };
    window.addEventListener('touchstart', onStart, { passive: true });
    window.addEventListener('touchmove', onMove, { passive: true });
    window.addEventListener('touchend', onEnd);
    return () => {
      window.removeEventListener('touchstart', onStart);
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('touchend', onEnd);
    };
  }, []);

  const height = refreshing ? 48 : pull;
  const indicator = (
    <div
      className="m-ptr"
      style={{ height, transition: pull ? 'none' : 'height 200ms cubic-bezier(0.25, 1, 0.5, 1)' }}
      aria-hidden={!refreshing}
    >
      <ReloadOutlined spin={refreshing} rotate={refreshing ? 0 : pull * 4} style={{ opacity: Math.min(height / 48, 1) }} />
    </div>
  );
  return { indicator, refreshing };
}

