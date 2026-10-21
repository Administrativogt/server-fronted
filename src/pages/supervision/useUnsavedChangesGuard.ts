import { useContext, useEffect, type MutableRefObject } from 'react';
import { UNSAFE_NavigationContext } from 'react-router-dom';
import { App } from 'antd';

/**
 * Pide confirmación antes de navegar dentro de la app (menú lateral, "Volver",
 * enlaces) si hay cambios sin guardar. La app usa BrowserRouter, que no soporta
 * useBlocker, así que se envuelven navigator.push/replace. Se lee un ref (no
 * estado) para que un navigate justo después de guardar no pida confirmación.
 */
export function useUnsavedChangesGuard(dirtyRef: MutableRefObject<boolean>) {
  const { navigator } = useContext(UNSAFE_NavigationContext);
  const { modal } = App.useApp();

  useEffect(() => {
    const { push, replace } = navigator;
    const guard =
      (go: typeof push): typeof push =>
      (...args) => {
        if (!dirtyRef.current) return go.apply(navigator, args);
        modal.confirm({
          title: '¿Salir sin guardar?',
          content: 'Los cambios de esta revisión se van a perder.',
          okText: 'Salir sin guardar',
          okButtonProps: { danger: true },
          cancelText: 'Seguir editando',
          onOk: () => {
            dirtyRef.current = false;
            go.apply(navigator, args);
          },
        });
      };
    navigator.push = guard(push);
    navigator.replace = guard(replace);
    return () => {
      navigator.push = push;
      navigator.replace = replace;
    };
  }, [navigator, modal, dirtyRef]);
}
