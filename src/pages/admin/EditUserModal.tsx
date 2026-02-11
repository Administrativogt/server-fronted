import React, { useState, useEffect } from 'react';
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
} from 'antd';
import { updateUser, getAreas, getEquipos, getGroups, getPermissions, getAllUsers } from '../../api/users';
import { TIPOS_USUARIO } from '../../types/user.types';
import type { UpdateUserPayload, UserArea, UserEquipo, Group, Permission, User } from '../../types/user.types';

const { Option } = Select;

interface EditUserModalProps {
  open: boolean;
  user: User;
  onClose: () => void;
  onSuccess: () => void;
}

const EditUserModal: React.FC<EditUserModalProps> = ({ open, user, onClose, onSuccess }) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  // Listas para selects
  const [areas, setAreas] = useState<UserArea[]>([]);
  const [equipos, setEquipos] = useState<UserEquipo[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [usuarios, setUsuarios] = useState<User[]>([]);

  useEffect(() => {
    if (open && user) {
      loadData();
      populateForm();
    }
  }, [open, user]);

  const loadData = async () => {
    try {
      const [areasRes, equiposRes, groupsRes, permsRes, usersRes] = await Promise.all([
        getAreas(),
        getEquipos(),
        getGroups(),
        getPermissions(),
        getAllUsers(),
      ]);
      
      setAreas(areasRes.data.sort((a, b) => a.nombre.localeCompare(b.nombre)));
      setEquipos(equiposRes.data.sort((a, b) => a.nombre.localeCompare(b.nombre)));
      setGroups(groupsRes.data.sort((a, b) => a.name.localeCompare(b.name)));
      setPermissions(permsRes.data.sort((a, b) => a.name.localeCompare(b.name)));
      setUsuarios(usersRes.data.sort((a, b) => a.first_name.localeCompare(b.first_name)));
    } catch (error) {
      message.error('Error al cargar datos del formulario');
      console.error(error);
    }
  };

  const populateForm = () => {
    form.setFieldsValue({
      first_name: user.first_name,
      last_name: user.last_name,
      email: user.email,
      employee_code: user.employee_code,
      extension: user.extension,
      tipo_usuario: user.tipo_usuario,
      equipo_id: user.equipo?.id,
      area_id: user.area?.id,
      jefe_id: user.jefe?.id,
      groupIds: user.groups?.map(g => g.id) || [],
      permissionIds: user.permissions?.map(p => p.id) || [],
      is_superuser: user.is_superuser,
      is_staff: user.is_staff,
      send_checks: user.send_checks,
      estado: user.estado,
    });
  };

  const handleSubmit = async (values: any) => {
    try {
      setLoading(true);

      const payload: UpdateUserPayload = {
        first_name: values.first_name,
        last_name: values.last_name,
        email: values.email,
        employee_code: values.employee_code,
        extension: values.extension,
        tipo_usuario: values.tipo_usuario,
        equipo_id: values.equipo_id,
        area_id: values.area_id,
        jefe_id: values.jefe_id,
        groupIds: values.groupIds,
        permissionIds: values.permissionIds,
        is_superuser: values.is_superuser,
        is_staff: values.is_staff,
        send_checks: values.send_checks,
        estado: values.estado,
      };

      await updateUser(user.id, payload);
      message.success('Usuario actualizado exitosamente');
      onSuccess();
    } catch (error: any) {
      const errorMsg = error?.response?.data?.message || 'Error al actualizar usuario';
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
      title={`Editar Usuario: ${user.username}`}
      open={open}
      onOk={() => form.submit()}
      onCancel={handleCancel}
      confirmLoading={loading}
      width={800}
      okText="Guardar Cambios"
      cancelText="Cancelar"
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
      >
        <Divider orientation="left">Información Básica</Divider>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name="first_name"
              label="Nombre"
              rules={[{ required: true, message: 'Nombre es requerido' }]}
            >
              <Input placeholder="Juan" />
            </Form.Item>
          </Col>
          <Col span={12}>
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
          <Col span={12}>
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
          <Col span={6}>
            <Form.Item name="employee_code" label="Código Empleado">
              <Input placeholder="EMP001" />
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item name="extension" label="Extensión">
              <Input placeholder="1234" />
            </Form.Item>
          </Col>
        </Row>

        <Divider orientation="left">Asignaciones</Divider>

        <Row gutter={16}>
          <Col span={12}>
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
          <Col span={12}>
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
          <Col span={12}>
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
          <Col span={12}>
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
                {usuarios.filter(u => u.id !== user.id).map((u) => (
                  <Option key={u.id} value={u.id}>
                    {u.first_name} {u.last_name} ({u.username})
                  </Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
        </Row>

        <Divider orientation="left">Grupos y Permisos</Divider>

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

        <Form.Item name="permissionIds" label="Permisos Específicos">
          <Select
            mode="multiple"
            placeholder="Seleccionar permisos"
            allowClear
            showSearch
            optionFilterProp="children"
            filterOption={(input, option) =>
              String(option?.children || '').toLowerCase().includes(input.toLowerCase())
            }
          >
            {permissions.map((perm) => (
              <Option key={perm.id} value={perm.id}>
                {perm.name}
              </Option>
            ))}
          </Select>
        </Form.Item>

        <Divider orientation="left">Permisos Especiales y Estado</Divider>

        <Row gutter={16}>
          <Col span={6}>
            <Form.Item name="is_superuser" valuePropName="checked">
              <Checkbox>Superadmin</Checkbox>
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item name="is_staff" valuePropName="checked">
              <Checkbox>Staff</Checkbox>
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item name="send_checks" valuePropName="checked">
              <Checkbox>Enviar Cheques</Checkbox>
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item name="estado" label="Estado">
              <Select>
                <Option value={1}>Activo</Option>
                <Option value={0}>Inactivo</Option>
              </Select>
            </Form.Item>
          </Col>
        </Row>
      </Form>
    </Modal>
  );
};

export default EditUserModal;
