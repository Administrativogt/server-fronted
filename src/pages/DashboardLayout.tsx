// src/pages/DashboardLayout.tsx
import React, { useEffect, useState } from 'react';
import { Layout, Menu, Button, Switch, Tooltip, Grid, theme as antdTheme } from 'antd';
import {
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  HomeOutlined,
  ScheduleOutlined,
  DollarOutlined,
  FileTextOutlined,
  LogoutOutlined,
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
  SunOutlined,
  MoonOutlined,
  UploadOutlined,
  BankOutlined,
  ReadOutlined,
  CalendarOutlined,
  BarChartOutlined,
} from '@ant-design/icons';
import { useNavigate, Outlet, useLocation } from 'react-router-dom';
import useAuthStore from '../auth/useAuthStore';
import useThemeStore from '../hooks/useThemeStore';
import api from '../api/axios';
import { useUserAdminPermissions } from '../hooks/usePermissions';
import type { ModuleKey } from '../types/module-access.types';

import logoLight from '../assets/logo-cosortium.png';
import logoDark from '../assets/logo-dark.png';

const { Header, Sider, Content, Footer } = Layout;

const DashboardLayout: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [openKeys, setOpenKeys] = useState<string[]>([]);
  const [canSeeReport, setCanSeeReport] = useState<boolean | null>(null);

  const themeMode = useThemeStore((s) => s.mode);
  const toggleTheme = useThemeStore((s) => s.toggleTheme);
  const isDark = themeMode === 'dark';

  // Responsive: en pantallas < lg (992px) el sidebar se vuelve off-canvas
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.lg;

  // Auto-colapsar al entrar a móvil; auto-expandir al volver a escritorio
  useEffect(() => {
    setCollapsed(isMobile);
  }, [isMobile]);

  const {
    token: { colorBgContainer, borderRadiusLG, colorBgLayout },
  } = antdTheme.useToken();

  const navigate = useNavigate();
  const location = useLocation();
  const logout = useAuthStore((s) => s.logout);
  const username = useAuthStore((s) => s.username);
  const tipoUsuario = useAuthStore((s) => s.tipo_usuario);
  const modules = useAuthStore((s) => s.modules);

  const canSeeAsignados = tipoUsuario === 8 || username === 'ESC002' || username === 'BAR008';
  const canCreateEncargo = tipoUsuario !== 8; // ✅ Mensajeros NO pueden crear encargos
  const { canAccessUserAdmin } = useUserAdminPermissions(); // ✅ Permisos de administración
  const hasModule = (moduleKey: ModuleKey) =>
    modules.some((module) => module.key === moduleKey);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { data } = await api.get<{ canSeeReport: boolean }>('/room-reservations/report/can');
        if (mounted) setCanSeeReport(!!data?.canSeeReport);
      } catch {
        if (mounted) setCanSeeReport(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getMenuItems = () => {
    const items = [
      {
        key: "/dashboard",
        icon: <HomeOutlined />,
        label: "Dashboard",
        onClick: () => navigate('/dashboard')
      },
      {
        key: "/dashboard/mis-cheques",
        icon: <DollarOutlined />,
        label: "Mis cheques",
        onClick: () => navigate('/dashboard/mis-cheques'),
      },
      {
        key: "agendador",
        icon: <ScheduleOutlined />,
        label: "Agendador",
        children: [
          {
            key: "/dashboard/agendador",
            label: "Lista",
            onClick: () => navigate('/dashboard/agendador')
          },
          {
            key: "/dashboard/agendador/crear",
            label: "Crear",
            onClick: () => navigate('/dashboard/agendador/crear')
          },
          {
            key: "/dashboard/agendador/feriados",
            label: "Lista de feriados",
            onClick: () => navigate('/dashboard/agendador/feriados')
          },
          {
            key: "/dashboard/agendador/feriados/crear",
            label: "Crear feriado",
            onClick: () => navigate('/dashboard/agendador/feriados/crear')
          },
          {
            key: "/dashboard/agendador/calendario",
            label: "Calendario",
            onClick: () => navigate('/dashboard/agendador/calendario')
          }
        ]
      },
      {
        key: "autorizacion-cheques",
        icon: <BankOutlined />,
        label: "Contabilidad",
        children: [
          {
            key: "/dashboard/autorizacion-cheques/cargar",
            icon: <UploadOutlined />,
            label: "Cargar cheques",
            onClick: () => navigate('/dashboard/autorizacion-cheques/cargar'),
          },
          {
            key: "/dashboard/autorizacion-cheques/lista",
            icon: <UnorderedListOutlined />,
            label: "Lista de cheques",
            onClick: () => navigate('/dashboard/autorizacion-cheques/lista'),
          },
        ],
      },
      {
        key: "cheques",
        icon: <FolderOpenOutlined />,
        label: "Gestión de cheques",
        children: [
          {
            key: "/dashboard/cheques/autorizacion",
            icon: <FileProtectOutlined />,
            label: "Autorización",
            onClick: () => navigate('/dashboard/cheques/autorizacion')
          },
          {
            key: "/dashboard/cheques/liquidacion",
            icon: <DollarOutlined />,
            label: "Liquidación",
            onClick: () => navigate('/dashboard/cheques/liquidacion')
          },
          {
            key: "/dashboard/cheques/liquidados",
            icon: <FileDoneOutlined />,
            label: "Liquidados",
            onClick: () => navigate('/dashboard/cheques/liquidados')
          },
          {
            key: "/dashboard/cheques/inmobiliario",
            icon: <FileTextOutlined />,
            label: "Gastos inmobiliarios",
            onClick: () => navigate('/dashboard/cheques/inmobiliario')
          },
          {
            key: "/dashboard/cheques/litigio",
            icon: <FileTextOutlined />,
            label: "Gastos litigio",
            onClick: () => navigate('/dashboard/cheques/litigio')
          },
          {
            key: "/dashboard/cheques/pendientes",
            icon: <PushpinOutlined />,
            label: "Cheques pendientes",
            onClick: () => navigate('/dashboard/cheques/pendientes')
          }
        ]
      },
      {
        key: "casos",
        icon: <FileTextOutlined />,
        label: "Control de casos",
        children: [
          {
            key: "/dashboard/casos",
            icon: <FileTextOutlined />,
            label: "Ver casos",
            onClick: () => navigate('/dashboard/casos')
          },
          {
            key: "/dashboard/casos/crear",
            icon: <FileAddOutlined />,
            label: "Crear caso",
            onClick: () => navigate('/dashboard/casos/crear')
          },
        ],
      },
      {
        key: "recursos-humanos",
        icon: <SolutionOutlined />,
        label: "Recursos Humanos",
        children: [
          {
            key: "/dashboard/recursos-humanos",
            icon: <SolutionOutlined />,
            label: "General",
            onClick: () => navigate('/dashboard/recursos-humanos'),
          },
          {
            key: "/dashboard/recursos-humanos/vacaciones",
            icon: <CalendarOutlined />,
            label: "Vacaciones",
            onClick: () => navigate('/dashboard/recursos-humanos/vacaciones'),
          },
        ],
      },
      {
        key: "mensajeria",
        icon: <MailOutlined />,
        label: "Mensajería",
        children: [
          // ✅ VALIDACIÓN #12: "Crear envío" - Solo para admins/coordinadores
          ...(canCreateEncargo ? [{
            key: "/dashboard/mensajeria/crear",
            icon: <PlusCircleOutlined />,
            label: "Crear envío",
            onClick: () => navigate('/dashboard/mensajeria/crear')
          }] : []),
          {
            key: "/dashboard/mensajeria",
            icon: <ClockCircleOutlined />,
            label: "Envíos pendientes",
            onClick: () => navigate('/dashboard/mensajeria')
          },
          {
            key: "/dashboard/mensajeria/todos",
            icon: <UnorderedListOutlined />,
            label: "Todos los envíos",
            onClick: () => navigate('/dashboard/mensajeria/todos')
          },
          ...(canSeeAsignados ? [{
            key: "/dashboard/mensajeria/asignados",
            icon: <FileProtectOutlined />,
            label: "Envíos asignados",
            onClick: () => navigate('/dashboard/mensajeria/asignados')
          }] : []),
          {
            key: "/dashboard/mensajeria/dashboard",
            icon: <AuditOutlined />,
            label: "Dashboard",
            onClick: () => navigate('/dashboard/mensajeria/dashboard')
          }
        ]
      },
      {
        key: "clientes",
        icon: <UserOutlined />,
        label: "Clientes",
        children: [
          {
            key: "/dashboard/clientes",
            icon: <UnorderedListOutlined />,
            label: "Lista de clientes",
            onClick: () => navigate('/dashboard/clientes')
          },
          {
            key: "/dashboard/clientes/crear",
            icon: <FileAddOutlined />,
            label: "Crear cliente",
            onClick: () => navigate('/dashboard/clientes/crear')
          },
          {
            key: "/dashboard/casos/solicitudes",
            icon: <FileSearchOutlined />,
            label: "Solicitudes de casos",
            onClick: () => navigate('/dashboard/casos/solicitudes')
          },
          {
            key: "/dashboard/casos/crear-solicitud",
            icon: <PlusCircleOutlined />,
            label: "Crear caso",
            onClick: () => navigate('/dashboard/casos/crear-solicitud')
          }
        ]
      },
      {
        key: "reservaciones",
        icon: <ScheduleOutlined />,
        label: "Reservaciones",
        children: [
          {
            key: "/dashboard/reservaciones",
            label: "Calendario",
            onClick: () => navigate('/dashboard/reservaciones')
          },
          {
            key: "/dashboard/reservaciones/crear",
            label: "Crear reserva",
            onClick: () => navigate('/dashboard/reservaciones/crear')
          },
          {
            key: "/dashboard/reservaciones/listar",
            label: "Listar reservas",
            onClick: () => navigate('/dashboard/reservaciones/listar')
          },
          ...(canSeeReport === true ? [{
            key: "/dashboard/reservaciones/reporte-exclusivo",
            icon: <FileTextOutlined />,
            label: "Reporte exclusivo",
            onClick: () => navigate('/dashboard/reservaciones/reporte-exclusivo')
          }] : [])
        ]
      },
      {
        key: "cargability",
        icon: <ClockCircleOutlined />,
        label: "Cargabilidad",
        children: [
          {
            key: "/dashboard/cargability/upload",
            label: "Subir reporte",
            onClick: () => navigate('/dashboard/cargability/upload')
          },
          {
            key: "/dashboard/cargability/users",
            label: "Lista de usuarios",
            onClick: () => navigate('/dashboard/cargability/users')
          }
        ]
      },
      {
        key: "informe-socios",
        icon: <BarChartOutlined />,
        label: "Informe Socios",
        children: [
          {
            key: "/dashboard/informe-socios",
            label: "Generar reportes",
            onClick: () => navigate('/dashboard/informe-socios')
          },
          {
            key: "/dashboard/informe-socios/importar",
            label: "Importar datos",
            onClick: () => navigate('/dashboard/informe-socios/importar')
          },
          {
            key: "/dashboard/informe-socios/datos",
            label: "Datos importados",
            onClick: () => navigate('/dashboard/informe-socios/datos')
          },
          {
            key: "/dashboard/informe-socios/socios",
            label: "Gestión de socios",
            onClick: () => navigate('/dashboard/informe-socios/socios')
          }
        ]
      },
      {
        key: "documentos",
        icon: <FileTextOutlined />,
        label: "Documentos",
        children: [
          {
            key: "/dashboard/documentos/crear",
            icon: <FileAddOutlined />,
            label: "Crear documento",
            onClick: () => navigate('/dashboard/documentos/crear')
          },
          {
            key: "/dashboard/documentos",
            icon: <FileSearchOutlined />,
            label: "Pendientes",
            onClick: () => navigate('/dashboard/documentos')
          },
          {
            key: "/dashboard/documentos/entregados",
            icon: <FileDoneOutlined />,
            label: "Entregados",
            onClick: () => navigate('/dashboard/documentos/entregados')
          }
        ]
      },
      {
        key: "notificaciones",
        icon: <MailOutlined />,
        label: "Notificaciones",
        children: [
          {
            key: "/dashboard/notificaciones/crear",
            label: "Crear notificación",
            onClick: () => navigate('/dashboard/notificaciones/crear')
          },
          {
            key: "/dashboard/notificaciones",
            label: "Listado de notificaciones",
            onClick: () => navigate('/dashboard/notificaciones')
          },
          {
            key: "/dashboard/notificaciones/entregadas",
            label: "Pendientes de entrega",
            onClick: () => navigate('/dashboard/notificaciones/entregadas')
          }
        ]
      },
      {
        key: "recibos",
        icon: <DollarOutlined />,
        label: "Recibos de Caja",
        children: [
          {
            key: "/dashboard/recibos/crear",
            label: "Crear recibo",
            onClick: () => navigate('/dashboard/recibos/crear')
          },
          {
            key: "/dashboard/recibos/listar",
            label: "Ver recibos",
            onClick: () => navigate('/dashboard/recibos/listar')
          }
        ]
      },
      {
        key: "money-req-submenu",
        icon: <DollarOutlined />,
        label: "Requerimientos de dinero",
        children: [
          {
            key: "/dashboard/money-req",
            label: "Listar requerimientos",
            onClick: () => navigate('/dashboard/money-req')
          },
          {
            key: "/dashboard/money-req/create",
            icon: <PlusCircleOutlined />,
            label: "Crear requerimiento",
            onClick: () => navigate('/dashboard/money-req/create')
          }
        ]
      },
      // ✨ NUEVO - Módulo de Actas de Nombramiento
      {
        key: "appointments",
        icon: <SolutionOutlined />,
        label: "Actas de Nombramiento",
        children: [
          {
            key: "/dashboard/appointments",
            icon: <FileSearchOutlined />,
            label: "Listar actas",
            onClick: () => navigate('/dashboard/appointments')
          },
          {
            key: "/dashboard/appointments/create",
            icon: <FileAddOutlined />,
            label: "Crear acta",
            onClick: () => navigate('/dashboard/appointments/create')
          },
          {
            key: "/dashboard/appointments/asambleas",
            icon: <BankOutlined />,
            label: "Asambleas",
            onClick: () => navigate('/dashboard/appointments/asambleas')
          }
        ]
      },
      // Módulo de Control de Procuraciones
      {
        key: "procuration",
        icon: <AuditOutlined />,
        label: "Control Procuraciones",
        children: [
          {
            key: "/dashboard/procuration",
            icon: <UnorderedListOutlined />,
            label: "Listar procuraciones",
            onClick: () => navigate('/dashboard/procuration')
          },
          {
            key: "/dashboard/procuration/create",
            icon: <PlusCircleOutlined />,
            label: "Crear procuracion",
            onClick: () => navigate('/dashboard/procuration/create')
          }
        ]
      },
      // ✨ NUEVO - Módulo de Jurisprudencia
      {
        key: "jurisprudencia",
        icon: <ReadOutlined />,
        label: "Jurisprudencia",
        children: [
          {
            key: "/dashboard/jurisprudencia/panel",
            icon: <AuditOutlined />,
            label: "Panel & métricas",
            onClick: () => navigate('/dashboard/jurisprudencia/panel')
          },
          {
            key: "/dashboard/jurisprudencia",
            icon: <FileSearchOutlined />,
            label: "Archivo de sentencias",
            onClick: () => navigate('/dashboard/jurisprudencia')
          },
          {
            key: "/dashboard/jurisprudencia/crear",
            icon: <FileAddOutlined />,
            label: "Registrar sentencia",
            onClick: () => navigate('/dashboard/jurisprudencia/crear')
          }
        ]
      },
      // ✅ NUEVO: Menú de Administración (solo para superadmins y Pedro Luis)
      ...(canAccessUserAdmin ? [{
        key: "admin",
        icon: <SettingOutlined />,
        label: "Administración",
        children: [
          {
            key: "/dashboard/admin/users",
            icon: <UserOutlined />,
            label: "Gestión de Usuarios",
            onClick: () => navigate('/dashboard/admin/users')
          }
        ]
      }] : [])
    ];

    return items.filter((item: any) => {
      switch (item.key) {
        case 'mensajeria':
          return hasModule('encargos');
        case 'reservaciones':
          return hasModule('reservas_salas');
        case '/dashboard/casos':
        case '/dashboard/casos/crear':
          return hasModule('expedientes_judiciales');
        case 'clientes':
          return hasModule('clientes');
        case 'notificaciones':
          return hasModule('notificaciones');
        case 'recibos':
          return hasModule('recibos_caja');
        case 'money-req-submenu':
          return hasModule('solicitudes_dinero');
        case 'appointments':
          return hasModule('actas');
        case 'procuration':
          return hasModule('procuracion');
        case 'cheques':
          return hasModule('cheques') || hasModule('autorizacion_cheques');
        case 'autorizacion-cheques':
          return hasModule('contabilidad') || hasModule('autorizacion_cheques');
        case 'cargability':
          return hasModule('cargabilidad');
        case 'informe-socios':
          return hasModule('informe_socios');
        case 'admin':
          return canAccessUserAdmin && hasModule('usuarios');
        case 'recursos-humanos':
          return hasModule('recursos_humanos');
        default:
          return true;
      }
    });
  };

  /* Mejora UX en modo colapsado:
     - Tooltip con el nombre al pasar el mouse sobre el icono de un submenú.
     - Al hacer click en un padre colapsado: expande la barra y abre ese submenú
       (antes el click no hacía nada; AntD solo abría el flyout con hover). */
  const decorateForCollapsed = (items: any[]): any[] =>
    items.map((item) => {
      if (item && item.children && item.children.length) {
        return {
          ...item,
          icon: collapsed ? (
            <Tooltip title={item.label} placement="right" mouseEnterDelay={0.15}>
              <span style={{ display: 'inline-flex' }}>{item.icon}</span>
            </Tooltip>
          ) : (
            item.icon
          ),
          onTitleClick: () => {
            if (collapsed) {
              setCollapsed(false);
              setOpenKeys([item.key]);
            }
          },
        };
      }
      return item; // hoja: AntD ya muestra tooltip y navega al click
    });

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider
        trigger={null}
        collapsible
        collapsed={collapsed}
        theme={isDark ? 'dark' : 'light'}
        width={250}
        collapsedWidth={isMobile ? 0 : 80}
        style={{
          position: 'fixed',
          insetInlineStart: 0,
          top: 0,
          bottom: 0,
          height: '100vh',
          overflow: 'auto',
          zIndex: 100,
        }}
      >
        <div style={{ height: 64, margin: '16px', textAlign: 'center' }}>
          <img
            src={isDark ? logoDark : logoLight}
            alt="Consortium Legal Logo"
            style={{ maxWidth: '100%', height: 40, objectFit: 'contain' }}
          />
        </div>

        <Menu
          theme={isDark ? 'dark' : 'light'}
          mode="inline"
          selectedKeys={[location.pathname]}
          openKeys={collapsed ? [] : openKeys}
          onOpenChange={(keys) => setOpenKeys(keys.slice(-1))}
          onClick={() => { if (isMobile) setCollapsed(true); }}
          items={decorateForCollapsed(getMenuItems())}
        />
      </Sider>

      {/* Overlay para cerrar el menú al tocar fuera (solo móvil con menú abierto) */}
      {isMobile && !collapsed && (
        <div
          onClick={() => setCollapsed(true)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.45)',
            zIndex: 90,
          }}
        />
      )}

      <Layout
        style={{
          background: colorBgLayout,
          marginInlineStart: isMobile ? 0 : collapsed ? 80 : 250,
          transition: 'margin-inline-start 0.2s',
        }}
      >
        <Header
          style={{
            padding: '0 16px',
            background: colorBgContainer,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            position: 'sticky',
            top: 0,
            zIndex: 10,
            width: '100%',
          }}
        >
          <Button
            type="text"
            icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            onClick={() => setCollapsed((c) => !c)}
            style={{ fontSize: 16, width: 64, height: 64 }}
          />
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <Switch
              checked={isDark}
              onChange={toggleTheme}
              checkedChildren={<MoonOutlined />}
              unCheckedChildren={<SunOutlined />}
            />
            <span style={{ fontWeight: 'bold' }}>
              {username || 'Usuario'}
            </span>
            <Button
              type="primary"
              danger
              icon={<LogoutOutlined />}
              onClick={handleLogout}
            >
              Cerrar sesión
            </Button>
          </div>
        </Header>

        <Content
          style={{
            margin: '24px 16px',
            padding: 24,
            minHeight: 280,
            background: colorBgContainer,
            borderRadius: borderRadiusLG,
            overflowX: 'auto',
          }}
        >
          <Outlet />
        </Content>

        <Footer style={{ textAlign: 'center', background: 'transparent' }}>
          © {new Date().getFullYear()} Consortium Legal
        </Footer>
      </Layout>
    </Layout>
  );
};

export default DashboardLayout;
