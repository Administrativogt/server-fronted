import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Button,
  Card,
  Input,
  InputNumber,
  message,
  Modal,
  Select,
  Space,
  Table,
  Tag,
  theme,
  Tooltip,
  Typography,
} from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import type { CheckRequest } from '../../types/checks.types';
import {
  getPendingAuthorization,
  manageChecksAuthorization,
  requestChecksAuthorization,
  syncPendingAuthorization,
  getCoordinatorMembers,
} from '../../api/checks';
import { fetchUsers, fullName, type UserLite } from '../../api/users';
import useAuthStore from '../../auth/useAuthStore';

const { Title, Text } = Typography;

const stateLabelMap: Record<number, string> = {
  1: 'Pendiente de autorización',
  4: 'Rechazado',
  6: 'Autorizado',
  7: 'No disponible',
};

// Enlace de navegación estilo "pill" con flecha deslizante al hover.
function NavPill({
  label,
  onClick,
  accent,
}: {
  label: string;
  onClick: () => void;
  accent: 'amber' | 'green';
}) {
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const active = hovered || focused;
  const accentColor = accent === 'amber' ? '#fbbf24' : '#4ade80';

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={{
        position: 'relative',
        height: 34,
        width: 138,
        borderRadius: 10,
        border: 'none',
        background: '#ffffff',
        color: '#000000',
        fontSize: 13,
        fontWeight: 600,
        cursor: 'pointer',
        overflow: 'hidden',
        boxShadow: active
          ? '0 3px 8px rgba(0,0,0,0.18)'
          : '0 1px 3px rgba(0,0,0,0.12)',
        transition: 'box-shadow 0.3s ease',
        outline: focused ? '2px solid #1677ff' : 'none',
        outlineOffset: 2,
      }}
    >
      <span
        style={{
          position: 'absolute',
          left: 3,
          top: 3,
          zIndex: 10,
          height: 28,
          width: active ? 132 : 28,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 8,
          background: accentColor,
          transition: 'width 0.5s ease',
        }}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 1024 1024"
          height="16px"
          width="16px"
          style={{ transform: 'rotate(180deg)' }}
          aria-hidden="true"
        >
          <path d="M224 480h640a32 32 0 1 1 0 64H224a32 32 0 0 1 0-64z" fill="#000000" />
          <path
            d="m237.248 512 265.408 265.344a32 32 0 0 1-45.312 45.312l-288-288a32 32 0 0 1 0-45.312l288-288a32 32 0 1 1 45.312 45.312L237.248 512z"
            fill="#000000"
          />
        </svg>
      </span>
      <span style={{ display: 'inline-block', transform: 'translateX(12px)' }}>{label}</span>
    </button>
  );
}

