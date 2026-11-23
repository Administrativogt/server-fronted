import type React from "react";

/* ─── fixed accent tokens (work in both themes) ──────────────────────────── */
export const PRIMARY = "#3C50E0";
export const SUCCESS = "#10B981";
export const DANGER  = "#EF4444";
export const WARNING = "#F59E0B";
export const INFO    = "#06B6D4";
export const RADIUS  = 10;

/* ─── theme-aware neutral tokens ─────────────────────────────────────────── */
export interface Tokens {
  bg: string; surface: string;
  t1: string; t2: string; t3: string;
  border: string; borderCss: string;
  divider: string; subtle: string;
  shadow: string;
  /** Índigo para TEXTO (enlaces): el #3C50E0 no llega a 4.5:1 sobre la superficie oscura. */
  accentText: string;
  isDark: boolean;
}

export function makeTokens(isDark: boolean): Tokens {
  return isDark
    ? {
        bg:"#161824", surface:"#1D1F2B",
        t1:"#ECEDF2", t2:"#A0A4B3", t3:"#6B7080",
        border:"#2C2F40", borderCss:"1px solid #2C2F40",
        divider:"#262936", subtle:"#232634",
        shadow:"0 1px 4px rgba(0,0,0,.4), 0 4px 12px rgba(0,0,0,.3)",
        accentText:"#8C9BFF",
        isDark:true,
      }
    : {
        bg:"#EFF4FB", surface:"#FFFFFF",
        t1:"#1C2434", t2:"#64748B", t3:"#94A3B8",
        border:"#E2E8F0", borderCss:"1px solid #E2E8F0",
        divider:"#F1F5F9", subtle:"#F8FAFC",
        shadow:"0 1px 4px rgba(0,0,0,.06), 0 4px 12px rgba(0,0,0,.04)",
        accentText:PRIMARY,
        isDark:false,
      };
}

export const wcard = (tk: Tokens, extra?: React.CSSProperties): React.CSSProperties => ({
  background: tk.surface, borderRadius: RADIUS, border: tk.borderCss, boxShadow: tk.shadow, ...extra,
});

/* ─── Color por módulo (inicio) ──────────────────────────────────────────────
   Orientación, no decoración: cada módulo conserva SIEMPRE el mismo color en
   el inicio (filas de Pendientes/Mis solicitudes y títulos de tarjeta), para
   reconocerlo de un vistazo. El texto y los números siguen neutros; el color
   vive en el ícono y su fondo teñido. Claro: tonos 600-700 (ícono ≥3:1 sobre
   su fondo); oscuro: tonos 300-400. */
export type HueKey =
  | "cheques" | "dinero" | "equipo" | "salas" | "notificaciones" | "documentos"
  | "nombramientos" | "sirvo" | "envios" | "tramite" | "bandeja" | "plazos" | "horas";

/* Cuatro familias, las mismas áreas del menú lateral (Finanzas, Legal,
   Operación, Personas), en tonos desaturados para no competir con los
   colores de estado. El índigo de marca queda solo para la bandeja. */
const AREA = {
  finanzas:  ["#3F7466", "#8CC7B6"],
  legal:     ["#7A5A36", "#D6B48A"],
  operacion: ["#55657C", "#AAB7C9"],
  personas:  ["#875062", "#DDA4B5"],
} as const satisfies Record<string, readonly [string, string]>;

const HUES: Record<HueKey, readonly [light: string, dark: string]> = {
  bandeja:        ["#3C50E0", "#8C9BFF"],
  cheques:        AREA.finanzas,
  dinero:         AREA.finanzas,
  sirvo:          AREA.finanzas,
  plazos:         AREA.legal,
  nombramientos:  AREA.legal,
  salas:          AREA.operacion,
  notificaciones: AREA.operacion,
  documentos:     AREA.operacion,
  envios:         AREA.operacion,
  tramite:        AREA.operacion,
  equipo:         AREA.personas,
  horas:          AREA.personas,
};

/** Color de TEXTO por urgencia (0 neutro, 1 atención, 2 urgente). Tonos
    oscuros en claro para llegar a 4.5:1 sobre blanco; claros en oscuro. */
export const sevColor = (tk: Tokens, sev: 0 | 1 | 2) =>
  sev === 2 ? (tk.isDark ? "#F87171" : "#B91C1C")
  : sev === 1 ? (tk.isDark ? "#FBBF24" : "#B45309")
  : tk.t1;

