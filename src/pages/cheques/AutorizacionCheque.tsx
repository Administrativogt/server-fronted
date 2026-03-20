import { useEffect, useState } from 'react';
import {
  Button,
  Card,
  Form,
  Input,
  InputNumber,
  message,
  Modal,
  Select,
  Space,
  Table,
  Tag,
  Tooltip,
  Typography,
} from 'antd';
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

const { Title } = Typography;

const stateLabelMap: Record<number, string> = {
  1: 'Pendiente de autorización',
  4: 'Rechazado',
  6: 'Autorizado',
  7: 'No disponible',
};

function AutorizacionCheque() {
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
    request_id: undefined as number | undefined,
    client: '',
    responsible_id: canViewAll ? (undefined as number | undefined) : (userId ?? undefined),
    page: 1,
    per_page: 20,
  });
  const [pagination, setPagination] = useState({ total: 0, page: 1, per_page: 20 });
  const [syncForm] = Form.useForm();

  const selectedIds = selectedRowKeys.map((v) => Number(v));

  useEffect(() => {
    if (!canViewAll && userId) {
      setFilters((prev) => ({ ...prev, responsible_id: userId }));
    }
  }, [canViewAll, userId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const response = await getPendingAuthorization({
        ...filters,
        include_authorized: true,
        request_id: filters.request_id || undefined,
        client: filters.client || undefined,
        responsible_id: canViewAll ? filters.responsible_id || undefined : userId || undefined,
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

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.page, filters.per_page]);

  useEffect(() => {
    fetchUsers().then(setUsers).catch(() => setUsers([]));
  }, []);

  const handleSync = async (values: { anio?: number }) => {
    setSyncLoading(true);
    try {
      const response = await syncPendingAuthorization(values);
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
          Autorización de cheques
        </Title>
        <Space wrap>
          <Button onClick={() => loadData()} loading={loading}>
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

      <Form form={syncForm} layout="inline" onFinish={handleSync} style={{ marginBottom: 12 }}>
        <Form.Item name="anio" label="Año">
          <InputNumber min={2000} max={2100} placeholder="2026" />
        </Form.Item>
        <Form.Item>
          <Button type="dashed" htmlType="submit" loading={syncLoading}>
            Sincronizar desde Sirvo
          </Button>
        </Form.Item>
      </Form>

      <Space style={{ marginBottom: 12 }} wrap>
        <InputNumber
          placeholder="request_id"
          value={filters.request_id}
          onChange={(value) => setFilters((prev) => ({ ...prev, request_id: value || undefined }))}
        />
        <Input
          placeholder="cliente"
          value={filters.client}
          onChange={(e) => setFilters((prev) => ({ ...prev, client: e.target.value }))}
          style={{ width: 220 }}
        />
        {canViewAll ? (
          <Select<number>
            allowClear
            showSearch
            style={{ width: 280 }}
            placeholder="responsable"
            value={filters.responsible_id}
            onChange={(value) => setFilters((prev) => ({ ...prev, responsible_id: value }))}
            options={users.map((user) => ({
              label: `${fullName(user)} (${user.username})`,
              value: user.id,
            }))}
            optionFilterProp="label"
          />
        ) : null}
        <Button
          type="primary"
          onClick={() => {
            setFilters((prev) => ({ ...prev, page: 1 }));
            loadData();
          }}
        >
          Buscar
        </Button>
      </Space>

      <Table<CheckRequest>
        rowKey="id"
        loading={loading}
        dataSource={data}
        scroll={{ x: 1400 }}
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
          onChange: (page, pageSize) => {
            setFilters((prev) => ({ ...prev, page, per_page: pageSize }));
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
            width: 260,
            ellipsis: { showTitle: false },
            render: (desc: string) =>
              desc ? (
                <Tooltip placement="topLeft" title={desc}>
                  <span style={{ cursor: 'default' }}>{desc}</span>
                </Tooltip>
              ) : (
                '—'
              ),
          },
          { title: 'Cliente', dataIndex: 'client', width: 100 },
          { title: 'Nombre cliente', dataIndex: 'client_name', width: 180, ellipsis: { showTitle: false }, render: (t: string) => t ? <Tooltip title={t}><span>{t}</span></Tooltip> : '—' },
          { title: 'Código coordinador', dataIndex: 'coordinator_code', width: 130 },
          { title: 'No. nota', dataIndex: 'work_note_number', width: 100 },
          {
            title: 'Estado',
            width: 180,
            render: (_, row) => {
              const stateId =
                typeof row.state === 'number'
                  ? row.state
                  : (row.state as { id: number } | undefined)?.id ?? 1;
              return <Tag color={stateId === 6 ? 'green' : stateId === 4 ? 'red' : 'gold'}>{stateLabelMap[stateId] || 'Pendiente de autorización'}</Tag>;
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
