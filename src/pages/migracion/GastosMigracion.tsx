import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  Alert,
  Button,
  Card,
  Col,
  DatePicker,
  Dropdown,
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
  AlertOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  DollarOutlined,
  DownloadOutlined,
  EditOutlined,
  ExclamationCircleOutlined,
  FileSearchOutlined,
  InfoCircleOutlined,
  ReloadOutlined,
  SendOutlined,
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
  getGastosAccess,
  getGastosAvisos,
  getGastosFilterOptions,
  getGastosLines,
  getGastosSummary,
  getSeguimientoOpciones,
  setNtFacturacion,
  type GastoArea,
  type GastoAviso,
  type GastosAvisos,
  type NtFacturacion,
  type SeguimientoOpciones,
  type GastoEstado,
  type GastoLinea,
  type GastosFilterOptions,
  type GastosFilters,
  type GastosSummary,
} from '../../api/migracionGastos';
import SeguimientoModal, { type SeguimientoMode } from './SeguimientoModal';

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

type Nivel = 'alta' | 'media' | 'info';
const AVISOS: Record<GastoAviso, { titulo: string; nivel: Nivel; detalle: (a: { lineas: number; cheques: number; nts: number }) => string }> = {
  uso_sin_cheque: {
    titulo: 'Dinero para hoy o mañana sin cheque',
    nivel: 'alta',
    detalle: (a) => `${a.lineas} líneas con fecha de uso cercana y todavía sin cheque`,
  },
  sin_liquidar_30: {
    titulo: 'Más de 30 días sin liquidar',
    nivel: 'alta',
    detalle: (a) => `${a.cheques} cheques emitidos hace más de 30 días que siguen pendientes`,
  },
  sin_entregar: {
    titulo: 'Cheques emitidos sin registrar entrega',
    nivel: 'media',
    detalle: (a) => `${a.cheques} cheques con más de 3 días: ¿a quién se entregaron?`,
  },
  facturado_sin_cobrar: {
    titulo: 'Facturado hace más de 60 días sin cobrar',
    nivel: 'media',
    detalle: (a) => `${a.nts} NT por dar seguimiento al cobro`,
  },
  listo_facturar: {
    titulo: 'Listas para facturar',
    nivel: 'info',
    detalle: (a) => `${a.nts} NT sin nada pendiente en Sirvo y sin marcar como facturadas`,
  },
  nt_sin_catalogo: {
    titulo: 'NT sin registrar en Notas de gastos',
    nivel: 'info',
    detalle: (a) => `${a.nts} NT clasificadas por palabras del caso; registrarlas afina el área`,
  },
};
const NIVEL_ICON: Record<Nivel, ReactNode> = {
  alta: <AlertOutlined />,
  media: <ExclamationCircleOutlined />,
  info: <InfoCircleOutlined />,
};

