// src/pages/mensajeria/PendingEncargosPage.tsx
import React, { useEffect, useState } from 'react';
import { Table, Button, Space, Tag, message, Modal, Input } from 'antd';
import { useNavigate } from 'react-router-dom';
import {
  getPendingEncargos,
  deleteEncargo,
  rejectEncargo,
  reportIncidence,
} from '../../api/encargos';
import type { Encargo } from '../../types/encargo';
import CommentModal from './components/CommentModal';

const { confirm } = Modal;
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
  const navigate = useNavigate();

  useEffect(() => {
    loadEncargos();
  }, []);

  const loadEncargos = async () => {
    try {
      const res = await getPendingEncargos();
      setEncargos(res.data);
    } catch (error) {
      console.error('Error al cargar encargos pendientes:', error);
      message.error('No se pudieron cargar los envíos pendientes');
    } finally {
      setLoading(false);
    }
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
    { title: '#', dataIndex: 'id', key: 'id', width: 60 },
    { title: 'Solicitante', dataIndex: 'solicitante_nombre', key: 'solicitante' },
    { title: 'Destinatario', dataIndex: 'destinatario', key: 'destinatario' },
    { title: 'Empresa', dataIndex: 'empresa', key: 'empresa' },
    { title: 'Dirección', dataIndex: 'direccion', key: 'direccion' },
    { title: 'Zona', dataIndex: 'zona', key: 'zona', width: 80 },
    { title: 'Mensajero', dataIndex: 'mensajero_nombre', key: 'mensajero' },
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
          <Button size="small" onClick={() => navigate(`/dashboard/mensajeria/editar/${record.id}`)}>
            Editar
          </Button>
          <Button size="small" danger onClick={() => handleDelete(record.id)}>
            Eliminar
          </Button>
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
        <Button type="primary" onClick={() => navigate('/dashboard/mensajeria/crear')}>
          Crear Envío
        </Button>
      </div>

      <Table
        dataSource={encargos}
        columns={columns}
        rowKey="id"
        loading={loading}
        pagination={{ pageSize: 10 }}
        scroll={{ x: 1200 }}
        bordered
      />

      {/* Modal de comentarios */}
      {commentModalOpen.open && commentModalOpen.encargoId !== null && (
        <CommentModal
          open={true}
          encargoId={commentModalOpen.encargoId}
          onClose={() => setCommentModalOpen({ open: false, encargoId: null })}
        />
      )}

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