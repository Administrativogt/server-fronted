import React, { useEffect, useState, useCallback, useMemo } from "react";
import { Table, Input, DatePicker, Button, Typography, Row, Col, Select, Space, Tag, message, Modal } from "antd";
import { CheckCircleOutlined, CloseCircleOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import {
  filterNotifications,
  fetchProveniences,
  fetchUsers,
  applyActionToNotifications,
  type NotificationDto,
  type ProvenienceDto,
  NOTIFICATION_STATES,
} from "../../api/notifications";
import type { User } from "../../types/user.types";

const { Title } = Typography;
const { Option } = Select;

const Entregadas: React.FC = () => {
  const [notifications, setNotifications] = useState<NotificationDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [proveniences, setProveniences] = useState<ProvenienceDto[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [filters, setFilters] = useState<Record<string, string | undefined>>({});
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);

  useEffect(() => {
    fetchProveniences().then(setProveniences).catch(() => {});
    fetchUsers().then(setUsers).catch(() => {});
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const cleanFilters: Record<string, string> = {};
      for (const [key, value] of Object.entries(filters)) {
        if (value !== undefined && value !== "") {
          cleanFilters[key] = value;
        }
      }
      const data = await filterNotifications(cleanFilters);
      setNotifications(data);
    } catch {
      message.error("Error al cargar entregadas");
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleFilterChange = (field: string, value: string | undefined) => {
    setFilters((prev) => ({ ...prev, [field]: value }));
  };

  const handleSearch = () => {
    loadData();
  };

  const handleReset = () => {
    setFilters({});
    filterNotifications({}).then(setNotifications).catch(() => {
      message.error("Error al cargar entregadas");
    });
  };

  // Solo permitir seleccionar notificaciones en estado "Entregado" (state=2)
  const selectedDeliveredIds = useMemo(() => {
    return (selectedRowKeys as number[]).filter((id) => {
      const notif = notifications.find((n) => n.id === id);
      return notif?.state === NOTIFICATION_STATES.DELIVERED;
    });
  }, [selectedRowKeys, notifications]);

  const handleAction = async (action: 1 | 2, label: string) => {
    if (!selectedDeliveredIds.length) {
      message.warning("Selecciona notificaciones en estado 'Entregado' para esta acción");
      return;
    }

    Modal.confirm({
      title: `${label} notificaciones`,
      content: `¿Estás seguro de ${label.toLowerCase()} ${selectedDeliveredIds.length} notificación(es)?`,
      okText: label,
      okType: action === 1 ? "primary" : "danger",
      cancelText: "Cancelar",
      onOk: async () => {
        setActionLoading(true);
        try {
          await applyActionToNotifications(action, selectedDeliveredIds);
          message.success(`Notificaciones ${action === 1 ? "aceptadas" : "rechazadas"} correctamente`);
          setSelectedRowKeys([]);
          loadData();
        } catch {
          message.error(`Error al ${label.toLowerCase()} notificaciones`);
        } finally {
          setActionLoading(false);
        }
      },
    });
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
        `${record.deliverTo?.first_name ?? ""} ${record.deliverTo?.last_name ?? ""}`.trim(),
    },
    {
      title: "Quien entrega",
      render: (_: unknown, record: NotificationDto) =>
        `${record.recepDelivery?.first_name ?? ""} ${record.recepDelivery?.last_name ?? ""}`.trim(),
    },
    {
      title: "Fecha entrega",
      dataIndex: "deliveryDatetime",
      render: (value: string | null) =>
        value ? new Date(value).toLocaleDateString() : "-",
    },
    {
      title: "Estado",
      dataIndex: "state",
      render: (val: number) => {
        if (val === NOTIFICATION_STATES.DELIVERED) return <Tag color="orange">Entregado</Tag>;
        if (val === NOTIFICATION_STATES.FINALIZED) return <Tag color="green">Finalizado</Tag>;
        return <Tag>{val}</Tag>;
      },
    },
  ];

  return (
    <div>
      <Title level={3}>Notificaciones entregadas</Title>

      <Row gutter={[16, 12]} style={{ marginBottom: 16 }}>
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
            allowClear
            onChange={(e) => handleFilterChange("cedule", e.target.value || undefined)}
          />
        </Col>
        <Col span={6}>
          <Input
            placeholder="Expediente"
            allowClear
            onChange={(e) => handleFilterChange("expedientNum", e.target.value || undefined)}
          />
        </Col>
      </Row>

      <Row gutter={[16, 12]} style={{ marginBottom: 16 }}>
        <Col span={6}>
          <Select
            style={{ width: "100%" }}
            placeholder="Procedencia"
            allowClear
            showSearch
            optionFilterProp="label"
            options={proveniences.map((p) => ({
              value: p.id,
              label: p.name,
            }))}
            onChange={(val) => handleFilterChange("provenience", val !== undefined ? String(val) : undefined)}
          />
        </Col>
        <Col span={6}>
          <Select
            style={{ width: "100%" }}
            placeholder="Entregada a"
            allowClear
            showSearch
            optionFilterProp="label"
            options={users.map((u) => ({
              value: u.id,
              label: `${u.first_name} ${u.last_name}`,
            }))}
            onChange={(val) => handleFilterChange("deliverTo", val !== undefined ? String(val) : undefined)}
          />
        </Col>
        <Col span={6}>
          <Input
            placeholder="Dirigida a"
            allowClear
            onChange={(e) => handleFilterChange("directedTo", e.target.value || undefined)}
          />
        </Col>
        <Col span={6}>
          <Space>
            <Button type="primary" onClick={handleSearch}>
              Buscar
            </Button>
            <Button onClick={handleReset}>
              Limpiar
            </Button>
          </Space>
        </Col>
      </Row>

      <Row style={{ marginBottom: 16 }}>
        <Space>
          <Button
            type="primary"
            icon={<CheckCircleOutlined />}
            disabled={!selectedDeliveredIds.length}
            loading={actionLoading}
            onClick={() => handleAction(1, "Aceptar")}
          >
            Aceptar ({selectedDeliveredIds.length})
          </Button>
          <Button
            danger
            icon={<CloseCircleOutlined />}
            disabled={!selectedDeliveredIds.length}
            loading={actionLoading}
            onClick={() => handleAction(2, "Rechazar")}
          >
            Rechazar ({selectedDeliveredIds.length})
          </Button>
        </Space>
      </Row>

      <Table
        rowKey="id"
        columns={columns}
        dataSource={notifications}
        loading={loading}
        rowSelection={{
          selectedRowKeys,
          onChange: setSelectedRowKeys,
          getCheckboxProps: (record: NotificationDto) => ({
            disabled: record.state !== NOTIFICATION_STATES.DELIVERED,
          }),
        }}
        pagination={{ pageSize: 10 }}
      />
    </div>
  );
};

export default Entregadas;
