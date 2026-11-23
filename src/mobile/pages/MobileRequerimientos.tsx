import { useEffect, useRef, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Segmented } from 'antd';
import type { ShellContext } from '../MobileApp';
import MobileMisRequerimientos from './MobileMisRequerimientos';
import MobilePorAutorizar from './MobilePorAutorizar';

// Pestaña "Requerimientos": lo que yo pido (Míos) y lo que espera mi firma.
// Abre en "Por autorizar" cuando hay algo pendiente de mi firma.
export default function MobileRequerimientos() {
  const { toAuthorize } = useOutletContext<ShellContext>();
  const [view, setView] = useState<'mios' | 'autorizar'>(toAuthorize > 0 ? 'autorizar' : 'mios');
  const chosen = useRef(false);

  // El contador llega después del primer render: si hay pendientes y la
  // persona no ha elegido vista, se muestra "Por autorizar".
  useEffect(() => {
    if (!chosen.current && toAuthorize > 0) setView('autorizar');
  }, [toAuthorize]);

  return (
    <>
      <Segmented
        block
        style={{ marginBottom: 16 }}
        value={view}
        onChange={(v) => {
          chosen.current = true;
          setView(v as 'mios' | 'autorizar');
        }}
        options={[
          { label: 'Míos', value: 'mios' },
          { label: toAuthorize ? `Por autorizar · ${toAuthorize}` : 'Por autorizar', value: 'autorizar' },
        ]}
      />
      {view === 'mios' ? <MobileMisRequerimientos /> : <MobilePorAutorizar />}
    </>
  );
}
