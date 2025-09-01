// src/pages/reportes/ExclusiveMonthlyReport.tsx
import React, { useEffect, useMemo, useState, useCallback, type JSX } from 'react';
import {
  DatePicker, Select, Space, Button, Typography, Tooltip, message, Result, Spin,
  Row, Col, Card, Statistic, Table, type TableProps, Divider
} from 'antd';
import { DownloadOutlined, ReloadOutlined } from '@ant-design/icons';
import { DataGrid, type GridColDef } from '@mui/x-data-grid';
import { esES } from '@mui/x-data-grid/locales';
import dayjs, { Dayjs } from 'dayjs';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import api from '../../api/axios';
// ⚠️ Verifica el nombre del archivo del logo:
import reportLogo from '../../assets/logo-cosortium.png';

const { Title } = Typography;

type StateFilter = 'all' | 'pending' | 'accepted' | 'rejected';
type StateOption = { value: StateFilter; label: string };

type ExplodedRow = {
  reservation_id: number;
  state: 0 | 1 | 2;         // no se muestra
  estado: string;           // no se muestra
  fecha: string;            // YYYY-MM-DD
  sala: string;
  hora_inicio: string;      // HH:mm:ss
  hora_fin: string;         // HH:mm:ss
  equipo: string | null;
  area: string | null;
  persona: string;
  horas_persona: number;
  pago_persona_usd: number;
  compartido: boolean;
  compartio_con: { nombre: string; area: string | null; equipo: string | null }[];
};

type RowWithPct = ExplodedRow & { participacion_pct: number };

type EquipoAgg = { equipo: string; horas: number; usd: number; pct: number };

const stateOptions: StateOption[] = [
  { value: 'all', label: 'Todos' },
  { value: 'pending', label: 'Pendientes' },
  { value: 'accepted', label: 'Aceptadas' },
  { value: 'rejected', label: 'Rechazadas' },
];

const fmtNum = (n: number) => Number((n ?? 0).toFixed(2));
const pctTxt = (n: number) => `${fmtNum(n).toFixed(2)}%`;
const money = (n: number) => `$${fmtNum(n).toFixed(2)}`;
const fmtTime = (t?: string) => (t ? String(t).slice(0, 5) : '');

// 🎨 Colores UI (consistentes con el Excel)
const UI = {
  primary: '#003B5C',
  primarySoft: '#0F5C87',
  headerBg: '#F0F5FF',
  zebraA: '#FAFDFF',
  zebraB: '#F5FAFF',
  hover: '#E6F7FF',
  kpiBg: '#F7FAFC',
  textOnPrimary: '#FFFFFF',
  border: '#CAD0D4',
};

const EXCEL = {
  titleBg: 'FF003B5C',
  titleFont: 'FFFFFFFF',
  headerBg: 'FFECECEC',
  zebraA: 'FFF8FBFF',
  zebraB: 'FFF2F6FA',
  subtotalAreaBg: 'FFFFF3CD',
  subtotalEquipoBg: 'FFFDEBD0',
  totalGeneralBg: 'FFD4EDDA',
  border: 'FFCAD0D4',
  lineStrong: 'FF7E8B93',
};

