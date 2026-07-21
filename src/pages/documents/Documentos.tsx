import React, { useEffect, useState } from "react";
import { Table, Button, Space, message, Tag, Modal, Input, Tooltip, Typography } from "antd";
import {
  PlusOutlined,
  ReloadOutlined,
  EditOutlined,
  DeleteOutlined,
  ExclamationCircleOutlined,
} from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import {
  fetchPendingDocuments,
  fetchUsers,
  deleteDocument,
  type DocumentDto,
} from "../../api/documents";
import type { User } from "../../types/user.types";
import DocumentActions from "./DocumentActions";
import EditDocumentModal from "./EditDocumentModal";
import useAuthStore from "../../auth/useAuthStore";

// Recepcionista (tipo 7): Wendy y Amalia. Debe coincidir con el backend
// (DocumentsService.assertCanManage).
const RECEPCIONISTA = 7;

/** Resuelve un string que puede ser un ID numérico a nombre de usuario */
const resolveUserString = (val: string | null | undefined, usersMap: Map<string, string>): string => {
  if (!val) return "-";
  if (/^\d+$/.test(val)) {
    return usersMap.get(val) || val;
  }
  return val;
};

const Documentos: React.FC = () => {
  const [data, setData] = useState<DocumentDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [deliverModalVisible, setDeliverModalVisible] = useState(false);
  const [usersMap, setUsersMap] = useState<Map<string, string>>(new Map());
  const [editingDoc, setEditingDoc] = useState<DocumentDto | null>(null);
  const [deletingDoc, setDeletingDoc] = useState<DocumentDto | null>(null);
  const [deleteReason, setDeleteReason] = useState("");
  const [deleting, setDeleting] = useState(false);
  const navigate = useNavigate();

  const is_superuser = useAuthStore((s) => s.is_superuser);
  const tipo_usuario = useAuthStore((s) => s.tipo_usuario);
  const canManage = is_superuser === true || tipo_usuario === RECEPCIONISTA;

  const fetchDocuments = async () => {
    setLoading(true);
    try {
      const docs = await fetchPendingDocuments();
      setData(docs);
    } catch {
      message.error("Error al cargar documentos");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
    // Cargar usuarios para resolver IDs a nombres
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

  const columns = [
    {
      title: "ID",
      dataIndex: "id",
      width: 60,
    },
    {
      title: "Entregado por",
      dataIndex: "documentDeliverBy",
      render: (val: string) => resolveUserString(val, usersMap),
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
      title: "Fecha recepción",
      dataIndex: "receptionDatetime",
      render: (val: string) =>
        val
          ? new Date(val).toLocaleString("es-GT", {
              dateStyle: "short",
              timeStyle: "short",
            })
          : "",
    },
    ...(canManage
      ? [
          {
            title: "Acciones",
            key: "actions",
            width: 100,
            render: (_: unknown, record: DocumentDto) => (
              <Space>
                <Tooltip title="Editar">
                  <Button
                    size="small"
                    icon={<EditOutlined />}
                    onClick={() => setEditingDoc(record)}
                  />
                </Tooltip>
                <Tooltip title="Eliminar">
                  <Button
                    size="small"
                    danger
                    icon={<DeleteOutlined />}
                    onClick={() => {
                      setDeleteReason("");
                      setDeletingDoc(record);
                    }}
                  />
                </Tooltip>
              </Space>
            ),
          },
        ]
      : []),
  ];

  const handleDelete = async () => {
    if (!deletingDoc) return;
    if (!deleteReason.trim()) {
      message.warning("Ingresa el motivo de la eliminación");
      return;
    }
    setDeleting(true);
    try {
      await deleteDocument(deletingDoc.id, deleteReason.trim());
      message.success(`Documento #${deletingDoc.id} eliminado`);
      setDeletingDoc(null);
      setSelectedRowKeys((keys) => keys.filter((k) => k !== deletingDoc.id));
      fetchDocuments();
    } catch {
      message.error("Error al eliminar documento");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div>
      <Space style={{ marginBottom: 16 }}>
        <Button
          icon={<PlusOutlined />}
          type="primary"
          onClick={() => navigate("/dashboard/documentos/crear")}
        >
          Nuevo Documento
        </Button>
        <Button
          type="default"
          onClick={() => navigate("/dashboard/documentos/entregados")}
        >
          Entregados
        </Button>
        <Button icon={<ReloadOutlined />} onClick={fetchDocuments}>
          Recargar
        </Button>
        <Button
          type="primary"
          danger
          disabled={!selectedRowKeys.length}
          onClick={() => setDeliverModalVisible(true)}
        >
          Entregar ({selectedRowKeys.length})
        </Button>
      </Space>

      <Table
        rowKey="id"
        loading={loading}
        columns={columns}
        dataSource={data}
        bordered
        rowSelection={{
          selectedRowKeys,
          onChange: setSelectedRowKeys,
        }}
        pagination={{ pageSize: 10 }}
      />

      <DocumentActions
        visible={deliverModalVisible}
        onClose={() => setDeliverModalVisible(false)}
        selectedIds={selectedRowKeys as number[]}
        onSuccess={() => {
          setDeliverModalVisible(false);
          setSelectedRowKeys([]);
          fetchDocuments();
        }}
      />

      <EditDocumentModal
        document={editingDoc}
        onClose={() => setEditingDoc(null)}
        onSuccess={() => {
          setEditingDoc(null);
          fetchDocuments();
        }}
      />

      <Modal
        title={
          <Space>
            <ExclamationCircleOutlined style={{ color: "#dc2626" }} />
            {`Eliminar documento #${deletingDoc?.id ?? ""}`}
          </Space>
        }
        open={!!deletingDoc}
        onOk={handleDelete}
        onCancel={() => setDeletingDoc(null)}
        okText="Eliminar"
        okButtonProps={{ danger: true }}
        cancelText="Cancelar"
        confirmLoading={deleting}
        destroyOnClose
      >
        <Typography.Paragraph type="secondary" style={{ marginBottom: 12 }}>
          El documento saldrá de la lista de pendientes y no podrá entregarse.
          Indica el motivo de la eliminación:
        </Typography.Paragraph>
        <Input.TextArea
          rows={3}
          placeholder="Motivo de la eliminación"
          value={deleteReason}
          onChange={(e) => setDeleteReason(e.target.value)}
          maxLength={250}
          showCount
        />
      </Modal>
    </div>
  );
};

export default Documentos;