export const hue = (tk: Tokens, key: HueKey) => {
  const fg = HUES[key][tk.isDark ? 1 : 0];
  return { fg, bg: fg + (tk.isDark ? "2b" : "1a") };
};

/** Franja de bienvenida: superficie neutra (el color queda para la urgencia). */
export const bandColors = (tk: Tokens) => ({ bg: tk.surface, text: tk.t1, sub: tk.t2 });

/* ─── chart theme (Nivo) — lo usa Auditoría ──────────────────────────────── */
export const makeChartTheme = (tk: Tokens) => ({
  axis:    { ticks: { text: { fill:tk.t2, fontSize:11, fontFamily:"'Plus Jakarta Sans',sans-serif" } } },
  grid:    { line: { stroke:tk.divider } },
  tooltip: { container: { background:tk.surface, color:tk.t1, fontSize:12, fontFamily:"'Plus Jakarta Sans',sans-serif",
    border:tk.borderCss, borderRadius:8, boxShadow:tk.shadow } },
  legends: { text: { fill:tk.t2, fontFamily:"'Plus Jakarta Sans',sans-serif", fontSize:12 } },
});

/* ─── CSS (theme-aware) ──────────────────────────────────────────────────── */
export const makeCSS = (tk: Tokens) => `
@keyframes fadeUp {
  from { opacity:0; transform:translateY(14px); }
  to   { opacity:1; transform:translateY(0); }
}
.f1{animation:fadeUp .38s cubic-bezier(.22,1,.36,1) .00s both}
.f2{animation:fadeUp .38s cubic-bezier(.22,1,.36,1) .06s both}
.f3{animation:fadeUp .38s cubic-bezier(.22,1,.36,1) .12s both}
.f4{animation:fadeUp .38s cubic-bezier(.22,1,.36,1) .18s both}
.f5{animation:fadeUp .38s cubic-bezier(.22,1,.36,1) .24s both}
.f6{animation:fadeUp .38s cubic-bezier(.22,1,.36,1) .30s both}
.f7{animation:fadeUp .38s cubic-bezier(.22,1,.36,1) .36s both}
.f8{animation:fadeUp .38s cubic-bezier(.22,1,.36,1) .42s both}

@keyframes pulsedot {
  0%,100% { opacity:1; transform:scale(1); }
  50%     { opacity:.5; transform:scale(.8); }
}
.pulsedot { animation: pulsedot 1.6s ease-in-out infinite; }

.ta-card { transition: box-shadow .22s, transform .22s; }
.ta-card:hover {
  box-shadow: 0 8px 28px rgba(60,80,224,.13) !important;
  transform: translateY(-3px);
}

.refresh-btn { transition: background .18s, color .18s, border-color .18s, transform .18s; }
.refresh-btn:hover {
  background: #3C50E0 !important;
  color: #fff !important;
  border-color: #3C50E0 !important;
  transform: translateY(-1px);
}

.ta-table .ant-table {
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 13px;
  background: transparent;
}
.ta-table .ant-table-thead > tr > th {
  background: ${tk.subtle} !important;
  font-size: 11px !important;
  font-weight: 700 !important;
  text-transform: uppercase !important;
  letter-spacing: .07em !important;
  color: ${tk.t3} !important;
  border-bottom: 1px solid ${tk.border} !important;
  padding: 10px 16px !important;
}
.ta-table .ant-table-tbody > tr > td {
  border-bottom: 1px solid ${tk.divider} !important;
  padding: 10px 16px !important;
}
.ta-table .ant-table-tbody > tr:hover > td { background: ${tk.subtle} !important; }
.ta-table .ant-empty-description { color: ${tk.t3} !important; font-size: 12px; }
`;

/* ─── CSS del inicio ─────────────────────────────────────────────────────────
   Una sola entrada para toda la página (no coreografía por sección) y nada
   en bucle. Con reduced-motion no hay animación. */
