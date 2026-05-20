import React, { useEffect, useState, useCallback, Suspense, lazy } from "react";
const ExchangeRateWidget = lazy(() => import("../components/ExchangeRateWidget"));
import { Col, Row, Table, Tag } from "antd";
import {
  MailOutlined, FileTextOutlined, CheckCircleOutlined, ClockCircleOutlined,
  CloseCircleOutlined, SendOutlined, ArrowRightOutlined, ReloadOutlined,
  TeamOutlined, CalendarOutlined, ThunderboltOutlined, PlusOutlined,
} from "@ant-design/icons";
import { ResponsivePie } from "@nivo/pie";
import { ResponsiveBar } from "@nivo/bar";
import { useNavigate } from "react-router-dom";
import useAuthStore from "../auth/useAuthStore";
import { type NotificationDto, NOTIFICATION_STATES } from "../api/notifications";
import { type DocumentDto, DOCUMENT_STATES } from "../api/documents";
import {
  fetchDashboardStats,
  fetchVacationSummary,
  fetchUpcomingItems,
  type VacationSummary,
  type UpcomingItems,
} from "../api/dashboard";

/* ─── CSS ─────────────────────────────────────────────────────────────────── */
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');

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
  background: #F8FAFC !important;
  font-size: 11px !important;
  font-weight: 700 !important;
  text-transform: uppercase !important;
  letter-spacing: .07em !important;
  color: #94A3B8 !important;
  border-bottom: 1px solid #E2E8F0 !important;
  padding: 10px 16px !important;
}
.ta-table .ant-table-tbody > tr > td {
  border-bottom: 1px solid #F1F5F9 !important;
  padding: 10px 16px !important;
}
.ta-table .ant-table-tbody > tr:hover > td { background: #F8FAFC !important; }
.ta-table .ant-empty-description { color: #94A3B8 !important; font-size: 12px; }
`;

/* ─── tokens ─────────────────────────────────────────────────────────────── */
const BG      = "#EFF4FB";
const WHITE   = "#FFFFFF";
const PRIMARY = "#3C50E0";
const SUCCESS = "#10B981";
const DANGER  = "#EF4444";
const WARNING = "#F59E0B";
const INFO    = "#06B6D4";
const T1      = "#1C2434";
const T2      = "#64748B";
const T3      = "#94A3B8";
const BORDER  = "1px solid #E2E8F0";
const RADIUS  = 10;
const SHADOW  = "0 1px 4px rgba(0,0,0,.06), 0 4px 12px rgba(0,0,0,.04)";

const wcard = (extra?: React.CSSProperties): React.CSSProperties => ({
  background: WHITE, borderRadius: RADIUS, border: BORDER, boxShadow: SHADOW, ...extra,
});

/* ─── StatCard ────────────────────────────────────────────────────────────── */
interface StatCardProps {
  label: string; value: number; icon: React.ReactNode; accent: string;
  urgent?: boolean; cls?: string; onClick?: () => void;
}
function StatCard({ label, value, icon, accent, urgent, cls, onClick }: StatCardProps) {
  return (
    <div className={`ta-card${cls ? " " + cls : ""}`} onClick={onClick}
      style={{ ...wcard({ padding:"22px 24px 20px", cursor:"pointer", position:"relative", overflow:"hidden" }) }}>

      {/* top accent bar */}
      <div style={{ position:"absolute", top:0, left:0, right:0, height:3, background:accent,
        borderRadius:`${RADIUS}px ${RADIUS}px 0 0` }} />

      {/* icon + optional urgent dot */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:18 }}>
        <div style={{ width:46, height:46, borderRadius:10, background:accent+"1c",
          display:"flex", alignItems:"center", justifyContent:"center",
          fontSize:20, color:accent }}>
          {icon}
        </div>
        {urgent && value > 0 && (
          <div className="pulsedot" style={{ width:10, height:10, borderRadius:"50%", background:DANGER }} />
        )}
      </div>

      <div style={{ fontFamily:"'Plus Jakarta Sans',sans-serif", fontSize:32, fontWeight:800,
        color:T1, letterSpacing:"-.5px", lineHeight:1, marginBottom:7 }}>
        {value.toLocaleString()}
      </div>

      <div style={{ fontFamily:"'Plus Jakarta Sans',sans-serif", fontSize:13, fontWeight:500, color:T2 }}>
        {label}
      </div>
    </div>
  );
}

/* ─── MetricChip ──────────────────────────────────────────────────────────── */
function MetricChip({ label, value, accent, icon }: {
  label:string; value:number; accent:string; icon:React.ReactNode;
}) {
  return (
    <div className="ta-card" style={{ ...wcard({ padding:"14px 18px", display:"flex",
      alignItems:"center", gap:14, flex:"1 1 140px", minWidth:0 }) }}>
      <div style={{ width:36, height:36, borderRadius:8, background:accent+"1c",
        display:"flex", alignItems:"center", justifyContent:"center",
        fontSize:15, color:accent, flexShrink:0 }}>
        {icon}
      </div>
      <div style={{ fontFamily:"'Plus Jakarta Sans',sans-serif", minWidth:0 }}>
        <div style={{ fontSize:10, fontWeight:700, textTransform:"uppercase",
          letterSpacing:".08em", color:T3, marginBottom:4 }}>
          {label}
        </div>
        <div style={{ fontSize:22, fontWeight:800, color:T1, lineHeight:1 }}>
          {value.toLocaleString()}
        </div>
      </div>
    </div>
  );
}

/* ─── Initials Avatar ────────────────────────────────────────────────────── */
const AVATAR_COLORS = [PRIMARY, INFO, SUCCESS, "#8B5CF6", "#EC4899", WARNING];
function InitialsAvatar({ name, size = 30 }: { name: string; size?: number }) {
  const parts = name.split(" ").filter(Boolean);
  const initials = parts.slice(0, 2).map((p) => p[0]?.toUpperCase() ?? "").join("");
  const color = AVATAR_COLORS[(name.charCodeAt(0) ?? 0) % AVATAR_COLORS.length];
  return (
    <div style={{ width:size, height:size, borderRadius:"50%", flexShrink:0,
      background: color + "22", display:"flex", alignItems:"center",
      justifyContent:"center", fontSize:size * 0.36, fontWeight:700, color,
      fontFamily:"'Plus Jakarta Sans',sans-serif" }}>
      {initials || "?"}
    </div>
  );
}

/* ─── VacationWidget ──────────────────────────────────────────────────────── */
function VacationWidget({ data, onNavigate }: { data: VacationSummary; onNavigate: () => void }) {
  const fmt = (iso: string) =>
    new Date(iso + "T12:00:00").toLocaleDateString("es-ES", { day:"numeric", month:"short" });

  return (
    <div style={{ ...wcard({ padding:"20px 22px", height:"100%", display:"flex", flexDirection:"column" }) }}>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:16 }}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <div style={{ width:34, height:34, borderRadius:8, background:SUCCESS+"1c",
            display:"flex", alignItems:"center", justifyContent:"center",
            fontSize:15, color:SUCCESS }}>
            <TeamOutlined />
          </div>
          <div style={{ fontFamily:"'Plus Jakarta Sans',sans-serif", fontSize:14, fontWeight:700, color:T1 }}>
            Vacaciones del equipo
          </div>
        </div>
        {data.pending > 0 && (
          <button onClick={onNavigate}
            style={{ display:"flex", alignItems:"center", gap:5, padding:"4px 10px",
              borderRadius:20, background: WARNING+"18", border:`1px solid ${WARNING}44`,
              cursor:"pointer", fontFamily:"'Plus Jakarta Sans',sans-serif",
              fontSize:11, fontWeight:700, color:WARNING }}>
            {data.pending} pendiente{data.pending > 1 ? "s" : ""}
          </button>
        )}
      </div>

      {/* on vacation today */}
      <div style={{ marginBottom:14 }}>
        <div style={{ fontSize:10, fontWeight:700, textTransform:"uppercase",
          letterSpacing:".08em", color:T3, marginBottom:8,
          fontFamily:"'Plus Jakarta Sans',sans-serif" }}>
          Hoy ausentes
        </div>
        {data.onVacation.length === 0 ? (
          <div style={{ fontSize:12, color:T3, fontFamily:"'Plus Jakarta Sans',sans-serif",
            padding:"8px 0" }}>Sin ausencias hoy</div>
        ) : (
          <div style={{ display:"flex", flexDirection:"column", gap:7 }}>
            {data.onVacation.map((v, i) => (
              <div key={i} style={{ display:"flex", alignItems:"center", gap:10 }}>
                <InitialsAvatar name={v.name} size={28} />
                <div style={{ fontFamily:"'Plus Jakarta Sans',sans-serif", flex:1, minWidth:0 }}>
                  <div style={{ fontSize:12, fontWeight:600, color:T1, overflow:"hidden",
                    textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{v.name}</div>
                  <div style={{ fontSize:10, color:T2 }}>regresa {fmt(v.fechaFin)}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {data.upcoming.length > 0 && (
        <>
          <div style={{ height:1, background:"#E2E8F0", marginBottom:14 }} />
          <div>
            <div style={{ fontSize:10, fontWeight:700, textTransform:"uppercase",
              letterSpacing:".08em", color:T3, marginBottom:8,
              fontFamily:"'Plus Jakarta Sans',sans-serif" }}>
              Próxima semana
            </div>
            <div style={{ display:"flex", flexDirection:"column", gap:7 }}>
              {data.upcoming.map((v, i) => (
                <div key={i} style={{ display:"flex", alignItems:"center", gap:10 }}>
                  <InitialsAvatar name={v.name} size={28} />
                  <div style={{ fontFamily:"'Plus Jakarta Sans',sans-serif", flex:1, minWidth:0 }}>
                    <div style={{ fontSize:12, fontWeight:600, color:T1, overflow:"hidden",
                      textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{v.name}</div>
                    <div style={{ fontSize:10, color:T2 }}>
                      desde {fmt(v.fechaInicio)} · {v.dias} día{v.dias !== 1 ? "s" : ""}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

/* ─── UpcomingEncargoWidget ───────────────────────────────────────────────── */
const PRIORIDAD_COLOR: Record<number, string> = {
  1: DANGER, 2: WARNING, 3: INFO, 4: T2,
};
const PRIORIDAD_LABEL: Record<number, string> = {
  1: "A", 2: "B", 3: "C", 4: "D",
};

function UpcomingWidget({ data, onNavigate }: { data: UpcomingItems; onNavigate: () => void }) {
  const fmtDate = (iso: string) =>
    new Date(iso + "T12:00:00").toLocaleDateString("es-ES", { day:"numeric", month:"short" });
  const fmtTime = (t: string | null) => (t ? t.slice(0, 5) : null);

  const EncargoRow = ({ e, showDate }: { e: UpcomingItems["today"][0]; showDate?: boolean }) => {
    const color = PRIORIDAD_COLOR[e.prioridad] ?? T2;
    return (
      <div style={{ display:"flex", alignItems:"flex-start", gap:10, padding:"9px 0",
        borderBottom:"1px solid #F1F5F9" }}>
        <div style={{ width:22, height:22, borderRadius:5, flexShrink:0,
          background: color + "1c", display:"flex", alignItems:"center",
          justifyContent:"center", fontSize:10, fontWeight:800, color,
          fontFamily:"'Plus Jakarta Sans',sans-serif", marginTop:1 }}>
          {PRIORIDAD_LABEL[e.prioridad] ?? "?"}
        </div>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontSize:12, fontWeight:600, color:T1, overflow:"hidden",
            textOverflow:"ellipsis", whiteSpace:"nowrap",
            fontFamily:"'Plus Jakarta Sans',sans-serif" }}>
            {e.destinatario}
            <span style={{ color:T2, fontWeight:400 }}> · {e.empresa}</span>
          </div>
          <div style={{ fontSize:11, color:T2, fontFamily:"'Plus Jakarta Sans',sans-serif", marginTop:2 }}>
            {e.municipio}
            {showDate && <span style={{ color:PRIMARY, marginLeft:6 }}>{fmtDate(e.fecha_realizacion)}</span>}
            {fmtTime(e.hora_minima) && (
              <span style={{ marginLeft:6, color:T3 }}>
                {fmtTime(e.hora_minima)}{e.hora_maxima ? `–${fmtTime(e.hora_maxima)}` : ""}
              </span>
            )}
          </div>
        </div>
      </div>
    );
  };

  const empty = data.today.length === 0 && data.nextDays.length === 0;

  return (
    <div style={{ ...wcard({ padding:"20px 22px", height:"100%", display:"flex", flexDirection:"column" }) }}>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:16 }}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <div style={{ width:34, height:34, borderRadius:8, background:WARNING+"1c",
            display:"flex", alignItems:"center", justifyContent:"center",
            fontSize:15, color:WARNING }}>
            <CalendarOutlined />
          </div>
          <div style={{ fontFamily:"'Plus Jakarta Sans',sans-serif", fontSize:14, fontWeight:700, color:T1 }}>
            Encargos próximos
          </div>
        </div>
        <button onClick={onNavigate}
          style={{ background:"none", border:"none", cursor:"pointer",
            display:"flex", alignItems:"center", gap:4,
            fontFamily:"'Plus Jakarta Sans',sans-serif", fontSize:12, fontWeight:600, color:PRIMARY }}>
          Ver todos <ArrowRightOutlined style={{ fontSize:9 }} />
        </button>
      </div>

      {empty ? (
        <div style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center",
          color:T3, fontSize:13, fontFamily:"'Plus Jakarta Sans',sans-serif" }}>
          Sin encargos próximos
        </div>
      ) : (
        <div style={{ flex:1, overflow:"auto" }}>
          {data.today.length > 0 && (
            <>
              <div style={{ fontSize:10, fontWeight:700, textTransform:"uppercase",
                letterSpacing:".08em", color:DANGER, marginBottom:4,
                fontFamily:"'Plus Jakarta Sans',sans-serif" }}>Hoy</div>
              {data.today.map((e) => <EncargoRow key={e.id} e={e} />)}
            </>
          )}
          {data.nextDays.length > 0 && (
            <div style={{ marginTop: data.today.length > 0 ? 12 : 0 }}>
              <div style={{ fontSize:10, fontWeight:700, textTransform:"uppercase",
                letterSpacing:".08em", color:T3, marginBottom:4,
                fontFamily:"'Plus Jakarta Sans',sans-serif" }}>Próximos días</div>
              {data.nextDays.map((e) => <EncargoRow key={e.id} e={e} showDate />)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ─── DashboardStats ──────────────────────────────────────────────────────── */
interface DashboardStats {
  notifPending:number; notifDelivered:number; notifFinalized:number;
  docsPending:number;  docsDelivered:number;  docsFinalized:number;
  docsRejected:number; myNotifToAccept:number; myDocsToAccept:number;
}

/* ─── DashboardPage ───────────────────────────────────────────────────────── */
export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats>({
    notifPending:0, notifDelivered:0, notifFinalized:0,
    docsPending:0,  docsDelivered:0,  docsFinalized:0,
    docsRejected:0, myNotifToAccept:0, myDocsToAccept:0,
  });
  const [recentNotifs,  setRecentNotifs]  = useState<NotificationDto[]>([]);
  const [recentDocs,    setRecentDocs]    = useState<DocumentDto[]>([]);
  const [vacations,     setVacations]     = useState<VacationSummary>({ pending:0, onVacation:[], upcoming:[] });
  const [upcoming,      setUpcoming]      = useState<UpcomingItems>({ today:[], nextDays:[] });
  const [refreshing,    setRefreshing]    = useState(false);

  const navigate  = useNavigate();
  const username  = useAuthStore((s) => s.username);
  const firstName = useAuthStore((s) => s.firstName);
  const lastName  = useAuthStore((s) => s.lastName);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      const [s, vac, up] = await Promise.all([
        fetchDashboardStats(),
        fetchVacationSummary().catch(() => ({ pending:0, onVacation:[], upcoming:[] })),
        fetchUpcomingItems().catch(() => ({ today:[], nextDays:[] })),
      ]);
      setStats({
        notifPending:s.notifications.pending,   notifDelivered:s.notifications.delivered,
        notifFinalized:s.notifications.finalized, docsPending:s.documents.pending,
        docsDelivered:s.documents.delivered,     docsFinalized:s.documents.finalized,
        docsRejected:s.documents.rejected,       myNotifToAccept:s.notifications.myPending,
        myDocsToAccept:s.documents.myPending,
      });
      setRecentNotifs(s.notifications.recent);
      setRecentDocs(s.documents.recent);
      setVacations(vac);
      setUpcoming(up);
    } catch { /* silent */ }
    finally { setRefreshing(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const displayName = firstName ? `${firstName} ${lastName}`.trim() : username || "Usuario";
  const dateStr = new Date().toLocaleDateString("es-ES",
    { weekday:"long", year:"numeric", month:"long", day:"numeric" });

  const docsPieData = [
    { id:"Entregados",  label:"Entregados",  value:stats.docsDelivered },
    { id:"Finalizados", label:"Finalizados", value:stats.docsFinalized },
    { id:"Pendientes",  label:"Pendientes",  value:stats.docsPending   },
    { id:"Rechazados",  label:"Rechazados",  value:stats.docsRejected  },
  ].filter((d) => d.value > 0);

  const chartTheme = {
    axis:    { ticks: { text: { fill:T2, fontSize:11, fontFamily:"'Plus Jakarta Sans',sans-serif" } } },
    grid:    { line: { stroke:"#F1F5F9" } },
    tooltip: { container: { background:WHITE, color:T1, fontSize:12, fontFamily:"'Plus Jakarta Sans',sans-serif",
      border:"1px solid #E2E8F0", borderRadius:8, boxShadow:"0 4px 20px rgba(0,0,0,.08)" } },
    legends: { text: { fill:T2, fontFamily:"'Plus Jakarta Sans',sans-serif", fontSize:12 } },
  };

  const pillTag = (color: string, text: string) => (
    <Tag color={color} style={{ borderRadius:20, fontFamily:"'Plus Jakarta Sans',sans-serif", fontSize:11, fontWeight:600 }}>
      {text}
    </Tag>
  );

  const notifCols = [
    { title:"Dirigida a",  dataIndex:"directedTo", ellipsis:true },
    { title:"Cédula",      dataIndex:"cedule",      ellipsis:true },
    { title:"Provenencia", ellipsis:true,
      render:(_:unknown, r:NotificationDto) => r.provenience?.name || r.otherProvenience || "—" },
    { title:"Estado", dataIndex:"state", width:110,
      render:(v:number) => {
        if (v===NOTIFICATION_STATES.DELIVERED) return pillTag("orange","Entregado");
        if (v===NOTIFICATION_STATES.FINALIZED) return pillTag("green","Finalizado");
        return pillTag("default", String(v));
      }},
  ];

  const docsCols = [
    { title:"Tipo", dataIndex:"documentType",
      render:(v:string) => pillTag("blue", v) },
    { title:"Dirigido a", dataIndex:"submitTo", ellipsis:true },
    { title:"Cant.",      dataIndex:"amount",   width:58 },
    { title:"Estado",     dataIndex:"state",    width:110,
      render:(v:number) => {
        if (v===DOCUMENT_STATES.DELIVERED) return pillTag("orange","Entregado");
        if (v===DOCUMENT_STATES.FINALIZED) return pillTag("green","Finalizado");
        if (v===DOCUMENT_STATES.REJECTED)  return pillTag("red","Rechazado");
        return pillTag("default", String(v));
      }},
  ];

  /* section header */
  const sh = (title: string, cta?: { label:string; to:string }) => (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:16 }}>
      <h3 style={{ margin:0, fontFamily:"'Plus Jakarta Sans',sans-serif", fontSize:16, fontWeight:700, color:T1 }}>
        {title}
      </h3>
      {cta && (
        <button onClick={() => navigate(cta.to)}
          style={{ background:"none", border:"none", cursor:"pointer", display:"flex", alignItems:"center", gap:5,
            fontFamily:"'Plus Jakarta Sans',sans-serif", fontSize:12, fontWeight:600, color:PRIMARY }}>
          {cta.label} <ArrowRightOutlined style={{ fontSize:9 }} />
        </button>
      )}
    </div>
  );

  return (
    <>
      <style>{CSS}</style>

      <div style={{ margin:-24, background:BG, minHeight:"calc(100vh - 112px)", padding:"28px 28px 48px",
        fontFamily:"'Plus Jakarta Sans',sans-serif" }}>

        {/* ── HEADER ─────────────────────────────────────────────────────── */}
        <div className="f1" style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between",
          marginBottom:28, flexWrap:"wrap", gap:12 }}>
          <div>
            <div style={{ fontSize:11, fontWeight:600, letterSpacing:".1em", textTransform:"uppercase",
              color:T3, marginBottom:6 }}>
              Panel principal
            </div>
            <h2 style={{ margin:0, fontFamily:"'Plus Jakarta Sans',sans-serif", fontSize:24, fontWeight:800,
              color:T1, letterSpacing:"-.3px" }}>
              Bienvenido, {displayName}
            </h2>
            <p style={{ margin:"5px 0 0", fontSize:13, color:T2, fontWeight:500, textTransform:"capitalize" }}>
              {dateStr}
            </p>
          </div>

          <button className="refresh-btn" onClick={() => load(true)} disabled={refreshing}
            style={{ display:"flex", alignItems:"center", gap:8, padding:"9px 20px",
              borderRadius:RADIUS, border:BORDER, background:WHITE, cursor:"pointer",
              fontFamily:"'Plus Jakarta Sans',sans-serif", fontSize:13, fontWeight:600, color:T1,
              boxShadow:SHADOW }}>
            <ReloadOutlined spin={refreshing} style={{ fontSize:13 }} />
            Actualizar
          </button>
        </div>

        {/* ── QUICK ACTIONS ───────────────────────────────────────────────── */}
        <div className="f2" style={{ display:"flex", gap:10, flexWrap:"wrap", marginBottom:24 }}>
          {[
            { label:"Nueva notificación", icon:<PlusOutlined />,        accent:PRIMARY, path:"/dashboard/notificaciones/crear"          },
            { label:"Nuevo documento",    icon:<PlusOutlined />,        accent:INFO,    path:"/dashboard/documentos/crear"              },
            { label:"Ver encargos",       icon:<ThunderboltOutlined />, accent:WARNING, path:"/dashboard/mensajeria"                    },
            { label:"Recursos humanos",   icon:<TeamOutlined />,        accent:SUCCESS, path:"/dashboard/recursos-humanos/vacaciones"    },
          ].map((a) => (
            <button key={a.label} onClick={() => navigate(a.path)}
              style={{ display:"flex", alignItems:"center", gap:8, padding:"9px 18px",
                borderRadius:8, border:`1.5px solid ${a.accent}30`,
                background: a.accent + "0c", cursor:"pointer",
                fontFamily:"'Plus Jakarta Sans',sans-serif",
                fontSize:13, fontWeight:600, color: a.accent,
                transition:"background .18s, border-color .18s, transform .18s, box-shadow .18s",
                boxShadow:"none" }}
              onMouseEnter={(e) => {
                const b = e.currentTarget as HTMLButtonElement;
                b.style.background = a.accent + "18";
                b.style.borderColor = a.accent + "66";
                b.style.transform = "translateY(-2px)";
                b.style.boxShadow = `0 4px 14px ${a.accent}22`;
              }}
              onMouseLeave={(e) => {
                const b = e.currentTarget as HTMLButtonElement;
                b.style.background = a.accent + "0c";
                b.style.borderColor = a.accent + "30";
                b.style.transform = "";
                b.style.boxShadow = "none";
              }}>
              {a.icon}
              {a.label}
            </button>
          ))}
        </div>

        {/* ── 4 STAT CARDS ────────────────────────────────────────────────── */}
        <Row gutter={[16, 16]} style={{ marginBottom:16 }} className="f3">
          {[
            { label:"Notificaciones pendientes", value:stats.notifPending,    icon:<MailOutlined />,        accent:PRIMARY, path:"/dashboard/notificaciones",            urgent:false },
            { label:"Documentos pendientes",     value:stats.docsPending,     icon:<FileTextOutlined />,    accent:INFO,    path:"/dashboard/documentos",                urgent:false },
            { label:"Mis notif. por aceptar",    value:stats.myNotifToAccept, icon:<ClockCircleOutlined />, accent:WARNING, path:"/dashboard/notificaciones/entregadas",  urgent:true  },
            { label:"Mis docs. por aceptar",     value:stats.myDocsToAccept,  icon:<ClockCircleOutlined />,
              accent: stats.myDocsToAccept > 0 ? DANGER : SUCCESS,
              path:"/dashboard/documentos/entregados",  urgent:true },
          ].map((c) => (
            <Col key={c.label} xs={24} sm={12} lg={6}>
              <StatCard label={c.label} value={c.value} icon={c.icon}
                accent={c.accent} urgent={c.urgent}
                onClick={() => navigate(c.path)} />
            </Col>
          ))}
        </Row>

        {/* ── 5 METRIC CHIPS ──────────────────────────────────────────────── */}
        <div className="f4" style={{ display:"flex", gap:12, marginBottom:28, flexWrap:"wrap" }}>
          {[
            { label:"Notif. entregadas",  value:stats.notifDelivered, accent:WARNING, icon:<SendOutlined />        },
            { label:"Notif. finalizadas", value:stats.notifFinalized, accent:SUCCESS, icon:<CheckCircleOutlined /> },
            { label:"Docs. entregados",   value:stats.docsDelivered,  accent:INFO,    icon:<SendOutlined />        },
            { label:"Docs. finalizados",  value:stats.docsFinalized,  accent:SUCCESS, icon:<CheckCircleOutlined /> },
            { label:"Docs. rechazados",   value:stats.docsRejected,   accent:DANGER,  icon:<CloseCircleOutlined /> },
          ].map((c) => (
            <MetricChip key={c.label} label={c.label} value={c.value} accent={c.accent} icon={c.icon} />
          ))}
        </div>

        {/* ── ANÁLISIS VISUAL ─────────────────────────────────────────────── */}
        <div className="f5" style={{ marginBottom:28 }}>
          {sh("Análisis visual")}
          <Row gutter={[16, 16]}>
            <Col xs={24} lg={16}>
              <div style={{ ...wcard({ padding:"20px 22px 14px" }) }}>
                <div style={{ fontFamily:"'Plus Jakarta Sans',sans-serif", fontSize:14, fontWeight:700, color:T1, marginBottom:3 }}>
                  Comparativa general
                </div>
                <div style={{ fontSize:12, color:T2, marginBottom:14, fontWeight:500 }}>
                  Notificaciones vs Documentos por estado
                </div>
                <div style={{ height:230 }}>
                  <ResponsiveBar
                    data={[
                      { estado:"Pendientes",  N:stats.notifPending,   D:stats.docsPending   },
                      { estado:"Entregados",  N:stats.notifDelivered, D:stats.docsDelivered  },
                      { estado:"Finalizados", N:stats.notifFinalized, D:stats.docsFinalized  },
                    ]}
                    keys={["N","D"]} indexBy="estado" groupMode="grouped"
                    colors={[PRIMARY, INFO]}
                    borderRadius={4} padding={0.32} innerPadding={3}
                    axisBottom={{ tickSize:0, tickPadding:8 }}
                    axisLeft={{ tickSize:0, tickPadding:8 }}
                    enableGridY gridYValues={4} enableLabel={false}
                    legends={[{
                      dataFrom:"keys", anchor:"bottom", direction:"row", translateY:36,
                      itemWidth:110, itemHeight:12, symbolSize:8, symbolShape:"square",
                      data:[
                        { id:"N", label:"Notificaciones", color:PRIMARY },
                        { id:"D", label:"Documentos",     color:INFO    },
                      ],
                    }]}
                    margin={{ top:8, right:14, bottom:46, left:38 }}
                    theme={chartTheme}
                  />
                </div>
              </div>
            </Col>

            <Col xs={24} lg={8}>
              <div style={{ ...wcard({ padding:"20px 22px 14px" }) }}>
                <div style={{ fontFamily:"'Plus Jakarta Sans',sans-serif", fontSize:14, fontWeight:700, color:T1, marginBottom:3 }}>
                  Documentos por estado
                </div>
                <div style={{ fontSize:12, color:T2, marginBottom:14, fontWeight:500 }}>
                  Distribución actual
                </div>
                {docsPieData.length > 0 ? (
                  <div style={{ height:230 }}>
                    <ResponsivePie
                      data={docsPieData}
                      innerRadius={0.65} padAngle={2} cornerRadius={4}
                      colors={[INFO, SUCCESS, WARNING, DANGER]}
                      arcLinkLabelsSkipAngle={10} arcLinkLabelsTextColor={T2}
                      arcLinkLabelsThickness={1.5} arcLinkLabelsColor={{ from:"color" }}
                      arcLabelsSkipAngle={10} arcLabelsTextColor="#fff"
                      legends={[{ anchor:"bottom", direction:"row", translateY:36,
                        itemWidth:82, itemHeight:12, symbolSize:8, symbolShape:"circle",
                        itemTextColor:T2 as string }]}
                      margin={{ top:10, right:10, bottom:46, left:10 }}
                      theme={chartTheme}
                    />
                  </div>
                ) : (
                  <div style={{ height:230, display:"flex", alignItems:"center", justifyContent:"center",
                    color:T3, fontSize:13 }}>Sin datos</div>
                )}
              </div>
            </Col>
          </Row>
        </div>

        {/* ── VACACIONES & ENCARGOS ───────────────────────────────────────── */}
        <div className="f6" style={{ marginBottom:28 }}>
          {sh("Equipo & operaciones")}
          <Row gutter={[16, 16]}>
            <Col xs={24} lg={8}>
              <VacationWidget
                data={vacations}
                onNavigate={() => navigate("/dashboard/recursos-humanos/vacaciones")}
              />
            </Col>
            <Col xs={24} lg={16}>
              <UpcomingWidget
                data={upcoming}
                onNavigate={() => navigate("/dashboard/mensajeria")}
              />
            </Col>
          </Row>
        </div>

        {/* ── TIPO DE CAMBIO ───────────────────────────────────────────────── */}
        <div className="f7" style={{ marginBottom:28 }}>
          {sh("Tipo de cambio")}
          <Suspense fallback={
            <div style={{ height:340, borderRadius:RADIUS, background:"#1a2744", opacity:.4, border:BORDER }} />
          }>
            <ExchangeRateWidget />
          </Suspense>
        </div>

        {/* ── ACTIVIDAD RECIENTE ───────────────────────────────────────────── */}
        <div className="f8">
          {sh("Actividad reciente")}
          <Row gutter={[16, 16]}>
            {[
              { title:"Últimas notificaciones", cols:notifCols, data:recentNotifs,
                empty:"Sin notificaciones recientes", path:"/dashboard/notificaciones/entregadas", cta:"Ver todas" },
              { title:"Últimos documentos", cols:docsCols, data:recentDocs,
                empty:"Sin documentos recientes", path:"/dashboard/documentos/entregados", cta:"Ver todos" },
            ].map((t) => (
              <Col key={t.title} xs={24} lg={12}>
                <div style={{ ...wcard() }}>
                  <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between",
                    padding:"16px 20px 12px", borderBottom:"1px solid #E2E8F0" }}>
                    <div style={{ fontFamily:"'Plus Jakarta Sans',sans-serif", fontSize:14, fontWeight:700, color:T1 }}>
                      {t.title}
                    </div>
                    <button onClick={() => navigate(t.path)}
                      style={{ background:"none", border:"none", cursor:"pointer", display:"flex", alignItems:"center", gap:5,
                        fontFamily:"'Plus Jakarta Sans',sans-serif", fontSize:12, fontWeight:600, color:PRIMARY }}>
                      {t.cta} <ArrowRightOutlined style={{ fontSize:9 }} />
                    </button>
                  </div>
                  <Table className="ta-table" rowKey="id" columns={t.cols} dataSource={t.data}
                    pagination={false} size="small"
                    locale={{ emptyText:
                      <span style={{ color:T3, fontSize:12, fontFamily:"'Plus Jakarta Sans',sans-serif" }}>
                        {t.empty}
                      </span>
                    }} />
                </div>
              </Col>
            ))}
          </Row>
        </div>

      </div>
    </>
  );
}
