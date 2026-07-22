import { useEffect, useState } from 'react';
import {
  Button,
  Card,
  Form,
  Input,
  InputNumber,
  message,
  Modal,
  Popconfirm,
  Radio,
  Space,
  Switch,
  Table,
  Tag,
  Typography,
  Upload,
} from 'antd';
import {
  DeleteOutlined,
  EditOutlined,
  FileTextOutlined,
  LinkOutlined,
  PlusOutlined,
  UploadOutlined,
} from '@ant-design/icons';
import type { UploadFile } from 'antd';
import {
  createInductionItem,
  deleteInductionItem,
  fetchInductionItems,
  fetchPublicInductionFileUrl,
  updateInductionItem,
  type InductionItem,
} from '../../api/induction';

const { Title, Text } = Typography;

function InduccionAdmin() {
  const [data, setData] = useState<InductionItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<InductionItem | null>(null);
  const [saving, setSaving] = useState(false);
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [form] = Form.useForm();

  const itemType: 'document' | 'text' = Form.useWatch('item_type', form) ?? 'document';

  const loadData = async () => {
    setLoading(true);
    try {
      setData(await fetchInductionItems());
    } catch (error: any) {
      message.error(error?.response?.data?.message || 'Error al cargar la inducción');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openCreate = () => {
    setEditing(null);
    form.resetFields();
    form.setFieldsValue({ item_type: 'document', active: true, sort_order: 0 });
    setFileList([]);
    setModalOpen(true);
  };

  const openEdit = (item: InductionItem) => {
    setEditing(item);
    form.setFieldsValue({
      item_type: item.item_type,
      title: item.title,
      body: item.body ?? '',
      section: item.section ?? '',
      sort_order: item.sort_order,
      active: item.active,
    });
    setFileList([]);
    setModalOpen(true);
  };

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      const file = (fileList[0]?.originFileObj as File | undefined) ?? null;

      if (!editing && values.item_type === 'document' && !file) {
        message.warning('Adjunta el archivo del documento');
        return;
      }

      setSaving(true);
      const payload = {
        item_type: values.item_type,
        title: values.title,
        body: values.body || undefined,
        section: values.section || undefined,
        sort_order: values.sort_order ?? 0,
        active: values.active ?? true,
        file,
      };

      if (editing) {
        await updateInductionItem(editing.id, payload);
        message.success('Elemento actualizado');
      } else {
        await createInductionItem(payload);
        message.success('Elemento creado');
      }
      setModalOpen(false);
      loadData();
    } catch (error: any) {
      if (error?.errorFields) return;
      message.error(error?.response?.data?.message || 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (item: InductionItem) => {
    try {
      await deleteInductionItem(item.id);
      message.success('Elemento eliminado');
      loadData();
    } catch (error: any) {
      message.error(error?.response?.data?.message || 'Error al eliminar');
    }
  };

  return (
    <Card>
      <Space style={{ width: '100%', justifyContent: 'space-between', marginBottom: 16 }} wrap>
        <div>
          <Title level={4} style={{ margin: 0 }}>
            Inducción — contenido público
          </Title>
          <Text type="secondary">
            Lo que publiques aquí se ve sin iniciar sesión en{' '}
            <a href="/induccion" target="_blank" rel="noreferrer">
              administrativogt.com/induccion <LinkOutlined />
            </a>
          </Text>
        </div>
        <Space>
          <Button onClick={loadData} loading={loading}>
            Recargar
          </Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
            Agregar contenido
          </Button>
        </Space>
      </Space>

      <Table<InductionItem>
        rowKey="id"
        loading={loading}
        dataSource={data}
        pagination={false}
        columns={[
          {
            title: 'Tipo',
            dataIndex: 'item_type',
            width: 110,
            render: (t: string) =>
              t === 'text' ? <Tag color="purple">Texto</Tag> : <Tag color="blue">Documento</Tag>,
          },
          { title: 'Sección', dataIndex: 'section', width: 160, render: (v) => v || '—' },
          { title: 'Título', dataIndex: 'title' },
          {
            title: 'Archivo',
            dataIndex: 'file_name',
            width: 220,
            render: (v: string | null, record) =>
              record.file || v ? (
                <a
                  onClick={async () => {
                    try {
                      const url = await fetchPublicInductionFileUrl(record.id);
                      window.open(url, '_blank');
                    } catch {
                      message.error('No se pudo abrir el archivo');
                    }
                  }}
                >
                  <FileTextOutlined /> {v || 'ver archivo'}
                </a>
              ) : (
                '—'
              ),
          },
          { title: 'Orden', dataIndex: 'sort_order', width: 80 },
          {
            title: 'Visible',
            dataIndex: 'active',
            width: 90,
            render: (a: boolean) => (a ? <Tag color="green">Sí</Tag> : <Tag>No</Tag>),
          },
          {
            title: 'Acciones',
            width: 110,
            render: (_, record) => (
              <Space>
                <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(record)} />
                <Popconfirm
                  title={`¿Eliminar "${record.title}"?`}
                  okText="Eliminar"
                  cancelText="Cancelar"
                  okButtonProps={{ danger: true }}
                  onConfirm={() => handleDelete(record)}
                >
                  <Button size="small" danger icon={<DeleteOutlined />} />
                </Popconfirm>
              </Space>
            ),
          },
        ]}
      />

      <Modal
        title={editing ? `Editar: ${editing.title}` : 'Agregar contenido de inducción'}
        open={modalOpen}
        onOk={handleSave}
        onCancel={() => setModalOpen(false)}
        okText={editing ? 'Guardar cambios' : 'Crear'}
        cancelText="Cancelar"
        confirmLoading={saving}
        destroyOnClose
      >
        <Form form={form} layout="vertical">
          <Form.Item name="item_type" label="Tipo de contenido" rules={[{ required: true }]}>
            <Radio.Group>
              <Radio.Button value="document">Documento descargable</Radio.Button>
              <Radio.Button value="text">Bloque de texto</Radio.Button>
            </Radio.Group>
          </Form.Item>

          <Form.Item name="title" label="Título" rules={[{ required: true, message: 'Ingresa el título' }]}>
            <Input placeholder="Ej. Reglamento interno de trabajo" />
          </Form.Item>

          <Form.Item name="section" label="Sección (agrupador en la página)">
            <Input placeholder="Ej. Bienvenida, Políticas, Formularios" />
          </Form.Item>

          <Form.Item
            name="body"
            label={itemType === 'text' ? 'Texto a mostrar' : 'Descripción (opcional)'}
            rules={itemType === 'text' ? [{ required: true, message: 'Ingresa el texto' }] : []}
          >
            <Input.TextArea rows={itemType === 'text' ? 6 : 3} />
          </Form.Item>

          {itemType === 'document' && (
            <Form.Item
              label={editing?.file_name ? `Archivo (actual: ${editing.file_name})` : 'Archivo'}
            >
              <Upload
                beforeUpload={() => false}
                maxCount={1}
                fileList={fileList}
                onChange={({ fileList: fl }) => setFileList(fl)}
              >
                <Button icon={<UploadOutlined />}>
                  {editing?.file_name ? 'Reemplazar archivo' : 'Seleccionar archivo'}
                </Button>
              </Upload>
            </Form.Item>
          )}

          <Space size="large">
            <Form.Item name="sort_order" label="Orden">
              <InputNumber min={0} />
            </Form.Item>
            <Form.Item name="active" label="Visible en la página pública" valuePropName="checked">
              <Switch />
            </Form.Item>
          </Space>
        </Form>
      </Modal>
    </Card>
  );
}

export default InduccionAdmin;
