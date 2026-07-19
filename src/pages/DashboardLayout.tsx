// src/pages/DashboardLayout.tsx
import React, { Suspense, useEffect, useState } from 'react';
import { Layout, Menu, Button, Switch, Tooltip, Grid, Input, Empty, Dropdown, Avatar, Tag, theme as antdTheme } from 'antd';
import {
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  LogoutOutlined,
  UnorderedListOutlined,
  SunOutlined,
  MoonOutlined,
  StarOutlined,
  StarFilled,
  SearchOutlined,
  DownOutlined,
} from '@ant-design/icons';
import { useNavigate, Outlet, useLocation } from 'react-router-dom';
import useAuthStore from '../auth/useAuthStore';
import useThemeStore from '../hooks/useThemeStore';
import api from '../api/axios';
import { useUserAdminPermissions } from '../hooks/usePermissions';
import type { ModuleKey } from '../types/module-access.types';
import { getTipoUsuarioLabel, getTipoUsuarioColor } from '../types/user.types';
import { MENU, buildMenuItems, type MenuCaps } from '../config/menu';
import { PRIMARY } from './dashboard/theme';
import ErrorBoundary from '../components/ErrorBoundary';
import ContentSkeleton from '../components/ContentSkeleton';

import logoLight from '../assets/logo-cosortium.png';
import logoDark from '../assets/logo-dark.png';

const { Header, Sider, Content, Footer } = Layout;

