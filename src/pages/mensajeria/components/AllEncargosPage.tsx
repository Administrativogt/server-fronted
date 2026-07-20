// src/pages/mensajeria/AllEncargosPage.tsx
import React, { useEffect, useState } from 'react';
import { Table, Button, Space, Tag, message, Modal, DatePicker, Select, Input, Tooltip, theme } from 'antd';
import {
  InfoCircleOutlined,
  FlagFilled,
  RocketOutlined,
  CheckCircleOutlined,
  EditOutlined,
  FlagOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { downloadEncargosExcel, getAllEncargos, sendComplaint, getMensajeros, updateEncargo } from '../../../api/encargos';
import type { Encargo, Usuario } from '../../../types/encargo';
import useAuthStore from '../../../auth/useAuthStore'; // ✅ Importar para obtener userId y tipo_usuario
import dayjs from 'dayjs';

const { RangePicker } = DatePicker;
const { Option } = Select;
const { TextArea } = Input;

const ESTADOS: Record<number, { label: string; color: string }> = {
  1: { label: 'Pendiente', color: 'orange' },
  2: { label: 'En proceso', color: 'blue' },
  3: { label: 'Entregado', color: 'green' },
  4: { label: 'No entregado', color: 'red' },
  5: { label: 'Extraordinario', color: 'volcano' },
  6: { label: 'Anulado', color: 'default' },
  7: { label: 'Rechazado', color: 'magenta' },
  8: { label: 'Extra Entregado', color: 'purple' },
};

const PRIORIDADES: Record<number, string> = {
  1: 'A',
  2: 'B',
  3: 'C',
  4: 'D',
};

// Rango por defecto: últimos 30 días. Sin esto la pantalla pide los ~29 mil
// encargos históricos completos y tarda varios segundos en cargar.
const DEFAULT_START = () => dayjs().subtract(30, 'day').format('YYYY-MM-DD');
const DEFAULT_END = () => dayjs().format('YYYY-MM-DD');

const AllEncargosPage: React.FC = () => {
  const [encargos, setEncargos] = useState<Encargo[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    startDate: DEFAULT_START() as string | null,
    endDate: DEFAULT_END() as string | null,
    estado: null as number | null,
    search: null as string | null,
  });
  const [complaintModal, setComplaintModal] = useState<{ open: boolean; encargoId: number | null }>({
    open: false,
    encargoId: null,
  });
  const [complaintText, setComplaintText] = useState('');
  const [complaintPassword, setComplaintPassword] = useState('');
  
  // ✅ NUEVO: Modal para seleccionar mensajero antes de exportar Excel
  const [exportModal, setExportModal] = useState(false);
  const [selectedMensajero, setSelectedMensajero] = useState<number | null>(null);
  const [mensajeros, setMensajeros] = useState<Usuario[]>([]);
  
  const navigate = useNavigate();
  const { token } = theme.useToken(); // ✅ Tokens del tema (claro/oscuro)

  // ✅ Obtener usuario actual para filtrar si es mensajero
  const userId = useAuthStore((state) => state.userId);
  const tipoUsuario = useAuthStore((state) => state.tipo_usuario); // ✅ CORREGIDO: acceso directo
  const isMensajero = tipoUsuario === 8;

  // ✅ Cargar mensajeros al inicio
  useEffect(() => {
    const loadMensajeros = async () => {
      try {
        const res = await getMensajeros();
        // ✅ Ordenar alfabéticamente
        const sorted = res.data.sort((a, b) => 
          `${a.first_name} ${a.last_name}`.localeCompare(`${b.first_name} ${b.last_name}`, 'es')
        );
        setMensajeros(sorted);
      } catch (error) {
        console.error('Error al cargar mensajeros:', error);
      }
    };
    loadMensajeros();
  }, []);

  // ✅ Cargar datos dentro del useEffect
  useEffect(() => {
    const loadEncargos = async () => {
      try {
        const params: any = {
          start: filters.startDate || undefined,
          end: filters.endDate || undefined,
          search: filters.search || undefined,
          estados: filters.estado ? [filters.estado] : undefined,
        };

        // ✅ Si es mensajero, SIEMPRE filtrar por sus propios encargos
        if (isMensajero && userId) {
          params.mensajero = userId;
        }
        
        const res = await getAllEncargos(params);
        setEncargos(res.data);
      } catch {
        message.error('Error al cargar los envíos');
      } finally {
        setLoading(false);
      }
    };

    loadEncargos();
  }, [filters, isMensajero, userId]); // ✅ Dependencias correctas

  const handleFilterChange = (key: keyof typeof filters, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleDateChange = (dates: any) => {
    if (dates && dates.length === 2) {
      const start = dates[0]?.format('YYYY-MM-DD') || null;
      const end = dates[1]?.format('YYYY-MM-DD') || null;
      setFilters(prev => ({ ...prev, startDate: start, endDate: end }));
    } else {
      setFilters(prev => ({ ...prev, startDate: null, endDate: null }));
    }
  };

  const handleResetFilters = () => {
    setFilters({ startDate: DEFAULT_START(), endDate: DEFAULT_END(), estado: null, search: null });
  };

  // Asignar mensajero directo desde la celda de la tabla
  const handleAssignMensajero = async (encargoId: number, mensajeroId: number) => {
    try {
      await updateEncargo(encargoId, { mensajero_id: mensajeroId });
      message.success('Mensajero asignado');
      setFilters(prev => ({ ...prev })); // dispara la recarga de la lista
    } catch {
      message.error('No se pudo asignar el mensajero');
    }
  };

  const handleStartDelivery = (id: number) => {
    Modal.confirm({
      title: '¿Iniciar entrega?',
      content: '¿Desea marcar este envío como "En proceso"?',
      okText: 'Sí, iniciar',
      okType: 'primary',
      cancelText: 'Cancelar',
      onOk: async () => {
        try {
          await updateEncargo(id, { estado: 2 } as any);
          message.success('Envío marcado como "En proceso"');
          const params: any = {
            start: filters.startDate || undefined,
            end: filters.endDate || undefined,
            search: filters.search || undefined,
            estados: filters.estado ? [filters.estado] : undefined,
          };
          if (isMensajero && userId) {
            params.mensajero = userId;
          }
          const res = await getAllEncargos(params);
          setEncargos(res.data);
        } catch (err: any) {
          message.error(err.response?.data?.message || 'Error al iniciar');
        }
      },
    });
  };
  
  const handleDeliver = (id: number) => {
    Modal.confirm({
      title: '¿Confirmar entrega?',
      content: '¿Está seguro que desea marcar este envío como entregado?',
      okText: 'Sí, entregar',
      okType: 'primary',
      cancelText: 'Cancelar',
      onOk: async () => {
        try {
          await updateEncargo(id, { estado: 3 } as any);
          message.success('Envío marcado como entregado');
          const params: any = {
            start: filters.startDate || undefined,
            end: filters.endDate || undefined,
            search: filters.search || undefined,
            estados: filters.estado ? [filters.estado] : undefined,
          };
          if (isMensajero && userId) {
            params.mensajero = userId;
          }
          const res = await getAllEncargos(params);
          setEncargos(res.data);
        } catch (err: any) {
          message.error(err.response?.data?.message || 'Error al entregar');
        }
      },
    });
  };

  const handleComplaint = (id: number) => {
    setComplaintModal({ open: true, encargoId: id });
  };

  const handleComplaintSubmit = async () => {
    if (!complaintModal.encargoId || !complaintText.trim()) {
      message.warning('Debe ingresar un reclamo');
      return;
    }
    if (!complaintPassword.trim()) {
      message.warning('Debe ingresar su contraseña de correo');
      return;
    }
    try {
      await sendComplaint(complaintModal.encargoId, complaintText, complaintPassword);
      message.success('Reclamo enviado por email exitosamente');
      setComplaintModal({ open: false, encargoId: null });
      setComplaintText('');
      setComplaintPassword('');
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Las credenciales ingresadas están incorrectas');
    }
  };

  // ❌ ELIMINADO: handleRegisterEmail ya no es necesario

  // ✅ Abrir modal para seleccionar mensajero
  const handleExportExcel = () => {
    setExportModal(true);
  };

  // ✅ NUEVO: Exportar con mensajero seleccionado
  const handleConfirmExport = async () => {
    if (!selectedMensajero) {
      message.warning('Por favor seleccione un mensajero');
      return;
    }

    try {
      // ✅ Exportar con filtros + mensajero
      const response = await downloadEncargosExcel({
        mensajeroId: selectedMensajero,
        type: 2, // Todos los pendientes/en proceso
        startDate: filters.startDate || undefined,
        endDate: filters.endDate || undefined,
      });
      
      // ✅ Extraer nombre del archivo del header si está disponible
      const contentDisposition = response.headers['content-disposition'];
      let filename = 'Reporte-Mensajeria.xlsx';
      
      if (contentDisposition) {
        const match = contentDisposition.match(/filename="?([^";]+)"?/);
        if (match) filename = match[1];
      }
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      message.success('Reporte descargado exitosamente');
      
      // Cerrar modal y limpiar selección
      setExportModal(false);
      setSelectedMensajero(null);
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Error al descargar reporte';
      message.error(msg);
    }
  };

  const columns = [
    {
      title: '#',
      dataIndex: 'id',
      key: 'id',
      width: 80,
      render: (_: any, record: Encargo, index: number) => (
        <Space size={4}>
          <span>{index + 1}</span>
          <Tooltip title={`Creado: ${new Date(record.fecha_creacion).toLocaleString('es-GT')}`}>
            <InfoCircleOutlined style={{ color: '#f5222d', fontSize: 12, cursor: 'pointer' }} />
          </Tooltip>
          {record.razon_extra && (
            <Tooltip title={`Comentario: ${record.razon_extra}`}>
              <FlagFilled style={{ color: '#f5222d', fontSize: 12, cursor: 'pointer' }} />
            </Tooltip>
          )}
        </Space>
      ),
    },
    // ✅ CORREGIDO: Usar relaciones correctas del tipo Encargo
    { 
      title: 'Solicitante', 
      key: 'solicitante',
      render: (_: any, record: Encargo) => 
        record.solicitante ? `${record.solicitante.first_name} ${record.solicitante.last_name}` : '-'
    },
    { title: 'Destinatario', dataIndex: 'destinatario', key: 'destinatario' },
    { title: 'Empresa', dataIndex: 'empresa', key: 'empresa' },
    { title: 'Dirección', dataIndex: 'direccion', key: 'direccion' },
    { title: 'Zona', dataIndex: 'zona', key: 'zona', width: 80 },
    {
      title: 'Mensajería enviada',
      dataIndex: 'mensajeria_enviada',
      key: 'mensajeria_enviada',
      render: (v: string) => v || '—',
    },
    {
      title: 'Mensajero',
      key: 'mensajero',
      render: (_: any, record: Encargo) => {
        if (record.mensajero) {
          return `${record.mensajero.first_name} ${record.mensajero.last_name}`;
        }
        // Los mensajeros no asignan; admins/coordinadores asignan aquí mismo
        if (isMensajero) return 'Sin asignar';
        return (
          <Select
            placeholder="Asignar…"
            size="small"
            style={{ minWidth: 160 }}
            showSearch
            optionFilterProp="children"
            onChange={(value: number) => handleAssignMensajero(record.id, value)}
          >
            {mensajeros.map((m) => (
              <Option key={m.id} value={m.id}>
                {m.first_name} {m.last_name}
              </Option>
            ))}
          </Select>
        );
      }
    },
    {
      title: 'Prioridad',
      dataIndex: 'prioridad',
      key: 'prioridad',
      width: 100,
      render: (p: number) => PRIORIDADES[p] || p,
    },
    {
      title: 'Fecha',
      dataIndex: 'fecha_realizacion',
      key: 'fecha',
      width: 120,
      render: (date: string) => date.split('T')[0],
    },
    {
      title: 'Estado',
      dataIndex: 'estado',
      key: 'estado',
      width: 120,
      render: (estado: number) => {
        const config = ESTADOS[estado];
        return config ? <Tag color={config.color}>{config.label}</Tag> : estado;
      },
    },
    {
      title: 'Acciones',
      key: 'acciones',
      width: 150,
      render: (_: any, record: Encargo) => (
        <Space size="small" wrap>
          {/* Iniciar - Estado Pendiente (1): mensajero solo ve el suyo, admin ve todos */}
          {record.estado === 1 && (!isMensajero || record.mensajero?.id === userId) && (
            <Tooltip title="Iniciar entrega">
              <Button
                size="small"
                type="primary"
                icon={<RocketOutlined />}
                onClick={() => handleStartDelivery(record.id)}
              />
            </Tooltip>
          )}

          {/* Entregar - Estado En proceso (2): mensajero solo ve el suyo, admin ve todos */}
          {record.estado === 2 && (!isMensajero || record.mensajero?.id === userId) && (
            <Tooltip title="Marcar como entregado">
              <Button
                size="small"
                type="primary"
                icon={<CheckCircleOutlined />}
                onClick={() => handleDeliver(record.id)}
              />
            </Tooltip>
          )}

          {/* Botones de admin */}
          {!isMensajero && (
            <>
              <Tooltip title="Editar">
                <Button
                  size="small"
                  icon={<EditOutlined />}
                  onClick={() => navigate(`/dashboard/mensajeria/editar/${record.id}`)}
                />
              </Tooltip>
              {record.estado !== 3 && (
                <Tooltip title="Enviar reclamo">
                  <Button size="small" type="dashed" icon={<FlagOutlined />} onClick={() => handleComplaint(record.id)} />
                </Tooltip>
              )}
            </>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: '16px 0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 style={{ margin: 0 }}>{isMensajero ? 'Mis Envíos' : 'Todos los Envíos'}</h2>
        <Space>
          {!isMensajero && (
            <Button type="primary" onClick={() => navigate('/dashboard/mensajeria/crear')}>
              Crear Envío
            </Button>
          )}
          <Button type="default" onClick={handleExportExcel}>
            Exportar Excel
          </Button>
          {/* ❌ ELIMINADO: Botón "Registrar Email" ya no es necesario en NestJS */}
        </Space>
      </div>

      {/* Filtros */}
      <div style={{ marginBottom: 16, padding: '16px', background: token.colorFillAlter, border: `1px solid ${token.colorBorderSecondary}`, borderRadius: 8 }}>
        <Space wrap>
          <RangePicker
            value={[
              filters.startDate ? dayjs(filters.startDate) : null,
              filters.endDate ? dayjs(filters.endDate) : null,
            ]}
            onChange={handleDateChange}
          />
          <Select
            placeholder="Filtrar por estado"
            allowClear
            value={filters.estado || undefined}
            onChange={(value) => handleFilterChange('estado', value)}
            style={{ width: 180 }}
            showSearch
            optionFilterProp="children"
            filterOption={(input, option) =>
              String(option?.children || '').toLowerCase().includes(input.toLowerCase())
            }
          >
            {Object.entries(ESTADOS).map(([key, value]) => (
              <Option key={key} value={parseInt(key)}>{value.label}</Option>
            ))}
          </Select>
          <Input.Search
            placeholder="Buscar por solicitante, empresa..."
            allowClear
            style={{ width: 240 }}
            onSearch={(value) => handleFilterChange('search', value || null)}
            onChange={(e) => { if (!e.target.value) handleFilterChange('search', null); }}
          />
          <Button onClick={handleResetFilters}>Reset</Button>
        </Space>
      </div>

      <Table
        dataSource={encargos}
        columns={columns}
        rowKey="id"
        loading={loading}
        pagination={{ pageSize: 10 }}
        scroll={{ x: 1200, y: 500 }}
        bordered
        onRow={(record: Encargo) => ({
          title: record.observaciones ? `Observaciones: ${record.observaciones}` : undefined,
          style: record.observaciones ? { backgroundColor: 'rgba(0, 0, 255, 0.1)' } : {},
        })}
      />

      {/* Modal de reclamo */}
      <Modal
        title="Enviar Reclamo"
        open={complaintModal.open}
        onCancel={() => {
          setComplaintModal({ open: false, encargoId: null });
          setComplaintText('');
          setComplaintPassword('');
        }}
        onOk={handleComplaintSubmit}
        okText="Enviar Reclamo"
        cancelText="Cancelar"
      >
        <p style={{ marginBottom: 12, color: '#666' }}>
          El reclamo será enviado desde su correo personal al coordinador de mensajería.
        </p>
        <TextArea
          value={complaintText}
          onChange={(e) => setComplaintText(e.target.value)}
          placeholder="Ingrese el motivo de su reclamo..."
          rows={4}
          maxLength={250}
          showCount
          style={{ marginBottom: 12 }}
        />
        <Input.Password
          value={complaintPassword}
          onChange={(e) => setComplaintPassword(e.target.value)}
          placeholder="Ingrese su contraseña de correo"
        />
      </Modal>

      {/* ✅ NUEVO: Modal para seleccionar mensajero antes de exportar */}
      <Modal
        title="Escoga mensajero:"
        open={exportModal}
        onCancel={() => {
          setExportModal(false);
          setSelectedMensajero(null);
        }}
        onOk={handleConfirmExport}
        okText="Crear"
        cancelText="Cancelar"
      >
        <Select
          style={{ width: '100%' }}
          placeholder="Seleccione un mensajero"
          value={selectedMensajero}
          onChange={(value) => setSelectedMensajero(value)}
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
      </Modal>
    </div>
  );
};

export default AllEncargosPage;