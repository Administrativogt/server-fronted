// src/pages/mensajeria/EditEncargoPage.tsx
import React, { useEffect, useState } from 'react';
import { Form, Input, Select, Checkbox, Button, message, Space, Card, Modal } from 'antd';
import { useNavigate, useParams } from 'react-router-dom';
import { getEncargoById, updateEncargo } from '../../api/encargos';
import type { EncargoFormValues } from '../../types/encargo';
import useAuthStore from '../../auth/useAuthStore';

const { Option } = Select;
const { TextArea } = Input;

const TIPOS_MENSAJERIA = [
  'enviar factura',
  'recoger factura',
  'enviar sobre',
  'recoger sobre',
  'recoger cheque',
  'otros',
];

const PRIORIDADES = [
  { value: 1, label: 'A (mismo día)' },
  { value: 2, label: 'B (2 días)' },
  { value: 3, label: 'C (más de 3 días)' },
  { value: 4, label: 'D (Solo Villanueva)' },
];

const HORAS_PRIORIDAD = [
  { value: 2, label: 'Antes de' },
  { value: 3, label: 'Después de' },
  { value: 4, label: 'Entre' },
];

const ZONAS = Array.from({ length: 25 }, (_, i) => i + 1);

const EditEncargoPage: React.FC = () => {
  const [form] = Form.useForm();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const tipoUsuario = useAuthStore((state) => state.tipo_usuario);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [comentarioModal, setComentarioModal] = useState(false);
  const [comentario, setComentario] = useState('');

  const isCoordinator = tipoUsuario === 10 || tipoUsuario === 8;

  // Cargar el encargo solo por ID
  useEffect(() => {
    const loadEncargo = async () => {
      if (!id) return;
      try {
        const res = await getEncargoById(Number(id));
        const encargo = res.data;

        const esOtros = !TIPOS_MENSAJERIA.includes(encargo.mensajeria_enviada);
        const tieneHora = encargo.prioridad_hora !== 1;
        const tieneObs = !!encargo.observaciones;

        form.setFieldsValue({
          ...encargo,
          otros_mensajeria: esOtros ? encargo.mensajeria_enviada : undefined,
          tiene_hora: tieneHora,
          hora_minima: encargo.hora_minima?.slice(0, 5) || '',
          hora_maxima: encargo.hora_maxima?.slice(0, 5) || '',
          tiene_observaciones: tieneObs,
          observaciones_text: encargo.observaciones || '',
        });

        setLoading(false);
      } catch (err) {
        console.error(err);
        message.error('Error al cargar el envío');
        navigate('/dashboard/mensajeria');
      }
    };

    loadEncargo();
  }, [id, form, navigate]); // ✅ Dependencias correctas

  const handleMensajeriaChange = (value: string) => {
    form.setFieldsValue({ otros_mensajeria: value === 'otros' ? '' : undefined });
  };

  const handleHoraPrioridadChange = (value: number) => {
    if (value !== 4) {
      form.setFieldsValue({ hora_maxima: undefined });
    }
  };

  const onFinish = async (values: any) => {
    if (!id) return;
    setSaving(true);
    try {
      const payload: EncargoFormValues = {
        tipo_solicitud_id: 1,
        mensajeria_enviada: values.mensajeria_enviada === 'otros'
          ? values.otros_mensajeria
          : values.mensajeria_enviada,
        empresa: values.empresa,
        destinatario: values.destinatario,
        solicitante_id: values.solicitante_id,
        direccion: values.direccion,
        zona: values.zona,
        municipio_id: values.municipio_id,
        fecha_realizacion: values.fecha_realizacion,
        prioridad: values.prioridad,
        prioridad_hora: values.tiene_hora ? values.prioridad_hora : 1,
        observaciones: values.tiene_observaciones ? values.observaciones_text : undefined,
        hora_minima: values.tiene_hora ? `${values.hora_minima}:00` : undefined,
        hora_maxima: values.tiene_hora && values.prioridad_hora === 4 ? `${values.hora_maxima}:00` : undefined,
        mensajero_id: values.mensajero_id,
      };

      await updateEncargo(Number(id), payload);
      message.success('Envío actualizado exitosamente');
      navigate('/dashboard/mensajeria');
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Error al actualizar el envío';
      message.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleAddComentary = () => {
    message.info('Función de comentarios aún no implementada');
    setComentarioModal(false);
  };

  return (
    <Card title="Editar Envío" style={{ maxWidth: 900, margin: '0 auto' }}>
      <Form
        form={form}
        layout="vertical"
        onFinish={onFinish}
        disabled={loading}
      >
        {/* Campos ocultos */}
        <Form.Item name="tipo_solicitud_id" initialValue={1} hidden>
          <Input />
        </Form.Item>
        <Form.Item name="solicitante_id" hidden>
          <Input />
        </Form.Item>
        <Form.Item name="fecha_realizacion" hidden>
          <Input />
        </Form.Item>
        <Form.Item name="estado" hidden>
          <Input />
        </Form.Item>
        <Form.Item name="reject_reason" hidden>
          <Input />
        </Form.Item>

        {/* Mostrar info del solicitante (solo lectura) */}
        <Form.Item label="Solicitante">
          <Input value={form.getFieldValue('solicitante_nombre') || 'Cargando...'} disabled />
        </Form.Item>

        <div style={{ display: 'flex', gap: 16 }}>
          <Form.Item
            label="Nombre Destinatario"
            name="destinatario"
            style={{ flex: 1 }}
            rules={[{ required: true, message: 'Ingrese el destinatario' }]}
          >
            <Input placeholder="Inserte destinatario" />
          </Form.Item>

          <Form.Item
            label="Empresa"
            name="empresa"
            style={{ flex: 1 }}
            rules={[{ required: true, message: 'Ingrese la empresa' }]}
          >
            <Input placeholder="Inserte empresa" />
          </Form.Item>
        </div>

        <Form.Item
          label="Mensajería a Enviar"
          name="mensajeria_enviada"
          rules={[{ required: true, message: 'Seleccione el tipo de mensajería' }]}
        >
          <Select onChange={handleMensajeriaChange}>
            {TIPOS_MENSAJERIA.map(t => (
              <Option key={t} value={t}>
                {t.charAt(0).toUpperCase() + t.slice(1).replace('_', ' ')}
              </Option>
            ))}
          </Select>
        </Form.Item>

        {form.getFieldValue('mensajeria_enviada') === 'otros' && (
          <Form.Item
            label="Especifique la mensajería"
            name="otros_mensajeria"
            rules={[{ required: true, message: 'Especifique la mensajería' }]}
          >
            <Input placeholder="Inserte la mensajería" />
          </Form.Item>
        )}

        {isCoordinator && (
          <Form.Item label="Mensajero">
            <Input value={form.getFieldValue('mensajero_nombre') || 'Sin asignar'} disabled />
          </Form.Item>
        )}

        <div style={{ display: 'flex', gap: 16 }}>
          <Form.Item
            label="Dirección"
            name="direccion"
            style={{ flex: 1 }}
            rules={[{ required: true, message: 'Ingrese la dirección' }]}
          >
            <Input placeholder="Inserta la dirección" />
          </Form.Item>

          <Form.Item
            label="Zona"
            name="zona"
            style={{ flex: 1 }}
            rules={[{ required: true, message: 'Seleccione la zona' }]}
          >
            <Select placeholder="Seleccione zona">
              {ZONAS.map(z => (
                <Option key={z} value={z}>{z}</Option>
              ))}
            </Select>
          </Form.Item>
        </div>

        <div style={{ display: 'flex', gap: 16 }}>
          <Form.Item label="Municipio">
            <Input value={form.getFieldValue('municipio_nombre') || 'Cargando...'} disabled />
          </Form.Item>

          <Form.Item
            label="Prioridad del encargo"
            name="prioridad"
            style={{ flex: 1 }}
          >
            <Select>
              {PRIORIDADES.map(p => (
                <Option key={p.value} value={p.value}>{p.label}</Option>
              ))}
            </Select>
          </Form.Item>
        </div>

        <Form.Item label="Fecha de realización">
          <Input value={form.getFieldValue('fecha_realizacion')} disabled />
        </Form.Item>

        <Form.Item name="tiene_hora" valuePropName="checked">
          <Checkbox>¿Tendrá hora de entrega?</Checkbox>
        </Form.Item>

        {form.getFieldValue('tiene_hora') && (
          <>
            <Form.Item
              label="Horario"
              name="prioridad_hora"
              rules={[{ required: true, message: 'Seleccione el tipo de horario' }]}
            >
              <Select onChange={handleHoraPrioridadChange}>
                {HORAS_PRIORIDAD.map(h => (
                  <Option key={h.value} value={h.value}>{h.label}</Option>
                ))}
              </Select>
            </Form.Item>

            <div style={{ display: 'flex', gap: 16 }}>
              <Form.Item
                label="Hora"
                name="hora_minima"
                style={{ flex: 1 }}
                rules={[{ required: true, message: 'Ingrese la hora' }]}
              >
                <Input type="time" />
              </Form.Item>

              <Form.Item
                label="Hora final"
                name="hora_maxima"
                style={{ flex: 1 }}
                rules={[
                  ({ getFieldValue }) => ({
                    validator(_, value) {
                      if (getFieldValue('prioridad_hora') === 4 && !value) {
                        return Promise.reject('Ingrese la hora final');
                      }
                      return Promise.resolve();
                    },
                  }),
                ]}
              >
                <Input type="time" disabled={form.getFieldValue('prioridad_hora') !== 4} />
              </Form.Item>
            </div>
          </>
        )}

        <Form.Item name="tiene_observaciones" valuePropName="checked">
          <Checkbox>¿Agregar observaciones?</Checkbox>
        </Form.Item>

        {form.getFieldValue('tiene_observaciones') && (
          <Form.Item
            label="Observaciones"
            name="observaciones_text"
            rules={[{ required: true, message: 'Ingrese las observaciones' }]}
          >
            <TextArea rows={3} placeholder="Inserte observaciones" />
          </Form.Item>
        )}

        <Form.Item>
          <Space wrap>
            <Button type="primary" htmlType="submit" loading={saving}>
              Guardar Cambios
            </Button>
            <Button onClick={() => navigate('/dashboard/mensajeria')}>
              Cancelar
            </Button>

            {isCoordinator && form.getFieldValue('estado') > 1 && (
              <Button danger onClick={() => message.info('Quitar Aceptado: pendiente')}>
                Quitar Aceptado
              </Button>
            )}

            {form.getFieldValue('estado') === 5 && !form.getFieldValue('reject_reason') && (
              <Button onClick={() => setComentarioModal(true)}>
                Agregar comentario
              </Button>
            )}
          </Space>
        </Form.Item>
      </Form>

      <Modal
        title="Agregar comentario"
        open={comentarioModal}
        onCancel={() => setComentarioModal(false)}
        onOk={handleAddComentary}
        okText="Guardar"
        cancelText="Cancelar"
      >
        <TextArea
          value={comentario}
          onChange={(e) => setComentario(e.target.value)}
          rows={4}
          placeholder="Escriba su comentario..."
        />
      </Modal>
    </Card>
  );
};

export default EditEncargoPage;