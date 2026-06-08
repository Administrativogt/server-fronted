import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Table, Button, Space, Input, Tag, Modal, Form, Select, Switch,
  Popconfirm, message, Tooltip,
} from 'antd';
import {
  PlusOutlined, EditOutlined, ReloadOutlined, SearchOutlined, StopOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import {
  getSociedades, createSociedad, updateSociedad, deleteSociedad,
} from '../../../api/asambleas';
import {
  type Sociedad, PERIODOS_ASAMBLEA, getPeriodoLabel, fullName,
} from '../../../types/asambleas.types';
import { fetchUsers, type UserLite } from '../../../api/users';

const SociedadesTab: React.FC = () => {
  const [rows, setRows] = useState<Sociedad[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [onlyActive, setOnlyActive] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Sociedad | null>(null);
  const [saving, setSaving] = useState(false);
  const [users, setUsers] = useState<UserLite[]>([]);
  const [form] = Form.useForm();

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      setRows(await getSociedades(onlyActive));
    } catch {
      message.error('No se pudieron cargar las sociedades');
    } finally {
      setLoading(false);
    }
  }, [onlyActive]);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => {
    fetchUsers().then(setUsers).catch(() => { /* opcional: el selector queda vacío */ });
  }, []);

  const userOptions = useMemo(
    () => users.map((u) => ({
      value: u.id,
      label: `${u.first_name ?? ''} ${u.last_name ?? ''}`.trim() || u.username,
    })),
    [users],
  );

  const openCreate = () => {
    setEditing(null);
    form.resetFields();
    form.setFieldsValue({ mesAsamblea: 1 });
    setModalOpen(true);
  };

  const openEdit = (record: Sociedad) => {
    setEditing(record);
    form.setFieldsValue({
      nombre: record.nombre,
      emailContacto: record.emailContacto,
      contactoAdicional: record.contactoAdicional ?? undefined,
      mesAsamblea: record.mesAsamblea,
      responsableId: record.responsable?.id,
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    const values = await form.validateFields();
    setSaving(true);
    try {
      if (editing) {
        await updateSociedad(editing.id, values);
        message.success('Sociedad actualizada');
      } else {
        await createSociedad(values);
        message.success('Sociedad registrada');
      }
      setModalOpen(false);
      fetchData();
    } catch (e: any) {
      if (e?.errorFields) return; // validación del form
      message.error(e?.response?.data?.message ?? 'No se pudo guardar la sociedad');
    } finally {
      setSaving(false);
    }
  };

  const handleDeactivate = async (record: Sociedad) => {
    try {
      await deleteSociedad(record.id);
      message.success('Sociedad desactivada');
      fetchData();
    } catch (e: any) {
      message.error(e?.response?.data?.message ?? 'No se pudo desactivar');
    }
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (r) =>
        r.nombre.toLowerCase().includes(q) ||
        r.emailContacto.toLowerCase().includes(q) ||
        fullName(r.responsable).toLowerCase().includes(q),
    );
  }, [rows, search]);

  const columns: ColumnsType<Sociedad> = [
    { title: 'Sociedad', dataIndex: 'nombre', ellipsis: true,
      sorter: (a, b) => a.nombre.localeCompare(b.nombre) },
    { title: 'Email de contacto', dataIndex: 'emailContacto', ellipsis: true },
    { title: 'Contacto adicional', dataIndex: 'contactoAdicional',
      render: (v: string | null) => v || <span style={{ opacity: 0.5 }}>—</span> },
    { title: 'Responsable', render: (_, r) => fullName(r.responsable) },
    { title: 'Período', dataIndex: 'mesAsamblea', width: 110,
      filters: PERIODOS_ASAMBLEA.map((p) => ({ text: p.label, value: p.mes })),
      onFilter: (v, r) => r.mesAsamblea === v,
      render: (m: number) => <Tag color="blue">{getPeriodoLabel(m)}</Tag> },
    { title: 'Estado', dataIndex: 'state', width: 110,
      render: (s: number) =>
        s === 1 ? <Tag color="green">Activa</Tag> : <Tag color="red">Inactiva</Tag> },
    { title: 'Acciones', width: 150, fixed: 'right', render: (_, r) => (
      <Space>
        <Tooltip title="Editar">
          <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(r)} />
        </Tooltip>
        {r.state === 1 && (
          <Popconfirm
            title="Desactivar sociedad"
            description="No recibirá más recordatorios de asamblea."
            okText="Desactivar" okButtonProps={{ danger: true }} cancelText="Cancelar"
            onConfirm={() => handleDeactivate(r)}
          >
            <Tooltip title="Desactivar">
              <Button size="small" danger icon={<StopOutlined />} />
            </Tooltip>
          </Popconfirm>
        )}
      </Space>
    ) },
  ];

  return (
    <>
      <Space style={{ marginBottom: 16, flexWrap: 'wrap' }}>
        <Input
          allowClear placeholder="Buscar por nombre, email o responsable"
          prefix={<SearchOutlined />} style={{ width: 320 }}
          value={search} onChange={(e) => setSearch(e.target.value)}
        />
        <Space>
          <Switch checked={onlyActive} onChange={setOnlyActive} />
          <span>Solo activas</span>
        </Space>
        <Button icon={<ReloadOutlined />} onClick={fetchData}>Refrescar</Button>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
          Nueva sociedad
        </Button>
      </Space>

      <Table
        rowKey="id" size="middle" loading={loading} columns={columns}
        dataSource={filtered} scroll={{ x: 900 }}
        pagination={{ pageSize: 10, showSizeChanger: true, showTotal: (t) => `${t} sociedades` }}
      />

      <Modal
        title={editing ? 'Editar sociedad' : 'Nueva sociedad'}
        open={modalOpen} onOk={handleSave} confirmLoading={saving}
        onCancel={() => setModalOpen(false)} okText={editing ? 'Guardar' : 'Registrar'}
        cancelText="Cancelar" destroyOnClose
      >
        <Form form={form} layout="vertical" requiredMark>
          <Form.Item name="nombre" label="Nombre de la sociedad"
            rules={[{ required: true, message: 'Ingresa el nombre' }, { max: 250 }]}>
            <Input placeholder="Inversiones Ejemplo, S.A." />
          </Form.Item>
          <Form.Item name="emailContacto" label="Email de contacto"
            rules={[{ required: true, message: 'Ingresa el email' }, { type: 'email', message: 'Email inválido' }]}>
            <Input placeholder="contacto@empresa.com" />
          </Form.Item>
          <Form.Item name="contactoAdicional" label="Contacto adicional (opcional)"
            rules={[{ max: 250 }]}>
            <Input placeholder="Juan Pérez - 5555-5555" />
          </Form.Item>
          <Form.Item name="mesAsamblea" label="Período de asamblea"
            rules={[{ required: true, message: 'Selecciona el período' }]}>
            <Select
              options={PERIODOS_ASAMBLEA.map((p) => ({ value: p.mes, label: p.label }))}
            />
          </Form.Item>
          {editing && (
            <Form.Item name="responsableId" label="Responsable"
              tooltip="Define el ruteo de los correos de recordatorio.">
              <Select
                showSearch optionFilterProp="label" placeholder="Reasignar responsable"
                options={userOptions}
              />
            </Form.Item>
          )}
        </Form>
      </Modal>
    </>
  );
};

export default SociedadesTab;
