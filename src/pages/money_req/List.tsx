import React, { useEffect, useState } from 'react';
import {
  Table,
  Tag,
  Typography,
  Card,
  Button,
  Space,
  Modal,
  Select,
  Input,
  DatePicker,
  Row,
  Col,
  message,
} from 'antd';
import { SearchOutlined, ClearOutlined } from '@ant-design/icons';
import dayjs, { type Dayjs } from 'dayjs';
import {
  getMoneyRequirements,
  authorizeMoneyRequirements,
  denyMoneyRequirements,
  sendAuthorizationEmail,
  type MoneyRequirement,
} from '../../api/moneyRequirements';
import { fetchUsers, type UserLite, fullName } from '../../api/users';
import { getTeams, type Team } from '../../api/teams';
import { useNavigate } from 'react-router-dom';
import { usePermissions } from '../../hooks/usePermissions';

const { Title } = Typography;
const { RangePicker } = DatePicker;

const stateMap: Record<number, { text: string; color: string }> = {
  1: { text: 'Pendiente', color: 'orange' },
  2: { text: 'Pend. autorización', color: 'gold' },
  3: { text: 'Autorizado', color: 'green' },
  4: { text: 'Denegado', color: 'red' },
};

interface Filters {
  payableTo: string;
  teamId: number | null;
  state: number | null;
  dateRange: [Dayjs, Dayjs] | null;
}

const defaultFilters: Filters = {
  payableTo: '',
  teamId: null,
  state: null,
  dateRange: null,
};

