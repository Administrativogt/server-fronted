import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  Alert,
  Button,
  Card,
  Col,
  DatePicker,
  Empty,
  Input,
  InputNumber,
  Result,
  Row,
  Segmented,
  Select,
  Skeleton,
  Space,
  Table,
  Tag,
  Tooltip,
  Typography,
  message,
  theme,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  ClockCircleOutlined,
  DownloadOutlined,
  ExclamationCircleOutlined,
  FileSearchOutlined,
  ReloadOutlined,
  WalletOutlined,
} from '@ant-design/icons';
import { ResponsiveBar } from '@nivo/bar';
import dayjs, { type Dayjs } from 'dayjs';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import {
  GASTO_AREAS,
  GASTO_ESTADOS,
  areaLabel,
  estadoInfo,
  getGastosFilterOptions,
  getGastosLines,
  getGastosSummary,
  type GastoArea,
  type GastoEstado,
  type GastoLinea,
  type GastosFilterOptions,
  type GastosFilters,
  type GastosSummary,
} from '../../api/migracionGastos';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
const mesLabel = (ym: string) => {
  const [y, m] = ym.split('-').map(Number);
  return `${MESES[m - 1]} ${String(y).slice(2)}`;
};

const qFmt = new Intl.NumberFormat('es-GT', { style: 'currency', currency: 'GTQ', maximumFractionDigits: 2 });
const qShort = new Intl.NumberFormat('es-GT', { style: 'currency', currency: 'GTQ', notation: 'compact', maximumFractionDigits: 1 });
const nFmt = new Intl.NumberFormat('es-GT');
const money = (n: number) => qFmt.format(n ?? 0);

const RANGOS: Record<string, string> = {
  '0-15': '0–15 días',
  '16-30': '16–30 días',
  '31-60': '31–60 días',
  '61+': 'Más de 60',
};
// Antigüedad = magnitud: un solo tono (ámbar), de claro a oscuro
const RANGO_COLOR: Record<string, string> = {
  '0-15': '#FCD34D',
  '16-30': '#F59E0B',
  '31-60': '#D97706',
  '61+': '#B45309',
};

const defaultRange = (): [Dayjs, Dayjs] => [dayjs().startOf('year'), dayjs()];

function Kpi({
  label,
  value,
  sub,
  icon,
  accent,
  onClick,
  active,
}: {
  label: string;
  value: string;
  sub: ReactNode;
  icon: ReactNode;
  accent: string;
  onClick?: () => void;
  active?: boolean;
}) {
  const { token } = theme.useToken();
  return (
    <Card
      size="small"
      hoverable={!!onClick}
      onClick={onClick}
      style={{
        height: '100%',
        borderColor: active ? accent : undefined,
        boxShadow: active ? `0 0 0 1px ${accent}` : undefined,
      }}
      styles={{ body: { padding: 16 } }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ minWidth: 0 }}>
          <Text type="secondary" style={{ fontSize: 13 }}>
            {label}
          </Text>
          <div style={{ fontSize: 24, fontWeight: 600, color: token.colorText, lineHeight: 1.3 }}>{value}</div>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {sub}
          </Text>
        </div>
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: 10,
            display: 'grid',
            placeItems: 'center',
            background: `${accent}1f`,
            color: accent,
            fontSize: 18,
            flexShrink: 0,
          }}
        >
          {icon}
        </div>
      </div>
    </Card>
  );
}

