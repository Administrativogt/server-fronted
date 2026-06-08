import React, { useCallback, useEffect, useState } from 'react';
import {
  Table, Button, Space, Tag, Modal, Form, Input, Select, Switch, InputNumber,
  Popconfirm, message, Tooltip, Alert,
} from 'antd';
import {
  PlusOutlined, EditOutlined, ReloadOutlined, StopOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import {
  getReglas, createRegla, updateRegla, deleteRegla,
} from '../../../api/asambleas';
import { type ReglaNotificacion, TipoMatchRegla } from '../../../types/asambleas.types';

const emailsToTags = (s: string) =>
  s.split(',').map((e) => e.trim()).filter(Boolean);

const ReglasNotificacionTab: React.FC = () => {
  const [rows, setRows] = useState<ReglaNotificacion[]>([]);
  const [loading, setLoading] = useState(false);
  const [onlyActive, setOnlyActive] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ReglaNotificacion | null>(null);
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm();
  const usarEmailResponsable = Form.useWatch('usarEmailResponsable', form);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      setRows(await getReglas(onlyActive));
    } catch {
      message.error('No se pudieron cargar las reglas');
    } finally {
      setLoading(false);
    }
  }, [onlyActive]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const openCreate = () => {
    setEditing(null);
    form.resetFields();
    form.setFieldsValue({
      matchTipo: TipoMatchRegla.NOMBRE, usarEmailResponsable: false, prioridad: 100,
    });
    setModalOpen(true);
  };

  const openEdit = (r: ReglaNotificacion) => {
    setEditing(r);
    form.setFieldsValue({
      descripcion: r.descripcion,
      matchTipo: r.matchTipo,
      matchValor: r.matchValor,
      usarEmailResponsable: r.usarEmailResponsable,
      destinatarios: r.destinatarios,
      copias: r.copias,
      prioridad: r.prioridad,
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    const values = await form.validateFields();
    setSaving(true);
    try {
      if (editing) {
        await updateRegla(editing.id, values);
        message.success('Regla actualizada');
      } else {
        await createRegla(values);
        message.success('Regla creada');
      }
      setModalOpen(false);
      fetchData();
    } catch (e: any) {
      if (e?.errorFields) return;
      message.error(e?.response?.data?.message ?? 'No se pudo guardar la regla');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleState = async (r: ReglaNotificacion) => {
    try {
      if (r.state === 1) {
        await deleteRegla(r.id);
        message.success('Regla desactivada');
      } else {
        await updateRegla(r.id, { state: 1 });
        message.success('Regla activada');
      }
      fetchData();
    } catch (e: any) {
      message.error(e?.response?.data?.message ?? 'No se pudo actualizar');
    }
  };

  const columns: ColumnsType<ReglaNotificacion> = [
    { title: 'Prioridad', dataIndex: 'prioridad', width: 100, align: 'center',
      sorter: (a, b) => a.prioridad - b.prioridad, defaultSortOrder: 'ascend',
      render: (p: number) => <Tag>{p}</Tag> },
    { title: 'Descripción', dataIndex: 'descripcion', ellipsis: true },
    { title: 'Coincide por', dataIndex: 'matchTipo', width: 130,
      render: (t: TipoMatchRegla) => (
        <Tag color={t === TipoMatchRegla.USER ? 'purple' : 'geekblue'}>
          {t === TipoMatchRegla.USER ? 'Usuario' : 'Nombre'}
        </Tag>
      ) },
    { title: 'Valor', dataIndex: 'matchValor', width: 140 },
    { title: 'Destino (to)', render: (_, r) =>
        r.usarEmailResponsable
          ? <Tag color="cyan">Email del responsable</Tag>
          : (emailsToTags(r.destinatarios).length
              ? <Space size={[0, 4]} wrap>{emailsToTags(r.destinatarios).map((e) => <Tag key={e}>{e}</Tag>)}</Space>
              : <span style={{ opacity: 0.5 }}>—</span>) },
    { title: 'Copia (cc)', render: (_, r) =>
        emailsToTags(r.copias).length
          ? <Space size={[0, 4]} wrap>{emailsToTags(r.copias).map((e) => <Tag key={e} color="default">{e}</Tag>)}</Space>
          : <span style={{ opacity: 0.5 }}>—</span> },
    { title: 'Estado', dataIndex: 'state', width: 100,
      render: (s: number) => s === 1 ? <Tag color="green">Activa</Tag> : <Tag color="red">Inactiva</Tag> },
    { title: 'Acciones', width: 130, fixed: 'right', render: (_, r) => (
      <Space>
        <Tooltip title="Editar">
          <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(r)} />
        </Tooltip>
        <Popconfirm
          title={r.state === 1 ? 'Desactivar regla' : 'Activar regla'}
          okText={r.state === 1 ? 'Desactivar' : 'Activar'}
          okButtonProps={{ danger: r.state === 1 }} cancelText="Cancelar"
          onConfirm={() => handleToggleState(r)}
        >
          <Tooltip title={r.state === 1 ? 'Desactivar' : 'Activar'}>
            <Button size="small" danger={r.state === 1} icon={<StopOutlined />} />
          </Tooltip>
        </Popconfirm>
      </Space>
    ) },
  ];

  return (
    <>
      <Alert
        type="info" showIcon style={{ marginBottom: 16 }}
        message="Las reglas definen a quién se envían los recordatorios de cada asamblea."
        description="Gana la primera regla activa que coincida (menor prioridad primero). Si ninguna coincide, se usa el email del responsable de la sociedad."
      />

      <Space style={{ marginBottom: 16, flexWrap: 'wrap' }}>
        <Space>
          <Switch checked={onlyActive} onChange={setOnlyActive} />
          <span>Solo activas</span>
        </Space>
        <Button icon={<ReloadOutlined />} onClick={fetchData}>Refrescar</Button>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>Nueva regla</Button>
      </Space>

      <Table
        rowKey="id" size="middle" loading={loading} columns={columns}
        dataSource={rows} scroll={{ x: 1100 }}
        pagination={{ pageSize: 10, showTotal: (t) => `${t} reglas` }}
      />

      <Modal
        title={editing ? 'Editar regla' : 'Nueva regla'} open={modalOpen}
        onOk={handleSave} confirmLoading={saving} onCancel={() => setModalOpen(false)}
        okText={editing ? 'Guardar' : 'Crear'} cancelText="Cancelar" destroyOnClose width={560}
      >
        <Form form={form} layout="vertical" requiredMark>
          <Form.Item name="descripcion" label="Descripción"
            rules={[{ required: true, message: 'Describe la regla' }, { max: 250 }]}>
            <Input placeholder="Sociedades de Ludwing → CC Camila" />
          </Form.Item>
          <Space.Compact block>
            <Form.Item name="matchTipo" label="Coincide por" style={{ width: '40%' }}
              rules={[{ required: true }]}>
              <Select options={[
                { value: TipoMatchRegla.NOMBRE, label: 'Nombre del responsable' },
                { value: TipoMatchRegla.USER, label: 'ID de usuario' },
              ]} />
            </Form.Item>
            <Form.Item name="matchValor" label="Valor a comparar" style={{ width: '60%' }}
              rules={[{ required: true, message: 'Ingresa el valor' }, { max: 150 }]}>
              <Input placeholder="ludwing  /  12" />
            </Form.Item>
          </Space.Compact>

          <Form.Item name="usarEmailResponsable" label="Enviar al email del responsable"
            valuePropName="checked"
            tooltip="Si está activo, el destinatario (to) será el correo del responsable de la sociedad.">
            <Switch />
          </Form.Item>

          <Form.Item name="destinatarios" label="Destinatarios (to) — separados por coma"
            hidden={usarEmailResponsable} rules={[{ max: 500 }]}>
            <Input.TextArea rows={2} placeholder="dgodoy@consortiumlegal.com, otro@consortiumlegal.com" />
          </Form.Item>

          <Form.Item name="copias" label="Copias (cc) — separados por coma" rules={[{ max: 500 }]}>
            <Input.TextArea rows={2} placeholder="cmazariegos@consortiumlegal.com" />
          </Form.Item>

          <Form.Item name="prioridad" label="Prioridad (menor = se evalúa primero)">
            <InputNumber min={1} max={9999} style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
};

export default ReglasNotificacionTab;