export const makeDashCSS = (tk: Tokens) => `
/* Lienzo del inicio: 24-28px en escritorio, 16px en móvil (DESIGN.md: gutter 16px) */
.dash-page { padding:24px 28px 40px; }
/* Franja: superficie neutra, compacta; herramientas en una sola fila */
.dash-band { display:grid; grid-template-columns:minmax(0,1fr) minmax(300px,520px); align-items:center;
  gap:14px 24px; margin-bottom:20px; padding:20px 24px; border-radius:12px;
  border:${tk.borderCss}; box-shadow:${tk.shadow}; }
.dash-band-tools { display:flex; align-items:center; gap:8px; min-width:0; }
.dash-band-tools > :first-child { flex:1; min-width:0; max-width:none !important; }
.dash-summary { display:flex; align-items:center; flex-wrap:wrap; gap:6px 14px; margin:10px 0 0; font-size:14px; color:${tk.t2}; }
.dash-summary b { color:${tk.t1}; font-weight:600; }
.dash-dot { display:inline-block; width:8px; height:8px; border-radius:50%; margin-right:6px; vertical-align:middle; }
@media (max-width: 900px) {
  .dash-band { grid-template-columns:minmax(0,1fr); }
}
@media (max-width: 640px) {
  .dash-page { padding:16px 16px 32px; }
  .dash-band { padding:18px 16px; }
  .dash-band-tools { flex-wrap:wrap; }
  .dash-band-tools > :first-child { flex-basis:100%; }
  .dash-band-tools > .ant-dropdown-trigger { flex:1; }
}
@keyframes dashIn { from { opacity:0; transform:translateY(6px); } to { opacity:1; transform:none; } }
.dash-in { animation: dashIn .22s cubic-bezier(.22,1,.36,1) both; }

.dash-row {
  display:flex; align-items:center; gap:14px; width:100%;
  padding:14px 20px; background:transparent; border:0; border-top:1px solid ${tk.divider};
  text-align:left; cursor:pointer; font:inherit; color:${tk.t1};
  transition: background .15s;
}
.dash-row:hover { background:${tk.subtle}; }
.dash-row:focus-visible, .dash-link:focus-visible {
  outline:2px solid ${tk.accentText}; outline-offset:-2px; border-radius:6px;
}
.dash-link {
  background:none; border:0; padding:0; cursor:pointer; font:inherit;
  font-size:13px; font-weight:600; color:${tk.accentText};
  display:inline-flex; align-items:center; gap:5px; white-space:nowrap; flex-shrink:0;
}
@media (max-width: 640px), (hover: none) { .gs-kbd { display:none !important; } }
.dash-link:hover { text-decoration:underline; text-underline-offset:3px; }
.dash-num { font-variant-numeric: tabular-nums; }
.dash-verb { display:inline-flex; align-items:center; gap:4px; min-width:84px; justify-content:flex-end;
  font-size:13px; font-weight:600; white-space:nowrap; }
.dash-row:hover .dash-verb-text { text-decoration:underline; text-underline-offset:3px; }
@media (max-width: 520px) { .dash-verb { min-width:0; } .dash-verb-text { display:none; } }
.gs-field { transition: border-color .15s, box-shadow .15s; }
.gs-field:focus-within { border-color:${tk.accentText} !important; box-shadow:0 0 0 3px ${tk.accentText}26; }
.gs-field input::placeholder { color:${tk.t2}; opacity:1; }
.dash-card-picker .ant-picker-input > input::placeholder { color:${tk.t2}; opacity:1; }
.gs-clear:focus-visible { outline:2px solid ${tk.accentText}; outline-offset:2px; border-radius:50%; }

/* Antigüedad de cheques por liquidar */
.dash-aging { display:flex; height:4px; width:100%; max-width:160px; border-radius:999px; overflow:hidden;
  background:${tk.divider}; margin-top:7px; }
.dash-aging > span { height:100%; }
.dash-aging-legend { display:flex; flex-wrap:wrap; gap:2px 12px; margin-top:5px; font-size:12px; color:${tk.t2}; }
.dash-aging-legend i { display:inline-block; width:8px; height:8px; border-radius:2px; margin-right:5px; vertical-align:-1px; }
/* Mi cargabilidad: barra de avance con marca del ritmo esperado */
.dash-meter { position:relative; height:8px; border-radius:999px; background:${tk.divider}; }
.dash-meter > span { position:absolute; inset:0 auto 0 0; border-radius:999px; }
.dash-meter > i { position:absolute; top:-4px; bottom:-4px; width:2px; border-radius:1px; background:${tk.t1}; opacity:.55; }
/* Aviso de pendientes nuevos (actualización automática) */
.dash-new { display:inline-flex; align-items:center; gap:6px; padding:2px 10px; border-radius:999px; border:0; cursor:pointer;
  font:inherit; font-size:12px; font-weight:600; color:${tk.accentText}; background:${tk.accentText}1f; }
.dash-new:hover { background:${tk.accentText}33; }
.dash-new:focus-visible { outline:2px solid ${tk.accentText}; outline-offset:2px; }
/* Vista previa de una fila de Pendientes */
.dash-li { display:grid; grid-template-columns:minmax(0,1fr) auto; }
.dash-li > .dash-row { padding-right:8px; }
.dash-chev { color:${tk.t2}; font-size:11px; transition:transform .18s; flex-shrink:0; }
.dash-row[aria-expanded="true"] .dash-chev { transform:rotate(180deg); }
.dash-verb-btn { display:inline-flex; align-items:center; justify-content:flex-end; gap:4px; min-width:96px; padding:0 20px 0 8px;
  background:transparent; border:0; border-top:1px solid ${tk.divider}; cursor:pointer; font:inherit; font-size:13px;
  font-weight:600; color:${tk.accentText}; white-space:nowrap; transition:background .15s; }
.dash-verb-btn:hover { background:${tk.subtle}; }
.dash-verb-btn:hover .dash-verb-text { text-decoration:underline; text-underline-offset:3px; }
.dash-verb-btn:focus-visible { outline:2px solid ${tk.accentText}; outline-offset:-2px; border-radius:6px; }
@media (max-width: 520px) { .dash-verb-btn { min-width:44px; padding:0 14px 0 6px; } }
.dash-peek-panel { grid-column:1 / -1; padding:4px 20px 14px 66px; background:${tk.subtle}; border-top:1px solid ${tk.divider}; }
.dash-peek-item { display:flex; align-items:baseline; gap:12px; width:100%; padding:8px 8px; margin:0 -8px;
  font:inherit; font-size:13px; text-align:left; background:transparent; border:0; border-radius:6px; cursor:pointer;
  color:inherit; box-sizing:content-box; }
.dash-peek-item:hover { background:${tk.surface}; }
.dash-peek-item:hover .dash-peek-title { text-decoration:underline; text-underline-offset:3px; }
.dash-peek-item:focus-visible { outline:2px solid ${tk.accentText}; outline-offset:-2px; }
li + li > .dash-peek-item { border-top:1px solid ${tk.divider}; border-radius:0; }
@media (max-width: 640px) { .dash-peek-panel { padding-left:20px; } }
/* Mi semana */
.dash-week { display:grid; grid-template-columns:repeat(5, minmax(0,1fr)); }
.dash-day { padding:12px 14px 14px; min-width:0; border-left:1px solid ${tk.divider}; }
.dash-day:first-child { border-left:0; }
.dash-day.is-past { opacity:.55; }
.dash-day.is-today { background:${tk.accentText}0d; }
.dash-day-line { display:flex; align-items:center; gap:6px; margin-top:6px; font-size:12px; color:${tk.t1};
  min-width:0; max-width:100%; text-align:left; }
.dash-day-line > span:last-child { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
@media (max-width: 900px) {
  .dash-week { grid-template-columns:minmax(0,1fr); }
  .dash-day { border-left:0; border-top:1px solid ${tk.divider}; display:grid; grid-template-columns:84px minmax(0,1fr); gap:0 12px; }
  .dash-day:first-child { border-top:0; }
}
/* Recientes en la franja: enlaces de texto en una línea (la píldora queda
   para nada más; cada tipo de contenido tiene su propia forma). */
/* Una sola línea: lo que no cabe pasa a una segunda línea oculta, nunca a medias. */
.dash-recent { display:flex; flex-wrap:wrap; align-items:baseline; gap:0 16px; margin-top:10px; font-size:13px;
  line-height:22px; max-height:22px; overflow:hidden; min-width:0; }
.dash-recent-link { background:none; border:0; padding:0; font:inherit; line-height:inherit; color:${tk.t1}; cursor:pointer;
  white-space:nowrap; transition:color .15s; }
.dash-recent-link:hover { color:${tk.accentText}; text-decoration:underline; text-underline-offset:3px; }
.dash-recent-link:focus-visible { outline:2px solid ${tk.accentText}; outline-offset:2px; border-radius:4px; }
/* Plazos */
.dash-date { width:44px; flex-shrink:0; text-align:center; border-radius:8px; padding:4px 0 5px;
  background:${tk.subtle}; border:${tk.borderCss}; line-height:1.1; }
.dash-date b { display:block; font-size:16px; font-weight:700; color:${tk.t1}; }
.dash-date small { font-size:11px; color:${tk.t2}; text-transform:uppercase; letter-spacing:.04em; }

@media (prefers-reduced-motion: reduce) {
  .dash-chev, .dash-verb-btn, .dash-recent-link { transition:none; }
  .dash-in { animation:none; }
  .dash-row, .gs-field { transition:none; }
}
`;