const DashboardLayout: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [openKeys, setOpenKeys] = useState<string[]>([]);
  const [canSeeReport, setCanSeeReport] = useState<boolean | null>(null);
  const [search, setSearch] = useState('');
  const [favorites, setFavorites] = useState<string[]>([]);

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
    token: {
      colorBgContainer,
      borderRadiusLG,
      colorBgLayout,
      colorBgElevated,
      colorText,
      colorTextSecondary,
      colorBorderSecondary,
    },
  } = antdTheme.useToken();

  const navigate = useNavigate();
  const location = useLocation();
  const logout = useAuthStore((s) => s.logout);
  const username = useAuthStore((s) => s.username);
  const firstName = useAuthStore((s) => s.firstName);
  const lastName = useAuthStore((s) => s.lastName);
  const isSuperuser = useAuthStore((s) => s.is_superuser);
  const tipoUsuario = useAuthStore((s) => s.tipo_usuario);
  const modules = useAuthStore((s) => s.modules);

  const canSeeAsignados = tipoUsuario === 8 || username === 'ESC002' || username === 'BAR008';
  const canCreateEncargo = tipoUsuario !== 8; // ✅ Mensajeros NO pueden crear encargos
  const { canAccessUserAdmin } = useUserAdminPermissions(); // ✅ Permisos de administración
  const hasModule = (moduleKey: ModuleKey) =>
    modules.some((module) => module.key === moduleKey);

  // ⭐ Favoritos: persistidos en localStorage por usuario
  const favKey = `menu_favorites_${username ?? 'anon'}`;
  useEffect(() => {
    try {
      const raw = localStorage.getItem(favKey);
      setFavorites(raw ? JSON.parse(raw) : []);
    } catch {
      setFavorites([]);
    }
  }, [favKey]);

  const toggleFavorite = (key: string) => {
    setFavorites((prev) => {
      const next = prev.includes(key)
        ? prev.filter((k) => k !== key)
        : [...prev, key];
      try {
        localStorage.setItem(favKey, JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  };

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

  // Identidad para el menú de usuario del header
  const fullName = `${firstName} ${lastName}`.trim() || username || 'Usuario';
  const initials =
    (((firstName?.[0] ?? '') + (lastName?.[0] ?? '')).trim() || username.slice(0, 2) || 'U').toUpperCase();
  const roleLabel = isSuperuser ? 'Administrador' : getTipoUsuarioLabel(tipoUsuario ?? undefined);
  const roleColor = isSuperuser ? 'gold' : getTipoUsuarioColor(tipoUsuario ?? undefined);

  // Capacidades que deciden la visibilidad de cada módulo (ver src/config/menu.tsx)
  const caps: MenuCaps = {
    hasModule,
    canCreateEncargo,
    canSeeAsignados,
    canSeeReport: canSeeReport === true,
    canAccessUserAdmin,
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

  /* ⭐ Estrella de favorito en los módulos de primer nivel.
     Es un <button> real (accesible por teclado); stopPropagation para que el
     click no expanda/colapse el submenú. */
  const labelWithStar = (origKey: string, label: React.ReactNode, hasChildren = false) => {
    if (collapsed) return label;
    const isFav = favorites.includes(origKey);
    return (
      <span
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          width: '100%',
          boxSizing: 'border-box',
          // En submenús, reserva espacio a la derecha para la flecha de AntD
          // (empieza en ~16px del borde) para que la estrella no la tope.
          paddingInlineEnd: hasChildren ? 24 : 0,
        }}
      >
        <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {label}
        </span>
        <Tooltip title={isFav ? 'Quitar de favoritos' : 'Agregar a favoritos'} placement="right">
          <button
            type="button"
            className="menu-fav-star"
            aria-label={isFav ? 'Quitar de favoritos' : 'Agregar a favoritos'}
            aria-pressed={isFav}
            onClick={(e) => {
              e.stopPropagation();
              toggleFavorite(origKey);
            }}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              flexShrink: 0,
              padding: '0 2px',
              background: 'none',
              border: 'none',
              color: 'inherit',
              cursor: 'pointer',
              opacity: isFav ? 1 : 0.35,
              transition: 'opacity 0.15s',
            }}
          >
            {isFav ? <StarFilled style={{ color: '#faad14' }} /> : <StarOutlined />}
          </button>
        </Tooltip>
      </span>
    );
  };

  // Agrega la estrella al label de cada módulo de primer nivel.
  const addStars = (items: any[], isFavGroup = false): any[] =>
    items.map((it) => {
      const origKey = isFavGroup ? String(it.key).replace(/^fav:/, '') : it.key;
      return { ...it, label: labelWithStar(origKey, it.label, !!it.children?.length) };
    });

  // Clona un módulo con keys prefijadas para usarlo en la sección de favoritos
  // sin colisionar con las keys del listado completo.
  const cloneForFav = (item: any): any => ({
    ...item,
    key: `fav:${item.key}`,
    children: item.children?.map(cloneForFav),
  });

  const term = search.trim().toLowerCase();
  const isSearching = term.length > 0;

  const labelText = (item: any): string => {
    if (typeof item.label === 'string') return item.label.toLowerCase();
    return '';
  };

  const matchesSearch = (item: any): boolean => {
    if (labelText(item).includes(term)) return true;
    if (item.children) return item.children.some((c: any) => labelText(c).includes(term));
    return false;
  };

  const rawItems = buildMenuItems(MENU, caps);

  // Listado principal (filtrado por búsqueda si aplica)
  const mainItems = isSearching ? rawItems.filter(matchesSearch) : rawItems;

  // Parents que deben abrirse al buscar (los que tienen hijos coincidentes)
  const searchOpenKeys = isSearching
    ? mainItems.filter((i: any) => i.children).map((i: any) => i.key)
    : [];

  // Sección de favoritos (solo expandido y sin búsqueda activa)
  const favItems = rawItems.filter((i: any) => favorites.includes(i.key));
  const showFavorites = !collapsed && !isSearching && favItems.length > 0;

  const groupHeader = (icon: React.ReactNode, text: string) => (
    <span
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: 0.6,
        textTransform: 'uppercase',
        opacity: 0.65,
      }}
    >
      {icon}
      {text}
    </span>
  );

  const finalItems: any[] = [];
  if (showFavorites) {
    finalItems.push({
      type: 'group',
      key: 'fav-group',
      label: groupHeader(<StarFilled style={{ color: '#faad14' }} />, 'Favoritos'),
      children: addStars(decorateForCollapsed(favItems.map(cloneForFav)), true),
    });
    finalItems.push({
      type: 'divider',
      key: 'fav-divider',
      style: { margin: '10px 12px', borderColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)' },
    });
    finalItems.push({
      type: 'group',
      key: 'all-group',
      label: groupHeader(<UnorderedListOutlined />, 'Todos los módulos'),
      children: addStars(
        decorateForCollapsed(mainItems.filter((i: any) => !favorites.includes(i.key))),
      ),
    });
  } else {
    finalItems.push(...addStars(decorateForCollapsed(mainItems)));
  }

  const effectiveOpenKeys = collapsed ? [] : isSearching ? searchOpenKeys : openKeys;

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

        {/* 🔍 Buscador de módulos (oculto cuando el sidebar está colapsado) */}
        {!collapsed && (
          <div style={{ padding: '0 12px 8px' }}>
            <Input
              allowClear
              size="middle"
              prefix={<SearchOutlined style={{ opacity: 0.5 }} />}
              placeholder="Buscar módulo…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        )}

        {isSearching && mainItems.length === 0 ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="Sin resultados"
            style={{ marginTop: 24 }}
          />
        ) : (
          <Menu
            theme={isDark ? 'dark' : 'light'}
            mode="inline"
            selectedKeys={[location.pathname]}
            openKeys={effectiveOpenKeys}
            onOpenChange={(keys) => setOpenKeys(keys.slice(-1))}
            onClick={({ key }) => {
              // Navega directo desde la key (ruta). Los clones de favoritos
              // llevan prefijo "fav:" que se retira antes de navegar.
              const path = key.startsWith('fav:') ? key.slice(4) : key;
              if (path.startsWith('/')) navigate(path);
              if (isMobile) setCollapsed(true);
            }}
            items={finalItems}
          />
        )}
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
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Switch
              checked={isDark}
              onChange={toggleTheme}
              checkedChildren={<MoonOutlined />}
              unCheckedChildren={<SunOutlined />}
            />
            <Dropdown
              trigger={['click']}
              placement="bottomRight"
              dropdownRender={() => (
                <div
                  style={{
                    minWidth: 244,
                    background: colorBgElevated,
                    borderRadius: borderRadiusLG,
                    border: `1px solid ${colorBorderSecondary}`,
                    boxShadow: '0 6px 24px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.08)',
                    overflow: 'hidden',
                  }}
                >
                  <div style={{ display: 'flex', gap: 12, alignItems: 'center', padding: 16 }}>
                    <Avatar size={44} style={{ backgroundColor: PRIMARY, flexShrink: 0, fontWeight: 600 }}>
                      {initials}
                    </Avatar>
                    <div style={{ minWidth: 0 }}>
                      <div
                        style={{
                          fontWeight: 600,
                          color: colorText,
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {fullName}
                      </div>
                      <div style={{ fontSize: 12, color: colorTextSecondary }}>{username}</div>
                      <Tag color={roleColor} style={{ marginTop: 6, marginInlineEnd: 0 }}>
                        {roleLabel}
                      </Tag>
                    </div>
                  </div>
                  <div style={{ height: 1, background: colorBorderSecondary }} />
                  <div style={{ padding: 8 }}>
                    <Button
                      type="text"
                      danger
                      block
                      icon={<LogoutOutlined />}
                      onClick={handleLogout}
                      style={{ justifyContent: 'flex-start' }}
                    >
                      Cerrar sesión
                    </Button>
                  </div>
                </div>
              )}
            >
              <button
                type="button"
                className="user-trigger"
                aria-label={`Menú de usuario: ${fullName}`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '4px 8px',
                  background: 'none',
                  border: 'none',
                  borderRadius: 8,
                  cursor: 'pointer',
                  color: colorText,
                }}
              >
                <Avatar size={32} style={{ backgroundColor: PRIMARY, fontWeight: 600 }}>
                  {initials}
                </Avatar>
                {!isMobile && (
                  <span
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'flex-start',
                      lineHeight: 1.2,
                    }}
                  >
                    <span
                      style={{
                        fontWeight: 600,
                        maxWidth: 160,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {fullName}
                    </span>
                    <span style={{ fontSize: 11, color: colorTextSecondary }}>{roleLabel}</span>
                  </span>
                )}
                <DownOutlined style={{ fontSize: 10, opacity: 0.55 }} />
              </button>
            </Dropdown>
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
          {/* Suspense interno: al navegar entre páginas lazy, el shell queda fijo
              y solo el contenido muestra un skeleton. El Error Boundary con scope
              de contenido (keyed por ruta) aísla fallos de página sin perder el
              sidebar y se resetea al navegar. */}
          <ErrorBoundary key={location.pathname} fullScreen={false}>
            <Suspense fallback={<ContentSkeleton />}>
              <Outlet />
            </Suspense>
          </ErrorBoundary>
        </Content>

        <Footer style={{ textAlign: 'center', background: 'transparent' }}>
          © {new Date().getFullYear()} Consortium Legal
        </Footer>
      </Layout>
    </Layout>
  );
};

export default DashboardLayout;
