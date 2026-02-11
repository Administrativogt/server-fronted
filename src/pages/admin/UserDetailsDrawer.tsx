import React from 'react';
import {
  Drawer,
  Descriptions,
  Tag,
  Space,
  Divider,
} from 'antd';
import {
  CheckCircleOutlined,
  StopOutlined,
  UserOutlined,
  MailOutlined,
  PhoneOutlined,
  TeamOutlined,
  ApartmentOutlined,
  CrownOutlined,
} from '@ant-design/icons';
import { getTipoUsuarioLabel, getTipoUsuarioColor } from '../../types/user.types';
import type { User, UserArea, UserEquipo } from '../../types/user.types';
import dayjs from 'dayjs';

interface UserDetailsDrawerProps {
  open: boolean;
  user: User;
  onClose: () => void;
}

const UserDetailsDrawer: React.FC<UserDetailsDrawerProps> = ({ open, user, onClose }) => {
  return (
    <Drawer
      title={`Detalles de Usuario: ${user.username}`}
      placement="right"
      width={600}
      onClose={onClose}
      open={open}
    >
      <Divider orientation="left">Información General</Divider>
      
      <Descriptions column={1} bordered>
        <Descriptions.Item label={<><UserOutlined /> Username</>}>
          {user.username}
        </Descriptions.Item>
        <Descriptions.Item label="Nombre Completo">
          {user.first_name} {user.last_name}
        </Descriptions.Item>
        <Descriptions.Item label={<><MailOutlined /> Email</>}>
          {user.email}
        </Descriptions.Item>
        <Descriptions.Item label="Código de Empleado">
          {user.employee_code || '-'}
        </Descriptions.Item>
        <Descriptions.Item label={<><PhoneOutlined /> Extensión</>}>
          {user.extension || '-'}
        </Descriptions.Item>
      </Descriptions>

      <Divider orientation="left">Asignaciones</Divider>

      <Descriptions column={1} bordered>
        <Descriptions.Item label="Tipo de Usuario">
          <Tag color={getTipoUsuarioColor(user.tipo_usuario)}>
            {getTipoUsuarioLabel(user.tipo_usuario)}
          </Tag>
        </Descriptions.Item>
        <Descriptions.Item label={<><TeamOutlined /> Equipo</>}>
          {user.equipo?.nombre || '-'}
        </Descriptions.Item>
        <Descriptions.Item label={<><ApartmentOutlined /> Área</>}>
          {user.area?.nombre || '-'}
        </Descriptions.Item>
        <Descriptions.Item label="Jefe Directo">
          {user.jefe 
            ? `${user.jefe.first_name} ${user.jefe.last_name} (${user.jefe.username})`
            : '-'
          }
        </Descriptions.Item>
      </Descriptions>

      <Divider orientation="left">Grupos y Permisos</Divider>

      <Descriptions column={1} bordered>
        <Descriptions.Item label="Grupos">
          {user.groups && user.groups.length > 0 ? (
            <Space wrap>
              {user.groups.map(group => (
                <Tag key={group.id} color="blue">{group.name}</Tag>
              ))}
            </Space>
          ) : '-'}
        </Descriptions.Item>
        <Descriptions.Item label="Permisos Específicos">
          {user.permissions && user.permissions.length > 0 ? (
            <Space wrap>
              {user.permissions.map(perm => (
                <Tag key={perm.id} color="cyan">{perm.name}</Tag>
              ))}
            </Space>
          ) : '-'}
        </Descriptions.Item>
      </Descriptions>

      <Divider orientation="left">Permisos Especiales</Divider>

      <Descriptions column={1} bordered>
        <Descriptions.Item label={<><CrownOutlined /> Superadmin</>}>
          {user.is_superuser ? (
            <Tag color="red" icon={<CheckCircleOutlined />}>SÍ</Tag>
          ) : (
            <Tag color="default">NO</Tag>
          )}
        </Descriptions.Item>
        <Descriptions.Item label="Staff">
          {user.is_staff ? (
            <Tag color="orange" icon={<CheckCircleOutlined />}>SÍ</Tag>
          ) : (
            <Tag color="default">NO</Tag>
          )}
        </Descriptions.Item>
        <Descriptions.Item label="Enviar Cheques">
          {user.send_checks ? (
            <Tag color="green" icon={<CheckCircleOutlined />}>SÍ</Tag>
          ) : (
            <Tag color="default">NO</Tag>
          )}
        </Descriptions.Item>
      </Descriptions>

      <Divider orientation="left">Estado y Fechas</Divider>

      <Descriptions column={1} bordered>
        <Descriptions.Item label="Estado">
          {user.estado === 1 ? (
            <Tag color="green" icon={<CheckCircleOutlined />}>Activo</Tag>
          ) : (
            <Tag color="red" icon={<StopOutlined />}>Inactivo</Tag>
          )}
        </Descriptions.Item>
        <Descriptions.Item label="Fecha de Registro">
          {dayjs(user.date_joined).format('DD/MM/YYYY HH:mm')}
        </Descriptions.Item>
        <Descriptions.Item label="Último Inicio de Sesión">
          {user.last_login 
            ? dayjs(user.last_login).format('DD/MM/YYYY HH:mm')
            : 'Nunca'
          }
        </Descriptions.Item>
        <Descriptions.Item label="Cambio de Contraseña Requerido">
          {user.cambio_contrasena === 1 ? (
            <Tag color="orange">SÍ</Tag>
          ) : (
            <Tag color="default">NO</Tag>
          )}
        </Descriptions.Item>
      </Descriptions>
    </Drawer>
  );
};

export default UserDetailsDrawer;