const FACT_TAG: Record<NtFacturacion, { color: string; label: string }> = {
  FACTURADO: { color: 'geekblue', label: 'Facturada' },
  COBRADO: { color: 'green', label: 'Cobrada' },
};

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
  const [entrega, setEntrega] = useState<GastosFilters['entrega']>();
  const [facturacion, setFacturacion] = useState<GastosFilters['facturacion']>();
  const [aviso, setAviso] = useState<GastoAviso | undefined>();
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
  const [canEdit, setCanEdit] = useState(false);
  const [avisos, setAvisos] = useState<GastosAvisos | null>(null);
  const [opciones, setOpciones] = useState<SeguimientoOpciones | null>(null);
  const [selected, setSelected] = useState<GastoLinea[]>([]);
  const [modal, setModal] = useState<{ mode: SeguimientoMode; lines: GastoLinea[] } | null>(null);

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
      entrega,
      facturacion,
      aviso,
    }),
    [range, cliente, nt, area, estado, q, entrega, facturacion, aviso],
  );

  useEffect(() => setPage(1), [filters]);

  const handleError = useCallback((err: any, fallback: string) => {
    if (err?.response?.status === 403) setForbidden(true);
    else message.error(err?.response?.data?.message || fallback);
  }, []);

  const loadOpciones = useCallback(() => {
    getSeguimientoOpciones()
      .then(({ data }) => setOpciones(data))
      .catch(() => setOpciones(null));
  }, []);

  useEffect(() => {
    getGastosFilterOptions()
      .then(({ data }) => setOptions(data))
      .catch((e) => handleError(e, 'No se pudieron cargar los clientes'));
    getGastosAccess()
      .then(({ data }) => setCanEdit(data.canEdit))
      .catch(() => setCanEdit(false));
    loadOpciones();
  }, [handleError, loadOpciones]);

  // Los avisos solo dependen del área y el cliente (no de las fechas)
  const loadAvisos = useCallback(() => {
    getGastosAvisos({ area: area === 'TODAS' ? undefined : area, cliente })
      .then(({ data }) => setAvisos(data))
      .catch(() => setAvisos(null));
  }, [area, cliente]);
  useEffect(loadAvisos, [loadAvisos]);

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
  useEffect(() => setSelected([]), [filters, page, pageSize]);

  const reloadAll = () => {
    loadSummary();
    loadLines();
    loadAvisos();
  };

  const hasFilters = !!(cliente || nt || estado || q || entrega || facturacion || aviso || area !== 'MIGRACION');
  const resetFilters = () => {
    setRange(defaultRange());
    setCliente(undefined);
    setNt(null);
    setArea('MIGRACION');
    setEstado(undefined);
    setEntrega(undefined);
    setFacturacion(undefined);
    setAviso(undefined);
    setSearch('');
  };

  // Un aviso no mira fechas: al verlo se quitan para que la tabla cuadre
  const verAviso = (a: GastoAviso) => {
    if (aviso === a) {
      setAviso(undefined);
      return;
    }
    setAviso(a);
    setRange(null);
    setEstado(undefined);
    setEntrega(undefined);
    setFacturacion(undefined);
  };

  const marcarNt = async (nts: number[], estadoFact: NtFacturacion | null) => {
    try {
      await Promise.all(nts.map((n) => setNtFacturacion(n, estadoFact)));
      const txt = estadoFact === null ? 'sin marca' : estadoFact === 'COBRADO' ? 'cobrada' : 'facturada';
      message.success(nts.length === 1 ? `NT ${nts[0]} ${txt}` : `${nts.length} NT ${txt}s`);
      reloadAll();
    } catch (e: any) {
      message.error(e?.response?.data?.message || 'No se pudo marcar la NT');
    }
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
        { header: 'FECHA DE USO', key: 'fecha_uso', width: 14 },
        { header: 'SOLICITADO POR', key: 'solicitado_por', width: 24 },
        { header: 'A NOMBRE DE', key: 'beneficiario', width: 24 },
        { header: 'ENTREGADO', key: 'entregado_at', width: 14 },
        { header: 'FACTURACIÓN NT', key: 'facturacion', width: 16 },
        { header: 'NOTAS', key: 'notas', width: 30 },
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
          fecha_uso: l.fecha_uso ?? '',
          solicitado_por: l.solicitado_por ?? '',
          beneficiario: l.beneficiario ?? '',
          entregado_at: l.entregado_at ?? '',
          facturacion: l.facturacion ? FACT_TAG[l.facturacion].label : '',
          notas: l.notas ?? '',
        }),
      );
      ws.views = [{ state: 'frozen', ySplit: 1 }];
      ws.autoFilter = { from: 'A1', to: 'S1' };
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
      width: 120,
      render: (v: number, r) => (
        <Space size={4} direction="vertical" style={{ rowGap: 0 }}>
          <Dropdown
            trigger={['click']}
            menu={{
              items: [
                { key: 'ver', label: 'Ver solo esta NT' },
                ...(canEdit
                  ? [
                      { type: 'divider' as const },
                      { key: 'FACTURADO', label: 'Marcar facturada', disabled: r.facturacion === 'FACTURADO' },
                      { key: 'COBRADO', label: 'Marcar cobrada', disabled: r.facturacion === 'COBRADO' },
                      ...(r.facturacion ? [{ key: 'quitar', label: 'Quitar marca', danger: true }] : []),
                    ]
                  : []),
              ],
              onClick: ({ key }) => {
                if (key === 'ver') setNt(v);
                else marcarNt([v], key === 'quitar' ? null : (key as NtFacturacion));
              },
            }}
          >
            <Button type="link" size="small" style={{ padding: 0 }}>
              {v}
            </Button>
          </Dropdown>
          {r.facturacion && (
            <Tooltip
              title={
                r.facturacion === 'COBRADO'
                  ? `Cobrada el ${dayjs(r.cobrado_at).format('DD/MM/YYYY')}`
                  : `Facturada el ${dayjs(r.facturado_at).format('DD/MM/YYYY')}`
              }
            >
              <Tag color={FACT_TAG[r.facturacion].color} style={{ marginInlineEnd: 0, fontSize: 11 }}>
                {FACT_TAG[r.facturacion].label}
              </Tag>
            </Tooltip>
          )}
        </Space>
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
    {
      title: 'Seguimiento',
      key: 'seguimiento',
      width: 210,
      render: (_: unknown, r) => {
        const emitido = r.cheque != null;
        return (
          <div style={{ fontSize: 12, lineHeight: 1.5 }}>
            {r.beneficiario ? (
              <div>
                <SendOutlined style={{ marginRight: 4, color: token.colorTextTertiary }} />
                {r.beneficiario}
              </div>
            ) : null}
            {r.entregado_at ? (
              <Text type="success" style={{ fontSize: 12 }}>
                <CheckCircleOutlined style={{ marginRight: 4 }} />
                Entregado {dayjs(r.entregado_at).format('DD/MM')}
              </Text>
            ) : emitido && r.estado === 'pendiente_liquidar' ? (
              <Text type="warning" style={{ fontSize: 12 }}>
                Sin registrar entrega
              </Text>
            ) : null}
            {r.fecha_uso && (
              <div>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  Uso {dayjs(r.fecha_uso).format('DD/MM/YYYY')}
                </Text>
              </div>
            )}
            {r.solicitado_por && (
              <div>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  Pidió {r.solicitado_por}
                </Text>
              </div>
            )}
            {r.notas && (
              <Tooltip title={r.notas}>
                <Text type="secondary" style={{ fontSize: 12 }} ellipsis>
                  Nota: {r.notas}
                </Text>
              </Tooltip>
            )}
            {canEdit && (
              <Button
                type="link"
                size="small"
                icon={<EditOutlined />}
                style={{ padding: 0, height: 'auto', fontSize: 12 }}
                onClick={() => setModal({ mode: 'completo', lines: [r] })}
              >
                Editar
              </Button>
            )}
          </div>
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
          <Button icon={<ReloadOutlined />} onClick={reloadAll}>
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
          <Select
            allowClear
            placeholder="Entrega"
            style={{ width: 150 }}
            value={entrega}
            onChange={setEntrega}
            options={[
              { value: 'entregado', label: 'Entregados' },
              { value: 'sin_entregar', label: 'Sin entregar' },
            ]}
          />
          <Select
            allowClear
            placeholder="Facturación NT"
            style={{ width: 170 }}
            value={facturacion}
            onChange={setFacturacion}
            options={[
              { value: 'sin_facturar', label: 'Sin facturar' },
              { value: 'facturado', label: 'Facturadas' },
              { value: 'cobrado', label: 'Cobradas' },
            ]}
          />
          {aviso && (
            <Tag closable color="orange" onClose={() => setAviso(undefined)} style={{ padding: '4px 8px' }}>
              Aviso: {AVISOS[aviso].titulo}
            </Tag>
          )}
          {(hasFilters || !range) && <Button onClick={resetFilters}>Quitar filtros</Button>}
        </Space>
      </Card>

      {/* Avisos: solo en pantalla. Cada uno filtra la tabla con "Ver". */}
      {avisos && avisos.avisos.some((a) => a.lineas > 0) && (
        <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
          {avisos.avisos
            .filter((a) => a.lineas > 0)
            .sort((a, b) => ['alta', 'media', 'info'].indexOf(AVISOS[a.aviso].nivel) - ['alta', 'media', 'info'].indexOf(AVISOS[b.aviso].nivel))
            .map((a) => {
              const cfg = AVISOS[a.aviso];
              const color =
                cfg.nivel === 'alta' ? token.colorError : cfg.nivel === 'media' ? token.colorWarning : token.colorInfo;
              const activo = aviso === a.aviso;
              return (
                <Col key={a.aviso} xs={24} md={12} xl={8}>
                  <Card
                    size="small"
                    style={{ height: '100%', borderLeft: `3px solid ${color}`, background: activo ? token.colorFillTertiary : undefined }}
                    styles={{ body: { padding: 12 } }}
                  >
                    <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                      <span style={{ color, fontSize: 18, lineHeight: 1 }}>{NIVEL_ICON[cfg.nivel]}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 600, color: token.colorText }}>{cfg.titulo}</div>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          {cfg.detalle(a)} · {money(a.monto)}
                        </Text>
                        {a.aviso === 'sin_liquidar_30' && avisos.sin_liquidar_por_beneficiario.length > 0 && (
                          <div style={{ marginTop: 6, fontSize: 12 }}>
                            {avisos.sin_liquidar_por_beneficiario.map((b) => (
                              <div key={b.beneficiario} style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                                <Text type="secondary" style={{ fontSize: 12 }} ellipsis>
                                  {b.beneficiario === 'SIN REGISTRAR' ? 'Sin registrar a quién' : b.beneficiario}
                                </Text>
                                <span style={{ fontVariantNumeric: 'tabular-nums', color: token.colorText }}>
                                  {money(b.monto)}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                      <Button size="small" type={activo ? 'primary' : 'default'} onClick={() => verAviso(a.aviso)}>
                        {activo ? 'Quitar' : 'Ver'}
                      </Button>
                    </div>
                  </Card>
                </Col>
              );
            })}
        </Row>
      )}

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
                onClick={() => verAviso('sin_liquidar_30')}
                active={aviso === 'sin_liquidar_30'}
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
        extra={
          canEdit && selected.length > 0 ? (
            <Space wrap>
              <Text type="secondary">
                {selected.length} {selected.length === 1 ? 'seleccionada' : 'seleccionadas'}
              </Text>
              <Button size="small" type="primary" icon={<SendOutlined />} onClick={() => setModal({ mode: 'entrega', lines: selected })}>
                Registrar entrega
              </Button>
              <Button size="small" icon={<EditOutlined />} onClick={() => setModal({ mode: 'completo', lines: selected })}>
                Seguimiento
              </Button>
              <Dropdown
                trigger={['click']}
                menu={{
                  items: [
                    { key: 'FACTURADO', label: 'Marcar NT facturadas' },
                    { key: 'COBRADO', label: 'Marcar NT cobradas' },
                    { type: 'divider' },
                    { key: 'quitar', label: 'Quitar marca de las NT', danger: true },
                  ],
                  onClick: ({ key }) =>
                    marcarNt(
                      [...new Set(selected.map((l) => l.nt))],
                      key === 'quitar' ? null : (key as NtFacturacion),
                    ),
                }}
              >
                <Button size="small" icon={<DollarOutlined />}>
                  Facturación ({new Set(selected.map((l) => l.nt)).size} NT)
                </Button>
              </Dropdown>
              <Button size="small" type="text" onClick={() => setSelected([])}>
                Limpiar
              </Button>
            </Space>
          ) : canEdit ? (
            <Text type="secondary" style={{ fontSize: 12 }}>
              Selecciona líneas para registrar entrega, seguimiento o facturación
            </Text>
          ) : null
        }
      >
        <Table
          size="small"
          rowKey="id"
          loading={loadingLines}
          rowSelection={
            canEdit
              ? {
                  selectedRowKeys: selected.map((l) => l.id),
                  onChange: (_keys, rows) => setSelected(rows),
                  columnWidth: 36,
                }
              : undefined
          }
          dataSource={lines.items}
          columns={columns}
          scroll={{ x: 1500 }}
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

      <SeguimientoModal
        open={!!modal}
        mode={modal?.mode ?? 'completo'}
        lines={modal?.lines ?? []}
        opciones={opciones}
        onClose={() => setModal(null)}
        onSaved={() => {
          setModal(null);
          setSelected([]);
          reloadAll();
        }}
        onOpcionesChanged={loadOpciones}
      />
    </div>
  );
}

export default GastosMigracion;
