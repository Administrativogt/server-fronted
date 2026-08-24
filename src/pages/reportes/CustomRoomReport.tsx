// src/pages/reportes/CustomRoomReport.tsx
// Pestaña "Reporte personalizado" del reporte exclusivo de salas:
// rango de fechas + equipos/áreas/salas/personas/estados + agrupación a elegir.
import { useCallback, useEffect, useMemo, useState, type JSX } from 'react';
import {
  Button, Card, Col, DatePicker, Row, Segmented, Select, Space, Statistic, Table,
  Tooltip, Typography, message, type TableProps,
} from 'antd';
import { DownloadOutlined, SearchOutlined } from '@ant-design/icons';
import dayjs, { Dayjs } from 'dayjs';
import { saveAs } from 'file-saver';
import type { AxiosError } from 'axios';
import {
  getCustomReportOptions, getCustomReport, downloadCustomReportExcel,
  type CustomReport, type CustomReportOptions, type CustomReportRow, type EstadoKey, type GroupKey,
} from '../../api/roomReservationReports';

const { Text } = Typography;
const { RangePicker } = DatePicker;

const fmt2 = (n: number) => Number(n ?? 0).toFixed(2);
const money = (n: number) => `$${fmt2(n)}`;
const fmtTime = (t?: string) => (t ? String(t).slice(0, 5) : '');

type ResumenRow = CustomReport['resumen'][number] & { porMes?: Record<string, number> };

