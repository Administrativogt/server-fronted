import React, { useEffect, useMemo, useState } from 'react';
import {
  Button,
  Checkbox,
  DatePicker,
  Form,
  Input,
  Modal,
  Select,
  Space,
  Table,
  Tabs,
  Tag,
  message,
} from 'antd';
import dayjs from 'dayjs';
import useAuthStore from '../../auth/useAuthStore';
import { fetchUsers, type UserLite } from '../../api/users';
import {
  type Certificate,
  type CertificateType,
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
  fetchPendingCertificates,
  fetchSuggestionObservations,
  fetchSuggestions,
  filterComplaints,
  filterSuggestions,
  updateCertificateState,
} from '../../api/humanResources';

const certificateStates = [
  { id: 1, label: 'Pendiente' },
  { id: 2, label: 'Entregado' },
  { id: 3, label: 'Cancelado' },
];

const HumanResourcesPage: React.FC = () => {
  const username = useAuthStore((s) => s.username);
  const userId = useAuthStore((s) => s.userId);
  const [mailboxTypes, setMailboxTypes] = useState<MailboxType[]>([]);
  const [complaintTypes, setComplaintTypes] = useState<ComplaintType[]>([]);
  const [certificateTypes, setCertificateTypes] = useState<CertificateType[]>([]);
  const [users, setUsers] = useState<UserLite[]>([]);

  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [certLoading, setCertLoading] = useState(false);
  const [showAllCertificates, setShowAllCertificates] = useState(false);

  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);

  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [complaintsLoading, setComplaintsLoading] = useState(false);

  const [certificateModalOpen, setCertificateModalOpen] = useState(false);
  const [suggestionModalOpen, setSuggestionModalOpen] = useState(false);
  const [complaintModalOpen, setComplaintModalOpen] = useState(false);

  const [certificateForm] = Form.useForm();
  const [suggestionForm] = Form.useForm();
  const [complaintForm] = Form.useForm();
  const [suggestionFilterForm] = Form.useForm();
  const [complaintFilterForm] = Form.useForm();

  const [observationsOpen, setObservationsOpen] = useState(false);
  const [observationItems, setObservationItems] = useState<Observation[]>([]);
  const [observationLoading, setObservationLoading] = useState(false);
  const [observationForm] = Form.useForm();
  const [selectedObservationTarget, setSelectedObservationTarget] = useState<{
    type: 'suggestion' | 'complaint';
    id: number;
  } | null>(null);

  useEffect(() => {
    const loadMasterData = async () => {
      try {
        const [mailboxes, complaintsTypes, certTypes, usersRes] = await Promise.all([
          fetchMailboxTypes(),
          fetchComplaintTypes(),
          fetchCertificateTypes(),
          fetchUsers(),
        ]);
        setMailboxTypes(mailboxes);
        setComplaintTypes(complaintsTypes);
        setCertificateTypes(certTypes);
        setUsers(usersRes);
      } catch {
        message.error('Error al cargar datos maestros');
      }
    };
    loadMasterData();
  }, []);

  const loadCertificates = async () => {
    setCertLoading(true);
    try {
      const data = showAllCertificates ? await fetchAllCertificates() : await fetchPendingCertificates();
      setCertificates(data);
    } catch {
      message.error('Error al cargar certificados');
    } finally {
      setCertLoading(false);
    }
  };

  const loadSuggestions = async () => {
    setSuggestionsLoading(true);
    try {
      const data = await fetchSuggestions();
      setSuggestions(data);
    } catch {
      message.error('Error al cargar sugerencias');
    } finally {
      setSuggestionsLoading(false);
    }
  };

  const loadComplaints = async () => {
    setComplaintsLoading(true);
    try {
      const data = await fetchComplaints();
      setComplaints(data);
    } catch {
      message.error('Error al cargar denuncias');
    } finally {
      setComplaintsLoading(false);
    }
  };

  useEffect(() => {
    loadCertificates();
  }, [showAllCertificates]);

  useEffect(() => {
    loadSuggestions();
    loadComplaints();
  }, []);

  const getMailboxName = (value: MailboxType | number) => {
    if (typeof value === 'object') return value.name;
    return mailboxTypes.find((item) => item.id === value)?.name || String(value);
  };

  const getComplaintTypeName = (value: ComplaintType | number) => {
    if (typeof value === 'object') return value.name;
    return complaintTypes.find((item) => item.id === value)?.name || String(value);
  };

  const getCertificateTypeName = (value: CertificateType | number) => {
    if (typeof value === 'object') return value.name;
    return certificateTypes.find((item) => item.id === value)?.name || String(value);
  };

  const getCertificateStateLabel = (stateId: number) =>
    certificateStates.find((item) => item.id === stateId)?.label || String(stateId);

  const submitCertificate = async () => {
    try {
      const values = await certificateForm.validateFields();
      await createCertificate({
        type: values.type,
        user: values.user,
      });
      message.success('Certificado creado');
      setCertificateModalOpen(false);
      certificateForm.resetFields();
      loadCertificates();
    } catch {
      message.error('No se pudo crear el certificado');
    }
  };

  const submitSuggestion = async () => {
    try {
      const values = await suggestionForm.validateFields();
      await createSuggestion({
        mailbox_type: values.mailbox_type,
        description: values.description,
        user: values.user,
        anonymous: values.anonymous ?? false,
      });
      message.success('Sugerencia enviada');
      setSuggestionModalOpen(false);
      suggestionForm.resetFields();
      loadSuggestions();
    } catch {
      message.error('No se pudo crear la sugerencia');
    }
  };

  const submitComplaint = async () => {
    try {
      const values = await complaintForm.validateFields();
      await createComplaint({
        mailbox_type: values.mailbox_type,
        type: values.type,
        description: values.description,
        user: values.user,
        anonymous: values.anonymous ?? false,
        other_type: values.other_type,
      });
      message.success('Denuncia enviada');
      setComplaintModalOpen(false);
      complaintForm.resetFields();
      loadComplaints();
    } catch {
      message.error('No se pudo crear la denuncia');
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
        await addSuggestionObservation({ pk: selectedObservationTarget.id, description: values.description });
      } else {
        await addComplaintObservation({ pk: selectedObservationTarget.id, description: values.description });
      }
      observationForm.resetFields();
      await openObservations(selectedObservationTarget.type, selectedObservationTarget.id);
      message.success('Observación agregada');
    } catch {
      message.error('No se pudo agregar la observación');
    }
  };

  const certificateColumns = useMemo(
    () => [
      { title: 'ID', dataIndex: 'id', width: 80 },
      {
        title: 'Tipo',
        dataIndex: 'type',
        render: (value: CertificateType | number) => getCertificateTypeName(value),
      },
      { title: 'Usuario', dataIndex: 'user', render: (value: number | string) => String(value) },
      {
        title: 'Estado',
        dataIndex: 'state',
        render: (value: number) => <Tag>{getCertificateStateLabel(value)}</Tag>,
      },
      {
        title: 'Acciones',
        render: (_: unknown, record: Certificate) => (
          <Space>
            <Select
              size="small"
              value={record.state}
              onChange={(value) => updateCertificateState(record.id, value).then(loadCertificates)}
              options={certificateStates.map((item) => ({ label: item.label, value: item.id }))}
            />
          </Space>
        ),
      },
    ],
    [certificateTypes, showAllCertificates]
  );

  const suggestionColumns = useMemo(
    () => [
      { title: 'ID', dataIndex: 'id', width: 80 },
      {
        title: 'Buzón',
        dataIndex: 'mailbox_type',
        render: (value: MailboxType | number) => getMailboxName(value),
      },
      { title: 'Usuario', dataIndex: 'user' },
      {
        title: 'Anónimo',
        dataIndex: 'anonymous',
        render: (value: boolean) => (value ? 'Sí' : 'No'),
      },
      { title: 'Descripción', dataIndex: 'description' },
      {
        title: 'Acciones',
        render: (_: unknown, record: Suggestion) => (
          <Button size="small" onClick={() => openObservations('suggestion', record.id)}>
            Observaciones
          </Button>
        ),
      },
    ],
    [mailboxTypes]
  );

  const complaintColumns = useMemo(
    () => [
      { title: 'ID', dataIndex: 'id', width: 80 },
      {
        title: 'Buzón',
        dataIndex: 'mailbox_type',
        render: (value: MailboxType | number) => getMailboxName(value),
      },
      {
        title: 'Tipo',
        dataIndex: 'type',
        render: (value: ComplaintType | number) => getComplaintTypeName(value),
      },
      { title: 'Usuario', dataIndex: 'user' },
      {
        title: 'Anónimo',
        dataIndex: 'anonymous',
        render: (value: boolean) => (value ? 'Sí' : 'No'),
      },
      { title: 'Descripción', dataIndex: 'description' },
      {
        title: 'Acciones',
        render: (_: unknown, record: Complaint) => (
          <Button size="small" onClick={() => openObservations('complaint', record.id)}>
            Observaciones
          </Button>
        ),
      },
    ],
    [mailboxTypes, complaintTypes]
  );

  return (
    <div>
      <Tabs
        items={[
          {
            key: 'certificates',
            label: 'Certificados',
            children: (
              <div>
                <Space style={{ marginBottom: 16 }}>
                  <Button type="primary" onClick={() => setCertificateModalOpen(true)}>
                    Crear certificado
                  </Button>
                  <Checkbox checked={showAllCertificates} onChange={(e) => setShowAllCertificates(e.target.checked)}>
                    Ver todos
                  </Checkbox>
                  <Button onClick={loadCertificates}>Recargar</Button>
                </Space>
                <Table rowKey="id" loading={certLoading} dataSource={certificates} columns={certificateColumns as any} />
              </div>
            ),
          },
          {
            key: 'suggestions',
            label: 'Sugerencias',
            children: (
              <div>
                <Space style={{ marginBottom: 16 }}>
                  <Button type="primary" onClick={() => setSuggestionModalOpen(true)}>
                    Nueva sugerencia
                  </Button>
                  <Button onClick={loadSuggestions}>Recargar</Button>
                </Space>
                <Form form={suggestionFilterForm} layout="inline" style={{ marginBottom: 16 }}>
                  <Form.Item name="mailbox_type" label="Buzón">
                    <Select
                      allowClear
                      style={{ width: 160 }}
                      options={mailboxTypes.map((item) => ({ label: item.name, value: item.id }))}
                    />
                  </Form.Item>
                  <Form.Item name="date" label="Fecha">
                    <DatePicker />
                  </Form.Item>
                  <Form.Item name="user" label="Usuario">
                    <Input placeholder="Nombre" />
                  </Form.Item>
                  <Button onClick={submitSuggestionFilter}>Filtrar</Button>
                </Form>
                <Table
                  rowKey="id"
                  loading={suggestionsLoading}
                  dataSource={suggestions}
                  columns={suggestionColumns as any}
                />
              </div>
            ),
          },
          {
            key: 'complaints',
            label: 'Denuncias',
            children: (
              <div>
                <Space style={{ marginBottom: 16 }}>
                  <Button type="primary" onClick={() => setComplaintModalOpen(true)}>
                    Nueva denuncia
                  </Button>
                  <Button onClick={loadComplaints}>Recargar</Button>
                </Space>
                <Form form={complaintFilterForm} layout="inline" style={{ marginBottom: 16 }}>
                  <Form.Item name="mailbox_type" label="Buzón">
                    <Select
                      allowClear
                      style={{ width: 160 }}
                      options={mailboxTypes.map((item) => ({ label: item.name, value: item.id }))}
                    />
                  </Form.Item>
                  <Form.Item name="date" label="Fecha">
                    <DatePicker />
                  </Form.Item>
                  <Form.Item name="user" label="Usuario">
                    <Input placeholder="Nombre" />
                  </Form.Item>
                  <Button onClick={submitComplaintFilter}>Filtrar</Button>
                </Form>
                <Table
                  rowKey="id"
                  loading={complaintsLoading}
                  dataSource={complaints}
                  columns={complaintColumns as any}
                />
              </div>
            ),
          },
        ]}
      />

      <Modal
        open={certificateModalOpen}
        onCancel={() => setCertificateModalOpen(false)}
        onOk={submitCertificate}
        title="Crear certificado"
      >
        <Form form={certificateForm} layout="vertical" initialValues={{ user: userId || undefined }}>
          <Form.Item name="type" label="Tipo" rules={[{ required: true, message: 'Selecciona un tipo' }]}>
            <Select options={certificateTypes.map((item) => ({ label: item.name, value: item.id }))} />
          </Form.Item>
          <Form.Item name="user" label="Usuario" rules={[{ required: true, message: 'Selecciona un usuario' }]}>
            <Select
              showSearch
              optionFilterProp="label"
              options={users.map((user) => ({
                label: `${user.first_name} ${user.last_name}`.trim(),
                value: user.id,
              }))}
            />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        open={suggestionModalOpen}
        onCancel={() => setSuggestionModalOpen(false)}
        onOk={submitSuggestion}
        title="Nueva sugerencia"
      >
        <Form form={suggestionForm} layout="vertical" initialValues={{ user: username }}>
          <Form.Item name="mailbox_type" label="Buzón" rules={[{ required: true, message: 'Selecciona un buzón' }]}>
            <Select options={mailboxTypes.map((item) => ({ label: item.name, value: item.id }))} />
          </Form.Item>
          <Form.Item
            name="description"
            label="Descripción"
            rules={[{ required: true, message: 'Ingresa una descripción' }]}
          >
            <Input.TextArea rows={4} />
          </Form.Item>
          <Form.Item name="user" label="Usuario">
            <Input />
          </Form.Item>
          <Form.Item name="anonymous" valuePropName="checked">
            <Checkbox>Anónimo</Checkbox>
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        open={complaintModalOpen}
        onCancel={() => setComplaintModalOpen(false)}
        onOk={submitComplaint}
        title="Nueva denuncia"
      >
        <Form form={complaintForm} layout="vertical" initialValues={{ user: username }}>
          <Form.Item name="mailbox_type" label="Buzón" rules={[{ required: true, message: 'Selecciona un buzón' }]}>
            <Select options={mailboxTypes.map((item) => ({ label: item.name, value: item.id }))} />
          </Form.Item>
          <Form.Item name="type" label="Tipo" rules={[{ required: true, message: 'Selecciona un tipo' }]}>
            <Select options={complaintTypes.map((item) => ({ label: item.name, value: item.id }))} />
          </Form.Item>
          <Form.Item name="other_type" label="Otro tipo (si aplica)">
            <Input />
          </Form.Item>
          <Form.Item
            name="description"
            label="Descripción"
            rules={[{ required: true, message: 'Ingresa una descripción' }]}
          >
            <Input.TextArea rows={4} />
          </Form.Item>
          <Form.Item name="user" label="Usuario">
            <Input />
          </Form.Item>
          <Form.Item name="anonymous" valuePropName="checked">
            <Checkbox>Anónimo</Checkbox>
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        open={observationsOpen}
        onCancel={() => setObservationsOpen(false)}
        onOk={submitObservation}
        title="Observaciones"
        okText="Agregar"
      >
        <Form form={observationForm} layout="vertical">
          <Form.Item
            name="description"
            label="Nueva observación"
            rules={[{ required: true, message: 'Ingresa una observación' }]}
          >
            <Input.TextArea rows={3} />
          </Form.Item>
        </Form>
        <Table
          rowKey="id"
          loading={observationLoading}
          dataSource={observationItems}
          columns={[
            { title: '#', render: (_: unknown, __: Observation, index: number) => index + 1 },
            { title: 'Descripción', dataIndex: 'description' },
            {
              title: 'Fecha',
              dataIndex: 'created',
              render: (value: string) => (value ? new Date(value).toLocaleDateString() : '-'),
            },
          ]}
          pagination={false}
        />
      </Modal>
    </div>
  );
};

export default HumanResourcesPage;
