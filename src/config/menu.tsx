// src/config/menu.tsx
// Configuración declarativa del menú lateral. Fuente única de verdad para la
// navegación: agregar un módulo es añadir un nodo aquí, no tocar el layout.
import type { ReactNode } from 'react';
import {
  HomeOutlined,
  ScheduleOutlined,
  DollarOutlined,
  FileTextOutlined,
  MailOutlined,
  FolderOpenOutlined,
  FileProtectOutlined,
  FileDoneOutlined,
  PushpinOutlined,
  FileSearchOutlined,
  FileAddOutlined,
  ClockCircleOutlined,
  SolutionOutlined,
  AuditOutlined,
  UnorderedListOutlined,
  PlusCircleOutlined,
  UserOutlined,
  SettingOutlined,
  UploadOutlined,
  BankOutlined,
  ReadOutlined,
  CalendarOutlined,
  BarChartOutlined,
} from '@ant-design/icons';
import type { ModuleKey } from '../types/module-access.types';

/** Capacidades del usuario que deciden la visibilidad de cada nodo. */
export interface MenuCaps {
  hasModule: (key: ModuleKey) => boolean;
  canCreateEncargo: boolean;
  canSeeAsignados: boolean;
  canSeeReport: boolean;
  canAccessUserAdmin: boolean;
}

/**
 * Un nodo del menú. `key` es la ruta (hojas, empieza con "/") o un id de grupo
 * (padres). `visible` filtra por capacidades; si se omite, el nodo es visible.
 */
export interface NavItem {
  key: string;
  label: string;
  icon?: ReactNode;
  visible?: (caps: MenuCaps) => boolean;
  children?: NavItem[];
}

