import React, { useCallback, useEffect, useState } from 'react';
import {
  Card, Table, Button, Space, Input, Tag, Tooltip, Modal,
  Descriptions, App as AntdApp, DatePicker,
} from 'antd';
import {
  PlusOutlined, ReloadOutlined, SearchOutlined, CalendarOutlined,
  DeleteOutlined, InfoCircleOutlined, CheckOutlined, EditOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import { useNavigate } from 'react-router-dom';
import {
  getInstallments, deleteInstallment, finalizeInstallment, updateStage,
} from '../../api/agendador';
import type { Installment, Stage } from '../../types/agendador.types';

/** Etapa actual = último elemento del array stages */
const getCurrentStage = (record: Installment | null | undefined): Stage | null => {
  if (!record?.stages?.length) return null;
  return record.stages[record.stages.length - 1];
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

  // Modal para ingresar fecha manual en etapas date_format === 0
  const [dateModalRecord, setDateModalRecord] = useState<Installment | null>(null);
  const [manualDate, setManualDate] = useState<dayjs.Dayjs | null>(null);
  const [savingDate, setSavingDate] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getInstallments({ page, limit, q: query || undefined });
      console.log('[Agendador] stages ejemplo:', res.data[0]?.stages);
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

  const handleSaveManualDate = async () => {
    if (!dateModalRecord || !manualDate) return;
    const stage = getCurrentStage(dateModalRecord);
    if (!stage) return;
    setSavingDate(true);
    try {
      await updateStage(stage.id, { finalization: manualDate.format('YYYY-MM-DD') });
      message.success('Fecha guardada');
      setDateModalRecord(null);
      setManualDate(null);
      fetchData();
    } catch (e: any) {
      message.error(e.response?.data?.message || 'No se pudo guardar la fecha');
    } finally {
      setSavingDate(false);
    }
  };

  const columns: ColumnsType<Installment> = [
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
      title: 'Finalización de etapa',
      key: 'stage_end',
      width: 160,
      render: (_, r) => {
        const stage = getCurrentStage(r);
        if (!stage?.finalization) return <Tag>N/A</Tag>;
        return dayjs(stage.finalization).format('DD/MM/YYYY');
      },
    },
    {
      title: 'Acciones',
      key: 'actions',
      fixed: 'right',
      width: 160,
      render: (_, record) => {
        const stage = getCurrentStage(record);
        const needsManual = stage?.date_format === 0 && !stage?.finalization;
        return (
          <Space>
            <Tooltip title="Detalle">
              <Button
                icon={<InfoCircleOutlined />}
                size="small"
                onClick={() => setDetail(record)}
              />
            </Tooltip>
            {needsManual ? (
              <Tooltip title="Ingresar fecha">
                <Button
                  icon={<EditOutlined />}
                  size="small"
                  onClick={() => {
                    setDateModalRecord(record);
                    setManualDate(null);
                  }}
                />
              </Tooltip>
            ) : (
              <Tooltip title="Finalizar etapa">
                <Button
                  type="primary"
                  icon={<CheckOutlined />}
                  size="small"
                  onClick={() => handleFinalize(record)}
                />
              </Tooltip>
            )}
            <Tooltip title="Ver calendario">
              <Button
                icon={<CalendarOutlined />}
                size="small"
                onClick={() => navigate('/dashboard/agendador/calendario')}
              />
            </Tooltip>
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
        scroll={{ x: 1200 }}
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
                  render: (v: number) => `${v} mes${v !== 1 ? 'es' : ''}`,
                },
                {
                  title: 'Finalización',
                  dataIndex: 'finalization',
                  key: 'finalization',
                  render: (v?: string | null) =>
                    v ? dayjs(v).format('YYYY-MM-DD') : 'N/A',
                },
              ]}
              dataSource={detail.stages || []}
              pagination={false}
            />
          </>
        ) : null}
      </Modal>

      {/* Modal ingresar fecha manual */}
      <Modal
        title="Ingresar fecha de finalización"
        open={!!dateModalRecord}
        onCancel={() => {
          setDateModalRecord(null);
          setManualDate(null);
        }}
        onOk={handleSaveManualDate}
        okText="Guardar"
        cancelText="Cancelar"
        confirmLoading={savingDate}
        okButtonProps={{ disabled: !manualDate }}
      >
        <p>
          Etapa: <strong>{getCurrentStage(dateModalRecord!)?.name}</strong>
        </p>
        <DatePicker
          style={{ width: '100%' }}
          value={manualDate}
          onChange={(d) => setManualDate(d)}
          format="DD/MM/YYYY"
        />
      </Modal>
    </Card>
  );
};

export default SchedulerList;
