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
import { getTipoUsuarioLabel } from '../../types/user.types';
import type { User } from '../../types/user.types';
import { useReferenceData } from '../../hooks/useReferenceData';
import dayjs from 'dayjs';

interface UserDetailsDrawerProps {
  open: boolean;
  user: User;
  onClose: () => void;
}

const UserDetailsDrawer: React.FC<UserDetailsDrawerProps> = ({ open, user, onClose }) => {
  // El backend solo devuelve jefe_inmediato (ID); el nombre se resuelve
  // contra la lista de usuarios cacheada del módulo de administración.
  const { usuarios } = useReferenceData(open);
  const jefe =
    user.jefe ??
    (user.jefe_inmediato
      ? usuarios.find((u) => u.id === user.jefe_inmediato)
      : undefined);

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
        <Descriptions.Item label={<><PhoneOutlined /> Extensión</>}>
          {user.extension || '-'}
        </Descriptions.Item>
        <Descriptions.Item label="Código de Directorio (Sirvo)">
          {user.codigo_directorio || '-'}
        </Descriptions.Item>
      </Descriptions>

      <Divider orientation="left">Asignaciones</Divider>

      <Descriptions column={1} bordered>
        <Descriptions.Item label="Tipo de Usuario">
          <Tag>{getTipoUsuarioLabel(user.tipo_usuario)}</Tag>
        </Descriptions.Item>
        <Descriptions.Item label={<><TeamOutlined /> Equipo</>}>
          {user.equipo?.nombre || '-'}
        </Descriptions.Item>
        <Descriptions.Item label={<><ApartmentOutlined /> Área</>}>
          {user.area?.name || '-'}
        </Descriptions.Item>
        <Descriptions.Item label="Jefe Directo">
          {jefe
            ? `${jefe.first_name} ${jefe.last_name} (${jefe.username})`
            : '-'
          }
        </Descriptions.Item>
      </Descriptions>

      <Divider orientation="left">Grupos (Roles)</Divider>

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
        <Descriptions.Item label="Fecha de Ingreso a la Empresa">
          {user.fecha_ingreso
            ? dayjs(user.fecha_ingreso).format('DD/MM/YYYY')
            : '-'
          }
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
