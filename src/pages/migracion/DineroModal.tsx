import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  AutoComplete,
  Checkbox,
  Col,
  DatePicker,
  Descriptions,
  Form,
  Input,
  InputNumber,
  Modal,
  Row,
  Select,
  Space,
  Spin,
  Tag,
  Typography,
  message,
} from 'antd';
import dayjs, { type Dayjs } from 'dayjs';
import {
  createDinero,
  createDineroVarias,
  estatusInfo,
  getCatalogoCasos,
  getCatalogoClientes,
  getCatalogoNt,
  updateDinero,
  type CatalogoCaso,
  type CatalogoCliente,
  type CatalogoNt,
  type DineroInput,
  type DineroItem,
  type DineroOpciones,
} from '../../api/migracionDinero';

const { Text } = Typography;

interface FormValues {
  nt?: number;
  fecha_solicitud?: Dayjs;
  fecha_uso?: Dayjs | null;
  solicitado_por_id?: number | null;
  concepto?: string;
  cantidad?: number | null;
  monto?: number;
  beneficiario?: string;
  fecha_entrega?: Dayjs | null;
  estatus_liquidacion?: string;
  notas?: string;
  numero_cheque?: string;
}

interface Props {
  open: boolean;
  /** null = nueva solicitud */
  item: DineroItem | null;
  opciones: DineroOpciones | null;
  /**
   * jefe = todos los campos; propia = la suya, sin datos de cobros (se registra
   * a su nombre); lectura = solo ver.
   */
  modo?: 'jefe' | 'propia' | 'lectura';
  onClose: () => void;
  onSaved: (item: DineroItem) => void;
}

