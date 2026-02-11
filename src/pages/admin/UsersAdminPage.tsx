import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Card,
  Table,
  Button,
  Input,
  Select,
  Space,
  Tag,
  message,
  Popconfirm,
  Tooltip,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  EyeOutlined,
  KeyOutlined,
  CheckCircleOutlined,
  StopOutlined,
  DownloadOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { useUserAdminPermissions } from '../../hooks/usePermissions';
import {
  getAllUsersIncludingInactive,
  deactivateUser,
  getAreas,
  getEquipos,
} from '../../api/users';
import { TIPOS_USUARIO, getTipoUsuarioLabel, getTipoUsuarioColor } from '../../types/user.types';
import type { User, UserFilters, UserArea, UserEquipo } from '../../types/user.types';
import CreateUserModal from './CreateUserModal';
import EditUserModal from './EditUserModal';
import ResetPasswordModal from './ResetPasswordModal';
import UserDetailsDrawer from './UserDetailsDrawer';

const { Search } = Input;
const { Option } = Select;

const UsersAdminPage: React.FC = () => {
  const navigate = useNavigate();
  const { canAccessUserAdmin } = useUserAdminPermissions();

  // Estados principales
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState<UserFilters>({});
  
  // Listas para filtros
  const [areas, setAreas] = useState<UserArea[]>([]);
  const [equipos, setEquipos] = useState<UserEquipo[]>([]);

  // Modales
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [resetPasswordModalOpen, setResetPasswordModalOpen] = useState(false);
  const [detailsDrawerOpen, setDetailsDrawerOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  // ============================================
  // PROTECCIÓN DE ACCESO
  // ============================================

  useEffect(() => {
    if (!canAccessUserAdmin) {
      message.error('No tienes permisos para acceder a esta sección');
      navigate('/dashboard');
    }
  }, [canAccessUserAdmin, navigate]);

  // ============================================
  // CARGA INICIAL
  // ============================================

  useEffect(() => {
    loadUsers();
    loadFilters();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const res = await getAllUsersIncludingInactive();
      setUsers(res.data);
    } catch (error) {
      message.error('Error al cargar usuarios');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const loadFilters = async () => {
    try {
      const [areasRes, equiposRes] = await Promise.all([
        getAreas(),
        getEquipos(),
      ]);
      setAreas(areasRes.data);
      setEquipos(equiposRes.data);
    } catch (error) {
      console.error('Error al cargar filtros:', error);
    }
  };

  // ============================================
  // FILTRADO
  // ============================================

  const filteredUsers = users.filter((user) => {
    let matches = true;

    // Búsqueda por texto (username, nombre, email)
    if (filters.search) {
      const search = filters.search.toLowerCase();
      matches = matches && (
        user.username.toLowerCase().includes(search) ||
        user.first_name.toLowerCase().includes(search) ||
        user.last_name.toLowerCase().includes(search) ||
        user.email.toLowerCase().includes(search)
      );
    }

    // Filtro por tipo de usuario
    if (filters.tipo_usuario !== undefined) {
      matches = matches && user.tipo_usuario === filters.tipo_usuario;
    }

    // Filtro por equipo
    if (filters.equipo_id !== undefined) {
      matches = matches && user.equipo?.id === filters.equipo_id;
    }

    // Filtro por área
    if (filters.area_id !== undefined) {
      matches = matches && user.area?.id === filters.area_id;
    }

    // Filtro por estado
    if (filters.estado !== undefined) {
      matches = matches && user.estado === filters.estado;
    }

    return matches;
  });

  // ============================================
  // ACCIONES
  // ============================================

  const handleDeactivateUser = async (userId: number) => {
    try {
      await deactivateUser(userId);
      message.success('Usuario desactivado exitosamente');
      loadUsers();
    } catch (error) {
      message.error('Error al desactivar usuario');
      console.error(error);
    }
  };

  const handleResetFilters = () => {
    setFilters({});
  };

  // ============================================
  // COLUMNAS DE TABLA
  // ============================================

  const columns: ColumnsType<User> = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 60,
      sorter: (a, b) => a.id - b.id,
    },
    {
      title: 'Username',
      dataIndex: 'username',
      key: 'username',
      sorter: (a, b) => a.username.localeCompare(b.username),
    },
    {
      title: 'Nombre Completo',
      key: 'fullName',
      render: (_, record) => `${record.first_name} ${record.last_name}`,
      sorter: (a, b) => a.first_name.localeCompare(b.first_name),
    },
    {
      title: 'Email',
      dataIndex: 'email',
      key: 'email',
      ellipsis: true,
    },
    {
      title: 'Tipo',
      dataIndex: 'tipo_usuario',
      key: 'tipo_usuario',
      render: (tipo) => (
        <Tag color={getTipoUsuarioColor(tipo)}>
          {getTipoUsuarioLabel(tipo)}
        </Tag>
      ),
      filters: TIPOS_USUARIO.map(t => ({ text: t.label, value: t.value })),
      onFilter: (value, record) => record.tipo_usuario === value,
    },
    {
      title: 'Equipo',
      dataIndex: 'equipo',
      key: 'equipo',
      render: (equipo: UserEquipo) => equipo?.nombre || '-',
    },
    {
      title: 'Área',
      dataIndex: 'area',
      key: 'area',
      render: (area: UserArea) => area?.nombre || '-',
    },
    {
      title: 'Estado',
      dataIndex: 'estado',
      key: 'estado',
      render: (estado) => (
        <Tag color={estado === 1 ? 'green' : 'red'} icon={estado === 1 ? <CheckCircleOutlined /> : <StopOutlined />}>
          {estado === 1 ? 'Activo' : 'Inactivo'}
        </Tag>
      ),
      filters: [
        { text: 'Activo', value: 1 },
        { text: 'Inactivo', value: 0 },
      ],
      onFilter: (value, record) => record.estado === value,
    },
    {
      title: 'Acciones',
      key: 'actions',
      fixed: 'right',
      width: 200,
      render: (_, record) => (
        <Space size="small">
          <Tooltip title="Ver detalles">
            <Button
              type="text"
              icon={<EyeOutlined />}
              size="small"
              onClick={() => {
                setSelectedUser(record);
                setDetailsDrawerOpen(true);
              }}
            />
          </Tooltip>
          <Tooltip title="Editar">
            <Button
              type="text"
              icon={<EditOutlined />}
              size="small"
              onClick={() => {
                setSelectedUser(record);
                setEditModalOpen(true);
              }}
            />
          </Tooltip>
          <Tooltip title="Resetear contraseña">
            <Button
              type="text"
              icon={<KeyOutlined />}
              size="small"
              onClick={() => {
                setSelectedUser(record);
                setResetPasswordModalOpen(true);
              }}
            />
          </Tooltip>
          {record.estado === 1 && (
            <Popconfirm
              title="¿Desactivar este usuario?"
              description="El usuario no podrá iniciar sesión"
              onConfirm={() => handleDeactivateUser(record.id)}
              okText="Sí, desactivar"
              cancelText="Cancelar"
            >
              <Tooltip title="Desactivar">
                <Button
                  type="text"
                  danger
                  icon={<DeleteOutlined />}
                  size="small"
                />
              </Tooltip>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  // ============================================
  // RENDER
  // ============================================

  return (
    <div style={{ padding: '24px' }}>
      <Card
        title="Administración de Usuarios"
        extra={
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setCreateModalOpen(true)}
          >
            Crear Usuario
          </Button>
        }
      >
        {/* FILTROS */}
        <Space direction="vertical" size="middle" style={{ width: '100%', marginBottom: 16 }}>
          <Space wrap>
            <Search
              placeholder="Buscar por username, nombre o email"
              allowClear
              style={{ width: 300 }}
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            />
            <Select
              placeholder="Tipo de usuario"
              allowClear
              style={{ width: 180 }}
              value={filters.tipo_usuario}
              onChange={(value) => setFilters({ ...filters, tipo_usuario: value })}
            >
              {TIPOS_USUARIO.map((tipo) => (
                <Option key={tipo.value} value={tipo.value}>
                  {tipo.label}
                </Option>
              ))}
            </Select>
            <Select
              placeholder="Equipo"
              allowClear
              style={{ width: 180 }}
              value={filters.equipo_id}
              onChange={(value) => setFilters({ ...filters, equipo_id: value })}
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
            <Select
              placeholder="Área"
              allowClear
              style={{ width: 180 }}
              value={filters.area_id}
              onChange={(value) => setFilters({ ...filters, area_id: value })}
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
            <Select
              placeholder="Estado"
              allowClear
              style={{ width: 120 }}
              value={filters.estado}
              onChange={(value) => setFilters({ ...filters, estado: value })}
            >
              <Option value={1}>Activo</Option>
              <Option value={0}>Inactivo</Option>
            </Select>
            <Button onClick={handleResetFilters}>Limpiar Filtros</Button>
          </Space>
        </Space>

        {/* TABLA */}
        <Table
          columns={columns}
          dataSource={filteredUsers}
          rowKey="id"
          loading={loading}
          pagination={{
            pageSize: 20,
            showSizeChanger: true,
            showTotal: (total) => `Total: ${total} usuarios`,
          }}
          scroll={{ x: 1200 }}
        />
      </Card>

      {/* MODALES */}
      <CreateUserModal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onSuccess={() => {
          setCreateModalOpen(false);
          loadUsers();
        }}
      />

      {selectedUser && (
        <>
          <EditUserModal
            open={editModalOpen}
            user={selectedUser}
            onClose={() => {
              setEditModalOpen(false);
              setSelectedUser(null);
            }}
            onSuccess={() => {
              setEditModalOpen(false);
              setSelectedUser(null);
              loadUsers();
            }}
          />

          <ResetPasswordModal
            open={resetPasswordModalOpen}
            user={selectedUser}
            onClose={() => {
              setResetPasswordModalOpen(false);
              setSelectedUser(null);
            }}
            onSuccess={() => {
              setResetPasswordModalOpen(false);
              setSelectedUser(null);
            }}
          />

          <UserDetailsDrawer
            open={detailsDrawerOpen}
            user={selectedUser}
            onClose={() => {
              setDetailsDrawerOpen(false);
              setSelectedUser(null);
            }}
          />
        </>
      )}
    </div>
  );
};

export default UsersAdminPage;
