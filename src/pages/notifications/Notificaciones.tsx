import React, { useEffect, useState } from "react";
import { Table, Button, Space, Tabs, Typography, message } from "antd";
import { useNavigate } from "react-router-dom";
import NotificationActions from "./NotificationActions";
import Entregadas from "./Entregadas";
import {
  fetchDeliveredToday,
  fetchPendingNotifications,
  type NotificationDto,
} from "../../api/notifications";

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
  }, []);

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
