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
  Popconfirm,
  Tooltip,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  EyeOutlined,
  CheckCircleOutlined,
  FileTextOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { getClients, finishClient } from '../../api/clientCreation';
import type { Client } from '../../types/clientCreation.types';
import { CLIENT_STATES, CLIENT_STATE_COLORS } from '../../types/clientCreation.types';
import useAuthStore from '../../auth/useAuthStore';

const { Search } = Input;
const { Option } = Select;

const ClientListPage: React.FC = () => {
  const navigate = useNavigate();
  const is_superuser = useAuthStore(s => s.is_superuser);

  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [search, setSearch] = useState('');
  const [stateFilter, setStateFilter] = useState<number | undefined>(undefined);

  const loadClients = useCallback(async () => {
    try {
      setLoading(true);
      const res = await getClients({ page, limit, search: search || undefined, state: stateFilter });
      setClients(res.data || []);
      setTotal(res.total || 0);
    } catch {
      message.error('Error al cargar clientes');
    } finally {
      setLoading(false);
    }
  }, [page, limit, search, stateFilter]);

  useEffect(() => {
    loadClients();
  }, [loadClients]);

  const handleFinish = async (id: number) => {
    try {
      await finishClient(id);
      message.success('Cliente finalizado exitosamente');
      loadClients();
    } catch (error: any) {
      message.error(error?.response?.data?.message || 'Error al finalizar cliente');
    }
  };

  const handleSearch = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  const columns: ColumnsType<Client> = [
    {
      title: 'Nombre',
      dataIndex: 'full_name',
      key: 'full_name',
      ellipsis: true,
    },
    {
      title: 'País',
      key: 'country',
      render: (_, record) => record.country_of_origin?.name || '-',
    },
    {
      title: 'NIT',
      dataIndex: 'nit',
      key: 'nit',
    },
    {
      title: 'Código',
      dataIndex: 'code',
      key: 'code',
    },
    {
      title: 'Socio Responsable',
      key: 'partner',
      render: (_, record) => record.responsible_partner?.name || '-',
      ellipsis: true,
    },
    {
      title: 'Origen',
      key: 'origin',
      render: (_, record) => record.origin?.name || '-',
    },
    {
      title: 'Estado',
      dataIndex: 'state',
      key: 'state',
      render: (state: number) => (
        <Tag color={CLIENT_STATE_COLORS[state] || 'default'}>
          {CLIENT_STATES[state] || state}
        </Tag>
      ),
    },
    {
      title: 'Acciones',
      key: 'actions',
      fixed: 'right',
      width: 180,
      render: (_, record) => (
        <Space size="small">
          <Tooltip title="Ver detalle">
            <Button
              type="text"
              icon={<EyeOutlined />}
              size="small"
              onClick={() => navigate(`/dashboard/clientes/${record.id}`)}
            />
          </Tooltip>
          <Tooltip title="Editar">
            <Button
              type="text"
              icon={<EditOutlined />}
              size="small"
              onClick={() => navigate(`/dashboard/clientes/editar/${record.id}`)}
            />
          </Tooltip>
          {is_superuser && record.state === 1 && (
            <Popconfirm
              title="¿Finalizar este cliente?"
              description="El estado cambiará a Creado"
              onConfirm={() => handleFinish(record.id)}
              okText="Sí, finalizar"
              cancelText="Cancelar"
            >
              <Tooltip title="Finalizar">
                <Button type="text" icon={<CheckCircleOutlined />} size="small" />
              </Tooltip>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      <Card
        title="Lista de Clientes"
        extra={
          <Space>
            <Button
              icon={<FileTextOutlined />}
              onClick={() => navigate('/dashboard/casos/solicitudes')}
            >
              Solicitudes de casos
            </Button>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => navigate('/dashboard/clientes/crear')}
            >
              Nuevo cliente
            </Button>
          </Space>
        }
      >
        <Space wrap style={{ marginBottom: 16 }}>
          <Search
            placeholder="Buscar por nombre"
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
          dataSource={clients}
          rowKey="id"
          loading={loading}
          pagination={{
            current: page,
            pageSize: limit,
            total,
            showTotal: (t) => `Total: ${t} clientes`,
            onChange: (p) => setPage(p),
          }}
          scroll={{ x: 1100 }}
        />
      </Card>
    </div>
  );
};

export default ClientListPage;
