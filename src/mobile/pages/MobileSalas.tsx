import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { App, Button, Segmented, Switch } from 'antd';
import { CheckOutlined, CloseOutlined, HomeOutlined, PlusOutlined, ScheduleOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import api from '../../api/axios';
import useAuthStore from '../../auth/useAuthStore';
import { ReservationsAPI } from '../../services/roomReservations';
import type { RoomReservation } from '../../types/room-reservations';
import { DateBlock, EmptyState, ErrorState, Pill, Sheet, SkeletonList } from '../ui';
import { fullName, hhmm } from '../format';
import { usePullToRefresh } from '../usePullToRefresh';

// Reglas de pages/reservaciones/RoomReservationForm.tsx
const DAY_START = 7 * 60;
const DAY_END = 19 * 60;
const MIN_DURATION_MIN = 15;

type Room = { id: number; name: string; state: boolean };
type MeetingType = 'team_meeting' | 'external_meeting' | 'client_call' | 'urgent' | 'other';
const MEETING_TYPES: { value: MeetingType; label: string }[] = [
  { value: 'team_meeting', label: 'Reunión interna' },
  { value: 'external_meeting', label: 'Reunión externa' },
  { value: 'client_call', label: 'Llamada con cliente' },
  { value: 'urgent', label: 'Urgente' },
  { value: 'other', label: 'Otro' },
];
const MEETING_LABELS = Object.fromEntries(MEETING_TYPES.map((m) => [m.value, m.label])) as Record<string, string>;

const STATE: Record<number, { tone: 'warning' | 'success' | 'danger' | 'neutral'; text: string }> = {
  0: { tone: 'warning', text: 'Pendiente' },
  1: { tone: 'success', text: 'Aceptada' },
  2: { tone: 'danger', text: 'Rechazada' },
  3: { tone: 'neutral', text: 'Cancelada' },
};

const minutes = (hm: string) => {
  const [h, m] = hm.slice(0, 5).split(':').map(Number);
  return h * 60 + m;
};
const ymd = (d: dayjs.Dayjs) => d.format('YYYY-MM-DD');
const dayLabel = (date: string) => {
  const d = dayjs(date);
  if (d.isSame(dayjs(), 'day')) return 'Hoy';
  if (d.isSame(dayjs().add(1, 'day'), 'day')) return 'Mañana';
  return d.format('dddd D [de] MMMM');
};

type Conflict = { title: string; text: string } | null;

// ------------------------------------------------------------------
// Nueva reserva (hoja)
// ------------------------------------------------------------------
type Draft = {
  room_id: number | '';
  meeting_type: MeetingType;
  date: string;
  init: string;
  end: string;
  reason: string;
  participants: string;
  use_computer: boolean;
  user_projector: boolean;
};

function ReserveSheet({
  open,
  onClose,
  rooms,
  preset,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  rooms: Room[];
  preset: { room_id?: number; date: string };
  onCreated: (date: string) => void;
}) {
  const { message } = App.useApp();
  const userId = useAuthStore((s) => s.userId);
  const [d, setD] = useState<Draft>({
    room_id: '',
    meeting_type: 'team_meeting',
    date: preset.date,
    init: '',
    end: '',
    reason: '',
    participants: '2',
    use_computer: false,
    user_projector: false,
  });
  const [touched, setTouched] = useState(false);
  const [conflict, setConflict] = useState<Conflict>(null);
  const [available, setAvailable] = useState(false);
  const [sending, setSending] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const seq = useRef(0);
  const set = (patch: Partial<Draft>) => {
    setD((p) => ({ ...p, ...patch }));
    setServerError(null);
  };

  useEffect(() => {
    if (!open) return;
    // Próximo cuarto de hora como sugerencia de inicio
    const now = dayjs();
    const isToday = preset.date === ymd(now);
    const startMin = isToday ? Math.max(DAY_START, Math.ceil((now.hour() * 60 + now.minute()) / 15) * 15) : 9 * 60;
    const fmt = (m: number) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
    setD({
      room_id: preset.room_id ?? '',
      meeting_type: 'team_meeting',
      date: preset.date,
      init: startMin < DAY_END ? fmt(startMin) : '',
      end: startMin + 60 <= DAY_END ? fmt(startMin + 60) : '',
      reason: '',
      participants: '2',
      use_computer: false,
      user_projector: false,
    });
    setTouched(false);
    setConflict(null);
    setAvailable(false);
    setServerError(null);
  }, [open, preset]);

  const roomName = (id: number | '') => rooms.find((r) => r.id === id)?.name ?? 'la sala';

  const timeError = (() => {
    if (!d.init || !d.end) return null;
    const a = minutes(d.init);
    const b = minutes(d.end);
    if (a < DAY_START || b > DAY_END) return 'El horario de salas es de 07:00 a 19:00.';
    if (b <= a) return 'La hora de fin debe ser después de la de inicio.';
    if (b - a < MIN_DURATION_MIN) return 'La reserva debe durar al menos 15 minutos.';
    if (d.date === ymd(dayjs()) && a < dayjs().hour() * 60 + dayjs().minute()) return 'Esa hora ya pasó.';
    return null;
  })();

  // Disponibilidad en vivo (misma consulta que la web)
  useEffect(() => {
    setConflict(null);
    setAvailable(false);
    if (!open || !d.room_id || !d.date || !d.init || !d.end || timeError) return;
    const mine = ++seq.current;
    const t = window.setTimeout(async () => {
      try {
        const { data } = await api.get('/room-reservations/check-availability', {
          params: { room_id: d.room_id, date: d.date, start: d.init, end: d.end },
        });
        if (mine !== seq.current) return;
        if (data.available) {
          setAvailable(true);
          return;
        }
        const c = data.conflict ?? {};
        const franja = `de ${hhmm(c.init_hour)} a ${hhmm(c.end_hour)}`;
        setConflict(
          c.is_mine
            ? { title: 'Ya reservaste esta sala', text: `Tienes ${roomName(d.room_id)} ${franja}. No necesitas reservarla otra vez.` }
            : { title: 'Horario ocupado', text: `${roomName(d.room_id)} está reservada ${franja}${c.owner_name ? ` por ${c.owner_name}` : ''}. Cambia la hora o la sala.` },
        );
      } catch {
        /* la validación definitiva la hace el backend al crear */
      }
    }, 300);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, d.room_id, d.date, d.init, d.end, timeError]);

  const missing = !d.room_id
    ? 'Elige una sala.'
    : !d.date
      ? 'Elige la fecha.'
      : !d.init || !d.end
        ? 'Elige el horario.'
        : !d.reason.trim()
          ? 'Escribe el motivo de la reunión.'
          : !(Number(d.participants) >= 1)
            ? 'Indica cuántas personas asisten.'
            : null;
  const formError = missing ?? timeError;

  const submit = async () => {
    setTouched(true);
    if (formError || conflict) return;
    setSending(true);
    try {
      await ReservationsAPI.create({
        state: 0,
        meeting_type: d.meeting_type,
        creation_date: new Date().toISOString(),
        reservation_date: d.date,
        init_hour: d.init,
        end_hour: d.end,
        reason: d.reason.trim(),
        participants: Number(d.participants),
        participants_emails: [],
        use_computer: d.use_computer,
        user_projector: d.user_projector,
        reminder_sended: false,
        covid_form_sended: false,
        use_meeting_owl: false,
        is_shared_cost: false,
        is_recurring: false,
        room_id: Number(d.room_id),
        user_id: userId ?? undefined,
      });
      message.success(`Reservaste ${roomName(d.room_id)} · ${d.init}–${d.end}`);
      onClose();
      onCreated(d.date);
    } catch (e: any) {
      const msg = e?.response?.data?.message;
      setServerError(Array.isArray(msg) ? msg.join('. ') : msg || 'No se pudo crear la reserva. Intenta de nuevo.');
    } finally {
      setSending(false);
    }
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      tall
      title="Reservar sala"
      footer={
        <Button type="primary" block loading={sending} disabled={!!conflict} onClick={submit} style={{ height: 50, fontWeight: 600, fontSize: 16 }}>
          Reservar
        </Button>
      }
    >
      <label className="m-field">
        <span>Sala</span>
        <select className="m-input" value={d.room_id} onChange={(e) => set({ room_id: e.target.value ? Number(e.target.value) : '' })}>
          <option value="">Elige una sala</option>
          {rooms.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </select>
      </label>

      <label className="m-field">
        <span>Fecha</span>
        <input className="m-input" type="date" min={ymd(dayjs())} value={d.date} onChange={(e) => set({ date: e.target.value })} />
      </label>

      <div className="m-field-row">
        <label className="m-field">
          <span>Inicio</span>
          <input className="m-input" type="time" min="07:00" max="19:00" step={900} value={d.init} onChange={(e) => set({ init: e.target.value })} />
        </label>
        <label className="m-field">
          <span>Fin</span>
          <input className="m-input" type="time" min="07:00" max="19:00" step={900} value={d.end} onChange={(e) => set({ end: e.target.value })} />
        </label>
      </div>

      {(timeError || conflict || available) && (
        <div
          className={`m-note ${timeError || conflict ? 'danger' : ''}`}
          style={{ marginTop: -4, marginBottom: 16 }}
          role={timeError || conflict ? 'alert' : 'status'}
        >
          {timeError ? (
            timeError
          ) : conflict ? (
            <>
              <b>{conflict.title}</b>
              <div className="m-item-meta">{conflict.text}</div>
            </>
          ) : (
            <b style={{ color: 'var(--m-success)' }}>✓ {roomName(d.room_id)} está libre en ese horario</b>
          )}
        </div>
      )}

      <label className="m-field">
        <span>Tipo de reunión</span>
        <select className="m-input" value={d.meeting_type} onChange={(e) => set({ meeting_type: e.target.value as MeetingType })}>
          {MEETING_TYPES.map((m) => (
            <option key={m.value} value={m.value}>
              {m.label}
            </option>
          ))}
        </select>
      </label>

      <label className="m-field">
        <span>Motivo</span>
        <input className="m-input" value={d.reason} onChange={(e) => set({ reason: e.target.value })} placeholder="Ej. Revisión de contrato con cliente" maxLength={200} />
      </label>

      <label className="m-field">
        <span>Personas</span>
        <input
          className="m-input m-num"
          type="number"
          inputMode="numeric"
          min={1}
          max={100}
          value={d.participants}
          onChange={(e) => set({ participants: e.target.value })}
        />
      </label>

      <div className="m-toggles">
        <label className="m-toggle">
          Necesito computadora
          <Switch checked={d.use_computer} onChange={(v) => set({ use_computer: v })} />
        </label>
        <label className="m-toggle">
          Necesito proyector
          <Switch checked={d.user_projector} onChange={(v) => set({ user_projector: v })} />
        </label>
      </div>

      {touched && missing && <div className="m-field-error">{missing}</div>}
      {serverError && (
        <div className="m-note danger" role="alert">
          {serverError}
        </div>
      )}
      <p className="m-item-meta" style={{ marginBottom: 0 }}>
        Costo compartido y reservas recurrentes se hacen desde la web.
      </p>
    </Sheet>
  );
}

// ------------------------------------------------------------------
// Pantalla
// ------------------------------------------------------------------
type View = 'agenda' | 'mias' | 'aprobar';

export default function MobileSalas() {
  const { message } = App.useApp();
  const userId = useAuthStore((s) => s.userId);
  const [view, setView] = useState<View>('agenda');
  const [date, setDate] = useState(ymd(dayjs()));
  const [rooms, setRooms] = useState<Room[] | null>(null);
  const [agenda, setAgenda] = useState<RoomReservation[] | null>(null);
  const [all, setAll] = useState<RoomReservation[] | null>(null);
  const [canApprove, setCanApprove] = useState(false);
  const [error, setError] = useState(false);
  const [reserve, setReserve] = useState<{ room_id?: number; date: string } | null>(null);
  const [detail, setDetail] = useState<RoomReservation | null>(null);
  const [reasonFor, setReasonFor] = useState<{ r: RoomReservation; kind: 'cancel' | 'reject' } | null>(null);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState<number | null>(null);

  const days = useMemo(() => Array.from({ length: 21 }, (_, i) => dayjs().add(i, 'day')), []);

  const loadBase = useCallback(async () => {
    try {
      const [roomRes, list, can] = await Promise.all([
        api.get<Room[]>('/rooms'),
        ReservationsAPI.list(),
        api.get<{ canApprove: boolean }>('/room-reservations/approve/can').catch(() => ({ data: { canApprove: false } })),
      ]);
      // El gate de "reservable" es state, no la tarifa (ver Lounge, id 22)
      setRooms(roomRes.data.filter((r) => !!r.state).sort((a, b) => a.name.localeCompare(b.name)));
      setAll(list);
      setCanApprove(!!can.data?.canApprove);
      setError(false);
    } catch {
      setError(true);
    }
  }, []);

  const loadAgenda = useCallback(async (day: string) => {
    setAgenda(null);
    try {
      const { data } = await api.get<RoomReservation[]>('/room-reservations/agenda/day', { params: { date: day } });
      setAgenda(data);
    } catch {
      setAgenda([]);
    }
  }, []);

  useEffect(() => {
    loadBase();
  }, [loadBase]);
  useEffect(() => {
    loadAgenda(date);
  }, [date, loadAgenda]);
  const { indicator } = usePullToRefresh(() => Promise.all([loadBase(), loadAgenda(date)]));

  const today = ymd(dayjs());
  const mine = useMemo(
    () =>
      (all ?? [])
        .filter((r) => (r.request_user_id === userId || r.user_id === userId) && r.reservation_date >= today && (r.state === 0 || r.state === 1))
        .sort((a, b) => (a.reservation_date + a.init_hour).localeCompare(b.reservation_date + b.init_hour)),
    [all, userId, today],
  );
  const toApprove = useMemo(
    () =>
      canApprove
        ? (all ?? []).filter((r) => r.state === 0 && r.reservation_date >= today).sort((a, b) => (a.reservation_date + a.init_hour).localeCompare(b.reservation_date + b.init_hour))
        : [],
    [all, canApprove, today],
  );

  const byRoom = useMemo(() => {
    const map = new Map<number, RoomReservation[]>();
    for (const r of agenda ?? []) map.set(r.room_id, [...(map.get(r.room_id) ?? []), r]);
    return map;
  }, [agenda]);

  const roomName = (r: RoomReservation) => r.room?.name ?? rooms?.find((x) => x.id === r.room_id)?.name ?? `Sala ${r.room_id}`;

  const refreshAll = () => Promise.all([loadBase(), loadAgenda(date)]);

  const accept = async (r: RoomReservation) => {
    setBusy(r.id);
    try {
      await ReservationsAPI.accept(r.id);
      message.success('Reserva aceptada');
      setDetail(null);
      refreshAll();
    } catch (e: any) {
      message.error(e?.response?.data?.message || 'No se pudo aceptar');
    } finally {
      setBusy(null);
    }
  };

  const submitReason = async () => {
    if (!reasonFor || !reason.trim()) return;
    const { r, kind } = reasonFor;
    setBusy(r.id);
    try {
      if (kind === 'cancel') await api.patch(`/room-reservations/${r.id}/cancel`, { cancel_reason: reason.trim() });
      else await ReservationsAPI.reject(r.id, reason.trim());
      message.success(kind === 'cancel' ? 'Reserva cancelada' : 'Reserva rechazada');
      setReasonFor(null);
      setDetail(null);
      refreshAll();
    } catch (e: any) {
      message.error(e?.response?.data?.message || 'No se pudo completar');
    } finally {
      setBusy(null);
    }
  };

  if (error && !rooms) return <ErrorState text="Revisa tu conexión e intenta de nuevo." onRetry={loadBase} />;

  const reservationRow = (r: RoomReservation, withActions = false) => (
    <div className="m-item" key={r.id} style={withActions ? { flexDirection: 'column', gap: 0 } : undefined}>
      <button className="m-row-btn" style={{ width: '100%' }} onClick={() => setDetail(r)}>
        <DateBlock date={r.reservation_date} />
        <div className="m-item-body">
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
            <div className="m-item-title">{roomName(r)}</div>
            <Pill tone={STATE[r.state]?.tone ?? 'neutral'}>{STATE[r.state]?.text ?? '—'}</Pill>
          </div>
          <div className="m-item-meta m-num">
            {hhmm(r.init_hour)}–{hhmm(r.end_hour)} · {MEETING_LABELS[r.meeting_type] ?? r.meeting_type}
          </div>
          <div className="m-item-meta">{withActions ? fullName(r.user) || 'Sin asignar' : r.reason}</div>
        </div>
      </button>
      {withActions && (
        <div className="m-item-actions" style={{ width: '100%' }}>
          <Button
            icon={<CloseOutlined />}
            disabled={busy === r.id}
            onClick={() => {
              setReason('');
              setReasonFor({ r, kind: 'reject' });
            }}
          >
            Rechazar
          </Button>
          <Button type="primary" icon={<CheckOutlined />} loading={busy === r.id} onClick={() => accept(r)}>
            Aceptar
          </Button>
        </div>
      )}
    </div>
  );

  return (
    <>
      {indicator}

      <Segmented
        block
        value={view}
        onChange={(v) => setView(v as View)}
        options={[
          { label: 'Agenda', value: 'agenda' },
          { label: mine.length ? `Mías · ${mine.length}` : 'Mías', value: 'mias' },
          ...(canApprove ? [{ label: toApprove.length ? `Aprobar · ${toApprove.length}` : 'Aprobar', value: 'aprobar' }] : []),
        ]}
      />

      {view === 'agenda' && (
        <>
          <div className="m-days" role="group" aria-label="Día" style={{ marginTop: 14 }}>
            {days.map((d) => {
              const v = ymd(d);
              const weekend = d.day() === 0 || d.day() === 6;
              return (
                <button key={v} className={`m-day ${weekend ? 'weekend' : ''}`} aria-pressed={date === v} onClick={() => setDate(v)}>
                  <span>{d.isSame(dayjs(), 'day') ? 'Hoy' : d.format('ddd').replace('.', '')}</span>
                  <b>{d.format('D')}</b>
                </button>
              );
            })}
          </div>

          <div className="m-heading">
            <span style={{ textTransform: 'capitalize' }}>{dayLabel(date)}</span>
            <small>Toca una sala para reservar</small>
          </div>

          {!rooms || !agenda ? (
            <SkeletonList rows={4} />
          ) : rooms.length === 0 ? (
            <EmptyState icon={<HomeOutlined />} title="No hay salas habilitadas" text="Recepción todavía no ha activado salas para reservar." />
          ) : (
            <div className="m-list">
              {rooms.map((room) => {
                const list = byRoom.get(room.id) ?? [];
                return (
                  <div className="m-item" key={room.id}>
                    <button className="m-row-btn" style={{ flexDirection: 'column', gap: 0, width: '100%' }} onClick={() => setReserve({ room_id: room.id, date })}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', gap: 8 }}>
                        <div className="m-item-title">{room.name}</div>
                        <span className="m-item-meta" style={{ marginTop: 0, whiteSpace: 'nowrap' }}>
                          {list.length ? `${list.length} ${list.length === 1 ? 'reserva' : 'reservas'}` : 'Libre todo el día'}
                        </span>
                      </div>
                      <div style={{ width: '100%' }}>
                        <div className="m-track" aria-hidden="true">
                          {list.map((r) => {
                            const a = Math.max(minutes(r.init_hour), DAY_START);
                            const b = Math.min(minutes(r.end_hour), DAY_END);
                            return (
                              <i
                                key={r.id}
                                className={r.state === 0 ? 'pending' : ''}
                                style={{ left: `${((a - DAY_START) / (DAY_END - DAY_START)) * 100}%`, width: `${((b - a) / (DAY_END - DAY_START)) * 100}%` }}
                              />
                            );
                          })}
                        </div>
                        <div className="m-track-scale" aria-hidden="true">
                          <span>7:00</span>
                          <span>10:00</span>
                          <span>13:00</span>
                          <span>16:00</span>
                          <span>19:00</span>
                        </div>
                        {list.length > 0 && (
                          <div className="m-slots">
                            {list.map((r) => (
                              <span className="m-slot" key={r.id} title={r.reason}>
                                {hhmm(r.init_hour)}–{hhmm(r.end_hour)}
                                {r.state === 0 ? ' · pendiente' : ''}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {view === 'mias' &&
        (!all ? (
          <div style={{ marginTop: 16 }}>
            <SkeletonList withDate />
          </div>
        ) : mine.length === 0 ? (
          <EmptyState
            icon={<ScheduleOutlined />}
            title="No tienes reservas próximas"
            text="Elige un día en la Agenda y toca la sala que necesitas."
            action={
              <Button type="primary" icon={<PlusOutlined />} onClick={() => setReserve({ date: today })}>
                Reservar sala
              </Button>
            }
          />
        ) : (
          <>
            <div className="m-heading">Próximas</div>
            <div className="m-list">{mine.map((r) => reservationRow(r))}</div>
          </>
        ))}

      {view === 'aprobar' &&
        (toApprove.length === 0 ? (
          <EmptyState icon={<CheckOutlined />} title="Nada por aprobar" text="Las reservas pendientes de salas que requieren tu visto bueno aparecerán aquí." />
        ) : (
          <>
            <div className="m-heading">
              Pendientes <small>{toApprove.length}</small>
            </div>
            <div className="m-list">{toApprove.map((r) => reservationRow(r, true))}</div>
          </>
        ))}

      {view !== 'aprobar' && (
        <div className="m-cta" style={{ marginTop: 16 }}>
          <Button type="primary" icon={<PlusOutlined />} block onClick={() => setReserve({ date: view === 'agenda' ? date : today })} disabled={!rooms}>
            Reservar sala
          </Button>
        </div>
      )}

      {rooms && <ReserveSheet open={!!reserve} onClose={() => setReserve(null)} rooms={rooms} preset={reserve ?? { date }} onCreated={(d) => {
        setDate(d);
        refreshAll();
      }} />}

      {/* Detalle */}
      <Sheet
        open={!!detail}
        onClose={() => setDetail(null)}
        title={detail ? roomName(detail) : ''}
        footer={
          detail &&
          (detail.state === 0 && canApprove ? (
            <div className="m-sheet-actions">
              <Button
                onClick={() => {
                  setReason('');
                  setReasonFor({ r: detail, kind: 'reject' });
                }}
              >
                Rechazar
              </Button>
              <Button type="primary" loading={busy === detail.id} onClick={() => accept(detail)}>
                Aceptar
              </Button>
            </div>
          ) : (detail.state === 0 || detail.state === 1) && (detail.request_user_id === userId || detail.user_id === userId) ? (
            <Button
              danger
              block
              style={{ height: 48, fontWeight: 600 }}
              onClick={() => {
                setReason('');
                setReasonFor({ r: detail, kind: 'cancel' });
              }}
            >
              Cancelar reserva
            </Button>
          ) : undefined)
        }
      >
        {detail && (
          <>
            <div style={{ marginBottom: 8 }}>
              <Pill tone={STATE[detail.state]?.tone ?? 'neutral'}>{STATE[detail.state]?.text}</Pill>
            </div>
            <dl className="m-dl">
              <div>
                <dt>Fecha</dt>
                <dd style={{ textTransform: 'capitalize' }}>{dayjs(detail.reservation_date).format('dddd D MMM YYYY').replace('.', '')}</dd>
              </div>
              <div>
                <dt>Horario</dt>
                <dd className="m-num">
                  {hhmm(detail.init_hour)} – {hhmm(detail.end_hour)}
                </dd>
              </div>
              <div>
                <dt>Tipo</dt>
                <dd>{MEETING_LABELS[detail.meeting_type] ?? detail.meeting_type}</dd>
              </div>
              <div>
                <dt>Motivo</dt>
                <dd>{detail.reason}</dd>
              </div>
              <div>
                <dt>Personas</dt>
                <dd className="m-num">{detail.participants}</dd>
              </div>
              {fullName(detail.user) && (
                <div>
                  <dt>Para</dt>
                  <dd>{fullName(detail.user)}</dd>
                </div>
              )}
              {(detail.use_computer || detail.user_projector) && (
                <div>
                  <dt>Equipo</dt>
                  <dd>{[detail.use_computer && 'Computadora', detail.user_projector && 'Proyector'].filter(Boolean).join(' y ')}</dd>
                </div>
              )}
              {detail.reject_reason && (
                <div>
                  <dt>Motivo de rechazo</dt>
                  <dd>{detail.reject_reason}</dd>
                </div>
              )}
            </dl>
          </>
        )}
      </Sheet>

      {/* Motivo de cancelación / rechazo */}
      <Sheet
        open={!!reasonFor}
        onClose={() => setReasonFor(null)}
        title={reasonFor?.kind === 'cancel' ? 'Cancelar reserva' : 'Rechazar reserva'}
        footer={
          <div className="m-sheet-actions">
            <Button onClick={() => setReasonFor(null)}>Volver</Button>
            <Button danger type="primary" disabled={!reason.trim()} loading={busy === reasonFor?.r.id} onClick={submitReason}>
              {reasonFor?.kind === 'cancel' ? 'Cancelar reserva' : 'Rechazar'}
            </Button>
          </div>
        }
      >
        {reasonFor && (
          <>
            <p style={{ marginTop: 0 }}>
              <b>{roomName(reasonFor.r)}</b> · {dayjs(reasonFor.r.reservation_date).format('D MMM').replace('.', '')}, {hhmm(reasonFor.r.init_hour)}–{hhmm(reasonFor.r.end_hour)}
            </p>
            <label className="m-field" style={{ marginBottom: 0 }}>
              <span>Motivo</span>
              <textarea className="m-input" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Obligatorio" maxLength={300} />
            </label>
          </>
        )}
      </Sheet>
    </>
  );
}
