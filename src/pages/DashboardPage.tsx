import { useEffect, useRef, useState, useCallback, lazy, Suspense, type CSSProperties, type ReactNode } from "react";
import { Button, Col, Dropdown, Row, Segmented, Skeleton, Tooltip, type MenuProps } from "antd";
import {
  BankOutlined, BellOutlined, CalendarOutlined, CarOutlined, CheckCircleOutlined, ClockCircleOutlined,
  DownOutlined, FileTextOutlined, HourglassOutlined, IdcardOutlined, InboxOutlined, ScheduleOutlined,
  SendOutlined, TeamOutlined, WalletOutlined, PlusOutlined, ReloadOutlined, RightOutlined, FieldTimeOutlined,
  ArrowUpOutlined, DashboardOutlined, HistoryOutlined, ExclamationCircleOutlined,
} from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import useAuthStore from "../auth/useAuthStore";
import useThemeStore from "../hooks/useThemeStore";
import type { ModuleKey } from "../types/module-access.types";
import {
  fetchInbox, fetchMine, fetchVacationSummary, fetchUpcomingItems, fetchDeadlines, fetchMyHours, fetchPreview, fetchWeek,
  type AgendaItem, type Deadlines, type MyHours, type PreviewItem, type WeekDay, type Inbox, type InboxDetail, type InboxKey, type Mine, type MyRequestKey, type RoomNow, type VacationBalance,
  type VacationSummary, type UpcomingItems,
} from "../api/dashboard";
import GlobalSearch from "./dashboard/GlobalSearch";
import { getRecentPages, onRecentPagesChange, type RecentPage } from "../utils/recentPages";
import { DANGER, INFO, SUCCESS, WARNING, type HueKey, type Tokens, bandColors, hue, makeTokens, wcard, makeDashCSS, sevColor, dueSev, ageSev } from "./dashboard/theme";

const ExchangeRateCard = lazy(() => import("./dashboard/ExchangeRateCard"));

/* El inicio es una bandeja: lo que espera la acción del usuario en SUS
   módulos (decidido por el backend con la misma lógica de cada pantalla).
   Lo demás —equipo, encargos, tipo de cambio— es contexto y va después. */

type Load<T> = { status: "loading" } | { status: "ok"; data: T } | { status: "error" };

const fmtDay = (iso: string) =>
  new Date(iso.slice(0, 10) + "T12:00:00").toLocaleDateString("es-GT", { day:"numeric", month:"short" });
/** Como fmtDay, con el año si no es el actual ("2 ene 2025"). */
const fmtDayY = (iso: string) => {
  const d = new Date(iso.slice(0, 10) + "T12:00:00");
  return d.toLocaleDateString("es-GT", { day:"numeric", month:"short",
    ...(d.getFullYear() !== new Date().getFullYear() && { year:"numeric" }) });
};

/* ─── Color por módulo ─────────────────────────────────────────────────────── */
function HueChip({ k, icon, tk, size = 32 }: { k: HueKey; icon: ReactNode; tk: Tokens; size?: number }) {
  const c = hue(tk, k);
  return (
    <span aria-hidden style={{ width:size, height:size, borderRadius:8, flexShrink:0, display:"inline-flex",
      alignItems:"center", justifyContent:"center", background:c.bg, color:c.fg, fontSize: size * 0.47 }}>
      {icon}
    </span>
  );
}

function PanelTitle({ id, title, k, icon, tk, size = 16 }: {
  id: string; title: string; k: HueKey; icon: ReactNode; tk: Tokens; size?: number;
}) {
  return (
    <h2 id={id} style={{ margin:0, display:"flex", alignItems:"center", gap:10, fontSize:size, fontWeight:600, color:tk.t1 }}>
      <HueChip k={k} icon={icon} tk={tk} size={28} />
      {title}
    </h2>
  );
}

/* ─── Listas de conteos (Pendientes / Mis solicitudes) ───────────────────── */
/* Cada fila dice qué hay (conteo), lo que cambia la decisión (monto, el más
   antiguo, el próximo que vence) y qué hacer (verbo). Pendientes se ordena por
   urgencia; la urgencia también tiñe el reloj de la segunda línea. */
type Severity = 0 | 1 | 2;
type DetailFn<K extends string> = (
  counts: Partial<Record<K, number | null>>,
  det: InboxDetail | undefined,
) => { text: string; sev: Severity; /** parte neutra al inicio (p. ej. el monto): nunca se tiñe */ lead?: string } | null;

type CountItem<K extends string> = {
  key: K; label: string; path: string; hue: HueKey; icon: ReactNode;
  /** Acción que se hace al abrir (Autorizar, Liquidar, Aceptar…) */
  verb: string;
  detail?: DetailFn<K>;
  /** Visual que reemplaza el texto del detalle (p. ej. barra de antigüedad). */
  visual?: (counts: Partial<Record<K, number | null>>, tk: Tokens) => ReactNode;
};

/** Antigüedad de "por liquidar": ≤30 / 30–60 / +60 días, con leyenda. */
function AgingBar({ total, over30, over60, tk }: { total: number; over30: number; over60: number; tk: Tokens }) {
  const parts = [
    { n: Math.max(total - over30, 0), label: "hasta 30 días", color: tk.isDark ? "#3A3F52" : "#CBD5E1" },
    { n: Math.max(over30 - over60, 0), label: "de 30 a 60 días", color: tk.isDark ? "#6B7080" : "#94A3B8" },
    { n: over60, label: "más de 60 días", color: WARNING },
  ];
  if (total <= 0) return null;
  return (
    <span style={{ display:"block" }}>
      <span className="dash-aging" role="img"
        aria-label={parts.map((p) => `${p.n} ${p.label}`).join(", ")}>
        {parts.map((p) => p.n > 0 && (
          <span key={p.label} style={{ width:`${(p.n / total) * 100}%`, background:p.color }} />
        ))}
      </span>
      {parts.filter((p) => p.n > 0).length > 1 && <span className="dash-aging-legend" aria-hidden>
        {parts.filter((p) => p.n > 0).map((p) => (
          <span key={p.label} className="dash-num">
            <i style={{ background:p.color }} />{p.n.toLocaleString("es-GT")} {p.label}
          </span>
        ))}
      </span>}
    </span>
  );
}

const pl = (n: number, one: string, many: string) => `${n.toLocaleString("es-GT")} ${n === 1 ? one : many}`;

/* Fechas en hora de Guatemala */
const todayGT = () => new Date().toLocaleDateString("en-CA", { timeZone:"America/Guatemala" });
const dayDiff = (iso: string) =>
  Math.round((Date.parse(iso.slice(0, 10) + "T12:00:00Z") - Date.parse(todayGT() + "T12:00:00Z")) / 86_400_000);
/** "de hoy", "de ayer", "de hace 9 días", "de mar 2025" */
const ago = (iso: string) => {
  const d = -dayDiff(iso);
  if (d <= 0) return "de hoy";
  if (d === 1) return "de ayer";
  if (d < 60) return `de hace ${d} días`;
  return `de ${new Date(iso.slice(0, 10) + "T12:00:00").toLocaleDateString("es-GT", { month:"short", year:"numeric" })}`;
};
/** "hoy a las 09:00", "mañana", "el 25 nov" */
const when = (iso: string, time?: string | null) => {
  const d = dayDiff(iso);
  const day = d === 0 ? "hoy" : d === 1 ? "mañana" : `el ${fmtDay(iso)}`;
  return time ? `${day} a las ${time}` : day;
};
const money = (a?: InboxDetail["amounts"]) =>
  (a ?? []).map((x) => `${x.currency} ${x.total.toLocaleString("es-GT", { maximumFractionDigits: 0 })}`).join(" + ");
const join = (...p: (string | null | undefined | false)[]) => p.filter(Boolean).join(" · ");

/* Severidad: siempre con dueSev / ageSev de theme.ts (La Regla de Severidad). */

/** Monto + "el más antiguo de hace N días"; el atraso llega a ámbar, nunca a rojo. */
const moneyAndAge = (warnDays: number): DetailFn<string> => (_c, det) => {
  if (!det) return null;
  const age = det.oldest ? -dayDiff(det.oldest) : 0;
  const lead = money(det.amounts);
  const aging = det.oldest ? `el más antiguo ${ago(det.oldest)}` : "";
  if (!lead && !aging) return null;
  // El monto va en tinta: solo la antigüedad lleva el color del atraso.
  return { lead: lead || undefined, text: aging, sev: aging ? ageSev(age, warnDays) : 0 };
};
/** "el más antiguo de hace N días" (bandejas de aceptación): atraso → ámbar. */
const oldestOnly = (noun: string): DetailFn<string> => (_c, det) => {
  if (!det?.oldest) return null;
  return { text: `${noun} ${ago(det.oldest)}`, sev: ageSev(-dayDiff(det.oldest), 2) };
};

