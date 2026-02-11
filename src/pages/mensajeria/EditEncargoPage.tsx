// src/pages/mensajeria/EditEncargoPage.tsx
import React, { useEffect, useState } from 'react';
import { Form, Input, Select, Checkbox, Button, message, Space, Card, Modal } from 'antd';
import { useNavigate, useParams } from 'react-router-dom';
import { getEncargoById, updateEncargo, getMensajeros, getSolicitantes, getMunicipios } from '../../api/encargos';
import type { EncargoFormValues, Usuario, Municipio } from '../../types/encargo';
import useAuthStore from '../../auth/useAuthStore';
import { useMensajeriaPermissions } from '../../hooks/usePermissions';

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
  const { canAssignMensajero, isCoordinador } = useMensajeriaPermissions(); // ✅ NUEVO
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [comentarioModal, setComentarioModal] = useState(false);
  const [comentario, setComentario] = useState('');
  const [mensajeros, setMensajeros] = useState<Usuario[]>([]);
  const [solicitantes, setSolicitantes] = useState<Usuario[]>([]); // ✅ Lista de solicitantes
  const [municipios, setMunicipios] = useState<Municipio[]>([]); // ✅ Lista de municipios

  // ✅ Cargar todo junto: listas Y encargo
  useEffect(() => {
    const loadAllData = async () => {
      if (!id) return;
      
      try {
        // 1. Primero cargar las listas
        const [mensajerosRes, solicitantesRes, municipiosRes] = await Promise.all([
          getMensajeros(),
          getSolicitantes(),
          getMunicipios(),
        ]);
        
        // ✅ Ordenar alfabéticamente
        const sortedMensajeros = mensajerosRes.data.sort((a, b) => 
          `${a.first_name} ${a.last_name}`.localeCompare(`${b.first_name} ${b.last_name}`, 'es')
        );
        const sortedSolicitantes = solicitantesRes.data.sort((a, b) => 
          `${a.first_name} ${a.last_name}`.localeCompare(`${b.first_name} ${b.last_name}`, 'es')
        );
        const sortedMunicipios = municipiosRes.data.sort((a, b) => 
          a.nombre.localeCompare(b.nombre, 'es')
        );
        
        setMensajeros(sortedMensajeros);
        setSolicitantes(sortedSolicitantes);
        setMunicipios(sortedMunicipios);

        // 2. Luego cargar el encargo
        const res = await getEncargoById(Number(id));
        const encargo = res.data;

        const esOtros = !TIPOS_MENSAJERIA.includes(encargo.mensajeria_enviada);
        const tieneHora = encargo.prioridad_hora !== 1;
        const tieneObs = !!encargo.observaciones;

        // 3. Establecer valores del formulario
        form.setFieldsValue({
          ...encargo,
          solicitante_id: encargo.solicitante?.id || encargo.solicitante_id,
          municipio_id: encargo.municipio?.id || encargo.municipio_id,
          mensajero_id: encargo.mensajero?.id || null,
          zona: encargo.zona || undefined,
          fecha_realizacion: encargo.fecha_realizacion || undefined,
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

    loadAllData();
  }, [id, form, navigate]);

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
      // ✅ NUEVO: Payload optimizado para NestJS
      const payload: any = {
        tipo_solicitud_id: 1,
        mensajeria_enviada: values.mensajeria_enviada === 'otros'
          ? values.otros_mensajeria
          : values.mensajeria_enviada,
        empresa: values.empresa,
        destinatario: values.destinatario,
        solicitante_id: values.solicitante_id,
        direccion: values.direccion,
        municipio_id: values.municipio_id,
        prioridad: values.prioridad,
        prioridad_hora: values.tiene_hora ? values.prioridad_hora : 1,
      };

      // ✅ Zona: enviar el valor o null si está vacío
      if (values.zona !== undefined && values.zona !== null && values.zona !== '') {
        payload.zona = values.zona;
      } else {
        payload.zona = null; // ✅ Enviar null para limpiar la zona
      }

      // ✅ Fecha: enviar el valor o null si está vacío
      if (values.fecha_realizacion) {
        payload.fecha_realizacion = values.fecha_realizacion;
      } else {
        payload.fecha_realizacion = null; // ✅ Enviar null para limpiar la fecha
      }

      // ✅ Observaciones: solo enviar si tiene valor
      if (values.tiene_observaciones && values.observaciones_text) {
        payload.observaciones = values.observaciones_text;
      }

      // ✅ Horas: solo enviar si tiene hora
      if (values.tiene_hora && values.hora_minima) {
        payload.hora_minima = `${values.hora_minima}:00`;
      }
      if (values.tiene_hora && values.prioridad_hora === 4 && values.hora_maxima) {
        payload.hora_maxima = `${values.hora_maxima}:00`;
      }

      // ✅ Mensajero: solo enviar si tiene permisos
      if (canAssignMensajero) {
        if (values.mensajero_id) {
          payload.mensajero_id = values.mensajero_id;
        } else {
          payload.mensajero_id = null; // ✅ Enviar null para desasignar mensajero
        }
      }

      await updateEncargo(Number(id), payload);
      message.success('Envío actualizado exitosamente');
      navigate('/dashboard/mensajeria');
    } catch (err: any) {
      // ✅ NUEVO: Manejo de errores mejorado
      if (err.response?.status === 403) {
        message.error('No tienes permiso para realizar esta acción');
      } else if (err.response?.status === 404) {
        message.error('Encargo no encontrado');
      } else {
        const msg = err.response?.data?.message || 'Error al actualizar el envío';
        message.error(msg);
      }
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
        <Form.Item name="estado" hidden>
          <Input />
        </Form.Item>
        <Form.Item name="reject_reason" hidden>
          <Input />
        </Form.Item>

        {/* ✅ Solicitante EDITABLE */}
        <Form.Item 
          label="Solicitante" 
          name="solicitante_id"
          rules={[{ required: true, message: 'Seleccione un solicitante' }]}
        >
          <Select 
            placeholder="Seleccione un solicitante"
            showSearch
            optionFilterProp="children"
            filterOption={(input, option) =>
              String(option?.children || '').toLowerCase().includes(input.toLowerCase())
            }
          >
            {solicitantes.map(s => (
              <Option key={s.id} value={s.id}>
                {s.first_name} {s.last_name}
              </Option>
            ))}
          </Select>
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
          <Select 
            onChange={handleMensajeriaChange}
            showSearch
            optionFilterProp="children"
            filterOption={(input, option) =>
              String(option?.children || '').toLowerCase().includes(input.toLowerCase())
            }
          >
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

        {/* ✅ NUEVO: Solo mostrar mensajero si tiene permisos */}
        {canAssignMensajero && (
          <Form.Item label="Mensajero (opcional)" name="mensajero_id">
            <Select 
              placeholder="Seleccione un mensajero" 
              allowClear
              showSearch
              optionFilterProp="children"
              filterOption={(input, option) =>
                String(option?.children || '').toLowerCase().includes(input.toLowerCase())
              }
            >
              {mensajeros.map(m => (
                <Option key={m.id} value={m.id}>
                  {m.first_name} {m.last_name}
                </Option>
              ))}
            </Select>
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

          {/* ✅ NUEVO: Zona ahora es opcional */}
          <Form.Item
            label="Zona (opcional)"
            name="zona"
            style={{ flex: 1 }}
            tooltip="Se obtendrá automáticamente del municipio si no se especifica"
          >
            <Select 
              placeholder="Seleccione zona" 
              allowClear
              showSearch
              filterOption={(input, option) =>
                String(option?.children)?.includes(input)
              }
            >
              {ZONAS.map(z => (
                <Option key={z} value={z}>{z}</Option>
              ))}
            </Select>
          </Form.Item>
        </div>

        <div style={{ display: 'flex', gap: 16 }}>
          {/* ✅ Municipio EDITABLE */}
          <Form.Item 
            label="Municipio" 
            name="municipio_id"
            style={{ flex: 1 }}
            rules={[{ required: true, message: 'Seleccione un municipio' }]}
          >
            <Select 
              placeholder="Seleccione municipio"
              showSearch
              optionFilterProp="children"
              filterOption={(input, option) =>
                String(option?.children || '').toLowerCase().includes(input.toLowerCase())
              }
            >
              {municipios.map(m => (
                <Option key={m.id} value={m.id}>
                  {m.nombre}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            label="Prioridad del encargo"
            name="prioridad"
            style={{ flex: 1 }}
          >
            <Select
              showSearch
              optionFilterProp="children"
              filterOption={(input, option) =>
                String(option?.children || '').toLowerCase().includes(input.toLowerCase())
              }
            >
              {PRIORIDADES.map(p => (
                <Option key={p.value} value={p.value}>{p.label}</Option>
              ))}
            </Select>
          </Form.Item>
        </div>

        {/* ✅ NUEVO: Fecha ahora es editable */}
        <Form.Item 
          label="Fecha de realización (opcional)" 
          name="fecha_realizacion"
          tooltip="Se calculará automáticamente según la prioridad si se deja vacío"
        >
          <Input type="date" />
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
              <Select 
                onChange={handleHoraPrioridadChange}
                showSearch
                optionFilterProp="children"
                filterOption={(input, option) =>
                  String(option?.children || '').toLowerCase().includes(input.toLowerCase())
                }
              >
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

            {isCoordinador && form.getFieldValue('estado') > 1 && (
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