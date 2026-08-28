import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Col,
  DatePicker,
  Empty,
  Form,
  Input,
  InputNumber,
  Row,
  Select,
  Space,
  Statistic,
  Switch,
  Table,
  Tabs,
  Tag,
  Tooltip,
  Typography,
  message,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  ArrowLeftOutlined,
  AuditOutlined,
  CalendarOutlined,
  CheckCircleOutlined,
  ClearOutlined,
  ClockCircleOutlined,
  CodeOutlined,
  DownloadOutlined,
  ExclamationCircleOutlined,
  PlayCircleOutlined,
  QuestionCircleOutlined,
  ReloadOutlined,
  RightOutlined,
} from '@ant-design/icons';
import dayjs, { Dayjs } from 'dayjs';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '../../auth/useAuthStore';
import useThemeStore from '../../hooks/useThemeStore';
import { makeCSS, makeTokens } from '../dashboard/theme';
import adminAuditApi from '../../api/adminAudit';
import type {
  AppLogEntry,
  AuditCatalog,
  AuditColumn,
  AuditModuleKey,
  AuditOverview,
  AuditParam,
  AuditQueryDef,
  AuditRunResult,
  LogQueryResult,
} from '../../api/adminAudit';

const { Text, Title, Paragraph } = Typography;
const { RangePicker } = DatePicker;

const TECH_MODE_KEY = 'auditoria.vistaTecnica';

// ---------------------------------------------------------------------------
// Utilidades de presentación
// ---------------------------------------------------------------------------
const MONEY = new Intl.NumberFormat('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const NUM = new Intl.NumberFormat('es-GT');

const BADGE_COLORS: { test: RegExp; color: string }[] = [
  { test: /cancel|rechaz|elimin|anulad|fall|failed|error|no disponible|oculto/i, color: 'red' },
  { test: /liquidad|entregad|aceptad|autorizad|enviado|sent|vigente|creado$/i, color: 'green' },
  { test: /pendiente|pending|alert/i, color: 'orange' },
  { test: /revers|devuel|modificado/i, color: 'purple' },
];
const badgeColor = (v: string) => BADGE_COLORS.find((b) => b.test.test(v))?.color ?? 'blue';

const STATUS_ES: Record<string, string> = {
  sent: 'Enviado',
  pending: 'Pendiente',
  failed: 'Falló',
  alerted: 'Con alerta',
};

const LEVEL_COLOR: Record<string, string> = { error: 'red', warn: 'orange', info: 'blue', debug: 'default' };

const fmtDateTime = (v: string) => {
  // 'YYYY-MM-DD HH:mm:ss' (texto tal cual viene de la BD) → '28/08/2026 · 09:15:22'
  const m = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}:\d{2}(?::\d{2})?)/.exec(v);
  return m ? `${m[3]}/${m[2]}/${m[1]} · ${m[4]}` : v;
};

