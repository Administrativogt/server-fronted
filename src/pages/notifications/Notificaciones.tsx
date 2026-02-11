import React, { useEffect, useState } from "react";
import { Table, Button, Space, Typography, message } from "antd";
import { useNavigate } from "react-router-dom";
import NotificationActions from "./NotificationActions";
import { fetchPendingNotifications, type NotificationDto } from "../../api/notifications";

const { Title } = Typography;

const Notificaciones: React.FC = () => {
  const [notifications, setNotifications] = useState<NotificationDto[]>([]);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);

  const navigate = useNavigate();

  const loadNotifications = async () => {
    setLoading(true);
    try {
      const data = await fetchPendingNotifications();
      setNotifications(data);
    } catch {
      message.error("Error cargando notificaciones");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotifications();
  }, []);

  const columns = [
    {
      title: "Fecha",
      dataIndex: "receptionDatetime",
      render: (value: string) => new Date(value).toLocaleDateString(),
    },
    {
      title: "Hora recibido",
      dataIndex: "receptionDatetime",
      key: "hora",
      render: (value: string) =>
        new Date(value).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    },
    {
      title: "De",
      render: (_: unknown, record: NotificationDto) => {
        const prov = record.provenience?.name || record.otherProvenience || "";
        const hall = record.hall?.name || "";
        return `${prov} ${hall}`.trim();
      },
    },
    {
      title: "Cédula",
      dataIndex: "cedule",
    },
    {
      title: "No. Expediente",
      dataIndex: "expedientNum",
    },
    {
      title: "Dirigida a",
      dataIndex: "directedTo",
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
