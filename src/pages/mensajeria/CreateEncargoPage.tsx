// src/pages/mensajeria/CreateEncargoPage.tsx
import React, { useEffect, useState } from 'react';
import { Form, Input, Select, Checkbox, Button, message, Space, Card, Alert } from 'antd';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import { createEncargo, getSolicitantes, getMunicipios, getMensajeros } from '../../api/encargos';
import type { Usuario, Municipio, EncargoFormValues } from '../../types/encargo';
import { useMensajeriaPermissions } from '../../hooks/usePermissions';
import useAuthStore from '../../auth/useAuthStore'; // ✅ Importar

const { Option } = Select;

const TIPOS_MENSAJERIA = [
  { value: 'enviar factura', label: 'Enviar Factura' },
  { value: 'recoger factura', label: 'Recoger Factura' },
  { value: 'enviar sobre', label: 'Enviar Sobre' },
  { value: 'recoger sobre', label: 'Recoger Sobre' },
  { value: 'recoger cheque', label: 'Recoger Cheque' },
  { value: 'otros', label: 'Otros' },
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

const ZONAS = Array.from({ length: 25 }, (_, i) => i + 1); // Zonas 1 a 25

const CreateEncargoPage: React.FC = () => {
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const { canAssignMensajero } = useMensajeriaPermissions(); // ✅ NUEVO: Hook de permisos
  const tipoUsuario = useAuthStore((state) => state.tipo_usuario); // ✅ Obtener tipo de usuario
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [municipios, setMunicipios] = useState<Municipio[]>([]);
  const [mensajeros, setMensajeros] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(false);
  const [showHora, setShowHora] = useState(false);
  const [showObservaciones, setShowObservaciones] = useState(false);
  const [showOtros, setShowOtros] = useState(false);

  // ✅ Bloquear acceso a mensajeros
  useEffect(() => {
    if (tipoUsuario === 8) {
      message.error('Los mensajeros no tienen permiso para crear envíos');
      navigate('/dashboard/mensajeria');
    }
  }, [tipoUsuario, navigate]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // ✅ NUEVO: Usar endpoints especializados
        const [usuariosRes, municipiosRes, mensajerosRes] = await Promise.all([
          getSolicitantes(), // Endpoint nuevo: solo activos, ordenados alfabéticamente
          getMunicipios(),
          getMensajeros(), // Endpoint nuevo: solo mensajeros activos
        ]);
        
        // ✅ Ordenar alfabéticamente por nombre
        const sortedUsuarios = usuariosRes.data.sort((a, b) => 
          `${a.first_name} ${a.last_name}`.localeCompare(`${b.first_name} ${b.last_name}`, 'es')
        );
        const sortedMunicipios = municipiosRes.data.sort((a, b) => 
          a.nombre.localeCompare(b.nombre, 'es')
        );
        const sortedMensajeros = mensajerosRes.data.sort((a, b) => 
          `${a.first_name} ${a.last_name}`.localeCompare(`${b.first_name} ${b.last_name}`, 'es')
        );
        
        setUsuarios(sortedUsuarios);
        setMunicipios(sortedMunicipios);
        setMensajeros(sortedMensajeros);
      } catch (error) {
        console.error('Error al cargar datos:', error);
        message.error('Error al cargar datos iniciales');
      }
    };
    fetchData();
  }, []);

  const today = dayjs().format('YYYY-MM-DD');
  const showLateAlert = new Date().getHours() >= 9;

  const handleMensajeriaChange = (value: string) => {
    setShowOtros(value === 'otros');
  };

  const handleHoraPrioridadChange = (value: number) => {
    if (value !== 4) {
      form.setFieldsValue({ hora_maxima: undefined });
    }
  };

  const onFinish = async (values: any) => {
    setLoading(true);
    try {
      // ✅ Extraer solo los campos necesarios
      const {
        mensajeria_enviada,
        empresa,
        destinatario,
        solicitante_id,
        direccion,
        zona,
        municipio_id,
        prioridad,
        tiene_hora,
        prioridad_hora,
        hora_minima,
        hora_maxima,
        tiene_observaciones,
        observaciones_text,
        otros_mensajeria,
        mensajero_id,
        fecha_realizacion,
      } = values;

      // ✅ NUEVO: Construir payload optimizado para NestJS
      const payload: EncargoFormValues = {
        tipo_solicitud_id: 1,
        mensajeria_enviada: mensajeria_enviada === 'otros' ? otros_mensajeria : mensajeria_enviada,
        empresa,
        destinatario,
        solicitante_id,
        direccion,
        municipio_id,
        prioridad,
        prioridad_hora: tiene_hora ? prioridad_hora : 1,
        
        // ✅ NUEVO: Solo enviar si tienen valor (campos opcionales)
        ...(zona && { zona }),
        ...(fecha_realizacion && { fecha_realizacion }), // Se calcula automáticamente si no se envía
        ...(tiene_observaciones && observaciones_text && { observaciones: observaciones_text }),
        ...(tiene_hora && hora_minima && { hora_minima: `${hora_minima}:00` }),
        ...(tiene_hora && prioridad_hora === 4 && hora_maxima && { hora_maxima: `${hora_maxima}:00` }),
        
        // ✅ NUEVO: Solo enviar mensajero si tiene permisos
        ...(canAssignMensajero && mensajero_id && { mensajero_id }),
      };

      await createEncargo(payload);
      message.success('Envío creado exitosamente');
      navigate('/dashboard/mensajeria');
    } catch (error: any) {
      console.error('Error al crear encargo:', error);
      
      // ✅ NUEVO: Manejo de errores mejorado
      if (error.response?.status === 403) {
        message.error('No tienes permiso para asignar mensajero. Contacta a un administrador.');
      } else if (error.response?.status === 404) {
        message.error('Solicitante, municipio o tipo de solicitud no encontrado');
      } else {
        const msg = error.response?.data?.message || 'Error al crear el envío';
        message.error(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card title="Crear Solicitud de Envío" style={{ maxWidth: 900, margin: '0 auto' }}>
      {showLateAlert && (
        <Alert
          message="Considere que por ser más de las 9 A.M su solicitud se realizará el día de mañana o siguiente día hábil"
          type="warning"
          showIcon
          closable
          style={{ marginBottom: 16 }}
        />
      )}

      <Form form={form} layout="vertical" onFinish={onFinish}>
        <Form.Item name="tipo_solicitud_id" initialValue={1} hidden>
          <Input />
        </Form.Item>

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
            {usuarios.map(u => (
              <Option key={u.id} value={u.id}>
                {u.first_name} {u.last_name}
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
              <Option key={t.value} value={t.value}>
                {t.label}
              </Option>
            ))}
          </Select>
        </Form.Item>

        {showOtros && (
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
              placeholder="Se obtendrá del municipio" 
              allowClear
              showSearch
              filterOption={(input, option) =>
                String(option?.children)?.includes(input)
              }
            >
              {ZONAS.map(z => (
                <Option key={z} value={z}>
                  {z}
                </Option>
              ))}
            </Select>
          </Form.Item>
        </div>

        <div style={{ display: 'flex', gap: 16 }}>
          <Form.Item
            label="Municipio"
            name="municipio_id"
            style={{ flex: 1 }}
            rules={[{ required: true, message: 'Seleccione municipio' }]}
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
            initialValue={1}
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
                <Option key={p.value} value={p.value}>
                  {p.label}
                </Option>
              ))}
            </Select>
          </Form.Item>
        </div>

        {/* ✅ NUEVO: Fecha ahora es opcional y se puede editar */}
        <Form.Item 
          label="Fecha de realización (opcional)" 
          name="fecha_realizacion"
          tooltip="Se calculará automáticamente según la prioridad si no se especifica"
        >
          <Input 
            type="date" 
            placeholder="Se calculará según prioridad"
          />
        </Form.Item>

        <Form.Item name="tiene_hora" valuePropName="checked">
          <Checkbox onChange={(e) => setShowHora(e.target.checked)}>
            ¿Tendrá hora de entrega?
          </Checkbox>
        </Form.Item>

        {showHora && (
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
                  <Option key={h.value} value={h.value}>
                    {h.label}
                  </Option>
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
          <Checkbox onChange={(e) => setShowObservaciones(e.target.checked)}>
            ¿Agregar observaciones?
          </Checkbox>
        </Form.Item>

        {showObservaciones && (
          <Form.Item
            label="Observaciones"
            name="observaciones_text"
            rules={[{ required: true, message: 'Ingrese las observaciones' }]}
          >
            <Input.TextArea rows={3} placeholder="Inserte observaciones" />
          </Form.Item>
        )}

        <Form.Item>
          <Space>
            <Button type="primary" htmlType="submit" loading={loading}>
              Enviar
            </Button>
            <Button onClick={() => navigate('/dashboard/mensajeria')}>
              Regresar
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </Card>
  );
};

export default CreateEncargoPage;