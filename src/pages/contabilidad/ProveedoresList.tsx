import React, { useEffect, useState } from 'react';
import {
  Button,
  Card,
  Form,
  Input,
  message,
  Modal,
  Space,
  Table,
} from 'antd';
import { EditOutlined, PlusOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { proveedorApi } from '../../api/accounting';
import type { CreateProveedorPayload, Proveedor } from '../../types/accounting.types';

export default function ProveedoresList() {
  const [data, setData] = useState<Proveedor[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form] = Form.useForm();

  const load = async () => {
    try {
      setLoading(true);
      const res = await proveedorApi.getAll();
      setData(res.data);
    } catch {
      message.error('Error al cargar proveedores');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => {
    setEditingId(null);
    form.resetFields();
    setModalOpen(true);
  };

  const openEdit = (record: Proveedor) => {
    setEditingId(record.id);
    form.setFieldsValue(record);
    setModalOpen(true);
  };

  const handleSave = async (values: CreateProveedorPayload) => {
    try {
      if (editingId) {
        await proveedorApi.update(editingId, values);
        message.success('Proveedor actualizado');
      } else {
        await proveedorApi.create(values);
        message.success('Proveedor creado');
      }
      setModalOpen(false);
      load();
    } catch {
      message.error('Error al guardar proveedor');
    }
  };

  const columns: ColumnsType<Proveedor> = [
    { title: 'Nombre', dataIndex: 'nombre' },
    { title: 'Correo', dataIndex: 'correo' },
    {
      title: 'Acciones',
      width: 80,
      render: (_, record) => (
        <Button
          icon={<EditOutlined />}
          size="small"
          onClick={() => openEdit(record)}
        />
      ),
    },
  ];

  return (
    <>
      <Card
        title="Proveedores"
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
            Nuevo
          </Button>
        }
      >
        <Table
          rowKey="id"
          dataSource={data}
          columns={columns}
          loading={loading}
          pagination={{ pageSize: 15 }}
        />
      </Card>

      <Modal
        title={editingId ? 'Editar proveedor' : 'Nuevo proveedor'}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        footer={null}
        destroyOnClose
      >
        <Form form={form} layout="vertical" onFinish={handleSave}>
          <Form.Item name="nombre" label="Nombre" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="correo" label="Correo" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Space>
            <Button type="primary" htmlType="submit">Guardar</Button>
            <Button onClick={() => setModalOpen(false)}>Cancelar</Button>
          </Space>
        </Form>
      </Modal>
    </>
  );
}
