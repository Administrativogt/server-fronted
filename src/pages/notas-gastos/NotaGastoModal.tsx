import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import {
  AutoComplete,
  Button,
  Col,
  Form,
  Input,
  InputNumber,
  Modal,
  Row,
  Segmented,
  Space,
  Tag,
  theme,
  Tooltip,
  Typography,
} from 'antd';
import { CheckCircleFilled, EditOutlined, PlusOutlined, WarningFilled } from '@ant-design/icons';
import type { TextAreaRef } from 'antd/es/input/TextArea';
import {
  NOTA_GASTO_AREAS,
  type NotaGasto,
  type NotaGastoArea,
  type NotaGastoPayload,
} from '../../api/notasGastos';

const { Text } = Typography;

export type NotaModalState =
  | { mode: 'create'; area?: NotaGastoArea; cliente?: string; nombre?: string; nt?: number }
  | { mode: 'edit'; nota: NotaGasto }
  | null;

const normalize = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase();
const clean = (s: string | undefined | null) => (s ?? '').replace(/\s+/g, ' ').trim().toUpperCase();

const AREA_DOT: Record<NotaGastoArea, string> = {
  MIGRACION: 'colorPrimary',
  PENAL: 'colorError',
  LABORAL: 'colorSuccess',
};

const CONECTORES = new Set(['DE', 'DEL', 'POR', 'LA', 'LOS', 'EL', 'Y', 'A', 'EN']);

/**
 * Cómo suelen empezar los nombres, sacado de las propias notas: un nombre
 * completo que se repite ("ASISTENCIA LABORAL") o el inicio común de varios
 * ("RESIDENCIA TEMPORAL …", "MHB …"). De un inicio se queda la versión más
 * larga que siga cubriendo la mayoría de sus casos.
 */
function nombreSugerencias(notas: NotaGasto[], area: NotaGastoArea | undefined) {
  if (!area) return [];
  const nombres = notas.filter((n) => n.area === area).map((n) => clean(n.nombre));
  const full = new Map<string, number>();
  const pref = new Map<string, number>();
  for (const nombre of nombres) {
    full.set(nombre, (full.get(nombre) ?? 0) + 1);
    const words = nombre.split(' ');
    for (let k = 1; k <= Math.min(3, words.length - 1); k++) {
      const p = words.slice(0, k).join(' ');
      pref.set(p, (pref.get(p) ?? 0) + 1);
    }
  }
  const repetidos = new Set([...full].filter(([, c]) => c >= 2).map(([t]) => t));
  const candidatos = [...pref].filter(([p, c]) => {
    if (c < 2 || repetidos.has(p)) return false;
    const last = p.split(' ').pop() ?? '';
    if (CONECTORES.has(last) || last.length < 3) return false;
    // descartar si algo más largo cubre ≥60 % de sus casos: esa es mejor sugerencia
    const mejor = (q: string, cq: number) =>
      q.startsWith(`${p} `) && cq >= c * 0.6 && !CONECTORES.has(q.split(' ').pop() ?? '');
    return ![...pref].some(([q, cq]) => mejor(q, cq)) && ![...repetidos].some((q) => mejor(q, full.get(q)!));
  });
  const items = [
    ...[...repetidos].map((text) => ({ text, c: full.get(text)!, isPrefix: false })),
    ...candidatos.map(([text, c]) => ({ text, c, isPrefix: true })),
  ];
  return items.sort((a, b) => b.c - a.c).slice(0, 4);
}

/** Todas las palabras escritas aparecen (como inicio de palabra) en el nombre. */
const pareceA = (nombre: string, query: string) => {
  const words = normalize(nombre).split(/[\s,()/-]+/);
  return query
    .split(' ')
    .filter(Boolean)
    .every((q) => words.some((w) => w.startsWith(q)));
};

/**
 * Segmented sin valor marca la primera opción por su cuenta y, al hacer clic en
 * ella, no avisa al Form: con un valor ficticio no queda nada marcado.
 */
function AreaPicker({
  value,
  onChange,
  options,
}: {
  value?: NotaGastoArea;
  onChange?: (v: NotaGastoArea) => void;
  options: { value: NotaGastoArea; label: ReactNode }[];
}) {
  return (
    <Segmented<string>
      block
      value={value ?? '__ninguna__'}
      onChange={(v) => onChange?.(v as NotaGastoArea)}
      options={options}
    />
  );
}