export default function ExclusiveMonthlyReport(): JSX.Element {
  const [canSee, setCanSee] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);
  const [reportMonth, setReportMonth] = useState<Dayjs>(() => dayjs().startOf('month'));
  const [stateFilter, setStateFilter] = useState<StateFilter>('all');
  const [rows, setRows] = useState<RowWithPct[]>([]);
  const [downloading, setDownloading] = useState(false);

  // ---- Access check
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { data } = await api.get<{ canSeeReport: boolean }>('/room-reservations/report/can');
        if (mounted) setCanSee(!!data?.canSeeReport);
      } catch {
        setCanSee(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  // ---- Load data
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const year = reportMonth.year();
      const mm = String(reportMonth.month() + 1).padStart(2, '0');
      const { data } = await api.get<ExplodedRow[]>(
        `/room-reservations/report/month/${year}/${mm}`,
        { params: { state: stateFilter, explode: 1 } }
      );

      const normalized: ExplodedRow[] = (data ?? []).map(r => ({
        ...r,
        horas_persona: fmtNum(Number(r.horas_persona ?? 0)),
        pago_persona_usd: fmtNum(Number(r.pago_persona_usd ?? 0)),
        equipo: r.equipo ?? '(Sin equipo)',
        area: r.area ?? '(Sin área)',
      }));

      // % por reserva (en base al USD asignado a cada persona)
      const totalByReservation = new Map<number, number>();
      for (const r of normalized) {
        totalByReservation.set(
          r.reservation_id,
          fmtNum((totalByReservation.get(r.reservation_id) || 0) + r.pago_persona_usd)
        );
      }
      const withPct: RowWithPct[] = normalized.map(r => {
        const total = totalByReservation.get(r.reservation_id) || 0;
        const participacion_pct = total > 0 ? (r.pago_persona_usd / total) * 100 : 0;
        return { ...r, participacion_pct: fmtNum(participacion_pct) };
      });

      setRows(withPct);
    } catch (e: any) {
      message.error(e?.response?.data?.message || 'No fue posible cargar el reporte.');
    } finally {
      setLoading(false);
    }
  }, [reportMonth, stateFilter]);

  useEffect(() => { if (canSee) loadData(); }, [canSee, loadData]);

  // ---- KPIs + agregados
  const totalUSD   = useMemo(() => fmtNum(rows.reduce((s, r) => s + (r.pago_persona_usd || 0), 0)), [rows]);
  const totalHoras = useMemo(() => fmtNum(rows.reduce((s, r) => s + (r.horas_persona || 0), 0)), [rows]);
  const reservasUnicas = useMemo(() => new Set(rows.map(r => r.reservation_id)).size, [rows]);
  const equiposUnicos  = useMemo(() => new Set(rows.map(r => r.equipo || '(Sin equipo)')).size, [rows]);

  const equipoAgg = useMemo(() => {
    const map = new Map<string, { horas: number; usd: number }>();
    for (const r of rows) {
      const k = r.equipo || '(Sin equipo)';
      const prev = map.get(k) || { horas: 0, usd: 0 };
      prev.horas += r.horas_persona || 0;
      prev.usd += r.pago_persona_usd || 0;
      map.set(k, prev);
    }
    const arr: EquipoAgg[] = Array.from(map.entries()).map(([equipo, v]) => ({
      equipo,
      horas: fmtNum(v.horas),
      usd: fmtNum(v.usd),
      pct: totalUSD > 0 ? fmtNum((v.usd / totalUSD) * 100) : 0,
    }));
    arr.sort((a, b) => b.usd - a.usd || a.equipo.localeCompare(b.equipo));
    return arr;
  }, [rows, totalUSD]);

  // ---- DataGrid columns (sin “Estado”, “Compartió con” solo nombres)
  const columns: GridColDef<RowWithPct>[] = useMemo(() => [
    { field: 'fecha', headerName: 'Fecha', width: 100,
      valueFormatter: (value) => (value ? dayjs(String(value)).format('DD/MM') : ''),
    },
    { field: 'sala', headerName: 'Sala', width: 160 },
    { field: 'equipo', headerName: 'Equipo', width: 160 },
    { field: 'area', headerName: 'Área', width: 160 },
    { field: 'persona', headerName: 'Nombre', width: 220 },
    { field: 'hora_inicio', headerName: 'Inicio', width: 90, valueFormatter: (v) => fmtTime(String(v ?? '')) },
    { field: 'hora_fin', headerName: 'Fin', width: 90, valueFormatter: (v) => fmtTime(String(v ?? '')) },
    { field: 'horas_persona', headerName: 'Horas/persona', width: 130, type: 'number',
      valueFormatter: (v) => fmtNum(Number(v ?? 0)).toFixed(2),
    },
    { field: 'pago_persona_usd', headerName: 'Pago (USD)', width: 130, type: 'number',
      valueFormatter: (v) => money(Number(v ?? 0)),
    },
    { field: 'participacion_pct', headerName: 'Participación (%)', width: 150, type: 'number',
      valueFormatter: (v) => pctTxt(Number(v ?? 0)),
    },
    { field: 'compartido', headerName: 'Compartido?', width: 120, type: 'boolean',
      valueFormatter: (v) => (v ? 'Sí' : 'No'),
    },
    {
      field: 'compartio_con',
      headerName: 'Compartió con',
      width: 320,
      valueGetter: (_v, row) => (row.compartio_con ?? []).map(x => x.nombre).join(', '),
    },
  ], []);

  // ---- Helpers logo/base64
  const blobToBase64 = (blob: Blob) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(String(reader.result));
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  const fetchAsBase64 = async (url: string) => {
    const res = await fetch(url);
    const blob = await res.blob();
    return blobToBase64(blob);
  };

  // ===== Excel premium: paisaje, encabezado impreso, bordes fuertes, logo fijo, etc.
  const exportExcel = async () => {
    if (!rows.length) return message.info('No hay datos para exportar');
    setDownloading(true);
    try {
      type K = string;
      const byEquipo = new Map<K, RowWithPct[]>();
      rows.forEach(r => {
        byEquipo.set(r.equipo!, (byEquipo.get(r.equipo!) || []).concat(r));
      });

      const book = new ExcelJS.Workbook();
      const ws = book.addWorksheet('Reporte');

      // 10 columnas (sin Estado)
      ws.columns = [
        { key: 'nivel', width: 20 },
        { key: 'nombre', width: 44 },
        { key: 'sala', width: 20 },
        { key: 'fecha', width: 12 },
        { key: 'inicio', width: 10 },
        { key: 'fin', width: 10 },
        { key: 'horas', width: 12 },
        { key: 'pago', width: 16 },
        { key: 'participacion', width: 18 },
        { key: 'compartio', width: 50 },
      ];

      ws.pageSetup = {
        orientation: 'landscape',
        fitToPage: true,
        fitToWidth: 1,
        fitToHeight: 0,
        margins: { left: 0.3, right: 0.3, top: 0.4, bottom: 0.4, header: 0.1, footer: 0.1 },
      };

      // Banner 2 filas (A1:J2) con logo fijo
      ws.getRow(1).height = 32;
      ws.getRow(2).height = 28;
      ws.mergeCells(1, 1, 2, 10);
      const monthTitle = reportMonth.format('MMMM YYYY').toUpperCase();
      const titleCell = ws.getCell('A1');
      titleCell.value = `REPORTE DE USO DE SALAS — ${monthTitle}`;
      titleCell.font = { bold: true, size: 16, color: { argb: EXCEL.titleFont } };
      titleCell.alignment = { vertical: 'middle', horizontal: 'left' };
      for (let r = 1; r <= 2; r++) for (let c = 1; c <= 10; c++)
        ws.getCell(r, c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: EXCEL.titleBg } };
      try {
        const base64 = await fetchAsBase64(reportLogo);
        const imgId = book.addImage({ base64, extension: 'png' });
        ws.addImage(imgId, { tl: { col: 8.1, row: 0.22 }, ext: { width: 280, height: 58 }, editAs: 'absolute' });
      } catch {}

      // Encabezado (fila 3)
      const header = ws.addRow({
        nivel: 'Nivel',
        nombre: 'Equipo / Área / Nombre',
        sala: 'Sala',
        fecha: 'Fecha',
        inicio: 'Inicio',
        fin: 'Fin',
        horas: 'Horas',
        pago: 'Pago (USD)',
        participacion: 'Participación (%)',
        compartio: 'Compartió con',
      });
      header.eachCell((cell) => {
        cell.font = { bold: true };
        cell.alignment = { horizontal: 'center' };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: EXCEL.headerBg } };
        cell.border = {
          top: { style: 'thin', color: { argb: EXCEL.border } },
          left: { style: 'thin', color: { argb: EXCEL.border } },
          right: { style: 'thin', color: { argb: EXCEL.border } },
          bottom: { style: 'thin', color: { argb: EXCEL.border } },
        };
      });
      ws.views = [{ state: 'frozen', ySplit: 3 }];
      // @ts-ignore
      ws.pageSetup.printTitlesRow = '3:3';

      // Helpers estilos
      const borderThin = { style: 'thin' as const, color: { argb: EXCEL.border } };
      const borderStrong = { style: 'medium' as const, color: { argb: EXCEL.lineStrong } };

      const applyBorders = (row: ExcelJS.Row) => {
        row.eachCell(cell => {
          cell.border = { top: borderThin, left: borderThin, right: borderThin, bottom: borderThin };
        });
      };
      const setNumFormats = (row: ExcelJS.Row) => {
        row.getCell('horas').numFmt = '0.00';
        row.getCell('pago').numFmt = '"$"#,##0.00';
        row.getCell('participacion').numFmt = '0.00%';
        row.getCell('horas').alignment = { horizontal: 'right' };
        row.getCell('pago').alignment = { horizontal: 'right' };
        row.getCell('participacion').alignment = { horizontal: 'right' };
      };
      const separator = (h = 6) => { const r = ws.addRow({}); r.height = h; };

      let totalHorasAll = 0;
      let totalUSDAll = 0;

      // Equipo → Área → Nombre
      for (const [equipo, listEquipo] of Array.from(new Map([...byEquipo].sort()))) {
        // Encabezado EQUIPO con borde fuerte arriba
        const rEq = ws.addRow({ nivel: 'EQUIPO', nombre: equipo });
        rEq.font = { bold: true, size: 12 };
        rEq.eachCell(c => {
          c.border = { top: borderStrong, left: borderThin, right: borderThin, bottom: borderThin };
        });

        let horasEquipo = 0;
        let usdEquipo = 0;

        const byArea = new Map<string, RowWithPct[]>();
        listEquipo.forEach(r => byArea.set(r.area!, (byArea.get(r.area!) || []).concat(r)));

        for (const [area, listArea] of Array.from(new Map([...byArea].sort()))) {
          const rAr = ws.addRow({ nivel: 'ÁREA', nombre: area });
          rAr.font = { italic: true };
          applyBorders(rAr);

          let horasArea = 0;
          let usdArea = 0;

          const byPersona = new Map<string, RowWithPct[]>();
          listArea.forEach(r => byPersona.set(r.persona, (byPersona.get(r.persona) || []).concat(r)));

          for (const [persona, listPersona] of Array.from(new Map([...byPersona].sort()))) {
            const rNombre = ws.addRow({ nivel: '', nombre: persona });
            rNombre.font = { bold: true };
            applyBorders(rNombre);

            let zebra = false;
            listPersona
              .sort((a, b) => a.fecha.localeCompare(b.fecha) || a.hora_inicio.localeCompare(b.hora_inicio))
              .forEach(r => {
                const compartioStr = (r.compartio_con ?? []).map(x => x.nombre).join(', ');
                const participacionRatio = (r.participacion_pct || 0) / 100;

                const row = ws.addRow({
                  nivel: '',
                  nombre: '',
                  sala: r.sala,
                  fecha: dayjs(r.fecha).format('YYYY-MM-DD'),
                  inicio: fmtTime(r.hora_inicio),
                  fin: fmtTime(r.hora_fin),
                  horas: r.horas_persona,
                  pago: r.pago_persona_usd,
                  participacion: participacionRatio,
                  compartio: compartioStr,
                });
                zebra = !zebra;
                row.eachCell((cell) => {
                  cell.fill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: { argb: zebra ? EXCEL.zebraA : EXCEL.zebraB },
                  };
                });
                setNumFormats(row);
                applyBorders(row);
              });

            const horasPersona = listPersona.reduce((s, r) => s + (r.horas_persona || 0), 0);
            const usdPersona   = listPersona.reduce((s, r) => s + (r.pago_persona_usd || 0), 0);

            const rp = ws.addRow({
              nivel: 'SUBTOTAL',
              nombre: persona,
              horas: fmtNum(horasPersona),
              pago: fmtNum(usdPersona),
            });
            rp.font = { bold: true };
            setNumFormats(rp);
            rp.eachCell(c => {
              c.border = { top: borderStrong, left: borderThin, right: borderThin, bottom: borderThin };
            });

            horasArea += horasPersona;
            usdArea   += usdPersona;
          }

          const ra = ws.addRow({
            nivel: 'SUBTOTAL ÁREA',
            nombre: area,
            horas: fmtNum(horasArea),
            pago: fmtNum(usdArea),
          });
          ra.font = { bold: true };
          setNumFormats(ra);
          ra.eachCell(c => {
            c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: EXCEL.subtotalAreaBg } };
            c.border = { top: borderStrong, left: borderThin, right: borderThin, bottom: borderStrong };
          });

          horasEquipo += horasArea;
          usdEquipo   += usdArea;

          separator(4);
        }

        const re = ws.addRow({
          nivel: 'SUBTOTAL EQUIPO',
          nombre: equipo,
          horas: fmtNum(horasEquipo),
          pago: fmtNum(usdEquipo),
        });
        re.font = { bold: true };
        setNumFormats(re);
        re.eachCell(c => {
          c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: EXCEL.subtotalEquipoBg } };
          c.border = { top: borderStrong, left: borderThin, right: borderThin, bottom: borderStrong };
        });

        totalHorasAll += horasEquipo;
        totalUSDAll   += usdEquipo;

        separator(8);
      }

      const rt = ws.addRow({
        nivel: 'TOTAL GENERAL',
        nombre: '',
        horas: fmtNum(totalHorasAll),
        pago: fmtNum(totalUSDAll),
      });
      rt.font = { bold: true, size: 12 };
      setNumFormats(rt);
      rt.eachCell(c => {
        c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: EXCEL.totalGeneralBg } };
        c.border = { top: borderStrong, left: borderThin, right: borderThin, bottom: borderStrong };
      });

      ws.autoFilter = { from: { row: 3, column: 1 }, to: { row: 3, column: ws.columnCount } };

      const yy = reportMonth.year();
      const mm = String(reportMonth.month() + 1).padStart(2, '0');
      const buf = await book.xlsx.writeBuffer();
      saveAs(new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
        `reporte-salas-${yy}-${mm}.xlsx`);
    } catch (e) {
      console.error(e);
      message.error('No fue posible generar el Excel.');
    } finally {
      setDownloading(false);
    }
  };

  // ---- Guard rails
  if (canSee === false) return <Result status="403" title="403" subTitle="No tienes acceso a este reporte" />;
  if (canSee === null)  return <div style={{padding:24}}><Spin /> Cargando…</div>;

  // ---- Tabla resumen por equipo (AntD)
  const resumenColumns: TableProps<EquipoAgg>['columns'] = [
    { title: 'Equipo', dataIndex: 'equipo', key: 'equipo', width: 200, ellipsis: true },
    { title: 'Horas', dataIndex: 'horas', key: 'horas', width: 90, align: 'right',
      render: (v: number) => fmtNum(v).toFixed(2) },
    { title: 'USD', dataIndex: 'usd', key: 'usd', width: 110, align: 'right',
      render: (v: number) => money(v) },
    { title: '% del total', dataIndex: 'pct', key: 'pct', width: 110, align: 'right',
      render: (v: number) => pctTxt(v) },
  ];

  return (
    <div className="report-styles" style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* 🎨 estilos scoped */}
      <style>
        {`
          .report-styles .ant-card-head {
            background: ${UI.primary};
            color: ${UI.textOnPrimary};
            border-radius: 8px 8px 0 0;
          }
          .report-styles .ant-card-head-title { color: ${UI.textOnPrimary}; font-weight: 600; }
          .report-styles .ant-card { border-color: ${UI.border}; }
          .report-styles .ant-card-body { background: #FFFFFF; }

          /* Tabla resumen por equipo */
          .report-styles .ant-table-thead > tr > th {
            background: ${UI.headerBg} !important;
            font-weight: 600;
          }
          .report-styles .ant-table-tbody > tr.row-zebra-even > td { background: ${UI.zebraA}; }
          .report-styles .ant-table-tbody > tr.row-zebra-odd  > td { background: ${UI.zebraB}; }
          .report-styles .ant-table-tbody > tr:hover > td { background: ${UI.hover} !important; }

          /* DataGrid (MUI) */
          .report-styles .MuiDataGrid-columnHeaders {
            background: ${UI.headerBg};
            border-bottom: 1px solid ${UI.border};
          }
          .report-styles .MuiDataGrid-row:nth-of-type(even) { background: ${UI.zebraA}; }
          .report-styles .MuiDataGrid-row:nth-of-type(odd)  { background: ${UI.zebraB}; }
          .report-styles .MuiDataGrid-row:hover { background: ${UI.hover}; }
          .report-styles .MuiDataGrid-footerContainer { border-top: 1px solid ${UI.border}; }
        `}
      </style>

      <Title level={3} style={{ margin: 0, color: UI.primary }}>Reporte Mensual — Vista Exclusiva</Title>

      {/* Filtros */}
      <Space wrap>
        <span>Mes:</span>
        <DatePicker picker="month" allowClear={false} value={reportMonth}
          onChange={(d) => d && setReportMonth(d.startOf('month'))} />
        <span>Estado:</span>
        <Select<StateFilter, StateOption> value={stateFilter} style={{ width: 200 }}
          onChange={(v) => setStateFilter(v)} options={stateOptions} />
        <Tooltip title="Refrescar">
          <Button icon={<ReloadOutlined />} onClick={loadData} />
        </Tooltip>
        <Tooltip title="Exportar Excel (branding + subtotales)">
          <Button type="primary" icon={<DownloadOutlined />} loading={downloading}
            disabled={!rows.length} onClick={exportExcel}>
            Exportar
          </Button>
        </Tooltip>
      </Space>

      {/* KPIs + Resumen por equipo */}
      <Row gutter={[12, 12]}>
        <Col xs={24} md={12} lg={10}>
          <Card
            size="small"
            title="KPIs del mes"
            headStyle={{ background: UI.primary, color: UI.textOnPrimary }}
            bodyStyle={{ background: UI.kpiBg }}
          >
            <Row gutter={[12, 12]}>
              <Col xs={12}><Statistic title="Total USD (asignado)" value={totalUSD} precision={2} prefix="$" valueStyle={{ color: UI.primary }} /></Col>
              <Col xs={12}><Statistic title="Total horas (asignado)" value={totalHoras} precision={2} valueStyle={{ color: UI.primary }} /></Col>
              <Col xs={12}><Statistic title="Reservas únicas" value={reservasUnicas} valueStyle={{ color: UI.primarySoft }} /></Col>
              <Col xs={12}><Statistic title="Equipos" value={equiposUnicos} valueStyle={{ color: UI.primarySoft }} /></Col>
            </Row>
          </Card>
        </Col>
        <Col xs={24} md={12} lg={14}>
          <Card
            size="small"
            title="Resumen por equipo"
            headStyle={{ background: UI.primary, color: UI.textOnPrimary }}
          >
            <Table<EquipoAgg>
              rowKey={(r) => r.equipo}
              size="small"
              columns={resumenColumns}
              dataSource={equipoAgg}
              pagination={{ pageSize: 6, showSizeChanger: false }}
              rowClassName={(_, idx) => (idx ?? 0) % 2 === 0 ? 'row-zebra-even' : 'row-zebra-odd'}
              summary={(data) => {
                const sumHoras = data.reduce((s, r) => s + (r.horas || 0), 0);
                const sumUsd = data.reduce((s, r) => s + (r.usd || 0), 0);
                return (
                  <Table.Summary fixed>
                    <Table.Summary.Row style={{ background: '#FDF7E3', fontWeight: 600 }}>
                      <Table.Summary.Cell index={0}>Totales</Table.Summary.Cell>
                      <Table.Summary.Cell index={1} align="right">{fmtNum(sumHoras).toFixed(2)}</Table.Summary.Cell>
                      <Table.Summary.Cell index={2} align="right">{money(sumUsd)}</Table.Summary.Cell>
                      <Table.Summary.Cell index={3} />
                    </Table.Summary.Row>
                  </Table.Summary>
                );
              }}
            />
          </Card>
        </Col>
      </Row>

      {/* Detalle */}
      <Card
        size="small"
        title="Detalle por persona / reserva"
        headStyle={{ background: UI.primary, color: UI.textOnPrimary }}
      >
        <div style={{ height: 620, width: '100%' }}>
          <DataGrid
            rows={rows}
            getRowId={(r) => `${r.reservation_id}-${r.persona}-${r.fecha}-${r.hora_inicio}-${r.sala}`}
            columns={columns}
            loading={loading}
            disableRowSelectionOnClick
            initialState={{
              pagination: { paginationModel: { pageSize: 10, page: 0 } },
              sorting: { sortModel: [{ field: 'fecha', sort: 'desc' }] },
            }}
            pageSizeOptions={[10, 20, 50, 100]}
            localeText={esES.components.MuiDataGrid.defaultProps!.localeText}
          />
        </div>
      </Card>
    </div>
  );
}