export default function CustomRoomReport({ primary }: { primary: string }): JSX.Element {
  const [options, setOptions] = useState<CustomReportOptions | null>(null);
  const [pickerMode, setPickerMode] = useState<'month' | 'date'>('month');
  const [range, setRange] = useState<[Dayjs, Dayjs]>(() => [
    dayjs().startOf('year'), dayjs().startOf('month'),
  ]);
  const [equipos, setEquipos] = useState<number[]>([]);
  const [areas, setAreas] = useState<number[]>([]);
  const [salas, setSalas] = useState<number[]>([]);
  const [usuarios, setUsuarios] = useState<number[]>([]);
  const [estados, setEstados] = useState<EstadoKey[]>(['pending', 'accepted']);
  const [groupBy, setGroupBy] = useState<GroupKey>('equipo');
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [report, setReport] = useState<CustomReport | null>(null);

  useEffect(() => {
    getCustomReportOptions().then(setOptions).catch(() => {
      message.error('No fue posible cargar los catálogos de filtros.');
    });
  }, []);

  const filter = useCallback(() => {
    const [a, b] = range;
    const from = (pickerMode === 'month' ? a.startOf('month') : a).format('YYYY-MM-DD');
    const to = (pickerMode === 'month' ? b.endOf('month') : b).format('YYYY-MM-DD');
    return { from, to, equipos, areas, salas, usuarios, estados, groupBy };
  }, [range, pickerMode, equipos, areas, salas, usuarios, estados, groupBy]);

  const consultar = useCallback(async () => {
    setLoading(true);
    try {
      setReport(await getCustomReport(filter()));
    } catch (e: unknown) {
      const err = e as AxiosError<{ message?: string }>;
      message.error(err.response?.data?.message || 'No fue posible generar el reporte.');
    } finally {
      setLoading(false);
    }
  }, [filter]);

  const descargar = useCallback(async () => {
    setDownloading(true);
    try {
      const { blob, filename } = await downloadCustomReportExcel(filter());
      saveAs(blob, filename);
    } catch (e: unknown) {
      const err = e as AxiosError<{ message?: string }>;
      message.error(err.response?.data?.message || 'No fue posible generar el Excel.');
    } finally {
      setDownloading(false);
    }
  }, [filter]);

  const groupLabel = useMemo(
    () => options?.agrupaciones.find(a => a.id === (report?.filtros.groupBy ?? groupBy))?.nombre ?? 'Grupo',
    [options, report, groupBy],
  );

  const resumenRows: ResumenRow[] = useMemo(() => {
    if (!report) return [];
    return report.resumen.map(r => {
      const pm = report.porMes.find(p => p.clave === r.clave);
      const porMes: Record<string, number> = {};
      for (const m of report.meses) porMes[m] = pm?.meses[m]?.horas ?? 0;
      return { ...r, porMes };
    });
  }, [report]);

  const resumenColumns: TableProps<ResumenRow>['columns'] = useMemo(() => {
    const cols: NonNullable<TableProps<ResumenRow>['columns']> = [
      { title: groupLabel, dataIndex: 'clave', key: 'clave', width: 240, ellipsis: true, fixed: 'left',
        sorter: (a, b) => a.clave.localeCompare(b.clave) },
      { title: 'Reservas', dataIndex: 'reservas', key: 'reservas', width: 100, align: 'right',
        sorter: (a, b) => a.reservas - b.reservas },
      { title: 'Horas', dataIndex: 'horas', key: 'horas', width: 100, align: 'right',
        sorter: (a, b) => a.horas - b.horas, render: (v: number) => fmt2(v) },
      { title: 'Valor (USD)', dataIndex: 'valor', key: 'valor', width: 120, align: 'right',
        defaultSortOrder: 'descend', sorter: (a, b) => a.valor - b.valor, render: (v: number) => money(v) },
    ];
    if (report && report.meses.length > 1) {
      for (const m of report.meses) {
        cols.push({
          title: `Horas ${dayjs(`${m}-01`).format('MMM YY')}`, key: `m-${m}`, width: 110, align: 'right',
          render: (_: unknown, row: ResumenRow) => fmt2(row.porMes?.[m] ?? 0),
        });
      }
    }
    return cols;
  }, [groupLabel, report]);

  const detalleColumns: TableProps<CustomReportRow>['columns'] = useMemo(() => [
    { title: 'Fecha', dataIndex: 'fecha', key: 'fecha', width: 100, fixed: 'left',
      sorter: (a, b) => a.fecha.localeCompare(b.fecha),
      render: (v: string) => dayjs(v).format('DD/MM/YY') },
    { title: 'Estado', dataIndex: 'estado', key: 'estado', width: 100 },
    { title: 'Sala', dataIndex: 'sala', key: 'sala', width: 160, ellipsis: true },
    { title: 'Persona', dataIndex: 'usuario', key: 'usuario', width: 220, ellipsis: true },
    { title: 'Equipo', dataIndex: 'equipo', key: 'equipo', width: 130, ellipsis: true },
    { title: 'Área', dataIndex: 'area', key: 'area', width: 160, ellipsis: true },
    { title: 'Inicio', dataIndex: 'hora_inicio', key: 'hi', width: 80, render: fmtTime },
    { title: 'Fin', dataIndex: 'hora_fin', key: 'hf', width: 80, render: fmtTime },
    { title: 'Horas', dataIndex: 'horas', key: 'horas', width: 90, align: 'right',
      sorter: (a, b) => a.horas - b.horas, render: (v: number) => fmt2(v) },
    { title: 'Tarifa', dataIndex: 'tarifa', key: 'tarifa', width: 90, align: 'right', render: (v: number) => money(v) },
    { title: 'Valor (USD)', dataIndex: 'valor', key: 'valor', width: 110, align: 'right',
      sorter: (a, b) => a.valor - b.valor, render: (v: number) => money(v) },
    { title: 'Reservó', dataIndex: 'reservo', key: 'reservo', width: 200, ellipsis: true },
    { title: 'Motivo', dataIndex: 'motivo', key: 'motivo', width: 260, ellipsis: true },
  ], []);

  const selOpts = (arr?: { id: number | string; nombre: string }[]) =>
    (arr ?? []).map(o => ({ value: o.id, label: o.nombre }));

  return (
    <Space direction="vertical" size={12} style={{ width: '100%' }}>
      <Card size="small" title="Filtros">
        <Space direction="vertical" size={10} style={{ width: '100%' }}>
          <Space wrap>
            <Segmented
              value={pickerMode}
              onChange={(v) => setPickerMode(v as 'month' | 'date')}
              options={[{ label: 'Por meses', value: 'month' }, { label: 'Por días', value: 'date' }]}
            />
            <RangePicker
              picker={pickerMode}
              allowClear={false}
              value={range}
              onChange={(v) => v && v[0] && v[1] && setRange([v[0], v[1]])}
              format={pickerMode === 'month' ? 'MMM YYYY' : 'DD/MM/YYYY'}
            />
            <span>Agrupar por:</span>
            <Select<GroupKey> value={groupBy} onChange={setGroupBy} style={{ width: 150 }}
              options={selOpts(options?.agrupaciones) as { value: GroupKey; label: string }[]} />
          </Space>
          <Row gutter={[8, 8]}>
            <Col xs={24} md={12} lg={8}>
              <Select mode="multiple" allowClear showSearch optionFilterProp="label" style={{ width: '100%' }}
                placeholder="Equipos (todos)" value={equipos} onChange={setEquipos}
                options={selOpts(options?.equipos)} maxTagCount="responsive" />
            </Col>
            <Col xs={24} md={12} lg={8}>
              <Select mode="multiple" allowClear showSearch optionFilterProp="label" style={{ width: '100%' }}
                placeholder="Áreas (todas)" value={areas} onChange={setAreas}
                options={selOpts(options?.areas)} maxTagCount="responsive" />
            </Col>
            <Col xs={24} md={12} lg={8}>
              <Select mode="multiple" allowClear showSearch optionFilterProp="label" style={{ width: '100%' }}
                placeholder="Salas (todas)" value={salas} onChange={setSalas}
                options={(options?.salas ?? []).map(s => ({
                  value: s.id,
                  label: `${s.nombre}${s.tarifa != null ? ` · $${fmt2(s.tarifa)}/h` : ''}${s.activa ? '' : ' (inactiva)'}`,
                }))}
                maxTagCount="responsive" />
            </Col>
            <Col xs={24} md={12} lg={8}>
              <Select mode="multiple" allowClear showSearch optionFilterProp="label" style={{ width: '100%' }}
                placeholder="Personas (todas)" value={usuarios} onChange={setUsuarios}
                options={selOpts(options?.usuarios)} maxTagCount="responsive" />
            </Col>
            <Col xs={24} md={12} lg={8}>
              <Select<EstadoKey[]> mode="multiple" style={{ width: '100%' }}
                placeholder="Estados" value={estados} onChange={setEstados}
                options={selOpts(options?.estados) as { value: EstadoKey; label: string }[]}
                maxTagCount="responsive" />
            </Col>
            <Col xs={24} md={12} lg={8}>
              <Space>
                <Button type="primary" icon={<SearchOutlined />} loading={loading} onClick={consultar}>
                  Consultar
                </Button>
                <Tooltip title="Excel con hoja RESUMEN (filtros aplicados + tabla por grupo y por mes) y hoja DETALLE">
                  <Button icon={<DownloadOutlined />} loading={downloading} onClick={descargar}>
                    Descargar Excel
                  </Button>
                </Tooltip>
              </Space>
            </Col>
          </Row>
          <Text type="secondary" style={{ fontSize: 12 }}>
            Sin estados seleccionados se toman pendientes + aceptadas. "Cancelada / Eliminada" agrupa las
            canceladas y las borradas por el usuario o recepción.
          </Text>
        </Space>
      </Card>

      {report && (
        <>
          <Row gutter={[12, 12]}>
            <Col xs={24} md={8}>
              <Card size="small"><Statistic title="Reservas" value={report.totales.reservas} valueStyle={{ color: primary }} /></Card>
            </Col>
            <Col xs={24} md={8}>
              <Card size="small"><Statistic title="Horas" value={report.totales.horas} precision={2} valueStyle={{ color: primary }} /></Card>
            </Col>
            <Col xs={24} md={8}>
              <Card size="small"><Statistic title="Valor (USD)" value={report.totales.valor} precision={2} prefix="$" valueStyle={{ color: primary }} /></Card>
            </Col>
          </Row>

          <Card size="small" title={`Resumen por ${groupLabel.toLowerCase()} · ${report.filtros.from} a ${report.filtros.to}`}>
            <Table<ResumenRow>
              rowKey="clave"
              size="small"
              columns={resumenColumns}
              dataSource={resumenRows}
              pagination={false}
              scroll={{ x: 'max-content' }}
              rowClassName={(_, idx) => ((idx ?? 0) % 2 === 0 ? 'row-zebra-even' : 'row-zebra-odd')}
              summary={() => (
                <Table.Summary fixed>
                  <Table.Summary.Row style={{ fontWeight: 600 }}>
                    <Table.Summary.Cell index={0}>Total general</Table.Summary.Cell>
                    <Table.Summary.Cell index={1} align="right">{report.totales.reservas}</Table.Summary.Cell>
                    <Table.Summary.Cell index={2} align="right">{fmt2(report.totales.horas)}</Table.Summary.Cell>
                    <Table.Summary.Cell index={3} align="right">{money(report.totales.valor)}</Table.Summary.Cell>
                    {report.meses.length > 1 && report.meses.map((m, i) => (
                      <Table.Summary.Cell key={m} index={4 + i} align="right">
                        {fmt2(resumenRows.reduce((s, r) => s + (r.porMes?.[m] ?? 0), 0))}
                      </Table.Summary.Cell>
                    ))}
                  </Table.Summary.Row>
                </Table.Summary>
              )}
            />
          </Card>

          <Card size="small" title="Detalle de reservas">
            <Table<CustomReportRow>
              rowKey="id"
              size="small"
              columns={detalleColumns}
              dataSource={report.rows}
              loading={loading}
              scroll={{ x: 'max-content', y: 480 }}
              rowClassName={(_, idx) => ((idx ?? 0) % 2 === 0 ? 'row-zebra-even' : 'row-zebra-odd')}
              pagination={{ defaultPageSize: 20, pageSizeOptions: [20, 50, 100, 500], showSizeChanger: true,
                showTotal: (t) => `${t} reservas` }}
            />
          </Card>
        </>
      )}
    </Space>
  );
}
