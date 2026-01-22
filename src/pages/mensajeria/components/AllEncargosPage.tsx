// src/pages/mensajeria/AllEncargosPage.tsx
import React, { useEffect, useState } from 'react';
import { Table, Button, Space, Tag, message, Modal, DatePicker, Select, Input } from 'antd';
import { useNavigate } from 'react-router-dom';
import { downloadEncargosExcel, getAllEncargos, registerEmail, sendComplaint } from '../../../api/encargos';
import type { Encargo } from '../../../types/encargo';

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

const AllEncargosPage: React.FC = () => {
  const [encargos, setEncargos] = useState<Encargo[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    startDate: null as string | null,
    endDate: null as string | null,
    estado: null as number | null,
    userId: null as number | null,
  });
  const [complaintModal, setComplaintModal] = useState<{ open: boolean; encargoId: number | null }>({
    open: false,
    encargoId: null,
  });
  const [complaintText, setComplaintText] = useState('');
  const [emailModal, setEmailModal] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  // ✅ Cargar datos dentro del useEffect
  useEffect(() => {
    const loadEncargos = async () => {
      try {
        const params = {
          start_date: filters.startDate || undefined,
          end_date: filters.endDate || undefined,
          estado: filters.estado || undefined,
          user_id: filters.userId || undefined,
        };
        const res = await getAllEncargos(params);
        setEncargos(res.data);
      } catch {
        message.error('Error al cargar los envíos');
      } finally {
        setLoading(false);
      }
    };

    loadEncargos();
  }, [filters]); // ✅ Dependencias correctas

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
    setFilters({ startDate: null, endDate: null, estado: null, userId: null });
  };

  const handleComplaint = (id: number) => {
    setComplaintModal({ open: true, encargoId: id });
  };

  const handleComplaintSubmit = async () => {
    if (!complaintModal.encargoId || !complaintText.trim()) {
      message.warning('Debe ingresar un reclamo');
      return;
    }
    try {
      await sendComplaint(complaintModal.encargoId, complaintText);
      message.success('Reclamo enviado');
      setComplaintModal({ open: false, encargoId: null });
      setComplaintText('');
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Error al enviar reclamo');
    }
  };

  const handleRegisterEmail = async () => {
    if (!email || !password) {
      message.warning('Debe ingresar email y contraseña');
      return;
    }
    try {
      await registerEmail(email, password);
      message.success('Email registrado');
      setEmailModal(false);
      setEmail('');
      setPassword('');
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Error al registrar email');
    }
  };

  const handleExportExcel = async () => {
    try {
      const response = await downloadEncargosExcel();
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'envios.xlsx');
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Error desconocido';
      message.error(msg);
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
      width: 180,
      render: (_: any, record: Encargo) => (
        <Space size="small">
          <Button size="small" onClick={() => navigate(`/dashboard/mensajeria/editar/${record.id}`)}>
            Editar
          </Button>
          {record.estado !== 3 && (
            <Button size="small" type="dashed" onClick={() => handleComplaint(record.id)}>
              Reclamo
            </Button>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: '16px 0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 style={{ margin: 0 }}>Todos los Envíos</h2>
        <Space>
          <Button type="primary" onClick={() => navigate('/dashboard/mensajeria/crear')}>
            Crear Envío
          </Button>
          <Button type="default" onClick={handleExportExcel}>
            Exportar Excel
          </Button>
          <Button type="default" onClick={() => setEmailModal(true)}>
            Registrar Email
          </Button>
        </Space>
      </div>

      {/* Filtros */}
      <div style={{ marginBottom: 16, padding: '16px', background: '#f5f5f5', borderRadius: 8 }}>
        <Space wrap>
          <RangePicker onChange={handleDateChange} />
          <Select
            placeholder="Filtrar por estado"
            allowClear
            value={filters.estado || undefined}
            onChange={(value) => handleFilterChange('estado', value)}
            style={{ width: 180 }}
          >
            {Object.entries(ESTADOS).map(([key, value]) => (
              <Option key={key} value={parseInt(key)}>{value.label}</Option>
            ))}
          </Select>
          <Button onClick={handleResetFilters}>Reset</Button>
        </Space>
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

      {/* Modal de reclamo */}
      <Modal
        title="Enviar reclamo"
        open={complaintModal.open}
        onCancel={() => setComplaintModal({ open: false, encargoId: null })}
        onOk={handleComplaintSubmit}
        okText="Enviar"
      >
        <TextArea
          value={complaintText}
          onChange={(e) => setComplaintText(e.target.value)}
          placeholder="Ingrese el motivo de su reclamo..."
          rows={4}
        />
      </Modal>

      {/* Modal de registro de email */}
      <Modal
        title="Registro de email"
        open={emailModal}
        onCancel={() => setEmailModal(false)}
        onOk={handleRegisterEmail}
        okText="Registrar"
      >
        <Input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Correo electrónico"
          style={{ marginBottom: 12 }}
        />
        <Input.Password
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Contraseña"
        />
      </Modal>
    </div>
  );
};

export default AllEncargosPage;