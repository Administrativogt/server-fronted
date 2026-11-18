import { useEffect, useState, useCallback, lazy, Suspense, type CSSProperties, type ReactNode } from "react";
import { Button, Col, Dropdown, Row, Skeleton, Tooltip, type MenuProps } from "antd";
import {
  BankOutlined, BellOutlined, CalendarOutlined, CarOutlined, CheckCircleOutlined, ClockCircleOutlined,
  DownOutlined, FileTextOutlined, HourglassOutlined, IdcardOutlined, InboxOutlined, ScheduleOutlined,
  SendOutlined, TeamOutlined, WalletOutlined, PlusOutlined, ReloadOutlined, RightOutlined,
} from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import useAuthStore from "../auth/useAuthStore";
import useThemeStore from "../hooks/useThemeStore";
import type { ModuleKey } from "../types/module-access.types";
import {
  fetchInbox, fetchMine, fetchVacationSummary, fetchUpcomingItems,
  type AgendaItem, type Inbox, type InboxDetail, type InboxKey, type Mine, type MyRequestKey, type RoomNow, type VacationBalance,
  type VacationSummary, type UpcomingItems,
} from "../api/dashboard";
import GlobalSearch from "./dashboard/GlobalSearch";
import { DANGER, INFO, SUCCESS, WARNING, type HueKey, type Tokens, bandColors, hue, makeTokens, wcard, makeDashCSS } from "./dashboard/theme";

const ExchangeRateCard = lazy(() => import("./dashboard/ExchangeRateCard"));

/* El inicio es una bandeja: lo que espera la acción del usuario en SUS
   módulos (decidido por el backend con la misma lógica de cada pantalla).
   Lo demás —equipo, encargos, tipo de cambio— es contexto y va después. */

type Load<T> = { status: "loading" } | { status: "ok"; data: T } | { status: "error" };

const fmtDay = (iso: string) =>
  new Date(iso.slice(0, 10) + "T12:00:00").toLocaleDateString("es-GT", { day:"numeric", month:"short" });

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
) => { text: string; sev: Severity } | null;

type CountItem<K extends string> = {
  key: K; label: string; path: string; hue: HueKey; icon: ReactNode;
  /** Acción que se hace al abrir (Autorizar, Liquidar, Aceptar…) */
  verb: string;
  detail?: DetailFn<K>;
};

const pl = (n: number, one: string, many: string) => `${n.toLocaleString("es-GT")} ${n === 1 ? one : many}`;

/* Fechas en hora de Guatemala */
const todayGT = () => new Date().toLocaleDateString("en-CA", { timeZone:"America/Guatemala" });
const dayDiff = (iso: string) =>
  Math.round((Date.parse(iso.slice(0, 10) + "T12:00:00Z") - Date.parse(todayGT() + "T12:00:00Z")) / 86_400_000);
