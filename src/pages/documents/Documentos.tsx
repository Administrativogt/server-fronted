// src/pages/documents/Documentos.tsx
import React, { useEffect, useState } from 'react';
import { Table, Button, Space, message, Tag } from 'antd';
import { PlusOutlined, ReloadOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import api from '../../api/axios';

const Documentos: React.FC = () => {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const fetchDocuments = async () => {
    setLoading(true);
    try {
      const res = await api.get('/documents/pending');
      setData(res.data);
    } catch {
      message.error('Error al cargar documentos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, []);

  const columns = [
    {
      title: 'ID',
      dataIndex: 'id',
      width: 60,
    },
    {
      title: 'Entregado por',
      dataIndex: 'documentDeliverBy',
      render: (val: string) => val || '-',
    },
    {
      title: 'Tipo',
      dataIndex: 'documentType',
      render: (val: string) => <Tag color="blue">{val}</Tag>,
    },
    {
      title: 'Cantidad',
      dataIndex: 'amount',
    },
    {
      title: 'Dirigido a',
      dataIndex: 'submitTo',
    },
    {
      title: 'Receptor',
      dataIndex: ['receivedBy'],
      render: (val: any) => (val ? `${val.first_name} ${val.last_name}` : '-'),
    },
    {
      title: 'Fecha recepción',
      dataIndex: 'receptionDatetime',
      render: (val: string) =>
        val ? new Date(val).toLocaleString('es-GT', { dateStyle: 'short', timeStyle: 'short' }) : '',
    },
  ];

  return (
    <div>
      <Space style={{ marginBottom: 16 }}>
        <Button icon={<PlusOutlined />} type="primary" onClick={() => navigate('/documents/crear')}>
          Nuevo Documento
        </Button>
        <Button icon={<ReloadOutlined />} onClick={fetchDocuments}>
          Recargar
        </Button>
      </Space>

      <Table
        rowKey="id"
        loading={loading}
        columns={columns}
        dataSource={data}
        bordered
        pagination={{ pageSize: 10 }}
      />
    </div>
  );
};

export default Documentos;