// src/pages/reportes/ExclusiveMonthlyReport.tsx
import { useEffect, useMemo, useState, useCallback, type JSX } from 'react';
import {
  DatePicker, Select, Space, Button, Typography, Tooltip, message, Result, Spin,
  Row, Col, Card, Statistic, Table, type TableProps, 
} from 'antd';
import { DownloadOutlined, ReloadOutlined } from '@ant-design/icons';
import dayjs, { Dayjs } from 'dayjs';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import api from '../../api/axios';
import reportLogo from '../../assets/logo-cosortium.png';
import useThemeStore from '../../hooks/useThemeStore';
import type { AxiosError } from 'axios';

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

type Palette = {
  primary: string;
  primarySoft: string;
  headerBg: string;
  zebraA: string;
  zebraB: string;
  hover: string;
  kpiBg: string;
  textOnPrimary: string;
  border: string;
  cardBg: string;
  text: string;
  summaryBg: string;
  gridBorder: string;
};

const LIGHT_UI: Palette = {
  primary: '#003B5C',
  primarySoft: '#0F5C87',
  headerBg: '#F0F5FF',
  zebraA: '#FAFDFF',
  zebraB: '#F5FAFF',
  hover: '#E6F7FF',
  kpiBg: '#F7FAFC',
  textOnPrimary: '#FFFFFF',
  border: '#CAD0D4',
  cardBg: '#FFFFFF',
  text: '#0F172A',
  summaryBg: '#FDF7E3',
  gridBorder: '#E5E7EB',
};

const DARK_UI: Palette = {
  primary: '#1F7AD4',
  primarySoft: '#64B5F6',
  headerBg: '#14243A',
  zebraA: '#0F1C2C',
  zebraB: '#091220',
  hover: '#173459',
  kpiBg: '#0D1A2B',
  textOnPrimary: '#E2E8F0',
  border: '#1F3654',
  cardBg: '#0B1220',
  text: '#F1F5F9',
  summaryBg: '#132036',
  gridBorder: '#1E293B',
};

