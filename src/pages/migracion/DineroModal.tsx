import { useEffect, useState } from 'react';
import {
  Alert,
  AutoComplete,
  Col,
  DatePicker,
  Descriptions,
  Form,
  Input,
  InputNumber,
  Modal,
  Row,
  Select,
  Spin,
  Tag,
  Typography,
  message,
} from 'antd';
import dayjs, { type Dayjs } from 'dayjs';
import { getNt, type NtItem } from '../../api/migracionNt';
import {
  createDinero,
  estatusInfo,
  updateDinero,
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
  onClose: () => void;
  onSaved: (item: DineroItem) => void;
}

const d = (v?: string | null) => (v ? dayjs(v) : null);
const s = (v?: Dayjs | null) => (v ? v.format('YYYY-MM-DD') : null);

/** Alta / edición de una solicitud de dinero. La NT debe ser nota de Migración activa. */
export default function DineroModal({ open, item, opciones, onClose, onSaved }: Props) {
  const [form] = Form.useForm<FormValues>();
  const [saving, setSaving] = useState(false);
  const [nota, setNota] = useState<NtItem | null>(null);
  const [notaError, setNotaError] = useState<string | null>(null);
  const [buscandoNt, setBuscandoNt] = useState(false);
  const editando = !!item;

  useEffect(() => {
    if (!open) return;
    setNota(null);
    setNotaError(null);
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

  const buscarNt = async (nt?: number | null) => {
    setNota(null);
    setNotaError(null);
    if (!nt) return;
    if (editando && nt === item?.nt) return; // la que ya tenía, aunque hoy esté cerrada
    setBuscandoNt(true);
    try {
      const { data } = await getNt(nt);
      setNota(data);
      if (!data.activa) setNotaError(`La NT ${nt} ya está cerrada en Sirvo.`);
      else if (!data.es_nota_migracion)
        setNotaError(`La NT ${nt} no es nota de Migración (es de otro equipo o no tiene saldo ni gastos presupuestados).`);
    } catch (e: any) {
      setNotaError(e?.response?.data?.message || `La NT ${nt} no está en el reporte de Sirvo.`);
    } finally {
      setBuscandoNt(false);
    }
  };

  const guardar = async () => {
    const v = await form.validateFields();
    if (notaError) {
      message.error(notaError);
      return;
    }
    const body: DineroInput = {
      nt: v.nt,
      concepto: v.concepto?.trim(),
      fecha_solicitud: s(v.fecha_solicitud) ?? undefined,
      fecha_uso: s(v.fecha_uso),
      solicitado_por_id: v.solicitado_por_id ?? null,
      cantidad: v.cantidad ?? null,
      monto: v.monto,
      beneficiario: v.beneficiario?.trim() || null,
      fecha_entrega: s(v.fecha_entrega),
      estatus_liquidacion: v.estatus_liquidacion?.trim() || null,
      notas: v.notas?.trim() || null,
      numero_cheque: v.numero_cheque?.trim() || null,
    };
    setSaving(true);
    try {
      const { data } = editando ? await updateDinero(item!.id, body) : await createDinero(body);
      message.success(editando ? 'Solicitud actualizada' : 'Solicitud registrada');
      onSaved(data);
    } catch (e: any) {
      message.error(e?.response?.data?.message || 'No se pudo guardar');
    } finally {
      setSaving(false);
    }
  };

  const ntInfo = nota ?? (item ? { cliente_codigo: item.cliente_codigo, cliente_nombre: item.cliente_nombre, caso: item.caso_nombre } : null);
  const ligado = item?.request_id != null;

  return (
    <Modal
      title={editando ? `Solicitud #${item!.id}` : 'Nueva solicitud de dinero'}
      open={open}
      onCancel={() => !saving && onClose()}
      onOk={guardar}
      okText={editando ? 'Guardar cambios' : 'Registrar'}
      confirmLoading={saving}
      okButtonProps={{ disabled: !!notaError || buscandoNt }}
      width={760}
      destroyOnClose
    >
      <Form form={form} layout="vertical" requiredMark="optional">
        <Row gutter={12}>
          <Col xs={24} sm={8}>
            <Form.Item name="nt" label="NT (nota de trabajo)" rules={[{ required: true, message: 'Indica la NT' }]}>
              <InputNumber
                style={{ width: '100%' }}
                controls={false}
                min={1}
                placeholder="Ej. 182190"
                onBlur={(e) => buscarNt(Number(e.target.value) || null)}
                onPressEnter={(e) => buscarNt(Number((e.target as HTMLInputElement).value) || null)}
              />
            </Form.Item>
          </Col>
          <Col xs={24} sm={16}>
            <Form.Item label="Cliente y caso">
              {buscandoNt ? (
                <Spin size="small" />
              ) : ntInfo && !notaError ? (
                <div style={{ lineHeight: 1.35 }}>
                  <Text code>{ntInfo.cliente_codigo}</Text> <Text>{ntInfo.cliente_nombre}</Text>
                  <br />
                  <Text type="secondary">{ntInfo.caso || 'Caso sin nombre'}</Text>
                </div>
              ) : (
                <Text type="secondary">Se llena solo al escribir la NT</Text>
              )}
            </Form.Item>
          </Col>
        </Row>
        {notaError && <Alert type="error" showIcon style={{ marginTop: -8, marginBottom: 12 }} message={notaError} />}

        <Form.Item name="concepto" label="Concepto" rules={[{ required: true, min: 2, message: 'Describe el gasto' }]}>
          <Input.TextArea autoSize={{ minRows: 1, maxRows: 4 }} placeholder="Ej. VISA MÚLTIPLE SILVIA SEGOVIA" />
        </Form.Item>

        <Row gutter={12}>
          <Col xs={12} sm={6}>
            <Form.Item name="cantidad" label="Cantidad">
              <InputNumber style={{ width: '100%' }} min={1} max={9999} precision={0} />
            </Form.Item>
          </Col>
          <Col xs={12} sm={6}>
            <Form.Item name="monto" label="Monto (Q)" rules={[{ required: true, message: 'Indica el monto' }]}>
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

        <Row gutter={12}>
          <Col xs={24} sm={12}>
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

        <Row gutter={12}>
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
          editando && (
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
