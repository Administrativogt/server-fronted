import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Badge,
  Button,
  Calendar,
  Card,
  Col,
  DatePicker,
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Row,
  Select,
  Space,
  Statistic,
  Table,
  Tabs,
  Tag,
  Tooltip,
  Typography,
  message,
} from 'antd';
import {
  CalendarOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  DownloadOutlined,
  PlusOutlined,
  ReloadOutlined,
  StopOutlined,
  TeamOutlined,
  UserOutlined,
  UserAddOutlined,
  WalletOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import useAuthStore from '../../auth/useAuthStore';
import { fetchUsers } from '../../api/notifications';
import {
  type BalanceLogType,
  type MyVacationsResponse,
  type VacationBalance,
  type VacationBalanceLogEntry,
  type VacationRequest,
  type VacationStatus,
  approveVacationRequest,
  cancelVacationRequest,
  createVacationRequest,
  downloadVacationBalancesExcel,
  downloadVacationRequestsExcel,
  fetchAllVacationRequests,
  fetchCalendar,
  fetchMyBalanceLog,
  fetchMyVacations,
  fetchVacationBalances,
  rejectVacationRequest,
  setVacationBalance,
} from '../../api/vacations';

const MIN_ADVANCE_DAYS = 3;
const MAX_DAYS_REQUEST = 15;

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

// ============================================
// HELPERS
// ============================================

const STATUS_CONFIG: Record<VacationStatus, { label: string; color: string }> = {
  PENDIENTE: { label: 'Pendiente', color: 'orange' },
  APROBADA: { label: 'Aprobada', color: 'green' },
  RECHAZADA: { label: 'Rechazada', color: 'red' },
  CANCELADA: { label: 'Cancelada', color: 'default' },
};

const getStatusTag = (estado: VacationStatus) => {
  const cfg = STATUS_CONFIG[estado] ?? { label: estado, color: 'default' };
  return <Tag color={cfg.color}>{cfg.label}</Tag>;
};

const getUserName = (user?: { first_name: string; last_name: string } | null) =>
  user ? `${user.first_name} ${user.last_name}`.trim() : '-';

// ============================================
// COMPONENT
// ============================================

const VacacionesPage: React.FC = () => {
  const tipoUsuario = useAuthStore((s) => s.tipo_usuario);
  const isSuperuser = useAuthStore((s) => s.is_superuser);

  const isHR = isSuperuser || tipoUsuario === 2 || tipoUsuario === 10;

  // ---- Mis Vacaciones ----
  const [myData, setMyData] = useState<MyVacationsResponse | null>(null);
  const [myLoading, setMyLoading] = useState(false);
  const [requestForm] = Form.useForm();
  const [requesting, setRequesting] = useState(false);
  const [cancelingId, setCancelingId] = useState<number | null>(null);

  // ---- Gestion (HR) ----
  const [allRequests, setAllRequests] = useState<VacationRequest[]>([]);
  const [allLoading, setAllLoading] = useState(false);
  const [approvingId, setApprovingId] = useState<number | null>(null);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectingId, setRejectingId] = useState<number | null>(null);
  const [rejectForm] = Form.useForm();
  const [rejectingLoading, setRejectingLoading] = useState(false);

  // ---- Saldos (HR) ----
  const [balances, setBalances] = useState<VacationBalance[]>([]);
  const [balancesLoading, setBalancesLoading] = useState(false);
  const [editingBalance, setEditingBalance] = useState<number | null>(null);
  const [balanceForm] = Form.useForm();
  const [savingBalance, setSavingBalance] = useState(false);

  // ---- Historial de saldo ----
  const [balanceLog, setBalanceLog] = useState<VacationBalanceLogEntry[]>([]);
  const [balanceLogLoading, setBalanceLogLoading] = useState(false);

  // ---- Calendario ----
  const [calendarDate, setCalendarDate] = useState(dayjs());
  const [calendarRequests, setCalendarRequests] = useState<VacationRequest[]>([]);
  const [calendarLoading, setCalendarLoading] = useState(false);

  // ---- Exportar Excel ----
  const [exportingRequests, setExportingRequests] = useState(false);
  const [exportingBalances, setExportingBalances] = useState(false);

  // ---- Registrar nuevo empleado ----
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [addForm] = Form.useForm();
  const [savingAdd, setSavingAdd] = useState(false);
  const [allUsers, setAllUsers] = useState<{ id: number; first_name: string; last_name: string }[]>([]);

  // ============================================
  // CARGA DE DATOS
  // ============================================

  const loadMyVacations = useCallback(async () => {
    setMyLoading(true);
    try {
      const data = await fetchMyVacations();
      setMyData(data);
    } catch {
      message.error('Error al cargar tus vacaciones');
    } finally {
      setMyLoading(false);
    }
  }, []);

  const loadAllRequests = useCallback(async () => {
    if (!isHR) return;
    setAllLoading(true);
    try {
      const data = await fetchAllVacationRequests();
      setAllRequests(data);
    } catch {
      message.error('Error al cargar solicitudes');
    } finally {
      setAllLoading(false);
    }
  }, [isHR]);

  const loadBalances = useCallback(async () => {
    if (!isHR) return;
    setBalancesLoading(true);
    try {
      const data = await fetchVacationBalances();
      setBalances(data);
    } catch {
      message.error('Error al cargar saldos');
    } finally {
      setBalancesLoading(false);
    }
  }, [isHR]);

  const loadBalanceLog = useCallback(async () => {
    setBalanceLogLoading(true);
    try {
      const data = await fetchMyBalanceLog();
      setBalanceLog(data);
    } catch {
      // silently ignore
    } finally {
      setBalanceLogLoading(false);
    }
  }, []);

  const loadCalendar = useCallback(async (date: typeof calendarDate) => {
    if (!isHR) return;
    setCalendarLoading(true);
    try {
      const data = await fetchCalendar(date.year(), date.month() + 1);
      setCalendarRequests(data);
    } catch {
      message.error('Error al cargar el calendario');
    } finally {
      setCalendarLoading(false);
    }
  }, [isHR]);

  useEffect(() => {
    loadMyVacations();
    loadBalanceLog();
  }, [loadMyVacations, loadBalanceLog]);

  useEffect(() => {
    if (isHR) {
      loadAllRequests();
      loadBalances();
      loadCalendar(calendarDate);
      fetchUsers().then(setAllUsers).catch(() => {});
    }
  }, [isHR, loadAllRequests, loadBalances, loadCalendar]);

  const handleExportRequests = async () => {
    setExportingRequests(true);
    try {
      await downloadVacationRequestsExcel();
    } catch {
      message.error('Error al exportar solicitudes');
    } finally {
      setExportingRequests(false);
    }
  };

  const handleExportBalances = async () => {
    setExportingBalances(true);
    try {
      await downloadVacationBalancesExcel();
    } catch {
      message.error('Error al exportar saldos');
    } finally {
      setExportingBalances(false);
    }
  };

  const handleAddEmployee = async () => {
    try {
      const values = await addForm.validateFields();
      setSavingAdd(true);
      await setVacationBalance(values.user_id, {
        fecha_ingreso: values.fecha_ingreso.format('YYYY-MM-DD'),
        saldo_dias: values.saldo_dias,
      });
      message.success('Saldo registrado correctamente');
      setAddModalOpen(false);
      addForm.resetFields();
      loadBalances();
    } catch (e: any) {
      if (e?.errorFields) return;
      message.error('Error al registrar el saldo');
    } finally {
      setSavingAdd(false);
    }
  };

  // ============================================
  // MIS VACACIONES - ACCIONES
  // ============================================

  const handleSubmitRequest = async () => {
    setRequesting(true);
    try {
      const values = await requestForm.validateFields();
      const [fechaInicio, fechaFin] = values.rango;
      await createVacationRequest({
        fecha_inicio: dayjs(fechaInicio).format('YYYY-MM-DD'),
        fecha_fin: dayjs(fechaFin).format('YYYY-MM-DD'),
        comentarios: values.comentarios || undefined,
      });
      message.success('Solicitud de vacaciones enviada');
      requestForm.resetFields();
      loadMyVacations();
    } catch {
      message.error('No se pudo enviar la solicitud');
    } finally {
      setRequesting(false);
    }
  };

  const handleCancel = async (id: number) => {
    setCancelingId(id);
    try {
      await cancelVacationRequest(id);
      message.success('Solicitud cancelada');
      loadMyVacations();
    } catch {
      message.error('No se pudo cancelar la solicitud');
    } finally {
      setCancelingId(null);
    }
  };

  // ============================================
  // GESTION (HR) - ACCIONES
  // ============================================

  const handleApprove = async (id: number) => {
    setApprovingId(id);
    try {
      await approveVacationRequest(id);
      message.success('Solicitud aprobada');
      loadAllRequests();
    } catch {
      message.error('No se pudo aprobar la solicitud');
    } finally {
      setApprovingId(null);
    }
  };

  const openRejectModal = (id: number) => {
    setRejectingId(id);
    rejectForm.resetFields();
    setRejectModalOpen(true);
  };

  const handleReject = async () => {
    if (rejectingId === null) return;
    setRejectingLoading(true);
    try {
      const values = rejectForm.getFieldsValue();
      await rejectVacationRequest(rejectingId, values.motivo_cancelacion || undefined);
      message.success('Solicitud rechazada');
      setRejectModalOpen(false);
      rejectForm.resetFields();
      setRejectingId(null);
      loadAllRequests();
    } catch {
      message.error('No se pudo rechazar la solicitud');
    } finally {
      setRejectingLoading(false);
    }
  };

  // ============================================
  // SALDOS (HR) - ACCIONES
  // ============================================

  const handleEditBalance = (userId: number, balance: VacationBalance) => {
    setEditingBalance(userId);
    balanceForm.setFieldsValue({
      fecha_ingreso: balance.fecha_ingreso ? dayjs(balance.fecha_ingreso) : null,
      saldo_dias: balance.saldo_dias,
    });
  };

  const handleSaveBalance = async (userId: number) => {
    setSavingBalance(true);
    try {
      const values = await balanceForm.validateFields();
      await setVacationBalance(userId, {
        fecha_ingreso: dayjs(values.fecha_ingreso).format('YYYY-MM-DD'),
        saldo_dias: values.saldo_dias,
      });
      message.success('Saldo actualizado');
      setEditingBalance(null);
      balanceForm.resetFields();
      loadBalances();
    } catch {
      message.error('No se pudo guardar el saldo');
    } finally {
      setSavingBalance(false);
    }
  };

  // ============================================
  // COLUMNAS DE TABLAS
  // ============================================

  const myRequestColumns = useMemo(
    () => [
      { title: '#', dataIndex: 'id', width: 60 },
      {
        title: 'Fecha inicio',
        dataIndex: 'fecha_inicio',
        render: (v: string) => (v ? dayjs(v).format('DD/MM/YYYY') : '-'),
      },
      {
        title: 'Fecha fin',
        dataIndex: 'fecha_fin',
        render: (v: string) => (v ? dayjs(v).format('DD/MM/YYYY') : '-'),
      },
      {
        title: 'Dias',
        dataIndex: 'dias_solicitados',
        width: 70,
      },
      {
        title: 'Estado',
        dataIndex: 'estado',
        render: (v: VacationStatus) => getStatusTag(v),
      },
      {
        title: 'Solicitado',
        dataIndex: 'created_at',
        render: (v: string) => (v ? dayjs(v).format('DD/MM/YYYY HH:mm') : '-'),
      },
      {
        title: 'Comentarios',
        dataIndex: 'comentarios',
        ellipsis: true,
        render: (v: string) => v || <Text type="secondary">-</Text>,
      },
      {
        title: 'Acciones',
        width: 120,
        render: (_: unknown, record: VacationRequest) =>
          record.estado === 'PENDIENTE' ? (
            <Popconfirm
              title="Cancelar solicitud"
              description="Esta accion no se puede deshacer"
              onConfirm={() => handleCancel(record.id)}
              okText="Si, cancelar"
              cancelText="No"
              okButtonProps={{ danger: true }}
            >
              <Button
                size="small"
                danger
                icon={<StopOutlined />}
                loading={cancelingId === record.id}
              >
                Cancelar
              </Button>
            </Popconfirm>
          ) : null,
      },
    ],
    [cancelingId],
  );

  const allRequestColumns = useMemo(
    () => [
      { title: '#', dataIndex: 'id', width: 60 },
      {
        title: 'Empleado',
        dataIndex: 'user',
        render: (v: VacationRequest['user']) => getUserName(v),
      },
      {
        title: 'Fecha inicio',
        dataIndex: 'fecha_inicio',
        render: (v: string) => (v ? dayjs(v).format('DD/MM/YYYY') : '-'),
      },
      {
        title: 'Fecha fin',
        dataIndex: 'fecha_fin',
        render: (v: string) => (v ? dayjs(v).format('DD/MM/YYYY') : '-'),
      },
      {
        title: 'Dias',
        dataIndex: 'dias_solicitados',
        width: 70,
      },
      {
        title: 'Estado',
        dataIndex: 'estado',
        render: (v: VacationStatus) => getStatusTag(v),
      },
      {
        title: 'Motivo rechazo',
        dataIndex: 'motivo_cancelacion',
        ellipsis: true,
        render: (v: string) => v || <Text type="secondary">-</Text>,
      },
      {
        title: 'Acciones',
        width: 180,
        render: (_: unknown, record: VacationRequest) =>
          record.estado === 'PENDIENTE' ? (
            <Space>
              <Button
                size="small"
                type="primary"
                icon={<CheckCircleOutlined />}
                loading={approvingId === record.id}
                onClick={() => handleApprove(record.id)}
              >
                Aprobar
              </Button>
              <Button
                size="small"
                danger
                icon={<CloseCircleOutlined />}
                onClick={() => openRejectModal(record.id)}
              >
                Rechazar
              </Button>
            </Space>
          ) : null,
      },
    ],
    [approvingId],
  );

  const balanceColumns = useMemo(
    () => [
      {
        title: 'Empleado',
        dataIndex: 'user',
        render: (v: VacationBalance['user']) => getUserName(v),
      },
      {
        title: 'Fecha ingreso',
        dataIndex: 'fecha_ingreso',
        render: (v: string | null) => (v ? dayjs(v).format('DD/MM/YYYY') : <Text type="secondary">Sin definir</Text>),
      },
      {
        title: 'Saldo dias',
        dataIndex: 'saldo_dias',
        width: 110,
        render: (v: number) => <Tag color="blue">{v} dias</Tag>,
      },
      {
        title: 'Acciones',
        width: 100,
        render: (_: unknown, record: VacationBalance) => (
          <Button
            size="small"
            onClick={() => record.user && handleEditBalance(record.user.id, record)}
          >
            Editar
          </Button>
        ),
      },
    ],
    [],
  );

  // ============================================
  // RENDER - TAB MIS VACACIONES
  // ============================================

  const renderMyVacationsTab = () => (
    <div>
      {/* Balance card */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} md={8}>
          <Card>
            <Statistic
              title="Saldo de dias disponibles"
              value={myData?.saldo_dias ?? '-'}
              prefix={<WalletOutlined />}
              suffix="dias"
              valueStyle={{ color: (myData?.saldo_dias ?? 0) > 0 ? '#3f8600' : '#cf1322' }}
            />
            {myData?.fecha_ingreso && (
              <Text type="secondary" style={{ display: 'block', marginTop: 8 }}>
                <CalendarOutlined style={{ marginRight: 4 }} />
                Fecha de ingreso: {dayjs(myData.fecha_ingreso).format('DD/MM/YYYY')}
              </Text>
            )}
            {!myData?.fecha_ingreso && (
              <Alert
                message="Sin fecha de ingreso registrada"
                type="warning"
                showIcon
                style={{ marginTop: 8 }}
                banner
              />
            )}
          </Card>
        </Col>
      </Row>

      {/* Formulario de solicitud */}
      <Card
        title={
          <Space>
            <PlusOutlined />
            <span>Solicitar vacaciones</span>
          </Space>
        }
        style={{ marginBottom: 24 }}
      >
        <Form form={requestForm} layout="vertical" style={{ maxWidth: 600 }}>
          <Form.Item
            name="rango"
            label="Rango de fechas"
            rules={[{ required: true, message: 'Selecciona las fechas' }]}
            extra={
              <Text type="secondary" style={{ fontSize: 12 }}>
                Mínimo {MIN_ADVANCE_DAYS} días de anticipación · Máximo {MAX_DAYS_REQUEST} días hábiles por solicitud
              </Text>
            }
          >
            <RangePicker
              style={{ width: '100%' }}
              format="DD/MM/YYYY"
              disabledDate={(current) =>
                current && current < dayjs().add(MIN_ADVANCE_DAYS, 'day').startOf('day')
              }
              placeholder={['Fecha inicio', 'Fecha fin']}
            />
          </Form.Item>
          <Form.Item name="comentarios" label="Comentarios (opcional)">
            <Input.TextArea
              rows={3}
              placeholder="Agrega un comentario o motivo..."
              maxLength={500}
              showCount
            />
          </Form.Item>
          <Form.Item>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              loading={requesting}
              onClick={handleSubmitRequest}
            >
              Enviar solicitud
            </Button>
          </Form.Item>
        </Form>
      </Card>

      {/* Tabla de mis solicitudes */}
      <Card
        title={
          <Space>
            <UserOutlined />
            <span>Mis solicitudes</span>
          </Space>
        }
        extra={
          <Button icon={<ReloadOutlined />} onClick={loadMyVacations}>
            Recargar
          </Button>
        }
      >
        <Table
          rowKey="id"
          loading={myLoading}
          dataSource={myData?.solicitudes ?? []}
          columns={myRequestColumns as any}
          pagination={{ pageSize: 10 }}
          size="middle"
          scroll={{ x: 900 }}
          locale={{ emptyText: 'No tienes solicitudes de vacaciones' }}
        />
      </Card>

      {/* Historial de saldo */}
      <Card
        title={<Space><WalletOutlined /><span>Historial de mi saldo</span></Space>}
        extra={<Button icon={<ReloadOutlined />} onClick={loadBalanceLog}>Recargar</Button>}
        style={{ marginTop: 24 }}
      >
        <Table
          rowKey="id"
          loading={balanceLogLoading}
          dataSource={balanceLog}
          size="small"
          pagination={{ pageSize: 10 }}
          scroll={{ x: 700 }}
          locale={{ emptyText: 'Sin movimientos registrados' }}
          columns={[
            {
              title: 'Fecha',
              dataIndex: 'created_at',
              width: 160,
              render: (v: string) => v ? dayjs(v).format('DD/MM/YYYY HH:mm') : '-',
            },
            {
              title: 'Tipo',
              dataIndex: 'tipo',
              width: 140,
              render: (v: BalanceLogType) => {
                const cfg: Record<BalanceLogType, { label: string; color: string }> = {
                  DESCUENTO: { label: 'Descuento', color: 'red' },
                  DEVOLUCION: { label: 'Devolución', color: 'green' },
                  ANIVERSARIO: { label: 'Aniversario 🎉', color: 'gold' },
                  AJUSTE_MANUAL: { label: 'Ajuste manual', color: 'blue' },
                };
                const c = cfg[v] ?? { label: v, color: 'default' };
                return <Tag color={c.color}>{c.label}</Tag>;
              },
            },
            {
              title: 'Días',
              dataIndex: 'dias',
              width: 80,
              render: (v: number) => (
                <Text style={{ color: Number(v) >= 0 ? '#16a34a' : '#dc2626', fontWeight: 600 }}>
                  {Number(v) >= 0 ? '+' : ''}{Number(v)}
                </Text>
              ),
            },
            {
              title: 'Saldo anterior',
              dataIndex: 'saldo_anterior',
              width: 120,
              render: (v: number) => `${Number(v)} días`,
            },
            {
              title: 'Saldo nuevo',
              dataIndex: 'saldo_nuevo',
              width: 110,
              render: (v: number) => <Tag color="blue">{Number(v)} días</Tag>,
            },
            {
              title: 'Solicitud',
              dataIndex: 'solicitud',
              width: 90,
              render: (v: { id: number } | null) => v ? `#${v.id}` : <Text type="secondary">-</Text>,
            },
          ]}
        />
      </Card>
    </div>
  );

  // ============================================
  // RENDER - TAB GESTION (HR)
  // ============================================

  const renderGestionTab = () => (
    <div>
      {/* Tabla de todas las solicitudes */}
      <Card
        title={
          <Space>
            <TeamOutlined />
            <span>Solicitudes de empleados</span>
          </Space>
        }
        extra={
          <Space>
            <Button
              icon={<DownloadOutlined />}
              loading={exportingRequests}
              onClick={handleExportRequests}
            >
              Exportar Excel
            </Button>
            <Button icon={<ReloadOutlined />} onClick={loadAllRequests}>
              Recargar
            </Button>
          </Space>
        }
        style={{ marginBottom: 24 }}
      >
        <Table
          rowKey="id"
          loading={allLoading}
          dataSource={allRequests}
          columns={allRequestColumns as any}
          pagination={{ pageSize: 15 }}
          size="middle"
          scroll={{ x: 1000 }}
          locale={{ emptyText: 'No hay solicitudes' }}
        />
      </Card>

      {/* Seccion de saldos */}
      <Card
        title={
          <Space>
            <WalletOutlined />
            <span>Saldos de vacaciones</span>
          </Space>
        }
        extra={
          <Space>
            <Button
              type="primary"
              icon={<UserAddOutlined />}
              onClick={() => setAddModalOpen(true)}
            >
              Registrar empleado
            </Button>
            <Button
              icon={<DownloadOutlined />}
              loading={exportingBalances}
              onClick={handleExportBalances}
            >
              Exportar Excel
            </Button>
            <Button icon={<ReloadOutlined />} onClick={loadBalances}>
              Recargar
            </Button>
          </Space>
        }
      >
        {editingBalance !== null && (
          <Card
            size="small"
            style={{ marginBottom: 16, background: 'transparent' }}
            variant="borderless"
            title="Editar saldo"
          >
            <Form form={balanceForm} layout="inline">
              <Form.Item
                name="fecha_ingreso"
                label="Fecha ingreso"
                rules={[{ required: true, message: 'Requerido' }]}
              >
                <DatePicker format="DD/MM/YYYY" placeholder="Seleccionar fecha" />
              </Form.Item>
              <Form.Item
                name="saldo_dias"
                label="Saldo dias"
                rules={[{ required: true, message: 'Requerido' }]}
              >
                <InputNumber min={0} placeholder="0" style={{ width: 100 }} />
              </Form.Item>
              <Form.Item>
                <Space>
                  <Button
                    type="primary"
                    loading={savingBalance}
                    onClick={() => handleSaveBalance(editingBalance)}
                  >
                    Guardar
                  </Button>
                  <Button
                    onClick={() => {
                      setEditingBalance(null);
                      balanceForm.resetFields();
                    }}
                  >
                    Cancelar
                  </Button>
                </Space>
              </Form.Item>
            </Form>
          </Card>
        )}

        <Table
          rowKey="id"
          loading={balancesLoading}
          dataSource={balances}
          columns={balanceColumns as any}
          pagination={{ pageSize: 15 }}
          size="middle"
          scroll={{ x: 700 }}
          locale={{ emptyText: 'No hay saldos registrados' }}
        />
      </Card>

      {/* Modal: Registrar nuevo empleado */}
      <Modal
        title={<Space><UserAddOutlined /> Registrar empleado en vacaciones</Space>}
        open={addModalOpen}
        onOk={handleAddEmployee}
        onCancel={() => { setAddModalOpen(false); addForm.resetFields(); }}
        confirmLoading={savingAdd}
        okText="Registrar"
        cancelText="Cancelar"
        destroyOnClose
      >
        <Form form={addForm} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item
            name="user_id"
            label="Empleado"
            rules={[{ required: true, message: 'Selecciona un empleado' }]}
          >
            <Select
              showSearch
              placeholder="Buscar empleado..."
              optionFilterProp="label"
              options={allUsers
                .filter((u) => !balances.some((b) => b.user?.id === u.id))
                .map((u) => ({
                  value: u.id,
                  label: `${u.first_name} ${u.last_name}`.trim(),
                }))}
            />
          </Form.Item>
          <Form.Item
            name="fecha_ingreso"
            label="Fecha de ingreso"
            rules={[{ required: true, message: 'Requerido' }]}
          >
            <DatePicker format="DD/MM/YYYY" style={{ width: '100%' }} placeholder="Seleccionar fecha" />
          </Form.Item>
          <Form.Item
            name="saldo_dias"
            label="Saldo inicial de días"
            rules={[{ required: true, message: 'Requerido' }]}
          >
            <InputNumber min={0} style={{ width: '100%' }} placeholder="Ej: 15" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );

  // ============================================
  // RENDER - TAB CALENDARIO (HR)
  // ============================================

  const vacationDayMap = useMemo(() => {
    const map = new Map<string, { name: string; id: number }[]>();
    for (const req of calendarRequests) {
      if (!req.user) continue;
      let current = dayjs(req.fecha_inicio);
      const end = dayjs(req.fecha_fin);
      while (current.isBefore(end) || current.isSame(end, 'day')) {
        const key = current.format('YYYY-MM-DD');
        if (!map.has(key)) map.set(key, []);
        map.get(key)!.push({ name: getUserName(req.user), id: req.id });
        current = current.add(1, 'day');
      }
    }
    return map;
  }, [calendarRequests]);

  const renderCalendarTab = () => (
    <Card
      loading={calendarLoading}
      title={<Space><CalendarOutlined /><span>Vacaciones aprobadas del equipo</span></Space>}
    >
      <Calendar
        value={calendarDate}
        onPanelChange={(date) => {
          setCalendarDate(date);
          loadCalendar(date);
        }}
        cellRender={(date) => {
          const key = date.format('YYYY-MM-DD');
          const people = vacationDayMap.get(key);
          if (!people?.length) return null;
          return (
            <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
              {people.slice(0, 3).map((p) => (
                <Tooltip key={p.id} title={p.name}>
                  <li>
                    <Badge
                      color="#1565C0"
                      text={<Text style={{ fontSize: 11 }}>{p.name.split(' ')[0]}</Text>}
                    />
                  </li>
                </Tooltip>
              ))}
              {people.length > 3 && (
                <li>
                  <Text type="secondary" style={{ fontSize: 11 }}>+{people.length - 3} más</Text>
                </li>
              )}
            </ul>
          );
        }}
      />
    </Card>
  );

  // ============================================
  // RENDER PRINCIPAL
  // ============================================

  const tabItems = [
    {
      key: 'mis-vacaciones',
      label: (
        <span>
          <CalendarOutlined /> Mis Vacaciones
        </span>
      ),
      children: renderMyVacationsTab(),
    },
    ...(isHR
      ? [
          {
            key: 'gestion',
            label: (
              <span>
                <TeamOutlined /> Gestion
              </span>
            ),
            children: renderGestionTab(),
          },
          {
            key: 'calendario',
            label: (
              <span>
                <CalendarOutlined /> Calendario
              </span>
            ),
            children: renderCalendarTab(),
          },
        ]
      : []),
  ];

  return (
    <div style={{ padding: '0 8px' }}>
      <Title level={3} style={{ marginBottom: 24 }}>
        <CalendarOutlined style={{ marginRight: 8 }} />
        Vacaciones
      </Title>

      <Tabs type="card" items={tabItems} />

      {/* Modal - Rechazar solicitud */}
      <Modal
        open={rejectModalOpen}
        onCancel={() => {
          setRejectModalOpen(false);
          rejectForm.resetFields();
          setRejectingId(null);
        }}
        onOk={handleReject}
        okText="Rechazar"
        okButtonProps={{ danger: true }}
        confirmLoading={rejectingLoading}
        title={
          <Space>
            <CloseCircleOutlined />
            <span>Rechazar solicitud</span>
          </Space>
        }
      >
        <Form form={rejectForm} layout="vertical">
          <Form.Item name="motivo_cancelacion" label="Motivo de rechazo (opcional)">
            <Input.TextArea
              rows={4}
              placeholder="Indica el motivo del rechazo..."
              maxLength={500}
              showCount
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default VacacionesPage;