const INBOX_ITEMS: CountItem<InboxKey>[] = [
  { key:"checksToAuthorize", hue:"cheques", icon:<BankOutlined />, verb:"Autorizar",
    label:"Cheques por autorizar", path:"/dashboard/cheques/autorizacion",
    detail: moneyAndAge(5) },
  { key:"checksToLiquidate", hue:"cheques", icon:<BankOutlined />, verb:"Liquidar",
    label:"Cheques por liquidar", path:"/dashboard/cheques/liquidacion",
    detail: (c) => {
      const o30 = c.checksToLiquidateOver30 ?? 0, o60 = c.checksToLiquidateOver60 ?? 0;
      if (o30 <= 0) return null;
      // Si todos los viejos pasan de 60 días, decirlo una sola vez.
      if (o60 >= o30) return { text: pl(o60, "lleva más de 60 días", "llevan más de 60 días"), sev: ageSev(61, 30) };
      return {
        text: pl(o30, "lleva más de 30 días", "llevan más de 30 días") + (o60 > 0 ? ` (${o60.toLocaleString("es-GT")} más de 60)` : ""),
        sev: ageSev(31, 30),
      };
    },
    visual: (c, tk) => (
      <AgingBar total={c.checksToLiquidate ?? 0} over30={c.checksToLiquidateOver30 ?? 0}
        over60={c.checksToLiquidateOver60 ?? 0} tk={tk} />
    ) },
  { key:"moneyReqToAuthorize", hue:"dinero", icon:<WalletOutlined />, verb:"Autorizar",
    label:"Requerimientos de dinero por autorizar", path:"/dashboard/money-req?vista=por-autorizar",
    detail: moneyAndAge(3) },
  { key:"vacationsToApprove", hue:"equipo", icon:<CalendarOutlined />, verb:"Revisar",
    label:"Vacaciones de tu equipo por aprobar", path:"/dashboard/recursos-humanos/vacaciones",
    detail: (_c, det) => {
      if (!det?.next) return null;
      const d = dayDiff(det.next);
      return { text: `la próxima inicia ${when(det.next)}`, sev: dueSev(d) };
    } },
  { key:"roomsToApprove", hue:"salas", icon:<ScheduleOutlined />, verb:"Aprobar",
    label:"Reservas de sala por aprobar", path:"/dashboard/reservaciones/listar",
    detail: (_c, det) => {
      if (!det?.next) return null;
      const today = det.today ?? 0;
      return {
        text: join(today > 0 && `${today} para hoy`, `la próxima ${when(det.next, det.nextTime)}`),
        sev: today > 0 ? 2 : dueSev(dayDiff(det.next)),
      };
    } },
  { key:"sirvoRequests", hue:"sirvo", icon:<SendOutlined />, verb:"Pedir",
    label:"Solicitudes por pedir en Sirvo", path:"/dashboard/migracion/sirvo" },
  { key:"appointmentsExpiring", hue:"nombramientos", icon:<IdcardOutlined />, verb:"Revisar",
    label:"Nombramientos que vencen en 60 días", path:"/dashboard/appointments",
    detail: (_c, det) => {
      if (!det?.next) return null;
      const d = dayDiff(det.next);
      return { text: join(`el próximo vence ${when(det.next)}`, det.nextLabel), sev: dueSev(d) };
    } },
  { key:"notificationsToAccept", hue:"notificaciones", icon:<BellOutlined />, verb:"Aceptar",
    label:"Notificaciones por aceptar", path:"/dashboard/notificaciones/entregadas",
    detail: oldestOnly("la más antigua") },
  { key:"documentsToAccept", hue:"documentos", icon:<FileTextOutlined />, verb:"Aceptar",
    label:"Documentos por aceptar", path:"/dashboard/documentos/entregados",
    detail: oldestOnly("el más antiguo") },
  { key:"encargosToday", hue:"envios", icon:<CarOutlined />, verb:"Ver",
    label:"Envíos programados para hoy", path:"/dashboard/mensajeria",
    detail: (_c, det) => (det?.priorityA ? { text: pl(det.priorityA, "de prioridad A", "de prioridad A"), sev: dueSev(0) } : null) },
];

const MY_REQUEST_ITEMS: CountItem<MyRequestKey>[] = [
  { key:"checksAwaitingAuth", hue:"cheques", icon:<BankOutlined />, verb:"Ver",
    label:"Mis cheques esperando autorización", path:"/dashboard/cheques/autorizacion",
    detail: (_c, det) => det ? { text: join(money(det.amounts), det.oldest && `el más antiguo ${ago(det.oldest)}`), sev: 0 } : null },
  { key:"moneyReqPending", hue:"dinero", icon:<WalletOutlined />, verb:"Ver",
    label:"Mis requerimientos de dinero sin autorizar", path:"/dashboard/money-req",
    detail: (_c, det) => det ? { text: join(money(det.amounts), det.oldest && `el más antiguo ${ago(det.oldest)}`), sev: 0 } : null },
  { key:"roomsPending", hue:"salas", icon:<ScheduleOutlined />, verb:"Ver",
    label:"Mis reservas de sala sin aprobar", path:"/dashboard/reservaciones/listar",
    detail: (_c, det) => det?.next ? { text: `la próxima ${when(det.next, det.nextTime)}`, sev: 0 } : null },
  { key:"vacationPending", hue:"equipo", icon:<CalendarOutlined />, verb:"Ver",
    label:"Mis vacaciones por aprobar", path:"/dashboard/recursos-humanos/vacaciones",
    detail: (_c, det) => det?.next ? { text: `inician ${when(det.next)}`, sev: 0 } : null },
];

/** Nombre corto para los chips de "Al día". */
const CHIP_LABEL: Partial<Record<string, string>> = {
  checksToAuthorize: "Cheques por autorizar", checksToLiquidate: "Cheques por liquidar",
  moneyReqToAuthorize: "Requerimientos", vacationsToApprove: "Vacaciones", roomsToApprove: "Reservas de sala",
  sirvoRequests: "Sirvo", appointmentsExpiring: "Nombramientos", notificationsToAccept: "Notificaciones",
  documentsToAccept: "Documentos", encargosToday: "Envíos de hoy",
};

/** Filas con conteo > 0, con su contexto, ordenadas por urgencia (estable). */
function rankRows<K extends string>(
  items: CountItem<K>[],
  counts: Partial<Record<K, number | null>>,
  details: Partial<Record<K, InboxDetail>> | undefined,
  byUrgency: boolean,
) {
  return items
    .filter((i) => i.key in counts && (counts[i.key] ?? 0) > 0)
    .map((i, order) => ({ i, order, det: i.detail?.(counts, details?.[i.key]) ?? null }))
    .sort((a, b) => byUrgency ? ((b.det?.sev ?? 0) - (a.det?.sev ?? 0)) || a.order - b.order : a.order - b.order);
}

/* Pendientes = espera TU acción: orden por urgencia, reloj ámbar/rojo.
   Mis solicitudes = espera a OTROS: contexto neutro, orden fijo. */
/* Vista previa: los 5 más antiguos (o próximos) de una fila, sin salir del
   inicio. Se pide al abrirla y se olvida cuando la bandeja se recarga. */
/** Qué muestra la vista previa de cada fila (para el aviso del botón). */
const PREVIEW_NOUN: Record<string, string> = {
  checksToAuthorize: "los 5 más antiguos", checksToLiquidate: "los 5 más antiguos",
  moneyReqToAuthorize: "los 5 más antiguos", notificationsToAccept: "las 5 más antiguas",
  documentsToAccept: "los 5 más antiguos", roomsToApprove: "las 5 próximas",
  vacationsToApprove: "las 5 próximas", appointmentsExpiring: "los 5 próximos", encargosToday: "los 5 de hoy",
};
/** "RODRIGUEZ MAHUAD, ALFREDO" → "Rodriguez Mahuad, Alfredo" (la BD guarda muchos en
    mayúsculas). Por partes ("Solicitud 23 · ADA OLIVA"): solo la parte en mayúsculas cambia. */
const tidy = (text: string) => text.split(" · ").map(tidyPart).join(" · ")
  // "ERIK GERARDO Arroyave Muñoz": dos o más palabras seguidas en mayúsculas son un nombre;
  // una sola se respeta (siglas como NIT, ARM).
  .replace(/\b([A-ZÁÉÍÓÚÑ]{2,}(?:\s+[A-ZÁÉÍÓÚÑ]{2,})+)\b/gu, (run) => tidyPart(run));
