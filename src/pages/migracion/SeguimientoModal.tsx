import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Button,
  Checkbox,
  DatePicker,
  Divider,
  Form,
  Input,
  Modal,
  Select,
  Space,
  Typography,
  message,
} from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import dayjs, { type Dayjs } from 'dayjs';
import {
  addBeneficiario,
  updateSeguimiento,
  type GastoLinea,
  type SeguimientoOpciones,
  type SeguimientoPatch,
} from '../../api/migracionGastos';

const { Text } = Typography;

export type SeguimientoMode = 'entrega' | 'completo';

interface Props {
  open: boolean;
  mode: SeguimientoMode;
  lines: GastoLinea[];
  opciones: SeguimientoOpciones | null;
  onClose: () => void;
  onSaved: () => void;
  onOpcionesChanged: () => void;
}

interface FormValues {
  fecha_uso?: Dayjs | null;
  solicitado_por_id?: number | null;
  beneficiario?: string | null;
  entregado_at?: Dayjs | null;
  notas?: string | null;
}

/** Valor comparable de un campo (fechas como YYYY-MM-DD, vacío = null). */
const norm = (v: unknown): string | number | null => {
  if (v === undefined || v === null || v === '') return null;
  if (dayjs.isDayjs(v)) return v.format('YYYY-MM-DD');
  if (typeof v === 'string') return v.trim() || null;
  return v as number;
};

const FIELDS: Array<keyof FormValues> = ['fecha_uso', 'solicitado_por_id', 'beneficiario', 'entregado_at', 'notas'];

/** El valor común de las líneas elegidas, o undefined si difieren. */
const common = <T,>(values: T[]): T | undefined =>
  values.every((v) => v === values[0]) ? values[0] : undefined;

/**
 * Registrar el seguimiento de varias líneas a la vez. Solo se guardan los
 * campos que se tocaron; un campo tocado y vacío se borra.
 */
