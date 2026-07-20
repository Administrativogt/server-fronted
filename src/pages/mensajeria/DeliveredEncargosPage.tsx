// src/pages/mensajeria/DeliveredEncargosPage.tsx
import React, { useEffect, useState } from 'react';
import { Table, Button, Space, Tag, message, DatePicker, Empty, theme } from 'antd';
import { useNavigate } from 'react-router-dom';
import { getEncargosFinalizados, downloadEncargosExcel } from '../../api/encargos';
import type { Encargo } from '../../types/encargo';
import EncargoExpandedRow from './components/EncargoExpandedRow';
import { ESTADOS, PRIORIDADES, formatFecha, hasDetalles, saveExcelResponse } from './constants';

const { RangePicker } = DatePicker;

const DeliveredEncargosPage: React.FC = () => {
  const [encargos, setEncargos] = useState<Encargo[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [filters, setFilters] = useState({
    startDate: null as string | null,
    endDate: null as string | null,
  });
  const navigate = useNavigate();
  const { token } = theme.useToken();

  useEffect(() => {
    loadEncargos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  const loadEncargos = async () => {
    setLoading(true);
    try {
      const params: { start?: string; end?: string } = {};
      if (filters.startDate) params.start = filters.startDate;
      if (filters.endDate) params.end = filters.endDate;

      const res = await getEncargosFinalizados(params);
      setEncargos(res.data);
      setLoadError(false);
    } catch (error) {
      console.error('Error al cargar encargos finalizados:', error);
      setLoadError(true);
      message.error('No se pudieron cargar los envíos finalizados');
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
    setExporting(true);
    try {
      const response = await downloadEncargosExcel({
        startDate: filters.startDate || undefined,
        endDate: filters.endDate || undefined,
      });
      
      saveExcelResponse(response, 'Envios-Entregados.xlsx');
      message.success('Reporte descargado exitosamente');
    } catch (err: any) {
      message.error(err?.response?.data?.message || 'Error al descargar reporte');
    } finally {
      setExporting(false);
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
      sorter: (a: Encargo, b: Encargo) =>
        (a.fecha_realizacion || '').localeCompare(b.fecha_realizacion || ''),
      render: (date: string) => formatFecha(date),
    },
    {
      title: 'Fecha Entrega',
      dataIndex: 'fecha_entrega',
      key: 'fecha_entrega',
      width: 120,
      sorter: (a: Encargo, b: Encargo) =>
        (a.fecha_entrega || '').localeCompare(b.fecha_entrega || ''),
      render: (date: string) => formatFecha(date),
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
            Editar
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: '16px 0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 style={{ margin: 0 }}>Envíos Finalizados</h2>
        <Button type="default" onClick={handleExportExcel} loading={exporting}>
          Exportar Excel
        </Button>
      </div>

      {/* Filtros */}
      <div style={{ marginBottom: 16, padding: '16px', background: token.colorFillAlter, border: `1px solid ${token.colorBorderSecondary}`, borderRadius: 8 }}>
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
        expandable={{
          expandedRowRender: (record: Encargo) => <EncargoExpandedRow encargo={record} />,
          rowExpandable: hasDetalles,
        }}
        locale={{
          emptyText: loadError ? (
            <Empty description="No se pudieron cargar los envíos finalizados">
              <Button type="primary" onClick={loadEncargos}>
                Reintentar
              </Button>
            </Empty>
          ) : (
            <Empty description="No hay envíos finalizados en este período. Sin filtro de fechas se muestra el mes actual." />
          ),
        }}
      />
    </div>
  );
};

export default DeliveredEncargosPage;
