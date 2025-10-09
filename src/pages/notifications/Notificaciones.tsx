import React, { useEffect, useState } from 'react';
import {
  Button,
  Card,
  Table,
  Tabs,
  Form,
  message,
  Space,
  Popconfirm,
  Modal,
  Select,
  Input,
  Spin,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';

import {
  fetchPendingNotifications,
  fetchDeliveredNotifications,
  deliverNotifications,
  createNotification,
  fetchProveniences,
  fetchHalls,
  fetchHallsByProvenience,
  type NotificationDto,
  type CreateNotificationPayload,
} from '../../api/notifications';

import NotificationFilters from './NotificationFilters';
import AddProvenienceModal from './AddProvenienceModal';

interface NotificationRow {
  key: number;
  fecha: string;
  horaRecibido?: string;
  de: string;
  cedula: string;
  expediente: string;
  dirigidaA: string;
  recibe?: string;
  fechaEntrega?: string;
  horaEntrega?: string;
  entregadaA?: string;
  quienEntrega?: string;
  raw: NotificationDto;
}

const Notificaciones: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [loadingHalls, setLoadingHalls] = useState(false);
  const [pendingRows, setPendingRows] = useState<NotificationRow[]>([]);
  const [deliveredRows, setDeliveredRows] = useState<NotificationRow[]>([]);
  const [filters, setFilters] = useState<Record<string, unknown>>({});
  const [proveniences, setProveniences] = useState<
    { id: number; name: string; halls?: { id: number; name: string }[] }[]
  >([]);
  const [halls, setHalls] = useState<{ id: number; name: string }[]>([]);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [createForm] = Form.useForm<CreateNotificationPayload>();
  const [editingRow, setEditingRow] = useState<NotificationDto | null>(null);
  const [deliverForm] = Form.useForm<{ userId: number }>();
  const [isCreateModalVisible, setIsCreateModalVisible] = useState(false);
  const [isAddProvOpen, setIsAddProvOpen] = useState(false);

  // 🔹 Cargar datos iniciales
  const loadData = async () => {
    setLoading(true);
    try {
      const [pending, delivered, provRes, hallsRes] = await Promise.all([
        fetchPendingNotifications(),
        fetchDeliveredNotifications(filters),
        fetchProveniences(),
        fetchHalls(),
      ]);

      setProveniences(provRes);
      setHalls(hallsRes);

      const mapPending: NotificationRow[] = pending.map((n) => ({
        key: n.id,
        fecha: n.receptionDatetime ? dayjs(n.receptionDatetime).format('DD/MM/YYYY') : '',
        horaRecibido: n.receptionDatetime ? dayjs(n.receptionDatetime).format('HH:mm') : '',
        de: [n.provenience?.name, n.hall?.name].filter(Boolean).join(' '),
        cedula: n.cedule,
        expediente: n.expedientNum,
        dirigidaA: n.directedTo,
        raw: n,
      }));

      const mapDelivered: NotificationRow[] = delivered.map((n) => ({
        key: n.id,
        fecha: n.receptionDatetime ? dayjs(n.receptionDatetime).format('DD/MM/YYYY') : '',
        horaRecibido: n.receptionDatetime ? dayjs(n.receptionDatetime).format('HH:mm') : '',
        de: [n.provenience?.name, n.hall?.name].filter(Boolean).join(' '),
        cedula: n.cedule,
        expediente: n.expedientNum,
        dirigidaA: n.directedTo,
        recibe: n.recepReceives
          ? `${n.recepReceives.first_name} ${n.recepReceives.last_name}`
          : '',
        fechaEntrega: n.receptionDatetime
          ? dayjs(n.receptionDatetime).format('DD/MM/YYYY')
          : '',
        horaEntrega: n.receptionDatetime ? dayjs(n.receptionDatetime).format('HH:mm') : '',
        entregadaA:
          typeof n.deliverTo === 'object'
            ? `${n.deliverTo?.first_name ?? ''} ${n.deliverTo?.last_name ?? ''}`
            : String(n.deliverTo ?? ''),
        quienEntrega: n.recepDelivery
          ? `${n.recepDelivery.first_name} ${n.recepDelivery.last_name}`
          : '',
        raw: n,
      }));

      setPendingRows(mapPending);
      setDeliveredRows(mapDelivered);
    } catch (err) {
      console.error('Error loadData:', err);
      message.error('Error cargando notificaciones');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, [filters]);

  // 🔹 Entregar seleccionadas
  const submitDeliver = async () => {
    try {
      const values = await deliverForm.validateFields();
      const ids = selectedRowKeys.map((k) => Number(k));
      await deliverNotifications({ ids, action: 1, deliverTo: values.userId });
      message.success('Notificaciones entregadas correctamente');
      setSelectedRowKeys([]);
      void loadData();
    } catch {
      message.error('Error al entregar notificaciones');
    }
  };

  // 🔹 Crear o editar notificación
  const handleCreateNotification = async () => {
    try {
      const values = await createForm.validateFields();
      await createNotification(values);
      message.success('Notificación creada correctamente');
      setIsCreateModalVisible(false);
      createForm.resetFields();
      void loadData();
    } catch {
      message.error('Error al guardar la notificación');
    }
  };

  // 🔹 Eliminar notificación
  const handleDeleteNotification = async (id: number) => {
    message.success(`Notificación ${id} eliminada`);
    void loadData();
  };

  // 🔹 Cambiar entidad (procedencia)
  const handleProvenienceChange = async (provId?: number) => {
    if (!provId) {
      setHalls([]);
      return;
    }

    try {
      setLoadingHalls(true);
      const hallsByProv = await fetchHallsByProvenience(provId);
      setHalls(hallsByProv);

      // Solo limpiar la sala si ya hay una seleccionada
      if (createForm.getFieldValue('hall')) {
        createForm.setFieldsValue({ hall: undefined });
      }
    } catch (err) {
      console.error('Error al cargar salas:', err);
      message.error('No se pudieron cargar las salas');
    } finally {
      setLoadingHalls(false);
    }
  };

  // 🔹 Al crear nueva entidad
  const handleProvenienceCreated = async (created: { id: number; name: string }) => {
    try {
      const prov = await fetchProveniences();
      setProveniences(prov);
      createForm.setFieldsValue({ provenience: created.id });
      await handleProvenienceChange(created.id);
    } catch {
      message.warning('Entidad creada, pero no se pudo refrescar la lista automáticamente');
    }
  };

  // 🔹 Refrescar entidades antes de abrir modal
  const openCreateModal = async () => {
    try {
      const prov = await fetchProveniences();
      setProveniences(prov);
    } finally {
      setIsCreateModalVisible(true);
    }
  };

  // 🔹 Columnas tabla pendientes
  const pendingColumns: ColumnsType<NotificationRow> = [
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
          <Button
            type="primary"
            onClick={() => {
              setEditingRow(record.raw);
              createForm.setFieldsValue({
                provenience: record.raw.provenience?.id,
                hall: record.raw.hall?.id,
                cedule: record.raw.cedule,
                expedientNum: record.raw.expedientNum,
                directedTo: record.raw.directedTo,
              });
              setIsCreateModalVisible(true);
            }}
          >
            Editar
          </Button>
          <Popconfirm
            title="¿Eliminar notificación?"
            onConfirm={() => handleDeleteNotification(record.raw.id)}
          >
            <Button danger>Eliminar</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  // 🔹 Columnas tabla entregadas
  const deliveredColumns: ColumnsType<NotificationRow> = [
    { title: 'Fecha recepción', dataIndex: 'fecha', key: 'fecha' },
    { title: 'Hora recepción', dataIndex: 'horaRecibido', key: 'horaRecibido' },
    { title: 'De', dataIndex: 'de', key: 'de' },
    { title: 'Cédula', dataIndex: 'cedula', key: 'cedula' },
    { title: 'No. Expediente', dataIndex: 'expediente', key: 'expediente' },
    { title: 'Dirigida a', dataIndex: 'dirigidaA', key: 'dirigidaA' },
    { title: 'Recibe', dataIndex: 'recibe', key: 'recibe' },
    { title: 'Entregada a', dataIndex: 'entregadaA', key: 'entregadaA' },
    { title: 'Quien entrega', dataIndex: 'quienEntrega', key: 'quienEntrega' },
  ];

  return (
    <Card title="Notificaciones">
      <Tabs defaultActiveKey="1">
        <Tabs.TabPane tab="Pendientes" key="1">
          <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
            <Button type="primary" onClick={openCreateModal}>
              Crear notificación
            </Button>
            <Button
              type="primary"
              danger
              disabled={selectedRowKeys.length === 0}
              onClick={submitDeliver}
            >
              Entregar seleccionadas
            </Button>
          </div>
          <Table
            rowSelection={{ selectedRowKeys, onChange: setSelectedRowKeys }}
            columns={pendingColumns}
            dataSource={pendingRows}
            loading={loading}
            pagination={{ pageSize: 10 }}
          />
        </Tabs.TabPane>

        <Tabs.TabPane tab="Entregadas" key="2">
          <NotificationFilters
            filters={filters}
            setFilters={setFilters}
            proveniences={proveniences}
            halls={halls}
          />
          <Table
            columns={deliveredColumns}
            dataSource={deliveredRows}
            loading={loading}
            pagination={{ pageSize: 10 }}
          />
        </Tabs.TabPane>
      </Tabs>

      {/* 🔹 Modal crear/editar notificación */}
      <Modal
        title={editingRow ? 'Editar Notificación' : 'Crear Notificación'}
        open={isCreateModalVisible}
        onOk={handleCreateNotification}
        onCancel={() => {
          setIsCreateModalVisible(false);
          setEditingRow(null);
          createForm.resetFields();
        }}
        okText={editingRow ? 'Actualizar' : 'Crear'}
        cancelText="Cancelar"
      >
        <Form form={createForm} layout="vertical">
          <Form.Item
            name="provenience"
            label="Procedencia"
            rules={[{ required: true, message: 'Seleccione la procedencia' }]}
          >
            <Select
              placeholder="Seleccione entidad"
              options={proveniences.map((p) => ({ label: p.name, value: p.id }))}
              onChange={handleProvenienceChange}
              dropdownRender={(menu) => (
                <>
                  {menu}
                  <div style={{ padding: 8 }}>
                    <Button type="link" onClick={() => setIsAddProvOpen(true)}>
                      + Agregar nueva entidad
                    </Button>
                  </div>
                </>
              )}
            />
          </Form.Item>

          <Form.Item name="hall" label="Sala">
            <Select
              placeholder={loadingHalls ? 'Cargando salas...' : 'Seleccione sala/oficina'}
              allowClear
              notFoundContent={loadingHalls ? <Spin size="small" /> : null}
              options={halls.map((h) => ({ label: h.name, value: h.id }))}
            />
          </Form.Item>

          <Form.Item
            name="cedule"
            label="Cédula"
            rules={[{ required: true, message: 'Ingrese la cédula' }]}
          >
            <Input placeholder="Ej. 1234567-8" />
          </Form.Item>

          <Form.Item
            name="expedientNum"
            label="Número de Expediente"
            rules={[{ required: true, message: 'Ingrese el número de expediente' }]}
          >
            <Input placeholder="Ej. 456-2025" />
          </Form.Item>

          <Form.Item
            name="directedTo"
            label="Dirigida a"
            rules={[{ required: true, message: 'Ingrese a quién va dirigida' }]}
          >
            <Input placeholder="Ej. Secretaría General" />
          </Form.Item>
        </Form>
      </Modal>

      {/* 🔹 Modal para nueva entidad */}
      <AddProvenienceModal
        open={isAddProvOpen}
        onClose={() => setIsAddProvOpen(false)}
        onCreated={handleProvenienceCreated}
      />
    </Card>
  );
};

export default Notificaciones;