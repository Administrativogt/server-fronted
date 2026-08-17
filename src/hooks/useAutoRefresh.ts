// src/hooks/useAutoRefresh.ts
// Refresco automático para listados "en vivo" (pedido de mensajería 2026-08-17:
// ver los envíos que van ingresando sin recargar la aplicación).
// Ejecuta el callback cada `intervalMs` mientras la pestaña esté visible y
// también al volver a la pestaña. El callback debe ser un refresh silencioso
// (sin spinner) para no interrumpir al usuario.
import { useEffect, useRef } from 'react';

const useAutoRefresh = (callback: () => void, intervalMs = 30_000) => {
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  useEffect(() => {
    const id = setInterval(() => {
      if (!document.hidden) callbackRef.current();
    }, intervalMs);
    const onVisibilityChange = () => {
      if (!document.hidden) callbackRef.current();
    };
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [intervalMs]);
};

export default useAutoRefresh;