function SeguimientoModal({ open, mode, lines, opciones, onClose, onSaved, onOpcionesChanged }: Props) {
  const [form] = Form.useForm<FormValues>();
  const [saving, setSaving] = useState(false);
  const [porCheque, setPorCheque] = useState(true);
  const [nuevoNombre, setNuevoNombre] = useState('');
  const [agregando, setAgregando] = useState(false);
  // Valores con que abrió la ventana: se guarda solo lo que cambió respecto a esto
  const initial = useRef<Record<string, string | number | null>>({});

  const cheques = useMemo(
    () => [...new Set(lines.map((l) => l.cheque).filter((c): c is number => c != null))],
    [lines],
  );
  const sinCheque = lines.filter((l) => l.cheque == null);

  useEffect(() => {
    if (!open) return;
    form.resetFields();
    setPorCheque(true);
    const fechaUso = common(lines.map((l) => l.fecha_uso));
    const entregado = common(lines.map((l) => l.entregado_at));
    const values: FormValues = {
      fecha_uso: fechaUso ? dayjs(fechaUso) : undefined,
      solicitado_por_id: common(lines.map((l) => l.solicitado_por_id)) ?? undefined,
      beneficiario: common(lines.map((l) => l.beneficiario)) ?? undefined,
      entregado_at: entregado ? dayjs(entregado) : undefined,
      notas: common(lines.map((l) => l.notas)) ?? undefined,
    };
    initial.current = Object.fromEntries(FIELDS.map((f) => [f, norm(values[f])]));
    // En "registrar entrega" se propone hoy; como difiere del inicial, se guarda
    if (mode === 'entrega' && !entregado) values.entregado_at = dayjs();
    form.setFieldsValue(values);
  }, [open, lines, mode, form]);

  const agregarNombre = async () => {
    const nombre = nuevoNombre.trim();
    if (nombre.length < 3) return;
    setAgregando(true);
    try {
      await addBeneficiario(nombre);
      onOpcionesChanged();
      form.setFieldsValue({ beneficiario: nombre.replace(/\s+/g, ' ').toUpperCase() });
      setNuevoNombre('');
      message.success('Nombre agregado a la lista');
    } catch (e: any) {
      message.error(e?.response?.data?.message || 'No se pudo agregar');
    } finally {
      setAgregando(false);
    }
  };

  const save = async () => {
    const v = form.getFieldsValue();
    const patch: SeguimientoPatch = {};
    for (const f of FIELDS) {
      const now = norm(v[f]);
      if (now !== initial.current[f]) (patch as Record<string, unknown>)[f] = now;
    }
    if (Object.keys(patch).length === 0) {
      message.info('No cambiaste nada');
      return;
    }
    if (porCheque && cheques.length) {
      patch.cheques = cheques;
      patch.request_ids = sinCheque.map((l) => l.id);
    } else {
      patch.request_ids = lines.map((l) => l.id);
    }
    setSaving(true);
    try {
      const { data } = await updateSeguimiento(patch);
      message.success(`Seguimiento guardado en ${data.updated} ${data.updated === 1 ? 'línea' : 'líneas'}`);
      onSaved();
    } catch (e: any) {
      message.error(e?.response?.data?.message || 'No se pudo guardar');
    } finally {
      setSaving(false);
    }
  };

  const total = lines.reduce((s, l) => s + l.monto, 0);

  return (
    <Modal
      open={open}
      title={mode === 'entrega' ? 'Registrar entrega del cheque' : 'Seguimiento de gastos'}
      onCancel={onClose}
      onOk={save}
      okText="Guardar"
      confirmLoading={saving}
      destroyOnClose
      width={520}
    >
      <Text type="secondary">
        {lines.length} {lines.length === 1 ? 'línea' : 'líneas'} ·{' '}
        {new Intl.NumberFormat('es-GT', { style: 'currency', currency: 'GTQ' }).format(total)}
        {cheques.length > 0 && ` · cheque${cheques.length > 1 ? 's' : ''} ${cheques.join(', ')}`}
      </Text>

      {cheques.length > 0 && (
        <div style={{ margin: '12px 0' }}>
          <Checkbox checked={porCheque} onChange={(e) => setPorCheque(e.target.checked)}>
            Aplicar a <strong>todas</strong> las líneas de {cheques.length > 1 ? 'esos cheques' : 'ese cheque'}
          </Checkbox>
        </div>
      )}

      <Form form={form} layout="vertical" style={{ marginTop: 8 }}>
        <Form.Item
          name="beneficiario"
          label="A nombre de quién sale el cheque"
          extra={mode === 'entrega' ? 'Quién recibe el dinero (procurador o asistente).' : undefined}
        >
          <Select
            allowClear
            showSearch
            placeholder="Elegir de la lista"
            optionFilterProp="label"
            options={(opciones?.beneficiarios ?? []).map((b) => ({ value: b.nombre, label: b.nombre }))}
            popupRender={(menu) => (
              <>
                {menu}
                <Divider style={{ margin: '8px 0' }} />
                <Space.Compact style={{ width: '100%', padding: '0 8px 4px' }}>
                  <Input
                    placeholder="Agregar nombre que no está"
                    value={nuevoNombre}
                    onChange={(e) => setNuevoNombre(e.target.value)}
                    onKeyDown={(e) => e.stopPropagation()}
                    onPressEnter={agregarNombre}
                  />
                  <Button icon={<PlusOutlined />} loading={agregando} onClick={agregarNombre}>
                    Agregar
                  </Button>
                </Space.Compact>
              </>
            )}
          />
        </Form.Item>

        <Form.Item name="entregado_at" label="Fecha de entrega">
          <DatePicker format="DD/MM/YYYY" style={{ width: '100%' }} allowClear />
        </Form.Item>

        {mode === 'completo' && (
          <>
            <Form.Item name="fecha_uso" label="Fecha en que se usará el dinero">
              <DatePicker format="DD/MM/YYYY" style={{ width: '100%' }} allowClear />
            </Form.Item>
            <Form.Item name="solicitado_por_id" label="Solicitado por">
              <Select
                allowClear
                showSearch
                placeholder="Persona del equipo"
                optionFilterProp="label"
                options={(opciones?.equipo ?? []).map((u) => ({ value: u.id, label: `${u.nombre} (${u.username})` }))}
              />
            </Form.Item>
            <Form.Item name="notas" label="Notas">
              <Input.TextArea rows={2} maxLength={1000} showCount />
            </Form.Item>
          </>
        )}
      </Form>

      {lines.length > 1 && (
        <Alert
          type="info"
          showIcon
          message="Solo se guardan los campos que cambies; lo demás queda como está en cada línea."
        />
      )}
    </Modal>
  );
}

export default SeguimientoModal;
