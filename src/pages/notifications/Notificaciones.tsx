import React, { useEffect, useMemo, useState } from 'react';
import {
  Button,
  Card,
  Table,
  Tabs,
  Modal,
  Form,
  Select,
  message,
  Space,
  Input,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';

import {
  fetchPendingNotifications,
  deliverNotifications,
  createNotification,
  type NotificationDto,
  type CreateNotificationPayload,
} from '../../api/notifications';
import { fetchUsers, fullName, type UserLite } from '../../api/users';
import api from '../../api/axios';

const { TabPane } = Tabs;

type RowType = {
  key: number;
  fecha: string;
  horaRecibido: string;
  de: string;
  cedula: string;
  expediente: string;
  dirigidaA: string;
  raw: NotificationDto;
};

const Notificaciones: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<RowType[]>([]);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [users, setUsers] = useState<UserLite[]>([]);
  const [halls, setHalls] = useState<{ id: number; name: string }[]>([]);
  const [proveniences, setProveniences] = useState<{ id: number; name: string }[]>([]);

  const [deliverOpen, setDeliverOpen] = useState(false);
  const [deliverLoading, setDeliverLoading] = useState(false);
  const [form] = Form.useForm<{ userId: number }>();

  const [createOpen, setCreateOpen] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [createForm] = Form.useForm<CreateNotificationPayload>();

  const columns: ColumnsType<RowType> = useMemo(
    () => [
      { title: 'Fecha', dataIndex: 'fecha', key: 'fecha' },
      { title: 'Hora recibido', dataIndex: 'horaRecibido', key: 'horaRecibido' },
      { title: 'De', dataIndex: 'de', key: 'de' },
      { title: 'Cédula', dataIndex: 'cedula', key: 'cedula' },
      { title: 'No. Expediente', dataIndex: 'expediente', key: 'expediente' },
      { title: 'Dirigida a', dataIndex: 'dirigidaA', key: 'dirigidaA' },
      {
        title: 'Opciones',
        key: 'opciones',
        render: (_, record) => (
          <Space>
            <Button type="primary" onClick={() => message.info(`Editar ${record.key} (pendiente implementar)`)}>Editar</Button>
            <Button type="primary" danger onClick={() => message.info(`Eliminar ${record.key} (pendiente implementar)`)}>Eliminar</Button>
          </Space>
        ),
      },
    ],
    []
  );

  const load = async () => {
    setLoading(true);
    try {
      const [notifs, us, hallsRes, provRes] = await Promise.all([
        fetchPendingNotifications(),
        fetchUsers(),
        api.get('/halls'),
        api.get('/proveniences'),
      ]);
      setUsers(us);
      setHalls(hallsRes.data);
      setProveniences(provRes.data);

      const map = (n: NotificationDto): RowType => {
        const de = [n.provenience?.name, n.hall?.name].filter(Boolean).join(' ');
        const fecha = n.receptionDatetime ? dayjs(n.receptionDatetime).format('DD/MM/YYYY') : '';
        const hora = n.receptionDatetime ? dayjs(n.receptionDatetime).format('HH:mm') : '';
        return {
          key: n.id,
          fecha,
          horaRecibido: hora,
          de,
          cedula: n.cedule,
          expediente: n.expedientNum,
          dirigidaA: n.directedTo,
          raw: n,
        };
      };

      setRows(notifs.map(map));
    } catch (e: any) {
      console.error(e);
      message.error(e?.response?.data?.message || 'Error al cargar notificaciones');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const rowSelection = {
    selectedRowKeys,
    onChange: (keys: React.Key[]) => setSelectedRowKeys(keys),
  };

  const openDeliver = () => {
    if (selectedRowKeys.length === 0) {
      message.warning('Selecciona al menos una notificación');
      return;
    }
    form.resetFields();
    setDeliverOpen(true);
  };

  const submitDeliver = async () => {
    try {
      const { userId } = await form.validateFields();
      const ids = selectedRowKeys.map(Number);

      setDeliverLoading(true);
      await deliverNotifications({
        ids,
        action: 1, // entregar
        deliverTo: userId,
      });

      message.success('Notificaciones entregadas');
      setDeliverOpen(false);
      setSelectedRowKeys([]);
      load();
    } catch (e: any) {
      if (e?.errorFields) return;
      console.error(e);
      message.error(e?.response?.data?.message || 'Error al entregar notificaciones');
    } finally {
      setDeliverLoading(false);
    }
  };

  const submitCreate = async () => {
    try {
      const values = await createForm.validateFields();

      // 🚫 Eliminar deliveryDatetime para que se cree como "pendiente"
      const { deliveryDatetime, deliverTo, ...cleanedValues } = values;

      setCreateLoading(true);
      await createNotification(cleanedValues as CreateNotificationPayload);

      message.success('Notificación creada con éxito');
      setCreateOpen(false);
      load();
    } catch (e: any) {
      if (e.errorFields) return;
      console.error(e);
      message.error(e?.response?.data?.message || 'Error al crear notificación');
    } finally {
      setCreateLoading(false);
    }
  };

  return (
    <Card title="Notificaciones pendientes de entrega">
      <Tabs defaultActiveKey="1">
        <TabPane tab="Notificaciones" key="1">
          <div style={{ marginBottom: 16 }}>
            <Button type="primary" style={{ marginRight: 8 }} onClick={() => {
              createForm.resetFields();
              setCreateOpen(true);
            }}>
              Crear notificación
            </Button>
            <Button type="dashed" style={{ marginRight: 8 }} onClick={() => message.info('Ver entregadas (pendiente)')}>
              Entregadas
            </Button>
            <Button type="primary" danger onClick={openDeliver} disabled={selectedRowKeys.length === 0}>
              Entregar
            </Button>
          </div>

          <Table
            rowSelection={rowSelection}
            columns={columns}
            dataSource={rows}
            loading={loading}
            pagination={{ pageSize: 10 }}
            locale={{ emptyText: 'No hay notificaciones pendientes' }}
          />
        </TabPane>
      </Tabs>

      {/* MODAL ENTREGAR */}
      <Modal
        title="Entregar notificaciones"
        open={deliverOpen}
        onCancel={() => setDeliverOpen(false)}
        confirmLoading={deliverLoading}
        onOk={submitDeliver}
        okText="Entregar"
      >
        <Form layout="vertical" form={form}>
          <Form.Item name="userId" label="Usuario" rules={[{ required: true, message: 'Selecciona usuario' }]}>
            <Select
              showSearch
              placeholder="Selecciona usuario"
              options={users.map(u => ({ value: u.id, label: fullName(u) || u.email || `Usuario ${u.id}` }))}
              filterOption={(input, opt) => (opt?.label as string).toLowerCase().includes(input.toLowerCase())}
            />
          </Form.Item>
        </Form>
      </Modal>

      {/* MODAL CREAR */}
      <Modal
        title="Crear notificación"
        open={createOpen}
        onCancel={() => setCreateOpen(false)}
        confirmLoading={createLoading}
        onOk={submitCreate}
        okText="Crear"
      >
        <Form form={createForm} layout="vertical">
          <Form.Item name="creator" label="Creador" rules={[{ required: true }]}>
            <Select options={users.map(u => ({ value: u.id, label: fullName(u) || u.email }))} showSearch />
          </Form.Item>

          <Form.Item name="creationPlace" label="Lugar de creación" rules={[{ required: true }]}>
            <Select options={halls.map(h => ({ value: h.id, label: h.name }))} showSearch />
          </Form.Item>

          <Form.Item name="provenience" label="Proveniencia">
            <Select options={proveniences.map(p => ({ value: p.id, label: p.name }))} showSearch />
          </Form.Item>

          <Form.Item name="hall" label="Sala">
            <Select options={halls.map(h => ({ value: h.id, label: h.name }))} showSearch />
          </Form.Item>

          <Form.Item name="cedule" label="Cédula" rules={[{ required: true }]}>
            <Input />
          </Form.Item>

          <Form.Item name="expedientNum" label="No. Expediente" rules={[{ required: true }]}>
            <Input />
          </Form.Item>

          <Form.Item name="directedTo" label="Dirigida a" rules={[{ required: true }]}>
            <Input />
          </Form.Item>

          <Form.Item name="recepReceives" label="Usuario receptor" rules={[{ required: true }]}>
            <Select options={users.map(u => ({ value: u.id, label: fullName(u) || u.email }))} showSearch />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
};

export default Notificaciones;
