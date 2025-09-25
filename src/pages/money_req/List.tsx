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
  message,
} from 'antd';
import {
  getMoneyRequirements,
  authorizeMoneyRequirements,
  denyMoneyRequirements,
  sendAuthorizationEmail,
  type MoneyRequirement,
} from '../../api/moneyRequirements';
import { fetchUsers, type UserLite, fullName } from '../../api/users';
import { useNavigate } from 'react-router-dom';

const { Title } = Typography;

const stateMap: Record<number, { text: string; color: string }> = {
  1: { text: 'Pendiente', color: 'orange' },
  2: { text: 'Pend. autorización', color: 'gold' },
  3: { text: 'Autorizado', color: 'green' },
  4: { text: 'Denegado', color: 'red' },
};

const MoneyReqList: React.FC = () => {
  const [data, setData] = useState<MoneyRequirement[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [users, setUsers] = useState<UserLite[]>([]);
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);

  const navigate = useNavigate();

  const fetchRequirements = async () => {
    try {
      setLoading(true);
      const res = await getMoneyRequirements();
      setData(res);
    } catch (err) {
      console.error('Error cargando requerimientos', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequirements();
    fetchUsers().then(setUsers).catch(() => {});
  }, []);

  const selectedIds = selectedRowKeys.map((k) => Number(k));

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
    { title: 'Correlativo', dataIndex: 'correlative', key: 'correlative' },
    { title: 'Beneficiario', dataIndex: 'payableTo', key: 'payableTo' },
    { title: 'NIT', dataIndex: 'nit', key: 'nit' },
    { title: 'Monto', dataIndex: 'amount', key: 'amount' },
    { title: 'Fecha', dataIndex: 'date', key: 'date' },
    { title: 'Descripción', dataIndex: 'description', key: 'description' },
    { title: 'Equipo', dataIndex: 'teamName', key: 'teamName' },
    { title: 'Área', dataIndex: 'areaName', key: 'areaName' },
    {
      title: 'Estado',
      dataIndex: 'state',
      key: 'state',
      render: (state: number) => {
        const info = stateMap[state] || { text: 'Desconocido', color: 'default' };
        return <Tag color={info.color}>{info.text}</Tag>;
      },
    },
  ];

  return (
    <Card>
      <Space style={{ width: '100%', justifyContent: 'space-between', marginBottom: 16 }}>
        <Title level={4}>📋 Requerimientos de dinero</Title>
        <Space>
          <Button onClick={openEmailModal} disabled={!selectedIds.length}>
            ✉️ Enviar autorización
          </Button>
          <Button type="primary" onClick={doAuthorize} disabled={!selectedIds.length}>
            ✅ Autorizar
          </Button>
          <Button danger onClick={doDeny} disabled={!selectedIds.length}>
            ⛔ Denegar
          </Button>
          <Button type="dashed" onClick={() => navigate('/dashboard/money-req/create')}>
            ➕ Crear
          </Button>
        </Space>
      </Space>

      <Table
        rowKey="id"
        loading={loading}
        columns={columns}
        dataSource={data}
        pagination={{ pageSize: 10 }}
        rowSelection={{
          selectedRowKeys,
          onChange: setSelectedRowKeys,
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