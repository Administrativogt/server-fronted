// src/pages/mensajeria/PendingEncargosPage.tsx
import React, { useEffect, useState } from 'react';
import { Table, Button, Space, Tag, message, Modal, Input, Select, Tooltip } from 'antd';
import { InfoCircleOutlined, FlagFilled } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import {
  getPendingEncargos,
  deleteEncargo,
  rejectEncargo,
  reportIncidence,
  updateEncargo,
  getMensajeros,
  downloadEncargosExcel,
} from '../../api/encargos';
import type { Encargo, Usuario } from '../../types/encargo';
import CommentModal from './components/CommentModal';
import useAuthStore from '../../auth/useAuthStore'; // ✅ Importar

const { confirm } = Modal;
const { TextArea } = Input;
const { Option } = Select;

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

const PendingEncargosPage: React.FC = () => {
  const [encargos, setEncargos] = useState<Encargo[]>([]); // ✅ Corregido: solo un paréntesis
  const [loading, setLoading] = useState(true);
  const [commentModalOpen, setCommentModalOpen] = useState<{ open: boolean; encargoId: number | null }>({
    open: false,
    encargoId: null,
  });
  const [actionModal, setActionModal] = useState<{
    open: boolean;
    type: 'reject' | 'incidence' | null;
    encargoId: number | null;
    reason: string;
  }>({
    open: false,
    type: null,
    encargoId: null,
    reason: '',
  });
  const [exportModal, setExportModal] = useState(false);
  const [selectedMensajero, setSelectedMensajero] = useState<number | null>(null);
  const [mensajeros, setMensajeros] = useState<Usuario[]>([]);
  const navigate = useNavigate();
  
  // ✅ Obtener usuario actual para filtrar si es mensajero
  const userId = useAuthStore((state) => state.userId);
  const tipoUsuario = useAuthStore((state) => state.tipo_usuario);
  const isMensajero = tipoUsuario === 8;

  useEffect(() => {
    loadEncargos();
    if (!isMensajero) {
      getMensajeros()
        .then((res) => {
          const sorted = res.data.sort((a: Usuario, b: Usuario) =>
            `${a.first_name} ${a.last_name}`.localeCompare(`${b.first_name} ${b.last_name}`, 'es'),
          );
          setMensajeros(sorted);
        })
        .catch(() => {});
    }
  }, [userId, isMensajero]); // ✅ Agregar dependencias

  const loadEncargos = async () => {
    try {
      const res = await getPendingEncargos();
      // Estados activos: Pendiente (1), En proceso (2), Extraordinario (5) — igual que Django original
      const activeOnly = res.data.filter((e: Encargo) => [1, 2, 5].includes(e.estado));

      if (isMensajero && userId) {
        setEncargos(activeOnly.filter((e: Encargo) => e.mensajero?.id === userId));
      } else {
        setEncargos(activeOnly);
      }
    } catch (error) {
      console.error('Error al cargar encargos pendientes:', error);
      message.error('No se pudieron cargar los envíos pendientes');
    } finally {
      setLoading(false);
    }
  };

  const downloadExcel = async (mensajeroId: number) => {
    try {
      const encargoIds = encargos.map((e) => e.id);
      const response = await downloadEncargosExcel({ mensajeroId, encargoIds });
      const contentDisposition = response.headers['content-disposition'];
      let filename = 'Ruta-Pendientes.xlsx';
      if (contentDisposition) {
        const match = contentDisposition.match(/filename="?(.+)"?/);
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
    } catch (err: any) {
      message.error(err?.response?.data?.message || 'Error al descargar reporte');
    }
  };

  const handleExportExcel = () => {
    if (isMensajero && userId) {
      downloadExcel(userId);
    } else {
      setExportModal(true);
    }
  };

  const handleConfirmExport = async () => {
    if (!selectedMensajero) {
      message.warning('Por favor seleccione un mensajero');
      return;
    }
    await downloadExcel(selectedMensajero);
    setExportModal(false);
    setSelectedMensajero(null);
  };

  const handleStartDelivery = (id: number) => {
    confirm({
      title: '¿Iniciar entrega?',
      content: '¿Desea marcar este envío como "En proceso"?',
      okText: 'Sí, iniciar',
      okType: 'primary',
      cancelText: 'Cancelar',
      onOk: async () => {
        try {
          await updateEncargo(id, { estado: 2 } as any);
          message.success('Envío marcado como "En proceso"');
          loadEncargos();
        } catch (err: any) {
          message.error(err.response?.data?.message || 'Error al iniciar');
        }
      },
    });
  };

  const handleDelete = (id: number) => {
    confirm({
      title: '¿Eliminar envío?',
      content: 'Esta acción no se puede deshacer.',
      okText: 'Sí, eliminar',
      okType: 'danger',
      cancelText: 'Cancelar',
      onOk: async () => {
        try {
          await deleteEncargo(id);
          message.success('Envío eliminado correctamente');
          loadEncargos();
        } catch (err: any) {
          const msg = err.response?.data?.message || 'Error al eliminar el envío';
          message.error(msg);
        }
      },
    });
  };

  const handleReject = (id: number) => {
    setActionModal({ open: true, type: 'reject', encargoId: id, reason: '' });
  };

  const handleIncidence = (id: number) => {
    setActionModal({ open: true, type: 'incidence', encargoId: id, reason: '' });
  };

  const handleActionOk = async () => {
    if (!actionModal.encargoId || !actionModal.reason.trim()) {
      message.warning('Debe ingresar una razón');
      return;
    }

    try {
      if (actionModal.type === 'reject') {
        await rejectEncargo(actionModal.encargoId, actionModal.reason);
        message.success('Envío rechazado');
      } else if (actionModal.type === 'incidence') {
        await reportIncidence(actionModal.encargoId, actionModal.reason);
        message.success('Incidencia reportada');
      }
      loadEncargos();
      setActionModal({ open: false, type: null, encargoId: null, reason: '' });
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Error al procesar la acción');
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
      title: 'Mensajero', 
      key: 'mensajero',
      render: (_: any, record: Encargo) =>
        record.mensajero ? `${record.mensajero.first_name} ${record.mensajero.last_name}` : 'Sin asignar'
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
      width: 280,
      render: (_: any, record: Encargo) => (
        <Space size="small" wrap>
          {/* Botón Iniciar - Solo si está en estado Pendiente (1) y tiene mensajero asignado */}
          {record.estado === 1 && record.mensajero && (
            <Button 
              size="small" 
              type="primary"
              onClick={() => handleStartDelivery(record.id)}
            >
              🚀 Iniciar
            </Button>
          )}
          
          {!isMensajero && (
            <>
              <Button size="small" onClick={() => navigate(`/dashboard/mensajeria/editar/${record.id}`)}>
                Editar
              </Button>
              <Button size="small" danger onClick={() => handleDelete(record.id)}>
                Eliminar
              </Button>
            </>
          )}
          
          <Button size="small" type="primary" danger onClick={() => handleReject(record.id)}>
            Rechazar
          </Button>
          <Button size="small" type="dashed" onClick={() => handleIncidence(record.id)}>
            Incidencia
          </Button>
          <Button
            size="small"
            onClick={() => setCommentModalOpen({ open: true, encargoId: record.id })}
          >
            Comentarios
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: '16px 0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 style={{ margin: 0 }}>Envíos Pendientes</h2>
        <Space>
          {!isMensajero && (
            <Button type="primary" onClick={() => navigate('/dashboard/mensajeria/crear')}>
              Crear Envío
            </Button>
          )}
          <Button type="default" onClick={handleExportExcel} disabled={!encargos.length}>
            Exportar Excel
          </Button>
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
        rowClassName={(record: Encargo) =>
          record.observaciones ? 'encargo-row-with-observations' : ''
        }
        onRow={(record: Encargo) => ({
          title: record.observaciones ? `Observaciones: ${record.observaciones}` : undefined,
          style: record.observaciones ? { backgroundColor: 'rgba(0, 0, 255, 0.1)' } : {},
        })}
      />

      {/* Modal de comentarios */}
      {commentModalOpen.open && commentModalOpen.encargoId !== null && (
        <CommentModal
          open={true}
          encargoId={commentModalOpen.encargoId}
          onClose={() => setCommentModalOpen({ open: false, encargoId: null })}
        />
      )}

      {/* Modal para seleccionar mensajero al exportar (solo admin) */}
      <Modal
        title="Seleccione el mensajero"
        open={exportModal}
        onCancel={() => { setExportModal(false); setSelectedMensajero(null); }}
        onOk={handleConfirmExport}
        okText="Descargar"
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
          {mensajeros.map((m) => (
            <Option key={m.id} value={m.id}>
              {m.first_name} {m.last_name}
            </Option>
          ))}
        </Select>
      </Modal>

      {/* Modal de rechazo / incidencia */}
      {actionModal.open && (
        <Modal
          title={
            actionModal.type === 'reject'
              ? 'Razón del rechazo'
              : 'Reportar incidencia'
          }
          open={true}
          onCancel={() =>
            setActionModal({ open: false, type: null, encargoId: null, reason: '' })
          }
          onOk={handleActionOk}
          okText="Confirmar"
          cancelText="Cancelar"
        >
          <TextArea
            value={actionModal.reason}
            onChange={(e) =>
              setActionModal({ ...actionModal, reason: e.target.value })
            }
            placeholder={
              actionModal.type === 'reject'
                ? 'Ingrese la razón del rechazo...'
                : 'Describa la incidencia...'
            }
            rows={4}
          />
        </Modal>
      )}
    </div>
  );
};

export default PendingEncargosPage;