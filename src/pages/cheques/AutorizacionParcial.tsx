import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Button, Card, Col, Row, Space, Table, Tag, Typography, Alert, Divider, Result } from 'antd';
import { CheckCircleOutlined, CloseCircleOutlined, LoadingOutlined, CheckOutlined } from '@ant-design/icons';
import { getAuthorizationDetails, batchDecision } from '../../api/checks';
import type { CheckRequest } from '../../types/checks.types';

const { Title, Text } = Typography;

type RowState = 'pending' | 'authorized' | 'denied';

interface DecisionResult {
  check: CheckRequest;
  action: 'authorize' | 'deny';
}

function AutorizacionParcial() {
  const [searchParams] = useSearchParams();
  const encodedIds = searchParams.get('ids') ?? '';
  const authorizerId = Number(searchParams.get('authorizer_id') ?? '0');

  const [checks, setChecks] = useState<CheckRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [results, setResults] = useState<DecisionResult[] | null>(null);
  const [error, setError] = useState('');
  const [rowStates, setRowStates] = useState<Record<number, RowState>>({});

  useEffect(() => {
    if (!encodedIds || !authorizerId) {
      setError('Enlace inválido. Faltan parámetros requeridos.');
      setLoading(false);
      return;
    }
    getAuthorizationDetails(encodedIds)
      .then((data) => {
        setChecks(data);
        const initial: Record<number, RowState> = {};
        data.forEach((c) => { initial[c.id] = 'pending'; });
        setRowStates(initial);
      })
      .catch((err) => {
        setError(err?.response?.data?.message || 'No se pudieron cargar los cheques. El enlace puede haber expirado.');
      })
      .finally(() => setLoading(false));
  }, [encodedIds, authorizerId]);

  const handleRowAction = (checkId: number, action: 'authorized' | 'denied') => {
    setRowStates((prev) => ({ ...prev, [checkId]: action }));
  };

  const allDecided = checks.length > 0 && Object.values(rowStates).every((s) => s !== 'pending');
  const authorizedCount = Object.values(rowStates).filter((s) => s === 'authorized').length;
  const deniedCount = Object.values(rowStates).filter((s) => s === 'denied').length;

  const handleConfirm = async () => {
    setSubmitting(true);
    try {
      const decisions = checks.map((c) => ({
        check_id: c.id,
        action: (rowStates[c.id] === 'authorized' ? 'authorize' : 'deny') as 'authorize' | 'deny',
      }));
      await batchDecision(decisions, authorizerId);
      setResults(checks.map((c) => ({ check: c, action: rowStates[c.id] === 'authorized' ? 'authorize' : 'deny' })));
    } catch {
      alert('Error al procesar las decisiones. Intente nuevamente.');
    } finally {
      setSubmitting(false);
    }
  };

  // ── PANTALLA DE RESULTADOS ──────────────────────────────────────────────────
  if (results) {
    const authorized = results.filter((r) => r.action === 'authorize');
    const denied = results.filter((r) => r.action === 'deny');
    const isMixed = authorized.length > 0 && denied.length > 0;
    const allAuthorized = denied.length === 0;

    return (
      <div style={{ minHeight: '100vh', background: '#f0f2f5', padding: '40px 16px' }}>
        <Row justify="center">
          <Col xs={24} md={22} lg={18}>
            <Card style={{ borderRadius: 8 }}>

              <Result
                status={allAuthorized ? 'success' : isMixed ? 'info' : 'error'}
                title={allAuthorized ? 'Cheques autorizados' : isMixed ? 'Gestión completada' : 'Cheques rechazados'}
                subTitle={`Se ha enviado un correo de confirmación al solicitante.`}
              />

              <Divider />

              {authorized.length > 0 && (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                    <CheckCircleOutlined style={{ color: '#16a34a', fontSize: 18 }} />
                    <Text strong style={{ color: '#16a34a', fontSize: 15 }}>
                      Autorizados ({authorized.length})
                    </Text>
                  </div>
                  <Table
                    rowKey={(r) => r.check.id}
                    dataSource={authorized}
                    pagination={false}
                    size="small"
                    style={{ marginBottom: 24 }}
                    columns={resultColumns('#16a34a', 'authorize')}
                  />
                </>
              )}

              {denied.length > 0 && (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                    <CloseCircleOutlined style={{ color: '#dc2626', fontSize: 18 }} />
                    <Text strong style={{ color: '#dc2626', fontSize: 15 }}>
                      Rechazados ({denied.length})
                    </Text>
                  </div>
                  <Table
                    rowKey={(r) => r.check.id}
                    dataSource={denied}
                    pagination={false}
                    size="small"
                    columns={resultColumns('#dc2626', 'deny')}
                  />
                </>
              )}

              <div style={{ textAlign: 'center', marginTop: 32 }}>
                <Text type="secondary">Puede cerrar esta ventana.</Text>
              </div>

            </Card>
          </Col>
        </Row>
      </div>
    );
  }

  // ── PANTALLA DE DECISIONES ──────────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100vh', background: '#f0f2f5', padding: '40px 16px' }}>
      <Row justify="center">
        <Col xs={24} md={22} lg={18}>
          <Card style={{ borderRadius: 8 }}>
            <div style={{ textAlign: 'center', marginBottom: 24 }}>
              <Title level={3} style={{ marginBottom: 4 }}>
                SOLICITUD DE AUTORIZACIÓN DE CHEQUE(S)
              </Title>
              <Text type="secondary">
                Marque cada cheque como Autorizar o Rechazar, luego presione Confirmar.
              </Text>
            </div>

            {loading && (
              <div style={{ textAlign: 'center', padding: '48px 0' }}>
                <LoadingOutlined style={{ fontSize: 36, color: '#1677ff' }} />
                <p style={{ marginTop: 16, color: '#666' }}>Cargando cheques...</p>
              </div>
            )}

            {error && (
              <Alert type="error" message="Error" description={error} showIcon />
            )}

            {!loading && !error && checks.length > 0 && (
              <>
                <Table<CheckRequest>
                  rowKey="id"
                  dataSource={checks}
                  pagination={false}
                  scroll={{ x: 900 }}
                  columns={[
                    {
                      title: 'ID Cheque',
                      dataIndex: 'request_id',
                      width: 110,
                      render: (v) => <Text strong style={{ color: '#1677ff' }}>{v}</Text>,
                    },
                    {
                      title: 'Solicitante',
                      dataIndex: 'responsible',
                      render: (r: CheckRequest['responsible']) =>
                        r ? `${r.first_name} ${r.last_name}`.trim() || r.username : '—',
                    },
                    { title: 'Cliente', dataIndex: 'client', width: 100 },
                    {
                      title: 'Monto',
                      dataIndex: 'total_value',
                      width: 110,
                      render: (v) => `Q ${Number(v).toFixed(2)}`,
                    },
                    { title: 'Descripción', dataIndex: 'description', ellipsis: true },
                    { title: 'Nota', dataIndex: 'work_note_number', width: 90 },
                    {
                      title: 'Fecha',
                      dataIndex: 'date',
                      width: 110,
                      render: (v: string) => v ? new Date(v).toLocaleDateString('es-GT') : '—',
                    },
                    {
                      title: 'Decisión',
                      width: 130,
                      render: (_, record) => {
                        const state = rowStates[record.id];
                        if (state === 'authorized') return <Tag icon={<CheckCircleOutlined />} color="success">Autorizar</Tag>;
                        if (state === 'denied') return <Tag icon={<CloseCircleOutlined />} color="error">Rechazar</Tag>;
                        return <Tag color="gold">Pendiente</Tag>;
                      },
                    },
                    {
                      title: 'Acción',
                      width: 190,
                      render: (_, record) => (
                        <Space>
                          <Button
                            type="primary"
                            size="small"
                            disabled={rowStates[record.id] === 'authorized'}
                            onClick={() => handleRowAction(record.id, 'authorized')}
                          >
                            Autorizar
                          </Button>
                          <Button
                            danger
                            size="small"
                            disabled={rowStates[record.id] === 'denied'}
                            onClick={() => handleRowAction(record.id, 'denied')}
                          >
                            Rechazar
                          </Button>
                        </Space>
                      ),
                    },
                  ]}
                />

                <div style={{ textAlign: 'center', marginTop: 24 }}>
                  {!allDecided && (
                    <Text type="secondary" style={{ display: 'block', marginBottom: 12 }}>
                      Decida todos los cheques para poder confirmar.
                    </Text>
                  )}
                  <Button
                    type="primary"
                    size="large"
                    icon={<CheckOutlined />}
                    disabled={!allDecided}
                    loading={submitting}
                    onClick={handleConfirm}
                    style={{ minWidth: 240 }}
                  >
                    Confirmar ({authorizedCount} autorizar / {deniedCount} rechazar)
                  </Button>
                </div>
              </>
            )}
          </Card>
        </Col>
      </Row>
    </div>
  );
}