const tidyPart = (text: string) =>
  /[a-záéíóúñ]/.test(text) || !/[A-ZÁÉÍÓÚÑ]{3}/.test(text)
    ? text
    : text.toLowerCase().replace(/(^|[\s(,/-])(\p{L})/gu, (_m, sep: string, ch: string) => sep + ch.toUpperCase())
        .replace(/\b(s\.a|s\.a\.|ltda|nt|exp)\b\.?/gi, (m) => m.toUpperCase());
const PREVIEWABLE = new Set<string>([
  "checksToAuthorize", "checksToLiquidate", "moneyReqToAuthorize", "roomsToApprove", "vacationsToApprove",
  "appointmentsExpiring", "notificationsToAccept", "documentsToAccept", "encargosToday",
]);

function PreviewList({ state, tk, total, onOpen, onOpenItem, onRetry }: {
  state: Load<PreviewItem[]>; tk: Tokens; total: number;
  onOpen: () => void; onOpenItem: (path: string | null | undefined) => void; onRetry: () => void;
}) {
  if (state.status === "loading") return <Skeleton active title={false} paragraph={{ rows:3 }} style={{ paddingTop:10 }} />;
  if (state.status === "error") {
    return (
      <div style={{ padding:"10px 0", fontSize:13, color:tk.t2 }}>
        No se pudo cargar la lista.{" "}
        <button type="button" className="dash-link" onClick={onRetry}>Reintentar</button>
      </div>
    );
  }
  return (
    <>
      {state.data.length === 0
        ? <p style={{ margin:0, padding:"10px 0", fontSize:13, color:tk.t2 }}>Ya no hay pendientes aquí.</p>
        : (
          <ul style={{ listStyle:"none", margin:0, padding:0 }}>
            {state.data.map((it) => (
              <li key={it.id}>
               <button type="button" className="dash-peek-item" onClick={() => onOpenItem(it.path)}>
                <span className="dash-num" style={{ width:58, flexShrink:0, color:tk.t2 }}>
                  {it.date ? fmtDayY(it.date) : "—"}{it.time ? <><br />{it.time}</> : null}
                </span>
                <span style={{ flex:1, minWidth:0 }}>
                  <span className="dash-peek-title" style={{ display:"block", color:tk.t1, fontWeight:500, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                    {tidy(it.title)}
                  </span>
                  {it.subtitle && (
                    <span style={{ display:"block", color:tk.t2, marginTop:1, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                      {tidy(it.subtitle)}
                    </span>
                  )}
                </span>
                {it.amount && <span className="dash-num" style={{ flexShrink:0, color:tk.t1, fontWeight:600 }}>{it.amount}</span>}
               </button>
              </li>
            ))}
          </ul>
        )}
      {state.data.length > 0 && total > state.data.length && (
        <button type="button" className="dash-link" style={{ marginTop:6 }} onClick={onOpen}>
          Ver los {total.toLocaleString("es-GT")} <RightOutlined style={{ fontSize:10 }} />
        </button>
      )}
    </>
  );
}

function CountPanel<K extends string>({ id, title, subtitle, titleHue, titleIcon, items, data, details, tone, emptyText, tk, onOpen, onRetry, preview = false }: {
  id: string; title: string; subtitle: string; titleHue: HueKey; titleIcon: ReactNode;
  items: CountItem<K>[]; data: Load<Partial<Record<K, number | null>>>;
  details?: Partial<Record<K, InboxDetail>>;
  tone: "action" | "waiting"; emptyText: string;
  tk: Tokens; onOpen: (path: string) => void; onRetry: () => void;
  /** botón ▾ con los más antiguos de cada fila (solo la bandeja) */
  preview?: boolean;
}) {
  const [openKey, setOpenKey] = useState<K | null>(null);
  const [previews, setPreviews] = useState<Partial<Record<K, Load<PreviewItem[]>>>>({});
  const openRef = useRef<K | null>(null);
  openRef.current = openKey;
  const loadPreview = useCallback(async (k: K) => {
    setPreviews((p) => ({ ...p, [k]: { status:"loading" } }));
    const res = await settle(fetchPreview(k as unknown as InboxKey));
    setPreviews((p) => ({ ...p, [k]: res }));
  }, []);
  /* La bandeja se recargó (a mano o sola): las listas ya pueden no coincidir
     con los números. Se olvidan y la que está abierta se vuelve a pedir. */
  useEffect(() => {
    if (!preview || data.status !== "ok") return;
    setPreviews({});
    const k = openRef.current;
    if (k) loadPreview(k);
  }, [preview, data, loadPreview]);
  /* Al abrir una vista previa el foco pasa a su panel (lector de pantalla y teclado). */
  const focusPanel = useCallback((el: HTMLDivElement | null) => { el?.focus({ preventScroll:true }); }, []);
  const togglePreview = (k: K) => {
    if (openKey === k) { setOpenKey(null); return; }
    setOpenKey(k);
    if (!previews[k] || previews[k]?.status === "error") loadPreview(k);
  };
  const header = (
    <div style={{ padding:"18px 20px 14px" }}>
      <PanelTitle id={id} title={title} k={titleHue} icon={titleIcon} tk={tk} size={tone === "action" ? 18 : 16} />
      <p style={{ margin:"6px 0 0 38px", fontSize:13, color:tk.t2 }}>{subtitle}</p>
    </div>
  );

  let body: ReactNode;
  if (data.status === "loading") {
    body = (
      <div style={{ padding:"4px 20px 18px" }}>
        <Skeleton active title={false} paragraph={{ rows: tone === "action" ? 4 : 2 }} />
      </div>
    );
  } else if (data.status === "error") {
    body = (
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:12, flexWrap:"wrap",
        padding:"14px 20px 18px", borderTop:`1px solid ${tk.divider}`, fontSize:14, color:tk.t1 }}>
        No se pudo cargar. Tus módulos siguen disponibles en el menú.
        <Button icon={<ReloadOutlined />} onClick={onRetry}>Reintentar</Button>
      </div>
    );
  } else {
    const d = data.data;
    const shown   = items.filter((i) => i.key in d);
    const failed  = shown.filter((i) => d[i.key] === null);
    const clear   = shown.filter((i) => d[i.key] === 0);
    // Lo urgente primero (estable: a igual urgencia, el orden de siempre)
    const pending = rankRows(shown, d, details, tone === "action");

    body = (
      <>
        {pending.length === 0 && failed.length === 0 && (
          <div style={{ display:"flex", alignItems:"center", gap:10, padding:"16px 20px",
            borderTop:`1px solid ${tk.divider}`, fontSize:14, color: tone === "action" ? tk.t1 : tk.t2 }}>
            {tone === "action" && <CheckCircleOutlined style={{ color:SUCCESS, fontSize:16 }} />}
            {emptyText}
          </div>
        )}

        {pending.length > 0 && (
          <ul style={{ listStyle:"none", margin:0, padding:0 }}>
            {pending.map(({ i, det }) => {
              const canPeek = preview && PREVIEWABLE.has(i.key);
              const open = openKey === i.key;
              const count = d[i.key] as number;
              const body = (
                <>
                  <HueChip k={i.hue} icon={i.icon} tk={tk} />
                  <span style={{ flex:1, minWidth:0 }}>
                    <span style={{ display:"block", fontSize:14, fontWeight:500 }}>{i.label}</span>
                    {det && (
                      <span style={{ display:"flex", alignItems:"baseline", flexWrap:"wrap", gap:"0 6px", marginTop:3, fontSize:13,
                        color: tone === "action" && det.sev > 0 ? sevColor(tk, det.sev) : tk.t2 }}>
                        {det.lead && <span style={{ color:tk.t1 }}>{det.lead}{det.text ? " ·" : ""}</span>}
                        {tone === "action" && det.sev === 2 && <ExclamationCircleOutlined aria-label="Urgente" style={{ flexShrink:0 }} />}
                        {tone === "action" && det.sev === 1 && <ClockCircleOutlined aria-label="Atrasado" style={{ flexShrink:0 }} />}
                        {det.text && <span>{det.text}</span>}
                      </span>
                    )}
                    {i.visual?.(d, tk)}
                  </span>
                  {/* La cifra va siempre en tinta: la urgencia la dice el reloj y su línea. */}
                  <span className="dash-num" style={{ fontSize: tone === "action" ? 18 : 16, fontWeight:700, minWidth:36,
                    textAlign:"right", color:tk.t1 }}>
                    {count.toLocaleString("es-GT")}
                  </span>
                </>
              );
              if (!canPeek) {
                return (
                  <li key={i.key}>
                    <button type="button" className="dash-row" onClick={() => onOpen(i.path)}>
                      {body}
                      <span className="dash-verb" style={{ color:tk.accentText }}>
                        <span className="dash-verb-text">{i.verb}</span>
                        <RightOutlined aria-hidden style={{ fontSize:10 }} />
                      </span>
                    </button>
                  </li>
                );
              }
              const shown = Math.min(count, 5);
              return (
                <li key={i.key} className="dash-li">
                  <button type="button" className="dash-row" onClick={() => onOpen(i.path)}>
                    {body}
                    <span className="dash-verb" style={{ color:tk.accentText }}>
                      <span className="dash-verb-text">{i.verb}</span>
                      <RightOutlined aria-hidden style={{ fontSize:10 }} />
                    </span>
                  </button>
                  <button type="button" className="dash-peek-btn" aria-expanded={open} aria-controls={`peek-${i.key}`}
                    aria-label={`${open ? "Ocultar" : "Ver"} ${PREVIEW_NOUN[i.key] ?? "los más antiguos"}: ${i.label}`}
                    onClick={() => togglePreview(i.key)}>
                    <span className="dash-peek-pill">
                      <span className="dash-peek-text">{count <= 5 ? "Ver todos" : `Ver ${shown}`}</span>
                      <DownOutlined aria-hidden className="dash-chev" />
                    </span>
                  </button>
                  {open && (
                    <div id={`peek-${i.key}`} className="dash-peek-panel" ref={focusPanel} tabIndex={-1}
                      role="region" aria-label={`${PREVIEW_NOUN[i.key] ?? "Los más antiguos"}: ${i.label}`}>
                      <PreviewList state={previews[i.key] ?? { status:"loading" }} tk={tk} total={count}
                        onOpen={() => onOpen(i.path)} onOpenItem={(path) => onOpen(path || i.path)}
                        onRetry={() => loadPreview(i.key)} />
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}

        {failed.length > 0 && (
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:12, flexWrap:"wrap",
            padding:"12px 20px", borderTop:`1px solid ${tk.divider}`, fontSize:13, color:tk.t2 }}>
            <span>No se pudo contar: {failed.map((i) => i.label.toLowerCase()).join(", ")}.</span>
            <button type="button" className="dash-link" onClick={onRetry}>
              <ReloadOutlined /> Reintentar
            </button>
          </div>
        )}

        {tone === "action" && clear.length > 0 && (pending.length > 0 || failed.length > 0) && (
          <p style={{ margin:0, padding:"12px 20px 16px", borderTop:`1px solid ${tk.divider}`, fontSize:13, color:tk.t2 }}>
            <CheckCircleOutlined aria-hidden style={{ color:SUCCESS, marginRight:6 }} />
            <span style={{ color:tk.t1, fontWeight:600 }}>Al día:</span>{" "}
            {clear.map((i) => CHIP_LABEL[i.key] ?? i.label).join(", ")}
          </p>
        )}
      </>
    );
  }

  return (
    <section aria-labelledby={id} style={{ ...wcard(tk), overflow:"hidden" }}>
      {header}
      {body}
    </section>
  );
}

/* ─── Mi agenda (reservas de sala de hoy y mañana) ────────────────────────── */
function RoomsNow({ rooms, tk, onCreate }: { rooms: RoomNow[]; tk: Tokens; onCreate: () => void }) {
  const free = rooms.filter((r) => r.free);
  const freeUntil = free.filter((r) => r.until).sort((a, b) => (b.until ?? "").localeCompare(a.until ?? ""));
  const freeAllDay = free.filter((r) => !r.until);
  const busy = rooms.filter((r) => !r.free);
  const dot = (
    <span aria-hidden style={{ display:"inline-block", width:7, height:7, borderRadius:"50%",
      background:SUCCESS, marginRight:8, verticalAlign:"middle" }} />
  );
  return (
    <div style={{ marginTop:16, paddingTop:14, borderTop:`1px solid ${tk.border}` }}>
      <h3 style={{ fontSize:12, fontWeight:600, color:tk.t2, margin:"0 0 6px" }}>Salas libres ahora</h3>
      {free.length === 0 && (
        <p style={{ margin:0, fontSize:13, color:tk.t2 }}>Todas las salas están ocupadas en este momento.</p>
      )}
      {freeAllDay.length > 0 && (
        <p style={{ margin:"0 0 4px", fontSize:13, color:tk.t1, lineHeight:1.55 }}>
          {dot}<span style={{ color:tk.t2 }}>Libres el resto del día:</span>{" "}
          <span title={freeAllDay.map((r) => r.name).join(", ")}>
            {freeAllDay.slice(0, 3).map((r) => r.name).join(", ")}
            {freeAllDay.length > 3 && ` y ${freeAllDay.length - 3} más`}
          </span>
        </p>
      )}
      {freeUntil.length > 0 && (
        <ul style={{ listStyle:"none", margin:0, padding:0 }}>
          {freeUntil.map((r) => (
            <li key={r.id} style={{ display:"flex", alignItems:"baseline", justifyContent:"space-between", gap:10,
              padding:"4px 0", fontSize:13 }}>
              <span style={{ color:tk.t1, fontWeight:500, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                {dot}{r.name}
              </span>
              <span className="dash-num" style={{ color:tk.t2, flexShrink:0 }}>hasta {r.until}</span>
            </li>
          ))}
        </ul>
      )}
      {busy.length > 0 && (
        <p style={{ margin:"8px 0 0", fontSize:13, color:tk.t2 }}>
          Ocupadas: {busy.map((r) => `${r.name} (hasta ${r.until})`).join(", ")}
        </p>
      )}
      {free.length > 0 && (
        <button type="button" className="dash-link" style={{ marginTop:10 }} onClick={onCreate}>
          Reservar una sala <RightOutlined style={{ fontSize:10 }} />
        </button>
      )}
    </div>
  );
}

function AgendaPanel({ data, rooms, tk, onOpen, onCreate, onRetry }: {
  data: Load<AgendaItem[] | null>; rooms: RoomNow[] | null | undefined;
  tk: Tokens; onOpen: () => void; onCreate: () => void; onRetry: () => void;
}) {
  const todayIso = new Date().toLocaleDateString("en-CA", { timeZone:"America/Guatemala" });
  const groups = data.status === "ok" && data.data
    ? [
        { title:"Hoy",    items: data.data.filter((a) => a.date === todayIso) },
        { title:"Mañana", items: data.data.filter((a) => a.date !== todayIso) },
      ].filter((g) => g.items.length > 0)
    : [];

  return (
    <section aria-labelledby="agenda-title" style={{ ...wcard(tk, { padding:"18px 20px", boxShadow:"none" }) }}>
      <div style={{ display:"flex", alignItems:"baseline", justifyContent:"space-between", gap:8, marginBottom:8 }}>
        <PanelTitle id="agenda-title" title="Mi agenda" k="salas" icon={<ScheduleOutlined />} tk={tk} size={15} />
        <button type="button" className="dash-link" onClick={onOpen}>Mis reservas <RightOutlined style={{ fontSize:10 }} /></button>
      </div>

      {data.status === "loading" && <Skeleton active title={false} paragraph={{ rows:2 }} />}

      {(data.status === "error" || (data.status === "ok" && data.data === null)) && (
        <div style={{ fontSize:13, color:tk.t2 }}>
          No se pudo cargar tu agenda.{" "}
          <button type="button" className="dash-link" onClick={onRetry}>Reintentar</button>
        </div>
      )}

      {data.status === "ok" && data.data && data.data.length === 0 && (
        <p style={{ margin:0, fontSize:13, color:tk.t2 }}>Sin reservas hoy ni mañana.</p>
      )}

      {groups.map((g, gi) => (
        <div key={g.title}>
          <h3 style={{ fontSize:12, fontWeight:600, color:tk.t2, margin: gi === 0 ? "4px 0 2px" : "14px 0 2px" }}>{g.title}</h3>
          <ul style={{ listStyle:"none", margin:0, padding:0 }}>
            {g.items.map((a) => (
              <li key={a.id} style={{ display:"flex", gap:12, padding:"10px 0", borderTop:`1px solid ${tk.divider}`, fontSize:13 }}>
                <span className="dash-num" style={{ color:tk.t1, fontWeight:600, flexShrink:0, minWidth:88 }}>
                  {a.start}–{a.end}
                </span>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ color:tk.t1, fontWeight:500, display:"flex", alignItems:"center", gap:8, flexWrap:"wrap" }}>
                    Sala {a.room}
                    {a.pending && (
                      <span style={{ fontSize:12, fontWeight:600, color:tk.t1, background:WARNING + "29",
                        borderRadius:4, padding:"1px 6px" }}>
                        Por aprobar
                      </span>
                    )}
                  </div>
                  {a.reason && (
                    <div style={{ color:tk.t2, marginTop:2, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                      {a.reason}
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      ))}

      {rooms && rooms.length > 0 && <RoomsNow rooms={rooms} tk={tk} onCreate={onCreate} />}
    </section>
  );
}

/* ─── Equipo hoy (vacaciones) ─────────────────────────────────────────────── */
function TeamPanel({ data, balance, tk, onOpen, onRetry }: {
  data: Load<VacationSummary>; balance: VacationBalance | null | undefined;
  tk: Tokens; onOpen?: () => void; onRetry: () => void;
}) {
  // Máx. 2 decimales y sin ceros sobrantes: 15 → "15", 14.5 → "14.5", 1.88 → "1.88"
  const fmtDays = (n: number) => {
    const v = Math.round(n * 100) / 100;
    return `${v.toLocaleString("es-GT", { maximumFractionDigits: 2 })} día${Math.abs(v) === 1 ? "" : "s"}`;
  };
  const sub: CSSProperties = { fontSize:12, fontWeight:600, color:tk.t2, margin:"0 0 6px" };
  const person = (name: string, detail: string, k: number) => (
    <li key={k} style={{ display:"flex", justifyContent:"space-between", gap:10, padding:"6px 0", fontSize:13 }}>
      <span style={{ color:tk.t1, fontWeight:500, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{name}</span>
      <span style={{ color:tk.t2, flexShrink:0 }}>{detail}</span>
    </li>
  );

  return (
    <section aria-labelledby="team-title" style={{ ...wcard(tk, { padding:"18px 20px", boxShadow:"none" }) }}>
      <div style={{ display:"flex", alignItems:"baseline", justifyContent:"space-between", gap:8, marginBottom:12 }}>
        <PanelTitle id="team-title" title="Equipo" k="equipo" icon={<TeamOutlined />} tk={tk} size={15} />
        {onOpen && (
          <button type="button" className="dash-link" onClick={onOpen}>Vacaciones <RightOutlined style={{ fontSize:10 }} /></button>
        )}
      </div>

      {balance && (
        <div style={{ paddingBottom:14, marginBottom:14, borderBottom:`1px solid ${tk.divider}` }}>
          <div style={{ fontSize:12, fontWeight:600, color:tk.t2 }}>Tu saldo de vacaciones</div>
          <div className="dash-num" style={{ fontSize:26, fontWeight:700, letterSpacing:"-.01em", lineHeight:1.2,
            color: balance.days < 0 ? DANGER : tk.t1, marginTop:4 }}>
            {fmtDays(balance.days)}
          </div>
          {balance.pendingDays > 0 && (
            <div style={{ fontSize:12, color:tk.t2, marginTop:2 }}>
              Ya descontados {fmtDays(balance.pendingDays)} por aprobar
            </div>
          )}
        </div>
      )}

      {data.status === "loading" && <Skeleton active title={false} paragraph={{ rows:3 }} />}

      {data.status === "error" && (
        <div style={{ fontSize:13, color:tk.t2 }}>
          No se pudo cargar quién está fuera.{" "}
          <button type="button" className="dash-link" onClick={onRetry}>Reintentar</button>
        </div>
      )}

      {data.status === "ok" && (
        <>
          {data.data.onVacation.length === 0 && data.data.upcoming.length === 0 ? (
            <p style={{ margin:0, fontSize:13, color:tk.t2 }}>Todo el equipo está hoy y nadie sale esta semana.</p>
          ) : <h3 style={sub}>Fuera hoy</h3>}
          {data.data.onVacation.length === 0
            ? (data.data.upcoming.length > 0 && <p style={{ margin:"0 0 4px", fontSize:13, color:tk.t2 }}>Todo el equipo está hoy.</p>)
            : <ul style={{ listStyle:"none", margin:0, padding:0 }}>
                {data.data.onVacation.map((v, i) => person(v.name, `regresa ${fmtDay(v.fechaFin)}`, i))}
              </ul>}

          {data.data.upcoming.length > 0 && (
            <>
              <h3 style={{ ...sub, marginTop:14 }}>Próximos 7 días</h3>
              <ul style={{ listStyle:"none", margin:0, padding:0 }}>
                {data.data.upcoming.map((v, i) =>
                  person(v.name, `${fmtDay(v.fechaInicio)} · ${v.dias} día${v.dias !== 1 ? "s" : ""}`, i))}
              </ul>
            </>
          )}
        </>
      )}
    </section>
  );
}

/* ─── Encargos próximos (solo con módulo de mensajería) ───────────────────── */
const PRIORIDAD: Record<number, { letter: string; color: string }> = {
  1: { letter:"A", color:DANGER }, 2: { letter:"B", color:WARNING },
  3: { letter:"C", color:INFO },   4: { letter:"D", color:"#64748B" },
};

function EncargosPanel({ data, tk, onOpen, onRetry }: {
  data: Load<UpcomingItems>; tk: Tokens; onOpen: () => void; onRetry: () => void;
}) {
  const time = (t: string | null) => (t ? t.slice(0, 5) : null);
  const row = (e: UpcomingItems["today"][number], showDate: boolean) => {
    const p = PRIORIDAD[e.prioridad];
    const from = time(e.hora_minima); const to = time(e.hora_maxima);
    return (
      <li key={e.id} style={{ display:"flex", alignItems:"flex-start", gap:12, padding:"10px 0", borderTop:`1px solid ${tk.divider}` }}>
        <span title={`Prioridad ${p?.letter ?? "?"}`} aria-label={`Prioridad ${p?.letter ?? "sin definir"}`}
          style={{ width:22, height:22, borderRadius:5, flexShrink:0, display:"inline-flex", alignItems:"center",
            justifyContent:"center", fontSize:11, fontWeight:700, color:p?.color ?? tk.t2,
            background:(p?.color ?? tk.t2) + "1f" }}>
          {p?.letter ?? "?"}
        </span>
        <div style={{ flex:1, minWidth:0, fontSize:13 }}>
          <div style={{ color:tk.t1, fontWeight:600, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
            {e.destinatario}<span style={{ color:tk.t2, fontWeight:400 }}> · {e.empresa}</span>
          </div>
          <div style={{ color:tk.t2, marginTop:2 }}>
            {e.municipio}
            {showDate && <> · {fmtDay(e.fecha_realizacion)}</>}
            {from && <> · {from}{to ? `–${to}` : ""}</>}
          </div>
        </div>
      </li>
    );
  };

  return (
    <section aria-labelledby="enc-title" style={{ ...wcard(tk, { padding:"18px 20px" }) }}>
      <div style={{ display:"flex", alignItems:"baseline", justifyContent:"space-between", gap:8, marginBottom:8 }}>
        <PanelTitle id="enc-title" title="Encargos próximos" k="envios" icon={<CarOutlined />} tk={tk} />
        <button type="button" className="dash-link" onClick={onOpen}>Ver envíos <RightOutlined style={{ fontSize:10 }} /></button>
      </div>

      {data.status === "loading" && <Skeleton active title={false} paragraph={{ rows:4 }} />}
      {data.status === "error" && (
        <div style={{ fontSize:13, color:tk.t2 }}>
          No se pudieron cargar los encargos.{" "}
          <button type="button" className="dash-link" onClick={onRetry}>Reintentar</button>
        </div>
      )}
      {data.status === "ok" && (data.data.today.length + data.data.nextDays.length === 0
        ? <p style={{ margin:0, fontSize:13, color:tk.t2 }}>No hay encargos para hoy ni los próximos 5 días.</p>
        : <>
            {data.data.today.length > 0 && (
              <>
                <h3 style={{ fontSize:12, fontWeight:600, color:tk.t2, margin:"4px 0 2px" }}>Hoy</h3>
                <ul style={{ listStyle:"none", margin:0, padding:0 }}>{data.data.today.map((e) => row(e, false))}</ul>
              </>
            )}
            {data.data.nextDays.length > 0 && (
              <>
                <h3 style={{ fontSize:12, fontWeight:600, color:tk.t2, margin:"14px 0 2px" }}>Próximos días</h3>
                <ul style={{ listStyle:"none", margin:0, padding:0 }}>{data.data.nextDays.map((e) => row(e, true))}</ul>
              </>
            )}
          </>)}
    </section>
  );
}

/* ─── Plazos (control de plazos) ─────────────────────────────────────────── */
/* Etapa vigente de cada expediente activo que vence en la ventana (o ya
   venció hace poco). Vencido = rojo; ≤3 días = ámbar; el resto neutro. */
function DeadlinesPanel({ data, tk, onOpen, onRetry }: {
  data: Load<Deadlines>; tk: Tokens; onOpen: () => void; onRetry: () => void;
}) {
  const MAX = 6;
  /* "Míos" = expedientes que creó el usuario (el agendador no guarda un
     responsable aparte). El selector solo aparece si hay de ambos. */
  const all = data.status === "ok" ? data.data.items : [];
  const mineCount = all.filter((i) => i.mine).length;
  const canFilter = mineCount > 0 && mineCount < all.length;
  const [scope, setScope] = useState<"mine" | "all">("mine");
  const items = canFilter && scope === "mine" ? all.filter((i) => i.mine) : all;
  const rel = (iso: string) => {
    const d = dayDiff(iso);
    if (d < 0) return { text: `venció hace ${pl(-d, "día", "días")}`, sev: dueSev(d) };
    if (d === 0) return { text: "vence hoy", sev: dueSev(d) };
    if (d === 1) return { text: "vence mañana", sev: dueSev(d) };
    return { text: `vence en ${d} días`, sev: dueSev(d) };
  };
  const badge = (iso: string) => {
    const dt = new Date(iso + "T12:00:00");
    return (
      <span className="dash-date" aria-hidden>
        <b className="dash-num">{dt.getDate()}</b>
        <small>{dt.toLocaleDateString("es-GT", { month:"short" }).replace(".", "")}</small>
      </span>
    );
  };

  return (
    <section aria-labelledby="plazos-title" style={{ ...wcard(tk), overflow:"hidden" }}>
      <div id="plazos" style={{ display:"flex", alignItems:"baseline", justifyContent:"space-between", gap:8, padding:"18px 20px 14px",
        scrollMarginTop:80 }}>
        <div>
          <PanelTitle id="plazos-title" title="Plazos próximos" k="plazos" icon={<FieldTimeOutlined />} tk={tk} size={18} />
          <p style={{ margin:"6px 0 0 38px", fontSize:13, color:tk.t2 }}>
            Etapas de expedientes que vencen en los próximos {data.status === "ok" ? data.data.windowDays : 14} días.
          </p>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:12, flexShrink:0 }}>
          {canFilter && (
            <Segmented size="small" value={scope} onChange={(v) => setScope(v as "mine" | "all")}
              options={[{ value:"mine", label:`Míos (${mineCount})` }, { value:"all", label:`Todos (${all.length})` }]} />
          )}
          <button type="button" className="dash-link" onClick={onOpen}>Agendador <RightOutlined style={{ fontSize:10 }} /></button>
        </div>
      </div>

      {data.status === "loading" && <div style={{ padding:"0 20px 18px" }}><Skeleton active title={false} paragraph={{ rows:3 }} /></div>}
      {data.status === "error" && (
        <div style={{ padding:"14px 20px 18px", borderTop:`1px solid ${tk.divider}`, fontSize:13, color:tk.t2 }}>
          No se pudieron cargar los plazos.{" "}
          <button type="button" className="dash-link" onClick={onRetry}>Reintentar</button>
        </div>
      )}
      {data.status === "ok" && (
        <>
          {/* Un plazo legal vencido es riesgo, no atraso: va primero y en rojo. */}
          {data.data.staleOverdue > 0 && (
            <button type="button" className="dash-row" onClick={onOpen} style={{ color:sevColor(tk, 2) }}>
              <ExclamationCircleOutlined aria-hidden style={{ fontSize:16, flexShrink:0 }} />
              <span style={{ flex:1, minWidth:0, fontSize:14, fontWeight:500 }}>
                {pl(data.data.staleOverdue, "expediente activo tiene", "expedientes activos tienen")} la etapa vencida hace más de 30 días
              </span>
              <span className="dash-verb" style={{ color:tk.accentText }}>
                <span className="dash-verb-text">Revisar</span>
                <RightOutlined aria-hidden style={{ fontSize:10 }} />
              </span>
            </button>
          )}
          {items.length === 0 ? (
            <div style={{ display:"flex", alignItems:"center", gap:10, padding:"14px 20px",
              borderTop:`1px solid ${tk.divider}`, fontSize:14, color: data.data.staleOverdue > 0 ? tk.t2 : tk.t1 }}>
              {/* Con vencidos no hay "todo bien": sin check verde. */}
              {data.data.staleOverdue === 0 && <CheckCircleOutlined style={{ color:SUCCESS, fontSize:16 }} />}
              {data.data.staleOverdue > 0 ? "Ninguno más vence" : "Ningún plazo vence"} en los próximos {data.data.windowDays} días.
            </div>
          ) : (
            <ul style={{ listStyle:"none", margin:0, padding:0 }}>
              {items.slice(0, MAX).map((it) => {
                const r = rel(it.due);
                return (
                  <li key={it.id}>
                    <button type="button" className="dash-row" onClick={onOpen}>
                      {badge(it.due)}
                      <span style={{ flex:1, minWidth:0 }}>
                        <span style={{ display:"block", fontSize:14, fontWeight:500, overflow:"hidden",
                          textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                          {it.client}
                          <span style={{ color:tk.t2, fontWeight:400 }}> · Exp. {it.expedient}</span>
                        </span>
                        <span style={{ display:"block", marginTop:3, fontSize:13, color:tk.t2, overflow:"hidden",
                          textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                          {join(it.stage, it.process)}
                        </span>
                      </span>
                      <span style={{ fontSize:13, fontWeight:600, whiteSpace:"nowrap", color: r.sev ? sevColor(tk, r.sev) : tk.t2 }}>
                        {r.text}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
          {items.length > MAX && (
            <p style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:12, flexWrap:"wrap",
              margin:0, padding:"12px 20px 16px", borderTop:`1px solid ${tk.divider}`, fontSize:13, color:tk.t2 }}>
              <span>{pl(items.length - MAX, "plazo más", "plazos más")} en la ventana.</span>
              <button type="button" className="dash-link" onClick={onOpen}>Ver todos <RightOutlined style={{ fontSize:10 }} /></button>
            </p>
          )}
        </>
      )}
    </section>
  );
}

/* ─── Mi cargabilidad ────────────────────────────────────────────────────── */
/* Horas del semestre contra la meta, con una marca del ritmo esperado a la
   fecha del reporte (que se sube por Excel: no es en tiempo real). */
const fmtH = (n: number) => `${n.toLocaleString("es-GT", { maximumFractionDigits: 1 })} h`;
const SEM_MONTHS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

function HoursPanel({ data, tk }: { data: MyHours; tk: Tokens }) {
  const { billable, nonBillable, semester, asOf, lastWeek } = data;
  const expected = billable.goal * semester.elapsed;
  const diff = Math.round((billable.hours - expected) * 10) / 10;
  // Ir detrás del ritmo es atraso: ámbar como máximo (La Regla de Severidad).
  const sev: 0 | 1 = diff >= 0 ? 0 : 1;
  const pct = (h: number, g: number) => `${Math.min((h / g) * 100, 100)}%`;
  const [, m1] = semester.start.split("-").map(Number);
  const [y2, m2] = semester.end.split("-").map(Number);
  const staleDays = -dayDiff(asOf);

  const meter = (h: number, g: number, color: string, mark?: number) => (
    <div className="dash-meter" role="img" aria-label={`${fmtH(h)} de ${fmtH(g)}`}>
      <span style={{ width:pct(h, g), background:color }} />
      {mark !== undefined && <i style={{ left:`calc(${Math.min(mark * 100, 100)}% - 1px)` }} title="Ritmo esperado a la fecha" />}
    </div>
  );

  return (
    <section aria-labelledby="horas-title" style={{ ...wcard(tk, { padding:"18px 20px", boxShadow:"none" }) }}>
      <PanelTitle id="horas-title" title="Mi cargabilidad" k="horas" icon={<DashboardOutlined />} tk={tk} size={15} />
      <p style={{ margin:"6px 0 14px 38px", fontSize:13, color:tk.t2 }}>
        Semestre {SEM_MONTHS[m1 - 1]}–{SEM_MONTHS[m2 - 1]} {y2} · reporte al {fmtDay(asOf)}
        {staleDays > 21 && <span style={{ color:sevColor(tk, 1) }}> (hace {staleDays} días)</span>}
      </p>

      <div style={{ display:"flex", alignItems:"baseline", justifyContent:"space-between", gap:8, marginBottom:8 }}>
        <span>
          <span className="dash-num" style={{ fontSize:26, fontWeight:700, letterSpacing:"-.01em", color:tk.t1 }}>
            {fmtH(billable.hours)}
          </span>
          <span style={{ fontSize:13, color:tk.t2 }}> de {fmtH(billable.goal)} cobrables</span>
        </span>
        <span className="dash-num" style={{ fontSize:13, fontWeight:600, color:tk.t2 }}>
          {Math.round((billable.hours / billable.goal) * 100)}%
        </span>
      </div>
      {meter(billable.hours, billable.goal, sev === 0 ? SUCCESS : WARNING, semester.elapsed)}
      <p style={{ margin:"8px 0 0", fontSize:13, fontWeight:500, color: sev ? sevColor(tk, sev) : tk.t2,
        display:"flex", alignItems:"center", gap:6 }}>
        {diff >= 0
          ? <><ArrowUpOutlined aria-hidden style={{ color:SUCCESS }} />Vas {fmtH(diff)} arriba del ritmo</>
          : <><ClockCircleOutlined aria-hidden />Te faltan {fmtH(-diff)} para ir al ritmo</>}
      </p>

      <div style={{ marginTop:16, paddingTop:14, borderTop:`1px solid ${tk.divider}` }}>
        <div style={{ display:"flex", justifyContent:"space-between", gap:8, fontSize:13, marginBottom:6 }}>
          <span style={{ color:tk.t2 }}>No cobrables</span>
          <span className="dash-num" style={{ color:tk.t1, fontWeight:600 }}>
            {fmtH(nonBillable.hours)} <span style={{ color:tk.t2, fontWeight:400 }}>de {fmtH(nonBillable.goal)}</span>
          </span>
        </div>
        {meter(nonBillable.hours, nonBillable.goal, tk.isDark ? "#64748B" : "#94A3B8")}
        {lastWeek && (
          <div style={{ display:"flex", justifyContent:"space-between", gap:8, marginTop:12, fontSize:13 }}>
            <span style={{ color:tk.t2 }}>Semana {lastWeek.week} de {SEM_MONTHS[Number(asOf.slice(5, 7)) - 1]}</span>
            <span className="dash-num" style={{ color:tk.t1, fontWeight:600 }}>{fmtH(lastWeek.hours)}</span>
          </div>
        )}
      </div>
    </section>
  );
}

/* ─── Mi semana ──────────────────────────────────────────────────────────── */
/* Lunes a viernes en una tira: feriados, mis salas, plazos que vencen, quién
   del equipo está fuera y envíos. Lo de días pasados se atenúa. */
const WEEKDAY = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

function WeekStrip({ data, tk, onOpen, onRetry }: {
  data: Load<WeekDay[]>; tk: Tokens; onOpen: (path: string) => void; onRetry: () => void;
}) {
  const today = todayGT();
  // Semana sin nada que mostrar: la tarjeta no ocupa lugar.
  if (data.status === "ok" && data.data.every((d) =>
    !d.holiday && !(d.rooms?.length) && !d.deadlines && !(d.out?.length) && !d.encargos)) return null;
  const dot = (color: string) => (
    <span aria-hidden style={{ width:7, height:7, borderRadius:"50%", background:color, flexShrink:0 }} />
  );
  const isEmpty = (d: WeekDay) =>
    !d.holiday && !(d.rooms?.length) && !d.deadlines && !(d.out?.length) && !d.encargos;

  return (
    <section aria-labelledby="week-title" style={{ ...wcard(tk), overflow:"hidden", marginBottom:16 }}>
      <div style={{ padding:"14px 20px 12px", borderBottom:`1px solid ${tk.divider}` }}>
        <PanelTitle id="week-title" title="Mi semana" k="salas" icon={<CalendarOutlined />} tk={tk} />
      </div>
      {data.status === "loading" && <div style={{ padding:"12px 20px" }}><Skeleton active title={false} paragraph={{ rows:2 }} /></div>}
      {data.status === "error" && (
        <div style={{ padding:"12px 20px", fontSize:13, color:tk.t2 }}>
          No se pudo cargar la semana.{" "}
          <button type="button" className="dash-link" onClick={onRetry}>Reintentar</button>
        </div>
      )}
      {data.status === "ok" && (data.data.every(isEmpty) ? null : (
        <div className="dash-week">
          {data.data.map((d) => {
            const dt = new Date(d.date + "T12:00:00");
            const isToday = d.date === today;
            const rooms = d.rooms ?? [];
            return (
              <div key={d.date} className={`dash-day${isToday ? " is-today" : ""}${d.date < today ? " is-past" : ""}`}
                aria-current={isToday ? "date" : undefined}>
                <div style={{ display:"flex", alignItems:"baseline", gap:6, flexWrap:"wrap" }}>
                  <span style={{ fontSize:13, fontWeight:600, color:tk.t2 }}>
                    {WEEKDAY[dt.getDay()]}
                  </span>
                  <span className="dash-num" style={{ fontSize:16, fontWeight:700, color: isToday ? tk.accentText : tk.t1 }}>
                    {dt.getDate()}
                  </span>
                  {isToday && <span style={{ fontSize:11, fontWeight:600, color:tk.accentText }}>Hoy</span>}
                </div>
                <div style={{ minWidth:0 }}>
                  {d.holiday && (
                    <div className="dash-day-line" style={{ color:sevColor(tk, 1), fontWeight:600 }}>
                      <span>Feriado: {d.holiday}</span>
                    </div>
                  )}
                  {rooms.slice(0, 2).map((r, i) => (
                    <button key={i} type="button" className="dash-day-line dash-link" style={{ fontWeight:400, color:tk.t1 }}
                      onClick={() => onOpen("/dashboard/reservaciones/listar")} title={`Sala ${r.room} · ${r.start}–${r.end}`}>
                      {dot(hue(tk, "salas").fg)}<span className="dash-num">{r.start}</span><span>Sala {r.room}</span>
                    </button>
                  ))}
                  {rooms.length > 2 && <div className="dash-day-line" style={{ color:tk.t2 }}><span>+{pl(rooms.length - 2, "sala más", "salas más")}</span></div>}
                  {!!d.deadlines && (
                    <button type="button" className="dash-day-line dash-link" style={{ fontWeight:500, color:tk.t1 }}
                      onClick={() => onOpen("/dashboard/agendador")}>
                      {dot(hue(tk, "plazos").fg)}<span>{pl(d.deadlines, "plazo vence", "plazos vencen")}</span>
                    </button>
                  )}
                  {!!d.encargos && (
                    <button type="button" className="dash-day-line dash-link" style={{ fontWeight:400, color:tk.t1 }}
                      onClick={() => onOpen("/dashboard/mensajeria")}>
                      {dot(hue(tk, "envios").fg)}<span>{pl(d.encargos, "envío", "envíos")}</span>
                    </button>
                  )}
                  {!!d.out?.length && (
                    <div className="dash-day-line" title={`Fuera: ${d.out.join(", ")}`}>
                      {dot(hue(tk, "equipo").fg)}<span style={{ color:tk.t2 }}>Fuera: {d.out.join(", ")}</span>
                    </div>
                  )}
                  {isEmpty(d) && <div className="dash-day-line" style={{ color:tk.t2 }}><span>Libre</span></div>}
                </div>
              </div>
            );
          })}
        </div>
      ))}
    </section>
  );
}

/* ─── Recientes (en la franja) ───────────────────────────────────────────── */
const GENERIC_PAGE = /^(general|lista|listado|calendario|dashboard|pendientes|entregados|catálogos|ver |listar |crear |subir )/i;
function RecentChips({ username, onOpen, tk }: { username: string | null; onOpen: (path: string) => void; tk: Tokens }) {
  const [pages, setPages] = useState<RecentPage[]>(() => getRecentPages(username));
  useEffect(() => {
    setPages(getRecentPages(username));
    return onRecentPagesChange(() => setPages(getRecentPages(username)));
  }, [username]);
  if (pages.length === 0) return null;
  return (
    <nav className="dash-recent" aria-label="Accesos recientes">
      <span style={{ display:"inline-flex", alignItems:"center", gap:6, fontWeight:600, color:tk.t2, flexShrink:0 }}>
        <HistoryOutlined aria-hidden /> Recientes
      </span>
      {pages.slice(0, 4).map((p) => {
        const full = p.parent ? `${p.parent} · ${p.label}` : p.label;
        // El nombre de la pantalla basta; el módulo solo si el nombre es genérico.
        const text = p.parent && GENERIC_PAGE.test(p.label) ? full : p.label;
        return (
          <button key={p.path} type="button" className="dash-recent-link" onClick={() => onOpen(p.path)} title={full}>
            {text}
          </button>
        );
      })}
    </nav>
  );
}

/* ─── Página ──────────────────────────────────────────────────────────────── */
async function settle<T>(p: Promise<T>): Promise<Load<T>> {
  try { return { status:"ok", data: await p }; } catch { return { status:"error" }; }
}

export default function DashboardPage() {
  const [inbox, setInbox]         = useState<Load<Inbox>>({ status:"loading" });
  const [mine, setMine]           = useState<Load<Mine>>({ status:"loading" });
  const [team, setTeam]           = useState<Load<VacationSummary>>({ status:"loading" });
  const [encargos, setEncargos]   = useState<Load<UpcomingItems>>({ status:"loading" });
  const [plazos, setPlazos]       = useState<Load<Deadlines | null>>({ status:"loading" });
  const [hours, setHours]         = useState<Load<MyHours | null>>({ status:"loading" });
  const [week, setWeek]           = useState<Load<WeekDay[]>>({ status:"loading" });
  /* Actualización automática: cuántos pendientes llegaron desde que el
     usuario vio la bandeja por última vez (se limpia al actualizar a mano). */
  const [newCount, setNewCount]   = useState(0);
  const lastTotal = useRef<number | null>(null);
  const lastLoad  = useRef(0);
  const [refreshing, setRefreshing] = useState(false);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);

  const navigate   = useNavigate();
  const username   = useAuthStore((s) => s.username);
  const firstName  = useAuthStore((s) => s.firstName);
  const tipo       = useAuthStore((s) => s.tipo_usuario);
  const modules    = useAuthStore((s) => s.modules);
  const isDark     = useThemeStore((s) => s.mode === "dark");
  const tk         = makeTokens(isDark);

  const has = useCallback((k: ModuleKey) => modules.some((m) => m.key === k), [modules]);
  const showEncargos = has("encargos");
  const hasHr = has("recursos_humanos");
  const hasRooms = has("reservas_salas");
  const hasPlazos = has("control_plazos");

  const load = useCallback(async (auto = false) => {
    setRefreshing(true);
    const [i, m, t, e, pz, hr, wk] = await Promise.all([
      settle(fetchInbox()),
      settle(fetchMine()),
      settle(fetchVacationSummary()),
      showEncargos ? settle(fetchUpcomingItems()) : Promise.resolve<Load<UpcomingItems>>({ status:"loading" }),
      hasPlazos ? settle(fetchDeadlines()) : Promise.resolve<Load<Deadlines | null>>({ status:"ok", data:null }),
      settle(fetchMyHours()),
      settle(fetchWeek()),
    ]);
    // En automático, una fuente que falla no borra lo que ya se veía.
    if (!auto || i.status === "ok") setInbox(i);
    if (!auto || m.status === "ok") setMine(m);
    if (!auto || t.status === "ok") setTeam(t);
    if (!auto || e.status === "ok") setEncargos(e);
    if (!auto || pz.status === "ok") setPlazos(pz);
    if (!auto || hr.status === "ok") setHours(hr);
    if (!auto || wk.status === "ok") setWeek(wk);

    if (i.status === "ok") {
      const total = INBOX_ITEMS.reduce((a, it) => a + ((i.data[it.key] as number | null | undefined) ?? 0), 0);
      if (auto && lastTotal.current !== null && total > lastTotal.current) {
        setNewCount((n) => n + total - (lastTotal.current as number));
      }
      if (!auto) setNewCount(0);
      lastTotal.current = total;
    }
    lastLoad.current = Date.now();
    setUpdatedAt(new Date());
    setRefreshing(false);
  }, [showEncargos, hasPlazos]);

  useEffect(() => { load(); }, [load]);

  /* Cada 5 min con la pestaña visible; al volver a la pestaña, si ya pasaron. */
  useEffect(() => {
    const EVERY = 5 * 60_000;
    const tick = () => {
      if (document.visibilityState === "visible" && Date.now() - lastLoad.current >= EVERY - 1000) load(true);
    };
    const id = window.setInterval(tick, EVERY);
    document.addEventListener("visibilitychange", tick);
    return () => { window.clearInterval(id); document.removeEventListener("visibilitychange", tick); };
  }, [load]);

  /* "Nuevo": solo lo que el usuario puede crear (mismo criterio que el menú). */
  const createItems: MenuProps["items"] = [
    has("notificaciones") && { key:"/dashboard/notificaciones/crear", label:"Notificación" },
    { key:"/dashboard/documentos/crear", label:"Documento" },
    showEncargos && tipo !== 8 && { key:"/dashboard/mensajeria/crear", label:"Envío de mensajería" },
    has("solicitudes_dinero") && { key:"/dashboard/money-req/create", label:"Requerimiento de dinero" },
    hasRooms && { key:"/dashboard/reservaciones/crear", label:"Reserva de sala" },
    hasHr && { key:"/dashboard/recursos-humanos/vacaciones", label:"Solicitud de vacaciones" },
  ].filter(Boolean) as MenuProps["items"];

  // Solo el primer nombre, en tipo oración: en BD muchos vienen en MAYÚSCULAS
  // y el nombre completo ocupaba tres líneas en el teléfono.
  const first = (firstName || "").trim().split(/\s+/)[0];
  const displayName = first
    ? first.charAt(0).toUpperCase() + first.slice(1).toLowerCase()
    : username || "Usuario";
  /* Derivados de /mine: una sola llamada alimenta "Mis solicitudes" y la agenda. */
  const myRequests: Load<Mine["requests"]> =
    mine.status === "ok" ? { status:"ok", data: mine.data.requests } : mine;
  const showMyRequests = mine.status !== "ok" || Object.keys(mine.data.requests).length > 0;
  const agenda: Load<AgendaItem[] | null> =
    mine.status === "ok" ? { status:"ok", data: mine.data.agenda ?? null } : mine;
  const showAgenda = hasRooms && (mine.status !== "ok" || mine.data.agenda !== undefined);

  /* Franja: resumen de la bandeja (cuántos pendientes y cuántos urgentes).
     El detalle vive en Pendientes; aquí no se repite la primera fila. */
  const band = bandColors(tk);
  const todayIso = todayGT();
  const roomsToday = mine.status === "ok" ? (mine.data.agenda ?? []).filter((a) => a.date === todayIso).length : 0;
  const summary = (() => {
    if (inbox.status !== "ok") return null;
    const ranked = rankRows(INBOX_ITEMS, inbox.data, inbox.data.details, true);
    const total = ranked.reduce((a, r) => a + ((inbox.data[r.i.key] as number) ?? 0), 0);
    const urgentRows = ranked.filter((r) => (r.det?.sev ?? 0) === 2).length;
    const watchRows = ranked.filter((r) => (r.det?.sev ?? 0) === 1).length;
    return { total, rows: ranked.length, urgentRows, watchRows };
  })();
  /* Plazos legales vencidos: el riesgo más alto del despacho va en la franja. */
  const overduePlazos = plazos.status === "ok" && plazos.data
    ? plazos.data.staleOverdue + plazos.data.items.filter((i) => dayDiff(i.due) < 0).length
    : 0;
  const plazosPanel = hasPlazos && !(plazos.status === "ok" && plazos.data === null) && (
    <DeadlinesPanel tk={tk} onRetry={() => load()} onOpen={() => navigate("/dashboard/agendador")}
      data={plazos.status === "ok" ? { status:"ok", data: plazos.data as Deadlines } : plazos} />
  );
  const updatedStr = updatedAt
    ? `Actualizado ${updatedAt.toLocaleTimeString("es-GT", { hour:"2-digit", minute:"2-digit", hour12:false })}`
    : null;

  const dateStr = new Date().toLocaleDateString("es-GT", { weekday:"long", day:"numeric", month:"long", year:"numeric" });

  return (
    <>
      <style>{makeDashCSS(tk)}</style>

      <div className="dash-in dash-page" style={{ background:tk.bg, minHeight:"calc(100vh - 112px)",
        fontFamily:"'Plus Jakarta Sans',sans-serif" }}>

        <header className="dash-band" style={{ background:band.bg, color:band.text }}>
          <div style={{ minWidth:0 }}>
            <div style={{ display:"flex", alignItems:"baseline", columnGap:14, rowGap:2, flexWrap:"wrap" }}>
              <h1 style={{ margin:0, fontSize:22, fontWeight:700, letterSpacing:"-.01em", color:band.text }}>
                Bienvenido, {displayName}
              </h1>
              <span style={{ fontSize:13, color:band.sub }}>
                {dateStr.charAt(0).toUpperCase() + dateStr.slice(1)}
                {updatedStr && <> · {updatedStr}</>}
              </span>
            </div>
            {summary && (
              <p className="dash-summary">
                {summary.total === 0 ? (
                  <span><CheckCircleOutlined aria-hidden style={{ color:SUCCESS, marginRight:6 }} />
                    {overduePlazos > 0 ? "Nada espera tu acción en tus módulos." : "Estás al día: nada espera tu acción."}</span>
                ) : (
                  <>
                    <span><b className="dash-num">{summary.total.toLocaleString("es-GT")}</b> {summary.total === 1 ? "pendiente" : "pendientes"}{" "}
                      en <b className="dash-num">{summary.rows}</b> {summary.rows === 1 ? "bandeja" : "bandejas"}</span>
                    {summary.urgentRows > 0 && (
                      <span><ExclamationCircleOutlined aria-hidden style={{ color:DANGER, marginRight:6 }} />
                        <b className="dash-num">{summary.urgentRows}</b> {summary.urgentRows === 1 ? "urgente para hoy" : "urgentes para hoy"}</span>
                    )}
                    {summary.watchRows > 0 && (
                      <span><ClockCircleOutlined aria-hidden style={{ color:WARNING, marginRight:6 }} />
                        <b className="dash-num">{summary.watchRows}</b> con atraso</span>
                    )}

                    {newCount > 0 && (
                      <button type="button" className="dash-new" aria-live="polite"
                        onClick={() => { setNewCount(0); document.getElementById("inbox-title")?.scrollIntoView({ behavior:"smooth", block:"start" }); }}>
                        +{newCount.toLocaleString("es-GT")} {newCount === 1 ? "nuevo" : "nuevos"}
                      </button>
                    )}
                  </>
                )}
                {overduePlazos > 0 && (
                  <button type="button" className="dash-link" style={{ color:sevColor(tk, 2), fontWeight:500 }}
                    onClick={() => document.getElementById("plazos")?.scrollIntoView({ behavior:"smooth", block:"start" })}>
                    <ExclamationCircleOutlined aria-hidden />
                    <b className="dash-num">{overduePlazos.toLocaleString("es-GT")}</b>
                    {overduePlazos === 1 ? "plazo vencido" : "plazos vencidos"}
                  </button>
                )}
              </p>
            )}
            <RecentChips username={username} onOpen={navigate} tk={tk} />
            {roomsToday > 0 && (
              <p style={{ margin:"6px 0 0", fontSize:13, color:band.sub }}>
                {pl(roomsToday, "sala reservada hoy", "salas reservadas hoy")} · ver Mi agenda
              </p>
            )}
          </div>
          <div className="dash-band-tools">
            <GlobalSearch tk={tk} />
            <Tooltip title={updatedStr ?? "Actualizar"}>
              <Button aria-label="Actualizar" icon={<ReloadOutlined spin={refreshing} />}
                onClick={() => load()} disabled={refreshing} />
            </Tooltip>
            {createItems && createItems.length > 0 && (
              <Dropdown trigger={["click"]} menu={{ items:createItems, onClick:({ key }) => navigate(key) }}>
                <Button type="primary" icon={<PlusOutlined />}>Nuevo <DownOutlined style={{ fontSize:10 }} /></Button>
              </Dropdown>
            )}
          </div>
        </header>

        <WeekStrip data={week} tk={tk} onOpen={navigate} onRetry={() => load()} />

        <Row gutter={[16, 16]}>
          <Col xs={24} lg={16} style={{ display:"flex", flexDirection:"column", gap:16 }}>
            {/* Con plazos legales vencidos, Plazos va primero: es el mayor riesgo del despacho. */}
            {overduePlazos > 0 && plazosPanel}
            <CountPanel id="inbox-title" title="Pendientes" subtitle="Lo que espera tu acción en tus módulos."
              titleHue="bandeja" titleIcon={<InboxOutlined />}
              items={INBOX_ITEMS} data={inbox} tone="action" preview
              details={inbox.status === "ok" ? inbox.data.details : undefined}
              emptyText="Todo al día. Nada espera tu acción por ahora."
              tk={tk} onOpen={navigate} onRetry={() => load()} />
            {overduePlazos === 0 && plazosPanel}
            {showMyRequests && (
              <CountPanel id="mine-title" title="Mis solicitudes" subtitle="Lo que pediste y sigue en trámite."
                titleHue="tramite" titleIcon={<HourglassOutlined />}
                items={MY_REQUEST_ITEMS} data={myRequests} tone="waiting"
                details={mine.status === "ok" ? mine.data.requestDetails : undefined}
                emptyText="No tienes solicitudes en trámite."
                tk={tk} onOpen={navigate} onRetry={() => load()} />
            )}
            {showEncargos && !(encargos.status === "ok" && encargos.data.today.length + encargos.data.nextDays.length === 0) && (
              <EncargosPanel data={encargos} tk={tk} onRetry={() => load()}
                onOpen={() => navigate("/dashboard/mensajeria")} />
            )}
          </Col>
          <Col xs={24} lg={8} style={{ display:"flex", flexDirection:"column", gap:16 }}>
            {hours.status === "ok" && hours.data && <HoursPanel data={hours.data} tk={tk} />}
            {showAgenda && (
              <AgendaPanel data={agenda} rooms={mine.status === "ok" ? mine.data.roomsNow : undefined} tk={tk} onRetry={() => load()}
                onOpen={() => navigate("/dashboard/reservaciones/listar")}
                onCreate={() => navigate("/dashboard/reservaciones/crear")} />
            )}
            <TeamPanel data={team} balance={mine.status === "ok" ? mine.data.vacationBalance : undefined} tk={tk} onRetry={() => load()}
              onOpen={hasHr ? () => navigate("/dashboard/recursos-humanos/vacaciones") : undefined} />
            <Suspense fallback={<div style={{ ...wcard(tk, { padding:"18px 20px" }) }}><Skeleton active paragraph={{ rows:4 }} /></div>}>
              <ExchangeRateCard tk={tk} />
            </Suspense>
          </Col>
        </Row>
      </div>
    </>
  );
}
