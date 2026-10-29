import { useCallback, useEffect, useMemo, useState } from 'react';
import { App, Button, Segmented } from 'antd';
import { CalendarOutlined, CheckOutlined, CloseOutlined, PlusOutlined, TeamOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import {
  approveVacationRequest,
  cancelVacationRequest,
  createVacationRequest,
  fetchMyVacations,
  fetchTeamRequests,
  fetchWorkingDaysPreview,
  getInsufficientBalance,
  rejectVacationRequest,
  type InsufficientBalanceError,
  type MyVacationsResponse,
  type TimeOffTypeValue,
  type VacationRequest,
  type VacationRequestTypeValue,
  type VacationStatus,
  type WorkingDaysPreview,
} from '../../api/vacations';
import { DateBlock, EmptyState, ErrorState, Pill, Sheet, SkeletonList } from '../ui';
import { initials, plural } from '../format';
import { usePullToRefresh } from '../usePullToRefresh';

// Mismas opciones que pages/human-resources/VacacionesPage.tsx
const TIME_OFF_OPTIONS: { value: TimeOffTypeValue; label: string }[] = [
  { value: 'vacaciones', label: 'Vacaciones' },
  { value: 'dias_ausencia_sp', label: 'Días de Ausencia - Servicios Profesionales' },
  { value: 'licencia_sin_goce', label: 'Licencia sin goce de salario' },
  { value: 'licencia_con_goce', label: 'Licencia con goce de salario' },
  { value: 'permiso', label: 'Permiso' },
  { value: 'cita_igss_medica', label: 'Cita IGSS / Cita Médica' },
  { value: 'enfermedad', label: 'Enfermedad' },
];
const TIME_OFF_LABELS = Object.fromEntries(TIME_OFF_OPTIONS.map((o) => [o.value, o.label])) as Record<string, string>;
const HOUR_OPTIONS: VacationRequestTypeValue[] = ['0.5', '1', '1.5', '2', '2.5', '3', '3.5', '4'];

const STATUS: Record<VacationStatus, { tone: 'warning' | 'success' | 'danger' | 'neutral'; text: string }> = {
  PENDIENTE: { tone: 'warning', text: 'Pendiente' },
  APROBADA: { tone: 'success', text: 'Aprobada' },
  RECHAZADA: { tone: 'danger', text: 'Rechazada' },
  CANCELADA: { tone: 'neutral', text: 'Cancelada' },
};

const fmt = (d: string, withYear = false) => dayjs(d).format(withYear ? 'D MMM YYYY' : 'D MMM').replace('.', '');
const typeLabel = (r: VacationRequest) => TIME_OFF_LABELS[r.time_off_type] ?? 'Vacaciones';

function whenText(r: VacationRequest) {
  if (r.request_type !== 'full_day') {
    const h = Number(r.request_type);
    return `${fmt(r.fecha_inicio)} · ${r.hora_inicio?.slice(0, 5) ?? ''} · ${h} ${plural(h, 'hora', 'horas')}`;
  }
  return r.fecha_inicio === r.fecha_fin ? fmt(r.fecha_inicio) : `${fmt(r.fecha_inicio)} – ${fmt(r.fecha_fin)}`;
}
const daysText = (n: number) => `${n} ${plural(n)}`;
const today = () => dayjs().format('YYYY-MM-DD');

// ------------------------------------------------------------------
// Formulario de solicitud (hoja)
// ------------------------------------------------------------------
type Draft = {
  time_off_type: TimeOffTypeValue;
  mode: 'dias' | 'horas';
  hours: VacationRequestTypeValue;
  from: string;
  to: string;
  hora: string;
  comentarios: string;
};
const emptyDraft = (): Draft => ({
  time_off_type: 'vacaciones',
  mode: 'dias',
  hours: '1',
  from: '',
  to: '',
  hora: '08:00',
  comentarios: '',
});

function RequestSheet({
  open,
  onClose,
  available,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  available: number | null;
  onCreated: () => void;
}) {
  const { message } = App.useApp();
  const [d, setD] = useState<Draft>(emptyDraft);
  const [preview, setPreview] = useState<WorkingDaysPreview | null>(null);
  const [touched, setTouched] = useState(false);
  const [sending, setSending] = useState(false);
  const [overdraft, setOverdraft] = useState<InsufficientBalanceError | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const set = (patch: Partial<Draft>) => {
    setD((prev) => ({ ...prev, ...patch }));
    setOverdraft(null);
    setServerError(null);
  };

  useEffect(() => {
    if (open) {
      setD(emptyDraft());
      setTouched(false);
      setOverdraft(null);
      setServerError(null);
    }
  }, [open]);

  const rangeInvalid = d.mode === 'dias' && d.from && d.to && d.to < d.from;

  // Días hábiles que se descontarán (misma regla que el backend al crear)
  useEffect(() => {
    setPreview(null);
    if (!open || d.mode !== 'dias' || !d.from || !d.to || rangeInvalid) return;
    let alive = true;
    fetchWorkingDaysPreview(d.from, d.to)
      .then((p) => alive && setPreview(p))
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [open, d.mode, d.from, d.to, rangeInvalid]);

  const missing =
    d.mode === 'dias' ? (!d.from ? 'Elige desde qué día.' : !d.to ? 'Elige hasta qué día.' : null) : !d.from ? 'Elige la fecha.' : !d.hora ? 'Elige la hora.' : null;
  const formError = missing ?? (rangeInvalid ? 'La fecha final no puede ser antes de la inicial.' : null);
  const exceeds = preview?.excede_maximo ?? false;
  const remaining = d.time_off_type === 'vacaciones' && preview && available !== null ? available - preview.dias_habiles : null;

  const send = async (allowNegative: boolean) => {
    setTouched(true);
    if (formError || exceeds) return;
    setSending(true);
    setServerError(null);
    const payload: Parameters<typeof createVacationRequest>[0] = {
      time_off_type: d.time_off_type,
      request_type: d.mode === 'dias' ? 'full_day' : d.hours,
      fecha_inicio: d.from,
      comentarios: d.comentarios.trim() || undefined,
      ...(d.mode === 'dias' ? { fecha_fin: d.to } : { hora_inicio: d.hora }),
      ...(allowNegative ? { allow_negative_balance: true } : {}),
    };
    try {
      await createVacationRequest(payload);
      message.success('Solicitud enviada a tu jefe inmediato');
      onClose();
      onCreated();
    } catch (e: any) {
      const od = getInsufficientBalance(e);
      if (od) setOverdraft(od);
      else setServerError(e?.response?.data?.message || 'No se pudo enviar la solicitud. Intenta de nuevo.');
    } finally {
      setSending(false);
    }
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      tall
      title="Solicitar días"
      footer={
        overdraft ? (
          <div className="m-sheet-actions">
            <Button onClick={() => setOverdraft(null)}>Revisar fechas</Button>
            <Button danger type="primary" loading={sending} onClick={() => send(true)}>
              Solicitar igual
            </Button>
          </div>
        ) : (
          <Button type="primary" block loading={sending} onClick={() => send(false)} style={{ height: 50, fontWeight: 600, fontSize: 16 }}>
            Enviar solicitud
          </Button>
        )
      }
    >
      <label className="m-field">
        <span>Tipo de ausencia</span>
        <select className="m-input" value={d.time_off_type} onChange={(e) => set({ time_off_type: e.target.value as TimeOffTypeValue })}>
          {TIME_OFF_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </label>

      <div className="m-field">
        <span>Duración</span>
        <Segmented
          block
          value={d.mode}
          onChange={(v) => set({ mode: v as Draft['mode'] })}
          options={[
            { label: 'Días completos', value: 'dias' },
            { label: 'Por horas', value: 'horas' },
          ]}
        />
      </div>

      {d.mode === 'dias' ? (
        <div className="m-field-row">
          <label className="m-field">
            <span>Desde</span>
            <input
              className="m-input"
              type="date"
              value={d.from}
              onChange={(e) => set({ from: e.target.value, to: d.to && d.to < e.target.value ? e.target.value : d.to || e.target.value })}
            />
          </label>
          <label className="m-field">
            <span>Hasta</span>
            <input className="m-input" type="date" value={d.to} min={d.from || undefined} onChange={(e) => set({ to: e.target.value })} />
          </label>
        </div>
      ) : (
        <>
          <div className="m-field">
            <span>Horas</span>
            <div className="m-chips" role="group" aria-label="Horas">
              {HOUR_OPTIONS.map((h) => (
                <button key={h} type="button" className="m-chip" aria-pressed={d.hours === h} onClick={() => set({ hours: h })}>
                  {h} h
                </button>
              ))}
            </div>
          </div>
          <div className="m-field-row">
            <label className="m-field">
              <span>Fecha</span>
              <input className="m-input" type="date" value={d.from} onChange={(e) => set({ from: e.target.value })} />
            </label>
            <label className="m-field">
              <span>Hora de inicio</span>
              <input className="m-input" type="time" step={900} value={d.hora} onChange={(e) => set({ hora: e.target.value })} />
            </label>
          </div>
        </>
      )}

      {touched && formError && <div className="m-field-error" style={{ marginTop: -8, marginBottom: 12 }}>{formError}</div>}

      {preview && (
        <div className={`m-note ${exceeds ? 'danger' : ''}`} style={{ marginBottom: 16 }} aria-live="polite">
          <b>
            Se descuentan {preview.dias_habiles} {plural(preview.dias_habiles, 'día hábil', 'días hábiles')}
          </b>
          <div className="m-item-meta">
            {preview.dias_calendario} {plural(preview.dias_calendario, 'día', 'días')} en total
            {preview.fines_de_semana ? ` · ${preview.fines_de_semana} de fin de semana` : ''}
            {preview.feriados.length ? ` · feriado: ${preview.feriados.map((f) => f.nombre).join(', ')}` : ''}
          </div>
          {exceeds ? (
            <div style={{ marginTop: 6, fontWeight: 600 }}>
              El máximo por solicitud es {preview.max_dias_por_solicitud} días. Divídela en dos.
            </div>
          ) : (
            remaining !== null && (
              <div className={`m-item-meta ${remaining < 0 ? 'm-negative' : ''}`} style={{ fontWeight: 600 }}>
                Te quedarían {remaining} {plural(remaining)}
              </div>
            )
          )}
        </div>
      )}

      <label className="m-field">
        <span>Comentarios para tu jefe</span>
        <textarea
          className="m-input"
          value={d.comentarios}
          onChange={(e) => set({ comentarios: e.target.value })}
          placeholder="Opcional"
          maxLength={500}
        />
      </label>

      {overdraft && (
        <div className="m-note warning" role="alert">
          <b>No te alcanza el saldo</b>
          <div style={{ marginTop: 4 }}>
            Tienes {daysText(overdraft.saldo_actual)} y estás pidiendo {daysText(overdraft.dias_solicitados)}. Si la solicitas igual, tu saldo
            quedará en <b>{daysText(overdraft.saldo_resultante)}</b>.
          </div>
        </div>
      )}
      {serverError && (
        <div className="m-note danger" role="alert">
          {serverError}
        </div>
      )}
    </Sheet>
  );
}

// ------------------------------------------------------------------
// Pantalla
// ------------------------------------------------------------------
export default function MobileVacaciones() {
  const { message } = App.useApp();
  const [data, setData] = useState<MyVacationsResponse | null>(null);
  const [team, setTeam] = useState<VacationRequest[]>([]);
  const [error, setError] = useState(false);
  const [view, setView] = useState<'mias' | 'equipo'>('mias');
  const [formOpen, setFormOpen] = useState(false);
  const [detail, setDetail] = useState<VacationRequest | null>(null);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [rejecting, setRejecting] = useState<VacationRequest | null>(null);
  const [motivo, setMotivo] = useState('');
  const [busyId, setBusyId] = useState<number | null>(null);
  const [leaving, setLeaving] = useState<number[]>([]);
  const [showAllHistory, setShowAllHistory] = useState(false);

  const load = useCallback(async () => {
    try {
      const my = await fetchMyVacations();
      setData(my);
      setTeam(my.es_jefe ? await fetchTeamRequests() : []);
      setError(false);
    } catch {
      setError(true);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);
  const { indicator } = usePullToRefresh(load);

  const balance = data?.balances.find((b) => b.time_off_type === 'vacaciones');
  const available = balance?.available ?? data?.saldo_dias ?? null;
  const pendingTeam = team.filter((r) => r.estado === 'PENDIENTE');

  const groups = useMemo(() => {
    const list = [...(data?.solicitudes ?? [])].sort((a, b) => b.fecha_inicio.localeCompare(a.fecha_inicio));
    const t = today();
    const pending = list.filter((r) => r.estado === 'PENDIENTE').reverse();
    const upcoming = list.filter((r) => r.estado === 'APROBADA' && r.fecha_fin >= t).reverse();
    const history = list.filter((r) => !pending.includes(r) && !upcoming.includes(r));
    return { pending, upcoming, history };
  }, [data]);

  // Sale de la lista con transición y luego se recarga
  const removeThenReload = (id: number) => {
    setLeaving((l) => [...l, id]);
    window.setTimeout(() => {
      load().finally(() => setLeaving((l) => l.filter((x) => x !== id)));
    }, 220);
  };

  const doCancel = async () => {
    if (!detail) return;
    setBusyId(detail.id);
    try {
      await cancelVacationRequest(detail.id);
      message.success('Solicitud cancelada');
      setDetail(null);
      load();
    } catch (e: any) {
      message.error(e?.response?.data?.message || 'No se pudo cancelar la solicitud');
    } finally {
      setBusyId(null);
    }
  };

  const approve = async (r: VacationRequest) => {
    setBusyId(r.id);
    try {
      await approveVacationRequest(r.id);
      message.success(`Aprobada: ${r.user?.first_name ?? ''} · ${daysText(r.dias_solicitados)}`);
      removeThenReload(r.id);
    } catch (e: any) {
      message.error(e?.response?.data?.message || 'No se pudo aprobar la solicitud');
    } finally {
      setBusyId(null);
    }
  };

  const doReject = async () => {
    if (!rejecting) return;
    const r = rejecting;
    setBusyId(r.id);
    try {
      await rejectVacationRequest(r.id, motivo.trim() || undefined);
      message.success('Solicitud rechazada');
      setRejecting(null);
      removeThenReload(r.id);
    } catch (e: any) {
      message.error(e?.response?.data?.message || 'No se pudo rechazar la solicitud');
    } finally {
      setBusyId(null);
    }
  };

  if (error && !data) return <ErrorState text="Revisa tu conexión e intenta de nuevo." onRetry={load} />;

  const renderMine = (r: VacationRequest) => (
    <div className="m-item" key={r.id}>
      <button
        className="m-row-btn"
        onClick={() => {
          setConfirmCancel(false);
          setDetail(r);
        }}
      >
        <DateBlock date={r.fecha_inicio} />
        <div className="m-item-body">
          <div className="m-row" style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
            <div className="m-item-title">{typeLabel(r)}</div>
            <Pill tone={STATUS[r.estado].tone}>{STATUS[r.estado].text}</Pill>
          </div>
          <div className="m-item-meta">{whenText(r)}</div>
          <div className="m-item-meta m-num">{daysText(r.dias_solicitados)}</div>
        </div>
      </button>
    </div>
  );

  const history = showAllHistory ? groups.history : groups.history.slice(0, 6);

  return (
    <>
      {indicator}

      {!data ? (
        <div className="m-panel m-balance" aria-busy="true">
          <div className="m-skel" style={{ width: 90, height: 12 }} />
          <div className="m-skel" style={{ width: 120, height: 34, marginTop: 8 }} />
          <div className="m-skel" style={{ width: '100%', height: 36, marginTop: 16 }} />
        </div>
      ) : (
        <section className="m-panel m-balance" aria-label="Saldo de vacaciones">
          <div className="m-balance-label">Disponibles para vacaciones</div>
          <div className="m-balance-head">
            <span className={`m-balance-num m-num ${available !== null && available < 0 ? 'm-negative' : ''}`}>{available ?? '—'}</span>
            <span className="m-balance-unit">{available !== null ? plural(available) : 'sin saldo registrado'}</span>
          </div>
          {balance && (
            <div className="m-balance-break m-num">
              <div>
                <b>{balance.previous_year}</b>
                <span>Periodo anterior</span>
              </div>
              <div>
                <b>{balance.earned_this_year}</b>
                <span>Ganados</span>
              </div>
              <div>
                <b>{balance.used_this_year}</b>
                <span>Usados</span>
              </div>
            </div>
          )}
        </section>
      )}

      <div className="m-cta">
        <Button type="primary" icon={<PlusOutlined />} block onClick={() => setFormOpen(true)} disabled={!data}>
          Solicitar días
        </Button>
      </div>

      {data?.es_jefe && (
        <Segmented
          block
          style={{ marginTop: 16 }}
          value={view}
          onChange={(v) => setView(v as 'mias' | 'equipo')}
          options={[
            { label: 'Mis solicitudes', value: 'mias' },
            { label: pendingTeam.length ? `Mi equipo · ${pendingTeam.length}` : 'Mi equipo', value: 'equipo' },
          ]}
        />
      )}

      {!data ? (
        <>
          <div className="m-heading">Mis solicitudes</div>
          <SkeletonList withDate />
        </>
      ) : view === 'mias' ? (
        data.solicitudes.length === 0 ? (
          <EmptyState
            icon={<CalendarOutlined />}
            title="Aún no has pedido días"
            text="Toca «Solicitar días». Tu jefe inmediato recibe la solicitud y aquí verás cuando la apruebe."
          />
        ) : (
          <>
            {groups.pending.length > 0 && (
              <>
                <div className="m-heading">Esperando aprobación</div>
                <div className="m-list">{groups.pending.map(renderMine)}</div>
              </>
            )}
            {groups.upcoming.length > 0 && (
              <>
                <div className="m-heading">Próximas</div>
                <div className="m-list">{groups.upcoming.map(renderMine)}</div>
              </>
            )}
            {groups.history.length > 0 && (
              <>
                <div className="m-heading">
                  Historial <small>{groups.history.length}</small>
                </div>
                <div className="m-list">{history.map(renderMine)}</div>
                {groups.history.length > history.length && (
                  <Button type="text" block style={{ marginTop: 8 }} onClick={() => setShowAllHistory(true)}>
                    Ver las {groups.history.length - history.length} anteriores
                  </Button>
                )}
              </>
            )}
          </>
        )
      ) : pendingTeam.length === 0 ? (
        <EmptyState
          icon={<TeamOutlined />}
          title="Tu equipo está al día"
          text="Cuando alguien de tu equipo pida días, aparecerá aquí para que lo apruebes o rechaces."
        />
      ) : (
        <>
          <div className="m-heading">
            Por aprobar <small>{pendingTeam.length}</small>
          </div>
          <div className="m-list">
            {pendingTeam.map((r) => (
              <div className={`m-item ${leaving.includes(r.id) ? 'leaving' : ''}`} key={r.id} style={{ flexDirection: 'column', gap: 0 }}>
                <div style={{ display: 'flex', gap: 12, width: '100%' }}>
                  <div className="m-avatar sm">{initials(r.user?.first_name, r.user?.last_name)}</div>
                  <div className="m-item-body">
                    <div className="m-item-title">{r.user ? `${r.user.first_name} ${r.user.last_name}` : 'Colaborador'}</div>
                    <div className="m-item-meta">
                      {typeLabel(r)} · <span className="m-num">{daysText(r.dias_solicitados)}</span>
                    </div>
                    <div className="m-item-meta">{whenText(r)}</div>
                    {r.comentarios && <div className="m-item-desc">“{r.comentarios}”</div>}
                  </div>
                </div>
                <div className="m-item-actions" style={{ width: '100%' }}>
                  <Button
                    icon={<CloseOutlined />}
                    disabled={busyId === r.id}
                    onClick={() => {
                      setMotivo('');
                      setRejecting(r);
                    }}
                  >
                    Rechazar
                  </Button>
                  <Button type="primary" icon={<CheckOutlined />} loading={busyId === r.id} onClick={() => approve(r)}>
                    Aprobar
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      <RequestSheet open={formOpen} onClose={() => setFormOpen(false)} available={available} onCreated={load} />

      {/* Detalle de una solicitud propia */}
      <Sheet
        open={!!detail}
        onClose={() => setDetail(null)}
        title={detail ? typeLabel(detail) : ''}
        footer={
          detail?.estado === 'PENDIENTE' ? (
            confirmCancel ? (
              <div className="m-sheet-actions">
                <Button onClick={() => setConfirmCancel(false)}>No, mantener</Button>
                <Button danger type="primary" loading={busyId === detail.id} onClick={doCancel}>
                  Sí, cancelar
                </Button>
              </div>
            ) : (
              <Button danger block style={{ height: 48, fontWeight: 600 }} onClick={() => setConfirmCancel(true)}>
                Cancelar solicitud
              </Button>
            )
          ) : undefined
        }
      >
        {detail && (
          <>
            <div style={{ marginBottom: 8 }}>
              <Pill tone={STATUS[detail.estado].tone}>{STATUS[detail.estado].text}</Pill>
            </div>
            <dl className="m-dl">
              <div>
                <dt>{detail.request_type === 'full_day' ? 'Fechas' : 'Fecha'}</dt>
                <dd>
                  {detail.request_type === 'full_day' && detail.fecha_inicio !== detail.fecha_fin
                    ? `${fmt(detail.fecha_inicio, true)} – ${fmt(detail.fecha_fin, true)}`
                    : fmt(detail.fecha_inicio, true)}
                </dd>
              </div>
              {detail.request_type !== 'full_day' && (
                <div>
                  <dt>Horario</dt>
                  <dd>
                    {detail.hora_inicio?.slice(0, 5)} · {detail.request_type} h
                  </dd>
                </div>
              )}
              <div>
                <dt>Se descuentan</dt>
                <dd className="m-num">{daysText(detail.dias_solicitados)}</dd>
              </div>
              <div>
                <dt>Solicitada</dt>
                <dd>{fmt(detail.created_at, true)}</dd>
              </div>
              {detail.comentarios && (
                <div>
                  <dt>Comentarios</dt>
                  <dd>{detail.comentarios}</dd>
                </div>
              )}
              {detail.motivo_cancelacion && (
                <div>
                  <dt>Motivo</dt>
                  <dd>{detail.motivo_cancelacion}</dd>
                </div>
              )}
            </dl>
            {confirmCancel && (
              <div className="m-note warning" style={{ marginTop: 16 }}>
                Los días vuelven a tu saldo al cancelar.
              </div>
            )}
          </>
        )}
      </Sheet>

      {/* Rechazar solicitud del equipo */}
      <Sheet
        open={!!rejecting}
        onClose={() => setRejecting(null)}
        title="Rechazar solicitud"
        footer={
          <div className="m-sheet-actions">
            <Button onClick={() => setRejecting(null)}>Volver</Button>
            <Button danger type="primary" loading={busyId === rejecting?.id} onClick={doReject}>
              Rechazar
            </Button>
          </div>
        }
      >
        {rejecting && (
          <>
            <p style={{ marginTop: 0 }}>
              <b>
                {rejecting.user?.first_name} {rejecting.user?.last_name}
              </b>{' '}
              · {typeLabel(rejecting)}, {whenText(rejecting)} ({daysText(rejecting.dias_solicitados)})
            </p>
            <label className="m-field" style={{ marginBottom: 0 }}>
              <span>Motivo</span>
              <textarea
                className="m-input"
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                placeholder="Opcional. Se incluye en el correo al colaborador."
                maxLength={500}
              />
            </label>
          </>
        )}
      </Sheet>
    </>
  );
}
