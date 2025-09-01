import React, { useEffect, useState } from 'react';
import {
  Layout,
  Menu,
  Button,
  Switch,
  theme as antdTheme,
} from 'antd';
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
} from '@ant-design/icons';
import { useNavigate, Outlet, useLocation } from 'react-router-dom';
import useAuthStore from '../auth/useAuthStore';
import api from '../api/axios'; // 👈 IMPORTANTE: para consultar /report/can

// Importa tus dos logos locales
import logoLight from '../assets/logo-cosortium.png';
import logoDark  from '../assets/logo-dark.png';

const { Header, Sider, Content, Footer } = Layout;

const DashboardLayout: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [siderTheme, setSiderTheme] = useState<'light' | 'dark'>('dark');

  // 🔐 Estado para controlar la visibilidad del reporte exclusivo
  const [canSeeReport, setCanSeeReport] = useState<boolean | null>(null);

  // Tokens de tema para Header/Content
  const {
    token: { colorBgContainer, borderRadiusLG },
  } = antdTheme.useToken();

  const navigate = useNavigate();
  const location = useLocation();
  const logout = useAuthStore((s) => s.logout);
  const username = useAuthStore((s) => s.username);

  // ➜ Consultar si el usuario puede ver el reporte exclusivo
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
    return () => { mounted = false; };
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      {/* Sidebar */}
      <Sider
        trigger={null}
        collapsible
        collapsed={collapsed}
        theme={siderTheme}
      >
        {/* Logo dinámico según theme */}
        <div
          style={{
            height: 64,
            margin: '16px',
            textAlign: 'center',
          }}
        >
          <img
            src={siderTheme === 'dark' ? logoDark : logoLight}
            alt="Consortium Legal Logo"
            style={{ maxWidth: '100%', height: 40, objectFit: 'contain' }}
          />
        </div>

        {/* Menú */}
        <Menu
          theme={siderTheme}
          mode="inline"
          selectedKeys={[location.pathname]}
        >
          <Menu.Item
            key="/dashboard"
            icon={<HomeOutlined />}
            onClick={() => navigate('/dashboard')}
          >
            Dashboard
          </Menu.Item>

          <Menu.Item
            key="/agenda"
            icon={<ScheduleOutlined />}
            onClick={() => navigate('/agenda')}
          >
            Agendador
          </Menu.Item>

          <Menu.SubMenu
            key="cheques"
            icon={<FolderOpenOutlined />}
            title="Gestión de cheques"
          >
            <Menu.Item
              key="/dashboard/cheques/autorizacion"
              icon={<FileProtectOutlined />}
              onClick={() =>
                navigate('/dashboard/cheques/autorizacion')
              }
            >
              Autorización
            </Menu.Item>
            <Menu.Item
              key="/dashboard/cheques/liquidacion"
              icon={<DollarOutlined />}
              onClick={() =>
                navigate('/dashboard/cheques/liquidacion')
              }
            >
              Liquidación
            </Menu.Item>
            <Menu.Item
              key="/dashboard/cheques/liquidados"
              icon={<FileDoneOutlined />}
              onClick={() =>
                navigate('/dashboard/cheques/liquidados')
              }
            >
              Liquidados
            </Menu.Item>
            <Menu.Item
              key="/dashboard/cheques/inmobiliario"
              icon={<FileTextOutlined />}
              onClick={() =>
                navigate('/dashboard/cheques/inmobiliario')
              }
            >
              Gastos inmobiliarios
            </Menu.Item>
            <Menu.Item
              key="/dashboard/cheques/pendientes"
              icon={<PushpinOutlined />}
              onClick={() =>
                navigate('/dashboard/cheques/pendientes')
              }
            >
              Cheques pendientes
            </Menu.Item>
          </Menu.SubMenu>

          <Menu.Item
            key="/casos"
            icon={<FileTextOutlined />}
            onClick={() => navigate('/casos')}
          >
            Control de casos
          </Menu.Item>

          <Menu.Item
            key="/mensajeria"
            icon={<MailOutlined />}
            onClick={() => navigate('/mensajeria')}
          >
            Mensajería
          </Menu.Item>

          <Menu.SubMenu
            key="reservaciones"
            icon={<ScheduleOutlined />}
            title="Reservaciones"
          >
            <Menu.Item
              key="/dashboard/reservaciones"
              icon={<ScheduleOutlined />}
              onClick={() =>
                navigate('/dashboard/reservaciones')
              }
            >
              Calendario
            </Menu.Item>
            <Menu.Item
              key="/dashboard/reservaciones/crear"
              icon={<ScheduleOutlined />}
              onClick={() =>
                navigate('/dashboard/reservaciones/crear')
              }
            >
              Crear reserva
            </Menu.Item>
            <Menu.Item
              key="/dashboard/reservaciones/listar"
              icon={<ScheduleOutlined />}
              onClick={() =>
                navigate('/dashboard/reservaciones/listar')
              }
            >
              Listar reservas
            </Menu.Item>

            {/* 👇 Solo mostrar a usuarios con permiso */}
            {canSeeReport === true && (
              <Menu.Item
                key="/dashboard/reservaciones/reporte-exclusivo"
                icon={<FileTextOutlined />}
                onClick={() => navigate('/dashboard/reservaciones/reporte-exclusivo')}
              >
                Reporte exclusivo
              </Menu.Item>
            )}
            {/* Si prefieres mostrar un item deshabilitado durante la carga:
            {canSeeReport === null && (
              <Menu.Item disabled icon={<FileTextOutlined />}>
                Reporte exclusivo
              </Menu.Item>
            )} */}
          </Menu.SubMenu>
        </Menu>
      </Sider>

      {/* Main layout */}
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
          {/* Toggle Sider */}
          <Button
            type="text"
            icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            onClick={() => setCollapsed((c) => !c)}
            style={{ fontSize: 16, width: 64, height: 64 }}
          />

          {/* Switch para alternar tema del sidebar */}
          <Switch
            checked={siderTheme === 'dark'}
            onChange={(checked) =>
              setSiderTheme(checked ? 'dark' : 'light')
            }
            checkedChildren="Dark"
            unCheckedChildren="Light"
          />

          {/* User info & Logout */}
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