export const MENU: NavItem[] = [
  {
    key: 'admin',
    label: 'Administración',
    icon: <SettingOutlined />,
    visible: (c) => c.canAccessUserAdmin && c.hasModule('usuarios'),
    children: [
      { key: '/dashboard/admin/users', label: 'Gestión de Usuarios', icon: <UserOutlined /> },
    ],
  },
  {
    key: 'agendador',
    label: 'Agendador',
    icon: <ScheduleOutlined />,
    visible: (c) => c.hasModule('control_plazos'),
    children: [
      { key: '/dashboard/agendador', label: 'Lista' },
      { key: '/dashboard/agendador/crear', label: 'Crear' },
      { key: '/dashboard/agendador/feriados', label: 'Lista de feriados' },
      { key: '/dashboard/agendador/feriados/crear', label: 'Crear feriado' },
      { key: '/dashboard/agendador/calendario', label: 'Calendario' },
    ],
  },
  {
    key: 'autorizacion-cheques',
    label: 'Contabilidad',
    icon: <BankOutlined />,
    visible: (c) => c.hasModule('contabilidad') || c.hasModule('autorizacion_cheques'),
    children: [
      { key: '/dashboard/autorizacion-cheques/cargar', label: 'Cargar cheques', icon: <UploadOutlined /> },
      { key: '/dashboard/autorizacion-cheques/lista', label: 'Lista de cheques', icon: <UnorderedListOutlined /> },
    ],
  },
  {
    key: 'appointments',
    label: 'Control de nombramientos',
    icon: <SolutionOutlined />,
    visible: (c) => c.hasModule('actas'),
    children: [
      { key: '/dashboard/appointments', label: 'Listar actas', icon: <FileSearchOutlined /> },
      { key: '/dashboard/appointments/create', label: 'Crear acta', icon: <FileAddOutlined /> },
      { key: '/dashboard/appointments/asambleas', label: 'Asambleas', icon: <BankOutlined /> },
    ],
  },
  { key: '/dashboard', label: 'Dashboard', icon: <HomeOutlined /> },
  {
    key: 'clientes',
    label: 'Fichas de creación de clientes',
    icon: <UserOutlined />,
    visible: (c) => c.hasModule('clientes'),
    children: [
      { key: '/dashboard/clientes', label: 'Lista de clientes', icon: <UnorderedListOutlined /> },
      { key: '/dashboard/clientes/crear', label: 'Crear cliente', icon: <FileAddOutlined /> },
      { key: '/dashboard/casos/solicitudes', label: 'Solicitudes de casos', icon: <FileSearchOutlined /> },
      { key: '/dashboard/casos/crear-solicitud', label: 'Crear caso', icon: <PlusCircleOutlined /> },
    ],
  },
  {
    key: 'cheques',
    label: 'Gestión de cheques',
    icon: <FolderOpenOutlined />,
    visible: (c) => c.hasModule('cheques') || c.hasModule('autorizacion_cheques'),
    children: [
      { key: '/dashboard/cheques/autorizacion', label: 'Autorización', icon: <FileProtectOutlined /> },
      { key: '/dashboard/cheques/liquidacion', label: 'Liquidación', icon: <DollarOutlined /> },
      { key: '/dashboard/cheques/liquidados', label: 'Liquidados', icon: <FileDoneOutlined /> },
      { key: '/dashboard/cheques/inmobiliario', label: 'Gastos inmobiliarios', icon: <FileTextOutlined />, visible: (c) => c.hasModule('cheques_inmobiliario') },
      { key: '/dashboard/cheques/litigio', label: 'Gastos litigio', icon: <FileTextOutlined />, visible: (c) => c.hasModule('cheques_litigio') },
      { key: '/dashboard/cheques/pendientes', label: 'Cheques pendientes', icon: <PushpinOutlined />, visible: (c) => c.hasModule('cheques_antiguos') },
    ],
  },
  {
    key: 'mensajeria',
    label: 'Mensajería',
    icon: <MailOutlined />,
    visible: (c) => c.hasModule('encargos'),
    children: [
      { key: '/dashboard/mensajeria/crear', label: 'Crear envío', icon: <PlusCircleOutlined />, visible: (c) => c.canCreateEncargo },
      { key: '/dashboard/mensajeria', label: 'Envíos pendientes', icon: <ClockCircleOutlined /> },
      { key: '/dashboard/mensajeria/todos', label: 'Todos los envíos', icon: <UnorderedListOutlined /> },
      { key: '/dashboard/mensajeria/asignados', label: 'Envíos asignados', icon: <FileProtectOutlined />, visible: (c) => c.canSeeAsignados },
      { key: '/dashboard/mensajeria/dashboard', label: 'Dashboard', icon: <AuditOutlined /> },
    ],
  },
  {
    key: 'notificaciones',
    label: 'Notificaciones',
    icon: <MailOutlined />,
    visible: (c) => c.hasModule('notificaciones'),
    children: [
      { key: '/dashboard/notificaciones/crear', label: 'Crear notificación' },
      { key: '/dashboard/notificaciones', label: 'Listado de notificaciones' },
      { key: '/dashboard/notificaciones/entregadas', label: 'Pendientes de entrega' },
    ],
  },
  {
    key: 'documentos',
    label: 'Documentos',
    icon: <FileTextOutlined />,
    children: [
      { key: '/dashboard/documentos/crear', label: 'Crear documento', icon: <FileAddOutlined /> },
      { key: '/dashboard/documentos', label: 'Pendientes', icon: <FileSearchOutlined /> },
      { key: '/dashboard/documentos/entregados', label: 'Entregados', icon: <FileDoneOutlined /> },
    ],
  },
  {
    key: 'recibos',
    label: 'Recibos de Caja',
    icon: <DollarOutlined />,
    visible: (c) => c.hasModule('recibos_caja'),
    children: [
      { key: '/dashboard/recibos/crear', label: 'Crear recibo' },
      { key: '/dashboard/recibos/listar', label: 'Ver recibos' },
    ],
  },
  {
    key: 'cargability',
    label: 'Reportes cargabilidad',
    icon: <ClockCircleOutlined />,
    visible: (c) => c.hasModule('cargabilidad'),
    children: [
      { key: '/dashboard/cargability/upload', label: 'Subir reporte' },
      { key: '/dashboard/cargability/users', label: 'Lista de usuarios' },
    ],
  },
  {
    key: 'informe-socios',
    label: 'Reportes socios',
    icon: <BarChartOutlined />,
    visible: (c) => c.hasModule('informe_socios'),
    children: [
      { key: '/dashboard/informe-socios', label: 'Generar reportes' },
      { key: '/dashboard/informe-socios/importar', label: 'Importar datos' },
      { key: '/dashboard/informe-socios/datos', label: 'Datos importados' },
      { key: '/dashboard/informe-socios/socios', label: 'Gestión de socios' },
    ],
  },
  {
    key: 'reservaciones',
    label: 'Reservación de salas',
    icon: <ScheduleOutlined />,
    visible: (c) => c.hasModule('reservas_salas'),
    children: [
      { key: '/dashboard/reservaciones', label: 'Calendario' },
      { key: '/dashboard/reservaciones/crear', label: 'Crear reserva' },
      { key: '/dashboard/reservaciones/listar', label: 'Listar reservas' },
      { key: '/dashboard/reservaciones/reporte-exclusivo', label: 'Reporte exclusivo', icon: <FileTextOutlined />, visible: (c) => c.canSeeReport },
    ],
  },
  {
    key: 'procuration',
    label: 'Delegación de procuración',
    icon: <AuditOutlined />,
    visible: (c) => c.hasModule('procuracion'),
    children: [
      { key: '/dashboard/procuration', label: 'Listar procuraciones', icon: <UnorderedListOutlined /> },
      { key: '/dashboard/procuration/create', label: 'Crear procuracion', icon: <PlusCircleOutlined /> },
    ],
  },
  {
    key: 'recursos-humanos',
    label: 'Recursos Humanos',
    icon: <SolutionOutlined />,
    visible: (c) => c.hasModule('recursos_humanos'),
    children: [
      { key: '/dashboard/recursos-humanos', label: 'General', icon: <SolutionOutlined /> },
      { key: '/dashboard/recursos-humanos/vacaciones', label: 'Vacaciones', icon: <CalendarOutlined /> },
    ],
  },
  {
    key: 'money-req-submenu',
    label: 'Requerimientos de dinero',
    icon: <DollarOutlined />,
    visible: (c) => c.hasModule('solicitudes_dinero'),
    children: [
      { key: '/dashboard/money-req', label: 'Listar requerimientos' },
      { key: '/dashboard/money-req/create', label: 'Crear requerimiento', icon: <PlusCircleOutlined /> },
    ],
  },
  { key: '/dashboard/mis-cheques', label: 'Mis cheques', icon: <DollarOutlined /> },
  {
    key: 'casos',
    label: 'Control de casos',
    icon: <FileTextOutlined />,
    visible: (c) => c.hasModule('expedientes_judiciales'),
    children: [
      { key: '/dashboard/casos', label: 'Ver casos', icon: <FileTextOutlined /> },
      { key: '/dashboard/casos/crear', label: 'Crear caso', icon: <FileAddOutlined /> },
    ],
  },
  {
    key: 'jurisprudencia',
    label: 'Jurisprudencia',
    icon: <ReadOutlined />,
    children: [
      { key: '/dashboard/jurisprudencia/panel', label: 'Panel & métricas', icon: <AuditOutlined /> },
      { key: '/dashboard/jurisprudencia', label: 'Archivo de sentencias', icon: <FileSearchOutlined /> },
      { key: '/dashboard/jurisprudencia/crear', label: 'Registrar sentencia', icon: <FileAddOutlined /> },
    ],
  },
];

/** Convierte la config declarativa en items de AntD Menu, filtrando por caps. */
export type AntdMenuItem = {
  key: string;
  label: ReactNode;
  icon?: ReactNode;
  children?: AntdMenuItem[];
};

export const buildMenuItems = (nodes: NavItem[], caps: MenuCaps): AntdMenuItem[] =>
  nodes
    .filter((n) => !n.visible || n.visible(caps))
    .map((n) => {
      const item: AntdMenuItem = { key: n.key, label: n.label };
      if (n.icon) item.icon = n.icon;
      if (n.children) item.children = buildMenuItems(n.children, caps);
      return item;
    });
