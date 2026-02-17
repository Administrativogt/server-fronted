import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
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
  MedicineBoxOutlined,
  UploadOutlined,
  PlusOutlined,
  ReloadOutlined,
  FilterOutlined,
  EyeOutlined,
  CommentOutlined,
  InboxOutlined,
  TeamOutlined,
  UserOutlined,
  FileProtectOutlined,
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
  type OrnamentTicket,
  type OrnamentTicketIndex,
  type Suggestion,
  addComplaintObservation,
  addSuggestionObservation,
  checkCanApplyOrnament,
  createCertificate,
  createComplaint,
  createOrnamentTicket,
  createSuggestion,
  fetchAllCertificates,
  fetchCertificateTypes,
  fetchComplaintObservations,
  fetchComplaintTypes,
  fetchComplaints,
  fetchMailboxTypes,
  fetchOrnamentTicketIndex,
  fetchPendingCertificates,
  fetchSuggestionObservations,
  fetchSuggestions,
  filterComplaints,
  filterSuggestions,
  requestIgssCertificate,
  requestWorkCertificate,
  updateCertificateState,
  uploadOrnamentTicketFile,
} from '../../api/humanResources';
import type { UploadFile } from 'antd/es/upload';

const { Title, Text } = Typography;

const certificateStates = [
  { id: 1, label: 'Pendiente', color: 'orange' },
  { id: 2, label: 'Entregado', color: 'green' },
  { id: 3, label: 'Cancelado', color: 'red' },
];

