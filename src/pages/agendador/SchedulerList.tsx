import React, { useCallback, useEffect, useState } from 'react';
import {
  Card, Table, Button, Space, Input, Tag, Tooltip, Modal,
  Descriptions, App as AntdApp, Form, DatePicker, Select, Row, Col,
} from 'antd';
import {
  PlusOutlined, ReloadOutlined, SearchOutlined,
  DeleteOutlined, InfoCircleOutlined, CheckOutlined,
  WarningOutlined, MailOutlined, RollbackOutlined, SendOutlined, EditOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import { useNavigate } from 'react-router-dom';
import {
  getInstallments, deleteInstallment, finalizeInstallment, sendReport,
  removeLastStage, sendInstallmentReminders, getInstallment,
  updateInstallment, updateStage, getProcessTypes,
} from '../../api/agendador';
import type { Installment, Stage, ProcessType } from '../../types/agendador.types';

const PROCESSES_WITH_DILIGENCIES = [2, 6];

/** Etapa actual = último elemento del array stages */
const getCurrentStage = (record: Installment | null | undefined): Stage | null => {
  if (!record?.stages?.length) return null;
  return record.stages[record.stages.length - 1];
};

const installmentHasDiligencies = (record: Installment): boolean =>
  PROCESSES_WITH_DILIGENCIES.includes(record.process_type?.id) && (record.stages?.length || 0) === 2;

const isActiveInstallment = (record: Installment): boolean => String(record.state) === '1';

const addBusinessDays = (startDate: dayjs.Dayjs, businessDays: number): dayjs.Dayjs => {
  let current = startDate;
  let added = 0;
  while (added < businessDays) {
    current = current.add(1, 'day');
    const day = current.day();
    if (day !== 0 && day !== 6) added += 1;
  }
  return current;
};

const getStageFinalizationDate = (stage: Stage | null): dayjs.Dayjs | null => {
  if (!stage) return null;
  if (stage.finalization) return dayjs(stage.finalization);
  if (!stage.start || !stage.duration || stage.duration <= 0) return null;

  const stageStart = dayjs(stage.start);
  if (!stageStart.isValid()) return null;

  // 0 = manual, 1 = días hábiles, 2 = meses
  if (stage.date_format === 1) return addBusinessDays(stageStart, stage.duration);
  if (stage.date_format === 2) return stageStart.add(stage.duration, 'month');
  return null;
};

const SchedulerList: React.FC = () => {
  const { message, modal } = AntdApp.useApp();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<Installment[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(15);
  const [query, setQuery] = useState<string>('');
  const [detail, setDetail] = useState<Installment | null>(null);

  const [reportModalRecord, setReportModalRecord] = useState<Installment | null>(null);
  const [reportEmails, setReportEmails] = useState('');
  const [sendingReport, setSendingReport] = useState(false);
  const [sendingReminder, setSendingReminder] = useState(false);

  // Edit installment
  const [editInstallmentRecord, setEditInstallmentRecord] = useState<Installment | null>(null);
  const [editInstallmentForm] = Form.useForm();
  const [savingInstallment, setSavingInstallment] = useState(false);
  const [processTypes, setProcessTypes] = useState<ProcessType[]>([]);

  // Edit stage
  const [editStageRecord, setEditStageRecord] = useState<Stage | null>(null);
  const [editStageForm] = Form.useForm();
  const [savingStage, setSavingStage] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getInstallments({ page, limit, q: query || undefined });
      setRows(res.data);
      setTotal(res.count);
    } catch (e: any) {
      message.error(e.response?.data?.message || 'Error al cargar plazos');
    } finally {
      setLoading(false);
    }
  }, [page, limit, query]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Cargar tipos de proceso para el modal de edición
  useEffect(() => {
    getProcessTypes()
      .then((res) => setProcessTypes(res || []))
      .catch(() => setProcessTypes([]));
  }, []);

  const handleDelete = (record: Installment) => {
    modal.confirm({
      title: '¿Está seguro de que desea eliminar este plazo?',
      content: `Expediente: ${record.expedient_number}`,
      okText: 'Eliminar',
      okButtonProps: { danger: true },
      cancelText: 'Cancelar',
      onOk: async () => {
        try {
          await deleteInstallment(record.id);
          message.success('Plazo eliminado');
          fetchData();
        } catch (e: any) {
          message.error(e.response?.data?.message || 'No se pudo eliminar');
        }
      },
    });
  };

  const handleFinalize = (record: Installment) => {
    modal.confirm({
      title: '¿Avanzar a la siguiente etapa?',
      content: 'Esta acción no se puede deshacer.',
      okText: 'Confirmar',
      cancelText: 'Cancelar',
      onOk: async () => {
        try {
          await finalizeInstallment(record.id);
          message.success('Etapa finalizada');
          fetchData();
        } catch (e: any) {
          message.error(e.response?.data?.message || 'No se pudo finalizar la etapa');
        }
      },
    });
  };

  const handleRemoveStage = (record: Installment) => {
    modal.confirm({
      title: '¿Eliminar la última etapa?',
      content: 'Solo se elimina la etapa más reciente.',
      okText: 'Eliminar etapa',
      okButtonProps: { danger: true },
      cancelText: 'Cancelar',
      onOk: async () => {
        try {
          const res = await removeLastStage(record.id);
          message.success(res.message || 'Etapa eliminada');
          fetchData();
        } catch (e: any) {
          message.error(e.response?.data?.message || 'No se pudo eliminar la etapa');
        }
      },
    });
  };

  const handleSendReminder = async () => {
    setSendingReminder(true);
    try {
      const res = await sendInstallmentReminders();
      if (res.sent) {
        message.success(`Recordatorio enviado (${res.count} plazo(s))`);
      } else {
        message.info(res.message || 'No hay plazos próximos a vencer');
      }
    } catch (e: any) {
      message.error(e.response?.data?.message || 'No se pudo enviar recordatorios');
    } finally {
      setSendingReminder(false);
    }
  };

  const handleSendReport = async () => {
    if (!reportModalRecord) return;
    const emails = reportEmails
      .split(/[,\n;]/)
      .map((e) => e.trim())
      .filter(Boolean);

    if (!emails.length) {
      message.warning('Ingrese al menos un correo');
      return;
    }

    const invalidEmails = emails.filter((email) => !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email));
    if (invalidEmails.length) {
      message.warning(`Correo(s) inválido(s): ${invalidEmails.join(', ')}`);
      return;
    }

    setSendingReport(true);
    try {
      const res = await sendReport(reportModalRecord.id, emails);
      message.success(res.message || 'Reporte enviado por correo');
      setReportModalRecord(null);
      setReportEmails('');
    } catch (e: any) {
      message.error(e.response?.data?.message || 'No se pudo enviar el correo');
    } finally {
      setSendingReport(false);
    }
  };

  const openDetail = async (record: Installment) => {
    try {
      const full = await getInstallment(record.id);
      setDetail(full);
    } catch {
      setDetail(record);
    }
  };

  // Abrir modal editar plazo
  const openEditInstallment = (record: Installment) => {
    setEditInstallmentRecord(record);
    editInstallmentForm.setFieldsValue({
      expedient_number: record.expedient_number,
      client: record.client,
      start_date: record.start_date ? dayjs(record.start_date) : null,
      process_type_id: record.process_type?.id,
    });
  };

  const handleSaveInstallment = async () => {
    if (!editInstallmentRecord) return;
    try {
      const values = await editInstallmentForm.validateFields();
      setSavingInstallment(true);
      await updateInstallment(editInstallmentRecord.id, {
        expedient_number: values.expedient_number,
        client: values.client,
        start_date: values.start_date?.format('YYYY-MM-DD'),
        process_type_id: values.process_type_id,
      });
      message.success('Plazo actualizado');
      setEditInstallmentRecord(null);
      fetchData();
      // Refrescar detalle si está abierto
      if (detail?.id === editInstallmentRecord.id) {
        const updated = await getInstallment(editInstallmentRecord.id);
        setDetail(updated);
      }
    } catch (e: any) {
      if (e?.errorFields) return; // validación del form, no mostrar error
      message.error(e.response?.data?.message || 'No se pudo actualizar el plazo');
    } finally {
      setSavingInstallment(false);
    }
  };

  // Abrir modal editar etapa
  const openEditStage = (stage: Stage) => {
    setEditStageRecord(stage);
    editStageForm.setFieldsValue({
      name: stage.name,
      finalization: stage.finalization ? dayjs(stage.finalization) : null,
    });
  };

  const handleSaveStage = async () => {
    if (!editStageRecord) return;
    try {
      const values = await editStageForm.validateFields();
      setSavingStage(true);
      await updateStage(editStageRecord.id, {
        name: values.name,
        finalization: values.finalization ? values.finalization.format('YYYY-MM-DD') : null,
      });
      message.success('Etapa actualizada');
      setEditStageRecord(null);
      // Refrescar detalle si está abierto
      if (detail) {
        const updated = await getInstallment(detail.id);
        setDetail(updated);
      }
      fetchData();
    } catch (e: any) {
      if (e?.errorFields) return;
      message.error(e.response?.data?.message || 'No se pudo actualizar la etapa');
    } finally {
      setSavingStage(false);
    }
  };

  const columns: ColumnsType<Installment> = [
    {
      title: '#',
      key: 'row_number',
      width: 70,
      fixed: 'left',
      render: (_: unknown, __: Installment, index: number) => ((page - 1) * limit) + index + 1,
    },
    {
      title: 'Número de expediente',
      dataIndex: 'expedient_number',
      key: 'expedient_number',
      width: 220,
    },
    {
      title: 'Fecha inicio',
      dataIndex: 'start_date',
      key: 'start_date',
      width: 140,
      render: (v: string) => (v ? dayjs(v).format('DD/MM/YYYY') : '-'),
    },
    {
      title: 'Cliente',
      dataIndex: 'client',
      key: 'client',
      width: 220,
      ellipsis: true,
    },
    {
      title: 'Tipo de proceso',
      key: 'process_type',
      width: 180,
      render: (_, r) => r.process_type?.name || '-',
    },
    {
      title: 'Etapa actual',
      key: 'current_stage',
      width: 240,
      render: (_, r) => {
        const stage = getCurrentStage(r);
        if (!stage) return <Tag>N/A</Tag>;
        const needsManual = stage.date_format === 0 && !stage.finalization;
        return (
          <Space direction="vertical" size={2}>
            <span>{stage.name}</span>
            {needsManual && (
              <Tag icon={<WarningOutlined />} color="warning">
                Requiere fecha manual
              </Tag>
            )}
          </Space>
        );
      },
    },
    {
      title: 'Fecha finalización',
      key: 'stage_end',
      width: 160,
      render: (_, r) => {
        const stage = getCurrentStage(r);
        const finalizationDate = getStageFinalizationDate(stage);
        if (!finalizationDate) {
          if (installmentHasDiligencies(r)) return <Tag>N/A</Tag>;
          return <Tag color="warning">Fecha de finalización requerida</Tag>;
        }
        return finalizationDate.format('DD/MM/YYYY');
      },
    },
    {
      title: 'Acciones',
      key: 'actions',
      fixed: 'right',
      width: 240,
      render: (_, record) => {
        const stage = getCurrentStage(record);
        const canFinalize = isActiveInstallment(record)
          && (installmentHasDiligencies(record) || !!stage?.finalization);
        return (
          <Space>
            <Tooltip title="Detalle">
              <Button
                icon={<InfoCircleOutlined />}
                size="small"
                onClick={() => openDetail(record)}
              />
            </Tooltip>
            <Tooltip title="Editar plazo">
              <Button
                icon={<EditOutlined />}
                size="small"
                onClick={() => openEditInstallment(record)}
              />
            </Tooltip>
            {canFinalize ? (
              <Tooltip title="Finalizar etapa">
                <Button
                  type="primary"
                  icon={<CheckOutlined />}
                  size="small"
                  onClick={() => handleFinalize(record)}
                />
              </Tooltip>
            ) : null}
            <Tooltip title="Enviar reporte por correo">
              <Button
                icon={<MailOutlined />}
                size="small"
                onClick={() => {
                  setReportModalRecord(record);
                  setReportEmails('');
                }}
              />
            </Tooltip>
            {isActiveInstallment(record) ? (
              <Tooltip title="Eliminar etapa">
                <Button
                  icon={<RollbackOutlined />}
                  size="small"
                  onClick={() => handleRemoveStage(record)}
                />
              </Tooltip>
            ) : null}
            <Tooltip title="Eliminar">
              <Button
                danger
                icon={<DeleteOutlined />}
                size="small"
                onClick={() => handleDelete(record)}
              />
            </Tooltip>
          </Space>
        );
      },
    },
  ];

  return (
    <Card
      title="Lista de plazos en proceso"
      extra={
        <Space>
          <Input
            placeholder="Buscar por expediente o cliente"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(1);
            }}
            style={{ width: 260 }}
            prefix={<SearchOutlined />}
          />
          <Button icon={<ReloadOutlined />} onClick={fetchData} />
          <Button icon={<SendOutlined />} onClick={handleSendReminder} loading={sendingReminder}>
            Enviar recordatorios
          </Button>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => navigate('/dashboard/agendador/crear')}
          >
            Crear plazo
          </Button>
        </Space>
      }
    >
      <Table
        columns={columns}
        dataSource={rows}
        rowKey="id"
        loading={loading}
        pagination={{
          current: page,
          pageSize: limit,
          total: total,
          showSizeChanger: true,
          onChange: (p, l) => {
            setPage(p);
            setLimit(l || 15);
          },
        }}
        scroll={{ x: 1300 }}
      />

      {/* Modal detalle */}
      <Modal
        title="Detalle de plazo"
        open={!!detail}
        onCancel={() => setDetail(null)}
        footer={null}
        width={700}
      >
        {detail ? (
          <>
            <Descriptions bordered size="small" column={2} style={{ marginBottom: 12 }}>
              <Descriptions.Item label="Expediente">{detail.expedient_number}</Descriptions.Item>
              <Descriptions.Item label="Cliente">{detail.client}</Descriptions.Item>
              <Descriptions.Item label="Inicio">
                {dayjs(detail.start_date).format('DD/MM/YYYY')}
              </Descriptions.Item>
              <Descriptions.Item label="Proceso">{detail.process_type?.name}</Descriptions.Item>
            </Descriptions>
            <Table
              size="small"
              rowKey="id"
              columns={[
                { title: 'Nombre', dataIndex: 'name', key: 'name' },
                {
                  title: 'Inicio',
                  dataIndex: 'start',
                  key: 'start',
                  render: (v: string) => (v ? dayjs(v).format('YYYY-MM-DD') : '-'),
                },
                {
                  title: 'Duración',
                  dataIndex: 'duration',
                  key: 'duration',
                  render: (v: number, stage: Stage) => {
                    if (!v) return '0';
                    if (stage.date_format === 1) return `${v} días hábiles`;
                    if (stage.date_format === 2) return `${v} mes${v !== 1 ? 'es' : ''}`;
                    return String(v);
                  },
                },
                {
                  title: 'Finalización',
                  dataIndex: 'finalization',
                  key: 'finalization',
                  render: (v?: string | null) =>
                    v ? dayjs(v).format('YYYY-MM-DD') : 'N/A',
                },
                {
                  title: '',
                  key: 'edit_stage',
                  width: 60,
                  render: (_: any, stage: Stage) => (
                    <Tooltip title="Editar etapa">
                      <Button
                        icon={<EditOutlined />}
                        size="small"
                        onClick={() => openEditStage(stage)}
                      />
                    </Tooltip>
                  ),
                },
              ]}
              dataSource={detail.stages || []}
              pagination={false}
            />
          </>
        ) : null}
      </Modal>

      {/* Modal envío de reporte por correo */}
      <Modal
        title="Enviar reporte por correo"
        open={!!reportModalRecord}
        onCancel={() => {
          setReportModalRecord(null);
          setReportEmails('');
        }}
        onOk={handleSendReport}
        okText="Enviar"
        cancelText="Cancelar"
        confirmLoading={sendingReport}
        okButtonProps={{ disabled: !reportEmails.trim() }}
      >
        <p>
          Expediente: <strong>{reportModalRecord?.expedient_number}</strong>
        </p>
        <Input.TextArea
          value={reportEmails}
          onChange={(e) => setReportEmails(e.target.value)}
          placeholder="Ingrese uno o varios correos separados por coma, punto y coma o salto de línea"
          autoSize={{ minRows: 3, maxRows: 6 }}
        />
      </Modal>

      {/* Modal editar plazo */}
      <Modal
        title="Editar plazo"
        open={!!editInstallmentRecord}
        onCancel={() => setEditInstallmentRecord(null)}
        onOk={handleSaveInstallment}
        okText="Guardar"
        cancelText="Cancelar"
        confirmLoading={savingInstallment}
        width={600}
      >
        <Form form={editInstallmentForm} layout="vertical" style={{ marginTop: 16 }}>
          <Row gutter={16}>
            <Col xs={24} md={12}>
              <Form.Item
                name="expedient_number"
                label="Número de expediente"
                rules={[{ required: true, message: 'Requerido' }]}
              >
                <Input />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item
                name="client"
                label="Cliente"
                rules={[{ required: true, message: 'Requerido' }]}
              >
                <Input />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col xs={24} md={12}>
              <Form.Item
                name="start_date"
                label="Fecha de inicio"
                rules={[{ required: true, message: 'Requerido' }]}
              >
                <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item
                name="process_type_id"
                label="Tipo de proceso"
                rules={[{ required: true, message: 'Requerido' }]}
              >
                <Select
                  options={processTypes.map((t) => ({ value: t.id, label: t.name }))}
                  placeholder="Seleccione tipo de proceso"
                />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>

      {/* Modal editar etapa */}
      <Modal
        title="Editar etapa"
        open={!!editStageRecord}
        onCancel={() => setEditStageRecord(null)}
        onOk={handleSaveStage}
        okText="Guardar"
        cancelText="Cancelar"
        confirmLoading={savingStage}
        width={460}
      >
        <Form form={editStageForm} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item
            name="name"
            label="Nombre de la etapa"
            rules={[{ required: true, message: 'Requerido' }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="finalization"
            label="Fecha de finalización"
          >
            <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
};

export default SchedulerList;
