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
}

export function makeTokens(isDark: boolean): Tokens {
  return isDark
    ? {
        bg:"#161824", surface:"#1D1F2B",
        t1:"#ECEDF2", t2:"#A0A4B3", t3:"#6B7080",
        border:"#2C2F40", borderCss:"1px solid #2C2F40",
        divider:"#262936", subtle:"#232634",
        shadow:"0 1px 4px rgba(0,0,0,.4), 0 4px 12px rgba(0,0,0,.3)",
      }
    : {
        bg:"#EFF4FB", surface:"#FFFFFF",
        t1:"#1C2434", t2:"#64748B", t3:"#94A3B8",
        border:"#E2E8F0", borderCss:"1px solid #E2E8F0",
        divider:"#F1F5F9", subtle:"#F8FAFC",
        shadow:"0 1px 4px rgba(0,0,0,.06), 0 4px 12px rgba(0,0,0,.04)",
      };
}

export const wcard = (tk: Tokens, extra?: React.CSSProperties): React.CSSProperties => ({
  background: tk.surface, borderRadius: RADIUS, border: tk.borderCss, boxShadow: tk.shadow, ...extra,
});

/* ─── chart theme (Nivo) ─────────────────────────────────────────────────── */
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
