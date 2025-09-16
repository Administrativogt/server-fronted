import React, { useEffect, useMemo, useState } from "react";
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
  Checkbox,
  Popconfirm,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import dayjs from "dayjs";

import {
  fetchPendingNotifications,
  fetchDeliveredNotifications,
  deliverNotifications,
  createNotification,
  type NotificationDto,
  type CreateNotificationPayload,
  fetchProveniences,
  fetchHalls,
  fetchPlaces, // ✅ nuevo import
} from "../../api/notifications";

import { fetchUsers, fullName, type UserLite } from "../../api/users";
import NotificationFilters from "./NotificationFilters";

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
  const [deliveredRows, setDeliveredRows] = useState<any[]>([]);
  const [filters, setFilters] = useState<Record<string, any>>({});

  const [users, setUsers] = useState<UserLite[]>([]);
  const [halls, setHalls] = useState<{ id: number; name: string }[]>([]);
  const [proveniences, setProveniences] = useState<{ id: number; name: string }[]>([]);
  const [places, setPlaces] = useState<{ id: number; name: string }[]>([]);

  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [deliverOpen, setDeliverOpen] = useState(false);
  const [deliverLoading, setDeliverLoading] = useState(false);
  const [form] = Form.useForm<{ userId: number }>();

  const [createOpen, setCreateOpen] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [createForm] = Form.useForm<CreateNotificationPayload & { useOtherProvenience: boolean }>();

  const [editingRow, setEditingRow] = useState<RowType | null>(null);

  //
  // 📌 COLUMNAS PARA TABLA PENDIENTES
  //
  const pendingColumns: ColumnsType<RowType> = useMemo(
    () => [
      { title: "Fecha", dataIndex: "fecha", key: "fecha" },
      { title: "Hora recibido", dataIndex: "horaRecibido", key: "horaRecibido" },
      { title: "De", dataIndex: "de", key: "de" },
      { title: "Cédula", dataIndex: "cedula", key: "cedula" },
      { title: "No. Expediente", dataIndex: "expediente", key: "expediente" },
      { title: "Dirigida a", dataIndex: "dirigidaA", key: "dirigidaA" },
      {
        title: "Opciones",
        key: "opciones",
        render: (_, record) => (
          <Space>
            <Button
              type="primary"
              onClick={() => {
                setEditingRow(record);
                createForm.setFieldsValue({
                  creator: 1, // ⚠️ ID real de auth
                  creationPlace: record.raw.hall?.id,
                  hall: record.raw.hall?.id,
                  provenience: record.raw.provenience?.id,
                  cedule: record.raw.cedule,
                  expedientNum: record.raw.expedientNum,
                  directedTo: record.raw.directedTo,
                  recepReceives: record.raw.recepReceives?.id,
                  useOtherProvenience: false,
                });
                setCreateOpen(true);
              }}
            >
              Editar
            </Button>
            <Popconfirm
              title="¿Eliminar notificación?"
              onConfirm={() => handleDelete(record.key)}
              okText="Sí"
              cancelText="No"
            >
              <Button type="primary" danger>
                Eliminar
              </Button>
            </Popconfirm>
          </Space>
        ),
      },
    ],
    []
  );

  //
  // 📌 COLUMNAS PARA TABLA ENTREGADAS
  //
  const deliveredColumns: ColumnsType<any> = useMemo(
    () => [
      { title: "Fecha recepción", dataIndex: "fechaRecepcion" },
      { title: "Hora recepción", dataIndex: "horaRecepcion" },
      { title: "De", dataIndex: "de" },
      { title: "Cédula", dataIndex: "cedula" },
      { title: "No. Expediente", dataIndex: "expediente" },
      { title: "Dirigida a", dataIndex: "dirigidaA" },
      { title: "Recibe", dataIndex: "recibe" },
      { title: "Fecha entrega", dataIndex: "fechaEntrega" },
      { title: "Hora entrega", dataIndex: "horaEntrega" },
      { title: "Entregada a", dataIndex: "entregadaA" },
      { title: "Quien entrega", dataIndex: "quienEntrega" },
    ],
    []
  );

  //
  // 📌 CARGA DE DATOS
  //
  const load = async () => {
    setLoading(true);
    try {
      const [notifs, delivered, us, hallsRes, provRes, placesRes] = await Promise.all([
        fetchPendingNotifications(),
        fetchDeliveredNotifications(filters),
        fetchUsers(),
        fetchHalls(),
        fetchProveniences(),
        fetchPlaces(), // ✅ ahora desde backend
      ]);

      setUsers(us);
      setHalls(hallsRes);
      setProveniences(provRes);
      setPlaces(placesRes);

      const mapPending = (n: NotificationDto): RowType => {
        const de = [n.provenience?.name, n.hall?.name].filter(Boolean).join(" ");
        return {
          key: n.id,
          fecha: n.receptionDatetime ? dayjs(n.receptionDatetime).format("DD/MM/YYYY") : "",
          horaRecibido: n.receptionDatetime ? dayjs(n.receptionDatetime).format("HH:mm") : "",
          de,
          cedula: n.cedule,
          expediente: n.expedientNum,
          dirigidaA: n.directedTo,
          raw: n,
        };
      };

      const mapDelivered = (n: NotificationDto) => {
        const de = [n.provenience?.name, n.hall?.name].filter(Boolean).join(" ");
        return {
          key: n.id,
          fechaRecepcion: n.receptionDatetime
            ? dayjs(n.receptionDatetime).format("DD/MM/YYYY")
            : "",
          horaRecepcion: n.receptionDatetime
            ? dayjs(n.receptionDatetime).format("HH:mm")
            : "",
          de,
          cedula: n.cedule,
          expediente: n.expedientNum,
          dirigidaA: n.directedTo,
          recibe: n.recepReceives
            ? `${n.recepReceives.first_name} ${n.recepReceives.last_name}`
            : "",
          fechaEntrega: n.receptionDatetime
            ? dayjs(n.receptionDatetime).format("DD/MM/YYYY")
            : "",
          horaEntrega: n.receptionDatetime
            ? dayjs(n.receptionDatetime).format("HH:mm")
            : "",
          entregadaA: n.deliverTo
            ? `${n.deliverTo.first_name} ${n.deliverTo.last_name}`
            : "",
          quienEntrega: n.recepDelivery
            ? `${n.recepDelivery.first_name} ${n.recepDelivery.last_name}`
            : "",
        };
      };

      setRows(notifs.map(mapPending));
      setDeliveredRows(delivered.map(mapDelivered));
    } catch (e: any) {
      console.error(e);
      message.error(e?.response?.data?.message || "Error al cargar notificaciones");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [filters]);

  //
  // 📌 ACCIONES
  //
  const rowSelection = {
    selectedRowKeys,
    onChange: (keys: React.Key[]) => setSelectedRowKeys(keys),
  };

  const openDeliver = () => {
    if (selectedRowKeys.length === 0) {
      message.warning("Selecciona al menos una notificación");
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
      await deliverNotifications({ ids, action: 1, deliverTo: userId });

      message.success("Notificaciones entregadas");
      setDeliverOpen(false);
      setSelectedRowKeys([]);
      load();
    } catch (e: any) {
      console.error(e);
      message.error("Error al entregar notificaciones");
    } finally {
      setDeliverLoading(false);
    }
  };

  const submitCreate = async () => {
    try {
      const values = await createForm.validateFields();

      const payload: CreateNotificationPayload = {
        creator: 1, // ⚠️ meter userId real
        creationPlace: values.creationPlace,
        hall: values.hall,
        cedule: values.cedule,
        expedientNum: values.expedientNum,
        directedTo: values.directedTo,
        recepReceives: values.recepReceives,
        provenience: values.useOtherProvenience ? undefined : values.provenience,
        otherProvenience: values.useOtherProvenience ? values.otherProvenience : undefined,
      };

      setCreateLoading(true);
      await createNotification(payload);

      message.success(editingRow ? "Notificación actualizada" : "Notificación creada");
      setCreateOpen(false);
      setEditingRow(null);
      load();
    } catch (e: any) {
      console.error(e);
      message.error("Error al crear/editar notificación");
    } finally {
      setCreateLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await fetch(`/notifications/${id}`, { method: "DELETE" });
      message.success("Notificación eliminada");
      load();
    } catch (e: any) {
      console.error(e);
      message.error("Error al eliminar notificación");
    }
  };

  //
  // 📌 RENDER
  //
  return (
    <Card title="Notificaciones">
      <Tabs defaultActiveKey="1">
        {/* TAB PENDIENTES */}
        <TabPane tab="Pendientes" key="1">
          <div style={{ marginBottom: 16 }}>
            <Button
              type="primary"
              style={{ marginRight: 8 }}
              onClick={() => {
                createForm.resetFields();
                setEditingRow(null);
                setCreateOpen(true);
              }}
            >
              Crear notificación
            </Button>
            <Button
              type="primary"
              danger
              onClick={openDeliver}
              disabled={selectedRowKeys.length === 0}
            >
              Entregar
            </Button>
          </div>

          <Table
            rowSelection={rowSelection}
            columns={pendingColumns}
            dataSource={rows}
            loading={loading}
            pagination={{ pageSize: 10 }}
            locale={{ emptyText: "No hay notificaciones pendientes" }}
          />
        </TabPane>

        {/* TAB ENTREGADAS */}
        <TabPane tab="Entregadas" key="2">
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
            locale={{ emptyText: "No hay notificaciones entregadas" }}
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
          <Form.Item
            name="userId"
            label="Usuario"
            rules={[{ required: true, message: "Selecciona usuario" }]}
          >
            <Select
              showSearch
              placeholder="Selecciona usuario"
              options={users.map((u) => ({
                value: u.id,
                label: fullName(u) || u.email || `Usuario ${u.id}`,
              }))}
            />
          </Form.Item>
        </Form>
      </Modal>

      {/* MODAL CREAR/EDITAR */}
      <Modal
        title={editingRow ? "Editar notificación" : "Crear notificación"}
        open={createOpen}
        onCancel={() => {
          setCreateOpen(false);
          setEditingRow(null);
        }}
        confirmLoading={createLoading}
        onOk={submitCreate}
        okText={editingRow ? "Actualizar" : "Crear"}
      >
        <Form form={createForm} layout="vertical">
          <Form.Item label="Entidad">
            <Form.Item name="provenience" noStyle>
              <Select
                showSearch
                placeholder="Selecciona entidad"
                options={proveniences.map((p) => ({ value: p.id, label: p.name }))}
                disabled={createForm.getFieldValue("useOtherProvenience")}
              />
            </Form.Item>
            <div style={{ marginTop: 8 }}>
              <Form.Item name="useOtherProvenience" valuePropName="checked" noStyle>
                <Checkbox>Otro</Checkbox>
              </Form.Item>
              {createForm.getFieldValue("useOtherProvenience") && (
                <Form.Item
                  name="otherProvenience"
                  noStyle
                  rules={[{ required: true, message: "Escribe la entidad" }]}
                >
                  <Input placeholder="Escribe otra entidad" style={{ marginLeft: 8, width: "70%" }} />
                </Form.Item>
              )}
            </div>
          </Form.Item>

          <Form.Item name="creationPlace" label="Recibido en" rules={[{ required: true }]}>
            <Select
              placeholder="Selecciona lugar"
              options={places.map((pl) => ({ value: pl.id, label: pl.name }))}
            />
          </Form.Item>

          <Form.Item name="hall" label="Sala">
            <Select
              showSearch
              placeholder="Selecciona sala"
              options={halls.map((h) => ({ value: h.id, label: h.name }))}
            />
          </Form.Item>

          <Form.Item name="cedule" label="Cédula" rules={[{ required: true }]}>
            <Input />
          </Form.Item>

          <Form.Item name="expedientNum" label="No. Expediente" rules={[{ required: true }]}>
            <Input />
          </Form.Item>

          <Form.Item name="directedTo" label="Dirigido a" rules={[{ required: true }]}>
            <Input />
          </Form.Item>

          <Form.Item name="recepReceives" label="Recibe" rules={[{ required: true }]}>
            <Select
              showSearch
              placeholder="Selecciona usuario"
              options={users.map((u) => ({ value: u.id, label: fullName(u) || u.email }))}
            />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
};

export default Notificaciones;
