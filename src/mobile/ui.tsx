// Piezas compartidas de la app Android: hoja inferior, estados, skeletons y
// deslizar-para-actualizar. Todo sobre los tokens de mobile.css.
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Button, Drawer } from 'antd';
import { ReloadOutlined, SearchOutlined, WarningOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';

/**
 * El botón "atrás" de Android hace history.back() en el WebView: al abrir una
 * hoja se apila una entrada y al llegar el popstate se cierra, en vez de
 * salir de la pantalla.
 */
function useBackClose(open: boolean, onClose: () => void) {
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    const marker = { mSheet: Date.now() };
    window.history.pushState(marker, '');
    let poppedByBack = false;
    const onPop = () => {
      poppedByBack = true;
      onCloseRef.current();
    };
    window.addEventListener('popstate', onPop);
    return () => {
      window.removeEventListener('popstate', onPop);
      // Cerrada desde la UI: retirar la entrada que apilamos.
      if (!poppedByBack && window.history.state?.mSheet === marker.mSheet) window.history.back();
    };
  }, [open]);
}

export function Sheet({
  open,
  onClose,
  title,
  children,
  footer,
  tall,
}: {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  tall?: boolean;
}) {
  useBackClose(open, onClose);
  return (
    <Drawer
      open={open}
      onClose={onClose}
      placement="bottom"
      height={tall ? '92%' : 'auto'}
      closable={false}
      rootClassName="m-sheet"
      title={
        <>
          <div className="m-sheet-handle" />
          {title}
        </>
      }
      footer={footer}
      styles={{ wrapper: tall ? undefined : { maxHeight: '92%' } }}
      destroyOnHidden
    >
      {children}
    </Drawer>
  );
}

export function EmptyState({ icon, title, text, action }: { icon: ReactNode; title: string; text: string; action?: ReactNode }) {
  return (
    <div className="m-state">
      <div className="m-state-icon">{icon}</div>
      <h3>{title}</h3>
      <p>{text}</p>
      {action}
    </div>
  );
}

export function ErrorState({ text, onRetry }: { text: string; onRetry: () => void }) {
  return (
    <div className="m-state">
      <div className="m-state-icon danger">
        <WarningOutlined />
      </div>
      <h3>No se pudo cargar</h3>
      <p>{text}</p>
      <Button icon={<ReloadOutlined />} onClick={onRetry}>
        Reintentar
      </Button>
    </div>
  );
}

export function SkeletonList({ rows = 3, withDate }: { rows?: number; withDate?: boolean }) {
  return (
    <div className="m-list" aria-busy="true" aria-label="Cargando">
      {Array.from({ length: rows }, (_, i) => (
        <div className="m-item" key={i}>
          {withDate && <div className="m-skel" style={{ width: 48, height: 50, borderRadius: 10 }} />}
          <div className="m-item-body">
            <div className="m-skel" style={{ width: '62%', height: 15 }} />
            <div className="m-skel" style={{ width: '42%', height: 12, marginTop: 9 }} />
            <div className="m-skel" style={{ width: '30%', height: 12, marginTop: 7 }} />
          </div>
        </div>
      ))}
    </div>
  );
}

export function Pill({ tone, children }: { tone: 'warning' | 'success' | 'danger' | 'neutral'; children: ReactNode }) {
  return <span className={`m-pill ${tone}`}>{children}</span>;
}

export function DateBlock({ date }: { date: string }) {
  const d = dayjs(date);
  return (
    <div className="m-date" aria-hidden="true">
      <b>{d.format('D')}</b>
      <span>{d.format('MMM').replace('.', '')}</span>
    </div>
  );
}

/** Campo de búsqueda con debounce: avisa `onSearch` 350 ms después de escribir. */
export function SearchField({ placeholder, onSearch }: { placeholder: string; onSearch: (q: string) => void }) {
  const cb = useRef(onSearch);
  cb.current = onSearch;
  const [q, setQ] = useState('');
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    const t = window.setTimeout(() => cb.current(q.trim()), 350);
    return () => window.clearTimeout(t);
  }, [q]);
  return (
    <label className="m-search">
      <SearchOutlined />
      <input
        className="m-input"
        type="search"
        inputMode="search"
        enterKeyHint="search"
        placeholder={placeholder}
        aria-label={placeholder}
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />
    </label>
  );
}
