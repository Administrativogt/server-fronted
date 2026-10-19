import { useEffect, useMemo, useState } from 'react';
import {
  AutoComplete,
  Button,
  Card,
  Form,
  Input,
  InputNumber,
  message,
  Modal,
  Popconfirm,
  Select,
  Space,
  Switch,
  Table,
  Tabs,
  Tag,
  Tooltip,
  Typography,
} from 'antd';
import {
  DownloadOutlined,
  EditOutlined,
  PlusOutlined,
  ReloadOutlined,
  RollbackOutlined,
  StopOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import {
  createNotaGasto,
  deactivateNotaGasto,
  listNotasGastos,
  NOTA_GASTO_AREAS,
  updateNotaGasto,
  type NotaGasto,
  type NotaGastoArea,
  type NotaGastoPayload,
  type NotaGastoUser,
} from '../../api/notasGastos';

const { Title, Text } = Typography;

type AreaTab = NotaGastoArea | 'TODAS';
type ModalState = { mode: 'create' } | { mode: 'edit'; nota: NotaGasto } | null;

const areaLabel = (a: NotaGastoArea) => NOTA_GASTO_AREAS.find((x) => x.value === a)?.label ?? a;
const areaColor: Record<NotaGastoArea, string> = {
  MIGRACION: 'blue',
  PENAL: 'volcano',
  LABORAL: 'green',
};
const userName = (u: NotaGastoUser | null) =>
  u ? `${u.first_name ?? ''} ${u.last_name ?? ''}`.trim() || u.username : '—';

const apiError = (err: unknown, fallback: string) =>
  (err as { response?: { data?: { message?: string } } })?.response?.data?.message || fallback;

const normalize = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase();

// Catálogo de NT por caso para cargar gastos e impresiones. Reemplaza el Excel
// "NOTAS GASTOS E IMPRESIONES" que llevaban a mano por área.
function NotasGastos() {
  const [notas, setNotas] = useState<NotaGasto[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState<AreaTab>('TODAS');
  const [search, setSearch] = useState('');
  const [cliente, setCliente] = useState<string | undefined>();
  const [showInactive, setShowInactive] = useState(false);
  const [modal, setModal] = useState<ModalState>(null);
  const [form] = Form.useForm<NotaGastoPayload>();

  const load = async (inactive = showInactive) => {
    setLoading(true);
    try {
      setNotas(await listNotasGastos(inactive));
    } catch (err) {
      message.error(apiError(err, 'No se pudieron cargar las notas'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(showInactive);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showInactive]);

  const byArea = useMemo(
    () => (tab === 'TODAS' ? notas : notas.filter((n) => n.area === tab)),
    [notas, tab],
  );

  const clienteOptions = useMemo(
    () =>
      [...new Set(byArea.map((n) => n.cliente))]
        .sort((a, b) => a.localeCompare(b))
        .map((c) => ({ value: c, label: c })),
    [byArea],
  );

  const filtered = useMemo(() => {
    const q = normalize(search.trim());
    return byArea.filter((n) => {
      if (cliente && n.cliente !== cliente) return false;
      if (!q) return true;
      return normalize(`${n.cliente} ${n.caso ?? ''} ${n.nombre} ${n.nt ?? ''}`).includes(q);
    });
  }, [byArea, search, cliente]);

  const allClientes = useMemo(
    () => [...new Set(notas.map((n) => n.cliente))].sort((a, b) => a.localeCompare(b)).map((c) => ({ value: c })),
    [notas],
  );

  const countFor = (a: AreaTab) =>
    a === 'TODAS' ? notas.length : notas.filter((n) => n.area === a).length;
  const sinNt = filtered.filter((n) => n.nt == null && n.activo).length;

  const openModal = (state: ModalState) => {
    setModal(state);
    if (state?.mode === 'edit') {
      const { area, cliente: c, caso, nombre, nt, observaciones } = state.nota;
      form.setFieldsValue({ area, cliente: c, caso, nombre, nt, observaciones });
    } else {
      form.setFieldsValue({
        area: tab === 'TODAS' ? undefined : tab,
        cliente: cliente,
        caso: null,
        nombre: '',
        nt: null,
        observaciones: '',
      });
    }
  };

  const handleSave = async () => {
    const values = await form.validateFields();
    const payload: NotaGastoPayload = {
      ...values,
      cliente: values.cliente.replace(/\s+/g, ' ').trim().toUpperCase(),
      caso: values.caso?.trim() || null,
      nt: values.nt ?? null,
      observaciones: values.observaciones ?? '',
    };
    setSaving(true);
    try {
      if (modal?.mode === 'edit') {
        await updateNotaGasto(modal.nota.id, payload);
        message.success('Nota actualizada');
      } else {
        await createNotaGasto(payload);
        message.success('Nota registrada');
      }
      setModal(null);
      load();
    } catch (err) {
      message.error(apiError(err, 'No se pudo guardar la nota'));
    } finally {
      setSaving(false);
    }
  };

  const handleDeactivate = async (n: NotaGasto) => {
    try {
      await deactivateNotaGasto(n.id);
      message.success(`NT ${n.nt ?? ''} dada de baja`);
      load();
    } catch (err) {
      message.error(apiError(err, 'No se pudo dar de baja la nota'));
    }
  };

  const handleReactivate = async (n: NotaGasto) => {
    try {
      await updateNotaGasto(n.id, { activo: true });
      message.success(`NT ${n.nt ?? ''} reactivada`);
      load();
    } catch (err) {
      message.error(apiError(err, 'No se pudo reactivar la nota'));
    }
  };

  // Mismo formato que el Excel original: una hoja por área.
  const exportExcel = async () => {
    const wb = new ExcelJS.Workbook();
    const areas = tab === 'TODAS' ? NOTA_GASTO_AREAS.map((a) => a.value) : [tab];
    for (const area of areas) {
      const ws = wb.addWorksheet(areaLabel(area).toUpperCase());
      ws.columns = [
        { header: 'CLIENTE', key: 'cliente', width: 34 },
        ...(area === 'MIGRACION' ? [{ header: 'CASO', key: 'caso', width: 12 }] : []),
        { header: 'NOMBRE', key: 'nombre', width: 70 },
        { header: 'NT', key: 'nt', width: 12 },
        { header: 'OBSERVACIONES', key: 'observaciones', width: 30 },
        ...(showInactive ? [{ header: 'ESTADO', key: 'estado', width: 12 }] : []),
      ];
      ws.getRow(1).font = { bold: true };
      ws.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDFC9ED' } };
      filtered
        .filter((n) => n.area === area)
        .forEach((n) =>
          ws.addRow({
            ...n,
            caso: n.caso ?? '',
            nt: n.nt ?? '',
            estado: n.activo ? 'Activa' : 'De baja',
          }),
        );
      ws.views = [{ state: 'frozen', ySplit: 1 }];
    }
    const buffer = await wb.xlsx.writeBuffer();
    saveAs(
      new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
      `notas-gastos-impresiones-${dayjs().format('YYYY-MM-DD')}.xlsx`,
    );
  };

  return (
    <div style={{ padding: 24 }}>
      <Space style={{ width: '100%', justifyContent: 'space-between', marginBottom: 16 }} wrap>
        <div>
          <Title level={3} style={{ margin: 0 }}>
            Notas de gastos e impresiones
          </Title>
          <Text type="secondary">A qué NT se cargan los gastos e impresiones de cada caso.</Text>
        </div>
        <Space wrap>
          <Button icon={<ReloadOutlined />} onClick={() => load()} loading={loading}>
            Actualizar
          </Button>
          <Button icon={<DownloadOutlined />} onClick={exportExcel} disabled={!filtered.length}>
            Descargar Excel
          </Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => openModal({ mode: 'create' })}>
            Nueva nota
          </Button>
        </Space>
      </Space>

      <Card size="small">
        <Tabs
          activeKey={tab}
          onChange={(k) => {
            setTab(k as AreaTab);
            setCliente(undefined);
          }}
          items={[
            { key: 'TODAS', label: `Todas (${countFor('TODAS')})` },
            ...NOTA_GASTO_AREAS.map((a) => ({
              key: a.value,
              label: `${a.label} (${countFor(a.value)})`,
            })),
          ]}
        />
        <Space wrap style={{ marginBottom: 12 }}>
          <Input.Search
            allowClear
            placeholder="Buscar por cliente, caso, nombre o NT"
            style={{ width: 320 }}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Select
            allowClear
            showSearch
            placeholder="Cliente"
            style={{ width: 260 }}
            value={cliente}
            onChange={setCliente}
            options={clienteOptions}
          />
          <Space>
            <Switch checked={showInactive} onChange={setShowInactive} size="small" />
            <Text>Mostrar dadas de baja</Text>
          </Space>
          {sinNt > 0 && <Tag color="warning">{sinNt} sin NT asignado</Tag>}
        </Space>

        <Table<NotaGasto>
          rowKey="id"
          size="middle"
          loading={loading}
          dataSource={filtered}
          pagination={{ pageSize: 50, hideOnSinglePage: true, showTotal: (t) => `${t} notas` }}
          rowClassName={(n) => (n.activo ? '' : 'ant-table-row-disabled')}
          scroll={{ x: 900 }}
          columns={[
            ...(tab === 'TODAS'
              ? [
                  {
                    title: 'Área',
                    dataIndex: 'area',
                    width: 110,
                    render: (a: NotaGastoArea) => <Tag color={areaColor[a]}>{areaLabel(a)}</Tag>,
                  },
                ]
              : []),
            {
              title: 'Cliente',
              dataIndex: 'cliente',
              width: 220,
              sorter: (a, b) => a.cliente.localeCompare(b.cliente),
            },
            ...(tab === 'TODAS' || tab === 'MIGRACION'
              ? [{ title: 'Caso', dataIndex: 'caso', width: 100, render: (v: string | null) => v ?? '—' }]
              : []),
            {
              title: 'Nombre',
              dataIndex: 'nombre',
              sorter: (a, b) => a.nombre.localeCompare(b.nombre),
              render: (v: string, n) => (
                <Space direction="vertical" size={0}>
                  <span style={n.activo ? undefined : { textDecoration: 'line-through', opacity: 0.6 }}>
                    {v}
                  </span>
                  {n.observaciones && (
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      {n.observaciones}
                    </Text>
                  )}
                </Space>
              ),
            },
            {
              title: 'NT',
              dataIndex: 'nt',
              width: 120,
              sorter: (a, b) => (a.nt ?? 0) - (b.nt ?? 0),
              render: (v: number | null) =>
                v == null ? (
                  <Tag color="warning">Sin NT</Tag>
                ) : (
                  <Text strong copyable={{ text: String(v), tooltips: ['Copiar NT', 'Copiado'] }}>
                    {v}
                  </Text>
                ),
            },
            {
              title: 'Creado por',
              key: 'creator',
              width: 170,
              render: (_, n) =>
                n.creator ? (
                  <Tooltip title={`${dayjs(n.created_at).format('DD/MM/YYYY HH:mm')}${n.updated_by && n.updated_by.id !== n.creator.id ? ` · última edición: ${userName(n.updated_by)}` : ''}`}>
                    {userName(n.creator)}
                  </Tooltip>
                ) : (
                  <Tooltip title="Migrado del Excel">
                    <Text type="secondary">Excel</Text>
                  </Tooltip>
                ),
            },
            {
              title: '',
              key: 'actions',
              align: 'right',
              width: 100,
              render: (_, n) => (
                <Space>
                  <Tooltip title="Editar">
                    <Button icon={<EditOutlined />} size="small" onClick={() => openModal({ mode: 'edit', nota: n })} />
                  </Tooltip>
                  {n.activo ? (
                    <Popconfirm
                      title={`¿Dar de baja la NT ${n.nt ?? ''}?`}
                      description="Deja de aparecer en la lista; se puede reactivar."
                      okText="Dar de baja"
                      okButtonProps={{ danger: true }}
                      cancelText="Cancelar"
                      onConfirm={() => handleDeactivate(n)}
                    >
                      <Tooltip title="Dar de baja">
                        <Button icon={<StopOutlined />} size="small" danger />
                      </Tooltip>
                    </Popconfirm>
                  ) : (
                    <Tooltip title="Reactivar">
                      <Button icon={<RollbackOutlined />} size="small" onClick={() => handleReactivate(n)} />
                    </Tooltip>
                  )}
                </Space>
              ),
            },
          ]}
        />
      </Card>

      <Modal
        open={modal !== null}
        title={modal?.mode === 'edit' ? 'Editar nota' : 'Nueva nota'}
        okText="Guardar"
        cancelText="Cancelar"
        confirmLoading={saving}
        onOk={handleSave}
        onCancel={() => setModal(null)}
        destroyOnClose
      >
        <Form form={form} layout="vertical" preserve={false}>
          <Form.Item name="area" label="Área" rules={[{ required: true, message: 'Seleccione el área' }]}>
            <Select options={NOTA_GASTO_AREAS} placeholder="Área" />
          </Form.Item>
          <Form.Item
            name="cliente"
            label="Cliente"
            rules={[{ required: true, whitespace: true, message: 'Ingrese el cliente' }]}
          >
            <AutoComplete
              allowClear
              placeholder="Escriba o elija un cliente existente"
              options={allClientes}
              filterOption={(input, opt) => normalize(String(opt?.value ?? '')).includes(normalize(input))}
            />
          </Form.Item>
          <Form.Item name="caso" label="Caso" extra="Número de caso (opcional, lo usa Migración).">
            <Input maxLength={50} />
          </Form.Item>
          <Form.Item
            name="nombre"
            label="Nombre"
            rules={[{ required: true, whitespace: true, message: 'Ingrese el nombre del caso' }]}
          >
            <Input.TextArea autoSize={{ minRows: 1, maxRows: 4 }} placeholder="p. ej. RESIDENCIA TEMPORAL JUAN PÉREZ" />
          </Form.Item>
          <Form.Item name="nt" label="NT" extra="Número de nota de trabajo. Déjelo vacío si aún no lo tiene.">
            <InputNumber min={1} precision={0} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="observaciones" label="Observaciones">
            <Input.TextArea autoSize={{ minRows: 1, maxRows: 4 }} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

export default NotasGastos;
