import React, { useEffect, useMemo, useState } from 'react';
import {
  Table, Button, Space, message, Modal, Checkbox, Typography, Tag,
  Input, Segmented, Card, Row, Col,
} from 'antd';
import {
  EyeOutlined, MailOutlined, CheckCircleOutlined, CloseCircleOutlined,
  SearchOutlined, ReloadOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { cargabilityApi } from '../../api/cargability';
import type { CargabilityUser } from '../../types/cargability.types';

const { Title, Text } = Typography;
const { confirm } = Modal;

type EmailStatusFilter = 'all' | 'pending' | 'sent';

const CargabilityUsersList: React.FC = () => {
  const [users, setUsers] = useState<CargabilityUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [searchUser, setSearchUser] = useState('');
  const [searchEmail, setSearchEmail] = useState('');
  const [statusFilter, setStatusFilter] = useState<EmailStatusFilter>('all');

  const navigate = useNavigate();

  const filteredUsers = useMemo(() => {
    const userTerm  = searchUser.trim().toLowerCase();
    const emailTerm = searchEmail.trim().toLowerCase();
    return users.filter((u) => {
      if (statusFilter === 'pending' && u.emailSended) return false;
      if (statusFilter === 'sent'    && !u.emailSended) return false;
      if (userTerm) {
        const haystack = `${u.username ?? ''} ${u.fullName ?? ''}`.toLowerCase();
        if (!haystack.includes(userTerm)) return false;
      }
      if (emailTerm && !(u.email ?? '').toLowerCase().includes(emailTerm)) return false;
      return true;
    });
  }, [users, searchUser, searchEmail, statusFilter]);

  const pendingCount = users.filter((u) => !u.emailSended).length;
  const sentCount    = users.length - pendingCount;

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const { data } = await cargabilityApi.getUsersForEmail();
      setUsers(data);
    } catch (error) {
      console.error('Error al obtener usuarios:', error);
      message.error('Error al cargar la lista de usuarios');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleSendToOne = async (username: string) => {
    confirm({
      title: '¿Enviar reporte por email?',
      content: `Se enviará el reporte de cargabilidad a ${username}`,
      okText: 'Enviar',
      cancelText: 'Cancelar',
      onOk: async () => {
        setSendingEmail(true);
        try {
          await cargabilityApi.sendEmailToOne(username);
          message.success('Email enviado exitosamente');
          fetchUsers();
        } catch (error: any) {
          console.error('Error al enviar email:', error);
          message.error(error.response?.data?.message || 'Error al enviar email');
        } finally {
          setSendingEmail(false);
        }
      },
    });
  };

  const handleSendToAll = async () => {
    const pendingCount = users.filter(u => !u.emailSended).length;
    
    if (pendingCount === 0) {
      message.info('No hay usuarios pendientes de envío');
      return;
    }

    confirm({
      title: `¿Enviar emails a todos los usuarios pendientes?`,
      content: `Se enviarán ${pendingCount} emails`,
      okText: 'Enviar todos',
      cancelText: 'Cancelar',
      onOk: async () => {
        setSendingEmail(true);
        try {
          const { data } = await cargabilityApi.sendEmailToAll();
          const successCount = data.results.filter(r => r.success).length;
          message.success(`${successCount} emails enviados exitosamente`);
          fetchUsers();
        } catch (error: any) {
          console.error('Error al enviar emails:', error);
          message.error(error.response?.data?.message || 'Error al enviar emails');
        } finally {
          setSendingEmail(false);
        }
      },
    });
  };

  const handleSendToSelected = async () => {
    if (selectedUsers.length === 0) {
      message.warning('Selecciona al menos un usuario');
      return;
    }
    const pendingSelected = selectedUsers.filter((username) => {
      const user = users.find((item) => item.username === username);
      return user && !user.emailSended;
    });

    if (pendingSelected.length === 0) {
      message.info('Todos los seleccionados ya fueron enviados');
      return;
    }

    confirm({
      title: `¿Enviar emails a usuarios seleccionados?`,
      content: `Se enviarán ${pendingSelected.length} emails`,
      okText: 'Enviar',
      cancelText: 'Cancelar',
      onOk: async () => {
        setSendingEmail(true);
        try {
          const { data } = await cargabilityApi.sendEmailsBulk(pendingSelected);
          const successCount = data.results.filter(r => r.success).length;
          message.success(`${successCount} emails enviados exitosamente`);
          setSelectedUsers([]);
          fetchUsers();
        } catch (error: any) {
          console.error('Error al enviar emails:', error);
          message.error(error.response?.data?.message || 'Error al enviar emails');
        } finally {
          setSendingEmail(false);
        }
      },
    });
  };

  const columns = [
    {
      title: 'Seleccionar',
      key: 'select',
      width: 80,
      render: (_: any, record: CargabilityUser) => (
        <Checkbox
          checked={selectedUsers.includes(record.username)}
          onChange={(e) => {
            if (e.target.checked) {
              setSelectedUsers((prev) => [...prev, record.username]);
            } else {
              setSelectedUsers((prev) => prev.filter((u) => u !== record.username));
            }
          }}
        />
      ),
    },
    {
      title: 'Usuario',
      dataIndex: 'username',
      key: 'username',
    },
    {
      title: 'Nombre completo',
      dataIndex: 'fullName',
      key: 'fullName',
    },
    {
      title: 'Email',
      dataIndex: 'email',
      key: 'email',
    },
    {
      title: 'Estado',
      dataIndex: 'emailSended',
      key: 'emailSended',
      render: (sent: boolean) => (
        sent ? (
          <Tag icon={<CheckCircleOutlined />} color="success">Enviado</Tag>
        ) : (
          <Tag icon={<CloseCircleOutlined />} color="default">Pendiente</Tag>
        )
      ),
    },
    {
      title: 'Acciones',
      key: 'actions',
      render: (_: any, record: CargabilityUser) => (
        <Space>
          <Button
            type="primary"
            icon={<EyeOutlined />}
            size="small"
            onClick={() => navigate(`/dashboard/cargability/report/${record.username}`)}
          >
            Ver
          </Button>
          <Button
            type="default"
            icon={<MailOutlined />}
            size="small"
            loading={sendingEmail}
            onClick={() => handleSendToOne(record.username)}
            disabled={record.emailSended}
          >
            Enviar
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: '24px' }}>
      <Title level={2} style={{ marginBottom: 4 }}>Lista de Usuarios - Cargabilidad</Title>
      <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
        Total: <Text strong>{users.length}</Text> · Pendientes: <Text strong>{pendingCount}</Text> · Enviados: <Text strong>{sentCount}</Text>
      </Text>

      {/* Filtros */}
      <Card size="small" style={{ marginBottom: 16, borderRadius: 12 }} bordered={false}>
        <Row gutter={[12, 12]} align="middle">
          <Col xs={24} sm={12} md={8}>
            <Input
              placeholder="Buscar por usuario o nombre..."
              value={searchUser}
              onChange={(e) => setSearchUser(e.target.value)}
              prefix={<SearchOutlined />}
              allowClear
            />
          </Col>
          <Col xs={24} sm={12} md={8}>
            <Input
              placeholder="Buscar por email..."
              value={searchEmail}
              onChange={(e) => setSearchEmail(e.target.value)}
              prefix={<SearchOutlined />}
              allowClear
            />
          </Col>
          <Col xs={24} md={8}>
            <Space wrap style={{ width: '100%', justifyContent: 'flex-end' }}>
              <Segmented
                options={[
                  { label: 'Todos',      value: 'all'      },
                  { label: 'Pendientes', value: 'pending'  },
                  { label: 'Enviados',   value: 'sent'     },
                ]}
                value={statusFilter}
                onChange={(v) => setStatusFilter(v as EmailStatusFilter)}
              />
              <Button
                icon={<ReloadOutlined />}
                onClick={fetchUsers}
                loading={loading}
                title="Recargar"
              />
            </Space>
          </Col>
        </Row>
      </Card>

      {/* Acciones masivas */}
      <Space style={{ marginBottom: 16 }} wrap>
        <Button
          type="primary"
          icon={<MailOutlined />}
          onClick={handleSendToAll}
          loading={sendingEmail}
        >
          Enviar a todos los pendientes
        </Button>
        <Button
          type="default"
          icon={<MailOutlined />}
          onClick={handleSendToSelected}
          loading={sendingEmail}
          disabled={selectedUsers.length === 0}
        >
          Enviar a seleccionados ({selectedUsers.length})
        </Button>
        <Button onClick={() => setSelectedUsers([])} disabled={selectedUsers.length === 0}>
          Limpiar selección
        </Button>
      </Space>

      <Table
        dataSource={filteredUsers}
        columns={columns}
        rowKey="username"
        loading={loading}
        pagination={{
          defaultPageSize: 10,
          pageSizeOptions: ['10', '20', '50', '100'],
          showSizeChanger: true,
          showTotal: (total, range) => `${range[0]}-${range[1]} de ${total} usuarios`,
        }}
      />
    </div>
  );
};

export default CargabilityUsersList;