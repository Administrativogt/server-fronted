import { useCallback, useEffect, useMemo, useState } from 'react';
import { App, Button } from 'antd';
import { CarOutlined, CheckOutlined, CloseOutlined, EnvironmentOutlined, PlusOutlined, SendOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import api from '../../api/axios';
import {
  createEncargo,
  getEncargos,
  getMunicipios,
  getUsuariosFormulario,
  previewFechaRealizacion,
  updateEncargo,
} from '../../api/encargos';
import { ESTADOS, formatFecha, formatHorario } from '../../pages/mensajeria/constants';
import type { Encargo, Municipio, Usuario } from '../../types/encargo';
import useAuthStore from '../../auth/useAuthStore';
import { EmptyState, ErrorState, Pill, Sheet, SkeletonList } from '../ui';
import { fullName } from '../format';
import { usePullToRefresh } from '../usePullToRefresh';

const MENSAJERO = 8;
const today = () => dayjs().format('YYYY-MM-DD');

const TIPOS = ['enviar factura', 'recoger factura', 'enviar sobre', 'recoger sobre', 'recoger cheque'];
const PRIORIDADES = [
  { value: 1, label: 'A', hint: 'Mismo día' },
  { value: 2, label: 'B', hint: '2 días' },
  { value: 3, label: 'C', hint: '3+ días' },
  { value: 4, label: 'D', hint: 'Villa Nueva' },
];
const ZONAS = Array.from({ length: 26 }, (_, i) => i);
// prioridad_hora: 1 sin horario, 2 antes de, 3 después de, 4 entre
const HORARIOS = [
  { value: 1, label: 'Cualquier hora' },
  { value: 2, label: 'Antes de' },
  { value: 3, label: 'Después de' },
  { value: 4, label: 'Entre' },
];

const tone = (estado: number): 'warning' | 'success' | 'danger' | 'neutral' =>
  estado === 3 || estado === 8 ? 'success' : estado === 4 ? 'danger' : estado === 1 || estado === 2 || estado === 5 ? 'warning' : 'neutral';
const fecha = (e: Encargo) => formatFecha(e.fecha_realizacion);
const isLate = (e: Encargo) => [1, 2, 5].includes(e.estado) && fecha(e) !== '—' && fecha(e) < today();
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const mapsUrl = (e: Encargo) =>
  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    [e.direccion, e.zona ? `zona ${e.zona}` : '', e.municipio?.nombre, 'Guatemala'].filter(Boolean).join(', '),
  )}`;

// ------------------------------------------------------------------
// Crear envío
// ------------------------------------------------------------------
type Draft = {
  tipo: string;
  otro: string;
  empresa: string;
  destinatario: string;
  direccion: string;
  zona: number | null;
  municipioId: number | null;
  solicitanteId: number | null;
  prioridad: number;
  horario: number;
  horaMin: string;
  horaMax: string;
  observaciones: string;
};

function CreateSheet({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: () => void }) {
  const { message } = App.useApp();
  const userId = useAuthStore((s) => s.userId);
  const blank = useCallback(
    (): Draft => ({
      tipo: TIPOS[0],
      otro: '',
      empresa: '',
      destinatario: '',
      direccion: '',
      zona: null,
      municipioId: null,
      solicitanteId: userId ?? null,
      prioridad: 1,
      horario: 1,
      horaMin: '',
      horaMax: '',
      observaciones: '',
    }),
    [userId],
  );
  const [d, setD] = useState<Draft>(blank);
  const [municipios, setMunicipios] = useState<Municipio[] | null>(null);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [fechaPrev, setFechaPrev] = useState<string | null>(null);
  const [touched, setTouched] = useState(false);
  const [sending, setSending] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const set = (p: Partial<Draft>) => setD((x) => ({ ...x, ...p }));

  useEffect(() => {
    if (!open) return;
    setD(blank());
    setTouched(false);
    setServerError(null);
    if (municipios) return;
    Promise.all([getMunicipios(), getUsuariosFormulario()])
      .then(([m, u]) => {
        setMunicipios([...m.data].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es')));
        setUsuarios([...u.data].sort((a, b) => fullName(a).localeCompare(fullName(b), 'es')));
      })
      .catch(() => setMunicipios([]));
  }, [open, municipios, blank]);

  // Fecha estimada: la calcula el backend según prioridad y municipio (corte 9 AM)
  useEffect(() => {
    if (!open) return;
    let alive = true;
    setFechaPrev(null);
    previewFechaRealizacion(d.prioridad, d.municipioId ?? undefined)
      .then(({ data }) => alive && setFechaPrev(formatFecha(data.fecha_realizacion)))
      .catch(() => alive && setFechaPrev(null));
    return () => {
      alive = false;
    };
  }, [open, d.prioridad, d.municipioId]);

  const mensajeria = d.tipo === 'otros' ? d.otro.trim() : d.tipo;
  const formError = !mensajeria
    ? 'Escribe qué se va a enviar o recoger.'
    : !d.empresa.trim()
      ? 'Escribe la empresa.'
      : !d.destinatario.trim()
        ? 'Escribe el destinatario.'
        : !d.direccion.trim()
          ? 'Escribe la dirección.'
          : d.zona === null
            ? 'Elige la zona.'
            : !d.municipioId
              ? 'Elige el municipio.'
              : !d.solicitanteId
                ? 'Elige quién solicita.'
                : d.horario !== 1 && !d.horaMin
                  ? 'Escribe la hora.'
                  : d.horario === 4 && !d.horaMax
                    ? 'Escribe la hora final.'
                    : null;

  const submit = async () => {
    setTouched(true);
    if (formError) return;
    setSending(true);
    setServerError(null);
    try {
      await createEncargo({
        tipo_solicitud_id: 1,
        mensajeria_enviada: mensajeria.slice(0, 140),
        empresa: d.empresa.trim(),
        destinatario: d.destinatario.trim(),
        direccion: d.direccion.trim(),
        zona: d.zona ?? undefined,
        municipio_id: d.municipioId!,
        solicitante_id: d.solicitanteId!,
        prioridad: d.prioridad,
        prioridad_hora: d.horario,
        ...(d.horario !== 1 && d.horaMin ? { hora_minima: `${d.horaMin}:00` } : {}),
        ...(d.horario === 4 && d.horaMax ? { hora_maxima: `${d.horaMax}:00` } : {}),
        observaciones: d.observaciones.trim() || undefined,
      });
      message.success('Envío creado');
      onCreated();
      onClose();
    } catch (e: any) {
      const m = e?.response?.data?.message;
      setServerError(Array.isArray(m) ? m.join('. ') : m || 'No se pudo crear el envío. Intenta de nuevo.');
    } finally {
      setSending(false);
    }
  };

  const after9 = dayjs().hour() >= 9;

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Nuevo envío"
      footer={
        <Button type="primary" block icon={<SendOutlined />} loading={sending} onClick={submit} style={{ height: 50, fontWeight: 600, fontSize: 16 }}>
          Crear envío
        </Button>
      }
    >
      <label className="m-field">
        <span>Qué se hace</span>
        <select className="m-input" value={d.tipo} onChange={(e) => set({ tipo: e.target.value })}>
          {TIPOS.map((t) => (
            <option key={t} value={t}>
              {cap(t)}
            </option>
          ))}
          <option value="otros">Otro…</option>
        </select>
      </label>
      {d.tipo === 'otros' && (
        <label className="m-field">
          <span>Describe el encargo</span>
          <input className="m-input" maxLength={140} value={d.otro} onChange={(e) => set({ otro: e.target.value })} />
        </label>
      )}

      <label className="m-field">
        <span>Empresa</span>
        <input className="m-input" maxLength={140} value={d.empresa} onChange={(e) => set({ empresa: e.target.value })} />
      </label>
      <label className="m-field">
        <span>Destinatario</span>
        <input className="m-input" maxLength={140} value={d.destinatario} onChange={(e) => set({ destinatario: e.target.value })} />
      </label>
      <label className="m-field">
        <span>Dirección</span>
        <input className="m-input" maxLength={140} value={d.direccion} onChange={(e) => set({ direccion: e.target.value })} />
      </label>

      <div className="m-field-row">
        <label className="m-field">
          <span>Zona</span>
          <select className="m-input" value={d.zona ?? ''} onChange={(e) => set({ zona: e.target.value === '' ? null : Number(e.target.value) })}>
            <option value="">Zona</option>
            {ZONAS.map((z) => (
              <option key={z} value={z}>
                {z}
              </option>
            ))}
          </select>
        </label>
        <label className="m-field">
          <span>Municipio</span>
          <select
            className="m-input"
            value={d.municipioId ?? ''}
            disabled={!municipios}
            onChange={(e) => set({ municipioId: e.target.value ? Number(e.target.value) : null })}
          >
            <option value="">{municipios ? 'Elige' : 'Cargando…'}</option>
            {municipios?.map((m) => (
              <option key={m.id} value={m.id}>
                {m.nombre}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="m-field">
        <span>Solicitante</span>
        <select className="m-input" value={d.solicitanteId ?? ''} onChange={(e) => set({ solicitanteId: e.target.value ? Number(e.target.value) : null })}>
          <option value="">Elige quién solicita</option>
          {usuarios.map((u) => (
            <option key={u.id} value={u.id}>
              {fullName(u)}
            </option>
          ))}
        </select>
      </label>

      <div className="m-field">
        <span>Prioridad</span>
        <div className="m-chips" role="group" aria-label="Prioridad">
          {PRIORIDADES.map((p) => (
            <button key={p.value} type="button" className="m-chip m-chip-stack" aria-pressed={d.prioridad === p.value} onClick={() => set({ prioridad: p.value })}>
              {p.label}
              <small>{p.hint}</small>
            </button>
          ))}
        </div>
      </div>

      <div className={`m-note ${after9 && d.prioridad === 1 ? 'warning' : ''}`} style={{ marginBottom: 16 }} aria-live="polite">
        <b>Se realiza el {fechaPrev ? dayjs(fechaPrev).format('dddd D [de] MMMM') : '…'}</b>
        {after9 && <div className="m-item-meta">Después de las 9 A. M. pasa al siguiente día hábil.</div>}
      </div>

      <label className="m-field">
        <span>Horario de entrega</span>
        <select className="m-input" value={d.horario} onChange={(e) => set({ horario: Number(e.target.value), horaMax: '' })}>
          {HORARIOS.map((h) => (
            <option key={h.value} value={h.value}>
              {h.label}
            </option>
          ))}
        </select>
      </label>
      {d.horario !== 1 && (
        <div className="m-field-row">
          <label className="m-field">
            <span>{d.horario === 4 ? 'Desde' : 'Hora'}</span>
            <input className="m-input" type="time" value={d.horaMin} onChange={(e) => set({ horaMin: e.target.value })} />
          </label>
          {d.horario === 4 && (
            <label className="m-field">
              <span>Hasta</span>
              <input className="m-input" type="time" value={d.horaMax} onChange={(e) => set({ horaMax: e.target.value })} />
            </label>
          )}
        </div>
      )}

      <label className="m-field">
        <span>Observaciones</span>
        <textarea className="m-input" placeholder="Opcional" value={d.observaciones} onChange={(e) => set({ observaciones: e.target.value })} />
      </label>

      {touched && formError && <div className="m-field-error" style={{ marginTop: -8, marginBottom: 12 }}>{formError}</div>}
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
type Action = { e: Encargo; kind: 'late' | 'not-delivered' };

export default function MobileEnvios() {
  const { message } = App.useApp();
  const userId = useAuthStore((s) => s.userId);
  const tipoUsuario = useAuthStore((s) => s.tipo_usuario);
  const isMensajero = Number(tipoUsuario) === MENSAJERO;

  const [route, setRoute] = useState<Encargo[] | null>(null);
  const [mine, setMine] = useState<Encargo[] | null>(null);
  const [error, setError] = useState(false);
  const [detail, setDetail] = useState<Encargo | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [action, setAction] = useState<Action | null>(null);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState<number | null>(null);

  const load = useCallback(async () => {
    try {
      if (isMensajero) {
        // Por iniciar (1), en proceso (2) y extraordinarios (5) asignados a mí
        const { data } = await getEncargos({ estados: [1, 2, 5], mensajero: userId });
        setRoute(data);
      }
      if (!isMensajero) {
        // Lo que creé o pedí: 30 días atrás y lo próximo
        const { data } = await getEncargos({
          start: dayjs().subtract(30, 'day').format('YYYY-MM-DD'),
          end: dayjs().add(60, 'day').format('YYYY-MM-DD'),
        });
        const me = Number(userId);
        setMine(data.filter((e) => Number(e.solicitante?.id) === me || Number(e.usuario_creador?.id) === me));
      }
      setError(false);
    } catch {
      setError(true);
    }
  }, [isMensajero, userId]);

  useEffect(() => {
    load();
  }, [load]);
  const { indicator } = usePullToRefresh(load);

  const byDate = (a: Encargo, b: Encargo) => fecha(a).localeCompare(fecha(b)) || (a.zona ?? 0) - (b.zona ?? 0);
  const routeGroups = useMemo(() => {
    const list = [...(route ?? [])].sort(byDate);
    return { enRuta: list.filter((e) => e.estado !== 1), porIniciar: list.filter((e) => e.estado === 1) };
  }, [route]);
  const mineGroups = useMemo(() => {
    const list = [...(mine ?? [])];
    return {
      activos: list.filter((e) => [1, 2, 5].includes(e.estado)).sort(byDate),
      cerrados: list.filter((e) => ![1, 2, 5].includes(e.estado)).sort((a, b) => fecha(b).localeCompare(fecha(a))),
    };
  }, [mine]);

  const done = (msg: string) => {
    message.success(msg);
    setAction(null);
    setDetail(null);
    load();
  };
  const fail = (e: any, fallback: string) => message.error(e?.response?.data?.message || fallback);

  const start = async (e: Encargo) => {
    setBusy(e.id);
    try {
      await updateEncargo(e.id, { estado: 2 } as any);
      done('Envío en ruta');
    } catch (err) {
      fail(err, 'No se pudo iniciar');
    } finally {
      setBusy(null);
    }
  };

  // Igual que deliver.tsx: 3 (u 8 si era extraordinario) + fecha_entrega; razón si va tarde
  const deliver = async (e: Encargo, razonTardanza?: string) => {
    if (isLate(e) && !razonTardanza) {
      setReason('');
      setAction({ e, kind: 'late' });
      return;
    }
    setBusy(e.id);
    try {
      await updateEncargo(e.id, {
        estado: e.estado === 5 ? 8 : 3,
        fecha_entrega: today(),
        ...(razonTardanza ? { razon_tardanza: razonTardanza } : {}),
      } as any);
      done('Marcado como entregado');
    } catch (err) {
      fail(err, 'No se pudo marcar entregado');
    } finally {
      setBusy(null);
    }
  };

  const notDelivered = async (e: Encargo, razon: string) => {
    setBusy(e.id);
    try {
      await api.patch(`/api/encargos/${e.id}/not-delivered`, { razon });
      done('Marcado como no entregado. Avisamos al solicitante.');
    } catch (err) {
      fail(err, 'No se pudo registrar');
    } finally {
      setBusy(null);
    }
  };

  const submitReason = () => {
    if (!action || !reason.trim()) return;
    if (action.kind === 'late') deliver(action.e, reason.trim().slice(0, 140));
    else notDelivered(action.e, reason.trim().slice(0, 140));
  };

  const list = isMensajero ? route : mine;
  if (error && !list) return <ErrorState text="Revisa tu conexión e intenta de nuevo." onRetry={load} />;

  const row = (e: Encargo) => {
    const st = ESTADOS[e.estado] ?? { label: 'Desconocido' };
    const horario = formatHorario(e);
    return (
      <div className="m-item" key={e.id}>
        <button className="m-row-btn" style={{ width: '100%', flexDirection: 'column', gap: 0 }} onClick={() => setDetail(e)}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, width: '100%' }}>
            <div className="m-item-title">{e.destinatario}</div>
            <Pill tone={tone(e.estado)}>{st.label}</Pill>
          </div>
          <div className="m-item-meta">
            {cap(e.mensajeria_enviada)} · {e.empresa}
          </div>
          <div className="m-item-meta">
            {e.direccion}
            {e.zona ? `, zona ${e.zona}` : ''}
            {e.municipio?.nombre ? ` · ${e.municipio.nombre}` : ''}
          </div>
          <div className={`m-item-meta ${isLate(e) ? 'm-negative' : ''}`} style={{ fontWeight: isLate(e) ? 600 : undefined }}>
            {fecha(e) === today() ? 'Hoy' : dayjs(fecha(e)).format('ddd D MMM').replace('.', '')}
            {isLate(e) ? ' · atrasado' : ''}
            {horario ? ` · ${horario}` : ''}
          </div>
        </button>
      </div>
    );
  };

  const canAct = (e: Encargo) => isMensajero && [1, 2, 5].includes(e.estado);

  return (
    <>
      {indicator}

      {!isMensajero && (
        <div className="m-cta">
          <Button type="primary" icon={<PlusOutlined />} block onClick={() => setCreateOpen(true)}>
            Nuevo envío
          </Button>
        </div>
      )}

      {!list ? (
        <>
          <div className="m-heading">{isMensajero ? 'En ruta' : 'Mis envíos'}</div>
          <SkeletonList rows={3} />
        </>
      ) : isMensajero ? (
        route!.length === 0 ? (
          <EmptyState icon={<CarOutlined />} title="Sin envíos asignados" text="Cuando te asignen un envío aparecerá aquí, ordenado por fecha y zona." />
        ) : (
          <>
            {routeGroups.enRuta.length > 0 && (
              <>
                <div className="m-heading">
                  En ruta <small>{routeGroups.enRuta.length}</small>
                </div>
                <div className="m-list">{routeGroups.enRuta.map(row)}</div>
              </>
            )}
            {routeGroups.porIniciar.length > 0 && (
              <>
                <div className="m-heading">
                  Por iniciar <small>{routeGroups.porIniciar.length}</small>
                </div>
                <div className="m-list">{routeGroups.porIniciar.map(row)}</div>
              </>
            )}
          </>
        )
      ) : mine!.length === 0 ? (
        <EmptyState icon={<SendOutlined />} title="Sin envíos recientes" text="Los envíos que pidas aparecerán aquí con su estado. Mostramos los últimos 30 días." />
      ) : (
        <>
          {mineGroups.activos.length > 0 && (
            <>
              <div className="m-heading">
                En curso <small>{mineGroups.activos.length}</small>
              </div>
              <div className="m-list">{mineGroups.activos.map(row)}</div>
            </>
          )}
          {mineGroups.cerrados.length > 0 && (
            <>
              <div className="m-heading">Finalizados</div>
              <div className="m-list">{mineGroups.cerrados.map(row)}</div>
            </>
          )}
        </>
      )}

      <CreateSheet open={createOpen} onClose={() => setCreateOpen(false)} onCreated={load} />

      {/* Detalle */}
      <Sheet
        open={!!detail}
        onClose={() => setDetail(null)}
        title={detail?.destinatario}
        footer={
          detail &&
          canAct(detail) &&
          (detail.estado === 1 ? (
            <Button type="primary" block icon={<CarOutlined />} loading={busy === detail.id} onClick={() => start(detail)} style={{ height: 48, fontWeight: 600 }}>
              Iniciar envío
            </Button>
          ) : (
            <div className="m-sheet-actions">
              <Button
                icon={<CloseOutlined />}
                disabled={busy === detail.id}
                onClick={() => {
                  setReason('');
                  setAction({ e: detail, kind: 'not-delivered' });
                }}
              >
                No entregado
              </Button>
              <Button type="primary" icon={<CheckOutlined />} loading={busy === detail.id} onClick={() => deliver(detail)}>
                Entregado
              </Button>
            </div>
          ))
        }
      >
        {detail && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 8 }}>
              <b>{cap(detail.mensajeria_enviada)}</b>
              <Pill tone={tone(detail.estado)}>{ESTADOS[detail.estado]?.label ?? '—'}</Pill>
            </div>
            <dl className="m-dl">
              <div>
                <dt>Empresa</dt>
                <dd>{detail.empresa}</dd>
              </div>
              <div>
                <dt>Dirección</dt>
                <dd>
                  {detail.direccion}
                  {detail.zona ? `, zona ${detail.zona}` : ''}
                  {detail.municipio?.nombre ? `, ${detail.municipio.nombre}` : ''}
                </dd>
              </div>
              <div>
                <dt>Fecha</dt>
                <dd className={isLate(detail) ? 'm-negative' : undefined}>
                  {fecha(detail) !== '—' ? dayjs(fecha(detail)).format('D MMM YYYY').replace('.', '') : '—'}
                  {isLate(detail) ? ' (atrasado)' : ''}
                </dd>
              </div>
              {formatHorario(detail) && (
                <div>
                  <dt>Horario</dt>
                  <dd>{formatHorario(detail)}</dd>
                </div>
              )}
              <div>
                <dt>Solicita</dt>
                <dd>{fullName(detail.solicitante) || '—'}</dd>
              </div>
              <div>
                <dt>Mensajero</dt>
                <dd>{fullName(detail.mensajero) || 'Sin asignar'}</dd>
              </div>
              {detail.fecha_entrega && (
                <div>
                  <dt>Entregado</dt>
                  <dd>{dayjs(formatFecha(detail.fecha_entrega)).format('D MMM YYYY').replace('.', '')}</dd>
                </div>
              )}
            </dl>

            {[
              ['Observaciones', detail.observaciones],
              ['Motivo', detail.incidencias],
              ['Razón de anulación', detail.razon_rechazo],
              ['Razón de tardanza', detail.razon_tardanza],
            ]
              .filter(([, v]) => v)
              .map(([k, v]) => (
                <div key={k as string}>
                  <div className="m-heading" style={{ margin: '16px 0 6px' }}>
                    {k}
                  </div>
                  <p style={{ margin: 0, whiteSpace: 'pre-wrap', userSelect: 'text' }}>{v}</p>
                </div>
              ))}

            <Button block icon={<EnvironmentOutlined />} href={mapsUrl(detail)} target="_blank" rel="noreferrer" style={{ height: 48, marginTop: 16, fontWeight: 600 }}>
              Abrir en Maps
            </Button>
          </>
        )}
      </Sheet>

      {/* Razón: entrega tardía o no entregado */}
      <Sheet
        open={!!action}
        onClose={() => setAction(null)}
        title={action?.kind === 'late' ? 'Entrega tardía' : '¿No se pudo entregar?'}
        footer={
          action && (
            <div className="m-sheet-actions">
              <Button onClick={() => setAction(null)}>Volver</Button>
              <Button type="primary" danger={action.kind === 'not-delivered'} disabled={!reason.trim()} loading={busy === action.e.id} onClick={submitReason}>
                {action.kind === 'late' ? 'Marcar entregado' : 'Marcar no entregado'}
              </Button>
            </div>
          )
        }
      >
        {action && (
          <>
            <p style={{ marginTop: 0 }}>
              {action.kind === 'late'
                ? 'La fecha del envío ya pasó. Escribe por qué se entregó tarde.'
                : 'Escribe el motivo. Le avisaremos por correo al solicitante y a quien lo creó.'}
            </p>
            <textarea
              className="m-input"
              maxLength={140}
              autoFocus
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={action.kind === 'late' ? 'Razón de la tardanza' : 'Ej. oficina cerrada, nadie recibió'}
            />
            <div className="m-item-meta" style={{ textAlign: 'right', marginTop: 4 }}>
              {reason.length}/140
            </div>
          </>
        )}
      </Sheet>
    </>
  );
}
