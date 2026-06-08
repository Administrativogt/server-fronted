import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Table, Button, Space, Tag, Modal, Form, Select, InputNumber, Segmented,
  Switch, Popconfirm, message, Tooltip, Badge, Radio, Alert,
} from 'antd';
import {
  PlusOutlined, ReloadOutlined, CheckCircleOutlined, ClockCircleOutlined,
  MailOutlined, BellOutlined, ThunderboltOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import {
  getAsambleas, getAsambleasPendientes, getAsambleasHistorial,
  createAsamblea, updateAsamblea, completarAsamblea, getSociedades,
  dispararPreAlerta, dispararFinal,
} from '../../../api/asambleas';
import {
  type Asamblea, type Sociedad, EstadoAsamblea,
  PERIODOS_ASAMBLEA, getPeriodoLabel,
} from '../../../types/asambleas.types';

type Vista = 'pendientes' | 'todas' | 'historial';

const currentYear = dayjs().year();
const YEARS = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);

const AsambleasTab: React.FC = () => {
  const [vista, setVista] = useState<Vista>('pendientes');
  const [rows, setRows] = useState<Asamblea[]>([]);
  const [loading, setLoading] = useState(false);
  const [sociedades, setSociedades] = useState<Sociedad[]>([]);

  // filtros
  const [fEstado, setFEstado] = useState<EstadoAsamblea | undefined>();
  const [fPeriodo, setFPeriodo] = useState<number | undefined>();
  const [fAnio, setFAnio] = useState<number | undefined>(currentYear);
  const [fSociedad, setFSociedad] = useState<number | undefined>();

  // crear
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm();

  // disparos manuales
  const [disparoOpen, setDisparoOpen] = useState(false);
  const [disparoLoading, setDisparoLoading] = useState(false);
  const [disparoForm] = Form.useForm();

  const loadSociedades = useCallback(async () => {
    try {
      setSociedades(await getSociedades(true));
    } catch { /* no bloquea la vista */ }
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      let data: Asamblea[];
      if (vista === 'pendientes') {
        data = await getAsambleasPendientes(fAnio);
      } else if (vista === 'historial') {
        data = await getAsambleasHistorial(fSociedad);
      } else {
        data = await getAsambleas({
          estado: fEstado, periodo: fPeriodo, anio: fAnio, sociedadId: fSociedad,
        });
      }
      setRows(data);
    } catch {
      message.error('No se pudieron cargar las asambleas');
    } finally {
      setLoading(false);
    }
  }, [vista, fEstado, fPeriodo, fAnio, fSociedad]);

  useEffect(() => { loadSociedades(); }, [loadSociedades]);
  useEffect(() => { fetchData(); }, [fetchData]);

  const openCreate = () => {
    form.resetFields();
    form.setFieldsValue({ anio: currentYear });
    setModalOpen(true);
  };

  const handleCreate = async () => {
    const values = await form.validateFields();
    setSaving(true);
    try {
      await createAsamblea(values);
      message.success('Asamblea creada');
      setModalOpen(false);
      fetchData();
    } catch (e: any) {
      if (e?.errorFields) return;
      message.error(e?.response?.data?.message ?? 'No se pudo crear la asamblea');
    } finally {
      setSaving(false);
    }
  };

  const handleCompletar = async (r: Asamblea) => {
    try {
      await completarAsamblea(r.id);
      message.success('Asamblea marcada como completada');
      fetchData();
    } catch (e: any) {
      message.error(e?.response?.data?.message ?? 'No se pudo completar');
    }
  };

  const handleToggleEnvio = async (r: Asamblea, value: boolean) => {
    try {
      await updateAsamblea(r.id, { marcadaParaEnvio: value });
      setRows((prev) => prev.map((x) => (x.id === r.id ? { ...x, marcadaParaEnvio: value } : x)));
    } catch (e: any) {
      message.error(e?.response?.data?.message ?? 'No se pudo actualizar');
    }
  };

  const openDisparo = () => {
    disparoForm.resetFields();
    disparoForm.setFieldsValue({ tipo: 'pre-alerta', mes: fPeriodo ?? 1, anio: fAnio ?? currentYear });
    setDisparoOpen(true);
  };

  const handleDisparo = async () => {
    const { tipo, mes, anio } = await disparoForm.validateFields();
    setDisparoLoading(true);
    try {
      if (tipo === 'pre-alerta') {
        const res = await dispararPreAlerta(mes, anio);
        message.success(`Aviso previo procesado: ${res.batches} lote(s) de correos enviado(s)`);
      } else {
        const res = await dispararFinal(mes, anio);
        message.success(`Recordatorio final procesado: ${res.sent} correo(s) enviado(s)`);
      }
      setDisparoOpen(false);
      fetchData();
    } catch (e: any) {
      if (e?.errorFields) return;
      message.error(e?.response?.data?.message ?? 'No se pudo ejecutar el disparo');
    } finally {
      setDisparoLoading(false);
    }
  };

  const flag = (on: boolean, label: string) =>
    on ? <Badge status="success" text={label} /> : <Badge status="default" text="No" />;

  const columns: ColumnsType<Asamblea> = [
    { title: 'Sociedad', render: (_, r) => r.sociedad?.nombre ?? <span style={{ opacity: 0.5 }}>—</span>,
      ellipsis: true },
    { title: 'Período', dataIndex: 'periodo', width: 110,
      render: (m: number) => <Tag color="blue">{getPeriodoLabel(m)}</Tag> },
    { title: 'Año', dataIndex: 'anio', width: 90 },
    { title: 'Estado', dataIndex: 'estado', width: 130,
      render: (e: EstadoAsamblea) => e === EstadoAsamblea.COMPLETADA
        ? <Tag icon={<CheckCircleOutlined />} color="green">Completada</Tag>
        : <Tag icon={<ClockCircleOutlined />} color="gold">Pendiente</Tag> },
    { title: <Tooltip title="Autoriza el recordatorio final"><span><MailOutlined /> Marcada</span></Tooltip>,
      width: 110, align: 'center', render: (_, r) => (
        <Switch
          size="small" checked={r.marcadaParaEnvio}
          disabled={r.estado === EstadoAsamblea.COMPLETADA}
          onChange={(v) => handleToggleEnvio(r, v)}
        />
      ) },
    { title: 'Pre-alerta', dataIndex: 'preAlertaEnviada', width: 120,
      render: (v: boolean) => flag(v, 'Enviada') },
    { title: <span><BellOutlined /> Recordatorio</span>, dataIndex: 'recordatorioEnviado', width: 130,
      render: (v: boolean) => flag(v, 'Enviado') },
    { title: 'Acciones', width: 150, fixed: 'right', render: (_, r) =>
        r.estado === EstadoAsamblea.PENDIENTE ? (
          <Popconfirm
            title="Completar asamblea"
            description="Se marcará como realizada y dejará de recibir recordatorios."
            okText="Completar" cancelText="Cancelar" onConfirm={() => handleCompletar(r)}
          >
            <Button size="small" type="primary" ghost icon={<CheckCircleOutlined />}>
              Completar
            </Button>
          </Popconfirm>
        ) : <span style={{ opacity: 0.5 }}>—</span> },
  ];

  const sociedadOptions = useMemo(
    () => sociedades.map((s) => ({ value: s.id, label: s.nombre })),
    [sociedades],
  );

  return (
    <>
      <Space style={{ marginBottom: 16, flexWrap: 'wrap', rowGap: 8 }}>
        <Segmented
          value={vista}
          onChange={(v) => setVista(v as Vista)}
          options={[
            { label: 'Pendientes', value: 'pendientes' },
            { label: 'Todas', value: 'todas' },
            { label: 'Historial', value: 'historial' },
          ]}
        />

        {vista !== 'historial' && (
          <Select
            placeholder="Año" allowClear style={{ width: 110 }}
            value={fAnio} onChange={setFAnio}
            options={YEARS.map((y) => ({ value: y, label: String(y) }))}
          />
        )}

        {vista === 'todas' && (
          <>
            <Select
              placeholder="Período" allowClear style={{ width: 130 }}
              value={fPeriodo} onChange={setFPeriodo}
              options={PERIODOS_ASAMBLEA.map((p) => ({ value: p.mes, label: p.label }))}
            />
            <Select
              placeholder="Estado" allowClear style={{ width: 140 }}
              value={fEstado} onChange={setFEstado}
              options={[
                { value: EstadoAsamblea.PENDIENTE, label: 'Pendiente' },
                { value: EstadoAsamblea.COMPLETADA, label: 'Completada' },
              ]}
            />
          </>
        )}

        {(vista === 'todas' || vista === 'historial') && (
          <Select
            placeholder="Sociedad" allowClear showSearch optionFilterProp="label"
            style={{ width: 240 }} value={fSociedad} onChange={setFSociedad}
            options={sociedadOptions}
          />
        )}

        <Button icon={<ReloadOutlined />} onClick={fetchData}>Refrescar</Button>
        <Button icon={<ThunderboltOutlined />} onClick={openDisparo}>
          Disparos manuales
        </Button>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
          Nueva asamblea
        </Button>
      </Space>

      <Table
        rowKey="id" size="middle" loading={loading} columns={columns}
        dataSource={rows} scroll={{ x: 1000 }}
        pagination={{ pageSize: 12, showSizeChanger: true, showTotal: (t) => `${t} asambleas` }}
      />

      <Modal
        title="Nueva asamblea" open={modalOpen} onOk={handleCreate} confirmLoading={saving}
        onCancel={() => setModalOpen(false)} okText="Crear" cancelText="Cancelar" destroyOnClose
      >
        <Form form={form} layout="vertical" requiredMark>
          <Form.Item name="sociedadId" label="Sociedad"
            rules={[{ required: true, message: 'Selecciona la sociedad' }]}>
            <Select
              showSearch optionFilterProp="label" placeholder="Selecciona una sociedad"
              options={sociedadOptions}
            />
          </Form.Item>
          <Form.Item name="periodo" label="Período (opcional)"
            tooltip="Si se omite, se usa el período asignado a la sociedad.">
            <Select
              allowClear placeholder="Usar el de la sociedad"
              options={PERIODOS_ASAMBLEA.map((p) => ({ value: p.mes, label: p.label }))}
            />
          </Form.Item>
          <Form.Item name="anio" label="Año">
            <InputNumber min={currentYear - 1} max={currentYear + 2} style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={<span><ThunderboltOutlined /> Disparos manuales de recordatorios</span>}
        open={disparoOpen} onOk={handleDisparo} confirmLoading={disparoLoading}
        onCancel={() => setDisparoOpen(false)} okText="Disparar" cancelText="Cancelar"
        okButtonProps={{ danger: true }} destroyOnClose
      >
        <Alert
          type="warning" showIcon style={{ marginBottom: 16 }}
          message="Esta acción envía correos reales a los responsables/destinatarios."
          description="El aviso previo notifica las asambleas del período; el recordatorio final solo se envía a las marcadas para envío."
        />
        <Form form={disparoForm} layout="vertical" requiredMark>
          <Form.Item name="tipo" label="Tipo de disparo" rules={[{ required: true }]}>
            <Radio.Group>
              <Radio.Button value="pre-alerta">Aviso previo</Radio.Button>
              <Radio.Button value="final">Recordatorio final</Radio.Button>
            </Radio.Group>
          </Form.Item>
          <Form.Item name="mes" label="Período" rules={[{ required: true, message: 'Selecciona el período' }]}>
            <Select options={PERIODOS_ASAMBLEA.map((p) => ({ value: p.mes, label: p.label }))} />
          </Form.Item>
          <Form.Item name="anio" label="Año">
            <InputNumber min={currentYear - 1} max={currentYear + 2} style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
};

export default AsambleasTab;
