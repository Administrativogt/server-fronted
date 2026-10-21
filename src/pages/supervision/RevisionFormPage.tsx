import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  Alert,
  Button,
  Card,
  DatePicker,
  Input,
  message,
  Popconfirm,
  Select,
  Skeleton,
  Space,
  Tag,
  TimePicker,
  Tooltip,
  Typography,
} from 'antd';
import {
  ArrowLeftOutlined,
  CheckOutlined,
  CloseOutlined,
  DeleteOutlined,
  DownloadOutlined,
  SaveOutlined,
  UserAddOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import {
  createRevision,
  deleteRevision,
  formatPuntaje,
  getCatalogo,
  getPersonal,
  getRevision,
  listRevisiones,
  nivelPuntaje,
  TIPO_LABEL,
  updateRevision,
  type Cumplimiento,
  type EvaluadoPayload,
  type PersonalItem,
  type Revision,
  type RevisionPayload,
  type SupervisionCatalogo,
  type SupervisionTipo,
} from '../../api/supervision';
import { exportRevisionExcel } from './exportSupervision';
import { useSupervisionVars } from './useSupervisionVars';
import './supervision.css';

const { Title, Text } = Typography;

type Persona = EvaluadoPayload & { key: string };
type Header = Omit<RevisionPayload, 'evaluados' | 'tipo'>;

const OPCIONES: { value: Cumplimiento; label: string; title: string }[] = [
  { value: 'CUMPLE', label: 'Sí', title: 'Cumple' },
  { value: 'PARCIAL', label: 'Parcial', title: 'Cumple parcialmente' },
  { value: 'NO_CUMPLE', label: 'No', title: 'No cumple' },
  { value: 'NA', label: 'N/A', title: 'No aplica' },
];

const apiError = (err: unknown, fallback: string) =>
  (err as { response?: { data?: { message?: string } } })?.response?.data?.message || fallback;

const personaKey = (usuarioId: number | null, nombre: string) =>
  usuarioId != null ? `u${usuarioId}` : `n${nombre.toUpperCase()}`;

const nuevaPersona = (usuarioId: number | null, nombre: string): Persona => ({
  key: personaKey(usuarioId, nombre),
  usuario_id: usuarioId,
  nombre,
  calificaciones: {},
  incidencias: {},
  vehiculo: '',
  telefono: '',
  hora_salida: null,
  hora_retorno: null,
  observaciones: '',
});

const headerVacio = (fecha: string): Header => ({
  fecha,
  sede: '',
  observaciones_items: {},
  descripcion_incidencias: '',
  observaciones_generales: '',
  compromisos: '',
});

const fromRevision = (rev: Revision): { header: Header; personas: Persona[] } => ({
  header: {
    fecha: rev.fecha,
    sede: rev.sede,
    observaciones_items: rev.observaciones_items ?? {},
    descripcion_incidencias: rev.descripcion_incidencias,
    observaciones_generales: rev.observaciones_generales,
    compromisos: rev.compromisos,
  },
  personas: rev.evaluados.map((e) => ({
    key: personaKey(e.usuario?.id ?? null, e.nombre),
    usuario_id: e.usuario?.id ?? null,
    nombre: e.nombre,
    calificaciones: e.calificaciones ?? {},
    incidencias: e.incidencias ?? {},
    vehiculo: e.vehiculo,
    telefono: e.telefono,
    hora_salida: e.hora_salida?.slice(0, 5) ?? null,
    hora_retorno: e.hora_retorno?.slice(0, 5) ?? null,
    observaciones: e.observaciones,
  })),
});

/** Mismo cálculo que SupervisionService.resumen en el backend. */
function puntajeVivo(tipo: SupervisionTipo, keys: string[], p: Persona) {
  const vals = keys.map((k) => p.calificaciones[k]).filter((v) => v != null);
  if (tipo === 'MENSAJERIA') {
    const c = vals.filter((v) => v === 'CUMPLE').length;
    const pa = vals.filter((v) => v === 'PARCIAL').length;
    const n = c + pa + vals.filter((v) => v === 'NO_CUMPLE').length;
    return { puntaje: n ? Math.round(((c + pa * 0.5) / n) * 1000) / 10 : null, total: 0, calificados: n };
  }
  const notas = vals.map(Number);
  const total = notas.reduce((a, b) => a + b, 0);
  return {
    puntaje: notas.length ? Math.round((total / notas.length) * 100) / 100 : null,
    total,
    calificados: notas.length,
  };
}

function CumplimientoPicker({
  value,
  onChange,
  label,
}: {
  value: Cumplimiento | undefined;
  onChange: (v: Cumplimiento | undefined) => void;
  label: string;
}) {
  return (
    <span className="sv-opts" role="group" aria-label={label}>
      {OPCIONES.map((o) => (
        <button
          key={o.value}
          type="button"
          title={o.title}
          className={`sv-opt v-${o.value}`}
          aria-pressed={value === o.value}
          onClick={() => onChange(value === o.value ? undefined : o.value)}
        >
          {o.label}
        </button>
      ))}
    </span>
  );
}

function NotaPicker({
  value,
  onChange,
  label,
  escala,
}: {
  value: number | undefined;
  onChange: (v: number | undefined) => void;
  label: string;
  escala: SupervisionCatalogo['limpieza']['escala'];
}) {
  return (
    <span className="sv-notas" role="group" aria-label={label}>
      {escala.map((e) => (
        <button
          key={e.valor}
          type="button"
          title={`${e.valor} = ${e.label}`}
          className={`sv-nota n${e.valor}`}
          aria-pressed={value === e.valor}
          onClick={() => onChange(value === e.valor ? undefined : e.valor)}
        >
          {e.valor}
        </button>
      ))}
    </span>
  );
}

// Formulario diario de Mara: una columna por persona, como el Excel/Word que
// llenaba a mano. Sirve para crear (/nueva/:tipo?fecha=) y editar (/revision/:id).
export default function RevisionFormPage() {
  const { id, tipo: tipoParam } = useParams();
  const [search] = useSearchParams();
  const fechaParam = search.get('fecha');
  const navigate = useNavigate();
  const cssVars = useSupervisionVars();
  const revisionId = id ? Number(id) : null;

  const [tipo, setTipo] = useState<SupervisionTipo>(tipoParam === 'limpieza' ? 'LIMPIEZA' : 'MENSAJERIA');
  const [catalogo, setCatalogo] = useState<SupervisionCatalogo | null>(null);
  const [personal, setPersonal] = useState<PersonalItem[]>([]);
  const [header, setHeader] = useState<Header>(() => headerVacio(fechaParam || dayjs().format('YYYY-MM-DD')));
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [saved, setSaved] = useState<Revision | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [prefillFrom, setPrefillFrom] = useState<string | null>(null);
  const [nombreLibre, setNombreLibre] = useState('');
  const saveRef = useRef<() => void>(() => {});

  const esMens = tipo === 'MENSAJERIA';

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      try {
        const cat = await getCatalogo();
        if (revisionId) {
          const rev = await getRevision(revisionId);
          const pers = await getPersonal(rev.tipo);
          if (!alive) return;
          const f = fromRevision(rev);
          setTipo(rev.tipo);
          setHeader(f.header);
          setPersonas(f.personas);
          setSaved(rev);
          setPersonal(pers);
        } else {
          const t: SupervisionTipo = tipoParam === 'limpieza' ? 'LIMPIEZA' : 'MENSAJERIA';
          const fecha = fechaParam || dayjs().format('YYYY-MM-DD');
          const [pers, recientes] = await Promise.all([
            getPersonal(t),
            listRevisiones({ tipo: t, from: dayjs(fecha).subtract(45, 'day').format('YYYY-MM-DD'), to: fecha }),
          ]);
          if (!alive) return;
          const mismaFecha = recientes.find((r) => r.fecha === fecha);
          if (mismaFecha) {
            navigate(`/dashboard/supervision/revision/${mismaFecha.id}`, { replace: true });
            return;
          }
          setPersonal(pers);
          // Arranca con las mismas personas (y vehículo/teléfono) de la última
          // revisión; las calificaciones siempre empiezan vacías.
          const anterior = recientes[0];
          if (anterior) {
            const f = fromRevision(anterior);
            setPersonas(
              f.personas.map((p) => ({
                ...nuevaPersona(p.usuario_id, p.nombre),
                vehiculo: p.vehiculo,
                telefono: p.telefono,
              })),
            );
            setHeader({ ...headerVacio(fecha), sede: anterior.sede });
            setPrefillFrom(anterior.fecha);
          } else {
            setPersonas(pers.map((p) => nuevaPersona(p.id, p.nombre)));
            setHeader(headerVacio(fecha));
          }
        }
        if (alive) setCatalogo(cat);
      } catch (err) {
        message.error(apiError(err, 'No se pudo cargar la revisión'));
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [revisionId, tipoParam, fechaParam, navigate]);

  // Aviso del navegador si se cierra con cambios sin guardar
  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [dirty]);

  // Ctrl/Cmd + S guarda
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        saveRef.current();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const secciones = useMemo(
    () => (catalogo ? (esMens ? catalogo.mensajeria.secciones : catalogo.limpieza.secciones) : []),
    [catalogo, esMens],
  );
  const criterioKeys = useMemo(() => secciones.flatMap((s) => s.criterios.map((c) => c.key)), [secciones]);

  const patchHeader = (p: Partial<Header>) => {
    setHeader((h) => ({ ...h, ...p }));
    setDirty(true);
  };
  const patchPersona = (key: string, fn: (p: Persona) => Persona) => {
    setPersonas((ps) => ps.map((p) => (p.key === key ? fn(p) : p)));
    setDirty(true);
  };
  const setCalificacion = (key: string, criterio: string, v: Cumplimiento | number | undefined) =>
    patchPersona(key, (p) => {
      const calificaciones = { ...p.calificaciones };
      if (v === undefined) delete calificaciones[criterio];
      else calificaciones[criterio] = v;
      return { ...p, calificaciones };
    });
  const todoCumple = (key: string) =>
    patchPersona(key, (p) => {
      const calificaciones = { ...p.calificaciones };
      criterioKeys.forEach((k) => {
        if (calificaciones[k] == null) calificaciones[k] = 'CUMPLE';
      });
      return { ...p, calificaciones };
    });

  const agregar = (p: Persona) => {
    if (personas.some((x) => x.key === p.key)) {
      message.info(`${p.nombre} ya está en la revisión`);
      return;
    }
    setPersonas((ps) => [...ps, p]);
    setDirty(true);
  };
  const quitar = (key: string) => {
    setPersonas((ps) => ps.filter((p) => p.key !== key));
    setDirty(true);
  };

  const disponibles = personal.filter((p) => !personas.some((x) => x.usuario_id === p.id));

  const save = useCallback(async () => {
    if (saving) return;
    if (!personas.length) {
      message.warning('Agrega al menos una persona a evaluar');
      return;
    }
    const sinCalificar = personas.filter((p) => !Object.keys(p.calificaciones).length);
    if (sinCalificar.length) {
      message.warning(`Falta calificar a ${sinCalificar.map((p) => p.nombre).join(', ')}`);
      return;
    }
    const payload: RevisionPayload = {
      tipo,
      ...header,
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      evaluados: personas.map(({ key: _key, ...p }) => p),
    };
    setSaving(true);
    try {
      const rev = saved ? await updateRevision(saved.id, payload) : await createRevision(payload);
      setSaved(rev);
      setDirty(false);
      message.success('Revisión guardada');
      if (!saved) navigate(`/dashboard/supervision/revision/${rev.id}`, { replace: true });
    } catch (err) {
      const data = (err as { response?: { status?: number; data?: { revisionId?: number } } })?.response;
      if (data?.status === 409 && data.data?.revisionId) {
        message.warning('Ya hay una revisión para esa fecha; se abrió para editarla.');
        navigate(`/dashboard/supervision/revision/${data.data.revisionId}`);
        return;
      }
      message.error(apiError(err, 'No se pudo guardar la revisión'));
    } finally {
      setSaving(false);
    }
  }, [saving, personas, tipo, header, saved, navigate]);
  saveRef.current = save;

  const remove = async () => {
    if (!saved) return;
    try {
      await deleteRevision(saved.id);
      setDirty(false);
      message.success('Revisión eliminada');
      navigate(`/dashboard/supervision?tipo=${tipo.toLowerCase()}`);
    } catch (err) {
      message.error(apiError(err, 'No se pudo eliminar'));
    }
  };

  if (loading || !catalogo) {
    return (
      <div className="sv-page" style={{ padding: 24, ...cssVars }}>
        <Skeleton active paragraph={{ rows: 10 }} />
      </div>
    );
  }

  const nombreCorto = (n: string) => n.toLowerCase();

  const personHeader = (p: Persona) => {
    const s = puntajeVivo(tipo, criterioKeys, p);
    return (
      <th key={p.key} className="sv-person" scope="col">
        <span className="sv-person-name">{nombreCorto(p.nombre)}</span>
        <Space size={4} style={{ marginTop: 4 }}>
          <Tag color={nivelPuntaje(tipo, s.puntaje)} style={{ marginInlineEnd: 0 }}>
            {formatPuntaje(tipo, s.puntaje)}
          </Tag>
          {esMens && s.calificados < criterioKeys.length && (
            <Tooltip title="Marca 'Sí' en los criterios que aún están vacíos">
              <Button size="small" type="link" icon={<CheckOutlined />} onClick={() => todoCumple(p.key)}>
                Resto Sí
              </Button>
            </Tooltip>
          )}
        </Space>
      </th>
    );
  };

  const fechaLabel = dayjs(header.fecha).format('dddd D [de] MMMM YYYY');

  return (
    <div className="sv-page" style={{ padding: 24, ...cssVars }}>
      <Space style={{ width: '100%', justifyContent: 'space-between', marginBottom: 16 }} wrap>
        <Space align="start">
          <Tooltip title="Volver al control">
            <Button
              icon={<ArrowLeftOutlined />}
              onClick={() => navigate(`/dashboard/supervision?tipo=${tipo.toLowerCase()}`)}
              aria-label="Volver"
            />
          </Tooltip>
          <div>
            <Title level={3} style={{ margin: 0 }}>
              Supervisión de {TIPO_LABEL[tipo].toLowerCase()}
            </Title>
            <Text type="secondary" style={{ textTransform: 'capitalize' }}>
              {fechaLabel}
              {saved?.creator && (
                <span style={{ textTransform: 'none' }}>
                  {' · '}Creado por {`${saved.creator.first_name} ${saved.creator.last_name}`.trim()}
                </span>
              )}
            </Text>
          </div>
        </Space>
        {saved && (
          <Space wrap>
            <Button
              icon={<DownloadOutlined />}
              disabled={dirty}
              title={dirty ? 'Guarda los cambios antes de descargar' : undefined}
              onClick={() => exportRevisionExcel(saved, catalogo)}
            >
              Descargar Excel
            </Button>
            <Popconfirm
              title="¿Eliminar esta revisión?"
              description="Se borran las calificaciones de todas las personas de este día."
              okText="Eliminar"
              okButtonProps={{ danger: true }}
              cancelText="Cancelar"
              onConfirm={remove}
            >
              <Button danger icon={<DeleteOutlined />}>
                Eliminar
              </Button>
            </Popconfirm>
          </Space>
        )}
      </Space>

      {prefillFrom && !saved && (
        <Alert
          type="info"
          showIcon
          closable
          style={{ marginBottom: 16 }}
          message={`Se cargaron las mismas personas de la revisión del ${dayjs(prefillFrom).format('D [de] MMMM')}. Las calificaciones empiezan vacías.`}
        />
      )}

      <Card size="small" title="Datos generales" style={{ marginBottom: 16 }}>
        <Space wrap size={[24, 12]} align="start">
          <div>
            <Text type="secondary" style={{ display: 'block', fontSize: 12 }}>
              Fecha
            </Text>
            <DatePicker
              value={dayjs(header.fecha)}
              format="DD/MM/YYYY"
              allowClear={false}
              disabledDate={(d) => d.isAfter(dayjs(), 'day')}
              onChange={(d) => d && patchHeader({ fecha: d.format('YYYY-MM-DD') })}
            />
          </div>
          <div style={{ minWidth: 260 }}>
            <Text type="secondary" style={{ display: 'block', fontSize: 12 }}>
              {esMens ? 'Ruta / Zona' : 'Sede / Oficina'}
            </Text>
            <Input
              value={header.sede}
              maxLength={255}
              placeholder={esMens ? 'Ej. Zona 10, bancos y Torre Internacional' : 'Ej. Oficinas Guatemala'}
              onChange={(e) => patchHeader({ sede: e.target.value })}
            />
          </div>
          <div style={{ minWidth: 320, flex: 1 }}>
            <Text type="secondary" style={{ display: 'block', fontSize: 12 }}>
              Personas evaluadas
            </Text>
            <Space wrap size={[6, 6]}>
              {personas.map((p) => (
                <Tag
                  key={p.key}
                  closable
                  closeIcon={<CloseOutlined aria-label={`Quitar a ${p.nombre}`} />}
                  onClose={(e) => {
                    e.preventDefault();
                    quitar(p.key);
                  }}
                  style={{ textTransform: 'capitalize', padding: '2px 8px', marginInlineEnd: 0 }}
                >
                  {nombreCorto(p.nombre)}
                  {p.usuario_id == null && <Text type="secondary"> (sin usuario)</Text>}
                </Tag>
              ))}
              {disponibles.length > 0 && (
                <Select
                  size="small"
                  style={{ minWidth: 200 }}
                  placeholder="Agregar persona…"
                  value={null}
                  options={disponibles.map((p) => ({ value: p.id, label: p.nombre }))}
                  onChange={(v: number) => {
                    const p = personal.find((x) => x.id === v);
                    if (p) agregar(nuevaPersona(p.id, p.nombre));
                  }}
                />
              )}
              <Space.Compact size="small">
                <Input
                  style={{ width: 190 }}
                  value={nombreLibre}
                  maxLength={255}
                  placeholder="Nombre (sin usuario)"
                  onChange={(e) => setNombreLibre(e.target.value)}
                  onPressEnter={() => {
                    if (!nombreLibre.trim()) return;
                    agregar(nuevaPersona(null, nombreLibre.trim().toUpperCase()));
                    setNombreLibre('');
                  }}
                />
                <Button
                  icon={<UserAddOutlined />}
                  disabled={!nombreLibre.trim()}
                  onClick={() => {
                    agregar(nuevaPersona(null, nombreLibre.trim().toUpperCase()));
                    setNombreLibre('');
                  }}
                  aria-label="Agregar persona sin usuario"
                />
              </Space.Compact>
            </Space>
          </div>
        </Space>
      </Card>

      {personas.length === 0 ? (
        <Alert type="warning" showIcon message="Agrega al menos una persona para empezar a calificar." />
      ) : (
        <>
          {esMens && (
            <Card size="small" title="1. Datos de los mensajeros" style={{ marginBottom: 16 }}>
              <div className="sv-grid-wrap">
                <table className="sv-grid">
                  <thead>
                    <tr>
                      <th className="sv-crit" scope="col">Mensajero</th>
                      <th scope="col">Vehículo / Placa</th>
                      <th scope="col">Teléfono / Contacto</th>
                      <th scope="col">Hora salida</th>
                      <th scope="col">Hora retorno</th>
                    </tr>
                  </thead>
                  <tbody>
                    {personas.map((p) => (
                      <tr key={p.key}>
                        <td className="sv-crit" style={{ textTransform: 'capitalize' }}>
                          {nombreCorto(p.nombre)}
                        </td>
                        <td>
                          <Input
                            size="small"
                            value={p.vehiculo}
                            maxLength={100}
                            placeholder="Moto P-123ABC"
                            onChange={(e) => patchPersona(p.key, (x) => ({ ...x, vehiculo: e.target.value }))}
                          />
                        </td>
                        <td>
                          <Input
                            size="small"
                            value={p.telefono}
                            maxLength={50}
                            onChange={(e) => patchPersona(p.key, (x) => ({ ...x, telefono: e.target.value }))}
                          />
                        </td>
                        {(['hora_salida', 'hora_retorno'] as const).map((campo) => (
                          <td key={campo}>
                            <TimePicker
                              size="small"
                              format="HH:mm"
                              minuteStep={5}
                              needConfirm={false}
                              value={p[campo] ? dayjs(p[campo], 'HH:mm') : null}
                              onChange={(t) =>
                                patchPersona(p.key, (x) => ({ ...x, [campo]: t ? t.format('HH:mm') : null }))
                              }
                            />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          <Card
            size="small"
            title={esMens ? 'Evaluación de cumplimiento' : 'Evaluación de áreas y elementos'}
            extra={
              esMens ? (
                <Text type="secondary" style={{ fontSize: 12 }}>
                  Sí = cumple · Parcial = cumple parcialmente · N/A no cuenta para el %
                </Text>
              ) : (
                <Text type="secondary" style={{ fontSize: 12 }}>
                  {catalogo.limpieza.escala.map((e) => `${e.valor} ${e.label}`).join(' · ')} — califica solo a la
                  responsable de cada área
                </Text>
              )
            }
            style={{ marginBottom: 16 }}
          >
            <div className="sv-grid-wrap">
              <table className="sv-grid">
                <thead>
                  <tr>
                    <th className="sv-crit" scope="col">
                      {esMens ? 'Criterio de evaluación' : 'Áreas y elementos'}
                    </th>
                    {personas.map(personHeader)}
                    <th className="sv-obs" scope="col">
                      {esMens ? 'Observaciones / Detalles' : 'Observaciones / Correcciones'}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {secciones.map((s, i) => [
                    <tr key={s.key} className="sv-section">
                      <td className="sv-crit">
                        {esMens ? i + 2 : i + 1}. {s.titulo}
                      </td>
                      <td colSpan={personas.length + 1} />
                    </tr>,
                    ...s.criterios.map((c) => (
                      <tr key={c.key}>
                        <td className="sv-crit">{c.label}</td>
                        {personas.map((p) => (
                          <td key={p.key} className="sv-person">
                            {esMens ? (
                              <CumplimientoPicker
                                label={`${c.label} — ${p.nombre}`}
                                value={p.calificaciones[c.key] as Cumplimiento | undefined}
                                onChange={(v) => setCalificacion(p.key, c.key, v)}
                              />
                            ) : (
                              <NotaPicker
                                label={`${c.label} — ${p.nombre}`}
                                escala={catalogo.limpieza.escala}
                                value={p.calificaciones[c.key] as number | undefined}
                                onChange={(v) => setCalificacion(p.key, c.key, v)}
                              />
                            )}
                          </td>
                        ))}
                        <td className="sv-obs">
                          <Input
                            size="small"
                            variant="borderless"
                            placeholder="—"
                            value={header.observaciones_items[c.key] ?? ''}
                            onChange={(e) =>
                              patchHeader({
                                observaciones_items: { ...header.observaciones_items, [c.key]: e.target.value },
                              })
                            }
                          />
                        </td>
                      </tr>
                    )),
                  ])}
                  {!esMens && (
                    <>
                      <tr className="sv-total">
                        <td className="sv-crit">Puntaje total</td>
                        {personas.map((p) => {
                          const s = puntajeVivo(tipo, criterioKeys, p);
                          return (
                            <td key={p.key} className="sv-person">
                              {s.calificados ? `${s.total} / ${s.calificados * 5}` : '—'}
                            </td>
                          );
                        })}
                        <td />
                      </tr>
                      <tr className="sv-total">
                        <td className="sv-crit">Promedio (1 a 5)</td>
                        {personas.map((p) => {
                          const s = puntajeVivo(tipo, criterioKeys, p);
                          return (
                            <td key={p.key} className="sv-person">
                              {s.puntaje ?? '—'}
                            </td>
                          );
                        })}
                        <td />
                      </tr>
                    </>
                  )}
                </tbody>
              </table>
            </div>
          </Card>

          {esMens ? (
            <Card size="small" title="7. Anomalías e incidencias en ruta" style={{ marginBottom: 16 }}>
              <div className="sv-grid-wrap" style={{ marginBottom: 12 }}>
                <table className="sv-grid">
                  <thead>
                    <tr>
                      <th className="sv-crit" scope="col">Tipo de incidencia</th>
                      {personas.map((p) => (
                        <th key={p.key} className="sv-person" scope="col">
                          <span className="sv-person-name">{nombreCorto(p.nombre)}</span>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {catalogo.mensajeria.incidencias.map((inc) => (
                      <tr key={inc.key}>
                        <td className="sv-crit">{inc.label}</td>
                        {personas.map((p) => {
                          const on = !!p.incidencias[inc.key];
                          return (
                            <td key={p.key} className="sv-person">
                              <span className="sv-opts" role="group" aria-label={`${inc.label} — ${p.nombre}`}>
                                {[true, false].map((v) => (
                                  <button
                                    key={String(v)}
                                    type="button"
                                    className={`sv-opt ${v ? 'v-NO_CUMPLE' : 'v-NA'}`}
                                    aria-pressed={on === v}
                                    onClick={() =>
                                      patchPersona(p.key, (x) => {
                                        const incidencias = { ...x.incidencias };
                                        if (v) incidencias[inc.key] = true;
                                        else delete incidencias[inc.key];
                                        return { ...x, incidencias };
                                      })
                                    }
                                  >
                                    {v ? 'Sí' : 'No'}
                                  </button>
                                ))}
                              </span>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Text strong>Descripción detallada de anomalías y medidas tomadas</Text>
              <Input.TextArea
                rows={3}
                style={{ marginTop: 6 }}
                value={header.descripcion_incidencias}
                onChange={(e) => patchHeader({ descripcion_incidencias: e.target.value })}
              />
            </Card>
          ) : (
            <Card size="small" title="Observaciones por persona" style={{ marginBottom: 16 }}>
              <Space direction="vertical" style={{ width: '100%' }}>
                {personas.map((p) => (
                  <div key={p.key}>
                    <Text strong style={{ textTransform: 'capitalize' }}>
                      {nombreCorto(p.nombre)}
                    </Text>
                    <Input.TextArea
                      rows={2}
                      style={{ marginTop: 4 }}
                      placeholder="Áreas que requieren atención inmediata o insumos que hacen falta"
                      value={p.observaciones}
                      onChange={(e) => patchPersona(p.key, (x) => ({ ...x, observaciones: e.target.value }))}
                    />
                  </div>
                ))}
              </Space>
            </Card>
          )}

          <Card
            size="small"
            title={esMens ? '8. Conclusiones y compromisos de mejora' : 'Observaciones generales y acuerdos'}
          >
            <Space direction="vertical" style={{ width: '100%' }} size={12}>
              <div>
                <Text strong>Observaciones generales del supervisor</Text>
                <Input.TextArea
                  rows={3}
                  style={{ marginTop: 6 }}
                  value={header.observaciones_generales}
                  onChange={(e) => patchHeader({ observaciones_generales: e.target.value })}
                />
              </div>
              <div>
                <Text strong>{esMens ? 'Compromisos de mejora para próximas rutas' : 'Acuerdos'}</Text>
                <Input.TextArea
                  rows={3}
                  style={{ marginTop: 6 }}
                  value={header.compromisos}
                  onChange={(e) => patchHeader({ compromisos: e.target.value })}
                />
              </div>
            </Space>
          </Card>
        </>
      )}

      <div className="sv-savebar">
        <Text type={dirty ? 'warning' : 'secondary'}>
          {dirty
            ? 'Cambios sin guardar'
            : saved
              ? `Guardado ${dayjs(saved.updated_at).format('DD/MM/YYYY HH:mm')}`
              : 'Revisión nueva'}
        </Text>
        <Space>
          <Text type="secondary" style={{ fontSize: 12 }}>
            Ctrl + S
          </Text>
          <Button type="primary" icon={<SaveOutlined />} loading={saving} onClick={save} disabled={!personas.length}>
            {saved ? 'Guardar cambios' : 'Guardar revisión'}
          </Button>
        </Space>
      </div>
    </div>
  );
}
