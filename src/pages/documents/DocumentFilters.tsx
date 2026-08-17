import React, { useEffect, useState, useMemo } from "react";
import { Table, Form, Select, DatePicker, Button, Row, Col, Tag, Space, message, Modal, Tooltip } from "antd";
import { CheckCircleOutlined, CloseCircleOutlined, EditOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import {
  filterDocuments,
  fetchUsers,
  applyActionToDocuments,
  type DocumentDto,
  DOCUMENT_STATES,
} from "../../api/documents";
import type { User } from "../../types/user.types";
import EditDocumentModal from "./EditDocumentModal";
import useAuthStore from "../../auth/useAuthStore";

const { Option } = Select;

// Recepcionista (tipo 7). Debe coincidir con el backend (assertCanManage).
const RECEPCIONISTA = 7;

/** Resuelve un valor (string o number) a nombre de usuario si es un ID numérico */
const resolveToUserName = (val: unknown, usersMap: Map<string, string>): string => {
  if (val === null || val === undefined || val === "") return "-";
  const str = String(val);
  if (/^\d+$/.test(str)) {
    return usersMap.get(str) || str;
  }
  return str;
};

const DocumentFilters: React.FC = () => {
  const [form] = Form.useForm();
  const [data, setData] = useState<DocumentDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [usersMap, setUsersMap] = useState<Map<string, string>>(new Map());
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [lastParams, setLastParams] = useState<Record<string, string>>({});
  const [editingDoc, setEditingDoc] = useState<DocumentDto | null>(null);

  const is_superuser = useAuthStore((s) => s.is_superuser);
  const tipo_usuario = useAuthStore((s) => s.tipo_usuario);
  const canManage = is_superuser === true || tipo_usuario === RECEPCIONISTA;

  const fetchFilteredDocs = async (params: Record<string, string> = {}) => {
    setLoading(true);
    setLastParams(params);
    try {
      const docs = await filterDocuments(params);
      setData(docs);
    } catch {
      message.error("Error cargando documentos entregados");
    } finally {
      setLoading(false);
    }
  };

  // Estado se filtra en cliente (el backend ya limita a entregados/finalizados)
  const [stateFilter, setStateFilter] = useState<number | undefined>(undefined);

  const onFinish = (values: Record<string, unknown>) => {
    const params: Record<string, string> = {};

    if (values.receptionDate) {
      params.receptionDate = (values.receptionDate as dayjs.Dayjs).format("YYYY-MM-DD");
    }

    setStateFilter(values.state as number | undefined);
    fetchFilteredDocs(params);
  };

  useEffect(() => {
    fetchFilteredDocs();

    fetchUsers()
      .then((userList: User[]) => {
        const map = new Map<string, string>();
        for (const u of userList) {
          map.set(String(u.id), `${u.first_name} ${u.last_name}`.trim());
        }
        setUsersMap(map);
      })
      .catch(() => {});
  }, []);

  // Solo permitir seleccionar documentos en estado "Entregado" (state=2)
  const selectedDeliveredIds = useMemo(() => {
    return (selectedRowKeys as number[]).filter((id) => {
      const doc = data.find((d) => d.id === id);
      return doc?.state === DOCUMENT_STATES.DELIVERED;
    });
  }, [selectedRowKeys, data]);

  const handleAction = async (action: 1 | 2, label: string) => {
    if (!selectedDeliveredIds.length) {
      message.warning("Selecciona documentos en estado 'Entregado' para esta acción");
      return;
    }

    Modal.confirm({
      title: `${label} documentos`,
      content: `¿Estás seguro de ${label.toLowerCase()} ${selectedDeliveredIds.length} documento(s)?`,
      okText: label,
      okType: action === 1 ? "primary" : "danger",
      cancelText: "Cancelar",
      onOk: async () => {
        setActionLoading(true);
        try {
          await applyActionToDocuments(action, selectedDeliveredIds);
          message.success(`Documentos ${action === 1 ? "aceptados" : "rechazados"} correctamente`);
          setSelectedRowKeys([]);
          fetchFilteredDocs(lastParams);
        } catch {
          message.error(`Error al ${label.toLowerCase()} documentos`);
        } finally {
          setActionLoading(false);
        }
      },
    });
  };

  const columns = useMemo(
    () => [
      {
        title: "ID",
        dataIndex: "id",
        width: 60,
      },
      {
        title: "Entregado por",
        dataIndex: "documentDeliverBy",
        render: (val: unknown) => resolveToUserName(val, usersMap),
      },
      {
        title: "Tipo",
        dataIndex: "documentType",
        render: (val: string) => <Tag color="blue">{val}</Tag>,
      },
      {
        title: "Cantidad",
        dataIndex: "amount",
      },
      {
        title: "Dirigido a",
        dataIndex: "submitTo",
      },
      {
        title: "Receptor",
        dataIndex: "receivedBy",
        render: (val: { first_name?: string; last_name?: string } | null) =>
          val ? `${val.first_name ?? ""} ${val.last_name ?? ""}`.trim() : "-",
      },
      {
        title: "Entregado a",
        dataIndex: "deliverTo",
        render: (val: unknown) => resolveToUserName(val, usersMap),
      },
      {
        title: "Fecha entrega",
        dataIndex: "deliverDatetime",
        render: (val: string | null) =>
          val ? dayjs(val).format("DD/MM/YYYY HH:mm") : "",
      },
      {
        title: "Estado",
        dataIndex: "state",
        render: (val: number) => {
          if (val === DOCUMENT_STATES.DELIVERED) return <Tag color="orange">Entregado</Tag>;
          if (val === DOCUMENT_STATES.FINALIZED) return <Tag color="green">Finalizado</Tag>;
          if (val === DOCUMENT_STATES.REJECTED) return <Tag color="red">Rechazado</Tag>;
          return <Tag>{val}</Tag>;
        },
      },
      ...(canManage
        ? [
            {
              title: "Acciones",
              key: "actions",
              width: 70,
              render: (_: unknown, record: DocumentDto) => (
                <Tooltip title="Editar">
                  <Button
                    size="small"
                    icon={<EditOutlined />}
                    onClick={() => setEditingDoc(record)}
                  />
                </Tooltip>
              ),
            },
          ]
        : []),
    ],
    [usersMap, canManage],
  );

  return (
    <>
      <Form form={form} layout="vertical" onFinish={onFinish}>
        <Row gutter={16}>
          <Col xs={24} sm={8} md={6}>
            <Form.Item label="Día de recepción" name="receptionDate">
              <DatePicker format="DD/MM/YYYY" style={{ width: "100%" }} />
            </Form.Item>
          </Col>
          <Col xs={24} sm={8} md={6}>
            <Form.Item label="Estado" name="state">
              <Select allowClear placeholder="Todos">
                <Option value={DOCUMENT_STATES.DELIVERED}>Entregado</Option>
                <Option value={DOCUMENT_STATES.FINALIZED}>Finalizado</Option>
              </Select>
            </Form.Item>
          </Col>
        </Row>
        <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
          <Col>
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
          </Col>
          <Col>
            <Space>
              <Button type="primary" htmlType="submit">
                Buscar
              </Button>
              <Button
                onClick={() => {
                  form.resetFields();
                  setStateFilter(undefined);
                  fetchFilteredDocs();
                }}
              >
                Resetear
              </Button>
            </Space>
          </Col>
        </Row>
      </Form>

      <Table
        rowKey="id"
        columns={columns}
        dataSource={stateFilter ? data.filter((d) => d.state === stateFilter) : data}
        loading={loading}
        rowSelection={{
          selectedRowKeys,
          onChange: setSelectedRowKeys,
          getCheckboxProps: (record: DocumentDto) => ({
            disabled: record.state !== DOCUMENT_STATES.DELIVERED,
          }),
        }}
        pagination={{ pageSize: 10 }}
      />

      <EditDocumentModal
        document={editingDoc}
        onClose={() => setEditingDoc(null)}
        onSuccess={() => {
          setEditingDoc(null);
          fetchFilteredDocs(lastParams);
        }}
      />
    </>
  );
};

export default DocumentFilters;
