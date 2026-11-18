import { useEffect, useState, useCallback, lazy, Suspense, type CSSProperties, type ReactNode } from "react";
import { Button, Col, Dropdown, Row, Skeleton, type MenuProps } from "antd";
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
  type AgendaItem, type Inbox, type InboxKey, type Mine, type MyRequestKey, type RoomNow, type VacationBalance,
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
type CountItem<K extends string> = {
  key: K; label: string; path: string; hue: HueKey; icon: ReactNode;
  /** Segunda línea opcional (p. ej. antigüedad); severe = rojo, si no ámbar. */
  detail?: (d: Partial<Record<K, number | null>>) => { text: string; severe: boolean } | null;
};

const pl = (n: number, one: string, many: string) => `${n.toLocaleString("es-GT")} ${n === 1 ? one : many}`;

const INBOX_ITEMS: CountItem<InboxKey>[] = [
  { key:"checksToAuthorize", hue:"cheques", icon:<BankOutlined />,     label:"Cheques por autorizar",              path:"/dashboard/cheques/autorizacion" },
  { key:"checksToLiquidate", hue:"cheques", icon:<BankOutlined />,     label:"Cheques por liquidar",               path:"/dashboard/cheques/liquidacion",
    detail: (d) => {
      const o30 = d.checksToLiquidateOver30 ?? 0, o60 = d.checksToLiquidateOver60 ?? 0;
      if (o30 <= 0) return null;
      // Si todos los viejos pasan de 60 días, decirlo una sola vez.
      if (o60 >= o30) return { text: pl(o60, "lleva más de 60 días", "llevan más de 60 días"), severe: true };
      const text = pl(o30, "lleva más de 30 días", "llevan más de 30 días")
        + (o60 > 0 ? ` (${o60.toLocaleString("es-GT")} más de 60)` : "");
      return { text, severe: o60 > 0 };
    } },
  { key:"moneyReqToAuthorize", hue:"dinero", icon:<WalletOutlined />,   label:"Requerimientos de dinero por autorizar", path:"/dashboard/money-req?vista=por-autorizar" },
  { key:"vacationsToApprove", hue:"equipo", icon:<CalendarOutlined />,    label:"Vacaciones de tu equipo por aprobar", path:"/dashboard/recursos-humanos/vacaciones" },
  { key:"roomsToApprove", hue:"salas", icon:<ScheduleOutlined />,        label:"Reservas de sala por aprobar",       path:"/dashboard/reservaciones/listar" },
  { key:"sirvoRequests", hue:"sirvo", icon:<SendOutlined />,         label:"Solicitudes por pedir en Sirvo",     path:"/dashboard/migracion/sirvo" },
  { key:"appointmentsExpiring", hue:"nombramientos", icon:<IdcardOutlined />,  label:"Nombramientos que vencen en 60 días", path:"/dashboard/appointments" },
  { key:"notificationsToAccept", hue:"notificaciones", icon:<BellOutlined />, label:"Notificaciones por aceptar",         path:"/dashboard/notificaciones/entregadas" },
  { key:"documentsToAccept", hue:"documentos", icon:<FileTextOutlined />,     label:"Documentos por aceptar",             path:"/dashboard/documentos/entregados" },
  { key:"encargosToday", hue:"envios", icon:<CarOutlined />,         label:"Envíos programados para hoy",        path:"/dashboard/mensajeria" },
];

const MY_REQUEST_ITEMS: CountItem<MyRequestKey>[] = [
  { key:"checksAwaitingAuth", hue:"cheques", icon:<BankOutlined />, label:"Mis cheques esperando autorización",  path:"/dashboard/cheques/autorizacion" },
  { key:"moneyReqPending", hue:"dinero", icon:<WalletOutlined />,    label:"Mis requerimientos de dinero sin autorizar", path:"/dashboard/money-req" },
  { key:"roomsPending", hue:"salas", icon:<ScheduleOutlined />,       label:"Mis reservas de sala sin aprobar",    path:"/dashboard/reservaciones/listar" },
  { key:"vacationPending", hue:"equipo", icon:<CalendarOutlined />,    label:"Mis vacaciones por aprobar",          path:"/dashboard/recursos-humanos/vacaciones" },
];

/* Pendientes = espera TU acción (punto ámbar). Mis solicitudes = espera a
   OTROS (sin punto de estado: no hay nada que hagas tú). */
