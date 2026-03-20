import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Button, Card, Col, Row, Space, Table, Tag, Typography, Alert } from 'antd';
import { CheckCircleOutlined, CloseCircleOutlined, LoadingOutlined } from '@ant-design/icons';
import { getAuthorizationDetails, manageAuthorizationLink } from '../../api/checks';
import type { CheckRequest } from '../../types/checks.types';

const { Title, Text } = Typography;

type RowState = 'pending' | 'authorized' | 'denied';

function AutorizacionParcial() {
  const [searchParams] = useSearchParams();
  const encodedIds = searchParams.get('ids') ?? '';
  const authorizerId = Number(searchParams.get('authorizer_id') ?? '0');

  const [checks, setChecks] = useState<CheckRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [rowStates, setRowStates] = useState<Record<number, RowState>>({});
  const [loadingRows, setLoadingRows] = useState<Record<number, boolean>>({});

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

  const toBase64Url = (ids: number[]) =>
    btoa(JSON.stringify(ids)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

  const handleAction = async (check: CheckRequest, action: 'authorize' | 'deny') => {
    setLoadingRows((prev) => ({ ...prev, [check.id]: true }));
    try {
      await manageAuthorizationLink(action, toBase64Url([check.id]), authorizerId);
      setRowStates((prev) => ({ ...prev, [check.id]: action === 'authorize' ? 'authorized' : 'denied' }));
    } catch {
      alert('Error al procesar la acción. Intente nuevamente.');
    } finally {
      setLoadingRows((prev) => ({ ...prev, [check.id]: false }));
    }
  };

  const allDone = checks.length > 0 && Object.values(rowStates).every((s) => s !== 'pending');
  const authorized = Object.values(rowStates).filter((s) => s === 'authorized').length;
  const denied = Object.values(rowStates).filter((s) => s === 'denied').length;

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
                Gestione cada cheque individualmente usando los botones de acción.
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

            {allDone && (
              <Alert
                type="success"
                showIcon
                message="Gestión completada"
                description={`Autorizados: ${authorized} | Rechazados: ${denied}. Puede cerrar esta ventana.`}
                style={{ marginBottom: 16 }}
              />
            )}

            {!loading && !error && checks.length > 0 && (
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
                    title: 'Estado',
                    width: 130,
                    render: (_, record) => {
                      const state = rowStates[record.id];
                      if (state === 'authorized') return <Tag icon={<CheckCircleOutlined />} color="success">Autorizado</Tag>;
                      if (state === 'denied') return <Tag icon={<CloseCircleOutlined />} color="error">Rechazado</Tag>;
                      return <Tag color="gold">Pendiente</Tag>;
                    },
                  },
                  {
                    title: 'Acción',
                    width: 190,
                    render: (_, record) => {
                      if (rowStates[record.id] !== 'pending') return null;
                      return (
                        <Space>
                          <Button
                            type="primary"
                            size="small"
                            loading={loadingRows[record.id]}
                            onClick={() => handleAction(record, 'authorize')}
                          >
                            Autorizar
                          </Button>
                          <Button
                            danger
                            size="small"
                            loading={loadingRows[record.id]}
                            onClick={() => handleAction(record, 'deny')}
                          >
                            Rechazar
                          </Button>
                        </Space>
                      );
                    },
                  },
                ]}
              />
            )}
          </Card>
        </Col>
      </Row>
    </div>
  );
}

export default AutorizacionParcial;
