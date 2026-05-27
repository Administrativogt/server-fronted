import React, { useEffect, useState } from 'react';
import {
  Card, Table, Button, Modal, Form, Input, Switch, Space, message,
  Typography, Tag, Popconfirm, Tooltip,
} from 'antd';
import {
  PlusOutlined, EditOutlined, DeleteOutlined, ReloadOutlined, UserOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { informeSociosApi } from '../../api/informe-socios';
import type { InformeSocio } from '../../types/informe-socios.types';

const { Title, Paragraph } = Typography;

const GestionSociosPage: React.FC = () => {
  const [socios, setSocios] = useState<InformeSocio[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<InformeSocio | null>(null);
  const [form] = Form.useForm();

  const fetchSocios = async () => {
    setLoading(true);
    try {
      const { data } = await informeSociosApi.getSocios();
      setSocios(data);
    } catch {
      message.error('Error al cargar socios');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchSocios(); }, []);

  const openCreate = () => {
    setEditing(null);
    form.resetFields();
    form.setFieldValue('activo', true);
    setModalOpen(true);
  };

  const openEdit = (socio: InformeSocio) => {
    setEditing(socio);
    form.setFieldsValue(socio);
    setModalOpen(true);
  };

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      setSaving(true);
      if (editing) {
        await informeSociosApi.updateSocio(editing.id, values);
        message.success('Socio actualizado');
      } else {
        await informeSociosApi.createSocio(values);
        message.success('Socio creado');
      }
      setModalOpen(false);
      fetchSocios();
    } catch (err: any) {
      if (err?.errorFields) return; // form validation error
      message.error(err.response?.data?.message || 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await informeSociosApi.deleteSocio(id);
      message.success('Socio eliminado');
      fetchSocios();
    } catch {
      message.error('Error al eliminar socio');
    }
  };

  const columns: ColumnsType<InformeSocio> = [
    {
      title: 'Código',
      dataIndex: 'codigo',
      width: 100,
      render: (v: string) => <Tag color="blue">{v}</Tag>,
      sorter: (a, b) => a.codigo.localeCompare(b.codigo),
    },
    {
      title: 'Nombre',
      dataIndex: 'nombre',
      sorter: (a, b) => a.nombre.localeCompare(b.nombre),
    },
    {
      title: 'Email',
      dataIndex: 'email',
      ellipsis: true,
    },
    {
      title: 'Activo',
      dataIndex: 'activo',
      width: 90,
      align: 'center',
      render: (v: boolean) => (
        <Tag color={v ? 'green' : 'red'}>{v ? 'Sí' : 'No'}</Tag>
      ),
      filters: [{ text: 'Activo', value: true }, { text: 'Inactivo', value: false }],
      onFilter: (value, record) => record.activo === value,
    },
    {
      title: 'Acciones',
      width: 120,
      align: 'center',
      render: (_, record) => (
        <Space>
          <Tooltip title="Editar">
            <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(record)} />
          </Tooltip>
          <Popconfirm
            title="¿Eliminar este socio?"
            onConfirm={() => handleDelete(record.id)}
            okText="Sí"
            cancelText="No"
          >
            <Tooltip title="Eliminar">
              <Button size="small" danger icon={<DeleteOutlined />} />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: '24px', maxWidth: 1000, margin: '0 auto' }}>
      <Title level={2} style={{ marginBottom: 4 }}>
        Gestión de Socios
      </Title>
      <Paragraph type="secondary" style={{ marginBottom: 24 }}>
        Registra los socios que recibirán el informe mensual. El código debe coincidir
        exactamente con el que aparece en el Excel (ej. ARM, NUS, LAS).
      </Paragraph>

      <Card
        style={{ borderRadius: 12 }}
        extra={
          <Space>
            <Button icon={<ReloadOutlined />} onClick={fetchSocios} loading={loading}>
              Actualizar
            </Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
              Nuevo socio
            </Button>
          </Space>
        }
      >
        <Table<InformeSocio>
          dataSource={socios}
          columns={columns}
          rowKey="id"
          loading={loading}
          size="middle"
          pagination={{ pageSize: 20, showTotal: (t) => `${t} socios` }}
        />
      </Card>

      <Modal
        title={
          <span>
            <UserOutlined style={{ marginRight: 8 }} />
            {editing ? 'Editar socio' : 'Nuevo socio'}
          </span>
        }
        open={modalOpen}
        onOk={handleSave}
        onCancel={() => setModalOpen(false)}
        okText={saving ? 'Guardando…' : 'Guardar'}
        confirmLoading={saving}
        width={480}
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item
            name="codigo"
            label="Código"
            rules={[{ required: true, message: 'El código es requerido' }]}
            extra="Ej: ARM, NUS, LAS — debe coincidir exactamente con el Excel"
          >
            <Input placeholder="ARM" maxLength={20} style={{ textTransform: 'uppercase' }} />
          </Form.Item>
          <Form.Item
            name="nombre"
            label="Nombre completo"
            rules={[{ required: true, message: 'El nombre es requerido' }]}
          >
            <Input placeholder="Alfredo Rodriguez Mahuad" maxLength={200} />
          </Form.Item>
          <Form.Item
            name="email"
            label="Email"
            rules={[
              { required: true, message: 'El email es requerido' },
              { type: 'email', message: 'Ingresa un email válido' },
            ]}
          >
            <Input placeholder="arodriguez@consortiumlegal.com" maxLength={200} />
          </Form.Item>
          <Form.Item name="activo" label="Activo" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default GestionSociosPage;