// Tablero de gastos por NT de Migración. Reemplaza el Excel "NT Honorarios y
// Gastos": los datos son las líneas de cheque que Sirvo ya sincroniza
// (coordinador LAS), así que no se vuelve a capturar nada.
function GastosMigracion() {
  const { token } = theme.useToken();
  const [range, setRange] = useState<[Dayjs, Dayjs] | null>(defaultRange);
  const [cliente, setCliente] = useState<string | undefined>();
  const [nt, setNt] = useState<number | null>(null);
  // El coordinador LAS también lleva Penal y Laboral: por defecto, solo Migración
  const [area, setArea] = useState<GastoArea | 'TODAS'>('MIGRACION');
  const [estado, setEstado] = useState<GastoEstado | undefined>();
  const [search, setSearch] = useState('');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const [options, setOptions] = useState<GastosFilterOptions | null>(null);
  const [summary, setSummary] = useState<GastosSummary | null>(null);
  const [lines, setLines] = useState<{ items: GastoLinea[]; total: number }>({ items: [], total: 0 });
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [loadingLines, setLoadingLines] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [forbidden, setForbidden] = useState(false);

  // La búsqueda de texto espera a que dejen de escribir
  useEffect(() => {
    const t = setTimeout(() => setQ(search.trim()), 350);
    return () => clearTimeout(t);
  }, [search]);

  const filters: GastosFilters = useMemo(
    () => ({
      from: range?.[0]?.format('YYYY-MM-DD'),
      to: range?.[1]?.format('YYYY-MM-DD'),
      cliente,
      nt: nt ?? undefined,
      area: area === 'TODAS' ? undefined : area,
      estado,
      q: q || undefined,
    }),
    [range, cliente, nt, area, estado, q],
  );

  useEffect(() => setPage(1), [filters]);

  const handleError = useCallback((err: any, fallback: string) => {
    if (err?.response?.status === 403) setForbidden(true);
    else message.error(err?.response?.data?.message || fallback);
  }, []);

  useEffect(() => {
    getGastosFilterOptions()
      .then(({ data }) => setOptions(data))
      .catch((e) => handleError(e, 'No se pudieron cargar los clientes'));
  }, [handleError]);

  const loadSummary = useCallback(() => {
    setLoadingSummary(true);
    getGastosSummary(filters)
      .then(({ data }) => setSummary(data))
      .catch((e) => handleError(e, 'No se pudo cargar el resumen'))
      .finally(() => setLoadingSummary(false));
  }, [filters, handleError]);

  const loadLines = useCallback(() => {
    setLoadingLines(true);
    getGastosLines(filters, page, pageSize)
      .then(({ data }) => setLines({ items: data.items, total: data.total }))
      .catch((e) => handleError(e, 'No se pudieron cargar los gastos'))
      .finally(() => setLoadingLines(false));
  }, [filters, page, pageSize, handleError]);

  useEffect(loadSummary, [loadSummary]);
  useEffect(loadLines, [loadLines]);

  const hasFilters = !!(cliente || nt || estado || q || area !== 'MIGRACION');
  const resetFilters = () => {
    setRange(defaultRange());
    setCliente(undefined);
    setNt(null);
    setArea('MIGRACION');
    setEstado(undefined);
    setSearch('');
  };
  const toggleEstado = (e: GastoEstado) => setEstado((cur) => (cur === e ? undefined : e));

  const nivoTheme = useMemo(
    () => ({
      text: { fill: token.colorTextSecondary, fontSize: 11 },
      axis: { ticks: { text: { fill: token.colorTextSecondary, fontSize: 11 } } },
      grid: { line: { stroke: token.colorBorderSecondary, strokeWidth: 1 } },
    }),
    [token],
  );

  const tooltipBox = (children: ReactNode) => (
    <div
      style={{
        background: token.colorBgElevated,
        color: token.colorText,
        border: `1px solid ${token.colorBorderSecondary}`,
        borderRadius: 8,
        padding: '8px 10px',
        fontSize: 12,
        boxShadow: token.boxShadowSecondary,
        whiteSpace: 'nowrap',
      }}
    >
      {children}
    </div>
  );

  const exportExcel = async () => {
    setExporting(true);
    try {
      const { data } = await getGastosLines(filters, 1, 5000);
      const wb = new ExcelJS.Workbook();
      const ws = wb.addWorksheet('Gastos Migración');
      ws.columns = [
        { header: 'MES', key: 'mes', width: 10 },
        { header: 'FECHA SOLICITUD', key: 'fecha', width: 14 },
        { header: 'NT', key: 'nt', width: 10 },
        { header: 'ÁREA', key: 'area', width: 12 },
        { header: 'CLIENTE', key: 'cliente', width: 36 },
        { header: 'CASO', key: 'caso', width: 40 },
        { header: 'CONCEPTO', key: 'concepto', width: 48 },
        { header: 'CANTIDAD', key: 'cantidad', width: 10 },
        { header: 'MONTO (Q)', key: 'monto', width: 14, style: { numFmt: '#,##0.00' } },
        { header: 'No. CHEQUE', key: 'cheque', width: 12 },
        { header: 'FECHA CHEQUE', key: 'fecha_cheque', width: 14 },
        { header: 'ESTADO', key: 'estado', width: 22 },
        { header: 'DÍAS SIN LIQUIDAR', key: 'dias', width: 16 },
      ];
      ws.getRow(1).font = { bold: true };
      ws.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDFC9ED' } };
      data.items.forEach((l) =>
        ws.addRow({
          mes: mesLabel(l.fecha.slice(0, 7)),
          fecha: l.fecha,
          nt: l.nt,
          area: areaLabel(l.area),
          cliente: l.cliente,
          caso: l.caso,
          concepto: l.concepto,
          cantidad: l.cantidad,
          monto: l.monto,
          cheque: l.cheque ?? '',
          fecha_cheque: l.fecha_cheque ?? '',
          estado: estadoInfo(l.estado).label,
          dias: l.dias_pendiente ?? '',
        }),
      );
      ws.views = [{ state: 'frozen', ySplit: 1 }];
      ws.autoFilter = { from: 'A1', to: 'M1' };
      const buffer = await wb.xlsx.writeBuffer();
      saveAs(
        new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
        `gastos-migracion-${dayjs().format('YYYY-MM-DD')}.xlsx`,
      );
      if (data.total > data.items.length) {
        message.warning(`Se exportaron ${data.items.length} de ${data.total} líneas; acota las fechas para bajar el resto.`);
      }
    } catch (e) {
      handleError(e, 'No se pudo exportar');
    } finally {
      setExporting(false);
    }
  };

  if (forbidden) {
    return (
      <Result
        status="403"
        title="Sin acceso"
        subTitle="Los gastos de Migración solo los ven el equipo de Migración (socios y secretarias), contabilidad y administradores."
      />
    );
  }

  const k = summary?.kpis;
  const porMes = (summary?.por_mes ?? []).map((m) => ({ ...m, label: mesLabel(m.mes) }));
  const totalEstados = (summary?.por_estado ?? []).reduce((s, e) => s + e.monto, 0);
  const estadosOrdenados = GASTO_ESTADOS.map((info) => ({
    info,
    data: summary?.por_estado.find((e) => e.estado === info.value),
  })).filter((e) => e.data);
  const topClientes = [...(summary?.top_clientes ?? [])].reverse();
  const antiguedad = summary?.antiguedad_pendientes ?? [];

  const columns: ColumnsType<GastoLinea> = [
    {
      title: 'Fecha',
      dataIndex: 'fecha',
      width: 104,
      render: (f: string) => dayjs(f).format('DD/MM/YYYY'),
    },
    {
      title: 'NT',
      dataIndex: 'nt',
      width: 96,
      render: (v: number) => (
        <Tooltip title="Ver solo esta NT">
          <Button type="link" size="small" style={{ padding: 0 }} onClick={() => setNt(v)}>
            {v}
          </Button>
        </Tooltip>
      ),
    },
    {
      title: 'Área',
      dataIndex: 'area',
      width: 96,
      render: (a: GastoArea, r) => (
        <Tooltip title={r.area_por_catalogo ? 'Según el catálogo de Notas de gastos' : 'Según las palabras del caso'}>
          <Text type={r.area_por_catalogo ? undefined : 'secondary'}>{areaLabel(a)}</Text>
        </Tooltip>
      ),
    },
    {
      title: 'Cliente',
      dataIndex: 'cliente',
      width: 220,
      ellipsis: true,
      render: (v: string, r) => (
        <Tooltip title={`${v} (${r.cliente_codigo}) — clic para filtrar`}>
          <a onClick={() => setCliente(r.cliente_codigo)}>{v}</a>
        </Tooltip>
      ),
    },
    {
      title: 'Concepto',
      dataIndex: 'concepto',
      ellipsis: true,
      render: (v: string, r) => (
        <div style={{ minWidth: 0 }}>
          <div style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{v}</div>
          <Text type="secondary" style={{ fontSize: 12 }} ellipsis>
            {r.caso}
          </Text>
        </div>
      ),
    },
    {
      title: 'Monto',
      dataIndex: 'monto',
      width: 120,
      align: 'right',
      render: (v: number) => <span style={{ fontVariantNumeric: 'tabular-nums' }}>{money(v)}</span>,
    },
    {
      title: 'Cheque',
      dataIndex: 'cheque',
      width: 110,
      render: (v: number | null, r) =>
        v ? (
          <Tooltip title={r.fecha_cheque ? `Emitido ${dayjs(r.fecha_cheque).format('DD/MM/YYYY')}` : undefined}>
            <span>{v}</span>
          </Tooltip>
        ) : (
          <Text type="secondary">—</Text>
        ),
    },
    {
      title: 'Estado',
      dataIndex: 'estado',
      width: 200,
      render: (e: GastoEstado, r) => {
        const info = estadoInfo(e);
        const vencido = r.dias_pendiente != null && r.dias_pendiente > 30;
        return (
          <Space size={4} wrap>
            <Tooltip title={info.hint}>
              <Tag color={info.color} style={{ marginInlineEnd: 0 }}>
                {info.label}
              </Tag>
            </Tooltip>
            {r.dias_pendiente != null && (
              <Text type={vencido ? 'danger' : 'secondary'} style={{ fontSize: 12 }}>
                {vencido && <ExclamationCircleOutlined style={{ marginRight: 4 }} />}
                {r.dias_pendiente} d
              </Text>
            )}
          </Space>
        );
      },
    },
  ];

  return (
    <div style={{ padding: 4 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap', marginBottom: 16 }}>
        <div>
          <Title level={3} style={{ margin: 0 }}>
            Gastos por NT{area !== 'TODAS' ? ` — ${areaLabel(area)}` : ''}
          </Title>
          <Text type="secondary">
            Cheques del coordinador {summary?.coordinadores.join(', ') ?? 'LAS'} en Sirvo. Se actualizan solos; no hay que
            capturar nada.
          </Text>
        </div>
        <Space wrap>
          <Button icon={<ReloadOutlined />} onClick={() => { loadSummary(); loadLines(); }}>
            Actualizar
          </Button>
          <Button type="primary" icon={<DownloadOutlined />} loading={exporting} onClick={exportExcel}>
            Exportar a Excel
          </Button>
        </Space>
      </div>

      {/* Filtros: una sola fila sobre los gráficos */}
      <Card size="small" style={{ marginBottom: 16 }}>
        <Space wrap size={[8, 8]}>
          <Segmented
            value={area}
            onChange={(v) => setArea(v as GastoArea | 'TODAS')}
            options={[
              ...GASTO_AREAS.map((a) => {
                const d = summary?.por_area.find((x) => x.area === a.value);
                return {
                  value: a.value,
                  label: (
                    <Tooltip title={d ? `${money(d.monto)} · ${nFmt.format(d.lineas)} líneas` : 'Sin gastos'}>
                      <span>{a.label}</span>
                    </Tooltip>
                  ),
                };
              }),
              { value: 'TODAS', label: 'Todas' },
            ]}
          />
          <RangePicker
            value={range}
            onChange={(v) => setRange(v && v[0] && v[1] ? [v[0], v[1]] : null)}
            format="DD/MM/YYYY"
            allowClear
            presets={[
              { label: 'Este mes', value: [dayjs().startOf('month'), dayjs()] },
              { label: 'Mes pasado', value: [dayjs().subtract(1, 'month').startOf('month'), dayjs().subtract(1, 'month').endOf('month')] },
              { label: 'Últimos 3 meses', value: [dayjs().subtract(3, 'month').startOf('month'), dayjs()] },
              { label: 'Este año', value: defaultRange() },
            ]}
          />
          <Select
            allowClear
            showSearch
            placeholder="Cliente"
            style={{ width: 260 }}
            value={cliente}
            onChange={setCliente}
            optionFilterProp="label"
            options={(options?.clientes ?? []).map((c) => ({
              value: c.codigo,
              label: c.nombre === c.codigo ? c.codigo : `${c.nombre} (${c.codigo})`,
            }))}
          />
          <InputNumber
            placeholder="NT"
            controls={false}
            min={1}
            precision={0}
            style={{ width: 110 }}
            value={nt}
            onChange={(v) => setNt(v ?? null)}
          />
          <Select
            allowClear
            placeholder="Estado"
            style={{ width: 200 }}
            value={estado}
            onChange={setEstado}
            options={GASTO_ESTADOS.map((e) => ({ value: e.value, label: e.label }))}
          />
          <Input.Search
            allowClear
            placeholder="Buscar concepto, caso, cheque…"
            style={{ width: 260 }}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {(hasFilters || !range) && <Button onClick={resetFilters}>Quitar filtros</Button>}
        </Space>
      </Card>

      {!summary && loadingSummary ? (
        <Skeleton active paragraph={{ rows: 8 }} />
      ) : (
        <>
          <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
            <Col xs={24} sm={12} xl={6}>
              <Kpi
                label="Total en gastos"
                value={money(k?.monto ?? 0)}
                sub={`${nFmt.format(k?.lineas ?? 0)} líneas · ${nFmt.format(k?.nts ?? 0)} NT · ${nFmt.format(k?.clientes ?? 0)} clientes`}
                icon={<WalletOutlined />}
                accent={token.colorPrimary}
              />
            </Col>
            <Col xs={24} sm={12} xl={6}>
              <Kpi
                label="Pendiente de liquidar"
                value={money(k?.pendiente_monto ?? 0)}
                sub={`${nFmt.format(k?.pendiente_cheques ?? 0)} cheques · ${nFmt.format(k?.pendiente_lineas ?? 0)} líneas`}
                icon={<ClockCircleOutlined />}
                accent="#F59E0B"
                onClick={() => toggleEstado('pendiente_liquidar')}
                active={estado === 'pendiente_liquidar'}
              />
            </Col>
            <Col xs={24} sm={12} xl={6}>
              <Kpi
                label="Más de 30 días sin liquidar"
                value={money(k?.vencidos_monto ?? 0)}
                sub={`${nFmt.format(k?.vencidos_lineas ?? 0)} líneas por revisar`}
                icon={<ExclamationCircleOutlined />}
                accent={token.colorError}
                onClick={() => toggleEstado('pendiente_liquidar')}
                active={estado === 'pendiente_liquidar'}
              />
            </Col>
            <Col xs={24} sm={12} xl={6}>
              <Kpi
                label="Solicitado, aún sin cheque"
                value={money(k?.sin_cheque_monto ?? 0)}
                sub={`${nFmt.format(k?.sin_cheque_lineas ?? 0)} líneas por autorizar o autorizadas`}
                icon={<FileSearchOutlined />}
                accent="#06B6D4"
                onClick={() => toggleEstado('por_autorizar')}
                active={estado === 'por_autorizar'}
              />
            </Col>
          </Row>

          <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
            <Col xs={24} xl={15}>
              <Card size="small" title="Monto por mes" extra={<Text type="secondary">Clic en una barra para ver ese mes</Text>}>
                <div style={{ height: 280 }}>
                  {porMes.length ? (
                    <ResponsiveBar
                      data={porMes}
                      keys={['monto']}
                      indexBy="label"
                      margin={{ top: 12, right: 12, bottom: 32, left: 64 }}
                      padding={0.35}
                      colors={[token.colorPrimary]}
                      borderRadius={4}
                      enableLabel={false}
                      enableGridY
                      axisLeft={{ tickSize: 0, tickPadding: 8, format: (v) => qShort.format(Number(v)) }}
                      axisBottom={{ tickSize: 0, tickPadding: 8 }}
                      theme={nivoTheme}
                      onClick={(bar) => {
                        const d = (bar.data as any).mes as string;
                        const start = dayjs(`${d}-01`);
                        setRange([start, start.endOf('month')]);
                      }}
                      onMouseEnter={(_d, e) => ((e.currentTarget as SVGElement).style.cursor = 'pointer')}
                      tooltip={({ data }) =>
                        tooltipBox(
                          <>
                            <strong>{(data as any).label}</strong>
                            <div>{money((data as any).monto)}</div>
                            <div style={{ color: token.colorTextSecondary }}>
                              {nFmt.format((data as any).lineas)} líneas · {nFmt.format((data as any).nts)} NT
                            </div>
                          </>,
                        )
                      }
                      role="img"
                      ariaLabel="Monto de gastos por mes"
                    />
                  ) : (
                    <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Sin gastos en el periodo" />
                  )}
                </div>
              </Card>
            </Col>
            <Col xs={24} xl={9}>
              <Card size="small" title="Por estado" extra={<Text type="secondary">Clic para filtrar</Text>} style={{ height: '100%' }}>
                {totalEstados > 0 ? (
                  <>
                    {/* Barra segmentada 100 %, con 2 px de separación entre estados */}
                    <div style={{ display: 'flex', gap: 2, height: 14, borderRadius: 4, overflow: 'hidden', marginBottom: 16 }}>
                      {estadosOrdenados.map(({ info, data }) => (
                        <Tooltip key={info.value} title={`${info.label}: ${money(data!.monto)}`}>
                          <div
                            style={{
                              width: `${(data!.monto / totalEstados) * 100}%`,
                              minWidth: 3,
                              background: info.color,
                              cursor: 'pointer',
                              opacity: estado && estado !== info.value ? 0.35 : 1,
                            }}
                            onClick={() => toggleEstado(info.value)}
                          />
                        </Tooltip>
                      ))}
                    </div>
                    {estadosOrdenados.map(({ info, data }) => (
                      <div
                        key={info.value}
                        role="button"
                        tabIndex={0}
                        onClick={() => toggleEstado(info.value)}
                        onKeyDown={(e) => e.key === 'Enter' && toggleEstado(info.value)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 10,
                          padding: '6px 8px',
                          borderRadius: 6,
                          cursor: 'pointer',
                          background: estado === info.value ? token.colorFillSecondary : undefined,
                        }}
                      >
                        <span style={{ width: 10, height: 10, borderRadius: 3, background: info.color, flexShrink: 0 }} />
                        <Tooltip title={info.hint}>
                          <span style={{ flex: 1, color: token.colorText }}>{info.label}</span>
                        </Tooltip>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          {nFmt.format(data!.lineas)} lín.
                        </Text>
                        <span style={{ fontVariantNumeric: 'tabular-nums', minWidth: 110, textAlign: 'right', color: token.colorText }}>
                          {money(data!.monto)}
                        </span>
                      </div>
                    ))}
                  </>
                ) : (
                  <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Sin datos" />
                )}
              </Card>
            </Col>
          </Row>

          <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
            <Col xs={24} xl={12}>
              <Card size="small" title="Top 10 clientes por monto" extra={<Text type="secondary">Clic para filtrar</Text>}>
                <div style={{ height: 320 }}>
                  {topClientes.length ? (
                    <ResponsiveBar
                      data={topClientes.map((c) => ({
                        ...c,
                        corto: c.nombre.length > 26 ? `${c.nombre.slice(0, 25)}…` : c.nombre,
                      }))}
                      keys={['monto']}
                      indexBy="corto"
                      layout="horizontal"
                      margin={{ top: 4, right: 16, bottom: 28, left: 190 }}
                      padding={0.3}
                      colors={[token.colorPrimary]}
                      borderRadius={4}
                      enableLabel={false}
                      enableGridX
                      enableGridY={false}
                      axisLeft={{ tickSize: 0, tickPadding: 8 }}
                      axisBottom={{ tickSize: 0, tickPadding: 8, tickValues: 4, format: (v) => qShort.format(Number(v)) }}
                      theme={nivoTheme}
                      onClick={(bar) => setCliente((bar.data as any).codigo)}
                      onMouseEnter={(_d, e) => ((e.currentTarget as SVGElement).style.cursor = 'pointer')}
                      tooltip={({ data }) =>
                        tooltipBox(
                          <>
                            <strong>{(data as any).nombre}</strong>
                            <div>{money((data as any).monto)}</div>
                            <div style={{ color: token.colorTextSecondary }}>
                              {nFmt.format((data as any).lineas)} líneas · {nFmt.format((data as any).nts)} NT
                            </div>
                          </>,
                        )
                      }
                      role="img"
                      ariaLabel="Diez clientes con más gastos"
                    />
                  ) : (
                    <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Sin datos" />
                  )}
                </div>
              </Card>
            </Col>
            <Col xs={24} xl={12}>
              <Card
                size="small"
                title="Pendiente de liquidar por antigüedad"
                extra={<Text type="secondary">Días desde que se emitió el cheque</Text>}
                style={{ height: '100%' }}
              >
                {antiguedad.some((a) => a.lineas > 0) ? (
                  <>
                    <div style={{ height: 200 }}>
                      <ResponsiveBar
                        data={antiguedad.map((a) => ({ ...a, label: RANGOS[a.rango] }))}
                        keys={['monto']}
                        indexBy="label"
                        margin={{ top: 12, right: 12, bottom: 32, left: 64 }}
                        padding={0.35}
                        colors={({ data }) => RANGO_COLOR[(data as any).rango]}
                        borderRadius={4}
                        enableLabel={false}
                        axisLeft={{ tickSize: 0, tickPadding: 8, tickValues: 4, format: (v) => qShort.format(Number(v)) }}
                        axisBottom={{ tickSize: 0, tickPadding: 8 }}
                        theme={nivoTheme}
                        tooltip={({ data }) =>
                          tooltipBox(
                            <>
                              <strong>{(data as any).label}</strong>
                              <div>{money((data as any).monto)}</div>
                              <div style={{ color: token.colorTextSecondary }}>
                                {nFmt.format((data as any).cheques)} cheques · {nFmt.format((data as any).lineas)} líneas
                              </div>
                            </>,
                          )
                        }
                        role="img"
                        ariaLabel="Monto pendiente de liquidar por antigüedad"
                      />
                    </div>
                    {(k?.vencidos_lineas ?? 0) > 0 && (
                      <Alert
                        type="warning"
                        showIcon
                        style={{ marginTop: 8 }}
                        message={`${nFmt.format(k!.vencidos_lineas)} líneas (${money(k!.vencidos_monto)}) llevan más de 30 días sin liquidar.`}
                        action={
                          <Button size="small" onClick={() => setEstado('pendiente_liquidar')}>
                            Ver
                          </Button>
                        }
                      />
                    )}
                  </>
                ) : (
                  <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No hay cheques pendientes de liquidar" />
                )}
              </Card>
            </Col>
          </Row>

          <Card size="small" title="Top 10 NT por monto" style={{ marginBottom: 16 }}>
            <Table
              size="small"
              rowKey="nt"
              pagination={false}
              dataSource={summary?.top_nts ?? []}
              scroll={{ x: 760 }}
              columns={[
                {
                  title: 'NT',
                  dataIndex: 'nt',
                  width: 96,
                  render: (v: number) => (
                    <Button type="link" size="small" style={{ padding: 0 }} onClick={() => setNt(v)}>
                      {v}
                    </Button>
                  ),
                },
                { title: 'Cliente', dataIndex: 'cliente', width: 220, ellipsis: true },
                { title: 'Caso', dataIndex: 'caso', ellipsis: true },
                {
                  title: 'Monto',
                  dataIndex: 'monto',
                  width: 130,
                  align: 'right',
                  render: (v: number) => <span style={{ fontVariantNumeric: 'tabular-nums' }}>{money(v)}</span>,
                },
                {
                  title: 'Sin liquidar',
                  dataIndex: 'pendiente',
                  width: 130,
                  align: 'right',
                  render: (v: number) =>
                    v > 0 ? (
                      <Text type="warning" style={{ fontVariantNumeric: 'tabular-nums' }}>
                        {money(v)}
                      </Text>
                    ) : (
                      <Text type="secondary">—</Text>
                    ),
                },
              ]}
            />
          </Card>
        </>
      )}

      <Card
        size="small"
        title={
          <Space>
            Detalle de gastos
            <Text type="secondary" style={{ fontWeight: 400 }}>
              {nFmt.format(lines.total)} líneas
            </Text>
          </Space>
        }
      >
        <Table
          size="small"
          rowKey="id"
          loading={loadingLines}
          dataSource={lines.items}
          columns={columns}
          scroll={{ x: 1280 }}
          locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Ningún gasto coincide con los filtros" /> }}
          pagination={{
            current: page,
            pageSize,
            total: lines.total,
            showSizeChanger: true,
            pageSizeOptions: [25, 50, 100],
            showTotal: (t, [a, b]) => `${a}–${b} de ${nFmt.format(t)}`,
            onChange: (p, ps) => {
              setPage(ps !== pageSize ? 1 : p);
              setPageSize(ps);
            },
          }}
        />
      </Card>
    </div>
  );
}

export default GastosMigracion;
