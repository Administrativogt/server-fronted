import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Col,
  DatePicker,
  Descriptions,
  Empty,
  Form,
  Input,
  InputNumber,
  Menu,
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
  AuditOutlined,
  ClearOutlined,
  CodeOutlined,
  DownloadOutlined,
  FileSearchOutlined,
  PlayCircleOutlined,
  ReloadOutlined,
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

const { Text, Paragraph } = Typography;
const { RangePicker } = DatePicker;

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

const LEVEL_COLOR: Record<string, string> = { error: 'red', warn: 'orange', info: 'blue', debug: 'default' };

const renderCell = (col: AuditColumn, v: unknown): React.ReactNode => {
  if (v === null || v === undefined || v === '') return <Text type="secondary">—</Text>;
  switch (col.type) {
    case 'money': {
      const n = Number(v);
      return <span style={{ fontVariantNumeric: 'tabular-nums' }}>{Number.isFinite(n) ? MONEY.format(n) : String(v)}</span>;
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
      return <code style={{ fontSize: 12 }}>{String(v)}</code>;
    case 'bool':
      return v === true || v === 'true' || v === 't' ? <Tag color="green">Sí</Tag> : <Tag>No</Tag>;
    case 'badge':
      return <Tag color={badgeColor(String(v))}>{String(v)}</Tag>;
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

// ---------------------------------------------------------------------------
// Formulario de parámetros generado desde el catálogo
// ---------------------------------------------------------------------------
const ParamField: React.FC<{ p: AuditParam }> = ({ p }) => {
  const label = (
    <Space size={4}>
      {p.label}
      {p.help && (
        <Tooltip title={p.help}>
          <Text type="secondary" style={{ cursor: 'help' }}>
            ⓘ
          </Text>
        </Tooltip>
      )}
    </Space>
  );
  const rules = p.required ? [{ required: true, message: 'Obligatorio' }] : undefined;
  switch (p.type) {
    case 'date':
      return (
        <Form.Item name={p.key} label={label} rules={rules}>
          <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" allowClear />
        </Form.Item>
      );
    case 'int':
    case 'number':
      return (
        <Form.Item name={p.key} label={label} rules={rules} initialValue={p.default}>
          <InputNumber style={{ width: '100%' }} controls={false} placeholder={p.placeholder} step={p.type === 'int' ? 1 : 0.01} />
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
          <Input allowClear placeholder={p.placeholder ?? 'contiene…'} />
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

// ---------------------------------------------------------------------------
// Panel de consultas de un módulo
// ---------------------------------------------------------------------------
const QueryPanel: React.FC<{ module: AuditModuleKey; catalog: AuditCatalog }> = ({ module, catalog }) => {
  const queries = useMemo(() => catalog.queries.filter((q) => q.module === module), [catalog, module]);
  const [selectedKey, setSelectedKey] = useState<string>(queries[0]?.key ?? '');
  const query: AuditQueryDef | undefined = queries.find((q) => q.key === selectedKey) ?? queries[0];
  const [form] = Form.useForm();
  const [limit, setLimit] = useState<number>(query?.defaultLimit ?? catalog.limits.default);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<AuditRunResult | null>(null);
  const [showSql, setShowSql] = useState(false);

  useEffect(() => {
    form.resetFields();
    setResult(null);
    setLimit(query?.defaultLimit ?? catalog.limits.default);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedKey]);

  const run = async () => {
    if (!query) return;
    try {
      const values = await form.validateFields();
      setRunning(true);
      const { data } = await adminAuditApi.runQuery(query.key, { ...serializeParams(query.params, values), limit });
      setResult(data);
      if (data.rowCount === 0) message.info('La consulta no devolvió filas');
    } catch (err: any) {
      if (err?.errorFields) return; // validación del form
      const msg = err?.response?.data?.message ?? err?.message ?? 'Error al ejecutar la consulta';
      message.error(Array.isArray(msg) ? msg.join(', ') : String(msg));
    } finally {
      setRunning(false);
    }
  };

  const columns: ColumnsType<Record<string, unknown>> = useMemo(() => {
    if (!result) return [];
    const defs: AuditColumn[] = result.columns.length
      ? result.columns
      : Object.keys(result.rows[0] ?? {}).map((k) => ({ key: k, title: k }));
    return defs.map((c) => ({
      key: c.key,
      dataIndex: c.key,
      title: c.title,
      width: c.width,
      ellipsis: !c.type || c.type === 'text',
      align: c.type === 'money' || c.type === 'int' || c.type === 'number' ? 'right' : undefined,
      sorter: (a, b) => compareValues(a[c.key], b[c.key]),
      render: (v: unknown) => renderCell(c, v),
    }));
  }, [result]);

  if (!query) return <Empty description="Sin consultas para este módulo" />;

  return (
    <Row gutter={16}>
      <Col xs={24} md={7} lg={6}>
        <Menu
          mode="inline"
          selectedKeys={[query.key]}
          onClick={(e) => setSelectedKey(e.key)}
          style={{ borderInlineEnd: 0 }}
          items={queries.map((q) => ({
            key: q.key,
            icon: <FileSearchOutlined />,
            label: (
              <Tooltip title={q.description} placement="right" mouseEnterDelay={0.4}>
                <span>{q.title}</span>
              </Tooltip>
            ),
          }))}
        />
      </Col>
      <Col xs={24} md={17} lg={18}>
        <Card
          size="small"
          title={query.title}
          extra={
            <Space>
              <Tooltip title="Ver el SQL que se ejecuta">
                <Button size="small" icon={<CodeOutlined />} type={showSql ? 'primary' : 'default'} onClick={() => setShowSql((s) => !s)}>
                  SQL
                </Button>
              </Tooltip>
            </Space>
          }
        >
          <Paragraph type="secondary" style={{ marginBottom: 4 }}>
            {query.description}
          </Paragraph>
          {query.hint && (
            <Paragraph type="secondary" style={{ fontSize: 12, marginBottom: 12 }}>
              {query.hint}
            </Paragraph>
          )}

          {showSql && (
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

          <Form form={form} layout="vertical" onFinish={run} size="small">
            <Row gutter={12}>
              {query.params.map((p) => (
                <Col key={p.key} xs={24} sm={12} lg={8}>
                  <ParamField p={p} />
                </Col>
              ))}
              <Col xs={24} sm={12} lg={8}>
                <Form.Item label="Máx. filas">
                  <InputNumber
                    style={{ width: '100%' }}
                    min={1}
                    max={catalog.limits.max}
                    value={limit}
                    onChange={(v) => setLimit(Number(v) || catalog.limits.default)}
                  />
                </Form.Item>
              </Col>
            </Row>
            <Space>
              <Button type="primary" icon={<PlayCircleOutlined />} htmlType="submit" loading={running}>
                Ejecutar
              </Button>
              <Button
                icon={<ClearOutlined />}
                onClick={() => {
                  form.resetFields();
                  setResult(null);
                }}
              >
                Limpiar
              </Button>
              {result && result.rowCount > 0 && (
                <Button
                  icon={<DownloadOutlined />}
                  onClick={() =>
                    downloadText(
                      `auditoria_${query.key.replace(/\./g, '_')}_${dayjs().format('YYYYMMDD_HHmm')}.csv`,
                      toCsv(result.columns, result.rows),
                    )
                  }
                >
                  Exportar CSV
                </Button>
              )}
            </Space>
          </Form>

          {result && (
            <div style={{ marginTop: 16 }}>
              <Space wrap style={{ marginBottom: 8 }}>
                <Text strong>{NUM.format(result.rowCount)} filas</Text>
                <Text type="secondary">· {result.elapsedMs} ms</Text>
                {result.truncated && (
                  <Tag color="orange">Se alcanzó el límite de {NUM.format(result.limit)} — suba "Máx. filas" o acote los filtros</Tag>
                )}
                <Text type="secondary" style={{ fontSize: 12 }}>
                  Horas en hora de Guatemala
                </Text>
              </Space>
              <Table
                className="ta-table"
                size="small"
                rowKey={(_, i) => String(i)}
                columns={columns}
                dataSource={result.rows}
                scroll={{ x: Math.max(900, columns.length * 150) }}
                pagination={{ pageSize: 50, showSizeChanger: true, pageSizeOptions: [25, 50, 100, 500], showTotal: (t) => `${NUM.format(t)} filas` }}
              />
            </div>
          )}
        </Card>
      </Col>
    </Row>
  );
};

// ---------------------------------------------------------------------------
// Visor de logs de la aplicación
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
          <Select
            allowClear
            style={{ width: '100%' }}
            placeholder="Todos"
            value={level}
            onChange={setLevel}
            options={['error', 'warn', 'info', 'debug'].map((l) => ({ value: l, label: l }))}
          />
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

  useEffect(() => {
    if (!isSuperuser) {
      message.error('El panel de auditoría es solo para superusuarios');
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
        message.error(err?.response?.data?.message ?? 'No se pudo cargar el catálogo de auditoría');
      } finally {
        setLoading(false);
      }
      loadOverview();
    })();
  }, [loadOverview]);

  const rep = overview?.notificaciones.ultimoReporte5pm;

  return (
    <div style={{ padding: 24 }}>
      <style>{makeCSS(tk)}</style>
      <Card
        title={
          <Space>
            <AuditOutlined />
            Auditoría — Salas · Cheques · Notificaciones
          </Space>
        }
        extra={
          <Space>
            {overview && (
              <Text type="secondary" style={{ fontSize: 12 }}>
                Resumen: {dayjs(overview.generatedAt).format('DD/MM/YYYY HH:mm:ss')}
              </Text>
            )}
            <Button icon={<ReloadOutlined />} size="small" onClick={loadOverview}>
              Actualizar resumen
            </Button>
          </Space>
        }
        loading={loading}
      >
        <Paragraph type="secondary" style={{ marginTop: 0 }}>
          Consultas de solo lectura sobre la base de datos (las mismas que antes se hacían por SQL) y el log de la
          aplicación. Cada consulta corre en una transacción <code>READ ONLY</code> con timeout de{' '}
          {catalog?.limits.statementTimeout ?? '25s'}; las horas se muestran en hora de Guatemala.
        </Paragraph>

        {overview && (
          <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
            <Col xs={24} md={8}>
              <Card size="small" title="Reservación de salas">
                <Row gutter={8}>
                  <Col span={8}>
                    <Statistic title="Hoy" value={overview.salas.hoy} />
                  </Col>
                  <Col span={8}>
                    <Statistic title="Por aprobar" value={overview.salas.pendientesAprobacion} valueStyle={{ color: overview.salas.pendientesAprobacion ? '#F59E0B' : undefined }} />
                  </Col>
                  <Col span={8}>
                    <Statistic title="Canceladas 7d" value={overview.salas.canceladas7d} />
                  </Col>
                </Row>
              </Card>
            </Col>
            <Col xs={24} md={8}>
              <Card size="small" title="Gestión de cheques">
                <Row gutter={8}>
                  <Col span={6}>
                    <Statistic title="Por autorizar" value={overview.cheques.pendientesAutorizar} />
                  </Col>
                  <Col span={6}>
                    <Statistic title="Por liquidar" value={overview.cheques.pendientesLiquidar} />
                  </Col>
                  <Col span={6}>
                    <Statistic title="Error Sirvo" value={overview.cheques.conErrorSirvo} valueStyle={{ color: overview.cheques.conErrorSirvo ? '#EF4444' : undefined }} />
                  </Col>
                  <Col span={6}>
                    <Statistic title="Cambios 24h" value={overview.cheques.cambios24h} />
                  </Col>
                </Row>
              </Card>
            </Col>
            <Col xs={24} md={8}>
              <Card size="small" title="Notificaciones">
                <Row gutter={8}>
                  <Col span={8}>
                    <Statistic title="Pendientes" value={overview.notificaciones.pendientes} />
                  </Col>
                  <Col span={8}>
                    <Statistic title="Recibidas hoy" value={overview.notificaciones.hoy} />
                  </Col>
                  <Col span={8}>
                    <Statistic title="Cambios 24h" value={overview.notificaciones.cambios24h} />
                  </Col>
                </Row>
                <Descriptions size="small" column={1} style={{ marginTop: 8 }}>
                  <Descriptions.Item label="Último reporte 5 PM">
                    {rep ? (
                      <Space size={4} wrap>
                        <Tag color={badgeColor(rep.status)}>{rep.status}</Tag>
                        <Text>{dayjs(rep.report_date).format('DD/MM/YYYY')}</Text>
                        {rep.sent_at && <Text type="secondary">enviado {rep.sent_at}</Text>}
                        <Text type="secondary">· {rep.attempts} intento(s)</Text>
                      </Space>
                    ) : (
                      <Text type="secondary">sin registros</Text>
                    )}
                  </Descriptions.Item>
                </Descriptions>
              </Card>
            </Col>
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
          </Row>
        )}

        {catalog && (
          <Tabs
            defaultActiveKey="salas"
            items={[
              ...catalog.modules.map((m) => ({
                key: m.key,
                label: m.label,
                children: (
                  <>
                    <Paragraph type="secondary" style={{ fontSize: 12 }}>
                      {m.description}
                    </Paragraph>
                    <QueryPanel module={m.key} catalog={catalog} />
                  </>
                ),
              })),
              {
                key: 'logs',
                label: 'Logs de la aplicación',
                children: <LogsPanel catalog={catalog} />,
              },
            ]}
          />
        )}
      </Card>
    </div>
  );
};

export default AuditoriaPage;