function AutorizacionCheque() {
  const navigate = useNavigate();
  const userId = useAuthStore((s) => s.userId);
  const tipoUsuario = useAuthStore((s) => s.tipo_usuario);
  const isSuperuser = useAuthStore((s) => s.is_superuser);
  const canViewAll = isSuperuser || [1, 2, 10].includes(tipoUsuario || 0);

  const [data, setData] = useState<CheckRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [syncLoading, setSyncLoading] = useState(false);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [users, setUsers] = useState<UserLite[]>([]);
  const [eligibleAuthorizers, setEligibleAuthorizers] = useState<UserLite[]>([]);
  const [authorizersLoading, setAuthorizersLoading] = useState(false);
  const [requestModalOpen, setRequestModalOpen] = useState(false);
  const [authorizerId, setAuthorizerId] = useState<number | null>(null);
  const [filters, setFilters] = useState({
    anio: undefined as number | undefined,
    request_id: undefined as number | undefined,
    client: '',
    responsible_id: canViewAll ? (undefined as number | undefined) : (userId ?? undefined),
    page: 1,
    per_page: 20,
  });
  const [pagination, setPagination] = useState({ total: 0, page: 1, per_page: 20 });
  const { token } = theme.useToken();

  const hasActiveFilters =
    filters.anio !== undefined ||
    filters.request_id !== undefined ||
    filters.client.trim() !== '' ||
    (canViewAll && filters.responsible_id !== undefined);

  const clearFilters = () =>
    setFilters((prev) => ({
      ...prev,
      anio: undefined,
      request_id: undefined,
      client: '',
      responsible_id: canViewAll ? undefined : prev.responsible_id,
      page: 1,
    }));

  const selectedIds = selectedRowKeys.map((v) => Number(v));

  useEffect(() => {
    if (!canViewAll && userId) {
      setFilters((prev) => ({ ...prev, responsible_id: userId }));
    }
  }, [canViewAll, userId]);

  const loadData = async () => {
    setLoading(true);
    try {
      // El endpoint de listado no acepta "anio"; se filtra por rango de fechas del año.
      const { anio, ...rest } = filters;
      const response = await getPendingAuthorization({
        ...rest,
        include_authorized: true,
        request_id: filters.request_id || undefined,
        client: filters.client.trim() || undefined,
        responsible_id: canViewAll ? filters.responsible_id || undefined : userId || undefined,
        ...(anio ? { init_date: `${anio}-01-01`, end_date: `${anio}-12-31` } : {}),
      });
      setData(response.data);
      setPagination({
        total: response.total,
        page: response.page,
        per_page: response.per_page,
      });
    } catch (error: any) {
      message.error(error?.response?.data?.message || 'Error al cargar pendientes de autorización');
    } finally {
      setLoading(false);
    }
  };

  // Búsqueda inmediata: filtra automáticamente al escribir/cambiar cualquier filtro
  // (con un pequeño debounce para no saturar el servidor mientras se escribe).
  useEffect(() => {
    const handler = setTimeout(() => {
      loadData();
    }, 350);
    return () => clearTimeout(handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    filters.anio,
    filters.request_id,
    filters.client,
    filters.responsible_id,
    filters.page,
    filters.per_page,
  ]);

  useEffect(() => {
    fetchUsers().then(setUsers).catch(() => setUsers([]));
  }, []);

  const handleSync = async () => {
    setSyncLoading(true);
    try {
      const response = await syncPendingAuthorization(
        filters.anio ? { anio: filters.anio } : {},
      );
      message.success(`Sincronización completada: ${response.synced} de ${response.total_results}`);
      await loadData();
    } catch (error: any) {
      message.error(error?.response?.data?.message || 'Error al sincronizar');
    } finally {
      setSyncLoading(false);
    }
  };

  const handleManage = async (action: 'authorize' | 'deny' | 'partial_authorize') => {
    if (!selectedIds.length) {
      message.info('Seleccione al menos un cheque');
      return;
    }

    try {
      await manageChecksAuthorization({
        action,
        all_check_ids: selectedIds,
        ...(action === 'partial_authorize'
          ? { selected_check_ids: selectedIds }
          : {}),
      });
      message.success('Acción aplicada correctamente');
      setSelectedRowKeys([]);
      await loadData();
    } catch (error: any) {
      message.error(error?.response?.data?.message || 'Error al gestionar autorización');
    }
  };

  const handleRequestAuthorization = async () => {
    if (!selectedIds.length) {
      message.info('Seleccione al menos un cheque');
      return;
    }
    if (!authorizerId) {
      message.warning('Seleccione un autorizador');
      return;
    }
    try {
      await requestChecksAuthorization({
        check_ids: selectedIds,
        authorizer_id: authorizerId,
      });
      message.success('Solicitud de autorización enviada');
      setRequestModalOpen(false);
      setAuthorizerId(null);
      await loadData();
    } catch (error: any) {
      message.error(error?.response?.data?.message || 'Error al enviar solicitud');
    }
  };

  return (
    <Card>
      <Space
        style={{ width: '100%', justifyContent: 'space-between', marginBottom: 16 }}
        wrap
      >
        <Title level={4} style={{ margin: 0 }}>
          Pendientes de autorización
        </Title>
        <Space wrap>
          <Button icon={<ReloadOutlined />} onClick={() => loadData()} loading={loading}>
            Recargar
          </Button>
          <Button
            onClick={async () => {
              if (!selectedIds.length) return;
              setAuthorizerId(null);
              setRequestModalOpen(true);
              setAuthorizersLoading(true);
              try {
                const members = await getCoordinatorMembers(selectedIds);
                setEligibleAuthorizers(members);
              } catch {
                setEligibleAuthorizers([]);
              } finally {
                setAuthorizersLoading(false);
              }
            }}
            disabled={!selectedIds.length}
          >
            Solicitar autorización
          </Button>
          {canViewAll && (
            <>
              <Button type="primary" onClick={() => handleManage('authorize')} disabled={!selectedIds.length}>
                Autorizar
              </Button>
              <Button danger onClick={() => handleManage('deny')} disabled={!selectedIds.length}>
                Rechazar
              </Button>
              <Button onClick={() => handleManage('partial_authorize')} disabled={!selectedIds.length}>
                Autorizar parcial
              </Button>
            </>
          )}
        </Space>
      </Space>

      <div
        style={{
          background: token.colorFillQuaternary,
          border: `1px solid ${token.colorBorderSecondary}`,
          borderRadius: token.borderRadiusLG,
          padding: 16,
          marginBottom: 16,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 8,
            marginBottom: 12,
          }}
        >
          <Space size={12} wrap align="center">
            <Text strong>Filtros</Text>
            <NavPill
              label="Sin liquidar"
              accent="amber"
              onClick={() => navigate('/dashboard/cheques/liquidacion')}
            />
            <NavPill
              label="Liquidados"
              accent="green"
              onClick={() => navigate('/dashboard/cheques/liquidados')}
            />
          </Space>
          <Space size={4} wrap>
            <Text type="secondary" style={{ fontSize: 12 }}>
              {loading
                ? 'Buscando…'
                : `${pagination.total} resultado${pagination.total === 1 ? '' : 's'}`}
            </Text>
            {hasActiveFilters && (
              <Button type="link" size="small" style={{ padding: '0 4px' }} onClick={clearFilters}>
                Limpiar filtros
              </Button>
            )}
          </Space>
        </div>

        <Space wrap size={[16, 12]} align="end" style={{ width: '100%' }}>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <Text type="secondary" style={{ fontSize: 12 }}>
              Año
            </Text>
            <InputNumber
              min={2000}
              max={2100}
              placeholder="2026"
              value={filters.anio}
              onChange={(value) =>
                setFilters((prev) => ({ ...prev, anio: value || undefined, page: 1 }))
              }
              style={{ width: 120 }}
            />
          </label>

          <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <Text type="secondary" style={{ fontSize: 12 }}>
              ID solicitud
            </Text>
            <InputNumber
              placeholder="Ej. 12345"
              value={filters.request_id}
              onChange={(value) =>
                setFilters((prev) => ({ ...prev, request_id: value || undefined, page: 1 }))
              }
              style={{ width: 150 }}
            />
          </label>

          <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <Text type="secondary" style={{ fontSize: 12 }}>
              Cliente
            </Text>
            <Input
              allowClear
              placeholder="Nombre del cliente"
              value={filters.client}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, client: e.target.value, page: 1 }))
              }
              style={{ width: 240 }}
            />
          </label>

          {canViewAll ? (
            <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <Text type="secondary" style={{ fontSize: 12 }}>
                Responsable
              </Text>
              <Select<number>
                allowClear
                showSearch
                style={{ width: 280 }}
                placeholder="Todos"
                value={filters.responsible_id}
                onChange={(value) =>
                  setFilters((prev) => ({ ...prev, responsible_id: value, page: 1 }))
                }
                options={users.map((user) => ({
                  label: `${fullName(user)} (${user.username})`,
                  value: user.id,
                }))}
                optionFilterProp="label"
              />
            </label>
          ) : null}

          <Button type="dashed" onClick={handleSync} loading={syncLoading}>
            Sincronizar desde Sirvo
          </Button>
        </Space>
      </div>

      <Table<CheckRequest>
        rowKey="id"
        loading={loading}
        dataSource={data}
        scroll={{ x: 'max-content', y: 'calc(100vh - 360px)' }}
        rowSelection={{
          selectedRowKeys,
          onChange: setSelectedRowKeys,
          getCheckboxProps: (record) => {
            const stateId =
              typeof record.state === 'number'
                ? record.state
                : (record.state as { id: number } | undefined)?.id ?? 1;
            return { disabled: stateId !== 1 };
          },
        }}
        pagination={{
          current: pagination.page,
          pageSize: pagination.per_page,
          total: pagination.total,
          showSizeChanger: true,
          showTotal: (total, range) => `${range[0]}-${range[1]} de ${total}`,
          onChange: (page, pageSize) => {
            setFilters((prev) => ({
              ...prev,
              per_page: pageSize,
              // Si cambió el tamaño de página, regresa a la 1 para no caer en una página vacía.
              page: pageSize !== prev.per_page ? 1 : page,
            }));
          },
        }}
        columns={[
          {
            title: 'Fecha',
            dataIndex: 'date',
            width: 108,
            render: (value: string) => (value ? new Date(value).toLocaleDateString('es-GT') : '—'),
          },
          { title: 'ID', dataIndex: 'request_id', width: 95 },
          {
            title: 'Solicitante',
            dataIndex: 'responsible',
            width: 140,
            render: (responsible: CheckRequest['responsible']) =>
              responsible
                ? `${responsible.first_name} ${responsible.last_name}`.trim() || responsible.username
                : '—',
          },
          {
            title: 'V/ Solicitado',
            dataIndex: 'total_value',
            width: 112,
            render: (value) => Number(value).toFixed(2),
          },
          {
            title: 'Descripción',
            dataIndex: 'description',
            width: 200,
            render: (desc: string) =>
              desc ? (
                <Tooltip placement="topLeft" title={desc}>
                  <span
                    style={{
                      display: '-webkit-box',
                      WebkitLineClamp: 3,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                      whiteSpace: 'normal',
                      wordBreak: 'break-word',
                      cursor: 'default',
                    }}
                  >
                    {desc}
                  </span>
                </Tooltip>
              ) : (
                '—'
              ),
          },
          { title: 'Cliente', dataIndex: 'client', width: 100 },
          {
            title: 'Nombre cliente',
            dataIndex: 'client_name',
            width: 150,
            render: (t: string) =>
              t ? (
                <Tooltip placement="topLeft" title={t}>
                  <span
                    style={{
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                      whiteSpace: 'normal',
                      wordBreak: 'break-word',
                      cursor: 'default',
                    }}
                  >
                    {t}
                  </span>
                </Tooltip>
              ) : (
                '—'
              ),
          },
          { title: 'Código coordinador', dataIndex: 'coordinator_code', width: 130 },
          { title: 'No. nota', dataIndex: 'work_note_number', width: 100 },
          {
            title: 'Estado',
            width: 120,
            render: (_, row) => {
              const stateId =
                typeof row.state === 'number'
                  ? row.state
                  : (row.state as { id: number } | undefined)?.id ?? 1;
              return (
                <Tag
                  color={stateId === 6 ? 'green' : stateId === 4 ? 'red' : 'gold'}
                  style={{
                    whiteSpace: 'normal',
                    wordBreak: 'break-word',
                    maxWidth: '100%',
                    marginInlineEnd: 0,
                  }}
                >
                  {stateLabelMap[stateId] || 'Pendiente de autorización'}
                </Tag>
              );
            },
          },
        ]}
      />

      <Modal
        title="Enviar solicitud de autorización"
        open={requestModalOpen}
        onCancel={() => setRequestModalOpen(false)}
        onOk={handleRequestAuthorization}
        okText="Enviar"
      >
        <Select<number>
          showSearch
          loading={authorizersLoading}
          style={{ width: '100%' }}
          placeholder={authorizersLoading ? 'Cargando autorizadores...' : 'Seleccione autorizador'}
          value={authorizerId ?? undefined}
          onChange={(value) => setAuthorizerId(value)}
          options={eligibleAuthorizers.map((user) => ({
            label: `${fullName(user)} (${user.email})`,
            value: user.id,
          }))}
          optionFilterProp="label"
          notFoundContent={authorizersLoading ? 'Cargando...' : 'Sin autorizadores disponibles'}
        />
      </Modal>
    </Card>
  );
}

export default AutorizacionCheque;
