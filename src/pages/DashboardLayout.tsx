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

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { data } = await api.get<{ canSeeReport: boolean }>(
          '/room-reservations/report/can'
        );
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

        <Menu theme={siderTheme} mode="inline" selectedKeys={[location.pathname]}>
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

          {/* Submenú cheques */}
          <Menu.SubMenu
            key="cheques"
            icon={<FolderOpenOutlined />}
            title="Gestión de cheques"
          >
            <Menu.Item
              key="/dashboard/cheques/autorizacion"
              icon={<FileProtectOutlined />}
              onClick={() => navigate('/dashboard/cheques/autorizacion')}
            >
              Autorización
            </Menu.Item>
            <Menu.Item
              key="/dashboard/cheques/liquidacion"
              icon={<DollarOutlined />}
              onClick={() => navigate('/dashboard/cheques/liquidacion')}
            >
              Liquidación
            </Menu.Item>
            <Menu.Item
              key="/dashboard/cheques/liquidados"
              icon={<FileDoneOutlined />}
              onClick={() => navigate('/dashboard/cheques/liquidados')}
            >
              Liquidados
            </Menu.Item>
            <Menu.Item
              key="/dashboard/cheques/inmobiliario"
              icon={<FileTextOutlined />}
              onClick={() => navigate('/dashboard/cheques/inmobiliario')}
            >
              Gastos inmobiliarios
            </Menu.Item>
            <Menu.Item
              key="/dashboard/cheques/pendientes"
              icon={<PushpinOutlined />}
              onClick={() => navigate('/dashboard/cheques/pendientes')}
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

          {/* Submenú reservaciones */}
          <Menu.SubMenu
            key="reservaciones"
            icon={<ScheduleOutlined />}
            title="Reservaciones"
          >
            <Menu.Item
              key="/dashboard/reservaciones"
              onClick={() => navigate('/dashboard/reservaciones')}
            >
              Calendario
            </Menu.Item>
            <Menu.Item
              key="/dashboard/reservaciones/crear"
              onClick={() => navigate('/dashboard/reservaciones/crear')}
            >
              Crear reserva
            </Menu.Item>
            <Menu.Item
              key="/dashboard/reservaciones/listar"
              onClick={() => navigate('/dashboard/reservaciones/listar')}
            >
              Listar reservas
            </Menu.Item>
            {canSeeReport === true && (
              <Menu.Item
                key="/dashboard/reservaciones/reporte-exclusivo"
                icon={<FileTextOutlined />}
                onClick={() => navigate('/dashboard/reservaciones/reporte-exclusivo')}
              >
                Reporte exclusivo
              </Menu.Item>
            )}
          </Menu.SubMenu>

          {/* Submenú notificaciones */}
          <Menu.SubMenu
            key="notificaciones"
            icon={<MailOutlined />}
            title="Notificaciones"
          >
            <Menu.Item
              key="/dashboard/notificaciones"
              onClick={() => navigate('/dashboard/notificaciones')}
            >
              Notificaciones
            </Menu.Item>
            <Menu.Item
              key="/dashboard/notificaciones/documentos"
              onClick={() => navigate('/dashboard/notificaciones/documentos')}
            >
              Documentos
            </Menu.Item>
          </Menu.SubMenu>

          {/* Submenú recibos */}
          <Menu.SubMenu key="recibos" icon={<DollarOutlined />} title="Recibos de Caja">
            <Menu.Item
              key="/dashboard/recibos"
              onClick={() => navigate('/dashboard/recibos')}
            >
              Inicio
            </Menu.Item>
            <Menu.Item
              key="/dashboard/recibos/crear"
              onClick={() => navigate('/dashboard/recibos/crear')}
            >
              Crear recibo
            </Menu.Item>
            <Menu.Item
              key="/dashboard/recibos/listar"
              onClick={() => navigate('/dashboard/recibos/listar')}
            >
              Listar recibos
            </Menu.Item>
          </Menu.SubMenu>

          {/* 🆕 Submenú requerimientos */}
          <Menu.SubMenu
            key="/dashboard/money-req"
            icon={<DollarOutlined />}
            title="Requerimientos de dinero"
          >
            <Menu.Item
              key="/dashboard/money-req"
              onClick={() => navigate('/dashboard/money-req')}
            >
              Listar requerimientos
            </Menu.Item>
          </Menu.SubMenu>
        </Menu>
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