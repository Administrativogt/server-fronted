import { useCallback, useEffect, useId, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { LoadingOutlined, SearchOutlined, CloseCircleFilled } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import { globalSearch, type SearchGroup } from "../../api/dashboard";
import { type Tokens } from "./theme";

/* Búsqueda global del inicio (combobox ARIA).
   - Escribe ≥2 caracteres → busca con 250 ms de pausa; respuestas viejas se ignoran.
   - ↑/↓ recorren resultados, Enter abre, Esc cierra (y limpia si ya estaba cerrado).
   - ⌘K / Ctrl+K o "/" enfocan el buscador desde cualquier parte de la página.
   El backend decide qué módulos consultar y con qué alcance. */

const MIN = 2;
const isMac = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform);

type State =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ok"; q: string; groups: SearchGroup[] }
  | { status: "error" };

export default function GlobalSearch({ tk }: { tk: Tokens }) {
  const navigate = useNavigate();
  const listId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const seq = useRef(0);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<State>({ status: "idle" });
  const [active, setActive] = useState(-1);

  /* opciones navegables (las que tienen ruta) en orden visual */
  const options = useMemo(
    () => (state.status === "ok" ? state.groups.flatMap((g) => g.items.filter((i) => i.path)) : []),
    [state],
  );

  /* búsqueda con pausa */
  useEffect(() => {
    const term = q.trim();
    if (term.length < MIN) { setState({ status: "idle" }); setActive(-1); return; }
    setState({ status: "loading" });
    const mySeq = ++seq.current;
    const t = setTimeout(async () => {
      try {
        const res = await globalSearch(term);
        if (mySeq !== seq.current) return;
        setState({ status: "ok", q: res.q, groups: res.groups });
        setActive(-1);
      } catch {
        if (mySeq === seq.current) setState({ status: "error" });
      }
    }, 250);
    return () => clearTimeout(t);
  }, [q]);

  /* atajos globales */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typing = e.target instanceof HTMLElement &&
        (e.target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(e.target.tagName));
      if ((e.key === "k" || e.key === "K") && (e.metaKey || e.ctrlKey)) {
        e.preventDefault(); inputRef.current?.focus(); inputRef.current?.select(); setOpen(true);
      } else if (e.key === "/" && !typing) {
        e.preventDefault(); inputRef.current?.focus(); setOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  /* clic fuera cierra */
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => { if (!boxRef.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const go = useCallback((path: string | null) => {
    if (!path) return;
    setOpen(false);
    navigate(path);
  }, [navigate]);

  const onKeyDown = (e: ReactKeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault(); setOpen(true);
      if (options.length) setActive((a) => (a + 1) % options.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (options.length) setActive((a) => (a <= 0 ? options.length - 1 : a - 1));
    } else if (e.key === "Enter") {
      const target = options[active] ?? (options.length === 1 ? options[0] : undefined);
      if (target) { e.preventDefault(); go(target.path); }
    } else if (e.key === "Escape") {
      if (open) setOpen(false); else setQ("");
    }
  };

  const optId = (i: number) => `${listId}-opt-${i}`;
  const showPanel = open && q.trim().length > 0;
  let flatIndex = -1;

  return (
    <div ref={boxRef} style={{ position:"relative", width:"100%", maxWidth:520 }}>
      <label htmlFor={`${listId}-input`} className="sr-only" style={{ position:"absolute", width:1, height:1,
        overflow:"hidden", clip:"rect(0 0 0 0)", whiteSpace:"nowrap" }}>
        Buscar en el sistema
      </label>
      <div className="gs-field" style={{ display:"flex", alignItems:"center", gap:8, height:40, padding:"0 12px",
        background:tk.surface, border:tk.borderCss, borderRadius:8 }}>
        {state.status === "loading"
          ? <LoadingOutlined aria-hidden style={{ color:tk.t2 }} />
          : <SearchOutlined aria-hidden style={{ color:tk.t2 }} />}
        <input
          id={`${listId}-input`}
          ref={inputRef}
          role="combobox"
          aria-expanded={showPanel}
          aria-controls={`${listId}-list`}
          aria-autocomplete="list"
          aria-activedescendant={active >= 0 ? optId(active) : undefined}
          autoComplete="off"
          spellCheck={false}
          value={q}
          placeholder="Buscar cheque, NT, recibo, cliente, envío…"
          onChange={(e) => { setQ(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          style={{ flex:1, minWidth:0, border:0, outline:"none", background:"transparent",
            font:"inherit", fontSize:14, color:tk.t1 }}
        />
        {q ? (
          <button type="button" aria-label="Limpiar búsqueda" className="gs-clear"
            onClick={() => { setQ(""); inputRef.current?.focus(); }}
            style={{ border:0, background:"none", padding:0, cursor:"pointer", color:tk.t2, display:"inline-flex" }}>
            <CloseCircleFilled />
          </button>
        ) : (
          <kbd aria-hidden className="gs-kbd" style={{ fontFamily:"inherit", fontSize:12, color:tk.t2, border:tk.borderCss,
            borderRadius:4, padding:"1px 6px", background:tk.subtle }}>
            {isMac ? "⌘K" : "Ctrl K"}
          </kbd>
        )}
      </div>

      {showPanel && (
        <div id={`${listId}-list`} role="listbox" aria-label="Resultados de búsqueda"
          style={{ position:"absolute", zIndex:20, top:"calc(100% + 6px)", left:0, right:0, maxHeight:420, overflowY:"auto",
            background:tk.surface, border:tk.borderCss, borderRadius:10,
            boxShadow:"0 12px 32px rgba(15,23,42,.14), 0 2px 6px rgba(15,23,42,.06)", padding:"6px 0" }}>

          {q.trim().length < MIN && (
            <p style={{ margin:0, padding:"10px 14px", fontSize:13, color:tk.t2 }}>Escribe al menos {MIN} caracteres.</p>
          )}
          {state.status === "loading" && (
            <p style={{ margin:0, padding:"10px 14px", fontSize:13, color:tk.t2 }}>Buscando…</p>
          )}
          {state.status === "error" && (
            <p style={{ margin:0, padding:"10px 14px", fontSize:13, color:tk.t2 }}>
              No se pudo buscar. Revisa tu conexión e intenta de nuevo.
            </p>
          )}
          {state.status === "ok" && state.groups.length === 0 && (
            <div style={{ padding:"10px 14px", fontSize:13, color:tk.t2 }}>
              <div style={{ color:tk.t1, fontWeight:500 }}>Sin resultados para «{state.q}».</div>
              <div style={{ marginTop:4 }}>
                Busca por número de cheque o NT, correlativo de recibo o requerimiento, número de envío, o nombre del cliente.
              </div>
            </div>
          )}

          {state.status === "ok" && state.groups.map((g) => (
            <div key={g.key} role="group" aria-labelledby={`${listId}-${g.key}`} style={{ padding:"4px 0" }}>
              <div id={`${listId}-${g.key}`} style={{ padding:"6px 14px 4px", fontSize:12, fontWeight:600, color:tk.t2 }}>
                {g.label}
              </div>
              {g.failed && (
                <div style={{ padding:"4px 14px 8px", fontSize:13, color:tk.t2 }}>No se pudo buscar aquí. Intenta de nuevo.</div>
              )}
              {g.items.map((it) => {
                const navigable = !!it.path;
                const idx = navigable ? ++flatIndex : -1;
                const selected = navigable && idx === active;
                return (
                  <div key={`${g.key}-${it.id}`} id={navigable ? optId(idx) : undefined}
                    role="option" aria-selected={selected} aria-disabled={!navigable}
                    className="gs-opt"
                    onMouseEnter={() => navigable && setActive(idx)}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => go(it.path)}
                    style={{ padding:"8px 14px", cursor: navigable ? "pointer" : "default",
                      background: selected ? tk.accentText + "1a" : "transparent" }}>
                    <div style={{ fontSize:14, color:tk.t1, fontWeight:500, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                      {it.title}
                    </div>
                    {it.subtitle && (
                      <div className="dash-num" style={{ fontSize:12, color:tk.t2, marginTop:2, overflow:"hidden",
                        textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                        {it.subtitle}{!navigable && " · sin pantalla para abrirlo"}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}

          {state.status === "ok" && options.length > 0 && (
            <div aria-hidden style={{ padding:"8px 14px 4px", marginTop:4, borderTop:`1px solid ${tk.divider}`,
              fontSize:12, color:tk.t2 }}>
              ↑ ↓ para moverte · Enter para abrir · Esc para cerrar
            </div>
          )}
        </div>
      )}
    </div>
  );
}
