import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Col,
  DatePicker,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Row,
  Select,
  Space,
  Table,
  Tag,
  Tooltip,
  Typography,
  message,
} from 'antd';
import {
  FilePdfOutlined,
  PlusOutlined,
  ReloadOutlined,
  StopOutlined,
  CalculatorOutlined,
} from '@ant-design/icons';
import dayjs, { type Dayjs } from 'dayjs';
import { fetchUsers } from '../../api/notifications';
import { type VacationBalance, fetchVacationBalances } from '../../api/vacations';
import {
  type LiquidationPeriod,
  type LiquidationPreview,
  type VacationLiquidation,
  anularLiquidation,
  createLiquidation,
  downloadLiquidationPdf,
  fetchLiquidations,
  previewLiquidation,
} from '../../api/vacationLiquidations';

const { Text } = Typography;

const round2 = (n: number) => Math.round(n * 100) / 100;

const fmtDias = (n: number) => {
  const v = round2(Number(n));
  return Number.isInteger(v) ? String(v) : v.toFixed(2);
};

const fmtFecha = (d: string) => dayjs(d).format('DD/MM/YYYY');

const LiquidacionesTab: React.FC = () => {
  // ---- Listado ----
  const [liquidations, setLiquidations] = useState<VacationLiquidation[]>([]);
  const [loading, setLoading] = useState(false);
  const [anulandoId, setAnulandoId] = useState<number | null>(null);
  const [downloadingId, setDownloadingId] = useState<number | null>(null);

  // ---- Nueva liquidación ----
  const [modalOpen, setModalOpen] = useState(false);
  const [users, setUsers] = useState<
    { id: number; username?: string; first_name: string; last_name: string }[]
  >([]);
  const [balances, setBalances] = useState<VacationBalance[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<number | undefined>();
  const [fechaSalida, setFechaSalida] = useState<Dayjs | null>(null);
  const [fechaIngreso, setFechaIngreso] = useState<Dayjs | null>(null);
  const [preview, setPreview] = useState<LiquidationPreview | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [observaciones, setObservaciones] = useState('');
  const [confirming, setConfirming] = useState(false);

  const loadLiquidations = useCallback(async () => {
    setLoading(true);
    try {
      setLiquidations(await fetchLiquidations());
    } catch {
      message.error('No se pudieron cargar las liquidaciones');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadLiquidations();
  }, [loadLiquidations]);

  useEffect(() => {
    if (!modalOpen || users.length) return;
    fetchUsers()
      .then((u) => setUsers(u as any))
      .catch(() => message.error('No se pudieron cargar los usuarios'));
    // Saldos de vacaciones: para precargar la fecha de ingreso al elegir empleado
    fetchVacationBalances()
      .then(setBalances)
      .catch(() => {});
  }, [modalOpen, users.length]);

  const handleUserChange = (userId: number) => {
    setSelectedUserId(userId);
    setPreview(null);
    const balance = balances.find(
      (b) => b.user?.id === userId && b.time_off_type === 'vacaciones',
    );
    setFechaIngreso(balance?.fecha_ingreso ? dayjs(balance.fecha_ingreso) : null);
  };

  const resetModal = () => {
    setSelectedUserId(undefined);
    setFechaSalida(null);
    setFechaIngreso(null);
    setPreview(null);
    setObservaciones('');
  };

  const handlePreview = async () => {
    if (!selectedUserId || !fechaSalida) {
      message.warning('Seleccioná el usuario y la fecha de salida');
      return;
    }
    setPreviewLoading(true);
    try {
      const data = await previewLiquidation(
        selectedUserId,
        fechaSalida.format('YYYY-MM-DD'),
        fechaIngreso ? fechaIngreso.format('YYYY-MM-DD') : undefined,
      );
      setPreview(data);
      if (!fechaIngreso) setFechaIngreso(dayjs(data.fecha_ingreso));
    } catch (err: any) {
      message.error(
        err?.response?.data?.message ?? 'No se pudo calcular la liquidación',
      );
    } finally {
      setPreviewLoading(false);
    }
  };

  const updatePeriodo = (
    index: number,
    field: 'dias_gozados' | 'dias_correspondientes',
    value: number,
  ) => {
    setPreview((prev) => {
      if (!prev) return prev;
      const periodos = prev.periodos.map((p, i) => {
        if (i !== index) return p;
        const next = { ...p, [field]: value ?? 0 };
        next.dias_pendientes = round2(
          Math.max(0, next.dias_correspondientes - next.dias_gozados),
        );
        return next;
      });
      return {
        ...prev,
        periodos,
        total_dias_pendientes: round2(
          periodos.reduce((s, p) => s + p.dias_pendientes, 0),
        ),
      };
    });
  };

  const handleConfirm = async () => {
    if (!preview || !selectedUserId || !fechaSalida || !fechaIngreso) return;
    setConfirming(true);
    try {
      const created = await createLiquidation({
        user_id: selectedUserId,
        fecha_ingreso: fechaIngreso.format('YYYY-MM-DD'),
        fecha_salida: fechaSalida.format('YYYY-MM-DD'),
        observaciones: observaciones || undefined,
        periodos: preview.periodos.map((p) => ({
          periodo_inicio: p.periodo_inicio,
          periodo_fin: p.periodo_fin,
          dias_correspondientes: p.dias_correspondientes,
          dias_gozados: p.dias_gozados,
          dias_pendientes: p.dias_pendientes,
          es_proporcional: p.es_proporcional,
        })),
      });
      message.success(
        `Liquidación #${created.id} confirmada — el saldo del usuario quedó en 0`,
      );
      setModalOpen(false);
      resetModal();
      loadLiquidations();
      downloadLiquidationPdf(created.id, created.user?.username).catch(() =>
        message.warning('La carta no se pudo descargar automáticamente'),
      );
    } catch (err: any) {
      message.error(
        err?.response?.data?.message ?? 'No se pudo confirmar la liquidación',
      );
    } finally {
      setConfirming(false);
    }
  };

  const handleAnular = async (id: number) => {
    setAnulandoId(id);
    try {
      await anularLiquidation(id);
      message.success('Liquidación anulada — se restauró el saldo cerrado');
      loadLiquidations();
    } catch (err: any) {
      message.error(err?.response?.data?.message ?? 'No se pudo anular');
    } finally {
      setAnulandoId(null);
    }
  };

  const handleDownload = async (liq: VacationLiquidation) => {
    setDownloadingId(liq.id);
    try {
      await downloadLiquidationPdf(liq.id, liq.user?.username);
    } catch {
      message.error('No se pudo descargar la carta');
    } finally {
      setDownloadingId(null);
    }
  };

  const userOptions = useMemo(
    () =>
      users.map((u) => ({
        value: u.id,
        label: `${u.first_name} ${u.last_name}${u.username ? ` (${u.username})` : ''}`,
      })),
    [users],
  );

  const columns = [
    {
      title: 'Empleado',
      key: 'user',
      render: (_: unknown, r: VacationLiquidation) => (
        <Space direction="vertical" size={0}>
          <Text strong>
            {r.user?.first_name} {r.user?.last_name}
          </Text>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {r.user?.username}
          </Text>
        </Space>
      ),
    },
    {
      title: 'Ingreso',
      dataIndex: 'fecha_ingreso',
      key: 'ingreso',
      render: fmtFecha,
    },
    {
      title: 'Salida',
      dataIndex: 'fecha_salida',
      key: 'salida',
      render: fmtFecha,
    },
    {
      title: 'Días a pagar',
      dataIndex: 'total_dias_pendientes',
      key: 'total',
      render: (v: number) => <Text strong>{fmtDias(v)}</Text>,
    },
    {
      title: 'Estado',
      dataIndex: 'estado',
      key: 'estado',
      render: (estado: string) =>
        estado === 'CONFIRMADA' ? (
          <Tag color="green">Confirmada</Tag>
        ) : (
          <Tag color="red">Anulada</Tag>
        ),
    },
    {
      title: 'Creada',
      dataIndex: 'created_at',
      key: 'created',
      render: (v: string) => dayjs(v).format('DD/MM/YYYY HH:mm'),
    },
    {
      title: 'Acciones',
      key: 'acciones',
      render: (_: unknown, r: VacationLiquidation) => (
        <Space>
          <Tooltip title="Descargar carta PDF">
            <Button
              size="small"
              icon={<FilePdfOutlined />}
              loading={downloadingId === r.id}
              onClick={() => handleDownload(r)}
            />
          </Tooltip>
          {r.estado === 'CONFIRMADA' && (
            <Popconfirm
              title="¿Anular esta liquidación?"
              description="Se restaurará el saldo de vacaciones que se cerró."
              okText="Anular"
              cancelText="No"
              onConfirm={() => handleAnular(r.id)}
            >
              <Button
                size="small"
                danger
                icon={<StopOutlined />}
                loading={anulandoId === r.id}
              >
                Anular
              </Button>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  const periodColumns = [
    {
      title: 'Período vacacional',
      key: 'periodo',
      render: (_: unknown, p: LiquidationPeriod) => (
        <Space size={4}>
          <span>
            {fmtFecha(p.periodo_inicio)} — {fmtFecha(p.periodo_fin)}
          </span>
          {p.es_proporcional && <Tag color="gold">Proporcional</Tag>}
        </Space>
      ),
    },
    {
      title: 'Días del período',
      key: 'correspondientes',
      width: 150,
      render: (_: unknown, p: LiquidationPeriod, i: number) => (
        <InputNumber
          min={0}
          step={0.01}
          value={p.dias_correspondientes}
          onChange={(v) => updatePeriodo(i, 'dias_correspondientes', Number(v ?? 0))}
          style={{ width: '100%' }}
        />
      ),
    },
    {
      title: 'Días gozados',
      key: 'gozados',
      width: 150,
      render: (_: unknown, p: LiquidationPeriod, i: number) => (
        <InputNumber
          min={0}
          step={0.5}
          value={p.dias_gozados}
          onChange={(v) => updatePeriodo(i, 'dias_gozados', Number(v ?? 0))}
          style={{ width: '100%' }}
        />
      ),
    },
    {
      title: 'Pendientes (a pagar)',
      key: 'pendientes',
      width: 150,
      render: (_: unknown, p: LiquidationPeriod) => (
        <Text strong>{fmtDias(p.dias_pendientes)}</Text>
      ),
    },
  ];

  return (
    <div>
      <Card
        title="Liquidaciones de vacaciones"
        extra={
          <Space>
            <Button icon={<ReloadOutlined />} onClick={loadLiquidations}>
              Recargar
            </Button>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => setModalOpen(true)}
            >
              Nueva liquidación
            </Button>
          </Space>
        }
      >
        <Table
          rowKey="id"
          loading={loading}
          dataSource={liquidations}
          columns={columns as any}
          size="middle"
          pagination={{ pageSize: 10, hideOnSinglePage: true }}
          locale={{ emptyText: 'No hay liquidaciones registradas' }}
        />
      </Card>

      <Modal
        title="Nueva liquidación de vacaciones"
        open={modalOpen}
        width={860}
        onCancel={() => {
          setModalOpen(false);
          resetModal();
        }}
        footer={null}
        destroyOnClose
      >
        <Row gutter={12} style={{ marginBottom: 12 }}>
          <Col span={10}>
            <Text strong>Empleado</Text>
            <Select
              showSearch
              optionFilterProp="label"
              placeholder="Buscar empleado"
              options={userOptions}
              value={selectedUserId}
              onChange={handleUserChange}
              style={{ width: '100%', marginTop: 4 }}
            />
          </Col>
          <Col span={5}>
            <Text strong>Fecha de ingreso</Text>
            <DatePicker
              value={fechaIngreso}
              onChange={(d) => {
                setFechaIngreso(d);
                setPreview(null);
              }}
              placeholder="Del saldo"
              format="DD/MM/YYYY"
              style={{ width: '100%', marginTop: 4 }}
            />
          </Col>
          <Col span={5}>
            <Text strong>Último día laborado</Text>
            <DatePicker
              value={fechaSalida}
              onChange={(d) => {
                setFechaSalida(d);
                setPreview(null);
              }}
              format="DD/MM/YYYY"
              style={{ width: '100%', marginTop: 4 }}
            />
          </Col>
          <Col span={4} style={{ display: 'flex', alignItems: 'flex-end' }}>
            <Button
              type="primary"
              ghost
              icon={<CalculatorOutlined />}
              loading={previewLoading}
              onClick={handlePreview}
              block
            >
              Calcular
            </Button>
          </Col>
        </Row>

        {preview && (
          <>
            <Alert
              type="info"
              showIcon
              style={{ marginBottom: 12 }}
              message={
                <>
                  El total a pagar = saldo disponible del empleado
                  {preview.saldo_actual !== null && (
                    <>
                      {' '}(<Text strong>{fmtDias(preview.saldo_actual)} días</Text>)
                    </>
                  )}{' '}
                  + el proporcional del período en curso. El saldo se reparte en
                  los períodos para el desglose de la carta.{' '}
                  <Text strong>Revisá y ajustá</Text> antes de confirmar.
                </>
              }
            />
            <Table
              rowKey={(p) => `${p.periodo_inicio}`}
              dataSource={preview.periodos}
              columns={periodColumns as any}
              size="small"
              pagination={false}
            />
            <Row justify="end" style={{ margin: '12px 0' }}>
              <Text style={{ fontSize: 16 }}>
                Total a pagar:{' '}
                <Text strong style={{ fontSize: 18 }}>
                  {fmtDias(preview.total_dias_pendientes)} días
                </Text>
              </Text>
            </Row>
            <Input.TextArea
              rows={2}
              placeholder="Observaciones (opcional)"
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
              style={{ marginBottom: 12 }}
            />
            <Popconfirm
              title="¿Confirmar liquidación?"
              description="El saldo de vacaciones del empleado quedará en 0 y se generará la carta."
              okText="Confirmar"
              cancelText="Cancelar"
              onConfirm={handleConfirm}
            >
              <Button type="primary" block loading={confirming}>
                Confirmar liquidación y generar carta
              </Button>
            </Popconfirm>
          </>
        )}
      </Modal>
    </div>
  );
};

export default LiquidacionesTab;
