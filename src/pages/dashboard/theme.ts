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
  | "nombramientos" | "sirvo" | "envios" | "tramite" | "bandeja";

const HUES: Record<HueKey, [light: string, dark: string]> = {
  // El índigo de marca queda SOLO para la bandeja (y la franja); cheques
  // tiene su propio cian para no confundir módulo con marca.
  bandeja:        ["#3C50E0", "#8C9BFF"],
  cheques:        ["#0E7490", "#22D3EE"],
  dinero:         ["#047857", "#34D399"],
  equipo:         ["#0F766E", "#2DD4BF"],
  salas:          ["#7C3AED", "#A78BFA"],
  notificaciones: ["#0369A1", "#38BDF8"],
  documentos:     ["#A21CAF", "#E879F9"],
  nombramientos:  ["#B45309", "#FBBF24"],
  sirvo:          ["#C2410C", "#FB923C"],
  envios:         ["#4D7C0F", "#A3E635"],
  tramite:        ["#BE185D", "#F472B6"],
};

export const hue = (tk: Tokens, key: HueKey) => {
  const fg = HUES[key][tk.isDark ? 1 : 0];
  return { fg, bg: fg + (tk.isDark ? "2b" : "1a") };
};

/** Franja de bienvenida: el índigo de marca como región propia. */
export const bandColors = (tk: Tokens) => tk.isDark
  ? { bg:"#28348F", text:"#FFFFFF", sub:"#D3D8FA" }
  : { bg:PRIMARY,   text:"#FFFFFF", sub:"#E3E6FC" };

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
/* Franja: plana (sin halo), compacta; herramientas en una sola fila */
.dash-band { display:grid; grid-template-columns:minmax(0,1fr) minmax(300px,520px); align-items:center;
  gap:14px 24px; margin-bottom:20px; padding:20px 24px; border-radius:12px; }
.dash-band-tools { display:flex; align-items:center; gap:8px; min-width:0; }
.dash-band-tools > :first-child { flex:1; min-width:0; max-width:none !important; }
.band-urgent { display:inline-flex; align-items:baseline; flex-wrap:wrap; gap:4px 10px; margin-top:10px; padding:0;
  background:none; border:0; cursor:pointer; font:inherit; font-size:14px; color:#FFFFFF; text-align:left; }
.band-urgent:hover strong { text-decoration:underline; text-underline-offset:3px; }
.band-urgent:focus-visible { outline:2px solid #FFFFFF; outline-offset:4px; border-radius:6px; }
.band-urgent-tag { font-size:12px; font-weight:600; padding:2px 8px; border-radius:999px;
  background:rgba(255,255,255,.16); color:#FFFFFF; }
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
.dash-band .gs-field { border-color:transparent !important; }
.dash-band .gs-field:focus-within { border-color:#FFFFFF !important; box-shadow:0 0 0 3px rgba(255,255,255,.45); }
.dash-band .band-ghost.ant-btn { color:#FFFFFF; border-color:rgba(255,255,255,.7); background:transparent; }
.dash-band .band-ghost.ant-btn:not(:disabled):hover { color:#FFFFFF !important; border-color:#FFFFFF !important; background:rgba(255,255,255,.14) !important; }
.dash-band .band-primary.ant-btn { color:${PRIMARY}; background:#FFFFFF; border-color:#FFFFFF; font-weight:600; }
.dash-band .band-primary.ant-btn:not(:disabled):hover { color:${PRIMARY} !important; background:#EEF0FD !important; border-color:#EEF0FD !important; }
.dash-band .ant-btn:focus-visible { outline:2px solid #FFFFFF !important; outline-offset:2px; }
.gs-field input::placeholder { color:${tk.t2}; opacity:1; }
.dash-card-picker .ant-picker-input > input::placeholder { color:${tk.t2}; opacity:1; }
.gs-clear:focus-visible { outline:2px solid ${tk.accentText}; outline-offset:2px; border-radius:50%; }

@media (prefers-reduced-motion: reduce) {
  .dash-in { animation:none; }
  .dash-row, .gs-field { transition:none; }
}
`;