/** "de hoy", "de ayer", "de hace 9 días", "desde mar 2025" */
const ago = (iso: string) => {
  const d = -dayDiff(iso);
  if (d <= 0) return "de hoy";
  if (d === 1) return "de ayer";
  if (d < 60) return `de hace ${d} días`;
  return `desde ${new Date(iso.slice(0, 10) + "T12:00:00").toLocaleDateString("es-GT", { month:"short", year:"numeric" })}`;
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

/** Monto + "el más antiguo de hace N días"; urgencia por antigüedad. */
const moneyAndAge = (warnDays: number, dangerDays: number): DetailFn<string> => (_c, det) => {
  if (!det) return null;
  const age = det.oldest ? -dayDiff(det.oldest) : 0;
  const text = join(money(det.amounts), det.oldest && `el más antiguo ${ago(det.oldest)}`);
  return text ? { text, sev: age > dangerDays ? 2 : age > warnDays ? 1 : 0 } : null;
};
/** "el más antiguo de hace N días" (para bandejas de aceptación) */
const oldestOnly = (noun: string): DetailFn<string> => (_c, det) => {
  if (!det?.oldest) return null;
  const age = -dayDiff(det.oldest);
  return { text: `${noun} ${ago(det.oldest)}`, sev: age > 7 ? 2 : age > 2 ? 1 : 0 };
};

const INBOX_ITEMS: CountItem<InboxKey>[] = [
  { key:"checksToAuthorize", hue:"cheques", icon:<BankOutlined />, verb:"Autorizar",
    label:"Cheques por autorizar", path:"/dashboard/cheques/autorizacion",
    detail: moneyAndAge(5, 14) },
  { key:"checksToLiquidate", hue:"cheques", icon:<BankOutlined />, verb:"Liquidar",
    label:"Cheques por liquidar", path:"/dashboard/cheques/liquidacion",
    detail: (c) => {
      const o30 = c.checksToLiquidateOver30 ?? 0, o60 = c.checksToLiquidateOver60 ?? 0;
      if (o30 <= 0) return null;
      // Si todos los viejos pasan de 60 días, decirlo una sola vez.
      if (o60 >= o30) return { text: pl(o60, "lleva más de 60 días", "llevan más de 60 días"), sev: 2 };
      return {
        text: pl(o30, "lleva más de 30 días", "llevan más de 30 días") + (o60 > 0 ? ` (${o60.toLocaleString("es-GT")} más de 60)` : ""),
        sev: o60 > 0 ? 2 : 1,
      };
    } },
  { key:"moneyReqToAuthorize", hue:"dinero", icon:<WalletOutlined />, verb:"Autorizar",
    label:"Requerimientos de dinero por autorizar", path:"/dashboard/money-req?vista=por-autorizar",
    detail: moneyAndAge(3, 7) },
  { key:"vacationsToApprove", hue:"equipo", icon:<CalendarOutlined />, verb:"Revisar",
    label:"Vacaciones de tu equipo por aprobar", path:"/dashboard/recursos-humanos/vacaciones",
    detail: (_c, det) => {
      if (!det?.next) return null;
      const d = dayDiff(det.next);
      return { text: `la próxima inicia ${when(det.next)}`, sev: d <= 2 ? 2 : d <= 7 ? 1 : 0 };
    } },
  { key:"roomsToApprove", hue:"salas", icon:<ScheduleOutlined />, verb:"Aprobar",
    label:"Reservas de sala por aprobar", path:"/dashboard/reservaciones/listar",
    detail: (_c, det) => {
      if (!det?.next) return null;
      const today = det.today ?? 0;
      return {
        text: join(today > 0 && `${today} para hoy`, `la próxima ${when(det.next, det.nextTime)}`),
        sev: today > 0 ? 2 : dayDiff(det.next) <= 1 ? 1 : 0,
      };
    } },
  { key:"sirvoRequests", hue:"sirvo", icon:<SendOutlined />, verb:"Pedir",
    label:"Solicitudes por pedir en Sirvo", path:"/dashboard/migracion/sirvo" },
  { key:"appointmentsExpiring", hue:"nombramientos", icon:<IdcardOutlined />, verb:"Revisar",
    label:"Nombramientos que vencen en 60 días", path:"/dashboard/appointments",
    detail: (_c, det) => {
      if (!det?.next) return null;
      const d = dayDiff(det.next);
      return { text: join(`el próximo vence ${when(det.next)}`, det.nextLabel), sev: d <= 7 ? 2 : d <= 30 ? 1 : 0 };
    } },
  { key:"notificationsToAccept", hue:"notificaciones", icon:<BellOutlined />, verb:"Aceptar",
    label:"Notificaciones por aceptar", path:"/dashboard/notificaciones/entregadas",
    detail: oldestOnly("la más antigua") },
  { key:"documentsToAccept", hue:"documentos", icon:<FileTextOutlined />, verb:"Aceptar",
    label:"Documentos por aceptar", path:"/dashboard/documentos/entregados",
    detail: oldestOnly("el más antiguo") },
  { key:"encargosToday", hue:"envios", icon:<CarOutlined />, verb:"Ver",
    label:"Envíos programados para hoy", path:"/dashboard/mensajeria",
    detail: (_c, det) => (det?.priorityA ? { text: pl(det.priorityA, "de prioridad A", "de prioridad A"), sev: 1 } : null) },
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
function CountPanel<K extends string>({ id, title, subtitle, titleHue, titleIcon, items, data, details, tone, emptyText, tk, onOpen, onRetry }: {
  id: string; title: string; subtitle: string; titleHue: HueKey; titleIcon: ReactNode;
  items: CountItem<K>[]; data: Load<Partial<Record<K, number | null>>>;
  details?: Partial<Record<K, InboxDetail>>;
  tone: "action" | "waiting"; emptyText: string;
  tk: Tokens; onOpen: (path: string) => void; onRetry: () => void;
}) {
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
            {pending.map(({ i, det }) => (
              <li key={i.key}>
                <button type="button" className="dash-row" onClick={() => onOpen(i.path)}>
                  <HueChip k={i.hue} icon={i.icon} tk={tk} />
                  <span style={{ flex:1, minWidth:0 }}>
                    <span style={{ display:"block", fontSize:14, fontWeight:500 }}>{i.label}</span>
                    {det && (
                      <span style={{ display:"flex", alignItems:"baseline", gap:6, marginTop:3, fontSize:13, color:tk.t2 }}>
                        {tone === "action" && det.sev > 0 && (
                          <ClockCircleOutlined aria-hidden style={{ color: det.sev === 2 ? DANGER : WARNING, flexShrink:0 }} />
                        )}
                        <span>{det.text}</span>
                      </span>
                    )}
                  </span>
                  <span className="dash-num" style={{ fontSize: tone === "action" ? 18 : 16, fontWeight:700 }}>
                    {(d[i.key] as number).toLocaleString("es-GT")}
                  </span>
                  <span className="dash-verb" style={{ color:tk.accentText }}>
                    <span className="dash-verb-text">{i.verb}</span>
                    <RightOutlined aria-hidden style={{ fontSize:10 }} />
                  </span>
                </button>
              </li>
            ))}
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
            <CheckCircleOutlined style={{ color:SUCCESS, marginRight:6 }} />
            Al día: {clear.map((i) => i.label.toLowerCase()).join(" · ")}
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
          {dot}<span style={{ fontWeight:600 }}>Resto del día:</span>{" "}
          {freeAllDay.map((r) => r.name).join(", ")}
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
    <section aria-labelledby="agenda-title" style={{ ...wcard(tk, { padding:"18px 20px" }) }}>
      <div style={{ display:"flex", alignItems:"baseline", justifyContent:"space-between", gap:8, marginBottom:8 }}>
        <PanelTitle id="agenda-title" title="Mi agenda" k="salas" icon={<ScheduleOutlined />} tk={tk} />
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
        <p style={{ margin:0, fontSize:13, color:tk.t2 }}>No tienes salas reservadas hoy ni mañana.</p>
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
    <section aria-labelledby="team-title" style={{ ...wcard(tk, { padding:"18px 20px" }) }}>
      <div style={{ display:"flex", alignItems:"baseline", justifyContent:"space-between", gap:8, marginBottom:12 }}>
        <PanelTitle id="team-title" title="Equipo" k="equipo" icon={<TeamOutlined />} tk={tk} />
        {onOpen && (
          <button type="button" className="dash-link" onClick={onOpen}>Vacaciones <RightOutlined style={{ fontSize:10 }} /></button>
        )}
      </div>

      {balance && (
        <div style={{ padding:"10px 12px", marginBottom:14, borderRadius:8, background:tk.subtle, border:tk.borderCss }}>
          <div style={{ fontSize:13, color:tk.t2 }}>Tu saldo de vacaciones</div>
          <div className="dash-num" style={{ fontSize:16, fontWeight:700, color: balance.days < 0 ? DANGER : tk.t1, marginTop:2 }}>
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
          <h3 style={sub}>Fuera hoy</h3>
          {data.data.onVacation.length === 0
            ? <p style={{ margin:"0 0 4px", fontSize:13, color:tk.t2 }}>Todo el equipo está hoy.</p>
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

/* ─── Página ──────────────────────────────────────────────────────────────── */
async function settle<T>(p: Promise<T>): Promise<Load<T>> {
  try { return { status:"ok", data: await p }; } catch { return { status:"error" }; }
}

export default function DashboardPage() {
  const [inbox, setInbox]         = useState<Load<Inbox>>({ status:"loading" });
  const [mine, setMine]           = useState<Load<Mine>>({ status:"loading" });
  const [team, setTeam]           = useState<Load<VacationSummary>>({ status:"loading" });
  const [encargos, setEncargos]   = useState<Load<UpcomingItems>>({ status:"loading" });
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

  const load = useCallback(async () => {
    setRefreshing(true);
    const [i, m, t, e] = await Promise.all([
      settle(fetchInbox()),
      settle(fetchMine()),
      settle(fetchVacationSummary()),
      showEncargos ? settle(fetchUpcomingItems()) : Promise.resolve<Load<UpcomingItems>>({ status:"loading" }),
    ]);
    setInbox(i); setMine(m); setTeam(t); setEncargos(e);
    setUpdatedAt(new Date());
    setRefreshing(false);
  }, [showEncargos]);

  useEffect(() => { load(); }, [load]);

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

  /* Franja: lo MÁS urgente (la primera fila de Pendientes por urgencia), no
     una suma de cosas distintas. Si nada urgente, un estado tranquilo. */
  const band = bandColors(tk);
  const todayIso = todayGT();
  const roomsToday = mine.status === "ok" ? (mine.data.agenda ?? []).filter((a) => a.date === todayIso).length : 0;
  const urgent = (() => {
    if (inbox.status !== "ok") return null;
    const ranked = rankRows(INBOX_ITEMS, inbox.data, inbox.data.details, true);
    const top = ranked[0];
    if (top && (top.det?.sev ?? 0) > 0) {
      return { kind:"urgent" as const, path: top.i.path,
        text: `${top.i.label} (${(inbox.data[top.i.key] as number).toLocaleString("es-GT")})`, detail: top.det?.text ?? null };
    }
    const total = ranked.reduce((a, r) => a + ((inbox.data[r.i.key] as number) ?? 0), 0);
    return { kind:"calm" as const, path: null,
      text: total > 0 ? `Tienes ${pl(total, "pendiente", "pendientes")} y nada urgente por ahora.` : "Estás al día: nada espera tu acción.",
      detail: null };
  })();
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
            {urgent && (urgent.kind === "urgent" ? (
              <button type="button" className="band-urgent" onClick={() => navigate(urgent.path)}>
                <span className="band-urgent-tag">Lo más urgente</span>
                <span>
                  <strong style={{ fontWeight:600 }}>{urgent.text}</strong>
                  {urgent.detail && <span style={{ color:band.sub }}> · {urgent.detail}</span>}
                </span>
                <RightOutlined aria-hidden style={{ fontSize:11 }} />
              </button>
            ) : (
              <p style={{ margin:"10px 0 0", fontSize:14, color:band.text, display:"flex", alignItems:"center", gap:8 }}>
                <CheckCircleOutlined aria-hidden />
                {urgent.text}
              </p>
            ))}
            {roomsToday > 0 && (
              <p style={{ margin:"4px 0 0", fontSize:13, color:band.sub }}>
                {pl(roomsToday, "sala reservada hoy", "salas reservadas hoy")} · ver Mi agenda
              </p>
            )}
          </div>
          <div className="dash-band-tools">
            <GlobalSearch tk={tk} />
            <Tooltip title={updatedStr ?? "Actualizar"}>
              <Button ghost className="band-ghost" aria-label="Actualizar" icon={<ReloadOutlined spin={refreshing} />}
                onClick={load} disabled={refreshing} />
            </Tooltip>
            {createItems && createItems.length > 0 && (
              <Dropdown trigger={["click"]} menu={{ items:createItems, onClick:({ key }) => navigate(key) }}>
                <Button className="band-primary" icon={<PlusOutlined />}>Nuevo <DownOutlined style={{ fontSize:10 }} /></Button>
              </Dropdown>
            )}
          </div>
        </header>

        <Row gutter={[16, 16]}>
          <Col xs={24} lg={16} style={{ display:"flex", flexDirection:"column", gap:16 }}>
            <CountPanel id="inbox-title" title="Pendientes" subtitle="Lo que espera tu acción en tus módulos."
              titleHue="bandeja" titleIcon={<InboxOutlined />}
              items={INBOX_ITEMS} data={inbox} tone="action"
              details={inbox.status === "ok" ? inbox.data.details : undefined}
              emptyText="Todo al día. Nada espera tu acción por ahora."
              tk={tk} onOpen={navigate} onRetry={load} />
            {showMyRequests && (
              <CountPanel id="mine-title" title="Mis solicitudes" subtitle="Lo que pediste y sigue en trámite."
                titleHue="tramite" titleIcon={<HourglassOutlined />}
                items={MY_REQUEST_ITEMS} data={myRequests} tone="waiting"
                details={mine.status === "ok" ? mine.data.requestDetails : undefined}
                emptyText="No tienes solicitudes en trámite."
                tk={tk} onOpen={navigate} onRetry={load} />
            )}
            {showEncargos && (
              <EncargosPanel data={encargos} tk={tk} onRetry={load}
                onOpen={() => navigate("/dashboard/mensajeria")} />
            )}
          </Col>
          <Col xs={24} lg={8} style={{ display:"flex", flexDirection:"column", gap:16 }}>
            {showAgenda && (
              <AgendaPanel data={agenda} rooms={mine.status === "ok" ? mine.data.roomsNow : undefined} tk={tk} onRetry={load}
                onOpen={() => navigate("/dashboard/reservaciones/listar")}
                onCreate={() => navigate("/dashboard/reservaciones/crear")} />
            )}
            <TeamPanel data={team} balance={mine.status === "ok" ? mine.data.vacationBalance : undefined} tk={tk} onRetry={load}
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
