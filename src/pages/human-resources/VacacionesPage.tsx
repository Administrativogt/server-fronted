import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Avatar,
  Button,
  Calendar,
  Card,
  Col,
  DatePicker,
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Progress,
  Row,
  Select,
  Space,
  Statistic,
  Table,
  Tabs,
  Tag,
  Timeline,
  TimePicker,
  Tooltip,
  Typography,
  Upload,
  message,
} from 'antd';
import {
  CalendarOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  DeleteOutlined,
  EditOutlined,
  DownloadOutlined,
  GiftOutlined,
  HistoryOutlined,
  InfoCircleOutlined,
  PlusOutlined,
  ReloadOutlined,
  StopOutlined,
  TeamOutlined,
  UploadOutlined,
  UserOutlined,
  UserAddOutlined,
  WalletOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import useAuthStore from '../../auth/useAuthStore';
import useThemeStore from '../../hooks/useThemeStore';
import { fetchUsers } from '../../api/notifications';
import {
  type BalanceLogType,
  type BalanceBreakdown,
  type DaysUsedStats,
  type MyVacationsResponse,
  type TimeOffTypeValue,
  type VacationBalance,
  type VacationBalanceLogEntry,
  type VacationRequest,
  type VacationRequestTypeValue,
  type VacationSettingsData,
  type VacationStatus,
  approveVacationRequest,
  cancelVacationRequest,
  createVacationRequest,
  downloadVacationBalancesExcel,
  downloadVacationRequestsExcel,
  fetchAllVacationRequests,
  creditAnniversaryDays,
  downloadVacationIcs,
  fetchCalendar,
  fetchDaysUsedStats,
  fetchMyBalanceLog,
  fetchMyVacations,
  fetchVacationBalances,
  fetchVacationSettings,
  createVacationRequestForUser,
  importBalancesExcel,
  hrUpdateVacationRequest,
  hrCancelVacationRequest,
  rejectVacationRequest,
  rolloverYear,
  setVacationBalance,
  updateVacationSettings,
} from '../../api/vacations';
import { getEquipos } from '../../api/users';
import {
  type Holiday,
  fetchHolidays,
  createHoliday,
  deleteHoliday,
} from '../../api/holidays';

const MAX_DAYS_REQUEST = 15;

const { Text } = Typography;
const { RangePicker } = DatePicker;

// ============================================
// STYLES
// ============================================

const VAC_STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600&display=swap');

  .vac-page { font-family: 'DM Sans', sans-serif; }

  .vac-header {
    background: linear-gradient(135deg, #0C1D3E 0%, #162D5C 55%, #1D3D7A 100%);
    border-radius: 16px;
    padding: 36px 48px;
    margin-bottom: 28px;
    position: relative;
    overflow: hidden;
  }
  .vac-header::before {
    content: '';
    position: absolute;
    top: -80px; right: -80px;
    width: 300px; height: 300px;
    background: radial-gradient(circle, rgba(201,168,76,0.18) 0%, transparent 65%);
    pointer-events: none;
  }
  .vac-header::after {
    content: '';
    position: absolute;
    bottom: -100px; left: -60px;
    width: 280px; height: 280px;
    background: radial-gradient(circle, rgba(29,61,122,0.6) 0%, transparent 70%);
    pointer-events: none;
  }
  .vac-header-deco {
    position: absolute; right: 48px; top: 50%;
    transform: translateY(-50%);
    font-size: 148px; opacity: 0.06; color: #fff;
    line-height: 1; pointer-events: none; user-select: none;
  }
  .vac-header-eyebrow {
    color: #C9A84C;
    font-size: 11px; font-weight: 600;
    letter-spacing: 3px; text-transform: uppercase;
    margin-bottom: 10px; opacity: 0.9;
  }
  .vac-header-title {
    font-family: 'Playfair Display', serif;
    font-size: 34px; font-weight: 700;
    color: #FFFFFF; margin: 0 0 8px 0;
    line-height: 1.15; letter-spacing: -0.3px;
  }
  .vac-header-sub {
    color: rgba(255,255,255,0.52);
    font-size: 13px; font-weight: 300; letter-spacing: 0.3px;
  }

  .vac-hero-card {
    border: 1.5px solid rgba(201,168,76,0.22) !important;
    border-radius: 16px !important;
    box-shadow: 0 4px 20px rgba(12,29,62,0.1) !important;
    text-align: center; overflow: hidden;
  }
  .vac-hero-label {
    font-size: 11px; font-weight: 600;
    letter-spacing: 2px; text-transform: uppercase;
    color: #8895B8; margin-bottom: 4px;
  }
  .vac-hero-number {
    font-family: 'Playfair Display', serif;
    font-size: 76px; font-weight: 700;
    color: #0C1D3E; line-height: 1; margin: 8px 0 2px;
  }
  .vac-hero-number--low { color: #DC2626; }
  .vac-hero-unit {
    font-size: 15px; color: #8895B8; font-weight: 400;
    display: block; margin-bottom: 20px;
  }
  .vac-hero-entry-date {
    font-size: 12px; color: #8895B8; margin-top: 10px;
  }
  .vac-hero-entry-date strong { color: #0C1D3E; font-weight: 600; }

  .vac-badge {
    display: inline-flex; align-items: center; gap: 5px;
    padding: 3px 10px; border-radius: 20px;
    font-size: 12px; font-weight: 600; letter-spacing: 0.2px;
    white-space: nowrap;
  }
  .vac-badge-dot {
    width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0;
  }
  .vac-badge--PENDIENTE  { background: #FEF3C7; color: #92400E; }
  .vac-badge--PENDIENTE  .vac-badge-dot { background: #D97706; box-shadow: 0 0 0 2px rgba(217,119,6,.22); }
  .vac-badge--APROBADA   { background: #D1FAE5; color: #065F46; }
  .vac-badge--APROBADA   .vac-badge-dot { background: #059669; box-shadow: 0 0 0 2px rgba(5,150,105,.22); }
  .vac-badge--RECHAZADA  { background: #FEE2E2; color: #991B1B; }
  .vac-badge--RECHAZADA  .vac-badge-dot { background: #DC2626; box-shadow: 0 0 0 2px rgba(220,38,38,.18); }
  .vac-badge--CANCELADA  { background: #F3F4F6; color: #6B7280; }
  .vac-badge--CANCELADA  .vac-badge-dot { background: #9CA3AF; }

  .vac-stat-card {
    border-radius: 14px !important; border: none !important;
    box-shadow: 0 2px 12px rgba(12,29,62,0.08) !important;
    transition: transform 0.15s ease, box-shadow 0.15s ease;
  }
  .vac-stat-card:hover { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(12,29,62,0.13) !important; }
  .vac-stat-card--pending  { background: linear-gradient(135deg, #FEF9EC, #FEF3C7); }
  .vac-stat-card--approved { background: linear-gradient(135deg, #ECFDF5, #D1FAE5); }
  .vac-stat-card--rejected { background: linear-gradient(135deg, #FFF5F5, #FEE2E2); }
  .vac-stat-card--total    { background: linear-gradient(135deg, #EEF2FF, #E0E7FF); }

  .vac-section-card {
    border-radius: 14px !important;
    border: 1px solid rgba(12,29,62,0.08) !important;
    box-shadow: 0 2px 12px rgba(12,29,62,0.07) !important;
    margin-bottom: 24px;
  }
  .vac-section-card .ant-card-head {
    border-bottom: 1px solid rgba(12,29,62,0.06);
    min-height: 52px;
  }
  .vac-section-card .ant-card-head-title {
    font-weight: 600; color: #0C1D3E; font-size: 14px;
  }

  .vac-form-card {
    border-left: 3px solid #C9A84C !important;
    border-radius: 14px !important;
    border-top: 1px solid rgba(12,29,62,0.08) !important;
    border-right: 1px solid rgba(12,29,62,0.08) !important;
    border-bottom: 1px solid rgba(12,29,62,0.08) !important;
    box-shadow: 0 2px 12px rgba(12,29,62,0.07) !important;
    margin-bottom: 24px;
  }

  .vac-timeline-entry {
    padding: 10px 14px; border-radius: 10px;
    background: #F9FAFB; border: 1px solid #F0F0F0;
  }
  .vac-timeline-date {
    font-size: 11px; color: #9CA3AF; margin-bottom: 5px; font-weight: 500;
  }
  .vac-timeline-row {
    display: flex; align-items: center; justify-content: space-between;
  }
  .vac-timeline-delta-pos { color: #059669; font-weight: 700; font-size: 17px; font-family: 'DM Sans', sans-serif; }
  .vac-timeline-delta-neg { color: #DC2626; font-weight: 700; font-size: 17px; font-family: 'DM Sans', sans-serif; }
  .vac-timeline-flow { font-size: 12px; color: #6B7280; margin-top: 3px; }
  .vac-timeline-flow strong { color: #1F2937; }

  .vac-emp-cell { display: flex; align-items: center; gap: 8px; }
  .vac-emp-name { font-size: 13px; font-weight: 500; color: #1F2937; line-height: 1.2; }

  .vac-cal-chip {
    border-radius: 4px; padding: 1px 5px;
    font-size: 11px; font-weight: 500; display: block;
    margin-bottom: 2px; white-space: nowrap;
    overflow: hidden; text-overflow: ellipsis;
  }

  .vac-page .ant-tabs-tab { font-family: 'DM Sans', sans-serif; font-weight: 500; }
  .vac-page .ant-tabs-tab-active .ant-tabs-tab-btn { color: #0C1D3E !important; font-weight: 600; }
  .vac-page .ant-tabs-ink-bar { background: #0C1D3E !important; }
  .vac-page .ant-tabs-nav { margin-bottom: 24px !important; }

  .vac-page .ant-table-thead > tr > th {
    background: #F5F7FC !important;
    color: #4B5563 !important;
    font-size: 11px !important;
    font-weight: 600 !important;
    letter-spacing: 0.5px !important;
    text-transform: uppercase !important;
  }
  .vac-page .ant-table-tbody > tr:hover > td { background: #F0F4FF !important; }

  .vac-primary-btn {
    background: linear-gradient(135deg, #0C1D3E, #1D3D7A) !important;
    border: none !important;
    border-radius: 8px !important;
    height: 40px !important;
    font-weight: 600 !important;
    padding: 0 24px !important;
  }

  /* ===== Overrides para modo oscuro ===== */
  .vac-page[data-theme="dark"] .ant-table-thead > tr > th {
    background: #1f1f1f !important;
    color: #cfcfcf !important;
  }
  .vac-page[data-theme="dark"] .ant-table-tbody > tr:hover > td {
    background: #262626 !important;
  }
  .vac-page[data-theme="dark"] .ant-tabs-tab-active .ant-tabs-tab-btn {
    color: #91caff !important;
  }
  .vac-page[data-theme="dark"] .ant-tabs-ink-bar {
    background: #91caff !important;
  }
  .vac-page[data-theme="dark"] .vac-timeline-entry {
    background: #1f1f1f;
    border-color: #303030;
  }
  .vac-page[data-theme="dark"] .vac-timeline-date { color: #8c8c8c; }
  .vac-page[data-theme="dark"] .vac-timeline-flow { color: #9ca3af; }
  .vac-page[data-theme="dark"] .vac-timeline-flow strong { color: #e5e7eb; }
  .vac-page[data-theme="dark"] .vac-emp-name { color: #e5e7eb; }
`;

// ============================================
// DESIGN CONSTANTS
// ============================================

const AVATAR_COLORS = [
  '#0C1D3E', '#1E3E80', '#0D5C63', '#5C4A1E',
  '#4A1E5C', '#1E4A3A', '#5C1E1E', '#2D4A1E',
];

const CALENDAR_COLORS = [
  { bg: '#DBEAFE', color: '#1E40AF' },
  { bg: '#D1FAE5', color: '#065F46' },
  { bg: '#FCE7F3', color: '#9D174D' },
  { bg: '#FEF3C7', color: '#92400E' },
  { bg: '#EDE9FE', color: '#5B21B6' },
  { bg: '#FEE2E2', color: '#991B1B' },
  { bg: '#ECFDF5', color: '#064E3B' },
  { bg: '#FFF7ED', color: '#9A3412' },
];

// ============================================
// HELPERS
// ============================================

const STATUS_CONFIG: Record<VacationStatus, { label: string; color: string }> = {
  PENDIENTE: { label: 'Pendiente', color: 'orange' },
  APROBADA:  { label: 'Aprobada',  color: 'green'  },
  RECHAZADA: { label: 'Rechazada', color: 'red'    },
  CANCELADA: { label: 'Cancelada', color: 'default'},
};

const getStatusTag = (estado: VacationStatus) => {
  const cfg = STATUS_CONFIG[estado] ?? { label: estado, color: 'default' };
  return <Tag color={cfg.color}>{cfg.label}</Tag>;
};

const getStatusBadge = (estado: VacationStatus) => {
  const labels: Record<VacationStatus, string> = {
    PENDIENTE: 'Pendiente',
    APROBADA:  'Aprobada',
    RECHAZADA: 'Rechazada',
    CANCELADA: 'Cancelada',
  };
  return (
    <span className={`vac-badge vac-badge--${estado}`}>
      <span className="vac-badge-dot" />
      {labels[estado] ?? estado}
    </span>
  );
};

const getUserName = (user?: { first_name: string; last_name: string } | null) =>
  user ? `${user.first_name} ${user.last_name}`.trim() : '-';

const getAvatarColor = (name: string): string => {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
};

const getInitials = (user?: { first_name: string; last_name: string } | null): string => {
  if (!user) return '?';
  return `${user.first_name?.[0] ?? ''}${user.last_name?.[0] ?? ''}`.toUpperCase();
};

// ============================================
// VACATION FIELD CONSTANTS
// ============================================

const TIME_OFF_OPTIONS: { value: TimeOffTypeValue; label: string }[] = [
  { value: 'vacaciones',        label: 'Vacaciones' },
  { value: 'dias_ausencia_sp',  label: 'Días de Ausencia - Servicios Profesionales' },
  { value: 'licencia_sin_goce', label: 'Licencia sin goce de salario' },
  { value: 'licencia_con_goce', label: 'Licencia con goce de salario' },
  { value: 'permiso',           label: 'Permiso' },
  { value: 'cita_igss_medica',  label: 'Cita IGSS / Cita Médica' },
  { value: 'enfermedad',        label: 'Enfermedad' },
];

const TIME_OFF_LABELS: Record<TimeOffTypeValue, string> = Object.fromEntries(
  TIME_OFF_OPTIONS.map((o) => [o.value, o.label]),
) as Record<TimeOffTypeValue, string>;

const REQUEST_TYPE_OPTIONS: { value: VacationRequestTypeValue; label: string }[] = [
  { value: 'full_day', label: 'Día completo' },
  { value: '0.5',  label: '0.5 horas' },
  { value: '1',    label: '1 hora' },
  { value: '1.5',  label: '1.5 horas' },
  { value: '2',    label: '2 horas' },
  { value: '2.5',  label: '2.5 horas' },
  { value: '3',    label: '3 horas' },
  { value: '3.5',  label: '3.5 horas' },
  { value: '4',    label: '4 horas' },
];

const REQUEST_TYPE_LABELS: Record<VacationRequestTypeValue, string> = Object.fromEntries(
  REQUEST_TYPE_OPTIONS.map((o) => [o.value, o.label]),
) as Record<VacationRequestTypeValue, string>;

// ============================================
// COMPONENT
// ============================================

const VacacionesPage: React.FC = () => {
  const isSuperuser = useAuthStore((s) => s.is_superuser);
  const username = useAuthStore((s) => s.username);
  const themeMode = useThemeStore((s) => s.mode);

  const isHR =
    isSuperuser || ['MEJ000', 'TOR002', 'BAR000'].includes(username);

  // ---- Mis Vacaciones ----
  const [myData, setMyData] = useState<MyVacationsResponse | null>(null);
  const [myLoading, setMyLoading] = useState(false);
  const [requestForm] = Form.useForm();
  const [requesting, setRequesting] = useState(false);
  const [cancelingId, setCancelingId] = useState<number | null>(null);

  // ---- Gestion (HR) ----
  const [allRequests, setAllRequests] = useState<VacationRequest[]>([]);
  const [allLoading, setAllLoading] = useState(false);
  const [approvingId, setApprovingId] = useState<number | null>(null);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectingId, setRejectingId] = useState<number | null>(null);
  const [rejectForm] = Form.useForm();
  const [rejectingLoading, setRejectingLoading] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingRequest, setEditingRequest] = useState<VacationRequest | null>(null);
  const [editForm] = Form.useForm();
  const [editingLoading, setEditingLoading] = useState(false);
  const [hrCancelModalOpen, setHrCancelModalOpen] = useState(false);
  const [hrCancelingId, setHrCancelingId] = useState<number | null>(null);
  const [hrCancelForm] = Form.useForm();
  const [hrCancelingLoading, setHrCancelingLoading] = useState(false);
  const [hrRequestForm] = Form.useForm();
  const [hrRequesting, setHrRequesting] = useState(false);

  // ---- Saldos (HR) ----
  const [balances, setBalances] = useState<VacationBalance[]>([]);
  const [balancesLoading, setBalancesLoading] = useState(false);
  const [balanceSearch, setBalanceSearch] = useState('');
  const [editingBalance, setEditingBalance] = useState<number | null>(null);
  const [balanceForm] = Form.useForm();
  const [savingBalance, setSavingBalance] = useState(false);

  // ---- Historial de saldo ----
  const [balanceLog, setBalanceLog] = useState<VacationBalanceLogEntry[]>([]);
  const [balanceLogLoading, setBalanceLogLoading] = useState(false);

  // ---- Calendario ----
  const [calendarDate, setCalendarDate] = useState(dayjs());
  const [calendarRequests, setCalendarRequests] = useState<VacationRequest[]>([]);
  const [calendarLoading, setCalendarLoading] = useState(false);

  // ---- Exportar / Importar Excel ----
  const [exportingRequests, setExportingRequests] = useState(false);
  const [exportingBalances, setExportingBalances] = useState(false);
  const [importingBalances, setImportingBalances] = useState(false);
  const [importResult, setImportResult] = useState<{ imported: number; skipped: string[] } | null>(null);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [rollingOver, setRollingOver] = useState(false);
  const [creditingUserId, setCreditingUserId] = useState<number | null>(null);

  // ---- Registrar nuevo empleado ----
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [addForm] = Form.useForm();
  const [savingAdd, setSavingAdd] = useState(false);
  const [allUsers, setAllUsers] = useState<{ id: number; first_name: string; last_name: string }[]>([]);

  // ---- Asuetos ----
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [holidaysLoading, setHolidaysLoading] = useState(false);
  const [holidayYear, setHolidayYear] = useState(new Date().getFullYear());
  const [holidayForm] = Form.useForm();
  const [addingHoliday, setAddingHoliday] = useState(false);

  // ---- Configuración ----
  const [vacSettings, setVacSettings] = useState<VacationSettingsData | null>(null);
  const [settingsForm] = Form.useForm();
  const [savingSettings, setSavingSettings] = useState(false);

  // ---- Métrica días gozados ----
  const [daysUsedStats, setDaysUsedStats] = useState<DaysUsedStats | null>(null);
  const [daysUsedLoading, setDaysUsedLoading] = useState(false);
  const [daysUsedYear, setDaysUsedYear] = useState(new Date().getFullYear());
  const [daysUsedEquipo, setDaysUsedEquipo] = useState<number | undefined>(undefined);
  const [equipos, setEquipos] = useState<{ id: number; nombre: string }[]>([]);

  // ============================================
  // CARGA DE DATOS
  // ============================================

  const loadMyVacations = useCallback(async () => {
    setMyLoading(true);
    try {
      const data = await fetchMyVacations();
      setMyData(data);
    } catch {
      message.error('Error al cargar tus vacaciones');
    } finally {
      setMyLoading(false);
    }
  }, []);

  const loadAllRequests = useCallback(async () => {
    if (!isHR) return;
    setAllLoading(true);
    try {
      const data = await fetchAllVacationRequests();
      setAllRequests(data);
    } catch {
      message.error('Error al cargar solicitudes');
    } finally {
      setAllLoading(false);
    }
  }, [isHR]);

  const loadBalances = useCallback(async () => {
    if (!isHR) return;
    setBalancesLoading(true);
    try {
      const data = await fetchVacationBalances();
      setBalances(data);
    } catch {
      message.error('Error al cargar saldos');
    } finally {
      setBalancesLoading(false);
    }
  }, [isHR]);

  const loadBalanceLog = useCallback(async () => {
    setBalanceLogLoading(true);
    try {
      const data = await fetchMyBalanceLog();
      setBalanceLog(data);
    } catch {
      // silently ignore
    } finally {
      setBalanceLogLoading(false);
    }
  }, []);

  const loadCalendar = useCallback(async (date: typeof calendarDate) => {
    if (!isHR) return;
    setCalendarLoading(true);
    try {
      const data = await fetchCalendar(date.year(), date.month() + 1);
      setCalendarRequests(data);
    } catch {
      message.error('Error al cargar el calendario');
    } finally {
      setCalendarLoading(false);
    }
  }, [isHR]);

  useEffect(() => {
    loadMyVacations();
    loadBalanceLog();
  }, [loadMyVacations, loadBalanceLog]);

  const loadHolidays = useCallback(async (year: number) => {
    if (!isHR) return;
    setHolidaysLoading(true);
    try {
      const data = await fetchHolidays(year);
      setHolidays(data);
    } catch {
      message.error('Error al cargar los asuetos');
    } finally {
      setHolidaysLoading(false);
    }
  }, [isHR]);

  const loadDaysUsedStats = useCallback(async (year: number, equipoId?: number) => {
    if (!isHR) return;
    setDaysUsedLoading(true);
    try {
      const data = await fetchDaysUsedStats(year, equipoId);
      setDaysUsedStats(data);
    } catch {
      message.error('Error al cargar estadísticas de días gozados');
    } finally {
      setDaysUsedLoading(false);
    }
  }, [isHR]);

  useEffect(() => {
    if (isHR) {
      loadAllRequests();
      loadBalances();
      loadCalendar(calendarDate);
      fetchUsers().then(setAllUsers).catch(() => {});
      getEquipos().then((res) => setEquipos(res.data)).catch(() => {});
      loadDaysUsedStats(daysUsedYear, daysUsedEquipo);
      loadHolidays(holidayYear);
      fetchVacationSettings().then((s) => {
        setVacSettings(s);
        settingsForm.setFieldsValue({
          max_days_request: s.max_days_request,
        });
      }).catch(() => {});
    }
  }, [isHR, loadAllRequests, loadBalances, loadCalendar, loadDaysUsedStats]);

  const handleExportRequests = async () => {
    setExportingRequests(true);
    try {
      await downloadVacationRequestsExcel();
    } catch {
      message.error('Error al exportar solicitudes');
    } finally {
      setExportingRequests(false);
    }
  };

  const handleExportBalances = async () => {
    setExportingBalances(true);
    try {
      await downloadVacationBalancesExcel();
    } catch {
      message.error('Error al exportar saldos');
    } finally {
      setExportingBalances(false);
    }
  };

  const handleAddEmployee = async () => {
    try {
      const values = await addForm.validateFields();
      setSavingAdd(true);
      await setVacationBalance(values.user_id, {
        fecha_ingreso: values.fecha_ingreso.format('YYYY-MM-DD'),
        time_off_type: values.time_off_type ?? 'vacaciones',
        earned_this_year: values.earned_this_year ?? 0,
        used_this_year: values.used_this_year ?? 0,
        previous_year: values.previous_year ?? 0,
      });
      message.success('Saldo registrado correctamente');
      setAddModalOpen(false);
      addForm.resetFields();
      loadBalances();
    } catch (e: any) {
      if (e?.errorFields) return;
      message.error('Error al registrar el saldo');
    } finally {
      setSavingAdd(false);
    }
  };

  const handleImportBalances = async (file: File) => {
    setImportingBalances(true);
    try {
      const result = await importBalancesExcel(file);
      setImportResult(result);
      setImportModalOpen(true);
      loadBalances();
    } catch {
      message.error('Error al importar el Excel');
    } finally {
      setImportingBalances(false);
    }
    return false; // prevent antd default upload
  };

  const handleRollover = async () => {
    setRollingOver(true);
    try {
      const result = await rolloverYear();
      message.success(`Rollover completado: ${result.updated} registros actualizados`);
      loadBalances();
    } catch {
      message.error('Error al hacer el rollover');
    } finally {
      setRollingOver(false);
    }
  };

  const handleCreditAnniversary = (userId: number, employeeName: string) => {
    Modal.confirm({
      title: `Acreditar 15 días a ${employeeName}`,
      content: 'Se sumarán 15 días a "Ganado este año" y al saldo disponible. ¿Continuar?',
      okText: 'Sí, acreditar',
      cancelText: 'Cancelar',
      onOk: async () => {
        setCreditingUserId(userId);
        try {
          await creditAnniversaryDays(userId);
          message.success(`+15 días acreditados a ${employeeName}`);
          loadBalances();
        } catch {
          message.error('Error al acreditar los días');
        } finally {
          setCreditingUserId(null);
        }
      },
    });
  };

  // ============================================
  // MIS VACACIONES - ACCIONES
  // ============================================

  const handleSubmitRequest = async () => {
    setRequesting(true);
    try {
      const values = await requestForm.validateFields();
      const requestType: VacationRequestTypeValue = values.request_type ?? 'full_day';
      const isHourly = requestType !== 'full_day';

      const payload: Parameters<typeof createVacationRequest>[0] = {
        request_type: requestType,
        time_off_type: values.time_off_type ?? 'vacaciones',
        comentarios: values.comentarios || undefined,
      };

      if (isHourly) {
        payload.fecha_inicio = dayjs(values.fecha_inicio).format('YYYY-MM-DD');
        payload.hora_inicio = dayjs(values.hora_inicio).format('HH:mm');
      } else {
        const [fechaInicio, fechaFin] = values.rango;
        payload.fecha_inicio = dayjs(fechaInicio).format('YYYY-MM-DD');
        payload.fecha_fin = dayjs(fechaFin).format('YYYY-MM-DD');
      }

      await createVacationRequest(payload);
      message.success('Solicitud enviada');
      requestForm.resetFields();
      loadMyVacations();
    } catch (e: any) {
      if (e?.errorFields) return;
      message.error('No se pudo enviar la solicitud');
    } finally {
      setRequesting(false);
    }
  };

  const handleCancel = async (id: number) => {
    setCancelingId(id);
    try {
      await cancelVacationRequest(id);
      message.success('Solicitud cancelada');
      loadMyVacations();
    } catch {
      message.error('No se pudo cancelar la solicitud');
    } finally {
      setCancelingId(null);
    }
  };

  // ============================================
  // GESTION (HR) - ACCIONES
  // ============================================

  const handleHrSubmitRequest = async () => {
    setHrRequesting(true);
    try {
      const values = await hrRequestForm.validateFields();
      const requestType: VacationRequestTypeValue = values.request_type ?? 'full_day';
      const isHourly = requestType !== 'full_day';

      const payload: Parameters<typeof createVacationRequestForUser>[1] = {
        request_type: requestType,
        time_off_type: values.time_off_type ?? 'vacaciones',
        comentarios: values.comentarios || undefined,
      };

      if (isHourly) {
        payload.fecha_inicio = dayjs(values.fecha_inicio).format('YYYY-MM-DD');
        payload.hora_inicio = dayjs(values.hora_inicio).format('HH:mm');
      } else {
        const [fechaInicio, fechaFin] = values.rango;
        payload.fecha_inicio = dayjs(fechaInicio).format('YYYY-MM-DD');
        payload.fecha_fin = dayjs(fechaFin).format('YYYY-MM-DD');
      }

      await createVacationRequestForUser(values.user_id, payload);
      message.success('Solicitud creada exitosamente');
      hrRequestForm.resetFields();
      loadAllRequests();
    } catch (e: any) {
      if (e?.errorFields) return;
      message.error('No se pudo crear la solicitud');
    } finally {
      setHrRequesting(false);
    }
  };

  const handleApprove = async (id: number) => {
    setApprovingId(id);
    try {
      await approveVacationRequest(id);
      message.success('Solicitud aprobada');
      loadAllRequests();
    } catch {
      message.error('No se pudo aprobar la solicitud');
    } finally {
      setApprovingId(null);
    }
  };

  const openRejectModal = (id: number) => {
    setRejectingId(id);
    rejectForm.resetFields();
    setRejectModalOpen(true);
  };

  const handleReject = async () => {
    if (rejectingId === null) return;
    setRejectingLoading(true);
    try {
      const values = rejectForm.getFieldsValue();
      await rejectVacationRequest(rejectingId, values.motivo_cancelacion || undefined);
      message.success('Solicitud rechazada');
      setRejectModalOpen(false);
      rejectForm.resetFields();
      setRejectingId(null);
      loadAllRequests();
    } catch {
      message.error('No se pudo rechazar la solicitud');
    } finally {
      setRejectingLoading(false);
    }
  };

  const openEditModal = (record: VacationRequest) => {
    setEditingRequest(record);
    const isHourly = record.request_type !== 'full_day';
    editForm.setFieldsValue({
      time_off_type: record.time_off_type,
      request_type: record.request_type,
      comentarios: record.comentarios ?? undefined,
      ...(isHourly
        ? {
            fecha_inicio: dayjs(record.fecha_inicio),
            hora_inicio: record.hora_inicio
              ? dayjs()
                  .hour(Number(record.hora_inicio.split(':')[0]))
                  .minute(Number(record.hora_inicio.split(':')[1]))
                  .second(0)
              : undefined,
          }
        : { rango: [dayjs(record.fecha_inicio), dayjs(record.fecha_fin)] }),
    });
    setEditModalOpen(true);
  };

  const handleHrUpdate = async () => {
    if (!editingRequest) return;
    setEditingLoading(true);
    try {
      const values = await editForm.validateFields();
      const requestType: VacationRequestTypeValue = values.request_type ?? 'full_day';
      const isHourly = requestType !== 'full_day';

      const payload: Parameters<typeof hrUpdateVacationRequest>[1] = {
        request_type: requestType,
        time_off_type: values.time_off_type,
        comentarios: values.comentarios || undefined,
      };

      if (isHourly) {
        payload.fecha_inicio = dayjs(values.fecha_inicio).format('YYYY-MM-DD');
        payload.hora_inicio = dayjs(values.hora_inicio).format('HH:mm');
      } else {
        const [fechaInicio, fechaFin] = values.rango;
        payload.fecha_inicio = dayjs(fechaInicio).format('YYYY-MM-DD');
        payload.fecha_fin = dayjs(fechaFin).format('YYYY-MM-DD');
      }

      await hrUpdateVacationRequest(editingRequest.id, payload);
      message.success('Solicitud actualizada y saldo reconciliado');
      setEditModalOpen(false);
      editForm.resetFields();
      setEditingRequest(null);
      loadAllRequests();
      loadBalances();
    } catch (e: any) {
      if (e?.errorFields) return;
      message.error(e?.response?.data?.message || 'No se pudo actualizar la solicitud');
    } finally {
      setEditingLoading(false);
    }
  };

  const openHrCancelModal = (id: number) => {
    setHrCancelingId(id);
    hrCancelForm.resetFields();
    setHrCancelModalOpen(true);
  };

  const handleHrCancel = async () => {
    if (hrCancelingId === null) return;
    setHrCancelingLoading(true);
    try {
      const values = hrCancelForm.getFieldsValue();
      await hrCancelVacationRequest(hrCancelingId, values.motivo_cancelacion || undefined);
      message.success('Solicitud anulada y días devueltos al saldo');
      setHrCancelModalOpen(false);
      hrCancelForm.resetFields();
      setHrCancelingId(null);
      loadAllRequests();
      loadBalances();
    } catch (e: any) {
      message.error(e?.response?.data?.message || 'No se pudo anular la solicitud');
    } finally {
      setHrCancelingLoading(false);
    }
  };

  // ============================================
  // SALDOS (HR) - ACCIONES
  // ============================================

  const handleEditBalance = (userId: number, balance: VacationBalance) => {
    setEditingBalance(userId);
    balanceForm.setFieldsValue({
      fecha_ingreso: balance.fecha_ingreso ? dayjs(balance.fecha_ingreso) : null,
      time_off_type: balance.time_off_type ?? 'vacaciones',
      earned_this_year: Number(balance.earned_this_year ?? 0),
      used_this_year: Number(balance.used_this_year ?? 0),
      previous_year: Number(balance.previous_year ?? 0),
    });
  };

  const handleSaveBalance = async (userId: number) => {
    setSavingBalance(true);
    try {
      const values = await balanceForm.validateFields();
      await setVacationBalance(userId, {
        fecha_ingreso: dayjs(values.fecha_ingreso).format('YYYY-MM-DD'),
        time_off_type: values.time_off_type ?? 'vacaciones',
        earned_this_year: values.earned_this_year ?? 0,
        used_this_year: values.used_this_year ?? 0,
        previous_year: values.previous_year ?? 0,
      });
      message.success('Saldo actualizado');
      setEditingBalance(null);
      balanceForm.resetFields();
      loadBalances();
    } catch {
      message.error('No se pudo guardar el saldo');
    } finally {
      setSavingBalance(false);
    }
  };

  const handleAddHoliday = async () => {
    setAddingHoliday(true);
    try {
      const values = await holidayForm.validateFields();
      const date: typeof dayjs.prototype = values.fecha;
      const isRecurring: boolean = values.recurrente ?? false;
      await createHoliday({
        day: date.date(),
        month: date.month() + 1,
        name: values.name,
        year: isRecurring ? 0 : date.year(),
      });
      message.success('Asueto agregado');
      holidayForm.resetFields();
      loadHolidays(holidayYear);
    } catch (e: any) {
      if (e?.errorFields) return;
      message.error('Error al agregar el asueto');
    } finally {
      setAddingHoliday(false);
    }
  };

  const handleDeleteHoliday = async (id: number) => {
    try {
      await deleteHoliday(id);
      message.success('Asueto eliminado');
      loadHolidays(holidayYear);
    } catch {
      message.error('Error al eliminar el asueto');
    }
  };

  const handleSaveSettings = async () => {
    setSavingSettings(true);
    try {
      const values = await settingsForm.validateFields();
      const updated = await updateVacationSettings(values);
      setVacSettings(updated);
      message.success('Configuración guardada');
    } catch (e: any) {
      if (e?.errorFields) return;
      message.error('Error al guardar la configuración');
    } finally {
      setSavingSettings(false);
    }
  };

  // ============================================
  // STATS (HR)
  // ============================================

  const hrStats = useMemo(() => ({
    pending:  allRequests.filter((r) => r.estado === 'PENDIENTE').length,
    approved: allRequests.filter((r) => r.estado === 'APROBADA').length,
    rejected: allRequests.filter((r) => r.estado === 'RECHAZADA').length,
    total:    allRequests.length,
  }), [allRequests]);

  // ============================================
  // COLUMNAS DE TABLAS
  // ============================================

  const myRequestColumns = useMemo(
    () => [
      { title: '#', dataIndex: 'id', width: 55 },
      {
        title: 'Tipo',
        dataIndex: 'time_off_type',
        ellipsis: true,
        render: (v: TimeOffTypeValue) => (
          <Tag style={{ borderRadius: 6, fontSize: 11 }}>
            {TIME_OFF_LABELS[v] ?? v ?? 'Vacaciones'}
          </Tag>
        ),
      },
      {
        title: 'Duración',
        dataIndex: 'request_type',
        width: 110,
        render: (v: VacationRequestTypeValue) => REQUEST_TYPE_LABELS[v] ?? v ?? 'Día completo',
      },
      {
        title: 'Fecha inicio',
        dataIndex: 'fecha_inicio',
        render: (v: string, r: VacationRequest) => (
          <span>
            {v ? dayjs(v).format('DD/MM/YYYY') : '-'}
            {r.hora_inicio && (
              <Text type="secondary" style={{ fontSize: 11, marginLeft: 4 }}>
                {r.hora_inicio}
              </Text>
            )}
          </span>
        ),
      },
      {
        title: 'Fecha fin',
        dataIndex: 'fecha_fin',
        render: (v: string, r: VacationRequest) =>
          r.request_type !== 'full_day' ? null : (v ? dayjs(v).format('DD/MM/YYYY') : '-'),
      },
      {
        title: 'Días',
        dataIndex: 'dias_solicitados',
        width: 70,
        render: (v: number) => (
          <span style={{ fontWeight: 600, color: '#0C1D3E' }}>{v}</span>
        ),
      },
      {
        title: 'Estado',
        dataIndex: 'estado',
        render: (v: VacationStatus) => getStatusBadge(v),
      },
      {
        title: 'Solicitado',
        dataIndex: 'created_at',
        render: (v: string) => (v ? dayjs(v).format('DD/MM/YYYY HH:mm') : '-'),
      },
      {
        title: 'Comentarios',
        dataIndex: 'comentarios',
        ellipsis: true,
        render: (v: string) => v || <Text type="secondary">—</Text>,
      },
      {
        title: 'Acciones',
        width: 140,
        render: (_: unknown, record: VacationRequest) => (
          <Space size={6}>
            {record.estado === 'PENDIENTE' && (
              <Popconfirm
                title="Cancelar solicitud"
                description="Esta acción no se puede deshacer"
                onConfirm={() => handleCancel(record.id)}
                okText="Sí, cancelar"
                cancelText="No"
                okButtonProps={{ danger: true }}
              >
                <Button
                  size="small"
                  danger
                  icon={<StopOutlined />}
                  loading={cancelingId === record.id}
                  style={{ borderRadius: 6 }}
                >
                  Cancelar
                </Button>
              </Popconfirm>
            )}
            {record.estado === 'APROBADA' && (
              <Tooltip title="Agregar al calendario (.ics)">
                <Button
                  size="small"
                  icon={<CalendarOutlined />}
                  onClick={() => downloadVacationIcs(record.id)}
                  style={{ borderRadius: 6 }}
                />
              </Tooltip>
            )}
          </Space>
        ),
      },
    ],
    [cancelingId],
  );

  const allRequestColumns = useMemo(
    () => [
      { title: '#', dataIndex: 'id', width: 55 },
      {
        title: 'Empleado',
        dataIndex: 'user',
        render: (v: VacationRequest['user']) => {
          const name = getUserName(v);
          return (
            <div className="vac-emp-cell">
              <Avatar
                size={30}
                style={{
                  background: getAvatarColor(name),
                  fontSize: 12,
                  fontWeight: 700,
                  flexShrink: 0,
                }}
              >
                {getInitials(v)}
              </Avatar>
              <span className="vac-emp-name">{name}</span>
            </div>
          );
        },
      },
      {
        title: 'Tipo',
        dataIndex: 'time_off_type',
        ellipsis: true,
        render: (v: TimeOffTypeValue) => (
          <Tag style={{ borderRadius: 6, fontSize: 11 }}>
            {TIME_OFF_LABELS[v] ?? v ?? 'Vacaciones'}
          </Tag>
        ),
      },
      {
        title: 'Duración',
        dataIndex: 'request_type',
        width: 110,
        render: (v: VacationRequestTypeValue) => REQUEST_TYPE_LABELS[v] ?? v ?? 'Día completo',
      },
      {
        title: 'Fecha inicio',
        dataIndex: 'fecha_inicio',
        render: (v: string, r: VacationRequest) => (
          <span>
            {v ? dayjs(v).format('DD/MM/YYYY') : '-'}
            {r.hora_inicio && (
              <Text type="secondary" style={{ fontSize: 11, marginLeft: 4 }}>
                {r.hora_inicio}
              </Text>
            )}
          </span>
        ),
      },
      {
        title: 'Fecha fin',
        dataIndex: 'fecha_fin',
        render: (v: string, r: VacationRequest) =>
          r.request_type !== 'full_day' ? null : (v ? dayjs(v).format('DD/MM/YYYY') : '-'),
      },
      {
        title: 'Días',
        dataIndex: 'dias_solicitados',
        width: 65,
        render: (v: number) => (
          <span style={{ fontWeight: 600, color: '#0C1D3E' }}>{v}</span>
        ),
      },
      {
        title: 'Estado',
        dataIndex: 'estado',
        render: (v: VacationStatus) => getStatusBadge(v),
      },
      {
        title: 'Motivo rechazo',
        dataIndex: 'motivo_cancelacion',
        ellipsis: true,
        render: (v: string) => v || <Text type="secondary">—</Text>,
      },
      {
        title: 'Acciones',
        width: 200,
        render: (_: unknown, record: VacationRequest) => (
          <Space size={6}>
            {record.estado === 'PENDIENTE' && (
              <>
                <Button
                  size="small"
                  type="primary"
                  icon={<CheckCircleOutlined />}
                  loading={approvingId === record.id}
                  onClick={() => handleApprove(record.id)}
                  style={{ borderRadius: 6, background: '#059669', border: 'none', fontWeight: 600 }}
                >
                  Aprobar
                </Button>
                <Button
                  size="small"
                  danger
                  icon={<CloseCircleOutlined />}
                  onClick={() => openRejectModal(record.id)}
                  style={{ borderRadius: 6, fontWeight: 600 }}
                >
                  Rechazar
                </Button>
              </>
            )}
            {record.estado === 'APROBADA' && (
              <Tooltip title="Agregar al calendario (.ics)">
                <Button
                  size="small"
                  icon={<CalendarOutlined />}
                  onClick={() => downloadVacationIcs(record.id)}
                  style={{ borderRadius: 6 }}
                />
              </Tooltip>
            )}
            {(record.estado === 'PENDIENTE' || record.estado === 'APROBADA') && (
              <>
                <Tooltip title="Editar solicitud (recalcula y ajusta el saldo)">
                  <Button
                    size="small"
                    icon={<EditOutlined />}
                    onClick={() => openEditModal(record)}
                    style={{ borderRadius: 6 }}
                  />
                </Tooltip>
                <Tooltip title="Anular solicitud (devuelve los días al saldo)">
                  <Button
                    size="small"
                    danger
                    icon={<StopOutlined />}
                    onClick={() => openHrCancelModal(record.id)}
                    style={{ borderRadius: 6 }}
                  />
                </Tooltip>
              </>
            )}
          </Space>
        ),
      },
    ],
    [approvingId],
  );

  const balanceColumns = useMemo(
    () => [
      {
        title: 'Empleado',
        dataIndex: 'user',
        render: (v: VacationBalance['user']) => {
          const name = getUserName(v);
          return (
            <div className="vac-emp-cell">
              <Avatar size={30} style={{ background: getAvatarColor(name), fontSize: 12, fontWeight: 700, flexShrink: 0 }}>
                {getInitials(v)}
              </Avatar>
              <span className="vac-emp-name">{name}</span>
            </div>
          );
        },
      },
      {
        title: 'Tipo',
        dataIndex: 'time_off_label',
        width: 200,
        render: (v: string, r: VacationBalance) => (
          <Tag style={{ borderRadius: 6, fontSize: 11 }}>{v ?? r.time_off_type}</Tag>
        ),
      },
      {
        title: `Período ${new Date().getFullYear() - 1}`,
        dataIndex: 'previous_year',
        width: 120,
        render: (v: number) => (
          <span style={{ fontWeight: 600, color: Number(v) < 0 ? '#DC2626' : '#3B82F6' }}>
            {Number(v)}
          </span>
        ),
      },
      {
        title: `Período ${new Date().getFullYear()}`,
        dataIndex: 'earned_this_year',
        width: 120,
        render: (v: number) => (
          <span style={{ fontWeight: 600, color: '#059669' }}>{Number(v)}</span>
        ),
      },
      {
        title: 'Usado',
        dataIndex: 'used_this_year',
        width: 80,
        render: (v: number) => (
          <span style={{ fontWeight: 600, color: '#DC2626' }}>{Number(v)}</span>
        ),
      },
      {
        title: 'Disponible',
        dataIndex: 'available',
        width: 110,
        render: (v: number) => {
          const val = Number(v);
          return (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{
                fontFamily: "'Playfair Display', serif",
                fontWeight: 700, fontSize: 17,
                color: val < 0 ? '#DC2626' : val < 5 ? '#D97706' : '#0C1D3E',
              }}>
                {val}
              </span>
              <Text type="secondary" style={{ fontSize: 11 }}>días</Text>
            </div>
          );
        },
      },
      {
        title: 'Fecha ingreso',
        dataIndex: 'fecha_ingreso',
        width: 120,
        render: (v: string | null) =>
          v ? <Text style={{ fontWeight: 500, fontSize: 12 }}>{dayjs(v).format('DD/MM/YYYY')}</Text>
            : <Text type="secondary" style={{ fontSize: 12 }}>—</Text>,
      },
      {
        title: '',
        width: 140,
        render: (_: unknown, record: VacationBalance) => (
          <div style={{ display: 'flex', gap: 6 }}>
            <Button
              size="small"
              onClick={() => record.user && handleEditBalance(record.user.id, record)}
              style={{ borderRadius: 6, fontWeight: 500 }}
            >
              Editar
            </Button>
            {record.time_off_type === 'vacaciones' && (
              <Tooltip title="Acreditar 15 días anuales">
                <Button
                  size="small"
                  icon={<GiftOutlined />}
                  loading={creditingUserId === record.user?.id}
                  onClick={() => record.user && handleCreditAnniversary(record.user.id, getUserName(record.user))}
                  style={{ borderRadius: 6, color: '#059669', borderColor: '#059669' }}
                />
              </Tooltip>
            )}
          </div>
        ),
      },
    ],
    [creditingUserId],
  );

  // ============================================
  // RENDER - TAB MIS VACACIONES
  // ============================================

  const renderMyVacationsTab = () => {
    const vacBalance = myData?.balances?.find((b) => b.time_off_type === 'vacaciones');
    const saldo = vacBalance?.saldo_dias ?? myData?.saldo_dias ?? 0;
    const progressPercent = Math.min(100, Math.round((saldo / 15) * 100));
    const isLow = saldo < 5;
    const otherBalances = myData?.balances?.filter((b) => b.time_off_type !== 'vacaciones') ?? [];
    const pendingDays = vacBalance
      ? Math.max(0, (Number(vacBalance.previous_year) + Number(vacBalance.earned_this_year) - Number(vacBalance.used_this_year)) - Number(vacBalance.saldo_dias))
      : 0;

    return (
      <div>
        {/* Hero balance cards */}
        <Row gutter={[24, 24]} style={{ marginBottom: 28 }}>
          {/* Vacaciones */}
          <Col xs={24} sm={16} md={10} lg={8}>
            <Card className="vac-hero-card" styles={{ body: { padding: '28px 32px' } }}>
              <div className="vac-hero-label">Saldo disponible · Vacaciones</div>
              <div className={`vac-hero-number${isLow ? ' vac-hero-number--low' : ''}`}>
                {myData !== null ? saldo : '—'}
              </div>
              <span className="vac-hero-unit">días disponibles</span>
              <Progress
                percent={progressPercent}
                showInfo={false}
                strokeColor={isLow ? '#DC2626' : { '0%': '#C9A84C', '100%': '#0C1D3E' }}
                trailColor="#EEF2FF"
                strokeWidth={7}
                style={{ marginBottom: 10 }}
              />
              {/* Días en solicitudes pendientes */}
              {pendingDays > 0 && (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  background: '#FEF3C7', borderRadius: 8, padding: '6px 10px',
                  marginBottom: 10, fontSize: 12, color: '#92400E',
                }}>
                  <span style={{ fontWeight: 700 }}>⏳ {pendingDays} día{pendingDays !== 1 ? 's' : ''}</span>
                  <span>reservado{pendingDays !== 1 ? 's' : ''} en solicitudes pendientes</span>
                </div>
              )}

              {/* Desglose */}
              {vacBalance && (
                <div style={{
                  display: 'grid', gridTemplateColumns: '1fr 1fr 1fr',
                  gap: '8px', marginBottom: 12,
                  padding: '10px 0', borderTop: '1px solid rgba(12,29,62,0.07)',
                }}>
                  {[
                    { label: `Período ${vacBalance.previous_period ?? ''}`, value: vacBalance.previous_year, color: '#3B82F6' },
                    { label: `Período ${vacBalance.current_period ?? ''}`, value: vacBalance.earned_this_year, color: '#059669' },
                    { label: 'Usado', value: vacBalance.used_this_year, color: '#DC2626' },
                  ].map((item) => (
                    <div key={item.label} style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: 18, fontWeight: 700, color: item.color, fontFamily: "'Playfair Display', serif" }}>
                        {Number(item.value)}
                      </div>
                      <div style={{ fontSize: 10, color: '#8895B8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        {item.label}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {myData?.fecha_ingreso ? (
                <div className="vac-hero-entry-date">
                  <CalendarOutlined style={{ marginRight: 5, color: '#C9A84C' }} />
                  Ingreso: <strong>{dayjs(myData.fecha_ingreso).format('DD/MM/YYYY')}</strong>
                </div>
              ) : (
                <Alert
                  message="Sin fecha de ingreso registrada"
                  type="warning"
                  showIcon
                  style={{ marginTop: 12, borderRadius: 8, fontSize: 12 }}
                  banner
                />
              )}
            </Card>
          </Col>

          {/* Otros tipos de saldo */}
          {otherBalances.map((b) => (
            <Col xs={24} sm={10} md={7} lg={6} key={b.id}>
              <Card
                styles={{ body: { padding: '20px 24px' } }}
                style={{
                  borderRadius: 16,
                  border: '1.5px solid rgba(59,130,246,0.18)',
                  boxShadow: '0 4px 16px rgba(12,29,62,0.07)',
                }}
              >
                <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '1.5px', textTransform: 'uppercase', color: '#8895B8', marginBottom: 6 }}>
                  {b.time_off_label}
                </div>
                <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 40, fontWeight: 700, color: b.available < 0 ? '#DC2626' : '#0C1D3E', lineHeight: 1 }}>
                  {Number(b.available)}
                </div>
                <div style={{ fontSize: 12, color: '#8895B8', marginBottom: 10 }}>días disponibles</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6 }}>
                  {[
                    { label: b.previous_period ?? 'Anterior', value: b.previous_year, color: '#3B82F6' },
                    { label: b.current_period ?? 'Actual', value: b.earned_this_year, color: '#059669' },
                    { label: 'Usado', value: b.used_this_year, color: '#DC2626' },
                  ].map((item) => (
                    <div key={item.label} style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: 15, fontWeight: 700, color: item.color }}>{Number(item.value)}</div>
                      <div style={{ fontSize: 10, color: '#B0BAD3', textTransform: 'uppercase', letterSpacing: '0.4px' }}>{item.label}</div>
                    </div>
                  ))}
                </div>
              </Card>
            </Col>
          ))}
        </Row>

        {/* Formulario de solicitud */}
        <Card
          className="vac-form-card"
          title={
            <Space>
              <span style={{
                background: 'linear-gradient(135deg, #C9A84C, #E8CF82)',
                borderRadius: '50%',
                width: 26, height: 26,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}>
                <PlusOutlined style={{ color: '#fff', fontSize: 12 }} />
              </span>
              <span>Nueva solicitud</span>
            </Space>
          }
        >
          <Form
            form={requestForm}
            layout="vertical"
            style={{ maxWidth: 540 }}
            initialValues={{ request_type: 'full_day', time_off_type: 'vacaciones' }}
          >
            {/* Tipo de ausencia */}
            <Form.Item
              name="time_off_type"
              label={<span style={{ fontWeight: 600, color: '#374151' }}>Tipo de solicitud</span>}
              rules={[{ required: true, message: 'Selecciona el tipo' }]}
            >
              <Select
                options={TIME_OFF_OPTIONS}
                style={{ borderRadius: 8 }}
                placeholder="Selecciona el tipo de ausencia"
              />
            </Form.Item>

            {/* Duración */}
            <Form.Item
              name="request_type"
              label={<span style={{ fontWeight: 600, color: '#374151' }}>Duración</span>}
              rules={[{ required: true, message: 'Selecciona la duración' }]}
            >
              <Select options={REQUEST_TYPE_OPTIONS} style={{ borderRadius: 8 }} />
            </Form.Item>

            {/* Fechas — condicional según request_type */}
            <Form.Item noStyle shouldUpdate={(prev, curr) => prev.request_type !== curr.request_type}>
              {({ getFieldValue }) => {
                const rqType: VacationRequestTypeValue = getFieldValue('request_type') ?? 'full_day';
                const isHourly = rqType !== 'full_day';
                return isHourly ? (
                  <Row gutter={12}>
                    <Col span={12}>
                      <Form.Item
                        name="fecha_inicio"
                        label={<span style={{ fontWeight: 600, color: '#374151' }}>Fecha</span>}
                        rules={[{ required: true, message: 'Selecciona la fecha' }]}
                      >
                        <DatePicker
                          style={{ width: '100%', borderRadius: 8 }}
                          format="DD/MM/YYYY"
                          placeholder="Seleccionar fecha"
                        />
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item
                        name="hora_inicio"
                        label={<span style={{ fontWeight: 600, color: '#374151' }}>Hora de inicio</span>}
                        rules={[{ required: true, message: 'Selecciona la hora' }]}
                      >
                        <TimePicker
                          style={{ width: '100%', borderRadius: 8 }}
                          format="HH:mm"
                          minuteStep={15}
                          placeholder="HH:MM"
                        />
                      </Form.Item>
                    </Col>
                  </Row>
                ) : (
                  <Form.Item
                    name="rango"
                    label={<span style={{ fontWeight: 600, color: '#374151' }}>Rango de fechas</span>}
                    rules={[{ required: true, message: 'Selecciona las fechas' }]}
                    extra={
                      <Text type="secondary" style={{ fontSize: 12, marginTop: 4, display: 'block' }}>
                        Máximo {MAX_DAYS_REQUEST} días hábiles por solicitud
                      </Text>
                    }
                  >
                    <RangePicker
                      style={{ width: '100%', borderRadius: 8 }}
                      format="DD/MM/YYYY"
                      placeholder={['Fecha de inicio', 'Fecha de regreso']}
                    />
                  </Form.Item>
                );
              }}
            </Form.Item>

            <Form.Item
              name="comentarios"
              label={
                <span style={{ fontWeight: 600, color: '#374151' }}>
                  Comentarios <Text type="secondary" style={{ fontWeight: 400 }}>(opcional)</Text>
                </span>
              }
            >
              <Input.TextArea
                rows={3}
                placeholder="Agrega un comentario o motivo..."
                maxLength={500}
                showCount
                style={{ borderRadius: 8 }}
              />
            </Form.Item>
            <Form.Item style={{ marginBottom: 0 }}>
              <Button
                type="primary"
                icon={<PlusOutlined />}
                loading={requesting}
                onClick={handleSubmitRequest}
                className="vac-primary-btn"
              >
                Enviar solicitud
              </Button>
            </Form.Item>
          </Form>
        </Card>

        {/* Mis solicitudes */}
        <Card
          className="vac-section-card"
          title={
            <Space>
              <UserOutlined style={{ color: '#C9A84C' }} />
              <span>Mis solicitudes</span>
            </Space>
          }
          extra={
            <Button icon={<ReloadOutlined />} onClick={loadMyVacations} size="small" style={{ borderRadius: 6 }}>
              Actualizar
            </Button>
          }
        >
          <Table
            rowKey="id"
            loading={myLoading}
            dataSource={myData?.solicitudes ?? []}
            columns={myRequestColumns as any}
            pagination={{ pageSize: 10, size: 'small' }}
            size="middle"
            scroll={{ x: 900 }}
            locale={{ emptyText: 'No tienes solicitudes de vacaciones' }}
          />
        </Card>

        {/* Historial de saldo – Timeline */}
        <Card
          className="vac-section-card"
          title={
            <Space>
              <HistoryOutlined style={{ color: '#C9A84C' }} />
              <span>Historial de mi saldo</span>
            </Space>
          }
          extra={
            <Button icon={<ReloadOutlined />} onClick={loadBalanceLog} size="small" style={{ borderRadius: 6 }}>
              Actualizar
            </Button>
          }
        >
          {balanceLogLoading ? (
            <div style={{ textAlign: 'center', padding: 40, color: '#B0BAD3' }}>Cargando historial...</div>
          ) : balanceLog.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 40, color: '#B0BAD3', fontSize: 14 }}>
              Sin movimientos registrados
            </div>
          ) : (
            <Timeline
              items={balanceLog.map((entry) => {
                const LOG_CONFIG: Record<BalanceLogType, { color: string; label: string }> = {
                  DESCUENTO:     { color: '#DC2626', label: 'Descuento'    },
                  DEVOLUCION:    { color: '#059669', label: 'Devolución'   },
                  ANIVERSARIO:   { color: '#C9A84C', label: 'Aniversario'  },
                  AJUSTE_MANUAL: { color: '#3B82F6', label: 'Ajuste manual'},
                };
                const cfg = LOG_CONFIG[entry.tipo] ?? { color: '#6B7280', label: entry.tipo };
                const isPositive = Number(entry.dias) >= 0;
                return {
                  color: cfg.color,
                  children: (
                    <div className="vac-timeline-entry">
                      <div className="vac-timeline-date">
                        {entry.created_at ? dayjs(entry.created_at).format('DD/MM/YYYY HH:mm') : '—'}
                        {entry.solicitud && (
                          <span style={{
                            marginLeft: 8,
                            background: '#EEF2FF',
                            borderRadius: 4,
                            padding: '1px 7px',
                            fontSize: 11,
                            color: '#3730A3',
                            fontWeight: 500,
                          }}>
                            Solicitud #{entry.solicitud.id}
                          </span>
                        )}
                      </div>
                      <div className="vac-timeline-row">
                        <Tag
                          color={cfg.color}
                          style={{ borderRadius: 6, fontSize: 11, fontWeight: 600, border: 'none', margin: 0 }}
                        >
                          {cfg.label}
                        </Tag>
                        <span className={isPositive ? 'vac-timeline-delta-pos' : 'vac-timeline-delta-neg'}>
                          {isPositive ? '+' : ''}{Number(entry.dias)}
                        </span>
                      </div>
                      <div className="vac-timeline-flow">
                        Saldo: {Number(entry.saldo_anterior)} → <strong>{Number(entry.saldo_nuevo)} días</strong>
                      </div>
                    </div>
                  ),
                };
              })}
            />
          )}
        </Card>
      </div>
    );
  };

  // ============================================
  // RENDER - TAB GESTION (HR)
  // ============================================

  const renderGestionTab = () => (
    <div>
      {/* Stats cards */}
      <Row gutter={[16, 16]} style={{ marginBottom: 28 }}>
        {[
          { label: 'Pendientes',       value: hrStats.pending,  cls: 'pending',  color: '#D97706', icon: <CalendarOutlined /> },
          { label: 'Aprobadas',        value: hrStats.approved, cls: 'approved', color: '#059669', icon: <CheckCircleOutlined /> },
          { label: 'Rechazadas',       value: hrStats.rejected, cls: 'rejected', color: '#DC2626', icon: <CloseCircleOutlined /> },
          { label: 'Total solicitudes',value: hrStats.total,    cls: 'total',    color: '#3730A3', icon: <TeamOutlined /> },
        ].map((s) => (
          <Col xs={12} md={6} key={s.label}>
            <Card className={`vac-stat-card vac-stat-card--${s.cls}`} size="small">
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: 11, color: s.color, fontWeight: 600, letterSpacing: '0.5px', textTransform: 'uppercase', marginBottom: 4, opacity: 0.75 }}>
                    {s.label}
                  </div>
                  <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 38, fontWeight: 700, color: s.color, lineHeight: 1 }}>
                    {s.value}
                  </div>
                </div>
                <div style={{ color: s.color, opacity: 0.2, fontSize: 34, marginTop: 2 }}>
                  {s.icon}
                </div>
              </div>
            </Card>
          </Col>
        ))}
      </Row>

      {/* Métrica: días gozados en el año */}
      <Card
        className="vac-section-card"
        title={
          <Space>
            <CalendarOutlined style={{ color: '#C9A84C' }} />
            <span>Días de vacaciones gozados</span>
          </Space>
        }
        extra={
          <Space>
            <Select
              value={daysUsedYear}
              onChange={(val) => {
                setDaysUsedYear(val);
                loadDaysUsedStats(val, daysUsedEquipo);
              }}
              style={{ width: 90 }}
              options={Array.from({ length: 4 }, (_, i) => {
                const y = new Date().getFullYear() - i;
                return { value: y, label: String(y) };
              })}
            />
            <Select
              value={daysUsedEquipo ?? 'todos'}
              onChange={(val) => {
                const eq = val === 'todos' ? undefined : (val as number);
                setDaysUsedEquipo(eq);
                loadDaysUsedStats(daysUsedYear, eq);
              }}
              style={{ width: 180 }}
              options={[
                { value: 'todos', label: 'Todos los equipos' },
                ...equipos.map((e) => ({ value: e.id, label: e.nombre })),
              ]}
            />
            <Button
              icon={<ReloadOutlined />}
              size="small"
              style={{ borderRadius: 6 }}
              onClick={() => loadDaysUsedStats(daysUsedYear, daysUsedEquipo)}
            />
          </Space>
        }
      >
        <div style={{ display: 'flex', gap: 32, alignItems: 'flex-start', flexWrap: 'wrap' }}>
          {/* Total */}
          <div style={{ textAlign: 'center', minWidth: 140 }}>
            <div style={{ fontSize: 11, color: '#8895B8', fontWeight: 600, letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: 4 }}>
              Total días gozados
            </div>
            <div style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: 64, fontWeight: 700, color: '#0C1D3E', lineHeight: 1,
            }}>
              {daysUsedLoading ? '—' : (daysUsedStats?.total_days ?? 0)}
            </div>
            <div style={{ fontSize: 13, color: '#8895B8' }}>días en {daysUsedYear}</div>
          </div>

          {/* Desglose por equipo */}
          {(daysUsedStats?.by_team?.length ?? 0) > 0 && (
            <div style={{ flex: 1, minWidth: 280 }}>
              {daysUsedStats!.by_team.map((row) => {
                const pct = daysUsedStats!.total_days > 0
                  ? Math.round((row.total_days / daysUsedStats!.total_days) * 100)
                  : 0;
                return (
                  <div key={row.equipo_id ?? 'sin-equipo'} style={{ marginBottom: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <Text style={{ fontSize: 13, fontWeight: 500, color: '#1F2937' }}>
                        {row.equipo_nombre}
                      </Text>
                      <Space size={12}>
                        <Text style={{ fontSize: 13, fontWeight: 700, color: '#0C1D3E' }}>
                          {row.total_days} días
                        </Text>
                        <Text type="secondary" style={{ fontSize: 11 }}>
                          {row.employee_count} emp. · {pct}%
                        </Text>
                      </Space>
                    </div>
                    <Progress
                      percent={pct}
                      showInfo={false}
                      strokeColor={{ '0%': '#C9A84C', '100%': '#0C1D3E' }}
                      trailColor="#EEF2FF"
                      strokeWidth={6}
                    />
                  </div>
                );
              })}
            </div>
          )}

          {!daysUsedLoading && (daysUsedStats?.by_team?.length ?? 0) === 0 && (
            <Text type="secondary" style={{ fontSize: 13, alignSelf: 'center' }}>
              Sin datos para el período seleccionado
            </Text>
          )}
        </div>
      </Card>

      {/* Crear solicitud en nombre de un empleado */}
      <Card
        className="vac-form-card"
        title={
          <Space>
            <span style={{
              background: 'linear-gradient(135deg, #C9A84C, #E8CF82)',
              borderRadius: '50%', width: 26, height: 26,
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              <PlusOutlined style={{ color: '#fff', fontSize: 12 }} />
            </span>
            <span>Crear solicitud para un empleado</span>
          </Space>
        }
      >
        <Form
          form={hrRequestForm}
          layout="vertical"
          style={{ maxWidth: 560 }}
          initialValues={{ request_type: 'full_day', time_off_type: 'vacaciones' }}
        >
          <Form.Item
            name="user_id"
            label={<span style={{ fontWeight: 600, color: '#374151' }}>Empleado</span>}
            rules={[{ required: true, message: 'Selecciona un empleado' }]}
          >
            <Select
              showSearch
              placeholder="Buscar empleado..."
              optionFilterProp="label"
              style={{ borderRadius: 8 }}
              options={allUsers.map((u) => ({
                value: u.id,
                label: `${u.first_name} ${u.last_name}`.trim(),
              }))}
            />
          </Form.Item>

          <Form.Item
            name="time_off_type"
            label={<span style={{ fontWeight: 600, color: '#374151' }}>Tipo de solicitud</span>}
            rules={[{ required: true }]}
          >
            <Select options={TIME_OFF_OPTIONS} style={{ borderRadius: 8 }} />
          </Form.Item>

          <Form.Item
            name="request_type"
            label={<span style={{ fontWeight: 600, color: '#374151' }}>Duración</span>}
            rules={[{ required: true }]}
          >
            <Select options={REQUEST_TYPE_OPTIONS} style={{ borderRadius: 8 }} />
          </Form.Item>

          <Form.Item noStyle shouldUpdate={(prev, curr) => prev.request_type !== curr.request_type}>
            {({ getFieldValue }) => {
              const rqType: VacationRequestTypeValue = getFieldValue('request_type') ?? 'full_day';
              const isHourly = rqType !== 'full_day';
              return isHourly ? (
                <Row gutter={12}>
                  <Col span={12}>
                    <Form.Item name="fecha_inicio" label={<span style={{ fontWeight: 600 }}>Fecha</span>} rules={[{ required: true }]}>
                      <DatePicker style={{ width: '100%', borderRadius: 8 }} format="DD/MM/YYYY" />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item name="hora_inicio" label={<span style={{ fontWeight: 600 }}>Hora de inicio</span>} rules={[{ required: true }]}>
                      <TimePicker style={{ width: '100%', borderRadius: 8 }} format="HH:mm" minuteStep={15} />
                    </Form.Item>
                  </Col>
                </Row>
              ) : (
                <Form.Item name="rango" label={<span style={{ fontWeight: 600 }}>Rango de fechas</span>} rules={[{ required: true }]}>
                  <RangePicker style={{ width: '100%', borderRadius: 8 }} format="DD/MM/YYYY" />
                </Form.Item>
              );
            }}
          </Form.Item>

          <Form.Item name="comentarios" label={<span style={{ fontWeight: 600, color: '#374151' }}>Comentarios <Text type="secondary" style={{ fontWeight: 400 }}>(opcional)</Text></span>}>
            <Input.TextArea rows={2} maxLength={500} showCount style={{ borderRadius: 8 }} />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0 }}>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              loading={hrRequesting}
              onClick={handleHrSubmitRequest}
              className="vac-primary-btn"
            >
              Crear solicitud
            </Button>
          </Form.Item>
        </Form>
      </Card>

      {/* Solicitudes de empleados */}
      <Card
        className="vac-section-card"
        title={
          <Space>
            <TeamOutlined style={{ color: '#C9A84C' }} />
            <span>Solicitudes de empleados</span>
          </Space>
        }
        extra={
          <Space>
            <Button
              icon={<DownloadOutlined />}
              loading={exportingRequests}
              onClick={handleExportRequests}
              size="small"
              style={{ borderRadius: 6 }}
            >
              Exportar Excel
            </Button>
            <Button icon={<ReloadOutlined />} onClick={loadAllRequests} size="small" style={{ borderRadius: 6 }}>
              Actualizar
            </Button>
          </Space>
        }
      >
        <Table
          rowKey="id"
          loading={allLoading}
          dataSource={allRequests}
          columns={allRequestColumns as any}
          pagination={{ pageSize: 15, size: 'small' }}
          size="middle"
          scroll={{ x: 1000 }}
          locale={{ emptyText: 'No hay solicitudes' }}
        />
      </Card>

      {/* Saldos de vacaciones */}
      <Card
        className="vac-section-card"
        title={
          <Space>
            <WalletOutlined style={{ color: '#C9A84C' }} />
            <span>Saldos de vacaciones</span>
          </Space>
        }
        extra={
          <Space wrap>
            <Button
              type="primary"
              icon={<UserAddOutlined />}
              onClick={() => setAddModalOpen(true)}
              size="small"
              style={{ borderRadius: 6, background: 'linear-gradient(135deg, #0C1D3E, #1D3D7A)', border: 'none', fontWeight: 600 }}
            >
              Registrar
            </Button>
            <Upload
              accept=".xlsx,.xls"
              showUploadList={false}
              beforeUpload={(file) => { handleImportBalances(file as unknown as File); return false; }}
            >
              <Button
                icon={<UploadOutlined />}
                loading={importingBalances}
                size="small"
                style={{ borderRadius: 6, fontWeight: 500 }}
              >
                Importar Excel
              </Button>
            </Upload>
            <Button
              icon={<DownloadOutlined />}
              loading={exportingBalances}
              onClick={handleExportBalances}
              size="small"
              style={{ borderRadius: 6 }}
            >
              Exportar
            </Button>
            <Tooltip title="Inicio de año: mueve saldo → año anterior, resetea ganado/usado">
              <Button
                loading={rollingOver}
                onClick={handleRollover}
                size="small"
                style={{ borderRadius: 6, color: '#D97706', borderColor: '#D97706' }}
              >
                Rollover año
              </Button>
            </Tooltip>
            <Button icon={<ReloadOutlined />} onClick={loadBalances} size="small" style={{ borderRadius: 6 }}>
              Actualizar
            </Button>
          </Space>
        }
      >
        {editingBalance !== null && (
          <Card
            size="small"
            style={{ marginBottom: 16, background: '#F9FAFB', borderRadius: 10, border: '1px solid #E5E7EB' }}
            title={<span style={{ fontSize: 13, fontWeight: 600, color: '#0C1D3E' }}>Editar saldo</span>}
          >
            <Form form={balanceForm} layout="inline" style={{ flexWrap: 'wrap', gap: 8 }}>
              <Form.Item name="fecha_ingreso" label="Fecha ingreso" rules={[{ required: true, message: 'Requerido' }]}>
                <DatePicker format="DD/MM/YYYY" placeholder="Seleccionar" style={{ borderRadius: 8 }} />
              </Form.Item>
              <Form.Item name="time_off_type" label="Tipo" rules={[{ required: true }]}>
                <Select style={{ width: 180, borderRadius: 8 }} options={TIME_OFF_OPTIONS} />
              </Form.Item>
              <Form.Item name="previous_year" label="Año anterior">
                <InputNumber placeholder="0" style={{ width: 90, borderRadius: 8 }} />
              </Form.Item>
              <Form.Item name="earned_this_year" label="Ganado">
                <InputNumber placeholder="0" min={0} style={{ width: 90, borderRadius: 8 }} />
              </Form.Item>
              <Form.Item name="used_this_year" label="Usado">
                <InputNumber placeholder="0" min={0} style={{ width: 90, borderRadius: 8 }} />
              </Form.Item>
              <Form.Item>
                <Space>
                  <Button type="primary" loading={savingBalance} onClick={() => handleSaveBalance(editingBalance)}
                    style={{ borderRadius: 6, background: '#0C1D3E', border: 'none', fontWeight: 600 }}>
                    Guardar
                  </Button>
                  <Button onClick={() => { setEditingBalance(null); balanceForm.resetFields(); }} style={{ borderRadius: 6 }}>
                    Cancelar
                  </Button>
                </Space>
              </Form.Item>
            </Form>
          </Card>
        )}
        <Input.Search
          placeholder="Buscar empleado..."
          allowClear
          value={balanceSearch}
          onChange={(e) => setBalanceSearch(e.target.value)}
          style={{ marginBottom: 14, maxWidth: 320, borderRadius: 8 }}
        />
        <Table
          rowKey="id"
          loading={balancesLoading}
          dataSource={balances.filter((b) => {
            if (!balanceSearch) return true;
            const q = balanceSearch.toLowerCase();
            const name = `${b.user?.first_name ?? ''} ${b.user?.last_name ?? ''}`.toLowerCase();
            return name.includes(q);
          })}
          columns={balanceColumns as any}
          pagination={{ pageSize: 15, size: 'small' }}
          size="middle"
          scroll={{ x: 700 }}
          locale={{ emptyText: 'No hay saldos registrados' }}
        />
      </Card>

      {/* Configuración del módulo */}
      <Card
        className="vac-section-card"
        title={
          <Space>
            <span style={{ fontSize: 15 }}>⚙</span>
            <span>Configuración de vacaciones</span>
          </Space>
        }
        extra={
          vacSettings && (
            <Text type="secondary" style={{ fontSize: 11 }}>
              Última actualización: {dayjs(vacSettings.updated_at).format('DD/MM/YYYY HH:mm')}
            </Text>
          )
        }
      >
        <Form
          form={settingsForm}
          layout="vertical"
          style={{ maxWidth: 480 }}
        >
          <Row gutter={24}>
            <Col span={24}>
              <Form.Item
                name="max_days_request"
                label={
                  <Space direction="vertical" size={0}>
                    <span style={{ fontWeight: 600, color: '#374151' }}>Máximo días por solicitud</span>
                    <Text type="secondary" style={{ fontSize: 11, fontWeight: 400 }}>
                      Días hábiles que puede pedir un empleado en una sola solicitud
                    </Text>
                  </Space>
                }
                rules={[
                  { required: true, message: 'Requerido' },
                  { type: 'number', min: 1, max: 365, message: 'Entre 1 y 365' },
                ]}
              >
                <InputNumber
                  min={1}
                  max={365}
                  addonAfter="días"
                  style={{ width: '100%', borderRadius: 8 }}
                />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item style={{ marginBottom: 0 }}>
            <Button
              type="primary"
              loading={savingSettings}
              onClick={handleSaveSettings}
              style={{
                background: 'linear-gradient(135deg, #0C1D3E, #1D3D7A)',
                border: 'none', borderRadius: 8, fontWeight: 600, height: 38,
              }}
            >
              Guardar configuración
            </Button>
          </Form.Item>
        </Form>
      </Card>

      {/* Modal: Registrar nuevo empleado */}
      <Modal
        title={
          <Space>
            <UserAddOutlined style={{ color: '#C9A84C' }} />
            <span style={{ fontWeight: 600 }}>Registrar empleado en vacaciones</span>
          </Space>
        }
        open={addModalOpen}
        onOk={handleAddEmployee}
        onCancel={() => { setAddModalOpen(false); addForm.resetFields(); }}
        confirmLoading={savingAdd}
        okText="Registrar"
        cancelText="Cancelar"
        destroyOnClose
        okButtonProps={{ style: { background: '#0C1D3E', border: 'none', borderRadius: 6, fontWeight: 600 } }}
        cancelButtonProps={{ style: { borderRadius: 6 } }}
      >
        <Form form={addForm} layout="vertical" style={{ marginTop: 16 }}
          initialValues={{ time_off_type: 'vacaciones', earned_this_year: 0, used_this_year: 0, previous_year: 0 }}>
          <Form.Item name="user_id" label="Empleado" rules={[{ required: true, message: 'Selecciona un empleado' }]}>
            <Select
              showSearch placeholder="Buscar empleado..."
              optionFilterProp="label" style={{ borderRadius: 8 }}
              options={allUsers.map((u) => ({ value: u.id, label: `${u.first_name} ${u.last_name}`.trim() }))}
            />
          </Form.Item>
          <Form.Item name="fecha_ingreso" label="Fecha de ingreso" rules={[{ required: true, message: 'Requerido' }]}>
            <DatePicker format="DD/MM/YYYY" style={{ width: '100%', borderRadius: 8 }} placeholder="Seleccionar fecha" />
          </Form.Item>
          <Form.Item name="time_off_type" label="Tipo de ausencia" rules={[{ required: true }]}>
            <Select options={TIME_OFF_OPTIONS} style={{ borderRadius: 8 }} />
          </Form.Item>
          <Row gutter={12}>
            <Col span={8}>
              <Form.Item name="previous_year" label="Año anterior">
                <InputNumber style={{ width: '100%', borderRadius: 8 }} placeholder="0" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="earned_this_year" label="Ganado este año">
                <InputNumber min={0} style={{ width: '100%', borderRadius: 8 }} placeholder="0" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="used_this_year" label="Usado este año">
                <InputNumber min={0} style={{ width: '100%', borderRadius: 8 }} placeholder="0" />
              </Form.Item>
            </Col>
          </Row>
          <Alert
            message="El saldo disponible se calcula automáticamente: Año anterior + Ganado − Usado"
            type="info" showIcon
            style={{ borderRadius: 8, fontSize: 12 }}
          />
        </Form>
      </Modal>
    </div>
  );

  // ============================================
  // RENDER - TAB CALENDARIO (HR)
  // ============================================

  const vacationDayMap = useMemo(() => {
    const map = new Map<string, { name: string; id: number }[]>();
    for (const req of calendarRequests) {
      if (!req.user) continue;
      let current = dayjs(req.fecha_inicio);
      const end = dayjs(req.fecha_fin);
      while (current.isBefore(end) || current.isSame(end, 'day')) {
        const key = current.format('YYYY-MM-DD');
        if (!map.has(key)) map.set(key, []);
        map.get(key)!.push({ name: getUserName(req.user), id: req.id });
        current = current.add(1, 'day');
      }
    }
    return map;
  }, [calendarRequests]);

  const renderCalendarTab = () => (
    <Card
      className="vac-section-card"
      loading={calendarLoading}
      title={
        <Space>
          <CalendarOutlined style={{ color: '#C9A84C' }} />
          <span>Vacaciones aprobadas del equipo</span>
        </Space>
      }
    >
      <Calendar
        value={calendarDate}
        onPanelChange={(date) => {
          setCalendarDate(date);
          loadCalendar(date);
        }}
        cellRender={(date) => {
          const key = date.format('YYYY-MM-DD');
          const people = vacationDayMap.get(key);
          if (!people?.length) return null;
          return (
            <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
              {people.slice(0, 3).map((p, idx) => {
                const chipColor = CALENDAR_COLORS[p.id % CALENDAR_COLORS.length];
                return (
                  <Tooltip key={`${p.id}-${idx}`} title={p.name}>
                    <li>
                      <span
                        className="vac-cal-chip"
                        style={{ background: chipColor.bg, color: chipColor.color }}
                      >
                        {p.name.split(' ')[0]}
                      </span>
                    </li>
                  </Tooltip>
                );
              })}
              {people.length > 3 && (
                <li>
                  <span className="vac-cal-chip" style={{ background: '#F3F4F6', color: '#6B7280' }}>
                    +{people.length - 3} más
                  </span>
                </li>
              )}
            </ul>
          );
        }}
      />
    </Card>
  );

  // ============================================
  // RENDER - TAB ASUETOS (HR)
  // ============================================

  const renderAsuetosTab = () => {
    const MONTHS = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];

    const holidayColumns = [
      {
        title: 'Fecha',
        key: 'fecha',
        width: 120,
        render: (_: unknown, r: Holiday) => (
          <span style={{ fontWeight: 600, color: '#0C1D3E' }}>
            {String(r.day).padStart(2, '0')} {MONTHS[r.month - 1]}
            {r.year !== 0 && (
              <Text type="secondary" style={{ fontWeight: 400, marginLeft: 4, fontSize: 12 }}>
                {r.year}
              </Text>
            )}
          </span>
        ),
      },
      {
        title: 'Nombre',
        dataIndex: 'name',
        render: (v: string) => <span style={{ color: '#374151' }}>{v}</span>,
      },
      {
        title: 'Tipo',
        key: 'tipo',
        width: 160,
        render: (_: unknown, r: Holiday) =>
          r.year === 0 ? (
            <Tag color="blue" style={{ borderRadius: 6, fontSize: 11 }}>Recurrente</Tag>
          ) : (
            <Tag color="orange" style={{ borderRadius: 6, fontSize: 11 }}>Solo {r.year}</Tag>
          ),
      },
      {
        title: '',
        key: 'acciones',
        width: 70,
        render: (_: unknown, r: Holiday) => (
          <Popconfirm
            title="¿Eliminar este asueto?"
            onConfirm={() => handleDeleteHoliday(r.id)}
            okText="Sí"
            cancelText="No"
            okButtonProps={{ danger: true }}
          >
            <Button
              size="small"
              danger
              icon={<DeleteOutlined />}
              style={{ borderRadius: 6 }}
            />
          </Popconfirm>
        ),
      },
    ];

    return (
      <div>
        <Alert
          message="Los asuetos listados aquí son descontados automáticamente del cálculo de días hábiles en las solicitudes de vacaciones."
          type="info"
          showIcon
          style={{ borderRadius: 10, marginBottom: 20 }}
        />

        {/* Agregar asueto */}
        <Card
          className="vac-form-card"
          title={
            <Space>
              <span style={{
                background: 'linear-gradient(135deg, #C9A84C, #E8CF82)',
                borderRadius: '50%', width: 26, height: 26,
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <PlusOutlined style={{ color: '#fff', fontSize: 12 }} />
              </span>
              <span>Agregar asueto</span>
            </Space>
          }
        >
          <Form form={holidayForm} layout="inline" style={{ flexWrap: 'wrap', gap: 8 }}
            initialValues={{ recurrente: false }}>
            <Form.Item
              name="fecha"
              label={<span style={{ fontWeight: 600 }}>Fecha</span>}
              rules={[{ required: true, message: 'Selecciona la fecha' }]}
            >
              <DatePicker format="DD/MM/YYYY" style={{ borderRadius: 8 }} placeholder="Seleccionar" />
            </Form.Item>
            <Form.Item
              name="name"
              label={<span style={{ fontWeight: 600 }}>Nombre</span>}
              rules={[{ required: true, message: 'Escribe el nombre' }]}
            >
              <Input placeholder="ej. Día de la Independencia" style={{ width: 240, borderRadius: 8 }} maxLength={150} />
            </Form.Item>
            <Form.Item name="recurrente" valuePropName="checked">
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontWeight: 500, color: '#374151' }}>
                <input type="checkbox" style={{ width: 15, height: 15, accentColor: '#0C1D3E' }} />
                Se repite cada año
              </label>
            </Form.Item>
            <Form.Item>
              <Button
                type="primary"
                loading={addingHoliday}
                onClick={handleAddHoliday}
                icon={<PlusOutlined />}
                style={{ background: 'linear-gradient(135deg, #0C1D3E, #1D3D7A)', border: 'none', borderRadius: 8, fontWeight: 600 }}
              >
                Agregar
              </Button>
            </Form.Item>
          </Form>
        </Card>

        {/* Lista de asuetos */}
        <Card
          className="vac-section-card"
          title={
            <Space>
              <InfoCircleOutlined style={{ color: '#C9A84C' }} />
              <span>Asuetos registrados</span>
            </Space>
          }
          extra={
            <Space>
              <Select
                value={holidayYear}
                onChange={(val) => { setHolidayYear(val); loadHolidays(val); }}
                style={{ width: 90 }}
                options={Array.from({ length: 4 }, (_, i) => {
                  const y = new Date().getFullYear() + 1 - i;
                  return { value: y, label: String(y) };
                })}
              />
              <Button icon={<ReloadOutlined />} size="small" style={{ borderRadius: 6 }}
                onClick={() => loadHolidays(holidayYear)} />
            </Space>
          }
        >
          <Table
            rowKey="id"
            loading={holidaysLoading}
            dataSource={holidays}
            columns={holidayColumns as any}
            pagination={false}
            size="middle"
            locale={{ emptyText: 'No hay asuetos registrados para este año' }}
          />
        </Card>
      </div>
    );
  };

  // ============================================
  // RENDER PRINCIPAL
  // ============================================

  const tabItems = [
    {
      key: 'mis-vacaciones',
      label: (
        <Space size={6}>
          <CalendarOutlined />
          <span>Mis Vacaciones</span>
        </Space>
      ),
      children: renderMyVacationsTab(),
    },
    ...(isHR
      ? [
          {
            key: 'gestion',
            label: (
              <Space size={6}>
                <TeamOutlined />
                <span>Gestión</span>
              </Space>
            ),
            children: renderGestionTab(),
          },
          {
            key: 'calendario',
            label: (
              <Space size={6}>
                <CalendarOutlined />
                <span>Calendario</span>
              </Space>
            ),
            children: renderCalendarTab(),
          },
          {
            key: 'asuetos',
            label: (
              <Space size={6}>
                <InfoCircleOutlined />
                <span>Asuetos</span>
              </Space>
            ),
            children: renderAsuetosTab(),
          },
        ]
      : []),
  ];

  return (
    <div className="vac-page" data-theme={themeMode} style={{ padding: '0 8px' }}>
      <style>{VAC_STYLES}</style>

      {/* Page header */}
      <div className="vac-header">
        <div className="vac-header-deco">
          <CalendarOutlined />
        </div>
        <div className="vac-header-eyebrow">Recursos Humanos</div>
        <h1 className="vac-header-title">Gestión de Vacaciones</h1>
        <div className="vac-header-sub">Consortium Legal · Administra y controla el tiempo de tu equipo</div>
      </div>

      <Tabs items={tabItems} />

      {/* Modal - Resultado import Excel */}
      <Modal
        open={importModalOpen}
        onOk={() => setImportModalOpen(false)}
        onCancel={() => setImportModalOpen(false)}
        cancelButtonProps={{ style: { display: 'none' } }}
        okText="Cerrar"
        okButtonProps={{ style: { borderRadius: 6, background: '#0C1D3E', border: 'none', fontWeight: 600 } }}
        title={
          <Space>
            <UploadOutlined style={{ color: '#059669' }} />
            <span style={{ fontWeight: 600 }}>Resultado del import</span>
          </Space>
        }
      >
        {importResult && (
          <div style={{ marginTop: 8 }}>
            <Alert
              message={`${importResult.imported} registro(s) importados correctamente`}
              type="success" showIcon style={{ borderRadius: 8, marginBottom: 12 }}
            />
            {importResult.skipped.length > 0 && (
              <>
                <Alert
                  message={`${importResult.skipped.length} fila(s) no se pudieron importar:`}
                  type="warning" showIcon style={{ borderRadius: 8, marginBottom: 8 }}
                />
                <ul style={{ paddingLeft: 20, margin: 0, fontSize: 12, color: '#6B7280' }}>
                  {importResult.skipped.map((s, i) => <li key={i}>{s}</li>)}
                </ul>
              </>
            )}
          </div>
        )}
      </Modal>

      {/* Modal - Rechazar solicitud */}
      <Modal
        open={rejectModalOpen}
        onCancel={() => {
          setRejectModalOpen(false);
          rejectForm.resetFields();
          setRejectingId(null);
        }}
        onOk={handleReject}
        okText="Rechazar"
        okButtonProps={{ danger: true, style: { borderRadius: 6, fontWeight: 600 } }}
        cancelButtonProps={{ style: { borderRadius: 6 } }}
        confirmLoading={rejectingLoading}
        title={
          <Space>
            <CloseCircleOutlined style={{ color: '#DC2626' }} />
            <span style={{ fontWeight: 600 }}>Rechazar solicitud</span>
          </Space>
        }
      >
        <Form form={rejectForm} layout="vertical" style={{ marginTop: 8 }}>
          <Form.Item name="motivo_cancelacion" label="Motivo de rechazo (opcional)">
            <Input.TextArea
              rows={4}
              placeholder="Indica el motivo del rechazo..."
              maxLength={500}
              showCount
              style={{ borderRadius: 8 }}
            />
          </Form.Item>
        </Form>
      </Modal>

      {/* Modal - Editar solicitud (RR.HH.) */}
      <Modal
        open={editModalOpen}
        onCancel={() => {
          setEditModalOpen(false);
          editForm.resetFields();
          setEditingRequest(null);
        }}
        onOk={handleHrUpdate}
        okText="Guardar cambios"
        okButtonProps={{ style: { borderRadius: 6, fontWeight: 600 } }}
        cancelButtonProps={{ style: { borderRadius: 6 } }}
        confirmLoading={editingLoading}
        title={
          <Space>
            <EditOutlined style={{ color: '#C9A84C' }} />
            <span style={{ fontWeight: 600 }}>
              Editar solicitud
              {editingRequest?.user
                ? ` — ${editingRequest.user.first_name} ${editingRequest.user.last_name}`
                : ''}
            </span>
          </Space>
        }
      >
        <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 12 }}>
          Al guardar, los días se recalculan y el saldo del empleado se ajusta automáticamente.
        </Text>
        <Form form={editForm} layout="vertical" style={{ maxWidth: 560 }}>
          <Form.Item
            name="time_off_type"
            label={<span style={{ fontWeight: 600, color: '#374151' }}>Tipo de solicitud</span>}
            rules={[{ required: true }]}
          >
            <Select options={TIME_OFF_OPTIONS} style={{ borderRadius: 8 }} />
          </Form.Item>

          <Form.Item
            name="request_type"
            label={<span style={{ fontWeight: 600, color: '#374151' }}>Duración</span>}
            rules={[{ required: true }]}
          >
            <Select options={REQUEST_TYPE_OPTIONS} style={{ borderRadius: 8 }} />
          </Form.Item>

          <Form.Item noStyle shouldUpdate={(prev, curr) => prev.request_type !== curr.request_type}>
            {({ getFieldValue }) => {
              const rqType: VacationRequestTypeValue = getFieldValue('request_type') ?? 'full_day';
              const isHourly = rqType !== 'full_day';
              return isHourly ? (
                <Row gutter={12}>
                  <Col span={12}>
                    <Form.Item name="fecha_inicio" label={<span style={{ fontWeight: 600 }}>Fecha</span>} rules={[{ required: true }]}>
                      <DatePicker style={{ width: '100%', borderRadius: 8 }} format="DD/MM/YYYY" />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item name="hora_inicio" label={<span style={{ fontWeight: 600 }}>Hora de inicio</span>} rules={[{ required: true }]}>
                      <TimePicker style={{ width: '100%', borderRadius: 8 }} format="HH:mm" minuteStep={15} />
                    </Form.Item>
                  </Col>
                </Row>
              ) : (
                <Form.Item name="rango" label={<span style={{ fontWeight: 600 }}>Rango de fechas</span>} rules={[{ required: true }]}>
                  <RangePicker style={{ width: '100%', borderRadius: 8 }} format="DD/MM/YYYY" />
                </Form.Item>
              );
            }}
          </Form.Item>

          <Form.Item name="comentarios" label={<span style={{ fontWeight: 600, color: '#374151' }}>Comentarios <Text type="secondary" style={{ fontWeight: 400 }}>(opcional)</Text></span>}>
            <Input.TextArea rows={2} maxLength={500} showCount style={{ borderRadius: 8 }} />
          </Form.Item>
        </Form>
      </Modal>

      {/* Modal - Anular solicitud (RR.HH.) */}
      <Modal
        open={hrCancelModalOpen}
        onCancel={() => {
          setHrCancelModalOpen(false);
          hrCancelForm.resetFields();
          setHrCancelingId(null);
        }}
        onOk={handleHrCancel}
        okText="Anular solicitud"
        okButtonProps={{ danger: true, style: { borderRadius: 6, fontWeight: 600 } }}
        cancelButtonProps={{ style: { borderRadius: 6 } }}
        confirmLoading={hrCancelingLoading}
        title={
          <Space>
            <StopOutlined style={{ color: '#DC2626' }} />
            <span style={{ fontWeight: 600 }}>Anular solicitud</span>
          </Space>
        }
      >
        <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 12 }}>
          Esto anula la solicitud (incluso si ya estaba aprobada) y devuelve los días al saldo del empleado.
        </Text>
        <Form form={hrCancelForm} layout="vertical" style={{ marginTop: 8 }}>
          <Form.Item name="motivo_cancelacion" label="Motivo de anulación (opcional)">
            <Input.TextArea
              rows={4}
              placeholder="Indica el motivo de la anulación..."
              maxLength={500}
              showCount
              style={{ borderRadius: 8 }}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default VacacionesPage;
