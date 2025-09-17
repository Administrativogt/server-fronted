// src/pages/notifications/Notificaciones.tsx

import React, { useEffect, useState } from "react";
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
  Row,
  Col,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import dayjs from "dayjs";

import {
  fetchPendingNotifications,
  fetchDeliveredNotifications,
  deliverNotifications,
  createNotification,
  fetchProveniences,
  fetchHalls,
  fetchPlaces,
  fetchHallsByProvenience,
  type NotificationDto,
  type CreateNotificationPayload,
  createProvenience,
} from "../../api/notifications";

import { fetchUsers, fullName, type UserLite } from "../../api/users";
import NotificationFilters from "./NotificationFilters";

const Notificaciones: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [pendingRows, setPendingRows] = useState<any[]>([]);
  const [deliveredRows, setDeliveredRows] = useState<any[]>([]);
  const [filters, setFilters] = useState<Record<string, any>>({});

  const [users, setUsers] = useState<UserLite[]>([]);
  const [proveniences, setProveniences] = useState<{ id: number; name: string; halls?: { id: number; name: string }[] }[]>([]);
  const [places, setPlaces] = useState<{ id: number; name: string }[]>([]);
  const [halls, setHalls] = useState<{ id: number; name: string }[]>([]);

  const [relatedHalls, setRelatedHalls] = useState<{ id: number; name: string }[]>([]);
  const [showHallField, setShowHallField] = useState(false);

  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);

  const [createOpen, setCreateOpen] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [createForm] = Form.useForm<
    CreateNotificationPayload & { useOtherProvenience: boolean; otherProvenience?: string }
  >();
  const [editingRow, setEditingRow] = useState<NotificationDto | null>(null);

  const [deliverOpen, setDeliverOpen] = useState(false);
  const [deliverLoading, setDeliverLoading] = useState(false);
  const [deliverForm] = Form.useForm<{ userId: number }>();

  const [addProvenienceOpen, setAddProvenienceOpen] = useState(false);
  const [newProvenienceForm] = Form.useForm<{ entityName: string; includeHall: boolean; hallName?: string }>();

  const loadData = async () => {
    setLoading(true);
    try {
      const [
        pendings,
        delivered,
        us,
        provRes,
        placesRes,
        hallsRes,
      ] = await Promise.all([
        fetchPendingNotifications(),
        fetchDeliveredNotifications(filters),
        fetchUsers(),
        fetchProveniences(),
        fetchPlaces(),
        fetchHalls(),
      ]);

      setUsers(us);
      setProveniences(provRes);
      setPlaces(placesRes);
      setHalls(hallsRes);

      const mappedPendings = pendings.map((n: NotificationDto) => ({
        key: n.id,
        fecha: n.receptionDatetime ? dayjs(n.receptionDatetime).format("DD/MM/YYYY") : "",
        horaRecibido: n.receptionDatetime ? dayjs(n.receptionDatetime).format("HH:mm") : "",
        de: [n.provenience?.name, n.hall?.name].filter(Boolean).join(" "),
        cedula: n.cedule,
        expediente: n.expedientNum,
        dirigidaA: n.directedTo,
        raw: n,
      }));

      const mappedDelivered = delivered.map((n: NotificationDto) => ({
        key: n.id,
        fechaRecepcion: n.receptionDatetime ? dayjs(n.receptionDatetime).format("DD/MM/YYYY") : "",
        horaRecepcion: n.receptionDatetime ? dayjs(n.receptionDatetime).format("HH:mm") : "",
        de: [n.provenience?.name, n.hall?.name].filter(Boolean).join(" "),
        cedula: n.cedule,
        expediente: n.expedientNum,
        dirigidaA: n.directedTo,
        recibe: n.recepReceives ? `${n.recepReceives.first_name} ${n.recepReceives.last_name}` : "",
        fechaEntrega: n.receptionDatetime ? dayjs(n.receptionDatetime).format("DD/MM/YYYY") : "",
        horaEntrega: n.receptionDatetime ? dayjs(n.receptionDatetime).format("HH:mm") : "",
        entregadaA: n.deliverTo ? `${n.deliverTo.first_name} ${n.deliverTo.last_name}` : "",
        quienEntrega: n.recepDelivery ? `${n.recepDelivery.first_name} ${n.recepDelivery.last_name}` : "",
      }));

      setPendingRows(mappedPendings);
      setDeliveredRows(mappedDelivered);
    } catch (err: any) {
      console.error("Error loadData:", err);
      message.error("Error cargando notificaciones");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [filters]);

  const loadHallsForEntity = async (provId: number) => {
    try {
      const hallsList = await fetchHallsByProvenience(provId);
      setRelatedHalls(hallsList);
      setShowHallField(hallsList.length > 0);
    } catch (err) {
      console.error("loadHallsForEntity err:", err);
      setRelatedHalls([]);
      setShowHallField(false);
    }
  };

  const submitCreate = async () => {
    try {
      const values = await createForm.validateFields();
      const payload: CreateNotificationPayload = {
        creator: 1,
        creationPlace: values.creationPlace,
        hall: showHallField ? values.hall : undefined,
        cedule: values.cedule,
        expedientNum: values.expedientNum,
        directedTo: values.directedTo,
        recepReceives: values.recepReceives!,
        provenience: values.provenience,
        otherProvenience: values.otherProvenience,
      };

      setCreateLoading(true);
      await createNotification(payload);

      message.success(editingRow ? "Notificación actualizada" : "Notificación creada");
      setCreateOpen(false);
      setEditingRow(null);
      setShowHallField(false);
      setRelatedHalls([]);
      createForm.resetFields();
      loadData();
    } catch (err: any) {
      console.error("submitCreate err:", err);
      message.error("Error guardando la notificación");
    } finally {
      setCreateLoading(false);
    }
  };

  const submitDeliver = async () => {
    try {
      const values = await deliverForm.validateFields();
      const userId = values.userId;
      const ids = selectedRowKeys.map((k) => Number(k));

      setDeliverLoading(true);
      await deliverNotifications({ ids, action: 1, deliverTo: userId });

      message.success("Notificaciones entregadas correctamente");
      setDeliverOpen(false);
      setSelectedRowKeys([]);
      loadData();
    } catch (err) {
      console.error("submitDeliver err:", err);
      message.error("Error al entregar notificaciones");
    } finally {
      setDeliverLoading(false);
    }
  };

  const pendingColumns: ColumnsType<any> = [
    { title: "Fecha", dataIndex: "fecha", key: "fecha" },
    { title: "Hora recibido", dataIndex: "horaRecibido", key: "horaRecibido" },
    { title: "De", dataIndex: "de", key: "de" },
    { title: "Cédula", dataIndex: "cedula", key: "cedula" },
    { title: "No. Expediente", dataIndex: "expediente", key: "expediente" },
    { title: "Dirigida a", dataIndex: "dirigidaA", key: "dirigidaA" },
    {
      title: "Opciones",
      key: "opciones",
      render: (_: any, record: any) => (
        <Space>
          <Button
            type="primary"
            onClick={() => {
              const raw = record.raw as NotificationDto;
              setEditingRow(raw);
              createForm.setFieldsValue({
                useOtherProvenience: false,
                otherProvenience: "",
                provenience: raw.provenience?.id,
                hall: raw.hall?.id,
                creationPlace: raw.creationPlace ?? undefined,
                cedule: raw.cedule,
                expedientNum: raw.expedientNum,
                directedTo: raw.directedTo,
                recepReceives: raw.recepReceives?.id,
              });
              if (raw.provenience?.id) {
                loadHallsForEntity(raw.provenience.id);
              }
              setCreateOpen(true);
            }}
          >
            Editar
          </Button>
          <Popconfirm
            title="¿Eliminar notificación?"
            onConfirm={async () => {
              message.success("Notificación eliminada");
              loadData();
            }}
            okText="Sí"
            cancelText="No"
          >
            <Button danger>Eliminar</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const tabsItems = [
    {
      key: "1",
      label: "Pendientes",
      children: (
        <>
          <div style={{ marginBottom: 16, display: "flex", justifyContent: "space-between", flexWrap: "wrap" }}>
            <Button
              type="primary"
              onClick={() => {
                createForm.resetFields();
                setEditingRow(null);
                setShowHallField(false);
                setRelatedHalls([]);
                setCreateOpen(true);
              }}
            >
              Crear notificación
            </Button>
            <Button
              type="primary"
              danger
              disabled={selectedRowKeys.length === 0}
              onClick={() => setDeliverOpen(true)}
            >
              Entregar seleccionadas
            </Button>
          </div>
          <Table
            rowSelection={{
              selectedRowKeys,
              onChange: (keys) => setSelectedRowKeys(keys),
            }}
            columns={pendingColumns}
            dataSource={pendingRows}
            loading={loading}
            pagination={{ pageSize: 10 }}
            locale={{ emptyText: "No hay notificaciones pendientes" }}
          />
        </>
      ),
    },
    {
      key: "2",
      label: "Entregadas",
      children: (
        <>
          <NotificationFilters
            filters={filters}
            setFilters={setFilters}
            proveniences={proveniences}
            halls={halls}
          />
          <Table
            columns={[
              { title: "Fecha recepción", dataIndex: "fechaRecepcion", key: "fechaRecepcion" },
              { title: "Hora recepción", dataIndex: "horaRecepcion", key: "horaRecepcion" },
              { title: "De", dataIndex: "de", key: "de" },
              { title: "Cédula", dataIndex: "cedula", key: "cedula" },
              { title: "No. Expediente", dataIndex: "expediente", key: "expediente" },
              { title: "Dirigida a", dataIndex: "dirigidaA", key: "dirigidaA" },
              { title: "Recibe", dataIndex: "recibe", key: "recibe" },
              { title: "Fecha entrega", dataIndex: "fechaEntrega", key: "fechaEntrega" },
              { title: "Hora entrega", dataIndex: "horaEntrega", key: "horaEntrega" },
              { title: "Entregada a", dataIndex: "entregadaA", key: "entregadaA" },
              { title: "Quien entrega", dataIndex: "quienEntrega", key: "quienEntrega" },
            ]}
            dataSource={deliveredRows}
            loading={loading}
            pagination={{ pageSize: 10 }}
            locale={{ emptyText: "No hay notificaciones entregadas" }}
          />
        </>
      ),
    },
  ];

  return (
    <Card title="Notificaciones">
      <Tabs defaultActiveKey="1" items={tabsItems} />

      {/* Modal Crear / Editar Notificación */}
      <Modal
        title={editingRow ? "Editar notificación" : "Crear notificación"}
        open={createOpen}
        onCancel={() => {
          setCreateOpen(false);
          setEditingRow(null);
          setShowHallField(false);
          setRelatedHalls([]);
        }}
        onOk={submitCreate}
        confirmLoading={createLoading}
        okText={editingRow ? "Actualizar" : "Crear"}
        width={800}
        style={{ top: 30 }}
        forceRender
      >
        <Form
          form={createForm}
          layout="horizontal"
          labelCol={{ span: 6 }}
          wrapperCol={{ span: 18 }}
          initialValues={{ useOtherProvenience: false }}
        >
          <Row gutter={[24, 12]}>
            <Col span={12}>
              <Form.Item
                name="provenience"
                label="Entidad"
                rules={[{ required: true, message: "Selecciona entidad" }]}
              >
                <Select
                  showSearch
                  placeholder="Selecciona entidad"
                  filterOption={(input, option) =>
                    (option?.label ?? "")
                      .toLowerCase()
                      .includes(input.toLowerCase())
                  }
                  dropdownRender={(menu) => (
                    <>
                      {menu}
                      <div
                        style={{
                          padding: "8px",
                          cursor: "pointer",
                          color: "#1890ff",
                          textAlign: "center",
                        }}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          setAddProvenienceOpen(true);
                        }}
                      >
                        + Agregar nueva entidad
                      </div>
                    </>
                  )}
                  options={proveniences.map((p) => ({
                    value: p.id,
                    label: p.name,
                  }))}
                  onChange={(val: number) => {
                    loadHallsForEntity(val);
                    createForm.setFieldsValue({ hall: undefined });
                  }}
                />
              </Form.Item>
            </Col>

            <Col span={12}>
              <Form.Item
                name="creationPlace"
                label="Recibido en"
                rules={[{ required: true, message: "Selecciona lugar" }]}
              >
                <Select
                  showSearch
                  placeholder="Selecciona lugar"
                  options={places.map((pl) => ({ value: pl.id, label: pl.name }))}
                  filterOption={(input, option) =>
                    (option?.label ?? "")
                      .toLowerCase()
                      .includes(input.toLowerCase())
                  }
                />
              </Form.Item>
            </Col>

            {showHallField && (
              <Col span={12}>
                <Form.Item
                  name="hall"
                  label="Sala"
                  rules={[{ required: true, message: "Selecciona sala" }]}
                >
                  <Select
                    showSearch
                    placeholder="Selecciona sala"
                    options={relatedHalls.map((h) => ({ value: h.id, label: h.name }))}
                    filterOption={(input, option) =>
                      (option?.label ?? "")
                        .toLowerCase()
                        .includes(input.toLowerCase())
                    }
                  />
                </Form.Item>
              </Col>
            )}

            <Col span={12}>
              <Form.Item
                name="cedule"
                label="Cédula"
                rules={[{ required: true, message: "Ingresa cédula" }]}
              >
                <Input placeholder="Ej. 001‑123456‑7890" />
              </Form.Item>
            </Col>

            <Col span={12}>
              <Form.Item
                name="expedientNum"
                label="No. Expediente"
                rules={[{ required: true, message: "Ingresa expediente" }]}
              >
                <Input />
              </Form.Item>
            </Col>

            <Col span={12}>
              <Form.Item
                name="directedTo"
                label="Dirigido a"
                rules={[{ required: true, message: "Selecciona destinatario" }]}
              >
                <Select
                  showSearch
                  placeholder="Selecciona usuario"
                  options={users.map((u) => ({
                    value: fullName(u),
                    label: `${fullName(u)} (${u.email})`,
                  }))}
                  filterOption={(input, option) =>
                    (option?.label ?? "")
                      .toLowerCase()
                      .includes(input.toLowerCase())
                  }
                />
              </Form.Item>
            </Col>

            <Col span={12}>
              <Form.Item
                name="recepReceives"
                label="Recibe"
                rules={[{ required: true, message: "Selecciona usuario" }]}
              >
                <Select
                  showSearch
                  placeholder="Selecciona usuario"
                  options={users.map((u) => ({
                    value: u.id,
                    label: fullName(u) || u.email || `Usuario ${u.id}`,
                  }))}
                  filterOption={(input, option) =>
                    (option?.label ?? "")
                      .toLowerCase()
                      .includes(input.toLowerCase())
                  }
                />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>

      {/* Modal Agregar Entidad con Select tags para salas */}
      <Modal
        title="Agregar entidad"
        open={addProvenienceOpen}
        onCancel={() => {
          setAddProvenienceOpen(false);
          newProvenienceForm.resetFields();
        }}
        onOk={async () => {
          try {
            const values = await newProvenienceForm.validateFields();

            const newProv = await createProvenience({
              name: values.entityName,
              hallName: values.includeHall ? values.hallName : undefined,
            });

            setProveniences(prev => [
              ...prev,
              { id: newProv.id, name: newProv.name, halls: newProv.halls },
            ]);
            createForm.setFieldsValue({ provenience: newProv.id });

            if (values.includeHall && newProv.halls && newProv.halls.length > 0) {
              const newHall = newProv.halls[0];
              setRelatedHalls([newHall]);
              setShowHallField(true);
              createForm.setFieldsValue({ hall: newHall.id });
            }

            setAddProvenienceOpen(false);
            newProvenienceForm.resetFields();
            message.success("Entidad creada correctamente");
          } catch (err: any) {
            console.error("Error al crear entidad:", err);
            message.error(err.response?.data?.message || "Error creando entidad");
          }
        }}
        width={500}
        style={{ top: 30 }}
        forceRender
      >
        <Form form={newProvenienceForm} layout="vertical" initialValues={{ includeHall: false }}>
          <Form.Item
            name="entityName"
            label="Nombre de entidad"
            rules={[{ required: true, message: "Ingresa nombre de entidad" }]}
          >
            <Input placeholder="Ej. Juzgado 5to Civil" />
          </Form.Item>

          <Form.Item name="includeHall" valuePropName="checked">
            <Checkbox>Incluir sala u oficina</Checkbox>
          </Form.Item>

          <Form.Item shouldUpdate={(prev, curr) => prev.includeHall !== curr.includeHall} noStyle>
            {({ getFieldValue }) =>
              getFieldValue("includeHall") ? (
                <Form.Item
                  name="hallName"
                  label="Nombre de sala u oficina"
                  rules={[{ required: true, message: "Ingresa nombre de sala u oficina" }]}
                >
                  <Select
                    mode="tags"
                    showSearch
                    placeholder="Ej. Sala 2"
                    filterOption={(input, option) =>
                      (option?.label ?? option?.value ?? "")
                        .toString()
                        .toLowerCase()
                        .includes(input.toLowerCase())
                    }
                    options={halls.map(h => ({ value: h.name, label: h.name }))}
                  />
                </Form.Item>
              ) : null
            }
          </Form.Item>
        </Form>
      </Modal>

      {/* Modal Entregar notificaciones */}
      <Modal
        title="Entregar notificaciones"
        open={deliverOpen}
        onCancel={() => setDeliverOpen(false)}
        onOk={submitDeliver}
        confirmLoading={deliverLoading}
        okText="Entregar"
        width={500}
        style={{ top: 30 }}
        forceRender
      >
        <Form form={deliverForm} layout="vertical">
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
              filterOption={(input, option) =>
                (option?.label ?? "")
                  .toLowerCase()
                  .includes(input.toLowerCase())
              }
            />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
};

export default Notificaciones;