const MoneyReqList: React.FC = () => {
  const [data, setData] = useState<MoneyRequirement[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [users, setUsers] = useState<UserLite[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [filters, setFilters] = useState<Filters>(defaultFilters);

  const navigate = useNavigate();
  const { hasPermission, isSuperUser } = usePermissions();
  const canAuthorize = isSuperUser() || hasPermission('money requirements authorizers');

  const fetchRequirements = async (activeFilters: Filters = filters) => {
    try {
      setLoading(true);
      const params: Record<string, unknown> = {};
      if (activeFilters.payableTo) params.payableTo = activeFilters.payableTo;
      if (activeFilters.teamId) params.teamId = activeFilters.teamId;
      if (activeFilters.state !== null) params.state = activeFilters.state;
      if (activeFilters.dateRange) {
        params.startDate = activeFilters.dateRange[0].format('YYYY-MM-DD');
        params.endDate = activeFilters.dateRange[1].format('YYYY-MM-DD');
      }
      const res = await getMoneyRequirements(params);
      setData(res);
    } catch (err) {
      console.error('Error cargando requerimientos', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequirements(defaultFilters);
    fetchUsers().then(setUsers).catch(() => {});
    getTeams().then(setTeams).catch(() => {});
  }, []);

  const handleSearch = () => fetchRequirements(filters);

  const handleClear = () => {
    setFilters(defaultFilters);
    fetchRequirements(defaultFilters);
  };

  const selectedIds = selectedRowKeys.map((k) => Number(k));
  const selectedRecords = data.filter((r) => selectedIds.includes(r.id));
  const hasPendingSelected = selectedRecords.some((r) => Number(r.state) === 1 || Number(r.state) === 2);

  const doAuthorize = async () => {
    if (!selectedIds.length) return message.info('Seleccione al menos un registro');
    await authorizeMoneyRequirements(selectedIds);
    message.success('Autorizados correctamente');
    setSelectedRowKeys([]);
    fetchRequirements();
  };

  const doDeny = async () => {
    if (!selectedIds.length) return message.info('Seleccione al menos un registro');
    await denyMoneyRequirements(selectedIds);
    message.success('Denegados correctamente');
    setSelectedRowKeys([]);
    fetchRequirements();
  };

  const openEmailModal = () => {
    if (!selectedIds.length) return message.info('Seleccione al menos un registro');
    setEmailModalOpen(true);
  };

  const sendEmail = async () => {
    if (!selectedUserId) return message.warning('Seleccione un autorizador');
    const user = users.find((u) => u.id === selectedUserId);
    if (!user?.email) return message.error('El autorizador no tiene correo');
    await sendAuthorizationEmail(user.email, selectedIds);
    message.success('Correo enviado y requerimientos marcados como Pend. autorización');
    setEmailModalOpen(false);
    setSelectedRowKeys([]);
    fetchRequirements();
  };

  const columns = [
    { title: 'Fecha', dataIndex: 'date', key: 'date', width: 110 },
    { title: 'A nombre de', dataIndex: 'payableTo', key: 'payableTo', width: 180 },
    {
      title: 'Monto',
      key: 'amount',
      width: 130,
      render: (_: unknown, record: MoneyRequirement) =>
        `${record.currency === 'USD' ? '$' : 'Q'} ${Number(record.amount).toLocaleString('es-GT', { minimumFractionDigits: 2 })}`,
    },
    { title: 'Descripción', dataIndex: 'description', key: 'description', width: 220 },
    { title: 'Correlativo', dataIndex: 'correlative', key: 'correlative', width: 130 },
    { title: 'NT', dataIndex: 'workNoteNumber', key: 'workNoteNumber', width: 120 },
    { title: 'Equipo', dataIndex: 'teamName', key: 'teamName', width: 130 },
    { title: 'Área', dataIndex: 'areaName', key: 'areaName', width: 150 },
    {
      title: 'Creación',
      dataIndex: 'created',
      key: 'created',
      width: 150,
      render: (val: string) => {
        if (!val) return '—';
        const d = new Date(val);
        return `${d.toLocaleDateString('es-GT')} ${d.toLocaleTimeString('es-GT', { hour: '2-digit', minute: '2-digit' })}`;
      },
    },
    {
      title: 'Estado',
      dataIndex: 'state',
      key: 'state',
      width: 140,
      render: (state: number) => {
        const info = stateMap[state] || { text: 'Desconocido', color: 'default' };
        return <Tag color={info.color}>{info.text}</Tag>;
      },
    },
  ];

  return (
    <Card>
      <Space style={{ width: '100%', justifyContent: 'space-between', marginBottom: 16 }}>
        <Title level={4}>Requerimientos de dinero</Title>
        <Space>
          <Button onClick={openEmailModal} disabled={!hasPendingSelected}>
            ✉️ Enviar autorización
          </Button>
          {canAuthorize && (
            <>
              <Button type="primary" onClick={doAuthorize} disabled={!selectedIds.length}>
                ✅ Autorizar
              </Button>
              <Button danger onClick={doDeny} disabled={!selectedIds.length}>
                ⛔ Denegar
              </Button>
            </>
          )}
        </Space>
      </Space>

      {/* ── Filtros ── */}
      <Card size="small" style={{ marginBottom: 16, background: 'transparent' }} bordered>
        <Row gutter={[12, 12]} align="middle">
          <Col xs={24} sm={12} md={6}>
            <RangePicker
              style={{ width: '100%' }}
              format="DD/MM/YYYY"
              placeholder={['Fecha inicio', 'Fecha fin']}
              value={filters.dateRange}
              onChange={(vals) =>
                setFilters((f) => ({ ...f, dateRange: vals as [Dayjs, Dayjs] | null }))
              }
            />
          </Col>
          <Col xs={24} sm={12} md={5}>
            <Select
              style={{ width: '100%' }}
              placeholder="Equipo"
              allowClear
              value={filters.teamId ?? undefined}
              onChange={(v) => setFilters((f) => ({ ...f, teamId: v ?? null }))}
              showSearch
              optionFilterProp="children"
            >
              {teams.map((t) => (
                <Select.Option key={t.id} value={t.id}>{t.name}</Select.Option>
              ))}
            </Select>
          </Col>
          <Col xs={24} sm={12} md={5}>
            <Input
              placeholder="A nombre de"
              value={filters.payableTo}
              onChange={(e) => setFilters((f) => ({ ...f, payableTo: e.target.value }))}
              onPressEnter={handleSearch}
              allowClear
            />
          </Col>
          <Col xs={24} sm={12} md={4}>
            <Select
              style={{ width: '100%' }}
              placeholder="Estado"
              allowClear
              value={filters.state ?? undefined}
              onChange={(v) => setFilters((f) => ({ ...f, state: v ?? null }))}
            >
              {Object.entries(stateMap).map(([key, val]) => (
                <Select.Option key={key} value={Number(key)}>{val.text}</Select.Option>
              ))}
            </Select>
          </Col>
          <Col xs={24} sm={12} md={4}>
            <Space>
              <Button type="primary" icon={<SearchOutlined />} onClick={handleSearch}>
                Buscar
              </Button>
              <Button icon={<ClearOutlined />} onClick={handleClear}>
                Limpiar
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>

      <Table
        rowKey="id"
        loading={loading}
        columns={columns}
        dataSource={data}
        pagination={{
          defaultPageSize: 10,
          showSizeChanger: true,
          pageSizeOptions: [10, 25, 50, 100],
          showTotal: (total, range) => `${range[0]}-${range[1]} de ${total} registros`,
        }}
        scroll={{ x: 'max-content', y: 500 }}
        rowSelection={{
          selectedRowKeys,
          onChange: setSelectedRowKeys,
          getCheckboxProps: (record: MoneyRequirement) => ({
            style: Number(record.state) === 3 || Number(record.state) === 4 ? { display: 'none' } : {},
          }),
        }}
      />

      <Modal
        title="Seleccionar autorizador"
        open={emailModalOpen}
        onCancel={() => setEmailModalOpen(false)}
        onOk={sendEmail}
        okText="Enviar"
      >
        <Select
          style={{ width: '100%' }}
          placeholder="Seleccione un autorizador"
          value={selectedUserId ?? undefined}
          onChange={(v) => setSelectedUserId(v)}
          showSearch
          optionFilterProp="children"
        >
          {users.map((u) => (
            <Select.Option key={u.id} value={u.id}>
              {fullName(u)} ({u.email})
            </Select.Option>
          ))}
        </Select>
        <p style={{ marginTop: 8, color: '#888' }}>
          El requerimiento será enviado para autorización y su estado cambiará a <b>Pend. autorización</b>.
        </p>
      </Modal>
    </Card>
  );
};

export default MoneyReqList;
