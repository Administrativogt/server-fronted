import { useEffect, useState } from 'react';
import {
  Button,
  Card,
  Empty,
  Form,
  Input,
  InputNumber,
  message,
  Modal,
  Popconfirm,
  Progress,
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
import dayjs from 'dayjs';
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
  createInductionModule,
  createInductionQuestion,
  deleteInductionItem,
  deleteInductionModule,
  deleteInductionQuestion,
  fetchInductionItems,
  fetchInductionLimits,
  fetchInductionModules,
  fetchInductionQuestions,
  fetchInductionResults,
  fetchParticipantResults,
  fetchPublicInductionFileUrl,
  updateInductionItem,
  updateInductionModule,
  updateInductionQuestion,
  type InductionItem,
  type InductionItemType,
  type InductionModule,
  type InductionParticipantDetail,
  type InductionQuestion,
  type InductionResultRow,
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

  const reloadModules = () =>
    fetchInductionModules().then(setModules).catch(() => {});

  useEffect(() => {
    loadData();
    // El tope lo define el backend (y nginx); no lo hardcodeamos en la UI.
    fetchInductionLimits()
      .then((l) => setMaxUploadMb(l.max_upload_mb))
      .catch(() => {});
    reloadModules();
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
        {
          key: 'modulos',
          label: 'Módulos',
          children: <Modulos modulos={modules} onChanged={reloadModules} />,
        },
        {
          key: 'resultados',
          label: 'Resultados',
          children: <Resultados />,
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
        pagination={{ pageSize: 20, hideOnSinglePage: true }}
        scroll={{ x: 900 }}
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
                <Button
                  type="link"
                  size="small"
                  icon={<FileTextOutlined />}
                  style={{ padding: 0, maxWidth: 200 }}
                  onClick={async () => {
                    try {
                      const url = await fetchPublicInductionFileUrl(record.id);
                      window.open(url, '_blank', 'noopener');
                    } catch {
                      message.error('No se pudo abrir el archivo');
                    }
                  }}
                >
                  <span
                    style={{
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {v || 'ver archivo'}
                  </span>
                </Button>
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
                <Button
                  size="small"
                  icon={<EditOutlined />}
                  aria-label={`Editar ${record.title}`}
                  onClick={() => openEdit(record)}
                />
                <Popconfirm
                  title={`¿Eliminar "${record.title}"?`}
                  okText="Eliminar"
                  cancelText="Cancelar"
                  okButtonProps={{ danger: true }}
                  onConfirm={() => handleDelete(record)}
                >
                  <Button
                    size="small"
                    danger
                    icon={<DeleteOutlined />}
                    aria-label={`Eliminar ${record.title}`}
                  />
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
        destroyOnHidden
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

          <Space size="large" wrap>
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
        pagination={{ pageSize: 20, hideOnSinglePage: true }}
        scroll={{ x: 800 }}
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
                <Button
                  size="small"
                  icon={<EditOutlined />}
                  aria-label="Editar pregunta"
                  onClick={() => abrirEditar(q)}
                />
                <Popconfirm
                  title="¿Eliminar la pregunta?"
                  okText="Eliminar"
                  cancelText="Cancelar"
                  okButtonProps={{ danger: true }}
                  onConfirm={() => eliminar(q)}
                >
                  <Button
                    size="small"
                    danger
                    icon={<DeleteOutlined />}
                    aria-label="Eliminar pregunta"
                  />
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
        destroyOnHidden
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
                    <div
                      key={field.key}
                      style={{ display: 'flex', gap: 8, alignItems: 'center' }}
                    >
                      <Text type="secondary" style={{ width: 20, flexShrink: 0 }}>
                        {i + 1}.
                      </Text>
                      <Form.Item {...field} noStyle>
                        <Input style={{ flex: 1, minWidth: 0 }} placeholder={`Opción ${i + 1}`} />
                      </Form.Item>
                      {fields.length > 2 && (
                        <Button
                          size="small"
                          danger
                          icon={<DeleteOutlined />}
                          aria-label={`Eliminar opción ${i + 1}`}
                          onClick={() => remove(field.name)}
                        />
                      )}
                    </div>
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

          <Space size={24} wrap>
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

/* ── Módulos del programa ─────────────────────────────────────────────────── */

/**
 * CRUD de la estructura del programa (antes solo editable desde la BD).
 * Un nivel de jerarquía: módulos raíz y submódulos (3 → 3.1, 3.2…). Un módulo
 * con submódulos no lleva contenido ni evaluación propios: agrupa.
 */
function Modulos({
  modulos,
  onChanged,
}: {
  modulos: InductionModule[];
  onChanged: () => void;
}) {
  const [abierto, setAbierto] = useState(false);
  const [editando, setEditando] = useState<InductionModule | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [form] = Form.useForm();

  const raices = modulos.filter((m) => !m.parent_id);
  const hijosDe = (id: number) => modulos.filter((m) => m.parent_id === id);
  const esHoja = (m: InductionModule) => hijosDe(m.id).length === 0;

  /* Raíces con sus hijos debajo, como se ve en la página pública. */
  const ordenados = raices.flatMap((r) => [r, ...hijosDe(r.id)]);

  const abrirCrear = () => {
    setEditando(null);
    form.resetFields();
    form.setFieldsValue({
      passing_percentage: 100,
      sort_order: (raices[raices.length - 1]?.sort_order ?? 0) + 1,
      active: true,
    });
    setAbierto(true);
  };

  const abrirEditar = (m: InductionModule) => {
    setEditando(m);
    form.setFieldsValue({
      code: m.code,
      title: m.title,
      parent_id: m.parent_id ?? undefined,
      summary: m.summary ?? '',
      duration: m.duration ?? '',
      passing_percentage: m.passing_percentage,
      sort_order: m.sort_order,
      active: m.active,
    });
    setAbierto(true);
  };

  const guardar = async () => {
    try {
      const v = await form.validateFields();
      setGuardando(true);
      const payload = {
        code: v.code.trim(),
        title: v.title.trim(),
        parent_id: v.parent_id ?? null,
        summary: v.summary?.trim() || undefined,
        duration: v.duration?.trim() || undefined,
        passing_percentage: v.passing_percentage ?? 100,
        sort_order: v.sort_order ?? 0,
        active: v.active ?? true,
      };
      if (editando) {
        await updateInductionModule(editando.id, payload);
        message.success('Módulo actualizado');
      } else {
        await createInductionModule(payload);
        message.success('Módulo creado');
      }
      setAbierto(false);
      onChanged();
    } catch (error: any) {
      if (error?.errorFields) return;
      message.error(error?.response?.data?.message || 'Error al guardar el módulo');
    } finally {
      setGuardando(false);
    }
  };

  const eliminar = async (m: InductionModule) => {
    try {
      await deleteInductionModule(m.id);
      message.success('Módulo eliminado');
      onChanged();
    } catch (error: any) {
      message.error(error?.response?.data?.message || 'Error al eliminar el módulo');
    }
  };

  return (
    <Card>
      <Space style={{ width: '100%', justifyContent: 'space-between', marginBottom: 16 }} wrap>
        <div>
          <Title level={4} style={{ margin: 0 }}>
            Estructura del programa
          </Title>
          <Text type="secondary">
            Los módulos se cursan en el orden de esta lista. Uno con submódulos
            solo agrupa: el contenido y la evaluación van en cada submódulo.
          </Text>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={abrirCrear}>
          Agregar módulo
        </Button>
      </Space>

      <Table<InductionModule>
        rowKey="id"
        dataSource={ordenados}
        pagination={false}
        scroll={{ x: 900 }}
        columns={[
          { title: 'Código', dataIndex: 'code', width: 90 },
          {
            title: 'Título',
            dataIndex: 'title',
            render: (t: string, m) =>
              m.parent_id ? (
                <span style={{ paddingLeft: 18 }}>{t}</span>
              ) : (
                <Text strong>{t}</Text>
              ),
          },
          { title: 'Duración', dataIndex: 'duration', width: 110, render: (v) => v || '—' },
          {
            title: 'Aprueba con',
            dataIndex: 'passing_percentage',
            width: 110,
            render: (v: number, m) => (esHoja(m) ? `${v}%` : '—'),
          },
          {
            title: 'Contenido',
            dataIndex: 'item_count',
            width: 100,
            render: (v: number, m) => (esHoja(m) ? v : '—'),
          },
          {
            title: 'Preguntas',
            dataIndex: 'question_count',
            width: 130,
            render: (v: number, m) =>
              !esHoja(m) ? (
                '—'
              ) : v === 0 ? (
                <Tag color="orange" title="Sin preguntas nadie puede aprobar este módulo">
                  0 · bloquea el programa
                </Tag>
              ) : (
                v
              ),
          },
          { title: 'Orden', dataIndex: 'sort_order', width: 80 },
          {
            title: 'Activo',
            dataIndex: 'active',
            width: 90,
            render: (a: boolean) => (a ? <Tag color="green">Sí</Tag> : <Tag>No</Tag>),
          },
          {
            title: 'Acciones',
            width: 110,
            render: (_, m) => (
              <Space>
                <Button
                  size="small"
                  icon={<EditOutlined />}
                  aria-label={`Editar ${m.code}`}
                  onClick={() => abrirEditar(m)}
                />
                <Popconfirm
                  title={`¿Eliminar el módulo ${m.code} · ${m.title}?`}
                  description="Su contenido queda suelto (no se borra); sus preguntas sí se eliminan."
                  okText="Eliminar"
                  cancelText="Cancelar"
                  okButtonProps={{ danger: true }}
                  onConfirm={() => eliminar(m)}
                >
                  <Button size="small" danger icon={<DeleteOutlined />} aria-label={`Eliminar ${m.code}`} />
                </Popconfirm>
              </Space>
            ),
          },
        ]}
      />

      <Modal
        open={abierto}
        title={editando ? `Editar módulo ${editando.code}` : 'Nuevo módulo'}
        onCancel={() => setAbierto(false)}
        onOk={guardar}
        confirmLoading={guardando}
        okText="Guardar"
        cancelText="Cancelar"
        destroyOnHidden
      >
        <Form form={form} layout="vertical">
          <Space size="large" align="start" wrap>
            <Form.Item
              name="code"
              label="Código"
              rules={[{ required: true, message: 'Ej. 3.1' }]}
              extra="Numeración visible: 1, 2, 3.1…"
            >
              <Input style={{ width: 100 }} maxLength={10} placeholder="3.1" />
            </Form.Item>
            <Form.Item
              name="title"
              label="Título"
              style={{ width: 300 }}
              rules={[{ required: true, message: 'Ingresa el título' }]}
            >
              <Input maxLength={180} placeholder="Ej. Contabilidad" />
            </Form.Item>
          </Space>

          <Form.Item
            name="parent_id"
            label="Módulo padre"
            extra="Solo si es un submódulo (un nivel: 3 → 3.1). Vacío = módulo principal."
          >
            <Select
              allowClear
              placeholder="Ninguno (módulo principal)"
              options={raices
                .filter((r) => r.id !== editando?.id)
                .map((r) => ({ value: r.id, label: etiquetaModulo(r) }))}
            />
          </Form.Item>

          <Form.Item name="summary" label="Resumen (opcional)">
            <Input.TextArea rows={2} placeholder="Qué cubre el módulo; se muestra bajo el título" />
          </Form.Item>

          <Space size="large" wrap>
            <Form.Item name="duration" label="Duración (texto)">
              <Input style={{ width: 130 }} maxLength={40} placeholder="Ej. 35 min" />
            </Form.Item>
            <Form.Item
              name="passing_percentage"
              label="Aprueba con"
              rules={[{ required: true, message: 'Indique el %' }]}
            >
              <InputNumber min={1} max={100} suffix="%" />
            </Form.Item>
            <Form.Item name="sort_order" label="Orden">
              <InputNumber min={0} />
            </Form.Item>
            <Form.Item name="active" label="Activo" valuePropName="checked">
              <Switch />
            </Form.Item>
          </Space>
        </Form>
      </Modal>
    </Card>
  );
}

/* ── Resultados de participantes ──────────────────────────────────────────── */

const fechaCorta = (v: string | null | undefined) =>
  v ? dayjs(v).format('DD/MM/YYYY HH:mm') : '—';

/**
 * Quién se registró, cuánto lleva y cada intento de evaluación. El avance ya
 * no vive en el navegador de la persona: esta pestaña es la constancia de RRHH.
 */
function Resultados() {
  const [rows, setRows] = useState<InductionResultRow[]>([]);
  const [cargando, setCargando] = useState(false);
  const [detalles, setDetalles] = useState<Record<number, InductionParticipantDetail>>({});

  const cargar = async () => {
    setCargando(true);
    try {
      setRows(await fetchInductionResults());
    } catch (error: any) {
      message.error(error?.response?.data?.message || 'Error al cargar los resultados');
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargar();
  }, []);

  const cargarDetalle = async (id: number) => {
    if (detalles[id]) return;
    try {
      const d = await fetchParticipantResults(id);
      setDetalles((prev) => ({ ...prev, [id]: d }));
    } catch {
      message.error('No se pudo cargar el detalle de intentos');
    }
  };

  return (
    <Card>
      <Space style={{ width: '100%', justifyContent: 'space-between', marginBottom: 16 }} wrap>
        <div>
          <Title level={4} style={{ margin: 0 }}>
            Resultados del programa
          </Title>
          <Text type="secondary">
            Cada fila es una persona registrada; expándala para ver sus intentos módulo por módulo.
          </Text>
        </div>
        <Button onClick={cargar} loading={cargando}>
          Recargar
        </Button>
      </Space>

      <Table<InductionResultRow>
        rowKey="id"
        loading={cargando}
        dataSource={rows}
        scroll={{ x: 900 }}
        locale={{
          emptyText: (
            <Empty description="Nadie se ha registrado todavía en la página de inducción" />
          ),
        }}
        expandable={{
          onExpand: (expanded, record) => {
            if (expanded) cargarDetalle(record.id);
          },
          expandedRowRender: (record) => {
            const d = detalles[record.id];
            if (!d) return <Text type="secondary">Cargando intentos…</Text>;
            if (!d.attempts.length) {
              return <Text type="secondary">Sin intentos de evaluación todavía.</Text>;
            }
            return (
              <Table
                rowKey="id"
                size="small"
                dataSource={d.attempts}
                pagination={false}
                columns={[
                  {
                    title: 'Módulo',
                    render: (_, a) => `${a.module_code} · ${a.module_title}`,
                  },
                  {
                    title: 'Resultado',
                    width: 140,
                    render: (_, a) => `${a.correct}/${a.total} (mín. ${a.required})`,
                  },
                  {
                    title: 'Estado',
                    width: 120,
                    render: (_, a) =>
                      a.passed ? <Tag color="green">Aprobado</Tag> : <Tag color="red">No aprobado</Tag>,
                  },
                  {
                    title: 'Fecha',
                    dataIndex: 'created',
                    width: 150,
                    render: fechaCorta,
                  },
                ]}
              />
            );
          },
        }}
        columns={[
          { title: 'Nombre', dataIndex: 'full_name', render: (v) => <Text strong>{v}</Text> },
          { title: 'Correo', dataIndex: 'email', width: 220 },
          {
            title: 'Avance',
            width: 170,
            render: (_, r) => (
              <Space size={8}>
                <Progress
                  percent={
                    r.total_evaluable
                      ? Math.round((r.approved_count / r.total_evaluable) * 100)
                      : 0
                  }
                  size="small"
                  style={{ width: 90 }}
                  showInfo={false}
                />
                <Text type="secondary" style={{ fontSize: 12 }}>
                  {r.approved_count}/{r.total_evaluable}
                </Text>
              </Space>
            ),
          },
          {
            title: 'Estado',
            width: 190,
            render: (_, r) =>
              r.completed_at ? (
                <Tag color="green">Completado · {dayjs(r.completed_at).format('DD/MM/YYYY')}</Tag>
              ) : (
                <Tag>En curso</Tag>
              ),
          },
          { title: 'Intentos', dataIndex: 'attempt_count', width: 90 },
          {
            title: 'Última actividad',
            dataIndex: 'last_activity',
            width: 150,
            render: fechaCorta,
          },
          {
            title: 'Registro',
            dataIndex: 'created',
            width: 150,
            render: fechaCorta,
          },
        ]}
      />
    </Card>
  );
}

export default InduccionAdmin;
