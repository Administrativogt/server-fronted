import React, { useEffect, useState, useCallback } from "react";
import { Table, Input, DatePicker, Button, Typography, Row, Col, message } from "antd";
import dayjs from "dayjs";
import { fetchDeliveredNotifications, type NotificationDto } from "../../api/notifications";

const { Title } = Typography;

const Entregadas: React.FC = () => {
  const [notifications, setNotifications] = useState<NotificationDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState<{
    receptionDate?: string;
    deliveryDate?: string;
    cedule?: string;
    expedientNum?: string;
  }>({});

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchDeliveredNotifications(filters);
      setNotifications(data);
    } catch {
      message.error("Error al cargar entregadas");
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleFilterChange = (field: string, value: string | undefined) => {
    setFilters((prev) => ({ ...prev, [field]: value }));
  };

  const columns = [
    {
      title: "Fecha recepción",
      dataIndex: "receptionDatetime",
      render: (value: string) => new Date(value).toLocaleDateString(),
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
      title: "Expediente",
      dataIndex: "expedientNum",
    },
    {
      title: "Dirigida a",
      dataIndex: "directedTo",
    },
    {
      title: "Entregada a",
      render: (_: unknown, record: NotificationDto) =>
        `${record.deliverTo?.first_name ?? ""} ${record.deliverTo?.last_name ?? ""}`,
    },
    {
      title: "Quien entrega",
      render: (_: unknown, record: NotificationDto) =>
        `${record.recepDelivery?.first_name ?? ""} ${record.recepDelivery?.last_name ?? ""}`,
    },
  ];

  return (
    <div>
      <Title level={3}>Notificaciones entregadas</Title>

      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={6}>
          <DatePicker
            style={{ width: "100%" }}
            placeholder="Fecha recepción"
            onChange={(date) =>
              handleFilterChange("receptionDate", date ? dayjs(date).format("YYYY-MM-DD") : undefined)
            }
          />
        </Col>
        <Col span={6}>
          <DatePicker
            style={{ width: "100%" }}
            placeholder="Fecha entrega"
            onChange={(date) =>
              handleFilterChange("deliveryDate", date ? dayjs(date).format("YYYY-MM-DD") : undefined)
            }
          />
        </Col>
        <Col span={6}>
          <Input
            placeholder="Cédula"
            onChange={(e) => handleFilterChange("cedule", e.target.value)}
          />
        </Col>
        <Col span={6}>
          <Input
            placeholder="Expediente"
            onChange={(e) => handleFilterChange("expedientNum", e.target.value)}
          />
        </Col>
      </Row>

      <Button type="primary" onClick={loadData} style={{ marginBottom: 16 }}>
        Buscar
      </Button>

      <Table
        rowKey="id"
        columns={columns}
        dataSource={notifications}
        loading={loading}
        pagination={{ pageSize: 10 }}
      />
    </div>
  );
};

export default Entregadas;