function CountPanel<K extends string>({ id, title, subtitle, titleHue, titleIcon, items, data, tone, emptyText, tk, onOpen, onRetry }: {
  id: string; title: string; subtitle: string; titleHue: HueKey; titleIcon: ReactNode;
  items: CountItem<K>[]; data: Load<Partial<Record<K, number | null>>>;
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
    const pending = shown.filter((i) => (d[i.key] ?? 0) > 0);
    const failed  = shown.filter((i) => d[i.key] === null);
    const clear   = shown.filter((i) => d[i.key] === 0);

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
            {pending.map((i) => (
              <li key={i.key}>
                <button type="button" className="dash-row" onClick={() => onOpen(i.path)}>
                  <HueChip k={i.hue} icon={i.icon} tk={tk} />
                  <span style={{ flex:1, minWidth:0 }}>
                    <span style={{ display:"block", fontSize:14, fontWeight:500 }}>{i.label}</span>
                    {(() => {
                      const det = i.detail?.(d);
                      return det ? (
                        <span style={{ display:"flex", alignItems:"center", gap:6, marginTop:3, fontSize:13, color:tk.t2 }}>
                          <ClockCircleOutlined aria-hidden style={{ color: det.severe ? DANGER : WARNING }} />
                          {det.text}
                        </span>
                      ) : null;
                    })()}
                  </span>
                  <span className="dash-num" style={{ fontSize: tone === "action" ? 18 : 16, fontWeight:700 }}>
                    {(d[i.key] as number).toLocaleString("es-GT")}
                  </span>
                  <RightOutlined aria-hidden style={{ fontSize:11, color:tk.t2 }} />
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

  /* Resumen de la franja: cuánto espera tu acción y qué tienes hoy. */
  const band = bandColors(tk);
  const summary = (() => {
    if (inbox.status !== "ok") return null;
    const counts = INBOX_ITEMS.map((i) => inbox.data[i.key]).filter((n): n is number => typeof n === "number" && n > 0);
    const total = counts.reduce((a, b) => a + b, 0);
    const today = new Date().toLocaleDateString("en-CA", { timeZone:"America/Guatemala" });
    const meetings = mine.status === "ok" ? (mine.data.agenda ?? []).filter((a) => a.date === today).length : 0;
    const parts = [
      total > 0
        ? `Tienes ${total.toLocaleString("es-GT")} pendiente${total === 1 ? "" : "s"} en ${counts.length} módulo${counts.length === 1 ? "" : "s"}`
        : "Estás al día: nada espera tu acción",
      meetings > 0 ? `${meetings} sala${meetings === 1 ? "" : "s"} reservada${meetings === 1 ? "" : "s"} hoy` : null,
    ].filter(Boolean);
    return parts.join(" · ") + ".";
  })();

  const dateStr = new Date().toLocaleDateString("es-GT", { weekday:"long", day:"numeric", month:"long", year:"numeric" });

  return (
    <>
      <style>{makeDashCSS(tk)}</style>

      <div className="dash-in" style={{ margin:-24, background:tk.bg, minHeight:"calc(100vh - 112px)",
        padding:"28px 28px 48px", fontFamily:"'Plus Jakarta Sans',sans-serif" }}>

        <header className="dash-band" style={{ display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap",
          gap:"16px 24px", marginBottom:24, padding:"24px 28px", borderRadius:14,
          background:band.bg, color:band.text, boxShadow:"0 10px 30px -12px rgba(60,80,224,.55)" }}>
          <div style={{ minWidth:0 }}>
            <h1 style={{ margin:0, fontSize:24, fontWeight:700, letterSpacing:"-.01em", color:band.text }}>
              Bienvenido, {displayName}
            </h1>
            <p style={{ margin:"4px 0 0", fontSize:14, color:band.sub }}>
              {dateStr.charAt(0).toUpperCase() + dateStr.slice(1)}
            </p>
            {summary && (
              <p style={{ margin:"12px 0 0", fontSize:15, fontWeight:500, color:band.text }}>{summary}</p>
            )}
          </div>
          <div style={{ flex:"1 1 340px", display:"flex", flexDirection:"column", alignItems:"flex-end", gap:12, minWidth:0 }}>
            <GlobalSearch tk={tk} />
            <div style={{ display:"flex", gap:8 }}>
              <Button ghost className="band-ghost" icon={<ReloadOutlined spin={refreshing} />} onClick={load} disabled={refreshing}>
                Actualizar
              </Button>
              {createItems && createItems.length > 0 && (
                <Dropdown trigger={["click"]} menu={{ items:createItems, onClick:({ key }) => navigate(key) }}>
                  <Button className="band-primary" icon={<PlusOutlined />}>Nuevo <DownOutlined style={{ fontSize:10 }} /></Button>
                </Dropdown>
              )}
            </div>
          </div>
        </header>

        <Row gutter={[16, 16]}>
          <Col xs={24} lg={16} style={{ display:"flex", flexDirection:"column", gap:16 }}>
            <CountPanel id="inbox-title" title="Pendientes" subtitle="Lo que espera tu acción en tus módulos."
              titleHue="cheques" titleIcon={<InboxOutlined />}
              items={INBOX_ITEMS} data={inbox} tone="action"
              emptyText="Todo al día. Nada espera tu acción por ahora."
              tk={tk} onOpen={navigate} onRetry={load} />
            {showMyRequests && (
              <CountPanel id="mine-title" title="Mis solicitudes" subtitle="Lo que pediste y sigue en trámite."
                titleHue="tramite" titleIcon={<HourglassOutlined />}
                items={MY_REQUEST_ITEMS} data={myRequests} tone="waiting"
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
