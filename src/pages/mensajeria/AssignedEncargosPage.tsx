// src/pages/mensajeria/AssignedEncargosPage.tsx
import React, { useEffect, useState } from 'react';
import { Table, Button, Space, Tag, message, Modal } from 'antd';
import { updateEncargo, getAllEncargos } from '../../api/encargos';
import type { Encargo } from '../../types/encargo';
import useAuthStore from '../../auth/useAuthStore';
import { useMensajeriaPermissions } from '../../hooks/usePermissions';

const { confirm } = Modal;

const ESTADOS: Record<number, { label: string; color: string }> = {
  1: { label: 'Pendiente', color: 'orange' },
  2: { label: 'En proceso', color: 'blue' },
  3: { label: 'Entregado', color: 'green' },
  4: { label: 'No entregado', color: 'red' },
  5: { label: 'Extraordinario', color: 'volcano' },
  6: { label: 'Anulado', color: 'default' },
  7: { label: 'Rechazado', color: 'magenta' },
  8: { label: 'Extra entregado', color: 'cyan' },
};

const AssignedEncargosPage: React.FC = () => {
  const [encargos, setEncargos] = useState<Encargo[]>([]);
  const [loading, setLoading] = useState(true);
  const userId = useAuthStore((state) => state.userId);
  const tipoUsuario = useAuthStore((state) => state.tipo_usuario);
  const isMensajero = tipoUsuario === 8;
  const { isAdminMensajeria } = useMensajeriaPermissions(); // ✅ NUEVO: Usar hook de permisos

  useEffect(() => {
    loadEncargos();
  }, [userId, isMensajero, isAdminMensajeria]); // ✅ NUEVO: Actualizar dependencias

  const loadEncargos = async () => {
    try {
      const params: any = {};
      
      // ✅ Si es mensajero, filtrar por sus encargos desde el backend
      if (isMensajero && userId) {
        params.mensajero = userId;
      }
      
      const res = await getAllEncargos(params);

      if (isAdminMensajeria) {
        // ✅ Admin ve todos los envíos que tienen mensajero asignado
        setEncargos(res.data.filter(e => e.mensajero != null));
      } else {
        // ✅ Mensajero ya viene filtrado del backend
        setEncargos(res.data.filter(e => e.mensajero != null));
      }
    } catch {
      message.error('Error al cargar envíos asignados');
    } finally {
      setLoading(false);
    }
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
          await updateEncargo(id, { estado: 2 } as any); // Estado 2 = En proceso
          message.success('Envío marcado como "En proceso"');
          loadEncargos();
        } catch (err: any) {
          message.error(err.response?.data?.message || 'Error al iniciar');
        }
      },
    });
  };

  const handleDeliver = (id: number) => {
    confirm({
      title: '¿Confirmar entrega?',
      content: '¿Está seguro que desea marcar este envío como entregado?',
      okText: 'Sí, entregar',
      okType: 'primary',
      cancelText: 'Cancelar',
      onOk: async () => {
        try {
          await updateEncargo(id, { estado: 3 } as any);
          message.success('Envío marcado como entregado');
          loadEncargos();
        } catch (err: any) {
          message.error(err.response?.data?.message || 'Error al entregar');
        }
      },
    });
  };

  const columns = [
    { title: '#', dataIndex: 'id', key: 'id', width: 60 },
    ...(isAdminMensajeria ? [{
      title: 'Mensajero',
      key: 'mensajero',
      render: (_: any, record: Encargo) =>
        record.mensajero ? `${record.mensajero.first_name} ${record.mensajero.last_name}` : '-'
    }] : []),
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
      title: 'Fecha',
      dataIndex: 'fecha_realizacion',
      key: 'fecha',
      render: (date: string) => date?.split('T')[0] || '-',
    },
    {
      title: 'Estado',
      dataIndex: 'estado',
      key: 'estado',
      render: (estado: number) => {
        const config = ESTADOS[estado];
        return config ? <Tag color={config.color}>{config.label}</Tag> : estado;
      },
    },
    {
      title: 'Acciones',
      key: 'acciones',
      render: (_: any, record: Encargo) => (
        <Space size="small">
          {/* Estado 1 (Pendiente): Mostrar botón "Iniciar" */}
          {record.estado === 1 && (
            <Button 
              size="small" 
              type="default" 
              onClick={() => handleStartDelivery(record.id)}
            >
              🚀 Iniciar
            </Button>
          )}
          
          {/* Estado 2 (En proceso): Mostrar botón "Entregado" */}
          {record.estado === 2 && (
            <Button 
              size="small" 
              type="primary" 
              onClick={() => handleDeliver(record.id)}
            >
              ✅ Entregar
            </Button>
          )}
          
          {/* Estado 3 (Entregado): Mostrar mensaje completado */}
          {record.estado === 3 && (
            <Tag color="green">✓ Completado</Tag>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: '16px 0' }}>
      <h2 style={{ margin: 0, textAlign: 'center' }}>Envíos Asignados</h2>

      <Table
        dataSource={encargos}
        columns={columns}
        rowKey="id"
        loading={loading}
        pagination={{ pageSize: 10 }}
        scroll={{ x: 1000 }}
        bordered
      />

    </div>
  );
};

export default AssignedEncargosPage;
