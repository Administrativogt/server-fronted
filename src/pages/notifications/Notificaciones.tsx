import React, { useEffect, useState } from "react";
import { Table, Button, Space, Tag, Typography, message } from "antd";
import { useNavigate } from "react-router-dom";
import NotificationActions from "./NotificationActions";
import {
  fetchDeliveredToday,
  fetchPendingNotifications,
  type NotificationDto,
} from "../../api/notifications";

const { Title, Text } = Typography;

const nombre = (u?: { first_name?: string; last_name?: string } | null) =>
  u ? `${u.first_name ?? ""} ${u.last_name ?? ""}`.trim() : "";

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
      /* apartado informativo; sin bloque de error propio */
    } finally {
      setLoadingToday(false);
    }
  };

  useEffect(() => {
    loadNotifications();
  }, []);

  const columns = [
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

  return (
    <div>
      <Title level={3}>Notificaciones pendientes de entrega</Title>

      <Space style={{ marginBottom: 16 }}>
        <Button type="primary" onClick={() => navigate("/dashboard/notificaciones/crear")}>
          Crear notificación
        </Button>
        <Button type="default" onClick={() => navigate("/dashboard/notificaciones/entregadas")}>
          Entregadas
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
        columns={columns}
        dataSource={notifications}
        loading={loading}
        rowSelection={{
          selectedRowKeys,
          onChange: setSelectedRowKeys,
        }}
        pagination={{ pageSize: 10 }}
        scroll={{ x: 900, y: 500 }}
      />

      <div style={{ marginTop: 32 }}>
        <Space align="baseline" size={10}>
          <Title level={4} style={{ marginBottom: 4 }}>
            Entregadas hoy
          </Title>
          <Tag color={deliveredToday.length ? "green" : "default"}>
            {deliveredToday.length}
          </Tag>
        </Space>
        <div style={{ marginBottom: 12 }}>
          <Text type="secondary">
            Lo que recepción ya despachó en el día. El histórico completo está en{" "}
            <a onClick={() => navigate("/dashboard/notificaciones/entregadas")}>Entregadas</a>.
          </Text>
        </div>
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
      </div>

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
