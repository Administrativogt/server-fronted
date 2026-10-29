import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { ConfigProvider, App as AntdApp, Button, theme as antdTheme } from 'antd';
import { BankOutlined, CalendarOutlined, CheckSquareOutlined, HomeOutlined, LogoutOutlined } from '@ant-design/icons';
import esES from 'antd/locale/es_ES';
import dayjs from 'dayjs';
import 'dayjs/locale/es';
import useAuthStore from '../auth/useAuthStore';
import { getMoneyRequirements } from '../api/moneyRequirements';
import { PRIMARY, SUCCESS, DANGER, WARNING, INFO } from '../pages/dashboard/theme';
import { Sheet } from './ui';
import { initials } from './format';
import { API_LABEL } from './env';
import MobileLogin from './pages/MobileLogin';
import MobileVacaciones from './pages/MobileVacaciones';
import MobilePorAutorizar from './pages/MobilePorAutorizar';
import MobileSalas from './pages/MobileSalas';
import MobileCheques from './pages/MobileCheques';
import type { ModuleKey } from '../types/module-access.types';

dayjs.locale('es');

const FONT = "'Plus Jakarta Sans Variable', system-ui, sans-serif";

function RequireAuth() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const location = useLocation();
  if (!isAuthenticated()) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  return <Outlet />;
}

/** Contador del tab "Por autorizar"; las pantallas lo refrescan al actuar. */
export type ShellContext = { refreshBadge: () => void };

// Cada pestaña se muestra con los mismos módulos que la ruta web (ModuleRoute).
const TABS: { path: string; label: string; title: string; icon: ReactNode; modules: ModuleKey[] }[] = [
  { path: '/vacaciones', label: 'Vacaciones', title: 'Vacaciones', icon: <CalendarOutlined />, modules: ['recursos_humanos'] },
  { path: '/salas', label: 'Salas', title: 'Salas', icon: <HomeOutlined />, modules: ['reservas_salas'] },
  { path: '/cheques', label: 'Cheques', title: 'Cheques', icon: <BankOutlined />, modules: ['cheques', 'autorizacion_cheques'] },
  { path: '/autorizar', label: 'Requerimientos', title: 'Requerimientos', icon: <CheckSquareOutlined />, modules: ['solicitudes_dinero'] },
];

function useVisibleTabs(toAuthorize: number) {
  const modules = useAuthStore((s) => s.modules);
  const isSuperuser = useAuthStore((s) => s.is_superuser);
  // Un autorizador puede no tener el módulo pero sí requerimientos esperando su firma
  return TABS.filter(
    (t) => isSuperuser || t.modules.some((k) => modules.some((m) => m.key === k)) || (t.path === '/autorizar' && toAuthorize > 0),
  );
}

function Shell() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { firstName, lastName, username, logout } = useAuthStore();
  const [toAuthorize, setToAuthorize] = useState(0);
  const [accountOpen, setAccountOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  const refreshBadge = useCallback(() => {
    getMoneyRequirements({ scope: 'to_authorize' })
      .then((rows) => setToAuthorize(rows.length))
      .catch(() => undefined);
  }, []);

  useEffect(refreshBadge, [refreshBadge, pathname]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 4);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const tabs = useVisibleTabs(toAuthorize);
  const current = TABS.find((t) => t.path === pathname);

  // Si la pestaña actual no está habilitada para este usuario, ir a la primera que sí
  useEffect(() => {
    if (tabs.length && !tabs.some((t) => t.path === pathname)) navigate(tabs[0].path, { replace: true });
  }, [tabs, pathname, navigate]);

  return (
    <div className="m-shell">
      <header className={`m-appbar ${scrolled ? 'scrolled' : ''}`}>
        <h1>{current?.title ?? 'Administrativo'}</h1>
        <button className="m-avatar" aria-label="Mi cuenta" onClick={() => setAccountOpen(true)}>
          {initials(firstName, lastName)}
        </button>
      </header>

      <main className="m-content" key={pathname}>
        {tabs.length ? (
          <Outlet context={{ refreshBadge } satisfies ShellContext} />
        ) : (
          <div className="m-state">
            <h3>Sin módulos en la app</h3>
            <p>Tu usuario no tiene habilitado ninguno de los módulos de la app. Pídelo a tu administrador o usa la web.</p>
          </div>
        )}
      </main>

      <nav className="m-tabbar" aria-label="Secciones">
        {tabs.map((t) => {
          const active = pathname === t.path;
          const badge = t.path === '/autorizar' && toAuthorize > 0;
          return (
            <button
              key={t.path}
              className={`m-tab ${active ? 'active' : ''}`}
              aria-current={active ? 'page' : undefined}
              onClick={() => !active && navigate(t.path, { replace: true })}
            >
              <span className="m-tab-icon">
                {t.icon}
                {badge && (
                  <span className="m-tab-badge" aria-label={`${toAuthorize} pendientes`}>
                    {toAuthorize > 99 ? '99+' : toAuthorize}
                  </span>
                )}
              </span>
              {t.label}
            </button>
          );
        })}
      </nav>

      <Sheet open={accountOpen} onClose={() => setAccountOpen(false)}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '4px 0 20px' }}>
          <div className="m-avatar" style={{ width: 52, height: 52, fontSize: 17 }}>
            {initials(firstName, lastName)}
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 17 }}>
              {firstName} {lastName}
            </div>
            <div className="m-item-meta">{username}</div>
          </div>
        </div>
        <dl className="m-dl" style={{ marginBottom: 20 }}>
          <div>
            <dt>Servidor</dt>
            <dd>{API_LABEL}</dd>
          </div>
        </dl>
        <Button
          danger
          block
          size="large"
          icon={<LogoutOutlined />}
          style={{ height: 48, fontWeight: 600 }}
          onClick={() => {
            setAccountOpen(false);
            logout(false);
            navigate('/login', { replace: true });
          }}
        >
          Cerrar sesión
        </Button>
      </Sheet>
    </div>
  );
}

export default function MobileApp() {
  const [dark, setDark] = useState(() => window.matchMedia('(prefers-color-scheme: dark)').matches);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = (e: MediaQueryListEvent) => setDark(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  return (
    <ConfigProvider
      locale={esES}
      theme={{
        algorithm: dark ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
        token: {
          colorPrimary: PRIMARY,
          colorSuccess: SUCCESS,
          colorError: DANGER,
          colorWarning: WARNING,
          colorInfo: INFO,
          colorBgContainer: dark ? '#1d1f2b' : '#ffffff',
          colorBgElevated: dark ? '#1d1f2b' : '#ffffff',
          colorBorder: dark ? '#2c2f40' : '#e2e8f0',
          borderRadius: 10,
          fontSize: 15,
          controlHeight: 44,
          fontFamily: FONT,
        },
        components: {
          Segmented: { itemSelectedBg: dark ? '#2c2f40' : '#ffffff', trackBg: dark ? '#161824' : '#e6ebf3' },
        },
      }}
    >
      <AntdApp message={{ top: 56, maxCount: 2 }}>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<MobileLogin />} />
            <Route element={<RequireAuth />}>
              <Route element={<Shell />}>
                <Route path="/vacaciones" element={<MobileVacaciones />} />
                <Route path="/salas" element={<MobileSalas />} />
                <Route path="/cheques" element={<MobileCheques />} />
                <Route path="/autorizar" element={<MobilePorAutorizar />} />
              </Route>
            </Route>
            <Route path="*" element={<Navigate to="/vacaciones" replace />} />
          </Routes>
        </BrowserRouter>
      </AntdApp>
    </ConfigProvider>
  );
}