const d = (v?: string | null) => (v ? dayjs(v) : null);
const s = (v?: Dayjs | null) => (v ? v.format('YYYY-MM-DD') : null);
const q = (v: number) => `Q${v.toLocaleString('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const casoKey = (c: CatalogoCaso) => c.caso_numero ?? `nt:${c.nts[0]?.nt}`;
const casoLabel = (c: CatalogoCaso) =>
  `${c.caso_numero ? `#${c.caso_numero} · ` : ''}${c.caso || 'Caso sin nombre'} (${c.nts.length} NT)`;

/**
 * Alta / edición de una solicitud de dinero. Alta: cliente → caso → una o
 * varias NT del caso (una solicitud por NT, cada una con su monto). Solo notas
 * de Migración activas.
 */
export default function DineroModal({ open, item, opciones, modo = 'jefe', onClose, onSaved }: Props) {
  const jefe = modo === 'jefe';
  const lectura = modo === 'lectura';
  const [form] = Form.useForm<FormValues>();
  const [saving, setSaving] = useState(false);
  const editando = !!item;

  // ── alta: cliente → caso → NT ──
  const [clienteQ, setClienteQ] = useState('');
  const [clientes, setClientes] = useState<CatalogoCliente[]>([]);
  const [buscandoClientes, setBuscandoClientes] = useState(false);
  const [cliente, setCliente] = useState<CatalogoCliente | null>(null);
  const [casos, setCasos] = useState<CatalogoCaso[]>([]);
  const [cargandoCasos, setCargandoCasos] = useState(false);
  const [casoSel, setCasoSel] = useState<string | null>(null);
  const [ntsSel, setNtsSel] = useState<number[]>([]);
  const [montos, setMontos] = useState<Record<number, number | null>>({});
  const busquedaSeq = useRef(0);
  /** Al buscar por número de NT, la NT a dejar marcada al cargar los casos. */
  const ntBuscada = useRef<number | null>(null);

  // ── edición: NT única ──
  const [nota, setNota] = useState<CatalogoNt | null>(null);
  const [notaError, setNotaError] = useState<string | null>(null);
  const [buscandoNt, setBuscandoNt] = useState(false);

  const caso = useMemo(() => casos.find((c) => casoKey(c) === casoSel) ?? null, [casos, casoSel]);
  const varias = ntsSel.length > 1;

  useEffect(() => {
    if (!open) return;
    setNota(null);
    setNotaError(null);
    setClienteQ('');
    setClientes([]);
    setCliente(null);
    setCasos([]);
    setCasoSel(null);
    setNtsSel([]);
    setMontos({});
    ntBuscada.current = null;
    form.resetFields();
    form.setFieldsValue(
      item
        ? {
            nt: item.nt ?? undefined,
            fecha_solicitud: d(item.fecha_solicitud) ?? undefined,
            fecha_uso: d(item.fecha_uso),
            solicitado_por_id: item.solicitado_por_id,
            concepto: item.concepto,
            cantidad: item.cantidad,
            monto: item.monto ?? undefined,
            beneficiario: item.beneficiario ?? undefined,
            fecha_entrega: d(item.fecha_entrega),
            estatus_liquidacion: item.estatus_liquidacion ?? undefined,
            notas: item.notas ?? undefined,
            numero_cheque: item.numero_cheque_manual ?? undefined,
          }
        : { fecha_solicitud: dayjs(), cantidad: 1 },
    );
  }, [open, item, form]);

  // Buscar clientes (por nombre, código o número de NT)
  useEffect(() => {
    const t = clienteQ.trim();
    const seq = ++busquedaSeq.current;
    if (t.length < 2) {
      setClientes([]);
      setBuscandoClientes(false);
      return;
    }
    setBuscandoClientes(true);
    const timer = setTimeout(async () => {
      try {
        const { data } = await getCatalogoClientes(t);
        if (seq !== busquedaSeq.current) return;
        setClientes(data);
        // Escribió una NT: se elige sola su cliente, caso y NT
        if (/^\d+$/.test(t) && data.length === 1) {
          ntBuscada.current = Number(t);
          elegirCliente(data[0]);
        }
      } catch {
        if (seq === busquedaSeq.current) setClientes([]);
      } finally {
        if (seq === busquedaSeq.current) setBuscandoClientes(false);
      }
    }, 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clienteQ]);

  const elegirCliente = async (c: CatalogoCliente | null) => {
    setCliente(c);
    setCasos([]);
    setCasoSel(null);
    setNtsSel([]);
    if (!c) return;
    setCargandoCasos(true);
    try {
      const { data } = await getCatalogoCasos(c.cliente_codigo);
      setCasos(data);
      const nt = ntBuscada.current;
      ntBuscada.current = null;
      const conNt = nt ? data.find((x) => x.nts.some((n) => n.nt === nt)) : null;
      if (conNt) elegirCaso(casoKey(conNt), data, [nt!]);
      else if (data.length === 1) elegirCaso(casoKey(data[0]), data);
    } catch (e: any) {
      message.error(e?.response?.data?.message || 'No se pudieron cargar los casos');
    } finally {
      setCargandoCasos(false);
    }
  };

  const elegirCaso = (key: string | null, lista = casos, marcar?: number[]) => {
    setCasoSel(key);
    const c = lista.find((x) => casoKey(x) === key);
    setNtsSel(marcar ?? (c && c.nts.length === 1 ? [c.nts[0].nt] : []));
  };

  // Al pasar a varias NT, cada una arranca con el monto general
  useEffect(() => {
    if (!varias) return;
    const general = form.getFieldValue('monto') ?? null;
    setMontos((prev) => Object.fromEntries(ntsSel.map((nt) => [nt, prev[nt] ?? general])));
  }, [ntsSel, varias, form]);

  // Edición: validar la NT si la cambian
  const buscarNt = async (nt?: number | null) => {
    setNota(null);
    setNotaError(null);
    if (!nt || nt === item?.nt) return; // la que ya tenía, aunque hoy esté cerrada
    setBuscandoNt(true);
    try {
      const { data } = await getCatalogoNt(nt);
      setNota(data);
      if (!data.activa) setNotaError(`La NT ${nt} ya está cerrada en Sirvo.`);
      else if (!data.es_migracion)
        setNotaError(`La NT ${nt} no es nota de Migración (es de otro equipo o no tiene saldo ni gastos presupuestados).`);
    } catch (e: any) {
      setNotaError(e?.response?.data?.message || `La NT ${nt} no está en el reporte de Sirvo.`);
    } finally {
      setBuscandoNt(false);
    }
  };

  const guardar = async () => {
    if (!editando && !ntsSel.length) {
      message.error('Elige el cliente, el caso y al menos una NT');
      return;
    }
    if (varias && ntsSel.some((nt) => !montos[nt])) {
      message.error('Indica el monto de cada NT');
      return;
    }
    const v = await form.validateFields();
    if (notaError) {
      message.error(notaError);
      return;
    }
    const comun: DineroInput = {
      concepto: v.concepto?.trim(),
      fecha_solicitud: s(v.fecha_solicitud) ?? undefined,
      fecha_uso: s(v.fecha_uso),
      solicitado_por_id: v.solicitado_por_id ?? null,
      cantidad: v.cantidad ?? null,
      beneficiario: v.beneficiario?.trim() || null,
      fecha_entrega: s(v.fecha_entrega),
      estatus_liquidacion: v.estatus_liquidacion?.trim() || null,
      notas: v.notas?.trim() || null,
      numero_cheque: v.numero_cheque?.trim() || null,
    };
    setSaving(true);
    try {
      if (editando) {
        const { data } = await updateDinero(item!.id, { ...comun, nt: v.nt, monto: v.monto });
        message.success('Solicitud actualizada');
        onSaved(data);
      } else if (varias) {
        const { data } = await createDineroVarias({
          ...comun,
          lineas: ntsSel.map((nt) => ({ nt, monto: montos[nt]! })),
        });
        message.success(`${data.length} solicitudes registradas (una por NT)`);
        onSaved(data[0]);
      } else {
        const { data } = await createDinero({ ...comun, nt: ntsSel[0], monto: v.monto });
        message.success('Solicitud registrada');
        onSaved(data);
      }
    } catch (e: any) {
      message.error(e?.response?.data?.message || 'No se pudo guardar');
    } finally {
      setSaving(false);
    }
  };

  const ligado = item?.request_id != null;
  const editInfo = nota ?? (item ? { cliente_codigo: item.cliente_codigo, cliente_nombre: item.cliente_nombre, caso: item.caso_nombre } : null);

  /* ─────────── alta: cliente → caso → NT ─────────── */
  const seleccionAlta = (
    <>
      <Row gutter={12}>
        <Col xs={24} sm={12}>
          <Form.Item label="Cliente" required>
            <Select
              showSearch
              allowClear
              value={cliente?.cliente_codigo}
              placeholder="Nombre o código del cliente (o una NT)"
              filterOption={false}
              onSearch={setClienteQ}
              onChange={(code) => elegirCliente(clientes.find((c) => c.cliente_codigo === code) ?? null)}
              onClear={() => setClienteQ('')}
              notFoundContent={
                buscandoClientes ? (
                  <Spin size="small" />
                ) : clienteQ.trim().length >= 2 ? (
                  'Sin notas de Migración activas para ese cliente'
                ) : (
                  'Escribe al menos 2 letras'
                )
              }
              options={(cliente && !clientes.some((c) => c.cliente_codigo === cliente.cliente_codigo)
                ? [cliente, ...clientes]
                : clientes
              ).map((c) => ({
                value: c.cliente_codigo,
                label: (
                  <span>
                    {c.cliente_nombre || c.cliente_codigo}{' '}
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      {c.cliente_codigo} · {c.casos} caso{c.casos === 1 ? '' : 's'}
                    </Text>
                  </span>
                ),
              }))}
            />
          </Form.Item>
        </Col>
        <Col xs={24} sm={12}>
          <Form.Item label="Caso" required>
            <Select
              showSearch
              value={casoSel ?? undefined}
              disabled={!cliente}
              loading={cargandoCasos}
              placeholder={cliente ? 'Elige el caso' : 'Primero elige el cliente'}
              optionFilterProp="label"
              onChange={(k) => elegirCaso(k)}
              options={casos.map((c) => ({ value: casoKey(c), label: casoLabel(c) }))}
            />
          </Form.Item>
        </Col>
      </Row>

      {caso && (
        <Form.Item
          label="Notas de trabajo (NT)"
          required
          extra={
            caso.nts.length > 1
              ? 'Si marcas varias, se registra una solicitud por cada NT, cada una con su monto.'
              : undefined
          }
        >
          <Space direction="vertical" size={4} style={{ width: '100%' }}>
            {caso.nts.length > 1 && (
              <Checkbox
                checked={ntsSel.length === caso.nts.length}
                indeterminate={ntsSel.length > 0 && ntsSel.length < caso.nts.length}
                onChange={(e) => setNtsSel(e.target.checked ? caso.nts.map((n) => n.nt) : [])}
              >
                <Text type="secondary">Todas ({caso.nts.length})</Text>
              </Checkbox>
            )}
            <Checkbox.Group
              value={ntsSel}
              onChange={(v) => setNtsSel(v as number[])}
              style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 16px' }}
              options={caso.nts.map((n) => ({
                value: n.nt,
                label: (
                  <span>
                    <Text strong>{n.nt}</Text>{' '}
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      {n.gastos_presup > 0 ? `presup. ${q(n.gastos_presup)}` : ''}
                      {n.encargado ? ` · enc. ${n.encargado}` : ''}
                    </Text>
                  </span>
                ),
              }))}
            />
          </Space>
        </Form.Item>
      )}
    </>
  );

  /* ─────────── edición: NT única ─────────── */
  const seleccionEdicion = (
    <>
      <Row gutter={12}>
        <Col xs={24} sm={16}>
          <Form.Item label="Cliente y caso">
            {buscandoNt ? (
              <Spin size="small" />
            ) : editInfo && !notaError ? (
              <div style={{ lineHeight: 1.35 }}>
                <Text code>{editInfo.cliente_codigo}</Text> <Text>{editInfo.cliente_nombre}</Text>
                <br />
                <Text type="secondary">{editInfo.caso || 'Caso sin nombre'}</Text>
              </div>
            ) : (
              <Text type="secondary">—</Text>
            )}
          </Form.Item>
        </Col>
        <Col xs={24} sm={8}>
          <Form.Item name="nt" label="NT (nota de trabajo)" rules={[{ required: true, message: 'Indica la NT' }]}>
            <InputNumber
              style={{ width: '100%' }}
              controls={false}
              min={1}
              onBlur={(e) => buscarNt(Number(e.target.value) || null)}
              onPressEnter={(e) => buscarNt(Number((e.target as HTMLInputElement).value) || null)}
            />
          </Form.Item>
        </Col>
      </Row>
      {notaError && <Alert type="error" showIcon style={{ marginTop: -8, marginBottom: 12 }} message={notaError} />}
    </>
  );

  return (
    <Modal
      title={editando ? `Solicitud #${item!.id}` : 'Nueva solicitud de dinero'}
      footer={lectura ? null : undefined}
      open={open}
      onCancel={() => !saving && onClose()}
      onOk={guardar}
      okText={editando ? 'Guardar cambios' : varias ? `Registrar ${ntsSel.length} solicitudes` : 'Registrar'}
      confirmLoading={saving}
      okButtonProps={{ disabled: !!notaError || buscandoNt || (!editando && !ntsSel.length) }}
      width={780}
      destroyOnClose
    >
      <Form form={form} layout="vertical" requiredMark="optional" disabled={lectura}>
        {editando ? seleccionEdicion : seleccionAlta}

        <Form.Item name="concepto" label="Concepto" rules={[{ required: true, min: 2, message: 'Describe el gasto' }]}>
          <Input.TextArea autoSize={{ minRows: 1, maxRows: 4 }} placeholder="Ej. VISA MÚLTIPLE SILVIA SEGOVIA" />
        </Form.Item>

        <Row gutter={12}>
          <Col xs={12} sm={6}>
            <Form.Item name="cantidad" label="Cantidad">
              <InputNumber style={{ width: '100%' }} min={1} max={9999} precision={0} />
            </Form.Item>
          </Col>
          <Col xs={12} sm={6} style={varias ? { display: 'none' } : undefined}>
            <Form.Item name="monto" label="Monto (Q)" rules={[{ required: !varias, message: 'Indica el monto' }]}>
              <InputNumber style={{ width: '100%' }} min={0.01} precision={2} prefix="Q" />
            </Form.Item>
          </Col>
          <Col xs={12} sm={6}>
            <Form.Item name="fecha_solicitud" label="Fecha de solicitud" rules={[{ required: true }]}>
              <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" allowClear={false} />
            </Form.Item>
          </Col>
          <Col xs={12} sm={6}>
            <Form.Item name="fecha_uso" label="Fecha de uso">
              <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
            </Form.Item>
          </Col>
        </Row>

        {varias && (
          <Form.Item label="Monto por NT (Q)" required>
            <Row gutter={[12, 8]}>
              {ntsSel.map((nt) => (
                <Col xs={12} sm={6} key={nt}>
                  <InputNumber
                    style={{ width: '100%' }}
                    min={0.01}
                    precision={2}
                    prefix="Q"
                    addonBefore={nt}
                    value={montos[nt] ?? null}
                    status={montos[nt] ? undefined : 'error'}
                    onChange={(v) => setMontos((p) => ({ ...p, [nt]: v ?? null }))}
                  />
                </Col>
              ))}
            </Row>
            <Text type="secondary" style={{ fontSize: 12 }}>
              Total: {q(ntsSel.reduce((sum, nt) => sum + (montos[nt] ?? 0), 0))}
            </Text>
          </Form.Item>
        )}

        <Row gutter={12}>
          <Col xs={24} sm={12} style={jefe ? undefined : { display: 'none' }}>
            <Form.Item name="solicitado_por_id" label="Solicitado por">
              <Select
                allowClear
                showSearch
                optionFilterProp="label"
                placeholder={item?.solicitado_por_iniciales || 'Equipo de Migración'}
                options={(opciones?.equipo ?? []).map((u) => ({ value: u.id, label: u.nombre }))}
              />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item name="beneficiario" label="Nombre de cheque">
              <AutoComplete
                allowClear
                placeholder="A nombre de quién sale el cheque"
                options={(opciones?.beneficiarios ?? []).map((b) => ({ value: b.nombre }))}
                filterOption={(input, opt) => String(opt?.value ?? '').toUpperCase().includes(input.toUpperCase())}
              />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={12} style={jefe || lectura ? undefined : { display: 'none' }}>
          <Col xs={24} sm={8}>
            <Form.Item name="fecha_entrega" label="Entregado al procurador">
              <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
            </Form.Item>
          </Col>
          <Col xs={24} sm={16}>
            <Form.Item name="estatus_liquidacion" label="Estatus de liquidación (nota)">
              <Input placeholder="Ej. falta factura de CEM" />
            </Form.Item>
          </Col>
        </Row>

        {ligado ? (
          <Descriptions size="small" bordered column={2} title="Cheque en Sirvo" style={{ marginBottom: 12 }}>
            <Descriptions.Item label="No. de cheque">{item!.numero_cheque || '—'}</Descriptions.Item>
            <Descriptions.Item label="Estatus">
              <Tag color={estatusInfo(item!.estatus).color}>{estatusInfo(item!.estatus).label}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Descripción" span={2}>
              {item!.sirvo_descripcion}
            </Descriptions.Item>
            <Descriptions.Item label="Monto Sirvo">
              {item!.sirvo_monto != null ? `Q${item!.sirvo_monto.toFixed(2)}` : '—'}
            </Descriptions.Item>
            <Descriptions.Item label="Fecha cheque">{item!.sirvo_fecha_cheque ?? '—'}</Descriptions.Item>
          </Descriptions>
        ) : (
          editando &&
          jefe && (
            <Form.Item
              name="numero_cheque"
              label="No. de cheque (solo si Sirvo no lo liga)"
              tooltip="Cuando Sirvo emite el cheque, el sistema lo liga solo y toma el número de allá."
            >
              <Input style={{ maxWidth: 200 }} />
            </Form.Item>
          )
        )}

        <Form.Item name="notas" label="Notas">
          <Input.TextArea autoSize={{ minRows: 1, maxRows: 4 }} />
        </Form.Item>
      </Form>
    </Modal>
  );
}
