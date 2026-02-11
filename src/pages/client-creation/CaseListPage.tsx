import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Card,
  Table,
  Button,
  Input,
  Select,
  Space,
  Tag,
  message,
  Tooltip,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  EyeOutlined,
  UserOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { getCases } from '../../api/clientCreation';
import type { Case } from '../../types/clientCreation.types';
import { CASE_STATES, CASE_STATE_COLORS } from '../../types/clientCreation.types';

const { Search } = Input;
const { Option } = Select;

const CaseListPage: React.FC = () => {
  const navigate = useNavigate();

  const [cases, setCases] = useState<Case[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [search, setSearch] = useState('');
  const [stateFilter, setStateFilter] = useState<number | undefined>(undefined);

  const loadCases = useCallback(async () => {
    try {
      setLoading(true);
      const res = await getCases({ page, limit, search: search || undefined, state: stateFilter });
      setCases(res.data || []);
      setTotal(res.total || 0);
    } catch {
      message.error('Error al cargar solicitudes de casos');
    } finally {
      setLoading(false);
    }
  }, [page, limit, search, stateFilter]);

  useEffect(() => {
    loadCases();
  }, [loadCases]);

  const handleSearch = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  const columns: ColumnsType<Case> = [
    {
      title: 'Cliente',
      dataIndex: 'client',
      key: 'client',
      ellipsis: true,
    },
    {
      title: 'Área',
      key: 'area',
      render: (_, record) => record.area?.name || '-',
    },
    {
      title: 'Concepto',
      dataIndex: 'concept',
      key: 'concept',
      ellipsis: true,
    },
    {
      title: 'Facturación',
      key: 'billing',
      render: (_, record) => record.billing_type?.name || '-',
    },
    {
      title: 'Monto',
      key: 'amount',
      render: (_, record) => record.amount_of_fees ? `${record.currency} ${record.amount_of_fees}` : '-',
    },
    {
      title: 'Responsable',
      dataIndex: 'responsible',
      key: 'responsible',
      ellipsis: true,
    },
    {
      title: 'Socio Encargado',
      key: 'partner',
      render: (_, record) => record.partner_in_charge?.name || '-',
      ellipsis: true,
    },
    {
      title: 'Estado',
      dataIndex: 'state',
      key: 'state',
      render: (state: number) => (
        <Tag color={CASE_STATE_COLORS[state] || 'default'}>
          {CASE_STATES[state] || state}
        </Tag>
      ),
    },
    {
      title: 'Acciones',
      key: 'actions',
      fixed: 'right',
      width: 120,
      render: (_, record) => (
        <Space size="small">
          <Tooltip title="Ver detalle">
            <Button
              type="text"
              icon={<EyeOutlined />}
              size="small"
              onClick={() => navigate(`/dashboard/casos/solicitud/${record.id}`)}
            />
          </Tooltip>
          <Tooltip title="Editar">
            <Button
              type="text"
              icon={<EditOutlined />}
              size="small"
              onClick={() => navigate(`/dashboard/casos/solicitud/editar/${record.id}`)}
            />
          </Tooltip>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      <Card
        title="Solicitudes de Casos"
        extra={
          <Space>
            <Button
              icon={<UserOutlined />}
              onClick={() => navigate('/dashboard/clientes')}
            >
              Lista de clientes
            </Button>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => navigate('/dashboard/casos/crear-solicitud')}
            >
              Nuevo caso
            </Button>
          </Space>
        }
      >
        <Space wrap style={{ marginBottom: 16 }}>
          <Search
            placeholder="Buscar por cliente o concepto"
            allowClear
            style={{ width: 300 }}
            onSearch={handleSearch}
            onChange={(e) => {
              if (!e.target.value) handleSearch('');
            }}
          />
          <Select
            placeholder="Estado"
            allowClear
            style={{ width: 160 }}
            value={stateFilter}
            onChange={(value) => {
              setStateFilter(value);
              setPage(1);
            }}
          >
            <Option value={1}>Recibido</Option>
            <Option value={2}>Creado</Option>
            <Option value={3}>Eliminado</Option>
          </Select>
        </Space>

        <Table
          columns={columns}
          dataSource={cases}
          rowKey="id"
          loading={loading}
          pagination={{
            current: page,
            pageSize: limit,
            total,
            showTotal: (t) => `Total: ${t} solicitudes`,
            onChange: (p) => setPage(p),
          }}
          scroll={{ x: 1200 }}
        />
      </Card>
    </div>
  );
};

export default CaseListPage;
