import React, { useEffect, useState } from "react";
import { Table, Button, Space, message, Tag } from "antd";
import { PlusOutlined, ReloadOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import { fetchPendingDocuments, fetchUsers, type DocumentDto } from "../../api/documents";
import type { User } from "../../types/user.types";
import DocumentActions from "./DocumentActions";

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
  const navigate = useNavigate();

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
  ];

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
    </div>
  );
};

export default Documentos;
