// src/pages/mensajeria/DeliveredEncargosPage.tsx
import React, { useEffect, useState } from 'react';
import { Table, Button, Space, Tag, message, DatePicker } from 'antd';
import { useNavigate } from 'react-router-dom';
import { getAllEncargos, downloadEncargosExcel } from '../../api/encargos';
import type { Encargo } from '../../types/encargo';
import useAuthStore from '../../auth/useAuthStore'; // ✅ Importar

const { RangePicker } = DatePicker;

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

const DeliveredEncargosPage: React.FC = () => {
  const [encargos, setEncargos] = useState<Encargo[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    startDate: null as string | null,
    endDate: null as string | null,
  });
  const navigate = useNavigate();
  
  // ✅ Obtener usuario actual para filtrar si es mensajero
  const userId = useAuthStore((state) => state.userId);
  const tipoUsuario = useAuthStore((state) => state.tipo_usuario);
  const isMensajero = tipoUsuario === 8;

  useEffect(() => {
    loadEncargos();
  }, [filters, userId, isMensajero]); // ✅ Agregar dependencias

  const loadEncargos = async () => {
    try {
      const params: any = {};
      
      if (filters.startDate) params.start = filters.startDate;
      if (filters.endDate) params.end = filters.endDate;
      
      // ✅ Si es mensajero, filtrar por sus encargos
      if (isMensajero && userId) {
        params.mensajero = userId;
      }
      
      const res = await getAllEncargos(params);
      
      // Filtrar solo encargos entregados (estado 3 o 8)
      const delivered = res.data.filter(e => e.estado === 3 || e.estado === 8);
      setEncargos(delivered);
    } catch (error) {
      console.error('Error al cargar encargos entregados:', error);
      message.error('No se pudieron cargar los envíos entregados');
    } finally {
      setLoading(false);
    }
  };

  const handleDateChange = (dates: any) => {
    if (dates && dates.length === 2) {
      const start = dates[0]?.format('YYYY-MM-DD') || null;
      const end = dates[1]?.format('YYYY-MM-DD') || null;
      setFilters({ startDate: start, endDate: end });
    } else {
      setFilters({ startDate: null, endDate: null });
    }
  };

  const handleExportExcel = async () => {
    try {
      const response = await downloadEncargosExcel({
        startDate: filters.startDate || undefined,
        endDate: filters.endDate || undefined,
      });
      
      const contentDisposition = response.headers['content-disposition'];
      let filename = 'Envios-Entregados.xlsx';
      
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
      message.error('Error al descargar reporte');
    }
  };

  const columns = [
    { title: '#', dataIndex: 'id', key: 'id', width: 60 },
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
      title: 'Fecha Realización',
      dataIndex: 'fecha_realizacion',
      key: 'fecha_realizacion',
      width: 120,
      render: (date: string) => date?.split('T')[0] || '-',
    },
    {
      title: 'Fecha Entrega',
      dataIndex: 'fecha_entrega',
      key: 'fecha_entrega',
      width: 120,
      render: (date: string) => date ? date.split('T')[0] : '-',
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
      width: 120,
      render: (_: any, record: Encargo) => (
        <Space size="small">
          <Button size="small" onClick={() => navigate(`/dashboard/mensajeria/editar/${record.id}`)}>
            Ver Detalle
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: '16px 0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 style={{ margin: 0 }}>Envíos Entregados</h2>
        <Button type="default" onClick={handleExportExcel}>
          Exportar Excel
        </Button>
      </div>

      {/* Filtros */}
      <div style={{ marginBottom: 16, padding: '16px', background: '#f5f5f5', borderRadius: 8 }}>
        <Space wrap>
          <RangePicker onChange={handleDateChange} placeholder={['Fecha inicio', 'Fecha fin']} />
          <Button onClick={() => setFilters({ startDate: null, endDate: null })}>
            Limpiar Filtros
          </Button>
        </Space>
      </div>

      <Table
        dataSource={encargos}
        columns={columns}
        rowKey="id"
        loading={loading}
        pagination={{ pageSize: 10 }}
        scroll={{ x: 1400 }}
        bordered
      />
    </div>
  );
};

export default DeliveredEncargosPage;
