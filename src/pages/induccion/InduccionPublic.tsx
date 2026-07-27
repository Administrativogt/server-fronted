import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Empty,
  Input,
  Progress,
  Radio,
  Skeleton,
  Space,
  Tag,
  Typography,
  message,
} from 'antd';
import {
  CheckCircleFilled,
  DownloadOutlined,
  FilePdfOutlined,
  FileTextOutlined,
  LockOutlined,
  PlayCircleOutlined,
  PrinterOutlined,
  SafetyCertificateOutlined,
} from '@ant-design/icons';
import {
  evaluateModule,
  fetchProgram,
  fetchPublicInductionFileUrl,
  type EvaluationResult,
  type InductionItem,
  type ProgramModule,
} from '../../api/induction';

const { Title, Paragraph, Text } = Typography;

/**
 * Convierte una URL de YouTube/Vimeo a su formato incrustable.
 * Acepta las variantes que la gente pega normalmente (watch?v=, youtu.be,
 * /shorts/, /embed/). Si no reconoce el proveedor devuelve la URL tal cual,
 * que igual funciona si ya es un enlace de incrustación.
 */
const toEmbedUrl = (raw: string): string => {
  try {
    const u = new URL(raw);
    const host = u.hostname.replace(/^www\./, '');

    if (host === 'youtu.be') {
      return `https://www.youtube.com/embed/${u.pathname.slice(1)}`;
    }
    if (host.endsWith('youtube.com')) {
      const v = u.searchParams.get('v');
      if (v) return `https://www.youtube.com/embed/${v}`;
      const m = u.pathname.match(/\/(?:embed|shorts|live)\/([^/?]+)/);
      if (m) return `https://www.youtube.com/embed/${m[1]}`;
    }
    if (host.endsWith('vimeo.com')) {
      const id = u.pathname.split('/').filter(Boolean).pop();
      if (id && /^\d+$/.test(id)) return `https://player.vimeo.com/video/${id}`;
    }
    return raw;
  } catch {
    return raw;
  }
};

/** Contenedor 16:9 responsivo para iframes y <video>. */
const videoFrameStyle: React.CSSProperties = {
  position: 'relative',
  width: '100%',
  aspectRatio: '16 / 9',
  borderRadius: 8,
  overflow: 'hidden',
  background: '#000',
};

/* ── Avance ────────────────────────────────────────────────────────────────
   La página es pública (sin login), así que el avance vive en el navegador
   de quien la cursa. Consecuencia asumida: si cambia de equipo o limpia el
   navegador, empieza de nuevo, y RRHH no tiene registro de quién completó. */

const STORAGE_KEY = 'induccion-avance-v1';

interface Avance {
  aprobados: number[];
  nombre: string;
}

const leerAvance = (): Avance => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { aprobados: [], nombre: '' };
    const p = JSON.parse(raw);
    return {
      aprobados: Array.isArray(p.aprobados) ? p.aprobados : [],
      nombre: typeof p.nombre === 'string' ? p.nombre : '',
    };
  } catch {
    return { aprobados: [], nombre: '' };
  }
};

const guardarAvance = (a: Avance) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(a));
  } catch {
    /* modo privado o storage lleno: el avance solo dura la sesión */
  }
};

/** Recorre el árbol y devuelve las unidades evaluables en orden. */
const unidadesDe = (modulos: ProgramModule[]): ProgramModule[] =>
  modulos.flatMap((m) => (m.children.length ? unidadesDe(m.children) : [m]));

const iconoDeItem = (t: InductionItem['item_type']) => {
  if (t === 'document') return <FilePdfOutlined />;
  if (t === 'text') return <FileTextOutlined />;
  return <PlayCircleOutlined />;
};

/**
 * Página PÚBLICA del programa de inducción (administrativogt.com/induccion).
 *
 * Los módulos se cursan EN ORDEN: cada uno se abre al aprobar el anterior.
 * Al completar el programa se emite el diploma y todo el material queda
 * liberado para consulta.
 */
