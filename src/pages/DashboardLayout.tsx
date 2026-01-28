// src/pages/DashboardLayout.tsx
import React, { useEffect, useState } from 'react';
import { Layout, Menu, Button, Switch, theme as antdTheme } from 'antd';
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
} from '@ant-design/icons';
import { useNavigate, Outlet, useLocation } from 'react-router-dom';
import useAuthStore from '../auth/useAuthStore';
import api from '../api/axios';

import logoLight from '../assets/logo-cosortium.png';
import logoDark from '../assets/logo-dark.png';

const { Header, Sider, Content, Footer } = Layout;

const DashboardLayout: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [siderTheme, setSiderTheme] = useState<'light' | 'dark'>('dark');
  const [canSeeReport, setCanSeeReport] = useState<boolean | null>(null);

  const {
    token: { colorBgContainer, borderRadiusLG },
  } = antdTheme.useToken();

  const navigate = useNavigate();
  const location = useLocation();
  const logout = useAuthStore((s) => s.logout);
  const username = useAuthStore((s) => s.username);
  const tipoUsuario = useAuthStore((s) => s.tipo_usuario);

  const canSeeAsignados = tipoUsuario === 8 || username === 'ESC002' || username === 'BAR008';

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
        key: "/agenda",
        icon: <ScheduleOutlined />,
        label: "Agendador",
        onClick: () => navigate('/agenda')
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
            key: "/dashboard/cheques/pendientes",
            icon: <PushpinOutlined />,
            label: "Cheques pendientes",
            onClick: () => navigate('/dashboard/cheques/pendientes')
          }
        ]
      },
      {
        key: "/dashboard/casos",
        icon: <FileTextOutlined />,
        label: "Control de casos",
        onClick: () => navigate('/dashboard/casos')
      },
      {
        key: "/dashboard/casos/crear",
        icon: <FileAddOutlined />,
        label: "Crear caso",
        onClick: () => navigate('/dashboard/casos/crear')
      },
      {
        key: "/dashboard/recursos-humanos",
        icon: <SolutionOutlined />,
        label: "Recursos humanos",
        onClick: () => navigate('/dashboard/recursos-humanos')
      },
      {
        key: "mensajeria",
        icon: <MailOutlined />,
        label: "Mensajería",
        children: [
          {
            key: "/dashboard/mensajeria",
            label: "Envíos pendientes",
            onClick: () => navigate('/dashboard/mensajeria')
          },
          {
            key: "/dashboard/mensajeria/crear",
            label: "Crear envío",
            onClick: () => navigate('/dashboard/mensajeria/crear')
          },
          {
            key: "/dashboard/mensajeria/todos",
            label: "Todos los envíos",
            onClick: () => navigate('/dashboard/mensajeria/todos')
          },
          ...(canSeeAsignados ? [{
            key: "/dashboard/mensajeria/asignados",
            label: "Envíos asignados",
            onClick: () => navigate('/dashboard/mensajeria/asignados')
          }] : []),
          {
            key: "/dashboard/mensajeria/dashboard",
            label: "Dashboard",
            onClick: () => navigate('/dashboard/mensajeria/dashboard')
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
        key: "documentos",
        icon: <FileTextOutlined />,
        label: "Documentos",
        children: [
          {
            key: "/dashboard/documentos",
            icon: <FileSearchOutlined />,
            label: "Pendientes",
            onClick: () => navigate('/dashboard/documentos')
          },
          {
            key: "/dashboard/documentos/crear",
            icon: <FileAddOutlined />,
            label: "Crear documento",
            onClick: () => navigate('/dashboard/documentos/crear')
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
            key: "/dashboard/notificaciones",
            label: "Notificaciones",
            onClick: () => navigate('/dashboard/notificaciones')
          },
          {
            key: "/dashboard/notificaciones/crear",
            label: "Crear notificación",
            onClick: () => navigate('/dashboard/notificaciones/crear')
          },
          {
            key: "/dashboard/notificaciones/entregadas",
            label: "Entregadas",
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
            key: "/dashboard/recibos",
            label: "Inicio",
            onClick: () => navigate('/dashboard/recibos')
          },
          {
            key: "/dashboard/recibos/crear",
            label: "Crear recibo",
            onClick: () => navigate('/dashboard/recibos/crear')
          },
          {
            key: "/dashboard/recibos/listar",
            label: "Listar recibos",
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
      }
    ];

    return items;
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider trigger={null} collapsible collapsed={collapsed} theme={siderTheme}>
        <div style={{ height: 64, margin: '16px', textAlign: 'center' }}>
          <img
            src={siderTheme === 'dark' ? logoDark : logoLight}
            alt="Consortium Legal Logo"
            style={{ maxWidth: '100%', height: 40, objectFit: 'contain' }}
          />
        </div>

        <Menu 
          theme={siderTheme} 
          mode="inline" 
          selectedKeys={[location.pathname]}
          items={getMenuItems()}
        />
      </Sider>

      <Layout>
        <Header
          style={{
            padding: 0,
            background: colorBgContainer,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Button
            type="text"
            icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            onClick={() => setCollapsed((c) => !c)}
            style={{ fontSize: 16, width: 64, height: 64 }}
          />
          <Switch
            checked={siderTheme === 'dark'}
            onChange={(checked) => setSiderTheme(checked ? 'dark' : 'light')}
            checkedChildren="Dark"
            unCheckedChildren="Light"
          />
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontWeight: 'bold' }}>
              Bienvenido, {username || 'Usuario'}
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
          }}
        >
          <Outlet />
        </Content>

        <Footer style={{ textAlign: 'center' }}>
          © {new Date().getFullYear()} Consortium Legal
        </Footer>
      </Layout>
    </Layout>
  );
};

export default DashboardLayout;