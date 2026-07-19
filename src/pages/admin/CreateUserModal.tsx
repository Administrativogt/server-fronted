import React, { useState } from 'react';
import {
  Modal,
  Form,
  Input,
  Select,
  Checkbox,
  message,
  Row,
  Col,
  Divider,
  DatePicker,
} from 'antd';
import dayjs, { type Dayjs } from 'dayjs';
import { createUser } from '../../api/users';
import { useReferenceData, invalidateReferenceData } from '../../hooks/useReferenceData';
import { TIPOS_USUARIO } from '../../types/user.types';
import type { CreateUserPayload } from '../../types/user.types';

const { Option } = Select;

interface CreateUserModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

/** Valores crudos del formulario (antes de mapear al payload de la API). */
interface CreateUserFormValues {
  username: string;
  password: string;
  confirmPassword: string;
  first_name: string;
  last_name: string;
  email: string;
  extension?: string;
  codigo_directorio?: string;
  tipo_usuario?: number;
  equipo_id?: number;
  area_id?: number;
  jefe_id?: number;
  groupIds?: number[];
  is_superuser?: boolean;
  is_staff?: boolean;
  send_checks?: boolean;
  fecha_ingreso?: Dayjs;
}

const CreateUserModal: React.FC<CreateUserModalProps> = ({ open, onClose, onSuccess }) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  // Datos de referencia compartidos y cacheados (áreas, equipos, grupos, jefes).
  const { areas, equipos, groups, usuarios } = useReferenceData(open);

  const handleSubmit = async (values: CreateUserFormValues) => {
    try {
      setLoading(true);

      const payload: CreateUserPayload = {
        username: values.username,
        password: values.password,
        first_name: values.first_name,
        last_name: values.last_name,
        email: values.email,
        extension: values.extension,
        codigo_directorio: values.codigo_directorio || undefined,
        tipo_usuario: values.tipo_usuario,
        equipo_id: values.equipo_id,
        area_id: values.area_id,
        jefe_id: values.jefe_id,
        groupIds: values.groupIds,
        is_superuser: values.is_superuser || false,
        is_staff: values.is_staff || false,
        send_checks: values.send_checks || false,
        estado: 1, // Por defecto activo
        fecha_ingreso: values.fecha_ingreso
          ? values.fecha_ingreso.format('YYYY-MM-DD')
          : undefined,
      };

      await createUser(payload);
      message.success('Usuario creado exitosamente');
      invalidateReferenceData(); // el nuevo usuario ya puede figurar como "Jefe"
      form.resetFields();
      onSuccess();
    } catch (error: any) {
      const errorMsg = error?.response?.data?.message || 'Error al crear usuario';
      message.error(errorMsg);
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    form.resetFields();
    onClose();
  };

  return (
    <Modal
      title="Crear Nuevo Usuario"
      open={open}
      onOk={() => form.submit()}
      onCancel={handleCancel}
      confirmLoading={loading}
      width={800}
      okText="Crear Usuario"
      cancelText="Cancelar"
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        initialValues={{
          is_superuser: false,
          is_staff: false,
          send_checks: false,
        }}
      >
        <Divider orientation="left">Información Básica</Divider>
        
        <Row gutter={16}>
          <Col xs={24} md={12}>
            <Form.Item
              name="username"
              label="Username"
              rules={[
                { required: true, message: 'Username es requerido' },
                { min: 3, message: 'Mínimo 3 caracteres' },
              ]}
            >
              <Input placeholder="usuario123" />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item
              name="password"
              label="Contraseña"
              rules={[
                { required: true, message: 'Contraseña es requerida' },
                { min: 8, message: 'Mínimo 8 caracteres' },
              ]}
            >
              <Input.Password placeholder="Contraseña segura" />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col xs={24} md={{ span: 12, offset: 12 }}>
            <Form.Item
              name="confirmPassword"
              label="Confirmar Contraseña"
              dependencies={['password']}
              rules={[
                { required: true, message: 'Por favor confirma la contraseña' },
                ({ getFieldValue }) => ({
                  validator(_, value) {
                    if (!value || getFieldValue('password') === value) {
                      return Promise.resolve();
                    }
                    return Promise.reject(new Error('Las contraseñas no coinciden'));
                  },
                }),
              ]}
            >
              <Input.Password placeholder="Repite la contraseña" />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col xs={24} md={12}>
            <Form.Item
              name="first_name"
              label="Nombre"
              rules={[{ required: true, message: 'Nombre es requerido' }]}
            >
              <Input placeholder="Juan" />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item
              name="last_name"
              label="Apellido"
              rules={[{ required: true, message: 'Apellido es requerido' }]}
            >
              <Input placeholder="Pérez" />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col xs={24} md={16}>
            <Form.Item
              name="email"
              label="Email"
              rules={[
                { required: true, message: 'Email es requerido' },
                { type: 'email', message: 'Email inválido' },
              ]}
            >
              <Input placeholder="usuario@example.com" />
            </Form.Item>
          </Col>
          <Col xs={12} md={8}>
            <Form.Item name="extension" label="Extensión">
              <Input placeholder="1234" />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col xs={24} md={12}>
            <Form.Item name="codigo_directorio" label="Código de Directorio (Sirvo)">
              <Input placeholder="Ej. ABC123" />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item
              name="fecha_ingreso"
              label="Fecha de Ingreso"
              tooltip="Fecha de contratación. Crea automáticamente el saldo de vacaciones del empleado (0 días) y habilita la acreditación anual por aniversario."
            >
              <DatePicker
                style={{ width: '100%' }}
                format="DD/MM/YYYY"
                placeholder="Seleccionar fecha"
                disabledDate={(current) => current && current > dayjs().endOf('day')}
              />
            </Form.Item>
          </Col>
        </Row>

        <Divider orientation="left">Asignaciones</Divider>

        <Row gutter={16}>
          <Col xs={24} md={12}>
            <Form.Item name="tipo_usuario" label="Tipo de Usuario">
              <Select
                placeholder="Seleccionar tipo"
                allowClear
                showSearch
                optionFilterProp="children"
                filterOption={(input, option) =>
                  String(option?.children || '').toLowerCase().includes(input.toLowerCase())
                }
              >
                {TIPOS_USUARIO.map((tipo) => (
                  <Option key={tipo.value} value={tipo.value}>
                    {tipo.label}
                  </Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item name="equipo_id" label="Equipo">
              <Select
                placeholder="Seleccionar equipo"
                allowClear
                showSearch
                optionFilterProp="children"
                filterOption={(input, option) =>
                  String(option?.children || '').toLowerCase().includes(input.toLowerCase())
                }
              >
                {equipos.map((equipo) => (
                  <Option key={equipo.id} value={equipo.id}>
                    {equipo.nombre}
                  </Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col xs={24} md={12}>
            <Form.Item name="area_id" label="Área">
              <Select
                placeholder="Seleccionar área"
                allowClear
                showSearch
                optionFilterProp="children"
                filterOption={(input, option) =>
                  String(option?.children || '').toLowerCase().includes(input.toLowerCase())
                }
              >
                {areas.map((area) => (
                  <Option key={area.id} value={area.id}>
                    {area.nombre}
                  </Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item name="jefe_id" label="Jefe Directo">
              <Select
                placeholder="Seleccionar jefe"
                allowClear
                showSearch
                optionFilterProp="children"
                filterOption={(input, option) =>
                  String(option?.children || '').toLowerCase().includes(input.toLowerCase())
                }
              >
                {usuarios.map((user) => (
                  <Option key={user.id} value={user.id}>
                    {user.first_name} {user.last_name} ({user.username})
                  </Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
        </Row>

        <Divider orientation="left">Grupos (Roles)</Divider>

        <Form.Item name="groupIds" label="Grupos (Roles)">
          <Select
            mode="multiple"
            placeholder="Seleccionar grupos"
            allowClear
            showSearch
            optionFilterProp="children"
            filterOption={(input, option) =>
              String(option?.children || '').toLowerCase().includes(input.toLowerCase())
            }
          >
            {groups.map((group) => (
              <Option key={group.id} value={group.id}>
                {group.name}
              </Option>
            ))}
          </Select>
        </Form.Item>

        <Divider orientation="left">Permisos Especiales</Divider>

        <Row gutter={16}>
          <Col xs={12} md={8}>
            <Form.Item name="is_superuser" valuePropName="checked">
              <Checkbox>Superadmin</Checkbox>
            </Form.Item>
          </Col>
          <Col xs={12} md={8}>
            <Form.Item name="is_staff" valuePropName="checked">
              <Checkbox>Staff</Checkbox>
            </Form.Item>
          </Col>
          <Col xs={12} md={8}>
            <Form.Item name="send_checks" valuePropName="checked">
              <Checkbox>Enviar Cheques</Checkbox>
            </Form.Item>
          </Col>
        </Row>
      </Form>
    </Modal>
  );
};

export default CreateUserModal;
