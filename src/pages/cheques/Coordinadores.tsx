import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Form,
  Input,
  message,
  Modal,
  Popconfirm,
  Select,
  Space,
  Table,
  Tag,
  Tooltip,
  Typography,
} from 'antd';
import { DeleteOutlined, EditOutlined, PlusOutlined, ReloadOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import {
  createCoordinator,
  deleteCoordinator,
  getCoordinatorsAdmin,
  updateCoordinator,
  type CoordinatorAdminItem,
  type UnconfiguredCoordinator,
} from '../../api/checks';
import { fetchUsers, fullName, type UserLite } from '../../api/users';

const { Title, Text } = Typography;

type ModalState =
  | { mode: 'create'; name?: string }
  | { mode: 'edit'; coordinator: CoordinatorAdminItem }
  | null;

const formatDate = (d: string | null) => (d ? dayjs(d).format('DD/MM/YYYY') : '—');

const apiError = (err: unknown, fallback: string) =>
  (err as { response?: { data?: { message?: string } } })?.response?.data?.message || fallback;

// Códigos de coordinador que manda Sirvo y quién autoriza los cheques de cada
// uno. Un código nuevo sin configurar deja la lista de autorizadores vacía.
function Coordinadores() {
  const [coordinators, setCoordinators] = useState<CoordinatorAdminItem[]>([]);
  const [unconfigured, setUnconfigured] = useState<UnconfiguredCoordinator[]>([]);
  const [users, setUsers] = useState<UserLite[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState<ModalState>(null);
  const [form] = Form.useForm<{ name: string; member_ids: number[] }>();

  const load = async () => {
    setLoading(true);
    try {
      const data = await getCoordinatorsAdmin();
      setCoordinators(data.coordinators);
      setUnconfigured(data.unconfigured);
    } catch (err) {
      message.error(apiError(err, 'No se pudieron cargar los coordinadores'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    fetchUsers()
      .then((list) => setUsers(list.filter((u) => u.username !== 'OTRO')))
      .catch(() => message.error('No se pudo cargar la lista de usuarios'));
  }, []);

  const openModal = (state: ModalState) => {
    setModal(state);
    if (state?.mode === 'edit') {
      form.setFieldsValue({
        name: state.coordinator.name,
        member_ids: state.coordinator.members.map((m) => m.id),
      });
    } else {
      form.setFieldsValue({ name: state?.name ?? '', member_ids: [] });
    }
  };

  const handleSave = async () => {
    const values = await form.validateFields();
    setSaving(true);
    try {
      if (modal?.mode === 'edit') {
        await updateCoordinator(modal.coordinator.id, values);
        message.success(`Coordinador ${values.name.toUpperCase()} actualizado`);
      } else {
        await createCoordinator(values);
        message.success(`Coordinador ${values.name.toUpperCase()} creado`);
      }
      setModal(null);
      load();
    } catch (err) {
      message.error(apiError(err, 'No se pudo guardar el coordinador'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (c: CoordinatorAdminItem) => {
    try {
      await deleteCoordinator(c.id);
      message.success(`Coordinador ${c.name} eliminado`);
      load();
    } catch (err) {
      message.error(apiError(err, 'No se pudo eliminar el coordinador'));
    }
  };

  // Usuarios activos + los miembros actuales (aunque estén inactivos) para que
  // el Select pueda mostrarlos y quitarlos.
  const userOptions = useMemo(() => {
    const map = new Map<number, { value: number; label: string }>();
    for (const u of users) {
      map.set(u.id, { value: u.id, label: `${u.username} — ${fullName(u)}` });
    }
    if (modal?.mode === 'edit') {
      for (const m of modal.coordinator.members) {
        if (!map.has(m.id)) {
          map.set(m.id, {
            value: m.id,
            label: `${m.username} — ${m.first_name} ${m.last_name}${m.active ? '' : ' (inactivo)'}`,
          });
        }
      }
    }
    return Array.from(map.values()).sort((a, b) => a.label.localeCompare(b.label));
  }, [users, modal]);

  const filtered = useMemo(() => {
    const q = search.trim().toUpperCase();
    if (!q) return coordinators;
    return coordinators.filter(
      (c) =>
        c.name.toUpperCase().includes(q) ||
        c.members.some((m) =>
          `${m.username} ${m.first_name} ${m.last_name}`.toUpperCase().includes(q),
        ),
    );
  }, [coordinators, search]);

  const editingName = modal?.mode === 'edit' ? modal.coordinator.name : null;
  const watchedName = Form.useWatch('name', form);
  const renaming =
    editingName !== null &&
    !!watchedName &&
    watchedName.trim().toUpperCase() !== editingName.trim().toUpperCase();

  return (
    <div style={{ padding: 24 }}>
      <Space style={{ width: '100%', justifyContent: 'space-between', marginBottom: 16 }} wrap>
        <div>
          <Title level={3} style={{ margin: 0 }}>
            Coordinadores de cheques
          </Title>
          <Text type="secondary">
            Quién autoriza los cheques de cada código de coordinador que manda Sirvo.
          </Text>
        </div>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={load} loading={loading}>
            Actualizar
          </Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => openModal({ mode: 'create' })}>
            Nuevo coordinador
          </Button>
        </Space>
      </Space>

      {unconfigured.length > 0 && (
        <Card
          size="small"
          style={{ marginBottom: 16, borderColor: '#faad14' }}
          title={
            <Space>
              <Tag color="orange">{unconfigured.length}</Tag>
              Códigos nuevos de Sirvo sin configurar
            </Space>
          }
        >
          <Alert
            type="warning"
            showIcon
            style={{ marginBottom: 12 }}
            message="Estos códigos ya llegaron en cheques pero no tienen autorizadores: al solicitar autorización, la lista sale vacía."
          />
          <Table<UnconfiguredCoordinator>
            rowKey="name"
            size="small"
            pagination={false}
            dataSource={unconfigured}
            columns={[
              { title: 'Código', dataIndex: 'name', render: (v: string) => <Text strong>{v}</Text> },
              {
                title: 'Pendientes de autorizar',
                dataIndex: 'pending_authorization',
                align: 'center',
                render: (v: number) => (v > 0 ? <Tag color="red">{v}</Tag> : <Text type="secondary">0</Text>),
              },
              { title: 'Cheques', dataIndex: 'total_checks', align: 'center' },
              { title: 'Último cheque', dataIndex: 'last_check_date', render: formatDate },
              {
                title: '',
                key: 'actions',
                align: 'right',
                render: (_, row) => (
                  <Button
                    type="primary"
                    size="small"
                    icon={<PlusOutlined />}
                    onClick={() => openModal({ mode: 'create', name: row.name })}
                  >
                    Configurar
                  </Button>
                ),
              },
            ]}
          />
        </Card>
      )}

      <Card size="small">
        <Input.Search
          allowClear
          placeholder="Buscar por código o autorizador"
          style={{ maxWidth: 320, marginBottom: 12 }}
          onChange={(e) => setSearch(e.target.value)}
        />
        <Table<CoordinatorAdminItem>
          rowKey="id"
          size="middle"
          loading={loading}
          dataSource={filtered}
          pagination={{ pageSize: 50, hideOnSinglePage: true }}
          columns={[
            {
              title: 'Código',
              dataIndex: 'name',
              width: 140,
              sorter: (a, b) => a.name.localeCompare(b.name),
              render: (v: string) => <Text strong>{v}</Text>,
            },
            {
              title: 'Autorizadores',
              key: 'members',
              render: (_, c) =>
                c.members.length === 0 ? (
                  <Tag color="red">Sin autorizadores</Tag>
                ) : (
                  <Space size={[4, 4]} wrap>
                    {c.members.map((m) => (
                      <Tooltip
                        key={m.id}
                        title={`${m.first_name} ${m.last_name}${m.active ? '' : ' — usuario inactivo'}`}
                      >
                        <Tag color={m.active ? 'blue' : 'default'} style={m.active ? undefined : { textDecoration: 'line-through' }}>
                          {m.username}
                        </Tag>
                      </Tooltip>
                    ))}
                  </Space>
                ),
            },
            {
              title: 'Pendientes de autorizar',
              dataIndex: 'pending_authorization',
              align: 'center',
              width: 120,
              sorter: (a, b) => a.pending_authorization - b.pending_authorization,
              render: (v: number) => (v > 0 ? <Tag color="gold">{v}</Tag> : <Text type="secondary">0</Text>),
            },
            {
              title: 'Cheques',
              dataIndex: 'total_checks',
              align: 'center',
              width: 100,
              sorter: (a, b) => a.total_checks - b.total_checks,
            },
            {
              title: 'Último cheque',
              dataIndex: 'last_check_date',
              width: 120,
              sorter: (a, b) => (a.last_check_date ?? '').localeCompare(b.last_check_date ?? ''),
              render: formatDate,
            },
            {
              title: '',
              key: 'actions',
              align: 'right',
              width: 110,
              render: (_, c) => (
                <Space>
                  <Tooltip title="Editar">
                    <Button icon={<EditOutlined />} size="small" onClick={() => openModal({ mode: 'edit', coordinator: c })} />
                  </Tooltip>
                  <Popconfirm
                    title={`¿Eliminar el coordinador ${c.name}?`}
                    description={
                      c.pending_authorization > 0
                        ? `Tiene ${c.pending_authorization} cheque(s) pendiente(s): se quedarán sin autorizadores.`
                        : 'Sus cheques se quedarán sin autorizadores.'
                    }
                    okText="Eliminar"
                    okButtonProps={{ danger: true }}
                    cancelText="Cancelar"
                    onConfirm={() => handleDelete(c)}
                  >
                    <Tooltip title="Eliminar">
                      <Button icon={<DeleteOutlined />} size="small" danger />
                    </Tooltip>
                  </Popconfirm>
                </Space>
              ),
            },
          ]}
        />
      </Card>

      <Modal
        open={modal !== null}
        title={modal?.mode === 'edit' ? `Editar coordinador ${modal.coordinator.name}` : 'Nuevo coordinador'}
        okText="Guardar"
        cancelText="Cancelar"
        confirmLoading={saving}
        onOk={handleSave}
        onCancel={() => setModal(null)}
        destroyOnClose
      >
        <Form form={form} layout="vertical" preserve={false}>
          <Form.Item
            name="name"
            label="Código"
            extra="Exactamente como lo manda Sirvo (p. ej. CORPOR). Se guarda en mayúsculas."
            rules={[{ required: true, whitespace: true, message: 'Ingrese el código' }]}
          >
            <Input maxLength={100} style={{ textTransform: 'uppercase' }} />
          </Form.Item>
          {renaming && (
            <Alert
              type="warning"
              showIcon
              style={{ marginBottom: 16 }}
              message={`Los cheques con código ${editingName} se quedarán sin autorizadores si cambia el código.`}
            />
          )}
          <Form.Item name="member_ids" label="Autorizadores">
            <Select
              mode="multiple"
              allowClear
              showSearch
              optionFilterProp="label"
              placeholder="Buscar por usuario o nombre"
              options={userOptions}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

export default Coordinadores;