export default function NotaGastoModal({
  state,
  notas,
  saving,
  onCancel,
  onSubmit,
  onEditExisting,
}: {
  state: NotaModalState;
  notas: NotaGasto[];
  saving: boolean;
  onCancel: () => void;
  /** Devuelve la nota guardada o null si falló (el modal se queda abierto). */
  onSubmit: (payload: NotaGastoPayload, keepOpen: boolean) => Promise<NotaGasto | null>;
  onEditExisting: (nota: NotaGasto) => void;
}) {
  const { token } = theme.useToken();
  const [form] = Form.useForm<NotaGastoPayload>();
  const [showObs, setShowObs] = useState(false);
  const [sessionCount, setSessionCount] = useState(0);
  const nombreRef = useRef<TextAreaRef>(null);
  const editing = state?.mode === 'edit' ? state.nota : null;

  const area = Form.useWatch('area', form) as NotaGastoArea | undefined;
  const cliente = Form.useWatch('cliente', form) as string | undefined;
  const nombre = Form.useWatch('nombre', form) as string | undefined;
  const nt = Form.useWatch('nt', form) as number | null | undefined;

  // Valores al abrir. El Form se monta de nuevo con cada apertura (key), así
  // que initialValues siempre corresponde a la nota/área que se abrió.
  const initialValues = useMemo<Partial<NotaGastoPayload>>(() => {
    if (state?.mode === 'edit') {
      const { area: a, cliente: c, caso, nombre: nom, nt: n, observaciones } = state.nota;
      return { area: a, cliente: c, caso, nombre: nom, nt: n, observaciones };
    }
    return {
      area: state?.area,
      cliente: state?.cliente,
      caso: null,
      nombre: state?.nombre ?? '',
      nt: state?.nt ?? null,
      observaciones: '',
    };
  }, [state]);
  // Cerrar desmonta el modal (destroyOnHidden); esto cubre pasar de una nota a otra sin cerrar
  const formKey = state?.mode === 'edit' ? `edit-${state.nota.id}` : 'create';

  useEffect(() => {
    if (!state) return;
    setSessionCount(0);
    setShowObs(state.mode === 'edit' && !!state.nota.observaciones);
  }, [state]);

  const activas = useMemo(() => notas.filter((n) => n.activo && n.id !== editing?.id), [notas, editing]);

  // Clientes con su número de notas; los del área elegida primero
  const clienteOptions = useMemo(() => {
    const map = new Map<string, { total: number; enArea: number }>();
    for (const n of activas) {
      const e = map.get(n.cliente) ?? { total: 0, enArea: 0 };
      e.total += 1;
      if (n.area === area) e.enArea += 1;
      map.set(n.cliente, e);
    }
    return [...map]
      .sort(([a, x], [b, y]) => Number(y.enArea > 0) - Number(x.enArea > 0) || a.localeCompare(b))
      .map(([c, e]) => ({
        value: c,
        label: (
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{c}</span>
            <Text type="secondary" style={{ fontSize: 12, flexShrink: 0 }}>
              {e.enArea > 0 && area ? `${e.enArea} en esta área` : `${e.total} nota${e.total === 1 ? '' : 's'}`}
            </Text>
          </div>
        ),
      }));
  }, [activas, area]);

  const clienteKey = clean(cliente);
  const clienteNotas = useMemo(
    () => (clienteKey ? activas.filter((n) => clean(n.cliente) === clienteKey) : []),
    [activas, clienteKey],
  );
  const clienteNotasArea = area ? clienteNotas.filter((n) => n.area === area) : clienteNotas;
  const clienteNuevo = !!clienteKey && clienteNotas.length === 0;

  // Si el cliente ya tiene historial en el área, sus propios nombres mandan
  // (p. ej. FEMSA → "MHB …", "EMBOCEN …"); si no, los más comunes del área.
  const sugerencias = useMemo(() => {
    const propias = nombreSugerencias(clienteNotasArea, area);
    return propias.length ? propias : nombreSugerencias(notas, area);
  }, [clienteNotasArea, notas, area]);

  // Mientras escribe el nombre, la lista del cliente muestra solo las parecidas
  const nombreKey = normalize(clean(nombre));
  const parecidas = useMemo(
    () =>
      nombreKey.length >= 3
        ? clienteNotasArea.filter((n) => pareceA(n.nombre, nombreKey))
        : null,
    [clienteNotasArea, nombreKey],
  );
  const listaCliente = parecidas ?? clienteNotasArea;

  const nombreDup = useMemo(() => {
    const k = clean(nombre);
    if (!k || !area) return null;
    return clienteNotasArea.find((n) => clean(n.nombre) === k) ?? null;
  }, [nombre, area, clienteNotasArea]);

  const ntSameArea = nt ? activas.find((n) => n.nt === nt && n.area === area) : undefined;
  const ntOtherArea = nt && !ntSameArea ? activas.find((n) => n.nt === nt) : undefined;

  const pickSugerencia = (s: { text: string; isPrefix: boolean }) => {
    form.setFieldValue('nombre', s.isPrefix ? `${s.text} ` : s.text);
    // al prefijo le falta el nombre de la persona: dejar el cursor al final
    requestAnimationFrame(() => {
      const el = nombreRef.current?.resizableTextArea?.textArea;
      if (!el) return;
      el.focus();
      el.setSelectionRange(el.value.length, el.value.length);
    });
  };

  const submit = async (keepOpen: boolean) => {
    const values = await form.validateFields();
    const payload: NotaGastoPayload = {
      ...values,
      cliente: clean(values.cliente),
      nombre: clean(values.nombre),
      caso: values.area === 'MIGRACION' ? values.caso?.trim() || null : null,
      nt: values.nt ?? null,
      observaciones: values.observaciones?.trim() ?? '',
    };
    const saved = await onSubmit(payload, keepOpen);
    if (saved && keepOpen) {
      setSessionCount((c) => c + 1);
      // misma área y cliente: lo normal es cargar varios casos seguidos del mismo cliente
      form.resetFields(['caso', 'nombre', 'nt', 'observaciones']);
      form.setFieldsValue({ area: saved.area, cliente: saved.cliente });
      setShowObs(false);
      requestAnimationFrame(() => nombreRef.current?.focus());
    }
  };

  const status = (ok: boolean, text: string, icon = true) => (
    <span style={{ color: ok ? token.colorSuccessText : token.colorWarningText }}>
      {icon && (ok ? <CheckCircleFilled /> : <WarningFilled />)} {text}
    </span>
  );

  return (
    <Modal
      open={state !== null}
      title={
        editing ? (
          'Editar nota'
        ) : (
          <Space size={8}>
            Nueva nota
            {sessionCount > 0 && (
              <Tag color="success" style={{ marginInlineEnd: 0 }}>
                {sessionCount} registrada{sessionCount === 1 ? '' : 's'}
              </Tag>
            )}
          </Space>
        )
      }
      width={600}
      className="ng-page"
      style={
        {
          '--ng-border': token.colorBorder,
          '--ng-ink': token.colorText,
          '--ng-muted': token.colorTextSecondary,
          '--ng-primary': token.colorPrimary,
          '--ng-subtle': token.colorFillQuaternary,
          '--ng-chip-hover': token.colorPrimaryBg,
        } as CSSProperties
      }
      onCancel={onCancel}
      destroyOnHidden
      footer={
        <Space>
          <Button onClick={onCancel}>{sessionCount > 0 ? 'Cerrar' : 'Cancelar'}</Button>
          {!editing && (
            <Tooltip title="Deja el área y el cliente listos para el siguiente caso">
              <Button icon={<PlusOutlined />} loading={saving} onClick={() => submit(true)}>
                Guardar y agregar otra
              </Button>
            </Tooltip>
          )}
          <Tooltip title="Ctrl + Enter">
            <Button type="primary" loading={saving} onClick={() => submit(false)}>
              Guardar
            </Button>
          </Tooltip>
        </Space>
      }
    >
      <div
        onKeyDown={(e) => {
          if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
            e.preventDefault();
            submit(false);
          }
        }}
      >
        <Form
          key={formKey}
          form={form}
          layout="vertical"
          preserve={false}
          requiredMark="optional"
          initialValues={initialValues}
          style={{ marginTop: 16 }}
        >
          <Form.Item name="area" label="Área" rules={[{ required: true, message: 'Elija el área' }]}>
            <AreaPicker
              options={NOTA_GASTO_AREAS.map((a) => ({
                value: a.value,
                label: (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '2px 0' }}>
                    <span
                      aria-hidden
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        background: token[AREA_DOT[a.value] as 'colorPrimary'],
                      }}
                    />
                    {a.label}
                  </span>
                ),
              }))}
            />
          </Form.Item>

          <Form.Item
            name="cliente"
            label="Cliente"
            rules={[{ required: true, whitespace: true, message: 'Ingrese el cliente' }]}
            extra={
              clienteNuevo ? (
                <span>
                  <Tag color="processing" style={{ marginInlineEnd: 6 }}>
                    Cliente nuevo
                  </Tag>
                  Se guardará como «{clienteKey}».
                </span>
              ) : clienteNotas.length > 0 ? (
                <div className="ng-existing">
                  <Text type="secondary">
                    {parecidas
                      ? parecidas.length
                        ? `${parecidas.length} parecida${parecidas.length === 1 ? '' : 's'} a lo que escribe:`
                        : `Ninguna de sus ${clienteNotasArea.length} notas se parece: es un caso nuevo.`
                      : clienteNotasArea.length > 0
                      ? `Ya tiene ${clienteNotasArea.length} nota${clienteNotasArea.length === 1 ? '' : 's'}${area ? ' en esta área' : ''}:`
                      : `Tiene ${clienteNotas.length} nota${clienteNotas.length === 1 ? '' : 's'} en otras áreas.`}
                  </Text>
                  {listaCliente.length > 0 && (
                    <ul>
                      {listaCliente.slice(0, 4).map((n) => (
                        <li key={n.id}>
                          <span className="ng-existing-name" title={n.nombre}>
                            {n.nombre}
                          </span>
                          <Text strong style={{ fontVariantNumeric: 'tabular-nums' }}>
                            {n.nt ?? 'sin NT'}
                          </Text>
                          <Button
                            type="link"
                            size="small"
                            icon={<EditOutlined />}
                            style={{ padding: 0, height: 'auto' }}
                            onClick={() => onEditExisting(n)}
                          >
                            Editar
                          </Button>
                        </li>
                      ))}
                      {listaCliente.length > 4 && (
                        <li>
                          <Text type="secondary">
                            y {listaCliente.length - 4} más{parecidas ? '' : ' (escriba el nombre para filtrarlas)'}
                          </Text>
                        </li>
                      )}
                    </ul>
                  )}
                </div>
              ) : null
            }
          >
            <AutoComplete
              allowClear
              autoFocus={!state || state.mode === 'create'}
              placeholder="Escriba para buscar o agregar un cliente"
              options={clienteOptions}
              filterOption={(input, opt) => normalize(String(opt?.value ?? '')).includes(normalize(input))}
            />
          </Form.Item>

          <Form.Item
            name="nombre"
            label="Nombre"
            rules={[{ required: true, whitespace: true, message: 'Ingrese el nombre del caso' }]}
            validateStatus={nombreDup ? 'warning' : undefined}
            help={
              nombreDup ? (
                <span>
                  {status(false, `Ya existe para este cliente con NT ${nombreDup.nt ?? '—'}.`)}{' '}
                  <Button
                    type="link"
                    size="small"
                    style={{ padding: 0, height: 'auto' }}
                    onClick={() => onEditExisting(nombreDup)}
                  >
                    Abrir esa nota
                  </Button>
                </span>
              ) : undefined
            }
          >
            <Input.TextArea
              ref={nombreRef}
              autoSize={{ minRows: 1, maxRows: 4 }}
              placeholder={
                area === 'MIGRACION'
                  ? 'p. ej. RESIDENCIA TEMPORAL JUAN PÉREZ'
                  : area === 'LABORAL'
                    ? 'p. ej. ASISTENCIA LABORAL'
                    : area === 'PENAL'
                      ? 'p. ej. ASISTENCIA LEGAL PENAL'
                      : 'Nombre del caso o asunto'
              }
              onBlur={(e) => form.setFieldValue('nombre', clean(e.target.value))}
            />
          </Form.Item>
          {sugerencias.length > 0 && !clean(nombre) && (
            <div className="ng-suggest" aria-label="Sugerencias de nombre">
              {sugerencias.map((s) => (
                <button key={s.text} type="button" className="ng-chip" onClick={() => pickSugerencia(s)}>
                  {s.text}
                  {s.isPrefix ? ' …' : ''}
                </button>
              ))}
            </div>
          )}

          <Row gutter={16}>
            {area === 'MIGRACION' && (
              <Col xs={24} sm={12}>
                <Form.Item name="caso" label="Caso">
                  <Input maxLength={50} placeholder="p. ej. 10643" inputMode="numeric" />
                </Form.Item>
              </Col>
            )}
            <Col xs={24} sm={12}>
              <Form.Item
                name="nt"
                label="NT"
                rules={[
                  {
                    validator: (_, v) =>
                      v && activas.some((n) => n.nt === v && n.area === form.getFieldValue('area'))
                        ? Promise.reject(new Error('Ese NT ya está asignado en esta área'))
                        : Promise.resolve(),
                  },
                ]}
                validateStatus={ntSameArea ? 'error' : ntOtherArea ? 'warning' : undefined}
                help={
                  ntSameArea ? (
                    <span style={{ color: token.colorErrorText }}>
                      Ya es de «{ntSameArea.cliente} — {ntSameArea.nombre}»
                    </span>
                  ) : ntOtherArea ? (
                    status(false, `También lo usa ${ntOtherArea.cliente} en otra área`)
                  ) : nt ? (
                    status(true, 'Disponible')
                  ) : (
                    <Text type="secondary">Vacío si aún no lo tiene</Text>
                  )
                }
              >
                <InputNumber min={1} precision={0} controls={false} placeholder="p. ej. 177175" style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>

          {showObs ? (
            <Form.Item name="observaciones" label="Observaciones">
              <Input.TextArea autoSize={{ minRows: 2, maxRows: 5 }} autoFocus={!editing} />
            </Form.Item>
          ) : (
            <Button
              type="link"
              icon={<PlusOutlined />}
              style={{ padding: 0 }}
              onClick={() => setShowObs(true)}
            >
              Agregar observación
            </Button>
          )}
        </Form>
      </div>
    </Modal>
  );
}