export default function ExclusiveMonthlyReport(): JSX.Element {
  const themeMode = useThemeStore((s) => s.mode);
  const isDark = themeMode === 'dark';
  const UI = useMemo(() => (isDark ? DARK_UI : LIGHT_UI), [isDark]);
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
    } catch (e: unknown) {
      const err = e as AxiosError<{ message?: string }>;
      message.error(err.response?.data?.message || "No fue posible cargar el reporte.");
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
  const reservasCompartidas = useMemo(() => {
    return new Set(
      rows.filter(r => r.compartido).map(r => r.reservation_id)
    ).size;
  }, [rows]);

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

  // ---- Columnas del detalle (AntD) — sin "Estado"; "Compartió con" solo nombres
  const columns: TableProps<RowWithPct>['columns'] = useMemo(() => [
    { title: 'Fecha', dataIndex: 'fecha', key: 'fecha', width: 100, fixed: 'left',
      defaultSortOrder: 'descend',
      sorter: (a, b) => String(a.fecha).localeCompare(String(b.fecha)),
      render: (v: string) => (v ? dayjs(String(v)).format('DD/MM') : ''),
    },
    { title: 'Sala', dataIndex: 'sala', key: 'sala', width: 160, ellipsis: true },
    { title: 'Equipo', dataIndex: 'equipo', key: 'equipo', width: 160, ellipsis: true },
    { title: 'Área', dataIndex: 'area', key: 'area', width: 160, ellipsis: true },
    { title: 'Nombre', dataIndex: 'persona', key: 'persona', width: 220, ellipsis: true },
    { title: 'Inicio', dataIndex: 'hora_inicio', key: 'hora_inicio', width: 90,
      render: (v: string) => fmtTime(String(v ?? '')) },
    { title: 'Fin', dataIndex: 'hora_fin', key: 'hora_fin', width: 90,
      render: (v: string) => fmtTime(String(v ?? '')) },
    { title: 'Horas/persona', dataIndex: 'horas_persona', key: 'horas_persona', width: 130, align: 'right',
      sorter: (a, b) => a.horas_persona - b.horas_persona,
      render: (v: number) => fmtNum(Number(v ?? 0)).toFixed(2),
    },
    { title: 'Pago (USD)', dataIndex: 'pago_persona_usd', key: 'pago_persona_usd', width: 130, align: 'right',
      sorter: (a, b) => a.pago_persona_usd - b.pago_persona_usd,
      render: (v: number) => money(Number(v ?? 0)),
    },
    { title: 'Participación (%)', dataIndex: 'participacion_pct', key: 'participacion_pct', width: 150, align: 'right',
      sorter: (a, b) => a.participacion_pct - b.participacion_pct,
      render: (v: number) => pctTxt(Number(v ?? 0)),
    },
    { title: 'Compartido?', dataIndex: 'compartido', key: 'compartido', width: 120, align: 'center',
      render: (v: boolean) => (v ? 'Sí' : 'No'),
    },
    { title: 'Compartió con', dataIndex: 'compartio_con', key: 'compartio_con', width: 320, ellipsis: true,
      render: (_: unknown, row: RowWithPct) => (row.compartio_con ?? []).map(x => x.nombre).join(', '),
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

  // ===== Excel mejorado: centrado, logo estable, columna "Compartió"
  const exportExcel = async () => {
    if (!rows.length) return message.info("No hay datos para exportar");
    setDownloading(true);

    try {
      const book = new ExcelJS.Workbook();
      const ws = book.addWorksheet("Reporte");

      // Configurar columnas con anchos específicos
      ws.columns = [
        { key: "equipo", width: 25 },
        { key: "area", width: 25 },
        { key: "usuario", width: 30 },
        { key: "horas", width: 12 },
        { key: "pago", width: 16 },
        { key: "compartio", width: 12 }, // Nueva columna
      ];

      const COLORS = {
        bannerBg: "FF002060",   // Azul corporativo
        bannerFont: "FFFFFFFF", // Blanco
        equipoBg: "FFED7D31",   // Naranja fuerte
        areaBg: "FFFCE4D6",     // Naranja suave
        usuarioBg: "FFF2F2F2",  // Gris claro para usuarios
        totalBg: "FFD4EDDA",    // Verde claro
        border: "FF000000",     // Negro
      };

      const fmtNum = (n: number) => Number((n ?? 0).toFixed(2));
      const money = (n: number) => `$${fmtNum(n).toFixed(2)}`;

      // ==== Banner con logo (A1:H2) ====
      ws.mergeCells("A1:H2");
      const monthTitle = reportMonth.format("MMMM YYYY").toUpperCase();
      const titleCell = ws.getCell("A1");
      titleCell.value = `REPORTE DE USO DE SALAS — ${monthTitle}`;
      titleCell.font = { bold: true, size: 16, color: { argb: COLORS.bannerFont } };
      titleCell.alignment = { vertical: "middle", horizontal: "center" }; // Centrado

      // Aplicar fondo al banner
      for (let r = 1; r <= 2; r++) {
        for (let c = 1; c <= 8; c++) {
          ws.getCell(r, c).fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: COLORS.bannerBg },
          };
        }
      }

      // ==== Insertar logo ====
      try {
        const base64 = await fetchAsBase64(reportLogo);
        const imgId = book.addImage({ base64, extension: "png" });
        // Posición más estable para el logo
        ws.addImage(imgId, {
          tl: { col: 6.8, row: 0.2 },    // Columna G, ajustado
          ext: { width: 180, height: 50 }, // Tamaño optimizado
          editAs: "absolute",
        });
      } catch {
        console.warn("⚠️ Logo no insertado");
      }

      // ==== Encabezados de tabla (A3:F3) ====
      const headers = ["EQUIPO", "ÁREA", "USUARIO", "Horas", "Pago (USD)", "Compartió"];
      const headerRow = ws.addRow(headers);
      
      // Aplicar estilos a los encabezados
      headerRow.eachCell((cell) => {
        cell.font = { bold: true, color: { argb: "FF000000" } };
        cell.alignment = { 
          horizontal: "center", 
          vertical: "middle",
          wrapText: true 
        };
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFFFFFFF" },
        };
        cell.border = {
          top: { style: "thin", color: { argb: COLORS.border } },
          left: { style: "thin", color: { argb: COLORS.border } },
          right: { style: "thin", color: { argb: COLORS.border } },
          bottom: { style: "medium", color: { argb: COLORS.border } }, // Borde inferior más grueso
        };
      });

      // Ajustar altura de la fila de encabezados
      ws.getRow(3).height = 25;

      let totalHorasAll = 0;
      let totalUSDAll = 0;

      // ==== Agrupar por equipo ====
      const byEquipo = new Map<string, RowWithPct[]>();
      rows.forEach((r) => {
        byEquipo.set(r.equipo!, (byEquipo.get(r.equipo!) || []).concat(r));
      });

      // Función para aplicar bordes a una fila
      const applyBorders = (row: ExcelJS.Row, startCol: number = 1, endCol: number = 6) => {
        for (let c = startCol; c <= endCol; c++) {
          const cell = row.getCell(c);
          cell.border = {
            top: { style: "thin", color: { argb: COLORS.border } },
            left: { style: "thin", color: { argb: COLORS.border } },
            right: { style: "thin", color: { argb: COLORS.border } },
            bottom: { style: "thin", color: { argb: COLORS.border } },
          };
        }
      };

      // Función para centrar contenido
      const centerCells = (row: ExcelJS.Row, startCol: number = 1, endCol: number = 6) => {
        for (let c = startCol; c <= endCol; c++) {
          const cell = row.getCell(c);
          cell.alignment = { 
            horizontal: "center", 
            vertical: "middle",
            wrapText: true 
          };
        }
      };

      for (const [equipo, listEquipo] of Array.from(new Map([...byEquipo].sort()))) {
        const byArea = new Map<string, RowWithPct[]>();
        listEquipo.forEach((r) => {
          byArea.set(r.area!, (byArea.get(r.area!) || []).concat(r));
        });

        let horasEquipo = 0;
        let usdEquipo = 0;

        byArea.forEach((listArea) => {
          horasEquipo += listArea.reduce((s, r) => s + (r.horas_persona || 0), 0);
          usdEquipo += listArea.reduce((s, r) => s + (r.pago_persona_usd || 0), 0);
        });

        // ==== Fila de equipo ====
        const rowEquipo = ws.addRow([equipo, "", "", fmtNum(horasEquipo), money(usdEquipo), ""]);
        
        // Estilos para fila de equipo
        rowEquipo.font = { bold: true, color: { argb: COLORS.bannerFont } };
        for (let c = 1; c <= 6; c++) {
          rowEquipo.getCell(c).fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: COLORS.equipoBg },
          };
        }
        applyBorders(rowEquipo);
        centerCells(rowEquipo);

        for (const [area, listArea] of Array.from(new Map([...byArea].sort()))) {
          const byUsuario = new Map<string, RowWithPct[]>();
          listArea.forEach((r) => {
            byUsuario.set(r.persona, (byUsuario.get(r.persona) || []).concat(r));
          });

          let horasArea = 0;
          let usdArea = 0;

          byUsuario.forEach((listUsuario) => {
            horasArea += listUsuario.reduce((s, r) => s + (r.horas_persona || 0), 0);
            usdArea += listUsuario.reduce((s, r) => s + (r.pago_persona_usd || 0), 0);
          });

          // ==== Fila de área ====
          const rowArea = ws.addRow(["", area, "", fmtNum(horasArea), money(usdArea), ""]);
          
          // Estilos para fila de área
          rowArea.font = { bold: true, italic: true };
          for (let c = 1; c <= 6; c++) {
            rowArea.getCell(c).fill = {
              type: "pattern",
              pattern: "solid",
              fgColor: { argb: COLORS.areaBg },
            };
          }
          applyBorders(rowArea);
          centerCells(rowArea);

          // ==== Usuarios ====
          for (const [usuario, listUsuario] of Array.from(new Map([...byUsuario].sort()))) {
            const horasUsuario = fmtNum(
              listUsuario.reduce((s, r) => s + (r.horas_persona || 0), 0)
            );
            const usdUsuario = fmtNum(
              listUsuario.reduce((s, r) => s + (r.pago_persona_usd || 0), 0)
            );
            
            // Determinar si compartió sala
            const compartio = listUsuario.some(r => r.compartido) ? "Sí" : "No";
            
            const rowUsuario = ws.addRow(["", "", usuario, horasUsuario, money(usdUsuario), compartio]);
            
            // Estilos para fila de usuario
            for (let c = 1; c <= 6; c++) {
              rowUsuario.getCell(c).fill = {
                type: "pattern",
                pattern: "solid",
                fgColor: { argb: COLORS.usuarioBg },
              };
            }
            applyBorders(rowUsuario);
            centerCells(rowUsuario);
          }
        }

        totalHorasAll += horasEquipo;
        totalUSDAll += usdEquipo;
      }

      // ==== Total general ====
      const totalRow = ws.addRow(["TOTAL GENERAL", "", "", totalHorasAll, money(totalUSDAll), ""]);
      
      // Estilos para fila total
      totalRow.font = { bold: true, size: 12 };
      for (let c = 1; c <= 6; c++) {
        totalRow.getCell(c).fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: COLORS.totalBg },
        };
      }
      applyBorders(totalRow);
      centerCells(totalRow);

      // ==== Configurar página para impresión ====
      ws.pageSetup = {
        orientation: 'landscape' as const,
        fitToPage: true,
        fitToWidth: 1,
        fitToHeight: 0,
        paperSize: 9, // A4
        margins: {
          left: 0.3, right: 0.3,
          top: 0.4, bottom: 0.4,
          header: 0.3, footer: 0.3
        }
      };

      // ==== Descargar ====
      const yy = reportMonth.year();
      const mm = String(reportMonth.month() + 1).padStart(2, "0");
      const buf = await book.xlsx.writeBuffer();
      saveAs(new Blob([buf]), `reporte-salas-${yy}-${mm}.xlsx`);
      
      message.success("Excel generado correctamente");
    } catch (e) {
      console.error(e);
      message.error("No fue posible generar el Excel.");
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
    <div
      className="report-styles"
      style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 12, color: UI.text }}
    >
      {/* 🎨 estilos scoped */}
      <style>
        {`
          .report-styles {
            color: ${UI.text};
          }
          .report-styles .ant-card,
          .report-styles .ant-card-bordered {
            background: ${UI.cardBg};
            border-color: ${UI.border};
            color: ${UI.text};
          }
          .report-styles .ant-card-head {
            background: ${UI.primary};
            color: ${UI.textOnPrimary};
            border-radius: 8px 8px 0 0;
          }
          .report-styles .ant-card-head-title { color: ${UI.textOnPrimary}; font-weight: 600; }
          .report-styles .ant-card-body {
            background: ${UI.cardBg};
            color: ${UI.text};
          }
          .report-styles .ant-statistic-title,
          .report-styles .ant-statistic-content {
            color: ${UI.text};
          }

          /* Tabla resumen por equipo */
          .report-styles .ant-table {
            background: ${UI.cardBg};
            color: ${UI.text};
          }
          .report-styles .ant-table-thead > tr > th {
            background: ${UI.headerBg} !important;
            font-weight: 600;
            color: ${UI.text};
            border-color: ${UI.border};
          }
          .report-styles .ant-table-tbody > tr > td {
            border-color: ${UI.border};
            color: ${UI.text};
          }
          .report-styles .ant-table-tbody > tr.row-zebra-even > td { background: ${UI.zebraA}; }
          .report-styles .ant-table-tbody > tr.row-zebra-odd  > td { background: ${UI.zebraB}; }
          .report-styles .ant-table-tbody > tr:hover > td { background: ${UI.hover} !important; }
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
            headStyle={{ background: UI.primary, color: UI.textOnPrimary, borderColor: UI.border }}
            bodyStyle={{ background: UI.kpiBg, color: UI.text }}
            style={{ borderColor: UI.border }}
          >
            <Row gutter={[12, 12]}>
              <Col xs={12}><Statistic title="Total USD (utilizado)" value={totalUSD} precision={2} prefix="$" valueStyle={{ color: UI.primary }} /></Col>
              <Col xs={12}><Statistic title="Total horas (utilizado)" value={totalHoras} precision={2} valueStyle={{ color: UI.primary }} /></Col>
              <Col xs={12}><Statistic title="No. de reservas en el mes" value={reservasUnicas} valueStyle={{ color: UI.primarySoft }} /></Col>
              <Col xs={12}>
                <Statistic 
                  title="No. Reservas compartidas" 
                  value={reservasCompartidas} 
                  valueStyle={{ color: UI.primarySoft }} 
                />
              </Col>
              <Col xs={12}><Statistic title="Equipos que hicieron reservas" value={equiposUnicos} valueStyle={{ color: UI.primarySoft }} /></Col>
            </Row>
          </Card>
        </Col>
        <Col xs={24} md={12} lg={14}>
          <Card
            size="small"
            title="Resumen por equipo"
            headStyle={{ background: UI.primary, color: UI.textOnPrimary, borderColor: UI.border }}
            bodyStyle={{ background: UI.cardBg, color: UI.text }}
            style={{ borderColor: UI.border }}
          >
            <Table<EquipoAgg>
              rowKey={(r) => r.equipo}
              size="small"
              columns={resumenColumns}
              dataSource={equipoAgg}
              pagination={false} 
              rowClassName={(_, idx) => (idx ?? 0) % 2 === 0 ? 'row-zebra-even' : 'row-zebra-odd'}
              summary={(data) => {
                const sumHoras = data.reduce((s, r) => s + (r.horas || 0), 0);
                const sumUsd = data.reduce((s, r) => s + (r.usd || 0), 0);
                return (
                  <Table.Summary fixed>
                    <Table.Summary.Row style={{ background: UI.summaryBg, fontWeight: 600, color: UI.text }}>
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
        headStyle={{ background: UI.primary, color: UI.textOnPrimary, borderColor: UI.border }}
        bodyStyle={{ background: UI.cardBg, color: UI.text }}
        style={{ borderColor: UI.border }}
      >
        <Table<RowWithPct>
          rowKey={(r) => `${r.reservation_id}-${r.persona}-${r.fecha}-${r.hora_inicio}-${r.sala}`}
          size="small"
          columns={columns}
          dataSource={rows}
          loading={loading}
          rowClassName={(_, idx) => ((idx ?? 0) % 2 === 0 ? 'row-zebra-even' : 'row-zebra-odd')}
          scroll={{ x: 'max-content', y: 520 }}
          pagination={{
            defaultPageSize: 10,
            pageSizeOptions: [10, 20, 50, 100],
            showSizeChanger: true,
            showTotal: (total) => `${total} registros`,
          }}
        />
      </Card>
    </div>
  );
}
