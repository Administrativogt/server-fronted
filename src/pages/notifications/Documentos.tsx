import React, { useEffect, useMemo, useState } from 'react';
import { Button, Card, Input, message, Row, Col, Table, Space } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';

import {
  fetchPendingDocuments,
  deleteDocument,
  type DocumentDto as BaseDocumentDto,
} from '../../api/documents';
import { fullName, type UserLite } from '../../api/users';
import usePermissions from '../../hooks/usePermissions';

// Extensión mínima del tipo base
interface DocumentDto extends BaseDocumentDto {
  receivedBy?: UserLite | null;
}

interface RowType {
  key: number;
  fecha: string;
  entregadoPor: string;
  recibidoPor: string;
  tipoDocumento: string;
  cantidad: number;
  enviarA: string;
  raw: DocumentDto;
}

const Documentos: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<RowType[]>([]);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [filters, setFilters] = useState<{ text?: string }>({});
  const [stateFilter, setStateFilter] = useState<'pending' | 'delivered'>('pending');
  const [page, setPage] = useState(1);

  const permissions = usePermissions();

  const load = async () => {
    setLoading(true);
    try {
      const docs = await fetchPendingDocuments();
      setRows(
        docs.map((d) => ({
          key: d.id,
          fecha: d.receptionDatetime ? dayjs(d.receptionDatetime).format('DD/MM/YYYY') : '',
          entregadoPor: d.documentDeliverBy ?? '-',
          // 🔧 Corregimos el tipo aquí
          recibidoPor: d.receivedBy
            ? fullName(d.receivedBy as UserLite)
            : '-',
          tipoDocumento: d.documentType,
          cantidad: d.amount,
          enviarA: d.submitTo,
          raw: d as DocumentDto,
        }))
      );
    } catch (e) {
      console.error(e);
      message.error('Error al cargar documentos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const filteredRows = useMemo(() => {
    return rows
      .filter((r) => {
        if (stateFilter === 'pending') return r.raw.state === 1;
        if (stateFilter === 'delivered') return [2, 4, 5].includes(r.raw.state);
        return true;
      })
      .filter((r) => {
        if (!filters.text) return true;
        return Object.values(r).some(
          (v) => typeof v === 'string' && v.toLowerCase().includes(filters.text!.toLowerCase())
        );
      });
  }, [rows, stateFilter, filters]);

  const columns: ColumnsType<RowType> = [
    { title: 'Fecha', dataIndex: 'fecha' },
    { title: 'Doc. entregado por', dataIndex: 'entregadoPor' },
    { title: 'Recibido por', dataIndex: 'recibidoPor' },
    { title: 'Tipo documento', dataIndex: 'tipoDocumento' },
    { title: 'Cant', dataIndex: 'cantidad' },
    { title: 'Enviar a', dataIndex: 'enviarA' },
    {
      title: 'Opciones',
      key: 'opciones',
      render: (_, record) => (
        <Space>
          {permissions.delete && (
            <Button danger onClick={() => confirmDelete(record.key)}>
              Eliminar
            </Button>
          )}
        </Space>
      ),
    },
  ];

  const confirmDelete = async (id: number) => {
    try {
      await deleteDocument(id);
      message.success('Documento eliminado');
      void load();
    } catch (err) {
      console.error(err);
      message.error('Error al eliminar');
    }
  };

  return (
    <Card title="📄 Documentos">
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col flex="auto">
          <Space wrap>
            <Button
              type={stateFilter === 'pending' ? 'primary' : 'default'}
              onClick={() => setStateFilter('pending')}
            >
              Pendientes
            </Button>
            <Button
              type={stateFilter === 'delivered' ? 'primary' : 'default'}
              onClick={() => setStateFilter('delivered')}
            >
              Entregados
            </Button>
          </Space>
        </Col>
        <Col>
          <Input.Search
            allowClear
            placeholder="Buscar..."
            onChange={(e) => setFilters({ text: e.target.value })}
            style={{ width: 220 }}
          />
        </Col>
      </Row>

      <Table<RowType>
        rowSelection={{ selectedRowKeys, onChange: setSelectedRowKeys }}
        columns={columns}
        dataSource={filteredRows}
        loading={loading}
        rowKey="key"
        pagination={{ current: page, pageSize: 10, onChange: setPage }}
      />
    </Card>
  );
};

export default Documentos;