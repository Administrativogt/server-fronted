import React, { useEffect, useState } from "react";
import { Table, Button, Form, Input, Modal, Select, Space, Tabs, Typography, message } from "antd";
import { EditOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import NotificationActions from "./NotificationActions";
import Entregadas from "./Entregadas";
import {
  fetchCanManageNotifications,
  fetchDeliveredToday,
  fetchHallsByProvenience,
  fetchPendingNotifications,
  fetchProveniences,
  updateNotification,
  type HallDto,
  type NotificationDto,
  type ProvenienceDto,
} from "../../api/notifications";

/** Sentinela para "Otra entidad" (texto libre), igual que en CrearNotificacion. */
const OTRA_ENTIDAD = -1;

const { Title } = Typography;

const nombre = (u?: { first_name?: string; last_name?: string } | null) =>
  u ? `${u.first_name ?? ""} ${u.last_name ?? ""}`.trim() : "";

/**
 * Pantalla única de Notificaciones en tres pestañas:
 *  - Pendientes: la cola de trabajo de recepción (crear/entregar)
 *  - Entregadas hoy: lo despachado en el día, en hora de Guatemala
 *  - Historial: todas las entregadas/finalizadas con sus filtros
 */
const Notificaciones: React.FC = () => {
  const [notifications, setNotifications] = useState<NotificationDto[]>([]);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);

  const navigate = useNavigate();

  const [deliveredToday, setDeliveredToday] = useState<NotificationDto[]>([]);
  const [loadingToday, setLoadingToday] = useState(false);

  /* Edición: superusuarios y recepción (el backend decide; aquí solo se
     muestra u oculta el botón). */
  const [canManage, setCanManage] = useState(false);
  const [editRow, setEditRow] = useState<NotificationDto | null>(null);
  const [proveniences, setProveniences] = useState<ProvenienceDto[]>([]);
  const [halls, setHalls] = useState<HallDto[]>([]);
  const [saving, setSaving] = useState(false);
  const [editForm] = Form.useForm();
  const provElegida = Form.useWatch("provenience", editForm);
  const esOtra = provElegida === OTRA_ENTIDAD;

  const loadNotifications = async () => {
    setLoading(true);
    setLoadingToday(true);
    try {
      const data = await fetchPendingNotifications();
      setNotifications(data);
    } catch {
      message.error("Error cargando notificaciones");
    } finally {
      setLoading(false);
    }
    // Se carga aparte: si fallara, la cola de pendientes sigue funcionando.
    try {
      setDeliveredToday(await fetchDeliveredToday());
    } catch {
      /* pestaña informativa; sin bloque de error propio */
    } finally {
      setLoadingToday(false);
    }
  };

  useEffect(() => {
    loadNotifications();
    fetchCanManageNotifications().then(setCanManage).catch(() => {});
  }, []);

  const abrirEdicion = async (record: NotificationDto) => {
    setEditRow(record);
    try {
      if (!proveniences.length) setProveniences(await fetchProveniences());
    } catch {
      /* el select queda solo con "Otra entidad"; se puede guardar igual */
    }

    const provId = record.provenience?.id;
    editForm.setFieldsValue({
      provenience: provId ?? (record.otherProvenience ? OTRA_ENTIDAD : undefined),
      otherProvenience: record.otherProvenience ?? undefined,
      hall: record.hall?.id,
      cedule: record.cedule,
      expedientNum: record.expedientNum,
      directedTo: record.directedTo,
    });

    if (provId) {
      fetchHallsByProvenience(provId).then(setHalls).catch(() => setHalls([]));
    } else {
      setHalls([]);
    }
  };

  const alCambiarProcedencia = (val: number) => {
    editForm.setFieldsValue({ hall: undefined, otherProvenience: undefined });
    if (val === OTRA_ENTIDAD) {
      setHalls([]);
      return;
    }
    fetchHallsByProvenience(val).then(setHalls).catch(() => setHalls([]));
  };

  const guardarEdicion = async () => {
    if (!editRow) return;
    try {
      const v = await editForm.validateFields();
      setSaving(true);

      const payload =
        v.provenience === OTRA_ENTIDAD
          ? {
              // removeProvenience limpia procedencia y sala en el backend
              removeProvenience: true,
              otherProvenience: v.otherProvenience,
              cedule: v.cedule,
              expedientNum: v.expedientNum,
              directedTo: v.directedTo,
            }
          : {
              provenience: v.provenience,
              hall: v.hall ?? null,
              otherProvenience: null,
              cedule: v.cedule,
              expedientNum: v.expedientNum,
              directedTo: v.directedTo,
            };

      await updateNotification(editRow.id, payload as never);
      message.success("Notificación actualizada");
      setEditRow(null);
      loadNotifications();
    } catch (err: unknown) {
      const e = err as { errorFields?: unknown; response?: { data?: { message?: string } } };
      if (e?.errorFields) return;
      message.error(e?.response?.data?.message || "Error al actualizar la notificación");
    } finally {
      setSaving(false);
    }
  };

  const pendingColumns = [
    {
      title: "Fecha",
      dataIndex: "receptionDatetime",
      width: 110,
      render: (value: string) => new Date(value).toLocaleDateString(),
    },
    {
      title: "Hora recibido",
      dataIndex: "receptionDatetime",
      key: "hora",
      width: 120,
      render: (value: string) =>
        new Date(value).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    },
    {
      title: "De",
      width: 200,
      render: (_: unknown, record: NotificationDto) => {
        const prov = record.provenience?.name || record.otherProvenience || "";
        const hall = record.hall?.name || "";
        return `${prov} ${hall}`.trim();
      },
    },
    {
      title: "Cédula",
      dataIndex: "cedule",
      width: 130,
    },
    {
      title: "No. Expediente",
      dataIndex: "expedientNum",
      width: 140,
    },
    {
      title: "Dirigida a",
      dataIndex: "directedTo",
      width: 180,
    },
    ...(canManage
      ? [
          {
            title: "Acciones",
            key: "acciones",
            width: 90,
            render: (_: unknown, record: NotificationDto) => (
              <Button
                size="small"
                icon={<EditOutlined />}
                onClick={() => abrirEdicion(record)}
              >
                Editar
              </Button>
            ),
          },
        ]
      : []),
  ];

  const tabPendientes = (
    <>
      <Space style={{ marginBottom: 16 }}>
        <Button type="primary" onClick={() => navigate("/dashboard/notificaciones/crear")}>
          Crear notificación
        </Button>
        <Button onClick={loadNotifications}>
          Recargar
        </Button>
        <Button
          type="primary"
          danger
          disabled={!selectedRowKeys.length}
          onClick={() => setModalVisible(true)}
        >
          Entregar ({selectedRowKeys.length})
        </Button>
      </Space>

      <Table
        rowKey="id"
        columns={pendingColumns}
        dataSource={notifications}
        loading={loading}
        locale={{ emptyText: "No hay notificaciones pendientes de entrega" }}
        rowSelection={{
          selectedRowKeys,
          onChange: setSelectedRowKeys,
        }}
        pagination={{ pageSize: 10 }}
        scroll={{ x: 900, y: 500 }}
      />
    </>
  );

  const tabHoy = (
    <Table
      rowKey="id"
      size="small"
      loading={loadingToday}
      dataSource={deliveredToday}
      locale={{ emptyText: "Hoy todavía no se ha entregado ninguna" }}
      columns={[
        {
          title: "Hora entrega",
          dataIndex: "deliveryDatetime",
          width: 110,
          render: (v: string | null) =>
            v
              ? new Date(v).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
              : "—",
        },
        {
          title: "De",
          width: 200,
          render: (_: unknown, r: NotificationDto) => {
            const prov = r.provenience?.name || r.otherProvenience || "";
            return `${prov} ${r.hall?.name || ""}`.trim();
          },
        },
        { title: "Cédula", dataIndex: "cedule", width: 130 },
        { title: "No. Expediente", dataIndex: "expedientNum", width: 140 },
        {
          title: "Entregada a",
          width: 180,
          render: (_: unknown, r: NotificationDto) =>
            nombre(r.deliverTo) || r.directedTo || "—",
        },
        {
          title: "Entregó",
          width: 160,
          render: (_: unknown, r: NotificationDto) => nombre(r.recepDelivery) || "—",
        },
      ]}
      pagination={deliveredToday.length > 10 ? { pageSize: 10 } : false}
      scroll={{ x: 900 }}
    />
  );

  return (
    <div>
      <Title level={3}>Notificaciones</Title>

      <Tabs
        defaultActiveKey="pendientes"
        items={[
          {
            key: "pendientes",
            label: `Pendientes de entrega (${notifications.length})`,
            children: tabPendientes,
          },
          {
            key: "hoy",
            label: `Entregadas hoy (${deliveredToday.length})`,
            children: tabHoy,
          },
          {
            key: "historial",
            label: "Historial",
            children: <Entregadas embedded />,
          },
        ]}
      />

      <Modal
        title={editRow ? `Editar notificación — cédula ${editRow.cedule}` : "Editar"}
        open={!!editRow}
        onCancel={() => setEditRow(null)}
        onOk={guardarEdicion}
        confirmLoading={saving}
        okText="Guardar"
        cancelText="Cancelar"
        destroyOnClose
      >
        <Form form={editForm} layout="vertical">
          <Form.Item
            label="Procedencia"
            name="provenience"
            rules={[{ required: true, message: "Seleccione la procedencia" }]}
          >
            <Select
              showSearch
              optionFilterProp="label"
              placeholder="Seleccione la entidad"
              onChange={alCambiarProcedencia}
              options={[
                { value: OTRA_ENTIDAD, label: "Otra entidad (escribir manualmente)" },
                ...proveniences.map((p) => ({ value: p.id, label: p.name })),
              ]}
            />
          </Form.Item>

          {esOtra ? (
            <Form.Item
              label="Nombre de la entidad"
              name="otherProvenience"
              rules={[{ required: true, message: "Escriba el nombre de la entidad" }]}
            >
              <Input placeholder="Ej. Ministerio de Salud" />
            </Form.Item>
          ) : (
            <Form.Item label="Sala" name="hall">
              <Select
                allowClear
                placeholder={halls.length ? "Seleccione la sala" : "La entidad no tiene salas"}
                disabled={!halls.length}
                options={halls.map((h) => ({ value: h.id, label: h.name }))}
              />
            </Form.Item>
          )}

          <Form.Item
            label="Cédula"
            name="cedule"
            rules={[{ required: true, message: "Ingrese la cédula" }]}
          >
            <Input />
          </Form.Item>

          <Form.Item
            label="No. Expediente"
            name="expedientNum"
            rules={[{ required: true, message: "Ingrese el expediente" }]}
          >
            <Input />
          </Form.Item>

          <Form.Item
            label="Dirigida a"
            name="directedTo"
            rules={[{ required: true, message: "Indique a quién va dirigida" }]}
          >
            <Input />
          </Form.Item>
        </Form>
      </Modal>

      <NotificationActions
        open={modalVisible}
        onClose={() => setModalVisible(false)}
        selectedIds={selectedRowKeys as number[]}
        onSuccess={() => {
          setModalVisible(false);
          setSelectedRowKeys([]);
          loadNotifications();
        }}
      />
    </div>
  );
};

export default Notificaciones;