const renderCell = (col: AuditColumn, v: unknown): React.ReactNode => {
  if (v === null || v === undefined || v === '') return <Text type="secondary">—</Text>;
  switch (col.type) {
    case 'money': {
      const n = Number(v);
      return <span style={{ fontVariantNumeric: 'tabular-nums' }}>{Number.isFinite(n) ? `Q ${MONEY.format(n)}` : String(v)}</span>;
    }
    case 'int':
    case 'number': {
      const n = Number(v);
      return <span style={{ fontVariantNumeric: 'tabular-nums' }}>{Number.isFinite(n) ? NUM.format(n) : String(v)}</span>;
    }
    case 'date': {
      const d = dayjs(String(v).slice(0, 10));
      return d.isValid() ? d.format('DD/MM/YYYY') : String(v);
    }
    case 'datetime':
      return <span style={{ fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>{fmtDateTime(String(v))}</span>;
    case 'bool':
      return v === true || v === 'true' || v === 't' ? <Tag color="green">Sí</Tag> : <Tag>No</Tag>;
    case 'badge': {
      const s = String(v);
      return <Tag color={badgeColor(s)}>{STATUS_ES[s] ?? s}</Tag>;
    }
    default: {
      const s = typeof v === 'object' ? JSON.stringify(v) : String(v);
      return s.length > 90 ? (
        <Tooltip title={s}>
          <span>{s.slice(0, 90)}…</span>
        </Tooltip>
      ) : (
        s
      );
    }
  }
};

const compareValues = (a: unknown, b: unknown) => {
  if (a == null && b == null) return 0;
  if (a == null) return -1;
  if (b == null) return 1;
  const na = Number(a);
  const nb = Number(b);
  if (Number.isFinite(na) && Number.isFinite(nb) && String(a).trim() !== '' && String(b).trim() !== '') return na - nb;
  return String(a).localeCompare(String(b), 'es');
};

const toCsv = (columns: AuditColumn[], rows: Record<string, unknown>[]) => {
  const esc = (v: unknown) => {
    const s = v == null ? '' : typeof v === 'object' ? JSON.stringify(v) : String(v);
    return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const head = columns.map((c) => esc(c.title)).join(',');
  const body = rows.map((r) => columns.map((c) => esc(r[c.key])).join(',')).join('\n');
  // BOM (U+FEFF) para que Excel abra el CSV con acentos correctos
  return String.fromCharCode(0xfeff) + head + '\n' + body;
};

const downloadText = (filename: string, text: string, mime = 'text/csv;charset=utf-8') => {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
};

/** Atajos de fechas para el par desde/hasta. */
const DATE_PRESETS: { key: string; label: string; range: () => [Dayjs, Dayjs] }[] = [
  { key: 'hoy', label: 'Hoy', range: () => [dayjs().startOf('day'), dayjs().endOf('day')] },
  { key: 'ayer', label: 'Ayer', range: () => [dayjs().subtract(1, 'day').startOf('day'), dayjs().subtract(1, 'day').endOf('day')] },
  { key: 'semana', label: 'Esta semana', range: () => [dayjs().startOf('week'), dayjs().endOf('week')] },
  { key: 'mes', label: 'Este mes', range: () => [dayjs().startOf('month'), dayjs().endOf('month')] },
  { key: 'mes-1', label: 'Mes anterior', range: () => [dayjs().subtract(1, 'month').startOf('month'), dayjs().subtract(1, 'month').endOf('month')] },
  { key: '30d', label: 'Últimos 30 días', range: () => [dayjs().subtract(30, 'day').startOf('day'), dayjs().endOf('day')] },
  { key: 'anio', label: 'Este año', range: () => [dayjs().startOf('year'), dayjs().endOf('year')] },
];

// ---------------------------------------------------------------------------
// Formulario de parámetros generado desde el catálogo
// ---------------------------------------------------------------------------
const ParamField: React.FC<{ p: AuditParam }> = ({ p }) => {
  const label = (
    <Space size={4}>
      {p.label}
      {p.help && (
        <Tooltip title={p.help}>
          <QuestionCircleOutlined style={{ color: '#999' }} />
        </Tooltip>
      )}
    </Space>
  );
  const rules = p.required ? [{ required: true, message: 'Este dato es necesario' }] : undefined;
  switch (p.type) {
    case 'date':
      return (
        <Form.Item name={p.key} label={label} rules={rules}>
          <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" allowClear placeholder="Elegir fecha" />
        </Form.Item>
      );
    case 'int':
    case 'number':
      return (
        <Form.Item name={p.key} label={label} rules={rules} initialValue={p.default}>
          <InputNumber style={{ width: '100%' }} controls={false} placeholder={p.placeholder ?? 'Número'} step={p.type === 'int' ? 1 : 0.01} />
        </Form.Item>
      );
    case 'select':
      return (
        <Form.Item name={p.key} label={label} rules={rules} initialValue={p.default}>
          <Select allowClear showSearch optionFilterProp="label" placeholder="Todos" options={p.options ?? []} />
        </Form.Item>
      );
    default:
      return (
        <Form.Item name={p.key} label={label} rules={rules}>
          <Input allowClear placeholder={p.placeholder ?? 'Escriba parte del texto'} />
        </Form.Item>
      );
  }
};

const serializeParams = (defs: AuditParam[], values: Record<string, unknown>) => {
  const out: Record<string, unknown> = {};
  for (const p of defs) {
    const v = values[p.key];
    if (v === undefined || v === null || v === '') continue;
    if (p.type === 'date' && dayjs.isDayjs(v)) out[p.key] = (v as Dayjs).format('YYYY-MM-DD');
    else out[p.key] = v;
  }
  return out;
};

/** Frase resumen de los filtros usados, para que el resultado se entienda solo. */
const describeFilters = (defs: AuditParam[], values: Record<string, unknown>) => {
  const parts: string[] = [];
  const from = values.from as Dayjs | undefined;
  const to = values.to as Dayjs | undefined;
  if (from && to) parts.push(`del ${from.format('DD/MM/YYYY')} al ${to.format('DD/MM/YYYY')}`);
  else if (from) parts.push(`desde el ${from.format('DD/MM/YYYY')}`);
  else if (to) parts.push(`hasta el ${to.format('DD/MM/YYYY')}`);
  for (const p of defs) {
    if (p.key === 'from' || p.key === 'to') continue;
    const v = values[p.key];
    if (v === undefined || v === null || v === '') continue;
    const label = p.options?.find((o) => String(o.value) === String(v))?.label ?? String(v);
    parts.push(`${p.label.toLowerCase()}: ${label}`);
  }
  return parts.length ? parts.join(' · ') : 'sin filtros (todo lo registrado)';
};

/** Columnas de la tabla a partir del resultado; en vista sencilla oculta las vacías. */
const buildColumns = (result: AuditRunResult | null, tech: boolean): ColumnsType<Record<string, unknown>> => {
  if (!result) return [];
  const defs: AuditColumn[] = result.columns.length
    ? result.columns
    : Object.keys(result.rows[0] ?? {}).map((k) => ({ key: k, title: k }));
  const visible = tech ? defs : defs.filter((c) => result.rows.some((r) => r[c.key] !== null && r[c.key] !== undefined && r[c.key] !== ''));
  return visible.map((c) => ({
    key: c.key,
    dataIndex: c.key,
    title: c.title,
    width: c.width,
    ellipsis: !c.type || c.type === 'text',
    align: c.type === 'money' || c.type === 'int' || c.type === 'number' ? 'right' : undefined,
    sorter: (a, b) => compareValues(a[c.key], b[c.key]),
    render: (v: unknown) => renderCell(c, v),
  }));
};

/** Período por defecto con el que se ejecuta una pregunta al abrirla. */
const DEFAULT_PRESET = '30d';

/** Qué se muestra ya cargado al entrar a cada módulo ("Actividad reciente"). */
const FEED: Record<AuditModuleKey, { queryKey: string; title: string; days: number; limit: number }> = {
  salas: { queryKey: 'salas.reservaciones', title: 'Últimas reservas (7 días)', days: 7, limit: 10 },
  cheques: { queryKey: 'cheques.bitacora', title: 'Últimos movimientos de cheques (autorizaciones, liquidaciones, rechazos)', days: 30, limit: 10 },
  notificaciones: { queryKey: 'notif.buscar', title: 'Últimas notificaciones recibidas (7 días)', days: 7, limit: 10 },
};

// ---------------------------------------------------------------------------
// Actividad reciente: tabla ya cargada al entrar al módulo
// ---------------------------------------------------------------------------
const RecentActivity: React.FC<{
  module: AuditModuleKey;
  catalog: AuditCatalog;
  tech: boolean;
  onOpen: (queryKey: string) => void;
}> = ({ module, catalog, tech, onOpen }) => {
  const feed = FEED[module];
  const def = catalog.queries.find((q) => q.key === feed.queryKey);
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState<AuditRunResult | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      try {
        const params: Record<string, unknown> = { limit: feed.limit };
        if (def?.params.some((p) => p.key === 'from')) {
          params.from = dayjs().subtract(feed.days, 'day').format('YYYY-MM-DD');
          params.to = dayjs().format('YYYY-MM-DD');
        }
        const { data } = await adminAuditApi.runQuery(feed.queryKey, params);
        if (alive) setResult(data);
      } catch {
        if (alive) setResult(null);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [feed, def]);

  const columns = useMemo(() => buildColumns(result, tech), [result, tech]);

  return (
    <Card
      size="small"
      title={
        <Space>
          <ClockCircleOutlined />
          <Text strong>Actividad reciente</Text>
          <Text type="secondary" style={{ fontWeight: 400 }}>
            — {feed.title}
          </Text>
        </Space>
      }
      extra={
        <Button type="link" size="small" onClick={() => onOpen(feed.queryKey)}>
          Ver más y filtrar <RightOutlined />
        </Button>
      }
      style={{ marginBottom: 16 }}
    >
      <Table
        className="ta-table"
        size="small"
        loading={loading}
        rowKey={(_, i) => String(i)}
        columns={columns}
        dataSource={result?.rows ?? []}
        pagination={false}
        scroll={{ x: Math.max(900, columns.length * 140) }}
        locale={{ emptyText: loading ? ' ' : 'Sin movimientos en este período' }}
      />
    </Card>
  );
};

// ---------------------------------------------------------------------------
// Panel de un módulo: lista de preguntas → pantalla de la pregunta elegida
// ---------------------------------------------------------------------------
const QueryPanel: React.FC<{ module: AuditModuleKey; catalog: AuditCatalog; tech: boolean }> = ({ module, catalog, tech }) => {
  const queries = useMemo(() => catalog.queries.filter((q) => q.module === module), [catalog, module]);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const query: AuditQueryDef | undefined = queries.find((q) => q.key === selectedKey);
  const [form] = Form.useForm();
  const [limit, setLimit] = useState<number>(catalog.limits.default);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<AuditRunResult | null>(null);
  const [lastValues, setLastValues] = useState<Record<string, unknown>>({});
  const [showSql, setShowSql] = useState(false);
  const [preset, setPreset] = useState<string | null>(null);

  // Al abrir una pregunta se ejecuta sola con un período por defecto: el
  // usuario ve datos de inmediato y los filtros solo sirven para afinar.
  useEffect(() => {
    form.resetFields();
    setResult(null);
    setShowSql(false);
    setLimit(query?.defaultLimit ?? catalog.limits.default);
    if (!query) {
      setPreset(null);
      return;
    }
    const withDates = query.params.some((p) => p.key === 'from') && query.params.some((p) => p.key === 'to');
    if (withDates) {
      const p = DATE_PRESETS.find((x) => x.key === DEFAULT_PRESET)!;
      const [a, b] = p.range();
      form.setFieldsValue({ from: a, to: b });
      setPreset(DEFAULT_PRESET);
    } else {
      setPreset(null);
    }
    void run(query.defaultLimit ?? catalog.limits.default);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedKey]);

  const hasDateRange = !!query?.params.some((p) => p.key === 'from') && !!query?.params.some((p) => p.key === 'to');

  const applyPreset = (key: string) => {
    const p = DATE_PRESETS.find((x) => x.key === key);
    if (!p) return;
    const [a, b] = p.range();
    form.setFieldsValue({ from: a, to: b });
    setPreset(key);
    void run(); // el período rápido consulta de inmediato
  };

  const run = async (limitOverride?: number) => {
    if (!query) return;
    try {
      const values = await form.validateFields();
      setRunning(true);
      const { data } = await adminAuditApi.runQuery(query.key, {
        ...serializeParams(query.params, values),
        limit: limitOverride ?? limit,
      });
      setResult(data);
      setLastValues(values);
    } catch (err: any) {
      if (err?.errorFields) return; // validación del form
      const msg = err?.response?.data?.message ?? err?.message ?? 'No se pudo obtener la información';
      message.error(Array.isArray(msg) ? msg.join(', ') : String(msg));
    } finally {
      setRunning(false);
    }
  };

  const columns = useMemo(() => buildColumns(result, tech), [result, tech]);

  // --- Lista de preguntas -------------------------------------------------
  if (!query) {
    if (!queries.length) return <Empty description="No hay consultas para este módulo" />;
    return (
      <div>
        <RecentActivity module={module} catalog={catalog} tech={tech} onOpen={(k) => setSelectedKey(k)} />
        <Paragraph type="secondary" style={{ marginBottom: 12 }}>
          ¿Qué más quiere revisar? Elija una pregunta (se consulta de inmediato con los últimos 30 días):
        </Paragraph>
        <Row gutter={[12, 12]}>
          {queries.map((q) => (
            <Col key={q.key} xs={24} md={12} xl={8}>
              <Card
                hoverable
                size="small"
                onClick={() => setSelectedKey(q.key)}
                style={{ height: '100%' }}
                styles={{ body: { display: 'flex', flexDirection: 'column', gap: 6, minHeight: 110 } }}
              >
                <Space align="start" style={{ justifyContent: 'space-between', width: '100%' }}>
                  <Text strong style={{ fontSize: 15 }}>
                    {q.title}
                  </Text>
                  <RightOutlined style={{ color: '#999', marginTop: 4 }} />
                </Space>
                <Text type="secondary" style={{ fontSize: 13 }}>
                  {q.description}
                </Text>
              </Card>
            </Col>
          ))}
        </Row>
      </div>
    );
  }

  // --- Pregunta elegida ---------------------------------------------------
  return (
    <div>
      <Button type="link" icon={<ArrowLeftOutlined />} onClick={() => setSelectedKey(null)} style={{ paddingInline: 0, marginBottom: 4 }}>
        Volver a la lista
      </Button>
      <Card
        size="small"
        title={
          <Space direction="vertical" size={0}>
            <Text strong style={{ fontSize: 16 }}>
              {query.title}
            </Text>
            <Text type="secondary" style={{ fontSize: 13, fontWeight: 400 }}>
              {query.description}
            </Text>
          </Space>
        }
        extra={
          tech && (
            <Tooltip title="Ver la consulta SQL que se ejecuta">
              <Button size="small" icon={<CodeOutlined />} type={showSql ? 'primary' : 'default'} onClick={() => setShowSql((s) => !s)}>
                SQL
              </Button>
            </Tooltip>
          )
        }
      >
        {tech && query.hint && (
          <Paragraph type="secondary" style={{ fontSize: 12, marginBottom: 12 }}>
            {query.hint}
          </Paragraph>
        )}

        {tech && showSql && (
          <pre
            style={{
              fontSize: 11,
              maxHeight: 260,
              overflow: 'auto',
              padding: 12,
              borderRadius: 6,
              background: 'rgba(127,127,127,0.08)',
              marginBottom: 12,
            }}
          >
            {result?.sql ?? query.sql}
            {result && `\n\n-- valores: ${JSON.stringify(result.values)}`}
          </pre>
        )}

        <Form form={form} layout="vertical" onFinish={() => run()} size="middle">
          {hasDateRange && (
            <div style={{ marginBottom: 8 }}>
              <Space size={[6, 6]} wrap>
                <CalendarOutlined style={{ color: '#999' }} />
                <Text type="secondary">Período rápido:</Text>
                {DATE_PRESETS.map((p) => (
                  <Button key={p.key} size="small" type={preset === p.key ? 'primary' : 'default'} onClick={() => applyPreset(p.key)}>
                    {p.label}
                  </Button>
                ))}
              </Space>
            </div>
          )}
          <Row gutter={12}>
            {query.params.map((p) => (
              <Col key={p.key} xs={24} sm={12} lg={8}>
                <div onChangeCapture={() => (p.key === 'from' || p.key === 'to') && setPreset(null)}>
                  <ParamField p={p} />
                </div>
              </Col>
            ))}
            {tech && (
              <Col xs={24} sm={12} lg={8}>
                <Form.Item label="Máx. filas">
                  <InputNumber style={{ width: '100%' }} min={1} max={catalog.limits.max} value={limit} onChange={(v) => setLimit(Number(v) || catalog.limits.default)} />
                </Form.Item>
              </Col>
            )}
          </Row>
          <Space>
            <Button type="primary" size="large" icon={<PlayCircleOutlined />} htmlType="submit" loading={running}>
              Consultar
            </Button>
            <Button
              icon={<ClearOutlined />}
              onClick={() => {
                form.resetFields();
                setResult(null);
                setPreset(null);
              }}
            >
              Limpiar
            </Button>
          </Space>
        </Form>

        {result && (
          <div style={{ marginTop: 20 }}>
            {result.rowCount === 0 ? (
              <Alert type="info" showIcon message="No se encontró nada con esos filtros" description={`Buscado: ${describeFilters(query.params, lastValues)}. Pruebe ampliar el período o quitar algún filtro.`} />
            ) : (
              <>
                <Alert
                  type="success"
                  showIcon
                  icon={<CheckCircleOutlined />}
                  message={
                    <Space wrap>
                      <Text strong>
                        {result.truncated
                          ? `Se muestran los primeros ${NUM.format(result.rowCount)} resultados`
                          : `${NUM.format(result.rowCount)} resultado${result.rowCount === 1 ? '' : 's'}`}
                      </Text>
                      <Text type="secondary">({describeFilters(query.params, lastValues)})</Text>
                      {tech && <Text type="secondary">· {result.elapsedMs} ms</Text>}
                    </Space>
                  }
                  description={
                    result.truncated
                      ? 'Hay más registros de los que se muestran. Acote el período o los filtros para ver el resto.'
                      : undefined
                  }
                  action={
                    <Button
                      icon={<DownloadOutlined />}
                      onClick={() =>
                        downloadText(
                          `auditoria_${query.key.replace(/\./g, '_')}_${dayjs().format('YYYYMMDD_HHmm')}.csv`,
                          toCsv(result.columns, result.rows),
                        )
                      }
                    >
                      Descargar Excel
                    </Button>
                  }
                  style={{ marginBottom: 12 }}
                />
                <Table
                  className="ta-table"
                  size="small"
                  rowKey={(_, i) => String(i)}
                  columns={columns}
                  dataSource={result.rows}
                  scroll={{ x: Math.max(900, columns.length * 150) }}
                  pagination={{ pageSize: 25, showSizeChanger: true, pageSizeOptions: [25, 50, 100, 500], showTotal: (t) => `${NUM.format(t)} registros` }}
                />
                <Text type="secondary" style={{ fontSize: 12 }}>
                  Las horas están en hora de Guatemala. Puede ordenar haciendo clic en el título de cada columna.
                </Text>
              </>
            )}
          </div>
        )}
      </Card>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Registro técnico del sistema (solo vista técnica)
// ---------------------------------------------------------------------------
const LogsPanel: React.FC<{ catalog: AuditCatalog }> = ({ catalog }) => {
  const [module, setModule] = useState<AuditModuleKey | 'todos'>('todos');
  const [contexts, setContexts] = useState<string[]>([]);
  const [allContexts, setAllContexts] = useState<{ context: string; count: number }[]>([]);
  const [level, setLevel] = useState<string | undefined>();
  const [q, setQ] = useState('');
  const [range, setRange] = useState<[Dayjs | null, Dayjs | null] | null>(null);
  const [limit, setLimit] = useState(300);
  const [file, setFile] = useState<'combined' | 'error'>('combined');
  const [auto, setAuto] = useState(false);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<LogQueryResult | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await adminAuditApi.getLogs({
        module: module === 'todos' ? undefined : module,
        contexts,
        level,
        q: q.trim() || undefined,
        from: range?.[0] ? range[0].format('YYYY-MM-DD') : undefined,
        to: range?.[1] ? range[1].format('YYYY-MM-DD') : undefined,
        limit,
        file,
      });
      setData(data);
    } catch (err: any) {
      message.error(err?.response?.data?.message ?? 'No se pudieron leer los logs');
    } finally {
      setLoading(false);
    }
  }, [module, contexts, level, q, range, limit, file]);

  useEffect(() => {
    load();
    adminAuditApi
      .getLogContexts()
      .then(({ data }) => setAllContexts(data))
      .catch(() => setAllContexts([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!auto) return;
    const id = setInterval(load, 30000);
    return () => clearInterval(id);
  }, [auto, load]);

  const moduleContexts = catalog.modules.find((m) => m.key === module)?.logContexts ?? [];

  const columns: ColumnsType<AppLogEntry> = [
    { title: 'Hora (servidor)', dataIndex: 'timestamp', width: 165, render: (v) => <code style={{ fontSize: 12 }}>{v}</code> },
    { title: 'Nivel', dataIndex: 'level', width: 80, render: (v: string) => <Tag color={LEVEL_COLOR[v] ?? 'default'}>{v}</Tag> },
    { title: 'Contexto', dataIndex: 'context', width: 230, ellipsis: true, render: (v) => v ?? <Text type="secondary">—</Text> },
    { title: 'Mensaje', dataIndex: 'message', ellipsis: true },
  ];

  return (
    <Card size="small">
      <Row gutter={[12, 8]} align="bottom">
        <Col xs={24} sm={12} lg={4}>
          <Text type="secondary">Módulo</Text>
          <Select
            style={{ width: '100%' }}
            value={module}
            onChange={(v) => setModule(v)}
            options={[{ value: 'todos', label: 'Todos' }, ...catalog.modules.map((m) => ({ value: m.key, label: m.label }))]}
          />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Text type="secondary">Contextos adicionales</Text>
          <Select
            mode="multiple"
            allowClear
            style={{ width: '100%' }}
            placeholder="Clases del backend…"
            value={contexts}
            onChange={setContexts}
            maxTagCount="responsive"
            options={allContexts.map((c) => ({ value: c.context, label: `${c.context} (${NUM.format(c.count)})` }))}
          />
        </Col>
        <Col xs={12} sm={6} lg={3}>
          <Text type="secondary">Nivel</Text>
          <Select allowClear style={{ width: '100%' }} placeholder="Todos" value={level} onChange={setLevel} options={['error', 'warn', 'info', 'debug'].map((l) => ({ value: l, label: l }))} />
        </Col>
        <Col xs={12} sm={6} lg={3}>
          <Text type="secondary">Archivo</Text>
          <Select style={{ width: '100%' }} value={file} onChange={setFile} options={[{ value: 'combined', label: 'combined.log' }, { value: 'error', label: 'error.log' }]} />
        </Col>
        <Col xs={24} sm={12} lg={5}>
          <Text type="secondary">Rango de fechas</Text>
          <RangePicker style={{ width: '100%' }} format="DD/MM/YYYY" value={range} onChange={(v) => setRange(v as any)} allowEmpty={[true, true]} />
        </Col>
        <Col xs={12} sm={6} lg={3}>
          <Text type="secondary">Máx.</Text>
          <InputNumber style={{ width: '100%' }} min={10} max={2000} value={limit} onChange={(v) => setLimit(Number(v) || 300)} />
        </Col>
        <Col xs={24} lg={16}>
          <Input.Search
            allowClear
            placeholder="Texto en el mensaje (p. ej. raw:, request_id, correo, Sirvo…)"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onSearch={() => load()}
            enterButton="Buscar"
          />
        </Col>
        <Col xs={24} lg={8}>
          <Space>
            <Button icon={<ReloadOutlined />} onClick={load} loading={loading}>
              Actualizar
            </Button>
            <Space size={4}>
              <Switch size="small" checked={auto} onChange={setAuto} />
              <Text type="secondary">auto 30 s</Text>
            </Space>
          </Space>
        </Col>
      </Row>

      {module !== 'todos' && (
        <Paragraph type="secondary" style={{ fontSize: 12, marginTop: 8, marginBottom: 0 }}>
          Contextos del módulo: {moduleContexts.join(', ')}
        </Paragraph>
      )}

      <div style={{ marginTop: 12 }}>
        {data && !data.available && (
          <Alert
            type="info"
            showIcon
            message="Log no disponible en este entorno"
            description={`No existe ${data.file}. En producción winston escribe logs/combined.log y logs/error.log (NODE_ENV=production).`}
            style={{ marginBottom: 12 }}
          />
        )}
        {data?.available && (
          <Space wrap style={{ marginBottom: 8 }}>
            <Text strong>{NUM.format(data.matched)} coincidencias</Text>
            <Text type="secondary">· mostrando {NUM.format(data.entries.length)}</Text>
            <Text type="secondary">· {NUM.format(data.scannedLines)} líneas revisadas</Text>
            <Text type="secondary">· archivo {(data.fileSizeBytes / 1048576).toFixed(1)} MB</Text>
            {data.truncated && (
              <Tooltip title="Por rendimiento solo se lee la cola del archivo (últimos ~12 MB). Cubre varios días; para más atrás usar el servidor.">
                <Tag color="orange">Solo la cola del archivo</Tag>
              </Tooltip>
            )}
          </Space>
        )}
        <Table<AppLogEntry>
          className="ta-table"
          size="small"
          rowKey={(_, i) => String(i)}
          loading={loading}
          columns={columns}
          dataSource={data?.entries ?? []}
          pagination={{ pageSize: 50, showSizeChanger: true, pageSizeOptions: [50, 100, 300] }}
          expandable={{
            rowExpandable: (r) => !!r.trace || !!r.meta || r.message.length > 120,
            expandedRowRender: (r) => (
              <div style={{ fontSize: 12 }}>
                <Paragraph copyable style={{ whiteSpace: 'pre-wrap', marginBottom: r.trace || r.meta ? 8 : 0 }}>
                  {r.message}
                </Paragraph>
                {r.trace && <pre style={{ whiteSpace: 'pre-wrap', fontSize: 11 }}>{r.trace}</pre>}
                {r.meta && <pre style={{ fontSize: 11 }}>{JSON.stringify(r.meta, null, 2)}</pre>}
              </div>
            ),
          }}
        />
      </div>
    </Card>
  );
};

// ---------------------------------------------------------------------------
// Tarjetas de estado (lenguaje llano)
// ---------------------------------------------------------------------------
const StatusCards: React.FC<{ overview: AuditOverview; tech: boolean }> = ({ overview, tech }) => {
  const rep = overview.notificaciones.ultimoReporte5pm;
  const repOk = rep?.status === 'sent';
  return (
    <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
      <Col xs={24} md={8}>
        <Card size="small" title="Salas de reuniones">
          <Row gutter={8}>
            <Col span={8}>
              <Statistic title="Reuniones hoy" value={overview.salas.hoy} />
            </Col>
            <Col span={8}>
              <Statistic title="Esperando aprobación" value={overview.salas.pendientesAprobacion} valueStyle={{ color: overview.salas.pendientesAprobacion ? '#F59E0B' : undefined }} />
            </Col>
            <Col span={8}>
              <Statistic title="Canceladas (7 días)" value={overview.salas.canceladas7d} />
            </Col>
          </Row>
        </Card>
      </Col>
      <Col xs={24} md={8}>
        <Card size="small" title="Cheques">
          <Row gutter={8}>
            <Col span={8}>
              <Statistic title="Esperando autorización" value={overview.cheques.pendientesAutorizar} />
            </Col>
            <Col span={8}>
              <Statistic title="Pendientes de liquidar" value={overview.cheques.pendientesLiquidar} />
            </Col>
            <Col span={8}>
              <Statistic title="Con error en Sirvo" value={overview.cheques.conErrorSirvo} valueStyle={{ color: overview.cheques.conErrorSirvo ? '#EF4444' : undefined }} />
            </Col>
          </Row>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {NUM.format(overview.cheques.cambios24h)} movimientos (autorizaciones, liquidaciones…) en las últimas 24 h
          </Text>
        </Card>
      </Col>
      <Col xs={24} md={8}>
        <Card size="small" title="Notificaciones">
          <Row gutter={8}>
            <Col span={12}>
              <Statistic title="Sin entregar" value={overview.notificaciones.pendientes} valueStyle={{ color: overview.notificaciones.pendientes ? '#F59E0B' : undefined }} />
            </Col>
            <Col span={12}>
              <Statistic title="Recibidas hoy" value={overview.notificaciones.hoy} />
            </Col>
          </Row>
          <div style={{ marginTop: 8 }}>
            {rep ? (
              <Space size={6} wrap>
                {repOk ? <CheckCircleOutlined style={{ color: '#10B981' }} /> : <ExclamationCircleOutlined style={{ color: '#EF4444' }} />}
                <Text style={{ fontSize: 13 }}>
                  Reporte de las 5 PM del {dayjs(rep.report_date).format('DD/MM/YYYY')}:{' '}
                  <Text strong type={repOk ? 'success' : 'danger'}>
                    {STATUS_ES[rep.status] ?? rep.status}
                  </Text>
                  {rep.sent_at && <Text type="secondary"> a las {rep.sent_at.slice(11, 16)}</Text>}
                </Text>
              </Space>
            ) : (
              <Text type="secondary">Sin registros del reporte de las 5 PM</Text>
            )}
          </div>
        </Card>
      </Col>
      {tech && (
        <Col xs={24}>
          <Space wrap>
            <Text type="secondary">Log de la aplicación (24 h):</Text>
            {overview.logs.available ? (
              <>
                <Tag color={overview.logs.errores24h ? 'red' : 'green'}>{NUM.format(overview.logs.errores24h)} errores</Tag>
                <Tag color={overview.logs.warnings24h ? 'orange' : 'default'}>{NUM.format(overview.logs.warnings24h)} warnings</Tag>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  {overview.logs.file} · {(overview.logs.fileSizeBytes / 1048576).toFixed(1)} MB
                </Text>
              </>
            ) : (
              <Tag>no disponible en este entorno</Tag>
            )}
          </Space>
        </Col>
      )}
    </Row>
  );
};

// ---------------------------------------------------------------------------
// Página
// ---------------------------------------------------------------------------
const AuditoriaPage: React.FC = () => {
  const navigate = useNavigate();
  const isSuperuser = useAuthStore((s) => s.is_superuser);
  const isDark = useThemeStore((s) => s.mode === 'dark');
  const tk = makeTokens(isDark);

  const [catalog, setCatalog] = useState<AuditCatalog | null>(null);
  const [overview, setOverview] = useState<AuditOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [tech, setTech] = useState<boolean>(() => {
    try {
      return localStorage.getItem(TECH_MODE_KEY) === '1';
    } catch {
      return false;
    }
  });

  const toggleTech = (v: boolean) => {
    setTech(v);
    try {
      localStorage.setItem(TECH_MODE_KEY, v ? '1' : '0');
    } catch {
      /* sin almacenamiento: se mantiene solo en memoria */
    }
  };

  useEffect(() => {
    if (!isSuperuser) {
      message.error('Esta sección es solo para administradores');
      navigate('/dashboard');
    }
  }, [isSuperuser, navigate]);

  const loadOverview = useCallback(async () => {
    try {
      const { data } = await adminAuditApi.getOverview();
      setOverview(data);
    } catch {
      message.warning('No se pudo cargar el resumen');
    }
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const { data } = await adminAuditApi.getCatalog();
        setCatalog(data);
      } catch (err: any) {
        message.error(err?.response?.data?.message ?? 'No se pudo cargar la sección de administración');
      } finally {
        setLoading(false);
      }
      loadOverview();
    })();
  }, [loadOverview]);

  return (
    <div style={{ padding: 24 }}>
      <style>{makeCSS(tk)}</style>
      <Card
        title={
          <Space direction="vertical" size={0}>
            <Space>
              <AuditOutlined />
              <Title level={4} style={{ margin: 0 }}>
                Revisión de actividad
              </Title>
            </Space>
            <Text type="secondary" style={{ fontSize: 13, fontWeight: 400 }}>
              Qué pasó, quién lo hizo y a qué hora — en salas, cheques y notificaciones
            </Text>
          </Space>
        }
        extra={
          <Space size="middle">
            {overview && (
              <Text type="secondary" style={{ fontSize: 12 }}>
                Actualizado {dayjs(overview.generatedAt).format('DD/MM/YYYY HH:mm')}
              </Text>
            )}
            <Button icon={<ReloadOutlined />} size="small" onClick={loadOverview}>
              Actualizar
            </Button>
            <Tooltip title="Muestra la consulta SQL, el registro técnico del sistema y opciones avanzadas">
              <Space size={4}>
                <Switch size="small" checked={tech} onChange={toggleTech} />
                <Text type="secondary" style={{ fontSize: 12 }}>
                  Vista técnica
                </Text>
              </Space>
            </Tooltip>
          </Space>
        }
        loading={loading}
      >
        {overview && <StatusCards overview={overview} tech={tech} />}

        {catalog && (
          <Tabs
            defaultActiveKey="salas"
            size="large"
            items={[
              ...catalog.modules.map((m) => ({
                key: m.key,
                label: m.label,
                children: (
                  <>
                    <Paragraph type="secondary" style={{ marginBottom: 12 }}>
                      {m.description}
                      {tech && m.technicalNote && (
                        <>
                          {' '}
                          <Text type="secondary" style={{ fontSize: 12 }}>
                            ({m.technicalNote})
                          </Text>
                        </>
                      )}
                    </Paragraph>
                    <QueryPanel module={m.key} catalog={catalog} tech={tech} />
                  </>
                ),
              })),
              ...(tech
                ? [
                    {
                      key: 'logs',
                      label: 'Registro técnico del sistema',
                      children: <LogsPanel catalog={catalog} />,
                    },
                  ]
                : []),
            ]}
          />
        )}
      </Card>
    </div>
  );
};

export default AuditoriaPage;