function InduccionPublic() {
  const [programa, setPrograma] = useState<ProgramModule[]>([]);
  const [loading, setLoading] = useState(true);
  const [avance, setAvance] = useState<Avance>(leerAvance);
  const [vista, setVista] = useState<number | 'diploma' | null>(null);
  const [descargando, setDescargando] = useState<number | null>(null);

  /* Evaluación en curso */
  const [respuestas, setRespuestas] = useState<Record<number, number>>({});
  const [resultado, setResultado] = useState<EvaluationResult | null>(null);
  const [calificando, setCalificando] = useState(false);

  useEffect(() => {
    fetchProgram()
      .then((data) => {
        setPrograma(data);
        const unidades = unidadesDe(data);
        if (unidades.length) {
          const previo = leerAvance().aprobados;
          const pendiente = unidades.find((u) => !previo.includes(u.id));
          setVista((pendiente ?? unidades[0]).id);
        }
      })
      .catch(() => message.error('No se pudo cargar el programa de inducción'))
      .finally(() => setLoading(false));
  }, []);

  const unidades = useMemo(() => unidadesDe(programa), [programa]);
  const completo = unidades.length > 0 && unidades.every((u) => avance.aprobados.includes(u.id));

  /** Emitido el diploma, todo el material queda liberado para consulta. */
  const desbloqueada = useCallback(
    (id: number): boolean => {
      if (completo) return true;
      const i = unidades.findIndex((u) => u.id === id);
      if (i <= 0) return i === 0;
      return unidades.slice(0, i).every((u) => avance.aprobados.includes(u.id));
    },
    [unidades, avance.aprobados, completo],
  );

  /** Un módulo contenedor se abre cuando se abre su primer submódulo. */
  const contenedorAbierto = (m: ProgramModule) =>
    m.children.length ? desbloqueada(m.children[0].id) : desbloqueada(m.id);

  const unidadActual = unidades.find((u) => !avance.aprobados.includes(u.id)) ?? null;
  const requisitoDe = (id: number) => {
    const i = unidades.findIndex((u) => u.id === id);
    return unidades.slice(0, Math.max(i, 0)).find((u) => !avance.aprobados.includes(u.id)) ?? null;
  };

  const abrir = (id: number | 'diploma') => {
    setVista(id);
    setRespuestas({});
    setResultado(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const descargar = async (item: InductionItem) => {
    setDescargando(item.id);
    try {
      const url = await fetchPublicInductionFileUrl(item.id);
      window.open(url, '_blank', 'noopener');
    } catch {
      message.error('No se pudo abrir el documento');
    } finally {
      setDescargando(null);
    }
  };

  const enviarEvaluacion = async (m: ProgramModule) => {
    setCalificando(true);
    try {
      const answers = m.questions.map((q) => respuestas[q.id]);
      const res = await evaluateModule(m.id, answers);
      setResultado(res);
      if (res.passed && !avance.aprobados.includes(m.id)) {
        const siguiente = { ...avance, aprobados: [...avance.aprobados, m.id] };
        setAvance(siguiente);
        guardarAvance(siguiente);
      }
    } catch {
      message.error('No se pudo calificar la evaluación');
    } finally {
      setCalificando(false);
    }
  };

  const reiniciar = () => {
    const limpio = { aprobados: [], nombre: avance.nombre };
    setAvance(limpio);
    guardarAvance(limpio);
    setRespuestas({});
    setResultado(null);
    if (unidades.length) setVista(unidades[0].id);
  };

  const cambiarNombre = (nombre: string) => {
    const siguiente = { ...avance, nombre };
    setAvance(siguiente);
    guardarAvance(siguiente);
  };

  if (loading) {
    return (
      <div style={{ maxWidth: 1180, margin: '0 auto', padding: 24 }}>
        <Skeleton active paragraph={{ rows: 8 }} />
      </div>
    );
  }

  if (!programa.length) {
    return (
      <div style={{ maxWidth: 720, margin: '0 auto', padding: 48 }}>
        <Empty description="El programa de inducción aún no tiene módulos publicados" />
      </div>
    );
  }

  const hechos = avance.aprobados.filter((id) => unidades.some((u) => u.id === id)).length;
  const pct = Math.round((hechos / unidades.length) * 100);

  return (
    <div style={{ maxWidth: 1180, margin: '0 auto', padding: 24 }}>
      <div style={{ marginBottom: 20 }}>
        <Title level={3} style={{ marginBottom: 4 }}>
          Programa de Inducción
        </Title>
        <Text type="secondary">Consortium Legal</Text>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(240px, 300px) minmax(0, 1fr)',
          gap: 24,
          alignItems: 'start',
        }}
        className="induccion-grid"
      >
        {/* ── Riel del programa ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Card size="small" styles={{ body: { padding: 16 } }}>
            <Space align="center" size={16}>
              <Progress
                type="circle"
                percent={pct}
                size={68}
                strokeColor={completo ? '#8f6a2c' : undefined}
              />
              <div>
                <Text type="secondary" style={{ fontSize: 11, letterSpacing: '.1em' }}>
                  MI AVANCE
                </Text>
                <div style={{ fontWeight: 600 }}>
                  {hechos} de {unidades.length} módulos
                </div>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  {completo
                    ? 'Programa completo — material liberado'
                    : unidadActual
                      ? `Le toca: ${unidadActual.title}`
                      : ''}
                </Text>
              </div>
            </Space>
          </Card>

          <Card size="small" title="Contenido del programa" styles={{ body: { padding: 8 } }}>
            {programa.map((m) => (
              <div key={m.id}>
                <FilaModulo
                  m={m}
                  activo={vista === m.id}
                  abierto={contenedorAbierto(m)}
                  aprobado={
                    m.children.length
                      ? m.children.every((h) => avance.aprobados.includes(h.id))
                      : avance.aprobados.includes(m.id)
                  }
                  onClick={() => abrir(m.id)}
                />
                {m.children.map((h) => (
                  <FilaModulo
                    key={h.id}
                    m={h}
                    hijo
                    activo={vista === h.id}
                    abierto={desbloqueada(h.id)}
                    aprobado={avance.aprobados.includes(h.id)}
                    onClick={() => abrir(h.id)}
                  />
                ))}
              </div>
            ))}

            <FilaSimple
              titulo="Diploma"
              icono={<SafetyCertificateOutlined />}
              activo={vista === 'diploma'}
              abierto={completo}
              aprobado={completo}
              onClick={() => abrir('diploma')}
            />
          </Card>

          {hechos > 0 && (
            <Button size="small" type="text" onClick={reiniciar}>
              Reiniciar mi avance
            </Button>
          )}
        </div>

        {/* ── Contenido ── */}
        <div>
          {vista === 'diploma' ? (
            <Diploma
              completo={completo}
              unidades={unidades}
              nombre={avance.nombre}
              onNombre={cambiarNombre}
              faltan={unidades.length - hechos}
            />
          ) : (
            (() => {
              const m = unidades.find((u) => u.id === vista)
                ?? programa.find((p) => p.id === vista)
                ?? programa.flatMap((p) => p.children).find((h) => h.id === vista);
              if (!m) return null;

              const abierto = m.children.length ? contenedorAbierto(m) : desbloqueada(m.id);
              if (!abierto) return <Bloqueado m={m} requisito={requisitoDe(m.children[0]?.id ?? m.id)} onIr={abrir} />;
              if (m.children.length) {
                return (
                  <Contenedor
                    m={m}
                    aprobados={avance.aprobados}
                    desbloqueada={desbloqueada}
                    onAbrir={abrir}
                  />
                );
              }
              return (
                <Unidad
                  m={m}
                  completo={completo}
                  aprobado={avance.aprobados.includes(m.id)}
                  respuestas={respuestas}
                  setRespuestas={setRespuestas}
                  resultado={resultado}
                  calificando={calificando}
                  onEnviar={() => enviarEvaluacion(m)}
                  onReintentar={() => {
                    setRespuestas({});
                    setResultado(null);
                  }}
                  descargando={descargando}
                  onDescargar={descargar}
                  siguiente={unidadActual && unidadActual.id !== m.id ? unidadActual : null}
                  onIr={abrir}
                  todoListo={completo}
                />
              );
            })()
          )}
        </div>
      </div>

      <style>{`
        @media (max-width: 900px) {
          .induccion-grid { grid-template-columns: 1fr !important; }
        }
        @media print {
          .induccion-grid > div:first-child, .ant-btn { display: none !important; }
          .induccion-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}

/* ── Riel ─────────────────────────────────────────────────────────────────── */

function FilaModulo(props: {
  m: ProgramModule;
  hijo?: boolean;
  activo: boolean;
  abierto: boolean;
  aprobado: boolean;
  onClick: () => void;
}) {
  const { m, hijo, activo, abierto, aprobado, onClick } = props;
  return (
    <FilaSimple
      titulo={`${m.code}  ${m.title}`}
      hijo={hijo}
      activo={activo}
      abierto={abierto}
      aprobado={aprobado}
      onClick={onClick}
    />
  );
}

function FilaSimple(props: {
  titulo: string;
  icono?: React.ReactNode;
  hijo?: boolean;
  activo: boolean;
  abierto: boolean;
  aprobado: boolean;
  onClick: () => void;
}) {
  const { titulo, icono, hijo, activo, abierto, aprobado, onClick } = props;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={activo}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        width: '100%',
        textAlign: 'left',
        border: 0,
        background: activo ? 'rgba(44,65,168,.08)' : 'transparent',
        borderLeft: `2px solid ${activo ? '#2c41a8' : 'transparent'}`,
        padding: hijo ? '9px 10px 9px 26px' : '10px',
        borderRadius: 4,
        cursor: 'pointer',
        fontSize: hijo ? 13 : 13.5,
        fontWeight: hijo ? 400 : 600,
        color: abierto ? 'inherit' : 'rgba(0,0,0,.35)',
      }}
    >
      {icono}
      <span style={{ flex: 1, minWidth: 0 }}>{titulo}</span>
      {aprobado ? (
        <CheckCircleFilled style={{ color: '#2e6b4f' }} />
      ) : !abierto ? (
        <LockOutlined style={{ fontSize: 12, opacity: 0.6 }} />
      ) : null}
    </button>
  );
}

/* ── Módulo bloqueado ─────────────────────────────────────────────────────── */

function Bloqueado(props: {
  m: ProgramModule;
  requisito: ProgramModule | null;
  onIr: (id: number) => void;
}) {
  const { m, requisito, onIr } = props;
  return (
    <Card>
      <Space direction="vertical" size={12} style={{ width: '100%', textAlign: 'center', padding: '32px 0' }}>
        <LockOutlined style={{ fontSize: 28, opacity: 0.45 }} />
        <Title level={4} style={{ margin: 0 }}>
          {m.code} · {m.title}
        </Title>
        <Paragraph type="secondary" style={{ maxWidth: 460, margin: '0 auto' }}>
          Todavía no está disponible. El programa se cursa en orden: cada módulo se abre
          cuando aprueba el anterior.
        </Paragraph>
        {requisito && (
          <Space direction="vertical" size={10}>
            <Tag>Se abre al aprobar {requisito.code} · {requisito.title}</Tag>
            <Button type="primary" onClick={() => onIr(requisito.id)}>
              Ir a {requisito.title}
            </Button>
          </Space>
        )}
      </Space>
    </Card>
  );
}

/* ── Módulo contenedor (Inducciones específicas) ──────────────────────────── */

function Contenedor(props: {
  m: ProgramModule;
  aprobados: number[];
  desbloqueada: (id: number) => boolean;
  onAbrir: (id: number) => void;
}) {
  const { m, aprobados, desbloqueada, onAbrir } = props;
  const hechos = m.children.filter((h) => aprobados.includes(h.id)).length;

  return (
    <Card>
      <Text type="secondary" style={{ fontSize: 11, letterSpacing: '.1em' }}>
        MÓDULO {m.code}
      </Text>
      <Title level={4} style={{ marginTop: 6 }}>{m.title}</Title>
      {m.summary && <Paragraph type="secondary">{m.summary}</Paragraph>}

      <Text type="secondary" style={{ fontSize: 12 }}>
        {hechos} de {m.children.length} aprobadas
      </Text>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))',
          gap: 12,
          marginTop: 16,
        }}
      >
        {m.children.map((h) => {
          const aprobado = aprobados.includes(h.id);
          const abierto = desbloqueada(h.id);
          return (
            <Card
              key={h.id}
              size="small"
              hoverable={abierto}
              onClick={() => onAbrir(h.id)}
              style={{ opacity: abierto ? 1 : 0.6, cursor: 'pointer' }}
            >
              <Text type="secondary" style={{ fontSize: 12 }}>{h.code}</Text>
              <div style={{ fontWeight: 600, margin: '4px 0' }}>{h.title}</div>
              {h.summary && (
                <Paragraph type="secondary" style={{ fontSize: 12.5, marginBottom: 8 }} ellipsis={{ rows: 3 }}>
                  {h.summary}
                </Paragraph>
              )}
              {aprobado ? (
                <Tag color="green">Aprobada</Tag>
              ) : abierto ? (
                <Tag>Pendiente</Tag>
              ) : (
                <Tag icon={<LockOutlined />}>Bloqueada</Tag>
              )}
            </Card>
          );
        })}
      </div>
    </Card>
  );
}

/* ── Unidad evaluable ─────────────────────────────────────────────────────── */

function Unidad(props: {
  m: ProgramModule;
  completo: boolean;
  aprobado: boolean;
  respuestas: Record<number, number>;
  setRespuestas: (r: Record<number, number>) => void;
  resultado: EvaluationResult | null;
  calificando: boolean;
  onEnviar: () => void;
  onReintentar: () => void;
  descargando: number | null;
  onDescargar: (i: InductionItem) => void;
  siguiente: ProgramModule | null;
  onIr: (id: number | 'diploma') => void;
  todoListo: boolean;
}) {
  const {
    m, completo, aprobado, respuestas, setRespuestas, resultado, calificando,
    onEnviar, onReintentar, descargando, onDescargar, siguiente, onIr, todoListo,
  } = props;

  const videos = m.items.filter((i) => i.item_type === 'video' || i.item_type === 'video_url');
  const docs = m.items.filter((i) => i.item_type === 'document');
  const textos = m.items.filter((i) => i.item_type === 'text');
  const faltan = m.questions.filter((q) => respuestas[q.id] === undefined).length;

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <Card>
        {completo && (
          <Alert
            type="success"
            showIcon
            style={{ marginBottom: 16 }}
            message="Consulta libre"
            description="Ya obtuvo su diploma: puede volver a cualquier módulo cuando lo necesite, sin repetir la evaluación."
          />
        )}

        <Space size={8}>
          <Text type="secondary" style={{ fontSize: 11, letterSpacing: '.1em' }}>
            MÓDULO {m.code}
          </Text>
          {aprobado && <Tag color="green">Aprobado</Tag>}
        </Space>
        <Title level={4} style={{ marginTop: 6 }}>{m.title}</Title>
        {m.summary && <Paragraph type="secondary">{m.summary}</Paragraph>}
        <Space size={16} wrap>
          {m.duration && <Text type="secondary" style={{ fontSize: 12.5 }}>Duración {m.duration}</Text>}
          <Text type="secondary" style={{ fontSize: 12.5 }}>{videos.length} videos</Text>
          <Text type="secondary" style={{ fontSize: 12.5 }}>{docs.length} documentos</Text>
          <Text type="secondary" style={{ fontSize: 12.5 }}>{m.questions.length} preguntas</Text>
        </Space>
      </Card>

      {textos.map((t) => (
        <Card key={t.id} title={t.title} size="small">
          <Paragraph style={{ whiteSpace: 'pre-wrap', marginBottom: 0 }}>{t.body}</Paragraph>
        </Card>
      ))}

      {videos.length > 0 && (
        <Card title="Videos" size="small">
          <Space direction="vertical" size={20} style={{ width: '100%' }}>
            {videos.map((v) => (
              <div key={v.id}>
                <div style={{ fontWeight: 600, marginBottom: 8 }}>
                  {iconoDeItem(v.item_type)} {v.title}
                </div>
                <div style={videoFrameStyle}>
                  {v.item_type === 'video_url' && v.url ? (
                    <iframe
                      src={toEmbedUrl(v.url)}
                      title={v.title}
                      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 0 }}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  ) : v.file_url ? (
                    <video
                      src={v.file_url}
                      controls
                      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
                    />
                  ) : (
                    <div style={{ display: 'grid', placeItems: 'center', height: '100%', color: '#fff' }}>
                      Video no disponible
                    </div>
                  )}
                </div>
                {v.body && (
                  <Paragraph type="secondary" style={{ fontSize: 13, marginTop: 8 }}>{v.body}</Paragraph>
                )}
              </div>
            ))}
          </Space>
        </Card>
      )}

      {docs.length > 0 && (
        <Card title="Documentos" size="small">
          <Space direction="vertical" size={20} style={{ width: '100%' }}>
            {docs.map((d) => (
              <Documento
                key={d.id}
                item={d}
                cargando={descargando === d.id}
                onDescargar={() => onDescargar(d)}
              />
            ))}
          </Space>
        </Card>
      )}

      {m.questions.length === 0 ? (
        <Alert
          type="info"
          showIcon
          message="Este módulo todavía no tiene evaluación"
          description="En cuanto se carguen las preguntas podrá aprobarlo y continuar."
        />
      ) : (
        <Card
          title="Evaluación"
          size="small"
          extra={
            <Text type="secondary" style={{ fontSize: 12 }}>
              Se aprueba con {Math.ceil((m.questions.length * m.passing_percentage) / 100)} de {m.questions.length}
            </Text>
          }
        >
          <Space direction="vertical" size={20} style={{ width: '100%' }}>
            {m.questions.map((q, qi) => {
              const detalle = resultado?.details.find((d) => d.question_id === q.id);
              return (
                <div key={q.id}>
                  <div style={{ fontWeight: 550, marginBottom: 10 }}>
                    {String(qi + 1).padStart(2, '0')}. {q.text}
                  </div>
                  <Radio.Group
                    value={respuestas[q.id]}
                    disabled={!!resultado}
                    onChange={(e) => setRespuestas({ ...respuestas, [q.id]: e.target.value })}
                  >
                    <Space direction="vertical">
                      {q.options.map((o, oi) => {
                        let color: string | undefined;
                        if (detalle) {
                          if (oi === detalle.correct_index) color = '#2e6b4f';
                          else if (oi === detalle.selected) color = '#c0533f';
                        }
                        return (
                          <Radio key={oi} value={oi} style={{ color }}>
                            {o}
                            {detalle && oi === detalle.correct_index && (
                              <Text style={{ color: '#2e6b4f', fontSize: 12 }}> · correcta</Text>
                            )}
                          </Radio>
                        );
                      })}
                    </Space>
                  </Radio.Group>
                  {detalle?.explanation && (
                    <Alert
                      type={detalle.ok ? 'success' : 'warning'}
                      style={{ marginTop: 10 }}
                      message={detalle.explanation}
                    />
                  )}
                </div>
              );
            })}

            <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
              {resultado ? (
                <>
                  <Text strong style={{ color: resultado.passed ? '#2e6b4f' : '#c0533f', fontSize: 16 }}>
                    {resultado.correct}/{resultado.total} · {resultado.passed ? 'Aprobado' : 'No aprobado'}
                  </Text>
                  <Button onClick={onReintentar}>Volver a intentar</Button>
                  {resultado.passed && siguiente && (
                    <Button type="primary" onClick={() => onIr(siguiente.id)}>
                      Siguiente: {siguiente.title}
                    </Button>
                  )}
                  {resultado.passed && todoListo && (
                    <Button type="primary" onClick={() => onIr('diploma')}>
                      Ver mi diploma
                    </Button>
                  )}
                </>
              ) : (
                <>
                  <Text type="secondary" style={{ fontSize: 13 }}>
                    {faltan > 0 ? `Faltan ${faltan} por responder` : 'Todas respondidas'}
                  </Text>
                  <Button
                    type="primary"
                    disabled={faltan > 0}
                    loading={calificando}
                    onClick={onEnviar}
                  >
                    Enviar respuestas
                  </Button>
                </>
              )}
            </div>
          </Space>
        </Card>
      )}
    </Space>
  );
}

/* ── Documento ────────────────────────────────────────────────────────────── */

const esPdf = (i: InductionItem) =>
  (i.file_name ?? '').toLowerCase().endsWith('.pdf');

/**
 * Un PDF se lee dentro de la página, sin descargarlo: el navegador ya trae
 * visor. La URL firmada se pide solo al abrirlo, no al cargar el módulo,
 * porque caduca y no tiene sentido emitirla para algo que quizá nadie abra.
 */
function Documento(props: {
  item: InductionItem;
  cargando: boolean;
  onDescargar: () => void;
}) {
  const { item, cargando, onDescargar } = props;
  const [url, setUrl] = useState<string | null>(null);
  const [abriendo, setAbriendo] = useState(false);

  const leer = async () => {
    if (url) {
      setUrl(null);
      return;
    }
    setAbriendo(true);
    try {
      setUrl(await fetchPublicInductionFileUrl(item.id));
    } catch {
      message.error('No se pudo abrir el documento');
    } finally {
      setAbriendo(false);
    }
  };

  return (
    <div>
      <div
        style={{
          display: 'flex', alignItems: 'center', gap: 12,
          padding: '10px 12px', border: '1px solid rgba(0,0,0,.08)',
          borderRadius: url ? '6px 6px 0 0' : 6,
        }}
      >
        <FilePdfOutlined />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 550 }}>{item.title}</div>
          {item.body && <Text type="secondary" style={{ fontSize: 12.5 }}>{item.body}</Text>}
        </div>
        {esPdf(item) && (
          <Button size="small" type={url ? 'default' : 'primary'} loading={abriendo} onClick={leer}>
            {url ? 'Cerrar' : 'Leer aquí'}
          </Button>
        )}
        <Button
          size="small"
          icon={<DownloadOutlined />}
          loading={cargando}
          onClick={onDescargar}
        >
          Descargar
        </Button>
      </div>

      {url && (
        <iframe
          src={url}
          title={item.title}
          style={{
            width: '100%', height: '70vh', minHeight: 420,
            border: '1px solid rgba(0,0,0,.08)', borderTop: 0,
            borderRadius: '0 0 6px 6px', display: 'block',
          }}
        />
      )}
    </div>
  );
}

/* ── Diploma ──────────────────────────────────────────────────────────────── */

function Diploma(props: {
  completo: boolean;
  unidades: ProgramModule[];
  nombre: string;
  onNombre: (n: string) => void;
  faltan: number;
}) {
  const { completo, unidades, nombre, onNombre, faltan } = props;

  if (!completo) {
    return (
      <Card>
        <Space direction="vertical" size={12} style={{ width: '100%', textAlign: 'center', padding: '32px 0' }}>
          <SafetyCertificateOutlined style={{ fontSize: 28, opacity: 0.45 }} />
          <Title level={4} style={{ margin: 0 }}>El diploma se emite al completar el programa</Title>
          <Paragraph type="secondary">
            {faltan === 1 ? 'Le falta 1 módulo' : `Le faltan ${faltan} módulos`} por aprobar.
          </Paragraph>
        </Space>
      </Card>
    );
  }

  const meses = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio',
    'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  const hoy = new Date();
  const fecha = `${hoy.getDate()} de ${meses[hoy.getMonth()]} de ${hoy.getFullYear()}`;

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <Card>
        <div style={{ border: '1.5px solid #8f6a2c', padding: '40px 44px', textAlign: 'center' }}>
          <Text style={{ fontSize: 10.5, letterSpacing: '.3em', color: '#8f6a2c' }}>
            CONSORTIUM LEGAL · GUATEMALA
          </Text>
          <Title level={2} style={{ marginTop: 14, marginBottom: 4, fontFamily: 'Georgia, serif' }}>
            Constancia de Inducción
          </Title>
          <Paragraph type="secondary" style={{ marginBottom: 24 }}>Se hace constar que</Paragraph>

          <Input
            value={nombre}
            onChange={(e) => onNombre(e.target.value)}
            placeholder="Escriba su nombre completo"
            variant="borderless"
            style={{
              textAlign: 'center',
              fontSize: 22,
              fontFamily: 'Georgia, serif',
              fontStyle: 'italic',
              borderBottom: '1px solid rgba(0,0,0,.25)',
              borderRadius: 0,
              maxWidth: 420,
            }}
          />
          <div style={{ fontSize: 10.5, letterSpacing: '.14em', opacity: 0.55, marginTop: 8 }}>
            NOMBRE COMPLETO
          </div>

          <Paragraph type="secondary" style={{ maxWidth: 470, margin: '24px auto 0' }}>
            completó el Programa de Inducción de la firma, aprobando la evaluación de cada módulo.
          </Paragraph>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: '6px 20px',
              textAlign: 'left',
              marginTop: 24,
              paddingTop: 18,
              borderTop: '1px solid rgba(0,0,0,.1)',
            }}
          >
            {unidades.map((u) => (
              <Text key={u.id} type="secondary" style={{ fontSize: 12.5 }}>
                <CheckCircleFilled style={{ color: '#8f6a2c', marginRight: 6 }} />
                {u.code} · {u.title}
              </Text>
            ))}
          </div>

          <div style={{ marginTop: 28, fontSize: 10.5, letterSpacing: '.1em', opacity: 0.55 }}>
            EMITIDA EL {fecha.toUpperCase()}
          </div>
        </div>
      </Card>

      <Space>
        <Button type="primary" icon={<PrinterOutlined />} onClick={() => window.print()}>
          Imprimir o guardar en PDF
        </Button>
      </Space>
    </Space>
  );
}

export default InduccionPublic;
