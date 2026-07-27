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
  Select,
  Space,
  Switch,
  Table,
  Tabs,
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
  createInductionQuestion,
  deleteInductionItem,
  deleteInductionQuestion,
  fetchInductionItems,
  fetchInductionLimits,
  fetchInductionModules,
  fetchInductionQuestions,
  fetchPublicInductionFileUrl,
  updateInductionItem,
  updateInductionQuestion,
  type InductionItem,
  type InductionItemType,
  type InductionModule,
  type InductionQuestion,
} from '../../api/induction';

const { Title, Text } = Typography;

/** "3.1 · Contabilidad" para los selectores. */
const etiquetaModulo = (m: InductionModule) => `${m.code} · ${m.title}`;

/** Etiqueta y color de cada tipo, para la tabla. */
const TYPE_TAGS: Record<InductionItemType, { color: string; label: string }> = {
  document: { color: 'blue', label: 'Documento' },
  text: { color: 'purple', label: 'Texto' },
  video: { color: 'volcano', label: 'Video' },
  video_url: { color: 'gold', label: 'Video enlazado' },
};

/** Los tipos que llevan archivo adjunto. */
const TYPES_WITH_FILE: InductionItemType[] = ['document', 'video'];

function InduccionAdmin() {
  const [data, setData] = useState<InductionItem[]>([]);
  const [modules, setModules] = useState<InductionModule[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<InductionItem | null>(null);
  const [saving, setSaving] = useState(false);
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [maxUploadMb, setMaxUploadMb] = useState(50);
  const [form] = Form.useForm();

  const itemType: InductionItemType = Form.useWatch('item_type', form) ?? 'document';
  const takesFile = TYPES_WITH_FILE.includes(itemType);

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
    // El tope lo define el backend (y nginx); no lo hardcodeamos en la UI.
    fetchInductionLimits()
      .then((l) => setMaxUploadMb(l.max_upload_mb))
      .catch(() => {});
    fetchInductionModules().then(setModules).catch(() => {});
  }, []);

  /** Solo los módulos hoja llevan contenido y evaluación (3 agrupa a 3.1–3.4). */
  const modulosHoja = modules.filter(
    (m) => !modules.some((otro) => otro.parent_id === m.id),
  );

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
      module_id: (item as InductionItem & { module?: { id: number } }).module?.id ?? undefined,
      section: item.section ?? '',
      url: item.url ?? '',
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
      const needsFile = TYPES_WITH_FILE.includes(values.item_type);

      if (!editing && needsFile && !file) {
        message.warning(
          values.item_type === 'video'
            ? 'Adjunta el archivo de video'
            : 'Adjunta el archivo del documento',
        );
        return;
      }

      // Avisar antes de subir: si pasa el tope, nginx corta la petición y el
      // error que llega al navegador es genérico y confuso.
      if (file && file.size > maxUploadMb * 1024 * 1024) {
        message.error(
          `El archivo pesa ${(file.size / 1024 / 1024).toFixed(1)} MB y el máximo es ${maxUploadMb} MB. ` +
            'Para un video más pesado usa "Video enlazado" (YouTube/Vimeo).',
        );
        return;
      }

      setSaving(true);
      const payload = {
        item_type: values.item_type,
        title: values.title,
        body: values.body || undefined,
        module_id: values.module_id ?? undefined,
        section: values.section || undefined,
        url: values.item_type === 'video_url' ? values.url : undefined,
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
    <Tabs
      defaultActiveKey="contenido"
      items={[
        { key: 'contenido', label: 'Contenido', children: vistaContenido() },
        {
          key: 'evaluaciones',
          label: 'Evaluaciones',
          children: <Evaluaciones modulos={modulosHoja} />,
        },
      ]}
    />
  );

  function vistaContenido() {
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
            width: 130,
            render: (t: InductionItemType) => {
              const tag = TYPE_TAGS[t] ?? { color: 'default', label: t };
              return <Tag color={tag.color}>{tag.label}</Tag>;
            },
          },
          {
            title: 'Módulo',
            dataIndex: 'module',
            width: 190,
            render: (m: { id: number } | null) => {
              const mod = m ? modules.find((x) => x.id === m.id) : null;
              return mod ? (
                <Tag>{etiquetaModulo(mod)}</Tag>
              ) : (
                <Text type="secondary">sin módulo</Text>
              );
            },
          },
          { title: 'Título', dataIndex: 'title' },
          {
            title: 'Archivo / enlace',
            dataIndex: 'file_name',
            width: 220,
            render: (v: string | null, record) =>
              record.item_type === 'video_url' ? (
                record.url ? (
                  <a href={record.url} target="_blank" rel="noreferrer">
                    <LinkOutlined /> ver video
                  </a>
                ) : (
                  '—'
                )
              ) : record.file || v ? (
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
              <Radio.Button value="video">Video (subir)</Radio.Button>
              <Radio.Button value="video_url">Video enlazado</Radio.Button>
            </Radio.Group>
          </Form.Item>

          <Form.Item name="title" label="Título" rules={[{ required: true, message: 'Ingresa el título' }]}>
            <Input placeholder="Ej. Reglamento interno de trabajo" />
          </Form.Item>

          <Form.Item
            name="module_id"
            label="Módulo del programa"
            extra="Sin módulo el contenido queda suelto: no aparece en el programa de inducción."
          >
            <Select
              allowClear
              placeholder="Seleccione el módulo"
              options={modulosHoja.map((m) => ({ value: m.id, label: etiquetaModulo(m) }))}
            />
          </Form.Item>

          <Form.Item
            name="body"
            label={itemType === 'text' ? 'Texto a mostrar' : 'Descripción (opcional)'}
            rules={itemType === 'text' ? [{ required: true, message: 'Ingresa el texto' }] : []}
          >
            <Input.TextArea rows={itemType === 'text' ? 6 : 3} />
          </Form.Item>

          {itemType === 'video_url' && (
            <Form.Item
              name="url"
              label="Enlace del video"
              rules={[
                { required: true, message: 'Pega el enlace del video' },
                { type: 'url', message: 'Debe ser una URL válida (https://…)' },
              ]}
              extra="YouTube o Vimeo. Sirve un video 'no listado': se ve con el enlace pero no aparece en búsquedas."
            >
              <Input placeholder="https://www.youtube.com/watch?v=..." />
            </Form.Item>
          )}

          {takesFile && (
            <Form.Item
              label={editing?.file_name ? `Archivo (actual: ${editing.file_name})` : 'Archivo'}
              extra={
                itemType === 'video'
                  ? `Máximo ${maxUploadMb} MB (mp4, webm o mov). Si el video pesa más, usa "Video enlazado".`
                  : `Máximo ${maxUploadMb} MB. PDF, imágenes o documentos de Office.`
              }
            >
              <Upload
                beforeUpload={() => false}
                maxCount={1}
                accept={itemType === 'video' ? 'video/*' : undefined}
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
}

/* ── Evaluaciones por módulo ──────────────────────────────────────────────── */

function Evaluaciones({ modulos }: { modulos: InductionModule[] }) {
  const [moduloId, setModuloId] = useState<number | undefined>();
  const [preguntas, setPreguntas] = useState<InductionQuestion[]>([]);
  const [cargando, setCargando] = useState(false);
  const [abierto, setAbierto] = useState(false);
  const [editando, setEditando] = useState<InductionQuestion | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [form] = Form.useForm();

  /* El selector de respuesta correcta se arma con las opciones que se están
     escribiendo, para elegir el texto y no un número. */
  const opcionesActuales: string[] = Form.useWatch('options', form) ?? [];

  const cargar = async (id: number) => {
    setCargando(true);
    try {
      setPreguntas(await fetchInductionQuestions(id));
    } catch (error: any) {
      message.error(error?.response?.data?.message || 'Error al cargar las preguntas');
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    if (modulos.length && moduloId === undefined) setModuloId(modulos[0].id);
  }, [modulos, moduloId]);

  useEffect(() => {
    if (moduloId) cargar(moduloId);
  }, [moduloId]);

  const abrirCrear = () => {
    setEditando(null);
    form.resetFields();
    form.setFieldsValue({
      options: ['', ''],
      correct_index: 0,
      sort_order: preguntas.length + 1,
      active: true,
    });
    setAbierto(true);
  };

  const abrirEditar = (q: InductionQuestion) => {
    setEditando(q);
    form.setFieldsValue({
      text: q.text,
      options: q.options,
      correct_index: q.correct_index,
      explanation: q.explanation ?? '',
      sort_order: q.sort_order,
      active: q.active,
    });
    setAbierto(true);
  };

  const guardar = async () => {
    try {
      const v = await form.validateFields();
      const options: string[] = (v.options || []).map((o: string) => (o ?? '').trim()).filter(Boolean);

      if (options.length < 2) {
        message.warning('La pregunta necesita al menos 2 opciones');
        return;
      }
      if (v.correct_index >= options.length) {
        message.warning('La respuesta correcta debe ser una de las opciones escritas');
        return;
      }

      setGuardando(true);
      const payload = {
        module_id: moduloId!,
        text: v.text,
        options,
        correct_index: v.correct_index,
        explanation: v.explanation || undefined,
        sort_order: v.sort_order ?? 0,
        active: v.active ?? true,
      };

      if (editando) {
        await updateInductionQuestion(editando.id, payload);
        message.success('Pregunta actualizada');
      } else {
        await createInductionQuestion(payload);
        message.success('Pregunta creada');
      }
      setAbierto(false);
      if (moduloId) cargar(moduloId);
    } catch (error: any) {
      if (error?.errorFields) return;
      message.error(error?.response?.data?.message || 'Error al guardar');
    } finally {
      setGuardando(false);
    }
  };

  const eliminar = async (q: InductionQuestion) => {
    try {
      await deleteInductionQuestion(q.id);
      message.success('Pregunta eliminada');
      if (moduloId) cargar(moduloId);
    } catch (error: any) {
      message.error(error?.response?.data?.message || 'Error al eliminar');
    }
  };

  const moduloActual = modulos.find((m) => m.id === moduloId);
  const requeridas = moduloActual
    ? Math.ceil((preguntas.filter((q) => q.active).length * moduloActual.passing_percentage) / 100)
    : 0;

  return (
    <Card>
      <Space style={{ width: '100%', justifyContent: 'space-between', marginBottom: 16 }} wrap>
        <div>
          <Title level={4} style={{ margin: 0 }}>
            Evaluación por módulo
          </Title>
          <Text type="secondary">
            Sin preguntas, el módulo no se puede aprobar y bloquea el resto del programa.
          </Text>
        </div>
        <Space>
          <Select
            style={{ minWidth: 240 }}
            value={moduloId}
            onChange={setModuloId}
            options={modulos.map((m) => ({ value: m.id, label: etiquetaModulo(m) }))}
          />
          <Button type="primary" icon={<PlusOutlined />} disabled={!moduloId} onClick={abrirCrear}>
            Agregar pregunta
          </Button>
        </Space>
      </Space>

      {moduloActual && (
        <Text type="secondary" style={{ display: 'block', marginBottom: 12 }}>
          {preguntas.filter((q) => q.active).length} preguntas activas · se aprueba con{' '}
          {requeridas} correctas ({moduloActual.passing_percentage}%)
        </Text>
      )}

      <Table<InductionQuestion>
        rowKey="id"
        loading={cargando}
        dataSource={preguntas}
        pagination={false}
        columns={[
          { title: '#', dataIndex: 'sort_order', width: 60 },
          { title: 'Pregunta', dataIndex: 'text' },
          {
            title: 'Respuesta correcta',
            width: 260,
            render: (_, q) => <Tag color="green">{q.options[q.correct_index] ?? '—'}</Tag>,
          },
          {
            title: 'Opciones',
            width: 90,
            render: (_, q) => q.options.length,
          },
          {
            title: 'Activa',
            dataIndex: 'active',
            width: 90,
            render: (v: boolean) => (v ? <Tag color="blue">Sí</Tag> : <Tag>No</Tag>),
          },
          {
            title: 'Acciones',
            width: 130,
            render: (_, q) => (
              <Space>
                <Button size="small" icon={<EditOutlined />} onClick={() => abrirEditar(q)} />
                <Popconfirm title="¿Eliminar la pregunta?" onConfirm={() => eliminar(q)}>
                  <Button size="small" danger icon={<DeleteOutlined />} />
                </Popconfirm>
              </Space>
            ),
          },
        ]}
      />

      <Modal
        open={abierto}
        title={editando ? 'Editar pregunta' : 'Nueva pregunta'}
        onCancel={() => setAbierto(false)}
        onOk={guardar}
        confirmLoading={guardando}
        okText="Guardar"
        cancelText="Cancelar"
        destroyOnClose
        width={640}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="text" label="Pregunta" rules={[{ required: true, message: 'Escriba la pregunta' }]}>
            <Input.TextArea rows={2} placeholder="Ej. ¿Cómo se solicita un período de vacaciones?" />
          </Form.Item>

          <Form.List name="options">
            {(fields, { add, remove }) => (
              <Form.Item label="Opciones" required>
                <Space direction="vertical" style={{ width: '100%' }}>
                  {fields.map((field, i) => (
                    <Space key={field.key} align="baseline" style={{ width: '100%' }}>
                      <Text type="secondary" style={{ width: 20 }}>{i + 1}.</Text>
                      <Form.Item {...field} noStyle>
                        <Input style={{ width: 420 }} placeholder={`Opción ${i + 1}`} />
                      </Form.Item>
                      {fields.length > 2 && (
                        <Button size="small" danger icon={<DeleteOutlined />} onClick={() => remove(field.name)} />
                      )}
                    </Space>
                  ))}
                  <Button size="small" icon={<PlusOutlined />} onClick={() => add('')}>
                    Agregar opción
                  </Button>
                </Space>
              </Form.Item>
            )}
          </Form.List>

          <Form.Item
            name="correct_index"
            label="Respuesta correcta"
            rules={[{ required: true, message: 'Indique cuál es la correcta' }]}
          >
            <Select
              placeholder="Elija cuál de las opciones es la correcta"
              options={(opcionesActuales ?? []).map((o: string, i: number) => ({
                value: i,
                label: `${i + 1}. ${o?.trim() || '(opción vacía)'}`,
              }))}
            />
          </Form.Item>

          <Form.Item
            name="explanation"
            label="Por qué es la correcta"
            extra="Se le muestra a la persona al calificar. Ayuda a que la evaluación enseñe, no solo mida."
          >
            <Input.TextArea rows={2} />
          </Form.Item>

          <Space size={24}>
            <Form.Item name="sort_order" label="Orden">
              <InputNumber min={0} />
            </Form.Item>
            <Form.Item name="active" label="Activa" valuePropName="checked">
              <Switch />
            </Form.Item>
          </Space>
        </Form>
      </Modal>
    </Card>
  );
}

export default InduccionAdmin;
