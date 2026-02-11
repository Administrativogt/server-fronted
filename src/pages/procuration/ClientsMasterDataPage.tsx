import React, { useEffect, useState } from 'react';
import { Card, Table, Button, Modal, Form, Input, Space, message } from 'antd';
import { PlusOutlined, EditOutlined, ReloadOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { getClients, createClient, updateClient } from '../../api/procuration';
import type { Client, CreateClientDto } from '../../types/procuration.types';

const ClientsMasterDataPage: React.FC = () => {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [form] = Form.useForm<CreateClientDto>();

  const loadClients = async () => {
    setLoading(true);
    try {
      const res = await getClients();
      setClients(res?.data || []);
    } catch (error: any) {
      message.error(error?.response?.data?.message || 'Error al cargar clientes');
      setClients([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadClients();
  }, []);

  const openCreateModal = () => {
    setEditingClient(null);
    form.resetFields();
    setModalOpen(true);
  };

  const openEditModal = (client: Client) => {
    setEditingClient(client);
    form.setFieldsValue({ code: client.code, name: client.name });
    setModalOpen(true);
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      if (editingClient) {
        await updateClient(editingClient.id, values);
        message.success('Cliente actualizado');
      } else {
        await createClient(values);
        message.success('Cliente creado');
      }
      setModalOpen(false);
      setEditingClient(null);
      form.resetFields();
      loadClients();
    } catch (error: any) {
      if (error?.errorFields) return;
      message.error(error?.response?.data?.message || 'No se pudo guardar el cliente');
    }
  };

  const columns: ColumnsType<Client> = [
    { title: 'ID', dataIndex: 'id', key: 'id', width: 80 },
    { title: 'Código', dataIndex: 'code', key: 'code' },
    { title: 'Nombre', dataIndex: 'name', key: 'name' },
    {
      title: 'Acciones',
      key: 'actions',
      width: 140,
      render: (_, record) => (
        <Space>
          <Button icon={<EditOutlined />} onClick={() => openEditModal(record)}>
            Editar
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: 16 }}>
      <Card
        title="Clientes"
        extra={
          <Space>
            <Button icon={<ReloadOutlined />} onClick={loadClients} loading={loading}>
              Recargar
            </Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={openCreateModal}>
              Nuevo Cliente
            </Button>
          </Space>
        }
      >
        <Table
          columns={columns}
          dataSource={clients}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 15, showSizeChanger: true, showTotal: (t) => `Total: ${t}` }}
        />
      </Card>

      <Modal
        open={modalOpen}
        title={editingClient ? 'Editar Cliente' : 'Crear Cliente'}
        onCancel={() => {
          setModalOpen(false);
          setEditingClient(null);
          form.resetFields();
        }}
        onOk={handleSubmit}
        okText={editingClient ? 'Guardar cambios' : 'Crear'}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="code" label="Código" rules={[{ required: true, message: 'Ingrese el código' }]}>
            <Input maxLength={50} />
          </Form.Item>
          <Form.Item name="name" label="Nombre" rules={[{ required: true, message: 'Ingrese el nombre' }]}>
            <Input maxLength={200} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default ClientsMasterDataPage;
