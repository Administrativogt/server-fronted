// src/pages/recibos/ListarRecibos.tsx
import React, { useEffect, useState } from 'react';
import { Table, Button, Space, Popconfirm, message } from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  EyeOutlined,
} from '@ant-design/icons';
import type { CashReceipt } from '../../api/cashReceipts';
import cashReceiptsApi from '../../api/cashReceipts';
import { useNavigate } from 'react-router-dom';
import EditarRecibo from './EditarRecibo';

const ListarRecibos: React.FC = () => {
  const [data, setData] = useState<CashReceipt[]>([]);
  const [loading, setLoading] = useState(false);

  const [editingReciboId, setEditingReciboId] = useState<number | null>(null);
  const [editOpen, setEditOpen] = useState(false);

  const navigate = useNavigate();

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data } = await cashReceiptsApi.getAll();
      setData(data);
    } catch {
      message.error('Error al cargar los recibos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleDelete = async (id: number) => {
    try {
      await cashReceiptsApi.delete(id); // ✅ antes era remove
      message.success('Recibo eliminado');
      fetchData();
    } catch {
      message.error('Error al eliminar recibo');
    }
  };

  return (
    <>
      <Space style={{ marginBottom: 16 }}>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => navigate('/dashboard/recibos/crear')}
        >
          Agregar recibo
        </Button>
      </Space>

      <Table<CashReceipt>
        rowKey="id"
        dataSource={data}
        loading={loading}
        columns={[
          { title: 'Correlativo', dataIndex: 'correlative' },
          { title: 'Recibimos de', dataIndex: 'received_from' },
          { title: 'Cantidad', dataIndex: 'amount' },
          { title: 'Factura No.', dataIndex: 'bill_number' },
          {
            title: 'Opciones',
            render: (record: CashReceipt) => (
              <Space>
                <Button
                  type="link"
                  icon={<EyeOutlined />}
                  onClick={() =>
                    navigate(`/dashboard/recibos/${record.id ?? ''}`)
                  }
                />
                <Button
                  type="link"
                  icon={<EditOutlined />}
                  onClick={() => {
                    setEditingReciboId(record.id ?? null);
                    setEditOpen(true);
                  }}
                />
                <Popconfirm
                  title="¿Seguro de eliminar este recibo?"
                  onConfirm={() => handleDelete(record.id!)} // ✅ aseguramos que es number
                >
                  <Button type="link" danger icon={<DeleteOutlined />} />
                </Popconfirm>
              </Space>
            ),
          },
        ]}
      />

      {/* Modal de edición */}
      <EditarRecibo
        mode="modal"
        open={editOpen}
        onClose={() => setEditOpen(false)}
        reciboId={editingReciboId ?? null}
        onUpdated={fetchData}
      />
    </>
  );
};

export default ListarRecibos;