// Columnas reutilizables para la tabla de resultados
function resultColumns(_color: string, _action: 'authorize' | 'deny') {
  return [
    {
      title: 'ID Cheque',
      dataIndex: ['check', 'request_id'],
      width: 110,
      render: (v: string) => <Text strong style={{ color: '#1677ff' }}>{v}</Text>,
    },
    {
      title: 'Solicitante',
      dataIndex: ['check', 'responsible'],
      render: (r: CheckRequest['responsible']) =>
        r ? `${r.first_name} ${r.last_name}`.trim() || r.username : '—',
    },
    { title: 'Cliente', dataIndex: ['check', 'client'], width: 100 },
    {
      title: 'Monto',
      dataIndex: ['check', 'total_value'],
      width: 110,
      render: (v: string) => `Q ${Number(v).toFixed(2)}`,
    },
    { title: 'Descripción', dataIndex: ['check', 'description'], ellipsis: true },
    { title: 'Nota', dataIndex: ['check', 'work_note_number'], width: 90 },
    {
      title: 'Fecha',
      dataIndex: ['check', 'date'],
      width: 110,
      render: (v: string) => v ? new Date(v).toLocaleDateString('es-GT') : '—',
    },
    {
      title: 'Estado',
      width: 120,
      render: (_: unknown, r: DecisionResult) =>
        r.action === 'authorize'
          ? <Tag icon={<CheckCircleOutlined />} color="success" style={{ fontWeight: 700 }}>AUTORIZADO</Tag>
          : <Tag icon={<CloseCircleOutlined />} color="error" style={{ fontWeight: 700 }}>RECHAZADO</Tag>,
    },
  ];
}

export default AutorizacionParcial;
