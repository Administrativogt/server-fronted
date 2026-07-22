import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Button,
  Card,
  Checkbox,
  Col,
  DatePicker,
  Divider,
  Form,
  Input,
  Modal,
  Row,
  Select,
  Space,
  Table,
  Tabs,
  Tag,
  Typography,
  Upload,
  message,
} from 'antd';
import {
  FileTextOutlined,
  SafetyCertificateOutlined,
  UploadOutlined,
  PlusOutlined,
  ReloadOutlined,
  FilterOutlined,
  EyeOutlined,
  CommentOutlined,
  InboxOutlined,
  TeamOutlined,
  UserOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import useAuthStore from '../../auth/useAuthStore';
import { fetchUsers, type UserLite } from '../../api/users';
import {
  type Certificate,
  type CertificateType,
  type CertificateUser,
  type Complaint,
  type ComplaintType,
  type MailboxType,
  type Observation,
  type Suggestion,
  addComplaintObservation,
  addSuggestionObservation,
  createCertificate,
  createComplaint,
  createSuggestion,
  fetchAllCertificates,
  fetchCertificateTypes,
  fetchComplaintObservations,
  fetchComplaintTypes,
  fetchComplaints,
  fetchMailboxTypes,
  fetchSuggestionObservations,
  fetchSuggestions,
  filterComplaints,
  filterSuggestions,
  requestWorkCertificate,
  updateCertificateState,
} from '../../api/humanResources';
import type { UploadFile } from 'antd/es/upload';

const { Title, Text } = Typography;

const certificateStates = [
  { id: 1, label: 'Pendiente', color: 'orange' },
  { id: 2, label: 'Entregado', color: 'green' },
  { id: 3, label: 'Cancelado', color: 'red' },
];

const HumanResourcesPage: React.FC = () => {
  const userId = useAuthStore((s) => s.userId);
  const tipoUsuario = useAuthStore((s) => s.tipo_usuario);
  const isSuperuser = useAuthStore((s) => s.is_superuser);
  const modules = useAuthStore((s) => s.modules);

  const username = useAuthStore((s) => s.username);

  const isAdmin = isSuperuser || tipoUsuario === 18 || tipoUsuario === 6;
  // Administración de certificados: SOLO Erick Mejía de RRHH (MEJ000) — el
  // resto solo solicita y ve sus propias constancias (el backend también filtra)
  const isCertAdmin = isSuperuser || username?.toUpperCase() === 'MEJ000';
  // Módulo 'sugerencias' (Django: tipo 2, superuser o permiso 18) — habilita ver el
  // LISTADO del buzón; crear sugerencias/denuncias queda abierto a todos
  const canViewMailboxList = modules.some((m) => m.key === 'sugerencias');

  // Datos maestros
  const [mailboxTypes, setMailboxTypes] = useState<MailboxType[]>([]);
  const [complaintTypes, setComplaintTypes] = useState<ComplaintType[]>([]);
  const [certificateTypes, setCertificateTypes] = useState<CertificateType[]>([]);
  const [users, setUsers] = useState<UserLite[]>([]);

  // Certificados
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [certLoading, setCertLoading] = useState(false);
  // Filtro de la tarjeta-resumen: null = todas, 1 = ingresadas, 2 = entregadas.
  // Arranca en 1 (pendientes) = la cola de trabajo, como antes.
  const [certStateFilter, setCertStateFilter] = useState<number | null>(1);
  const [certificateModalOpen, setCertificateModalOpen] = useState(false);
  const [certificateForm] = Form.useForm();
  const [requestingWork, setRequestingWork] = useState(false);

  // Sugerencias
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [suggestionModalOpen, setSuggestionModalOpen] = useState(false);
  const [suggestionForm] = Form.useForm();
  const [suggestionFilterForm] = Form.useForm();
  const [suggestionFileList, setSuggestionFileList] = useState<UploadFile[]>([]);

  // Denuncias
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [complaintsLoading, setComplaintsLoading] = useState(false);
  const [complaintModalOpen, setComplaintModalOpen] = useState(false);
  const [complaintForm] = Form.useForm();
  const [complaintFilterForm] = Form.useForm();
  const [complaintFileList, setComplaintFileList] = useState<UploadFile[]>([]);
  const [selectedComplaintType, setSelectedComplaintType] = useState<number | null>(null);

  // Observaciones
  const [observationsOpen, setObservationsOpen] = useState(false);
  const [observationItems, setObservationItems] = useState<Observation[]>([]);
  const [observationLoading, setObservationLoading] = useState(false);
  const [observationForm] = Form.useForm();
  const [selectedObservationTarget, setSelectedObservationTarget] = useState<{
    type: 'suggestion' | 'complaint';
    id: number;
  } | null>(null);

  // ============================================
  // CARGA DE DATOS
  // ============================================

  useEffect(() => {
    const loadMasterData = async () => {
      try {
        const [mailboxes, cTypes, certTypes, usersRes] = await Promise.all([
          fetchMailboxTypes(),
          fetchComplaintTypes(),
          fetchCertificateTypes(),
          fetchUsers(),
        ]);
        setMailboxTypes(mailboxes);
        setComplaintTypes(cTypes);
        setCertificateTypes(certTypes);
        setUsers(usersRes);
      } catch {
        message.error('Error al cargar datos maestros');
      }
    };
    loadMasterData();
  }, []);

  const loadCertificates = useCallback(async () => {
    setCertLoading(true);
    try {
      // Siempre traemos TODAS: así los contadores (ingresadas / entregadas /
      // total) son reales y las tarjetas-resumen filtran en cliente. Antes se
      // cargaban solo las pendientes y "Entregadas" siempre mostraba 0.
      const data = await fetchAllCertificates();
      setCertificates(data);
    } catch {
      message.error('Error al cargar certificados');
    } finally {
      setCertLoading(false);
    }
  }, []);

  const loadSuggestions = useCallback(async () => {
    setSuggestionsLoading(true);
    try {
      const data = await fetchSuggestions();
      setSuggestions(data);
    } catch {
      message.error('Error al cargar sugerencias');
    } finally {
      setSuggestionsLoading(false);
    }
  }, []);

  const loadComplaints = useCallback(async () => {
    setComplaintsLoading(true);
    try {
      const data = await fetchComplaints();
      setComplaints(data);
    } catch {
      message.error('Error al cargar denuncias');
    } finally {
      setComplaintsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCertificates();
  }, [loadCertificates]);

  useEffect(() => {
    if (!canViewMailboxList) return;
    loadSuggestions();
    loadComplaints();
  }, [canViewMailboxList, loadSuggestions, loadComplaints]);

  // ============================================
  // HELPERS
  // ============================================

  const getCertificateStateTag = (stateId: number) => {
    const state = certificateStates.find((s) => s.id === stateId);
    return <Tag color={state?.color || 'default'}>{state?.label || stateId}</Tag>;
  };

  const getUserDisplayName = (user: CertificateUser | number | string) => {
    if (typeof user === 'object' && user !== null) {
      return `${user.first_name} ${user.last_name}`.trim();
    }
    return String(user);
  };

  // ============================================
  // CERTIFICADOS - ACCIONES
  // ============================================

  const handleRequestWorkCertificate = async () => {
    setRequestingWork(true);
    try {
      await requestWorkCertificate();
      message.success('Constancia laboral solicitada. Se notificó a Recursos Humanos.');
      loadCertificates();
    } catch {
      message.error('No se pudo solicitar la constancia laboral');
    } finally {
      setRequestingWork(false);
    }
  };


  const submitCertificate = async () => {
    try {
      const values = await certificateForm.validateFields();
      await createCertificate({ type: values.type, user: values.user });
      message.success('Certificado creado exitosamente');
      setCertificateModalOpen(false);
      certificateForm.resetFields();
      loadCertificates();
    } catch {
      message.error('No se pudo crear el certificado');
    }
  };

  const handleUpdateCertificateState = async (id: number, state: number) => {
    try {
      await updateCertificateState(id, state);
      message.success('Estado actualizado');
      loadCertificates();
    } catch {
      message.error('No se pudo actualizar el estado');
    }
  };


  // ============================================
  // SUGERENCIAS - ACCIONES
  // ============================================

  const submitSuggestion = async () => {
    try {
      const values = await suggestionForm.validateFields();

      if (suggestionFileList.length > 0) {
        const formData = new FormData();
        if (values.mailbox_type) formData.append('mailbox_type', values.mailbox_type.toString());
        formData.append('description', values.description);
        formData.append('anonymous', String(values.anonymous ?? true));
        if (values.user && !values.anonymous) formData.append('user', values.user);
        formData.append('file', suggestionFileList[0].originFileObj as File);
        await createSuggestion(Object.fromEntries(formData) as any);
      } else {
        await createSuggestion({
          mailbox_type: values.mailbox_type,
          description: values.description,
          user: values.anonymous ? undefined : values.user,
          anonymous: values.anonymous ?? true,
        });
      }

      message.success('Sugerencia enviada exitosamente');
      setSuggestionModalOpen(false);
      suggestionForm.resetFields();
      setSuggestionFileList([]);
      loadSuggestions();
    } catch {
      message.error('No se pudo enviar la sugerencia');
    }
  };

  const submitSuggestionFilter = async () => {
    try {
      const values = suggestionFilterForm.getFieldsValue();
      const payload = {
        mailbox_type: values.mailbox_type,
        user: values.user,
        date: values.date ? dayjs(values.date).format('YYYY-MM-DD') : undefined,
      };
      const data = await filterSuggestions(payload);
      setSuggestions(data);
    } catch {
      message.error('No se pudo filtrar sugerencias');
    }
  };

  const clearSuggestionFilter = () => {
    suggestionFilterForm.resetFields();
    loadSuggestions();
  };

  // ============================================
  // DENUNCIAS - ACCIONES
  // ============================================

  const submitComplaint = async () => {
    try {
      const values = await complaintForm.validateFields();

      if (complaintFileList.length > 0) {
        const formData = new FormData();
        if (values.mailbox_type) formData.append('mailbox_type', values.mailbox_type.toString());
        formData.append('type', values.type.toString());
        formData.append('description', values.description);
        formData.append('anonymous', String(values.anonymous ?? true));
        if (values.user && !values.anonymous) formData.append('user', values.user);
        if (values.other_type) formData.append('other_type', values.other_type);
        formData.append('file', complaintFileList[0].originFileObj as File);
        await createComplaint(Object.fromEntries(formData) as any);
      } else {
        await createComplaint({
          mailbox_type: values.mailbox_type,
          type: values.type,
          description: values.description,
          user: values.anonymous ? undefined : values.user,
          anonymous: values.anonymous ?? true,
          other_type: values.other_type,
        });
      }

      message.success('Denuncia enviada exitosamente');
      setComplaintModalOpen(false);
      complaintForm.resetFields();
      setComplaintFileList([]);
      setSelectedComplaintType(null);
      loadComplaints();
    } catch {
      message.error('No se pudo enviar la denuncia');
    }
  };

  const submitComplaintFilter = async () => {
    try {
      const values = complaintFilterForm.getFieldsValue();
      const payload = {
        mailbox_type: values.mailbox_type,
        user: values.user,
        date: values.date ? dayjs(values.date).format('YYYY-MM-DD') : undefined,
      };
      const data = await filterComplaints(payload);
      setComplaints(data);
    } catch {
      message.error('No se pudo filtrar denuncias');
    }
  };

  const clearComplaintFilter = () => {
    complaintFilterForm.resetFields();
    loadComplaints();
  };

  // ============================================
  // OBSERVACIONES
  // ============================================

  const openObservations = async (type: 'suggestion' | 'complaint', id: number) => {
    setSelectedObservationTarget({ type, id });
    setObservationsOpen(true);
    setObservationLoading(true);
    try {
      const data =
        type === 'suggestion'
          ? await fetchSuggestionObservations(id)
          : await fetchComplaintObservations(id);
      setObservationItems(data);
    } catch {
      message.error('No se pudieron cargar observaciones');
    } finally {
      setObservationLoading(false);
    }
  };

  const submitObservation = async () => {
    if (!selectedObservationTarget) return;
    try {
      const values = await observationForm.validateFields();
      if (selectedObservationTarget.type === 'suggestion') {
        await addSuggestionObservation({
          pk: selectedObservationTarget.id,
          description: values.description,
        });
      } else {
        await addComplaintObservation({
          pk: selectedObservationTarget.id,
          description: values.description,
        });
      }
      observationForm.resetFields();
      await openObservations(selectedObservationTarget.type, selectedObservationTarget.id);
      message.success('Observacion agregada');
    } catch {
      message.error('No se pudo agregar la observacion');
    }
  };

  // ============================================
  // COLUMNAS DE TABLAS
  // ============================================

  const certificateColumns = useMemo(
    () => [
      { title: '#', dataIndex: 'id', width: 60 },
      {
        title: 'Tipo',
        dataIndex: 'type',
        render: (value: CertificateType | null) =>
          value && typeof value === 'object' ? value.name : value != null ? String(value) : '-',
      },
      {
        title: 'Usuario',
        dataIndex: 'user',
        render: (value: CertificateUser | null) => value ? getUserDisplayName(value) : '-',
      },
      {
        title: 'Fecha solicitud',
        dataIndex: 'create',
        render: (value: string) =>
          value ? dayjs(value).format('DD/MM/YYYY HH:mm') : '-',
      },
      {
        title: 'Estado',
        dataIndex: 'state',
        render: (value: number) => getCertificateStateTag(value),
      },
      ...(isCertAdmin
        ? [
            {
              title: 'Acciones',
              width: 200,
              render: (_: unknown, record: Certificate) => (
                <Select
                  size="small"
                  style={{ width: 150 }}
                  value={record.state}
                  onChange={(value) => handleUpdateCertificateState(record.id, value)}
                  options={certificateStates.map((s) => ({
                    label: s.label,
                    value: s.id,
                  }))}
                />
              ),
            },
          ]
        : []),
    ],
    [isCertAdmin],
  );

  // Certificados visibles según la tarjeta-resumen seleccionada
  const visibleCertificates = useMemo(
    () =>
      certStateFilter == null
        ? certificates
        : certificates.filter((c) => c.state === certStateFilter),
    [certificates, certStateFilter],
  );

  const suggestionColumns = useMemo(
    () => [
      { title: '#', dataIndex: 'id', width: 60 },
      {
        title: 'Fecha',
        dataIndex: 'created',
        width: 140,
        render: (value: string) =>
          value ? dayjs(value).format('DD/MM/YYYY HH:mm') : '-',
      },
      {
        title: 'Buzon',
        dataIndex: 'mailbox_type',
        width: 100,
        render: (value: MailboxType | null) =>
          value && typeof value === 'object' ? value.name : value != null ? String(value) : '-',
      },
      {
        title: 'Usuario',
        dataIndex: 'user',
        width: 150,
        render: (value: string | null, record: Suggestion) =>
          record.anonymous ? <Tag>Anonimo</Tag> : value || '-',
      },
      {
        title: 'Descripcion',
        dataIndex: 'description',
        ellipsis: true,
      },
      {
        title: 'Archivo',
        dataIndex: 'file',
        width: 80,
        render: (value: string | null) =>
          value ? (
            <a href={value} target="_blank" rel="noopener noreferrer">
              <FileTextOutlined /> Ver
            </a>
          ) : (
            <Text type="secondary">N/A</Text>
          ),
      },
      {
        title: 'Acciones',
        width: 140,
        render: (_: unknown, record: Suggestion) => (
          <Space>
            <Button
              size="small"
              icon={<CommentOutlined />}
              onClick={() => openObservations('suggestion', record.id)}
            >
              Observaciones
            </Button>
          </Space>
        ),
      },
    ],
    [],
  );

  const complaintColumns = useMemo(
    () => [
      { title: '#', dataIndex: 'id', width: 60 },
      {
        title: 'Fecha',
        dataIndex: 'created',
        width: 140,
        render: (value: string) =>
          value ? dayjs(value).format('DD/MM/YYYY HH:mm') : '-',
      },
      {
        title: 'Buzon',
        dataIndex: 'mailbox_type',
        width: 100,
        render: (value: MailboxType | null) =>
          value && typeof value === 'object' ? value.name : value != null ? String(value) : '-',
      },
      {
        title: 'Tipo denuncia',
        dataIndex: 'type',
        width: 160,
        render: (value: ComplaintType | null, record: Complaint) => {
          const name = value && typeof value === 'object' ? value.name : value != null ? String(value) : '-';
          return record.other_type ? `${name} - ${record.other_type}` : name;
        },
      },
      {
        title: 'Usuario',
        dataIndex: 'user',
        width: 150,
        render: (value: string | null, record: Complaint) =>
          record.anonymous ? <Tag>Anonimo</Tag> : value || '-',
      },
      {
        title: 'Descripcion',
        dataIndex: 'description',
        width: 340,
        render: (value: string) =>
          value ? (
            <Typography.Paragraph
              style={{ marginBottom: 0, whiteSpace: 'pre-wrap' }}
              ellipsis={{ rows: 2, expandable: true, symbol: 'ver más' }}
            >
              {value}
            </Typography.Paragraph>
          ) : (
            <Text type="secondary">-</Text>
          ),
      },
      {
        title: 'Archivo',
        dataIndex: 'file',
        width: 80,
        render: (value: string | null) =>
          value ? (
            <a href={value} target="_blank" rel="noopener noreferrer">
              <FileTextOutlined /> Ver
            </a>
          ) : (
            <Text type="secondary">N/A</Text>
          ),
      },
      {
        title: 'Acciones',
        width: 140,
        render: (_: unknown, record: Complaint) => (
          <Space>
            <Button
              size="small"
              icon={<CommentOutlined />}
              onClick={() => openObservations('complaint', record.id)}
            >
              Observaciones
            </Button>
          </Space>
        ),
      },
    ],
    [],
  );

  // ============================================
  // RENDER - TAB CERTIFICADOS
  // ============================================

  const renderCertificatesTab = () => (
    <div>
      {/* Seccion de solicitudes del usuario */}
      <Card
        title={
          <Space>
            <UserOutlined />
            <span>Mis solicitudes</span>
          </Space>
        }
        style={{ marginBottom: 24 }}
      >
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} md={8}>
            <Card
              size="small"
              hoverable
              style={{ textAlign: 'center' }}
            >
              <SafetyCertificateOutlined
                style={{ fontSize: 32, color: '#1677ff', marginBottom: 8 }}
              />
              <Title level={5} style={{ marginBottom: 8 }}>
                Constancia Laboral
              </Title>
              <Text type="secondary" style={{ display: 'block', marginBottom: 12 }}>
                Solicita tu constancia laboral. Si la solicitas de lunes a jueves, se entrega el
                viernes de esta semana. Si la solicitas viernes o fin de semana, se entrega el
                viernes de la proxima semana.
              </Text>
              <Button
                type="primary"
                icon={<FileTextOutlined />}
                loading={requestingWork}
                onClick={handleRequestWorkCertificate}
                block
              >
                Solicitar
              </Button>
            </Card>
          </Col>
        </Row>
      </Card>

      {/* Seccion de administracion */}
      <Card
        title={
          <Space>
            <TeamOutlined />
            <span>{isCertAdmin ? 'Administracion de certificados' : 'Mis certificados'}</span>
          </Space>
        }
        extra={
          <Space>
            {isCertAdmin && (
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => setCertificateModalOpen(true)}
              >
                Crear certificado
              </Button>
            )}
            <Button icon={<ReloadOutlined />} onClick={loadCertificates}>
              Recargar
            </Button>
          </Space>
        }
      >
        {/* Resumen de estados — cada tarjeta filtra la tabla al hacer clic */}
        <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
          {[
            { key: 1, label: 'Ingresadas', color: '#fa8c16', count: certificates.filter((c) => c.state === 1).length },
            { key: 2, label: 'Entregadas', color: '#52c41a', count: certificates.filter((c) => c.state === 2).length },
            { key: null as number | null, label: 'Total', color: '#1677ff', count: certificates.length },
          ].map((card) => {
            const active = certStateFilter === card.key;
            return (
              <Col xs={12} sm={8} md={6} key={card.label}>
                <Card
                  size="small"
                  hoverable
                  onClick={() => setCertStateFilter(card.key)}
                  aria-pressed={active}
                  style={{
                    textAlign: 'center',
                    borderTop: `3px solid ${card.color}`,
                    cursor: 'pointer',
                    outline: active ? `2px solid ${card.color}` : 'none',
                    background: active ? `${card.color}14` : undefined,
                  }}
                >
                  <Title level={3} style={{ margin: 0, color: card.color }}>
                    {card.count}
                  </Title>
                  <Text type="secondary">{card.label}</Text>
                </Card>
              </Col>
            );
          })}
        </Row>

        <Table
          rowKey="id"
          loading={certLoading}
          dataSource={visibleCertificates}
          columns={certificateColumns as any}
          pagination={{ pageSize: 10 }}
          size="middle"
          scroll={{ x: 800 }}
        />
      </Card>
    </div>
  );

  // ============================================
  // RENDER - TAB SUGERENCIAS
  // ============================================

  const renderSuggestionsTab = () => (
    <div>
      <Card
        title={
          <Space>
            <InboxOutlined />
            <span>Buzon de sugerencias</span>
          </Space>
        }
        extra={
          <Space>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => {
                suggestionForm.resetFields();
                suggestionForm.setFieldsValue({ anonymous: true });
                setSuggestionFileList([]);
                setSuggestionModalOpen(true);
              }}
            >
              Nueva sugerencia
            </Button>
            {canViewMailboxList && (
              <Button icon={<ReloadOutlined />} onClick={loadSuggestions}>
                Recargar
              </Button>
            )}
          </Space>
        }
      >
        {canViewMailboxList ? (
          <>
            {/* Filtros */}
            <Card size="small" style={{ marginBottom: 16, background: 'transparent' }} variant="borderless">
              <Form form={suggestionFilterForm} layout="inline">
                <Form.Item name="mailbox_type" label="Buzon">
                  <Select
                    allowClear
                    placeholder="Todos"
                    style={{ width: 140 }}
                    options={mailboxTypes.map((m) => ({ label: m.name, value: m.id }))}
                  />
                </Form.Item>
                <Form.Item name="date" label="Fecha">
                  <DatePicker placeholder="Seleccionar" />
                </Form.Item>
                <Form.Item name="user" label="Usuario">
                  <Input placeholder="Nombre" style={{ width: 150 }} />
                </Form.Item>
                <Form.Item>
                  <Space>
                    <Button icon={<FilterOutlined />} onClick={submitSuggestionFilter}>
                      Filtrar
                    </Button>
                    <Button onClick={clearSuggestionFilter}>Limpiar</Button>
                  </Space>
                </Form.Item>
              </Form>
            </Card>

            <Table
              rowKey="id"
              loading={suggestionsLoading}
              dataSource={suggestions}
              columns={suggestionColumns as any}
              pagination={{ pageSize: 10 }}
              size="middle"
              scroll={{ x: 900 }}
            />
          </>
        ) : (
          <Text type="secondary">
            Envía tu sugerencia con el botón "Nueva sugerencia". El listado del buzón
            solo está disponible para los encargados.
          </Text>
        )}
      </Card>
    </div>
  );

  // ============================================
  // RENDER - TAB DENUNCIAS
  // ============================================

  const renderComplaintsTab = () => (
    <div>
      <Card
        title={
          <Space>
            <InboxOutlined />
            <span>Buzon de denuncias</span>
          </Space>
        }
        extra={
          <Space>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => {
                complaintForm.resetFields();
                complaintForm.setFieldsValue({ anonymous: true });
                setComplaintFileList([]);
                setSelectedComplaintType(null);
                setComplaintModalOpen(true);
              }}
            >
              Nueva denuncia
            </Button>
            {canViewMailboxList && (
              <Button icon={<ReloadOutlined />} onClick={loadComplaints}>
                Recargar
              </Button>
            )}
          </Space>
        }
      >
        {canViewMailboxList ? (
          <>
            {/* Filtros */}
            <Card size="small" style={{ marginBottom: 16, background: 'transparent' }} variant="borderless">
              <Form form={complaintFilterForm} layout="inline">
                <Form.Item name="mailbox_type" label="Buzon">
                  <Select
                    allowClear
                    placeholder="Todos"
                    style={{ width: 140 }}
                    options={mailboxTypes.map((m) => ({ label: m.name, value: m.id }))}
                  />
                </Form.Item>
                <Form.Item name="date" label="Fecha">
                  <DatePicker placeholder="Seleccionar" />
                </Form.Item>
                <Form.Item name="user" label="Usuario">
                  <Input placeholder="Nombre" style={{ width: 150 }} />
                </Form.Item>
                <Form.Item>
                  <Space>
                    <Button icon={<FilterOutlined />} onClick={submitComplaintFilter}>
                      Filtrar
                    </Button>
                    <Button onClick={clearComplaintFilter}>Limpiar</Button>
                  </Space>
                </Form.Item>
              </Form>
            </Card>

            <Table
              rowKey="id"
              loading={complaintsLoading}
              dataSource={complaints}
              columns={complaintColumns as any}
              pagination={{ pageSize: 10 }}
              size="middle"
              scroll={{ x: 1000 }}
            />
          </>
        ) : (
          <Text type="secondary">
            Envía tu denuncia con el botón "Nueva denuncia". El listado del buzón
            solo está disponible para los encargados.
          </Text>
        )}
      </Card>
    </div>
  );

  // ============================================
  // RENDER PRINCIPAL
  // ============================================

  return (
    <div style={{ padding: '0 8px' }}>
      <Title level={3} style={{ marginBottom: 24 }}>
        <TeamOutlined style={{ marginRight: 8 }} />
        Recursos Humanos
      </Title>

      <Tabs
        type="card"
        items={[
          {
            key: 'certificates',
            label: (
              <span>
                <SafetyCertificateOutlined /> Certificados
              </span>
            ),
            children: renderCertificatesTab(),
          },
          {
            key: 'suggestions',
            label: (
              <span>
                <InboxOutlined /> Sugerencias
              </span>
            ),
            children: renderSuggestionsTab(),
          },
          {
            key: 'complaints',
            label: (
              <span>
                <InboxOutlined /> Denuncias
              </span>
            ),
            children: renderComplaintsTab(),
          },
        ]}
      />

      {/* Modal - Crear certificado (admin) */}
      <Modal
        open={certificateModalOpen}
        onCancel={() => {
          setCertificateModalOpen(false);
          certificateForm.resetFields();
        }}
        onOk={submitCertificate}
        okText="Crear"
        title={
          <Space>
            <PlusOutlined />
            <span>Crear certificado</span>
          </Space>
        }
      >
        <Form
          form={certificateForm}
          layout="vertical"
          initialValues={{ user: userId || undefined }}
        >
          <Form.Item
            name="type"
            label="Tipo de certificado"
            rules={[{ required: true, message: 'Selecciona un tipo' }]}
          >
            <Select
              placeholder="Seleccionar tipo"
              options={certificateTypes.map((t) => ({ label: t.name, value: t.id }))}
            />
          </Form.Item>
          <Form.Item
            name="user"
            label="Usuario"
            rules={[{ required: true, message: 'Selecciona un usuario' }]}
          >
            <Select
              showSearch
              placeholder="Buscar usuario"
              optionFilterProp="label"
              options={users.map((u) => ({
                label: `${u.first_name} ${u.last_name}`.trim(),
                value: u.id,
              }))}
            />
          </Form.Item>
        </Form>
      </Modal>

      {/* Modal - Nueva sugerencia */}
      <Modal
        open={suggestionModalOpen}
        onCancel={() => {
          setSuggestionModalOpen(false);
          suggestionForm.resetFields();
          setSuggestionFileList([]);
        }}
        onOk={submitSuggestion}
        okText="Enviar"
        title={
          <Space>
            <PlusOutlined />
            <span>Nueva sugerencia</span>
          </Space>
        }
        width={560}
      >
        <Form form={suggestionForm} layout="vertical" initialValues={{ anonymous: true }}>
          <Form.Item name="mailbox_type" label="Tipo de buzon">
            <Select
              allowClear
              placeholder="Seleccionar tipo"
              options={mailboxTypes.map((m) => ({ label: m.name, value: m.id }))}
            />
          </Form.Item>
          <Form.Item name="anonymous" valuePropName="checked">
            <Checkbox>Enviar de forma anonima</Checkbox>
          </Form.Item>
          <Form.Item noStyle shouldUpdate={(prev, cur) => prev.anonymous !== cur.anonymous}>
            {({ getFieldValue }) =>
              !getFieldValue('anonymous') ? (
                <Form.Item name="user" label="Tu nombre">
                  <Input placeholder="Nombre completo" />
                </Form.Item>
              ) : null
            }
          </Form.Item>
          <Form.Item
            name="description"
            label="Descripcion"
            rules={[{ required: true, message: 'Ingresa una descripcion' }]}
          >
            <Input.TextArea rows={5} placeholder="Escribe tu sugerencia aqui..." />
          </Form.Item>
          <Form.Item label="Archivo adjunto (opcional)">
            <Upload
              fileList={suggestionFileList}
              onChange={({ fileList }) => setSuggestionFileList(fileList.slice(-1))}
              beforeUpload={() => false}
              maxCount={1}
            >
              <Button icon={<UploadOutlined />}>Seleccionar archivo</Button>
            </Upload>
          </Form.Item>
        </Form>
      </Modal>

      {/* Modal - Nueva denuncia */}
      <Modal
        open={complaintModalOpen}
        onCancel={() => {
          setComplaintModalOpen(false);
          complaintForm.resetFields();
          setComplaintFileList([]);
          setSelectedComplaintType(null);
        }}
        onOk={submitComplaint}
        okText="Enviar"
        title={
          <Space>
            <PlusOutlined />
            <span>Nueva denuncia</span>
          </Space>
        }
        width={560}
      >
        <Form form={complaintForm} layout="vertical" initialValues={{ anonymous: true }}>
          <Form.Item name="mailbox_type" label="Tipo de buzon">
            <Select
              allowClear
              placeholder="Seleccionar tipo"
              options={mailboxTypes.map((m) => ({ label: m.name, value: m.id }))}
            />
          </Form.Item>
          <Form.Item
            name="type"
            label="Tipo de denuncia"
            rules={[{ required: true, message: 'Selecciona un tipo de denuncia' }]}
          >
            <Select
              placeholder="Seleccionar tipo"
              onChange={(value) => setSelectedComplaintType(value)}
              options={complaintTypes.map((t) => ({ label: t.name, value: t.id }))}
            />
          </Form.Item>
          {selectedComplaintType === 10 && (
            <Form.Item name="other_type" label="Especifica el tipo">
              <Input placeholder="Describe el tipo de denuncia" />
            </Form.Item>
          )}
          <Form.Item name="anonymous" valuePropName="checked">
            <Checkbox>Enviar de forma anonima</Checkbox>
          </Form.Item>
          <Form.Item noStyle shouldUpdate={(prev, cur) => prev.anonymous !== cur.anonymous}>
            {({ getFieldValue }) =>
              !getFieldValue('anonymous') ? (
                <Form.Item name="user" label="Tu nombre">
                  <Input placeholder="Nombre completo" />
                </Form.Item>
              ) : null
            }
          </Form.Item>
          <Form.Item
            name="description"
            label="Descripcion"
            rules={[{ required: true, message: 'Ingresa una descripcion' }]}
          >
            <Input.TextArea rows={5} placeholder="Describe la denuncia aqui..." />
          </Form.Item>
          <Form.Item label="Archivo adjunto (opcional)">
            <Upload
              fileList={complaintFileList}
              onChange={({ fileList }) => setComplaintFileList(fileList.slice(-1))}
              beforeUpload={() => false}
              maxCount={1}
            >
              <Button icon={<UploadOutlined />}>Seleccionar archivo</Button>
            </Upload>
          </Form.Item>
        </Form>
      </Modal>

      {/* Modal - Observaciones */}
      <Modal
        open={observationsOpen}
        onCancel={() => {
          setObservationsOpen(false);
          observationForm.resetFields();
        }}
        onOk={submitObservation}
        okText="Agregar observacion"
        title={
          <Space>
            <EyeOutlined />
            <span>Observaciones</span>
          </Space>
        }
        width={600}
      >
        <Form form={observationForm} layout="vertical">
          <Form.Item
            name="description"
            label="Nueva observacion"
            rules={[{ required: true, message: 'Ingresa una observacion' }]}
          >
            <Input.TextArea rows={3} placeholder="Escribe tu observacion aqui..." />
          </Form.Item>
        </Form>

        <Divider style={{ margin: '12px 0' }} />

        <Table
          rowKey="id"
          loading={observationLoading}
          dataSource={observationItems}
          columns={[
            {
              title: '#',
              width: 50,
              render: (_: unknown, __: Observation, index: number) => index + 1,
            },
            {
              title: 'Fecha',
              dataIndex: 'created',
              width: 140,
              render: (value: string) =>
                value ? dayjs(value).format('DD/MM/YYYY HH:mm') : '-',
            },
            { title: 'Descripcion', dataIndex: 'description' },
          ]}
          pagination={false}
          size="small"
          locale={{ emptyText: 'No hay observaciones aun' }}
        />
      </Modal>
    </div>
  );
};

export default HumanResourcesPage;
