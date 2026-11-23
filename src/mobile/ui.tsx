// Piezas compartidas de la app Android: hoja inferior, estados, skeletons y
// deslizar-para-actualizar. Todo sobre los tokens de mobile.css.
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Button, Drawer } from 'antd';
import { CloseOutlined, ReloadOutlined, SearchOutlined, WarningOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';

/**
 * El botón "atrás" de Android hace history.back() en el WebView: cada hoja
 * abierta apila una entrada y el popstate cierra la de hasta arriba.
 *
 * Una sola pila para todas las hojas: al pasar de una hoja a otra (detalle →
 * Liquidar), la que se cierra hace history.back() y ese popstate llega DESPUÉS
 * de que la nueva ya se abrió. Antes lo recibía la nueva y se cerraba sola.
 * Ahora esos "atrás" internos se cuentan en pendingBacks y se ignoran.
 */
type SheetEntry = { id: number; close: () => void };
const sheetStack: SheetEntry[] = [];
let pendingBacks = 0;
let popListening = false;
let nextSheetId = 1;

function ensurePopListener() {
  if (popListening) return;
  popListening = true;
  window.addEventListener('popstate', () => {
    if (pendingBacks > 0) {
      pendingBacks -= 1;
      return;
    }
    sheetStack.pop()?.close();
  });
}

function useBackClose(open: boolean, onClose: () => void) {
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    ensurePopListener();
    const entry: SheetEntry = { id: nextSheetId++, close: () => onCloseRef.current() };
    sheetStack.push(entry);
    window.history.pushState({ mSheet: entry.id }, '');
    return () => {
      const i = sheetStack.indexOf(entry);
      if (i === -1) return; // ya la cerró el botón atrás
      sheetStack.splice(i, 1);
      // Cerrada desde la UI: retirar la entrada que apilamos, sin que el
      // popstate resultante cierre otra hoja.
      if (window.history.state?.mSheet === entry.id) {
        pendingBacks += 1;
        window.history.back();
      }
    };
  }, [open]);
}

/**
 * Deslizar hacia abajo para cerrar la hoja. Se arrastra desde la cabecera
 * (barrita + título) o desde el contenido cuando ya está hasta arriba; si el
 * dedo sube o el contenido tiene scroll, se deja scrollear normal.
 */
function useSwipeToClose(open: boolean, onClose: () => void) {
  const anchorRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    let panel: HTMLElement | null = null;
    let cleanup = () => {};
    // El Drawer monta el panel en un portal un frame después de abrir
    const raf = requestAnimationFrame(() => {
      panel = anchorRef.current?.closest<HTMLElement>('.ant-drawer-content-wrapper') ?? null;
      const body = panel?.querySelector<HTMLElement>('.ant-drawer-body') ?? null;
      if (!panel) return;
      const el = panel;
      let startY = 0;
      let startT = 0;
      let dy = 0;
      let mode: 'idle' | 'maybe' | 'drag' | 'scroll' = 'idle';

      // ¿Algún contenedor entre el dedo y la hoja ya tiene scroll hacia abajo?
      const scrolledAbove = (target: EventTarget | null) => {
        for (let n = target as HTMLElement | null; n && n !== el; n = n.parentElement) {
          if (n.scrollTop > 0) return true;
        }
        return false;
      };

      const onStart = (e: TouchEvent) => {
        if (e.touches.length !== 1) return;
        startY = e.touches[0].clientY;
        startT = e.timeStamp;
        dy = 0;
        const inBody = !!body && body.contains(e.target as Node);
        mode = inBody && scrolledAbove(e.target) ? 'scroll' : 'maybe';
      };
      const onMove = (e: TouchEvent) => {
        if (mode === 'idle' || mode === 'scroll') return;
        dy = e.touches[0].clientY - startY;
        if (mode === 'maybe') {
          if (dy < -4) {
            mode = 'scroll'; // va hacia arriba: es scroll, no cierre
            return;
          }
          if (dy < 6) return;
          mode = 'drag';
          el.style.transition = 'none';
        }
        e.preventDefault();
        el.style.transform = `translateY(${Math.max(0, dy)}px)`;
      };
      const onEnd = (e: TouchEvent) => {
        if (mode === 'drag') {
          const speed = dy / Math.max(1, e.timeStamp - startT); // px/ms
          const close = dy > Math.min(140, el.offsetHeight * 0.25) || speed > 0.6;
          el.style.transition = 'transform 220ms var(--m-ease)';
          if (close) {
            el.style.transform = 'translateY(100%)';
            window.setTimeout(() => onCloseRef.current(), 160);
          } else {
            el.style.transform = '';
          }
        }
        mode = 'idle';
      };

      el.addEventListener('touchstart', onStart, { passive: true });
      el.addEventListener('touchmove', onMove, { passive: false });
      el.addEventListener('touchend', onEnd);
      el.addEventListener('touchcancel', onEnd);
      cleanup = () => {
        el.removeEventListener('touchstart', onStart);
        el.removeEventListener('touchmove', onMove);
        el.removeEventListener('touchend', onEnd);
        el.removeEventListener('touchcancel', onEnd);
        el.style.transform = '';
        el.style.transition = '';
      };
    });
    return () => {
      cancelAnimationFrame(raf);
      cleanup();
    };
  }, [open]);

  return anchorRef;
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
  const anchorRef = useSwipeToClose(open, onClose);
  return (
    <Drawer
      open={open}
      onClose={onClose}
      placement="bottom"
      height={tall ? '92%' : 'auto'}
      closable={false}
      rootClassName="m-sheet"
      title={
        <div ref={anchorRef}>
          <div className="m-sheet-handle" />
          <div className="m-sheet-titlebar">
            <span>{title}</span>
            <button type="button" className="m-sheet-close" aria-label="Cerrar" onClick={onClose}>
              <CloseOutlined />
            </button>
          </div>
        </div>
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

export function Pill({ tone, children }: { tone: 'warning' | 'success' | 'danger' | 'neutral' | 'info'; children: ReactNode }) {
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
