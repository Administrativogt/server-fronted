import React, { useEffect, useState } from 'react';
import { Table, Button, Space, message, Modal, Checkbox, Typography, Tag } from 'antd';
import { EyeOutlined, MailOutlined, CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { cargabilityApi } from '../../api/cargability';
import type { CargabilityUser } from '../../types/cargability.types';

const { Title } = Typography;
const { confirm } = Modal;

const CargabilityUsersList: React.FC = () => {
  const [users, setUsers] = useState<CargabilityUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [sendingEmail, setSendingEmail] = useState(false);

  const navigate = useNavigate();

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

    confirm({
      title: `¿Enviar emails a usuarios seleccionados?`,
      content: `Se enviarán ${selectedUsers.length} emails`,
      okText: 'Enviar',
      cancelText: 'Cancelar',
      onOk: async () => {
        setSendingEmail(true);
        try {
          const { data } = await cargabilityApi.sendEmailsBulk(selectedUsers);
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
              setSelectedUsers([...selectedUsers, record.username]);
            } else {
              setSelectedUsers(selectedUsers.filter(u => u !== record.username));
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
      <Title level={2}>Lista de Usuarios - Cargabilidad</Title>

      <Space style={{ marginBottom: 16 }}>
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
        <Button onClick={() => setSelectedUsers([])}>
          Limpiar selección
        </Button>
      </Space>

      <Table
        dataSource={users}
        columns={columns}
        rowKey="username"
        loading={loading}
        pagination={{ pageSize: 10 }}
      />
    </div>
  );
};

export default CargabilityUsersList;