const HumanResourcesPage: React.FC = () => {
  const username = useAuthStore((s) => s.username);
  const userId = useAuthStore((s) => s.userId);
  const tipoUsuario = useAuthStore((s) => s.tipo_usuario);
  const isSuperuser = useAuthStore((s) => s.is_superuser);

  const isAdmin = isSuperuser || tipoUsuario === 18 || tipoUsuario === 6;

  // Datos maestros
  const [mailboxTypes, setMailboxTypes] = useState<MailboxType[]>([]);
  const [complaintTypes, setComplaintTypes] = useState<ComplaintType[]>([]);
  const [certificateTypes, setCertificateTypes] = useState<CertificateType[]>([]);
  const [users, setUsers] = useState<UserLite[]>([]);

  // Certificados
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [certLoading, setCertLoading] = useState(false);
  const [showAllCertificates, setShowAllCertificates] = useState(false);
  const [certificateModalOpen, setCertificateModalOpen] = useState(false);
  const [certificateForm] = Form.useForm();
  const [igssModalOpen, setIgssModalOpen] = useState(false);
  const [igssForm] = Form.useForm();
  const [requestingWork, setRequestingWork] = useState(false);
  const [requestingIgss, setRequestingIgss] = useState(false);

  // Boletos de ornato
  const [ornamentIndex, setOrnamentIndex] = useState<OrnamentTicketIndex | null>(null);
  const [ornamentLoading, setOrnamentLoading] = useState(false);
  const [canApplyOrnament, setCanApplyOrnament] = useState(false);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [uploadTicketId, setUploadTicketId] = useState<number | null>(null);
  const [uploadFileList, setUploadFileList] = useState<UploadFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [requestingOrnament, setRequestingOrnament] = useState(false);

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
      const data = showAllCertificates
        ? await fetchAllCertificates()
        : await fetchPendingCertificates();
      setCertificates(data);
    } catch {
      message.error('Error al cargar certificados');
    } finally {
      setCertLoading(false);
    }
  }, [showAllCertificates]);

  const loadOrnamentData = useCallback(async () => {
    setOrnamentLoading(true);
    try {
      const [indexData, canApply] = await Promise.all([
        fetchOrnamentTicketIndex(),
        checkCanApplyOrnament(),
      ]);
      setOrnamentIndex(indexData);
      setCanApplyOrnament(canApply);
    } catch {
      message.error('Error al cargar datos de boletos de ornato');
    } finally {
      setOrnamentLoading(false);
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
    loadOrnamentData();
    loadSuggestions();
    loadComplaints();
  }, [loadOrnamentData, loadSuggestions, loadComplaints]);

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

  const handleRequestIgssCertificate = async () => {
    setRequestingIgss(true);
    try {
      const values = await igssForm.validateFields();
      const requestDate = values.request_date
        ? dayjs(values.request_date).format('YYYY-MM-DD')
        : undefined;
      await requestIgssCertificate(requestDate);
      message.success('Constancia IGSS solicitada. Se notificó a Recursos Humanos.');
      setIgssModalOpen(false);
      igssForm.resetFields();
      loadCertificates();
    } catch {
      message.error('No se pudo solicitar la constancia IGSS');
    } finally {
      setRequestingIgss(false);
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
  // BOLETOS DE ORNATO - ACCIONES
  // ============================================

  const handleRequestOrnament = async (ornamentOption?: number) => {
    setRequestingOrnament(true);
    try {
      await createOrnamentTicket(ornamentOption);
      message.success('Boleto de ornato solicitado. Se notificó a Recursos Humanos.');
      loadOrnamentData();
    } catch {
      message.error('No se pudo solicitar el boleto de ornato');
    } finally {
      setRequestingOrnament(false);
    }
  };

  const handleUploadOrnamentFile = async () => {
    if (!uploadTicketId || uploadFileList.length === 0) {
      message.warning('Selecciona un archivo para subir');
      return;
    }
    setUploading(true);
    try {
      const file = uploadFileList[0].originFileObj as File;
      await uploadOrnamentTicketFile(uploadTicketId, file);
      message.success('Archivo subido exitosamente');
      setUploadModalOpen(false);
      setUploadFileList([]);
      setUploadTicketId(null);
      loadOrnamentData();
    } catch {
      message.error('No se pudo subir el archivo');
    } finally {
      setUploading(false);
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
      ...(isAdmin
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
    [isAdmin, showAllCertificates],
  );

  const ornamentColumns = useMemo(
    () => [
      { title: '#', dataIndex: 'id', width: 60 },
      {
        title: 'Usuario',
        dataIndex: 'user',
        render: (value: { first_name: string; last_name: string } | null) =>
          value && typeof value === 'object'
            ? `${value.first_name || ''} ${value.last_name || ''}`.trim() || '-'
            : '-',
      },
      {
        title: 'Fecha solicitud',
        dataIndex: 'upload',
        render: (value: string) =>
          value ? dayjs(value).format('DD/MM/YYYY HH:mm') : '-',
      },
      {
        title: 'Fecha limite',
        render: (_: unknown, record: OrnamentTicket) => {
          const limitDate = record.limit_date || dayjs(record.upload).add(7, 'day').toISOString();
          const isOverdue = dayjs().isAfter(dayjs(limitDate));
          return (
            <Text type={isOverdue ? 'danger' : undefined}>
              {dayjs(limitDate).format('DD/MM/YYYY')}
            </Text>
          );
        },
      },
      {
        title: 'Archivo',
        dataIndex: 'file',
        render: (value: string | null) =>
          value ? (
            <Tag color="green" icon={<FileProtectOutlined />}>
              Subido
            </Tag>
          ) : (
            <Tag color="orange">Pendiente</Tag>
          ),
      },
      ...(isAdmin
        ? [
            {
              title: 'Acciones',
              width: 120,
              render: (_: unknown, record: OrnamentTicket) =>
                !record.file ? (
                  <Button
                    size="small"
                    type="primary"
                    icon={<UploadOutlined />}
                    onClick={() => {
                      setUploadTicketId(record.id);
                      setUploadModalOpen(true);
                    }}
                  >
                    Subir
                  </Button>
                ) : null,
            },
          ]
        : []),
    ],
    [isAdmin],
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

          <Col xs={24} sm={12} md={8}>
            <Card
              size="small"
              hoverable
              style={{ textAlign: 'center' }}
            >
              <MedicineBoxOutlined
                style={{ fontSize: 32, color: '#52c41a', marginBottom: 8 }}
              />
              <Title level={5} style={{ marginBottom: 8 }}>
                Constancia IGSS
              </Title>
              <Text type="secondary" style={{ display: 'block', marginBottom: 12 }}>
                Solicita tu constancia del IGSS. Puedes indicar una fecha especifica si lo
                necesitas.
              </Text>
              <Button
                type="primary"
                icon={<MedicineBoxOutlined />}
                onClick={() => setIgssModalOpen(true)}
                block
                style={{ background: '#52c41a', borderColor: '#52c41a' }}
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
            <span>{isAdmin ? 'Administracion de certificados' : 'Certificados'}</span>
          </Space>
        }
        extra={
          <Space>
            {isAdmin && (
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => setCertificateModalOpen(true)}
              >
                Crear certificado
              </Button>
            )}
            <Checkbox
              checked={showAllCertificates}
              onChange={(e) => setShowAllCertificates(e.target.checked)}
            >
              Ver todos
            </Checkbox>
            <Button icon={<ReloadOutlined />} onClick={loadCertificates}>
              Recargar
            </Button>
          </Space>
        }
      >
        <Table
          rowKey="id"
          loading={certLoading}
          dataSource={certificates}
          columns={certificateColumns as any}
          pagination={{ pageSize: 10 }}
          size="middle"
          scroll={{ x: 800 }}
        />
      </Card>
    </div>
  );

  // ============================================
  // RENDER - TAB BOLETOS DE ORNATO
  // ============================================

  const renderOrnamentTab = () => (
    <div>
      {/* Seccion de solicitud */}
      <Card
        title={
          <Space>
            <FileProtectOutlined />
            <span>Solicitar boleto de ornato</span>
          </Space>
        }
        style={{ marginBottom: 24 }}
      >
        {canApplyOrnament ? (
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12}>
              <Card size="small" hoverable style={{ textAlign: 'center' }}>
                <UserOutlined
                  style={{ fontSize: 32, color: '#1677ff', marginBottom: 8 }}
                />
                <Title level={5} style={{ marginBottom: 8 }}>
                  Solicitar para mi
                </Title>
                <Text type="secondary" style={{ display: 'block', marginBottom: 12 }}>
                  Solicita que Recursos Humanos gestione tu boleto de ornato para este ano.
                </Text>
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  loading={requestingOrnament}
                  onClick={() => handleRequestOrnament()}
                  block
                >
                  Solicitar
                </Button>
              </Card>
            </Col>

            {ornamentIndex?.partner && (
              <Col xs={24} sm={12}>
                <Card size="small" hoverable style={{ textAlign: 'center' }}>
                  <TeamOutlined
                    style={{ fontSize: 32, color: '#722ed1', marginBottom: 8 }}
                  />
                  <Title level={5} style={{ marginBottom: 8 }}>
                    Solicitar para{' '}
                    {`${ornamentIndex.partner.first_name} ${ornamentIndex.partner.last_name}`.trim()}
                  </Title>
                  <Text type="secondary" style={{ display: 'block', marginBottom: 12 }}>
                    Solicita el boleto de ornato para tu colaborador.
                  </Text>
                  <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    loading={requestingOrnament}
                    onClick={() => handleRequestOrnament(ornamentIndex.partner!.id)}
                    block
                    style={{ background: '#722ed1', borderColor: '#722ed1' }}
                  >
                    Solicitar
                  </Button>
                </Card>
              </Col>
            )}
          </Row>
        ) : (
          <Alert
            message="Ya solicitaste tu boleto de ornato para este ano"
            description="No puedes solicitar otro boleto de ornato este ano. Si necesitas ayuda, contacta a Recursos Humanos."
            type="info"
            showIcon
          />
        )}
      </Card>

      {/* Tabla de boletos pendientes */}
      <Card
        title={
          <Space>
            <InboxOutlined />
            <span>Boletos de ornato pendientes</span>
          </Space>
        }
        extra={
          <Button icon={<ReloadOutlined />} onClick={loadOrnamentData}>
            Recargar
          </Button>
        }
      >
        <Table
          rowKey="id"
          loading={ornamentLoading}
          dataSource={ornamentIndex?.ornament_tickets || []}
          columns={ornamentColumns as any}
          pagination={{ pageSize: 10 }}
          size="middle"
          scroll={{ x: 700 }}
          locale={{ emptyText: 'No hay boletos pendientes' }}
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
            <Button icon={<ReloadOutlined />} onClick={loadSuggestions}>
              Recargar
            </Button>
          </Space>
        }
      >
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
            <Button icon={<ReloadOutlined />} onClick={loadComplaints}>
              Recargar
            </Button>
          </Space>
        }
      >
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
            key: 'ornament',
            label: (
              <span>
                <FileProtectOutlined /> Boletos de Ornato
              </span>
            ),
            children: renderOrnamentTab(),
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

      {/* Modal - Solicitar Constancia IGSS */}
      <Modal
        open={igssModalOpen}
        onCancel={() => {
          setIgssModalOpen(false);
          igssForm.resetFields();
        }}
        onOk={handleRequestIgssCertificate}
        okText="Solicitar"
        confirmLoading={requestingIgss}
        title={
          <Space>
            <MedicineBoxOutlined />
            <span>Solicitar Constancia IGSS</span>
          </Space>
        }
      >
        <Form form={igssForm} layout="vertical">
          <Form.Item
            name="request_date"
            label="Fecha de la constancia (opcional)"
            help="Si no seleccionas fecha, se usara la fecha actual"
          >
            <DatePicker style={{ width: '100%' }} placeholder="Seleccionar fecha" />
          </Form.Item>
        </Form>
      </Modal>

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

      {/* Modal - Subir archivo de boleto de ornato */}
      <Modal
        open={uploadModalOpen}
        onCancel={() => {
          setUploadModalOpen(false);
          setUploadFileList([]);
          setUploadTicketId(null);
        }}
        onOk={handleUploadOrnamentFile}
        okText="Subir archivo"
        confirmLoading={uploading}
        title={
          <Space>
            <UploadOutlined />
            <span>Subir boleto de ornato</span>
          </Space>
        }
      >
        <Upload.Dragger
          fileList={uploadFileList}
          onChange={({ fileList }) => setUploadFileList(fileList.slice(-1))}
          beforeUpload={() => false}
          accept=".pdf,.jpg,.jpeg,.png"
          maxCount={1}
        >
          <p className="ant-upload-drag-icon">
            <InboxOutlined />
          </p>
          <p className="ant-upload-text">Haz clic o arrastra el archivo aqui</p>
          <p className="ant-upload-hint">Solo archivos PDF o imagen. Maximo 1 archivo.</p>
        </Upload.Dragger>
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
