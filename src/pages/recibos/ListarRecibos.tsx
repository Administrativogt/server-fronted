import React, { useEffect, useState } from 'react';
import {
  Table,
  Button,
  Space,
  Popconfirm,
  message,
  Modal,
  Input,
  
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  EyeOutlined,
  DownloadOutlined,
  MailOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import type { CashReceipt } from '../../api/cashReceipts';
import cashReceiptsApi from '../../api/cashReceipts';
import { useNavigate } from 'react-router-dom';
import EditarRecibo from './EditarRecibo';

const ListarRecibos: React.FC = () => {
  const [data, setData] = useState<CashReceipt[]>([]);
  const [loading, setLoading] = useState(false);

  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [emailToSend, setEmailToSend] = useState('');

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
      await cashReceiptsApi.delete(id);
      message.success('Recibo anulado correctamente');
      fetchData();
    } catch {
      message.error('Error al anular recibo');
    }
  };

  const handleDownloadPdf = async (id: number) => {
    try {
      const response = await cashReceiptsApi.getPdf(id);
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `recibo_${id}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch {
      message.error('Error al generar PDF');
    }
  };

  const handleSendEmail = async (id: number) => {
    Modal.confirm({
      title: 'Enviar recibo por correo',
      content: (
        <Input
          placeholder="Correo del destinatario"
          onChange={(e) => setEmailToSend(e.target.value)}
        />
      ),
      okText: 'Enviar',
      cancelText: 'Cancelar',
      onOk: async () => {
        if (!emailToSend) {
          message.warning('Debe ingresar un correo válido');
          return;
        }
        try {
          await cashReceiptsApi.sendPdfByEmail(id, emailToSend);
          message.success('Recibo enviado correctamente');
          setEmailToSend('');
        } catch {
          message.error('Error al enviar el recibo');
        }
      },
    });
  };

  const handleSendMultiple = async () => {
    if (selectedRowKeys.length === 0) {
      message.warning('Seleccione al menos un recibo');
      return;
    }
    setEmailModalOpen(true);
  };

  const confirmSendMultiple = async () => {
    try {
      await cashReceiptsApi.sendMultiple(
        selectedRowKeys.map((k) => Number(k)),
        emailToSend,
      );
      message.success('Recibos enviados correctamente');
      setSelectedRowKeys([]);
      setEmailToSend('');
      setEmailModalOpen(false);
    } catch {
      message.error('Error al enviar los recibos');
    }
  };

  const rowSelection = {
    selectedRowKeys,
    onChange: (keys: React.Key[]) => setSelectedRowKeys(keys),
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

        <Button
          icon={<ReloadOutlined />}
          onClick={fetchData}
          disabled={loading}
        >
          Actualizar
        </Button>

        <Button
          icon={<MailOutlined />}
          disabled={selectedRowKeys.length === 0}
          onClick={handleSendMultiple}
        >
          Enviar seleccionados
        </Button>
      </Space>

      <Table<CashReceipt>
        rowKey="id"
        dataSource={data}
        loading={loading}
        rowSelection={rowSelection}
        columns={[
          { title: 'Serie', dataIndex: 'serie', width: 80 },
          { title: 'Correlativo', dataIndex: 'correlative', width: 100 },
          { title: 'Recibimos de', dataIndex: 'received_from' },
          { title: 'Concepto', dataIndex: 'concept' },
          {
            title: 'Cantidad',
            dataIndex: 'amount',
            render: (val: number) => `Q. ${Number(val).toLocaleString()}`,
          },
          { title: 'Factura', dataIndex: 'bill_number', width: 120 },
          {
            title: 'Opciones',
            align: 'center',
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
                  icon={<DownloadOutlined />}
                  onClick={() => handleDownloadPdf(record.id!)}
                />
                <Button
                  type="link"
                  icon={<MailOutlined />}
                  onClick={() => handleSendEmail(record.id!)}
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
                  title="¿Seguro de anular este recibo?"
                  onConfirm={() => handleDelete(record.id!)}
                >
                  <Button type="link" danger icon={<DeleteOutlined />} />
                </Popconfirm>
              </Space>
            ),
          },
        ]}
      />

      {/* Modal de envío múltiple */}
      <Modal
        title="Enviar recibos seleccionados"
        open={emailModalOpen}
        onCancel={() => setEmailModalOpen(false)}
        onOk={confirmSendMultiple}
        okText="Enviar"
      >
        <p>Ingrese el correo al que desea enviar los recibos seleccionados:</p>
        <Input
          placeholder="ejemplo@dominio.com"
          value={emailToSend}
          onChange={(e) => setEmailToSend(e.target.value)}
        />
      </Modal>

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