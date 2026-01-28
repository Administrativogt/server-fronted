// src/pages/appointments/AppointmentsList.tsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  Table,
  Button,
  Space,
  Input,
  DatePicker,
  Card,
  Row,
  Col,
  Tag,
  Popconfirm,
  message,
  Tooltip,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  FileTextOutlined,
  SearchOutlined,
  ReloadOutlined,
  MailOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import dayjs, { Dayjs } from 'dayjs';
import type { ColumnsType } from 'antd/es/table';
import {
  getAppointments,
  deleteAppointment,
  sendReminders,
} from '../../api/appointments';
import type { Appointment, AppointmentFilters } from '../../types/appointment.types';
import EditAppointmentModal from './EditAppointmentModal';

const { RangePicker } = DatePicker;

const AppointmentsList: React.FC = () => {
  const navigate = useNavigate();

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);

  // Filtros
  const [filters, setFilters] = useState<AppointmentFilters>({});
  const [deedIdFilter, setDeedIdFilter] = useState('');
  const [representativeFilter, setRepresentativeFilter] = useState('');
  const [positionFilter, setPositionFilter] = useState('');
  const [registerFilter, setRegisterFilter] = useState('');
  const [folioFilter, setFolioFilter] = useState('');
  const [bookFilter, setBookFilter] = useState('');
  const [dateRange, setDateRange] = useState<[Dayjs | null, Dayjs | null]>([null, null]);

  // Modal de edición
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);

  const fetchAppointments = useCallback(async () => {
    setLoading(true);
    try {
      const response = await getAppointments({
        ...filters,
        page: currentPage,
        limit: pageSize,
      });
      setAppointments(response.data);
      setTotal(response.total);
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Error al cargar actas');
    } finally {
      setLoading(false);
    }
  }, [currentPage, pageSize, filters]);

  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  const handleSearch = () => {
    const newFilters: AppointmentFilters = {};

    if (deedIdFilter) newFilters.deedId = deedIdFilter;
    if (representativeFilter) newFilters.representative = representativeFilter;
    if (positionFilter) newFilters.position = positionFilter;
    if (registerFilter) newFilters.register = registerFilter;
    if (folioFilter) newFilters.folio = folioFilter;
    if (bookFilter) newFilters.book = bookFilter;
    if (dateRange[0]) newFilters.startDate = dateRange[0].format('YYYY-MM-DD');
    if (dateRange[1]) newFilters.finishDate = dateRange[1].format('YYYY-MM-DD');

    setFilters(newFilters);
    setCurrentPage(1);
  };

  const handleClearFilters = () => {
    setDeedIdFilter('');
    setRepresentativeFilter('');
    setPositionFilter('');
    setRegisterFilter('');
    setFolioFilter('');
    setBookFilter('');
    setDateRange([null, null]);
    setFilters({});
    setCurrentPage(1);
  };

  const handleEdit = (appointment: Appointment) => {
    setSelectedAppointment(appointment);
    setEditModalVisible(true);
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteAppointment(id);
      message.success('Acta eliminada con éxito');
      fetchAppointments();
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Error al eliminar acta');
    }
  };

  const handleSendReminders = async () => {
    try {
      setLoading(true);
      const response = await sendReminders();
      message.success(response.message);
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Error al enviar recordatorios');
    } finally {
      setLoading(false);
    }
  };

  const columns: ColumnsType<Appointment> = [
    {
      title: 'ID Acta',
      dataIndex: 'deedId',
      key: 'deedId',
      width: 150,
      fixed: 'left',
    },
    {
      title: 'Representante',
      dataIndex: 'representative',
      key: 'representative',
      width: 200,
    },
    {
      title: 'Cargo',
      dataIndex: 'position',
      key: 'position',
      width: 180,
    },
    {
      title: 'Fecha Inicio',
      dataIndex: 'startDate',
      key: 'startDate',
      width: 120,
      render: (date: string) => dayjs(date).format('DD/MM/YYYY'),
    },
    {
      title: 'Fecha Vencimiento',
      dataIndex: 'finishDate',
      key: 'finishDate',
      width: 150,
      render: (date: string) => {
        const daysUntilExpire = dayjs(date).diff(dayjs(), 'days');
        let color = 'green';
        if (daysUntilExpire <= 30) color = 'red';
        else if (daysUntilExpire <= 60) color = 'orange';

        return (
          <Tag color={color}>
            {dayjs(date).format('DD/MM/YYYY')}
            <br />
            <small>({daysUntilExpire} días)</small>
          </Tag>
        );
      },
    },
    {
      title: 'Registro',
      dataIndex: 'register',
      key: 'register',
      width: 120,
    },
    {
      title: 'Folio',
      dataIndex: 'folio',
      key: 'folio',
      width: 100,
    },
    {
      title: 'Libro',
      dataIndex: 'book',
      key: 'book',
      width: 100,
    },
    {
      title: 'Correo Cliente',
      dataIndex: 'clientEmail',
      key: 'clientEmail',
      width: 200,
      ellipsis: true,
    },
    {
      title: 'Archivos',
      key: 'files',
      width: 100,
      render: (_, record) => (
        <Space>
          {record.attachedFiles.map((file) => (
            <Tooltip key={file.id} title="Ver PDF">
              <a href={file.file} target="_blank" rel="noopener noreferrer">
                <FileTextOutlined style={{ fontSize: 18, color: '#1890ff' }} />
              </a>
            </Tooltip>
          ))}
        </Space>
      ),
    },
    {
      title: 'Estado',
      dataIndex: 'state',
      key: 'state',
      width: 100,
      render: (state: number) => (
        <Tag color={state === 1 ? 'green' : 'red'}>
          {state === 1 ? 'Activo' : 'Inactivo'}
        </Tag>
      ),
    },
    {
      title: 'Acciones',
      key: 'actions',
      width: 120,
      fixed: 'right',
      render: (_, record) => (
        <Space>
          <Tooltip title="Editar">
            <Button
              type="primary"
              icon={<EditOutlined />}
              size="small"
              onClick={() => handleEdit(record)}
            />
          </Tooltip>
          <Popconfirm
            title="¿Está seguro de eliminar esta acta?"
            onConfirm={() => handleDelete(record.id)}
            okText="Sí"
            cancelText="No"
          >
            <Tooltip title="Eliminar">
              <Button type="primary" danger icon={<DeleteOutlined />} size="small" />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Card title="Actas de Nombramiento" style={{ marginBottom: 16 }}>
        <Space direction="vertical" style={{ width: '100%' }} size="middle">
          {/* Filtros */}
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12} md={8} lg={6}>
              <Input
                placeholder="ID Acta"
                value={deedIdFilter}
                onChange={(e) => setDeedIdFilter(e.target.value)}
                prefix={<SearchOutlined />}
              />
            </Col>
            <Col xs={24} sm={12} md={8} lg={6}>
              <Input
                placeholder="Representante"
                value={representativeFilter}
                onChange={(e) => setRepresentativeFilter(e.target.value)}
                prefix={<SearchOutlined />}
              />
            </Col>
            <Col xs={24} sm={12} md={8} lg={6}>
              <Input
                placeholder="Cargo"
                value={positionFilter}
                onChange={(e) => setPositionFilter(e.target.value)}
                prefix={<SearchOutlined />}
              />
            </Col>
            <Col xs={24} sm={12} md={8} lg={6}>
              <Input
                placeholder="Registro"
                value={registerFilter}
                onChange={(e) => setRegisterFilter(e.target.value)}
                prefix={<SearchOutlined />}
              />
            </Col>
            <Col xs={24} sm={12} md={8} lg={6}>
              <Input
                placeholder="Folio"
                value={folioFilter}
                onChange={(e) => setFolioFilter(e.target.value)}
                prefix={<SearchOutlined />}
              />
            </Col>
            <Col xs={24} sm={12} md={8} lg={6}>
              <Input
                placeholder="Libro"
                value={bookFilter}
                onChange={(e) => setBookFilter(e.target.value)}
                prefix={<SearchOutlined />}
              />
            </Col>
            <Col xs={24} sm={12} md={12} lg={6}>
              <RangePicker
                style={{ width: '100%' }}
                value={dateRange}
                onChange={(dates) => setDateRange(dates as [Dayjs | null, Dayjs | null])}
                format="DD/MM/YYYY"
                placeholder={['Fecha inicio', 'Fecha fin']}
              />
            </Col>
          </Row>

          {/* Botones de acción */}
          <Space wrap>
            <Button type="primary" icon={<SearchOutlined />} onClick={handleSearch}>
              Buscar
            </Button>
            <Button icon={<ReloadOutlined />} onClick={handleClearFilters}>
              Limpiar filtros
            </Button>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => navigate('/dashboard/appointments/create')}
            >
              Crear acta
            </Button>
            <Button
              type="default"
              icon={<MailOutlined />}
              onClick={handleSendReminders}
              loading={loading}
            >
              Enviar recordatorios
            </Button>
          </Space>
        </Space>
      </Card>

      {/* Tabla */}
      <Table
        columns={columns}
        dataSource={appointments}
        rowKey="id"
        loading={loading}
        scroll={{ x: 1800 }}
        pagination={{
          current: currentPage,
          pageSize: pageSize,
          total: total,
          showSizeChanger: true,
          showTotal: (total) => `Total: ${total} actas`,
          onChange: (page, size) => {
            setCurrentPage(page);
            setPageSize(size || 15);
          },
        }}
      />

      {/* Modal de edición */}
      <EditAppointmentModal
        visible={editModalVisible}
        appointment={selectedAppointment}
        onClose={() => {
          setEditModalVisible(false);
          setSelectedAppointment(null);
        }}
        onSuccess={() => {
          setEditModalVisible(false);
          setSelectedAppointment(null);
          fetchAppointments();
        }}
      />
    </div>
  );
};

export default AppointmentsList;