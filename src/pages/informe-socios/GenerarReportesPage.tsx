import React, { useEffect, useState } from 'react';
import {
  Card, Button, DatePicker, Form, Input, Switch, message, Typography,
  Alert, Row, Col, Statistic, Table, Tag, Collapse, Divider, Space, Badge,
} from 'antd';
import {
  SendOutlined, SearchOutlined, CheckCircleOutlined, WarningOutlined,
  FileExcelOutlined, UserOutlined, TeamOutlined, FolderOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import { informeSociosApi } from '../../api/informe-socios';
import type {
  InformeStats,
  PreviewResumenSocio,
  CodigoDetectado,
  PreviewReporte,
  GenerarReporteResult,
} from '../../types/informe-socios.types';

const { Title, Paragraph, Text } = Typography;
const { RangePicker } = DatePicker;

const GenerarReportesPage: React.FC = () => {
  const [stats, setStats] = useState<InformeStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(false);
  const [preview, setPreview] = useState<PreviewReporte | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<GenerarReporteResult | null>(null);
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>(null);
  const [emailAdmin, setEmailAdmin] = useState('');
  const [enviarEmail, setEnviarEmail] = useState(true);

  const fetchStats = async () => {
    setLoadingStats(true);
    try {
      const { data } = await informeSociosApi.getStats();
      setStats(data);
    } catch {
      message.error('Error al cargar estadísticas');
    } finally {
      setLoadingStats(false);
    }
  };

  useEffect(() => { fetchStats(); }, []);

  const handlePreview = async () => {
    if (!dateRange) return message.warning('Selecciona el rango de fechas');
    const [ini, fin] = dateRange;
    setLoadingPreview(true);
    setPreview(null);
    setResult(null);
    try {
      const { data } = await informeSociosApi.preview(
        ini.format('YYYY-MM-DD'),
        fin.format('YYYY-MM-DD'),
      );
      setPreview(data);
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Error al previsualizar');
    } finally {
      setLoadingPreview(false);
    }
  };

  const handleGenerar = async () => {
    if (!dateRange) return message.warning('Selecciona el rango de fechas');
    const [ini, fin] = dateRange;
    setSending(true);
    setResult(null);
    try {
      const { data } = await informeSociosApi.generarReportes({
        fecha_inicio: ini.format('YYYY-MM-DD'),
        fecha_fin: fin.format('YYYY-MM-DD'),
        email_admin: emailAdmin || undefined,
        enviar_email: enviarEmail,
      });
      setResult(data);
      if (data.errores.length === 0) {
        message.success(
          enviarEmail
            ? `¡Listo! Se enviaron ${data.emails_enviados} correos`
            : `Reportes generados para ${data.socios_procesados} socios`,
        );
      } else {
        message.warning(`Completado con ${data.errores.length} error(es)`);
      }
      fetchStats();
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Error al generar reportes');
    } finally {
      setSending(false);
    }
  };

  const previewColumns: ColumnsType<PreviewResumenSocio> = [
    {
      title: 'Código',
      dataIndex: 'codigo',
      width: 90,
      render: (v: string) => <Tag color="blue">{v}</Tag>,
    },
    {
      title: 'Nombre',
      dataIndex: 'nombre',
    },
    {
      title: 'Casos (Encargado)',
      dataIndex: 'casos_encargado',
      align: 'center',
      width: 140,
      render: (v: number) => (
        <Badge count={v} showZero style={{ backgroundColor: v > 0 ? '#1565C0' : '#d9d9d9' }} />
      ),
      sorter: (a, b) => a.casos_encargado - b.casos_encargado,
    },
    {
      title: 'Casos (Coordinador)',
      dataIndex: 'casos_coordinador',
      align: 'center',
      width: 160,
      render: (v: number) => (
        <Badge count={v} showZero style={{ backgroundColor: v > 0 ? '#7c3aed' : '#d9d9d9' }} />
      ),
      sorter: (a, b) => a.casos_coordinador - b.casos_coordinador,
    },
    {
      title: 'Clientes',
      dataIndex: 'clientes',
      align: 'center',
      width: 100,
      render: (v: number) => (
        <Badge count={v} showZero style={{ backgroundColor: v > 0 ? '#16a34a' : '#d9d9d9' }} />
      ),
      sorter: (a, b) => a.clientes - b.clientes,
    },
  ];

  const codigosColumns: ColumnsType<CodigoDetectado> = [
    {
      title: 'Código',
      dataIndex: 'codigo',
      width: 100,
      render: (v: string) => <Tag color="blue">{v}</Tag>,
    },
    {
      title: 'Casos (Encargado)',
      dataIndex: 'como_encargado',
      align: 'center',
      width: 150,
      render: (v: number) => (
        <Badge count={v} showZero style={{ backgroundColor: v > 0 ? '#1565C0' : '#d9d9d9' }} />
      ),
      sorter: (a, b) => a.como_encargado - b.como_encargado,
    },
    {
      title: 'Casos (Coordinador)',
      dataIndex: 'como_coordinador',
      align: 'center',
      width: 160,
      render: (v: number) => (
        <Badge count={v} showZero style={{ backgroundColor: v > 0 ? '#7c3aed' : '#d9d9d9' }} />
      ),
      sorter: (a, b) => a.como_coordinador - b.como_coordinador,
    },
    {
      title: 'Clientes',
      dataIndex: 'clientes',
      align: 'center',
      width: 100,
      render: (v: number) => (
        <Badge count={v} showZero style={{ backgroundColor: v > 0 ? '#16a34a' : '#d9d9d9' }} />
      ),
      sorter: (a, b) => a.clientes - b.clientes,
    },
    {
      title: 'Socio registrado',
      dataIndex: 'tiene_socio',
      align: 'center',
      width: 140,
      render: (v: boolean) =>
        v ? (
          <Tag color="green">Sí</Tag>
        ) : (
          <Tag color="red">No — registrar</Tag>
        ),
      filters: [
        { text: 'Sin socio registrado', value: false },
        { text: 'Con socio registrado', value: true },
      ],
      onFilter: (value, record) => record.tiene_socio === value,
    },
  ];

  return (
    <div style={{ padding: '24px', maxWidth: 1100, margin: '0 auto' }}>
      <Title level={2} style={{ marginBottom: 4 }}>
        Generar Informes de Socios
      </Title>
      <Paragraph type="secondary" style={{ marginBottom: 24 }}>
        Selecciona el período, previsualiza los datos y genera el envío de correos
        con el Excel adjunto para cada socio activo.
      </Paragraph>

      {/* Stats */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={8}>
          <Card style={{ borderRadius: 12 }}>
            <Statistic
              title="Casos en BD"
              value={stats?.total_casos ?? '—'}
              loading={loadingStats}
              prefix={<FolderOutlined style={{ color: '#1565C0' }} />}
              valueStyle={{ color: '#1565C0', fontWeight: 700 }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card style={{ borderRadius: 12 }}>
            <Statistic
              title="Clientes en BD"
              value={stats?.total_clientes ?? '—'}
              loading={loadingStats}
              prefix={<TeamOutlined style={{ color: '#16a34a' }} />}
              valueStyle={{ color: '#16a34a', fontWeight: 700 }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card style={{ borderRadius: 12 }}>
            <Statistic
              title="Socios registrados"
              value={stats?.total_socios ?? '—'}
              loading={loadingStats}
              prefix={<UserOutlined style={{ color: '#7c3aed' }} />}
              valueStyle={{ color: '#7c3aed', fontWeight: 700 }}
            />
          </Card>
        </Col>
      </Row>

      {/* Form */}
      <Card style={{ borderRadius: 12, marginBottom: 20 }}>
        <Form layout="vertical">
          <Row gutter={[16, 0]}>
            <Col xs={24} md={10}>
              <Form.Item label="Período del reporte" required>
                <RangePicker
                  style={{ width: '100%' }}
                  format="DD/MM/YYYY"
                  placeholder={['Fecha inicio', 'Fecha fin']}
                  onChange={(vals) =>
                    setDateRange(vals as [dayjs.Dayjs, dayjs.Dayjs] | null)
                  }
                />
              </Form.Item>
            </Col>
            <Col xs={24} md={10}>
              <Form.Item
                label="Email administrador (opcional)"
                extra="Si se indica, recibirá el reporte con todos los casos/clientes"
              >
                <Input
                  placeholder="admin@consortiumlegal.com"
                  value={emailAdmin}
                  onChange={(e) => setEmailAdmin(e.target.value)}
                  prefix={<UserOutlined />}
                />
              </Form.Item>
            </Col>
            <Col xs={24} md={4}>
              <Form.Item label="Enviar correos">
                <Switch
                  checked={enviarEmail}
                  onChange={setEnviarEmail}
                  checkedChildren="Sí"
                  unCheckedChildren="No"
                />
              </Form.Item>
            </Col>
          </Row>

          {!enviarEmail && (
            <Alert
              type="warning"
              showIcon
              style={{ marginBottom: 12, borderRadius: 8 }}
              message="Modo prueba: los reportes se generarán pero no se enviarán correos"
            />
          )}

          <Row gutter={[12, 0]}>
            <Col>
              <Button
                icon={<SearchOutlined />}
                onClick={handlePreview}
                loading={loadingPreview}
                disabled={!dateRange}
              >
                Previsualizar
              </Button>
            </Col>
            <Col>
              <Button
                type="primary"
                icon={<SendOutlined />}
                onClick={handleGenerar}
                loading={sending}
                disabled={!dateRange}
              >
                {enviarEmail ? 'Generar y enviar' : 'Generar sin enviar'}
              </Button>
            </Col>
          </Row>
        </Form>
      </Card>

      {/* Preview */}
      {preview && (
        <Card style={{ borderRadius: 12, marginBottom: 20 }}>
          <Row gutter={[16, 8]} style={{ marginBottom: 16 }}>
            <Col xs={12} sm={6}>
              <Statistic
                title="Casos en período"
                value={preview.casos_en_periodo}
                prefix={<FolderOutlined />}
                valueStyle={{ fontSize: 20 }}
              />
            </Col>
            <Col xs={12} sm={6}>
              <Statistic
                title="Clientes en período"
                value={preview.clientes_en_periodo}
                prefix={<TeamOutlined />}
                valueStyle={{ fontSize: 20 }}
              />
            </Col>
            <Col xs={12} sm={6}>
              <Statistic
                title="Códigos detectados"
                value={preview.codigos_detectados.length}
                prefix={<UserOutlined />}
                valueStyle={{ fontSize: 20 }}
              />
            </Col>
            <Col xs={12} sm={6}>
              <Statistic
                title="Sin socio registrado"
                value={preview.codigos_detectados.filter((c) => !c.tiene_socio).length}
                valueStyle={{ fontSize: 20, color: preview.codigos_detectados.some((c) => !c.tiene_socio) ? '#ef4444' : '#999' }}
              />
            </Col>
          </Row>

          <Divider style={{ margin: '12px 0' }} />

          {/* Tabla de códigos detectados en los datos */}
          <Text strong style={{ display: 'block', marginBottom: 8 }}>
            Códigos encontrados en los datos del período
          </Text>
          <Text type="secondary" style={{ display: 'block', marginBottom: 12, fontSize: 12 }}>
            Los marcados en rojo no tienen socio registrado — ve a "Gestión de socios" para agregarlos antes de enviar.
          </Text>
          <Table<CodigoDetectado>
            dataSource={preview.codigos_detectados}
            columns={codigosColumns}
            rowKey="codigo"
            size="small"
            pagination={false}
            rowClassName={(r) => (!r.tiene_socio ? 'ant-table-row-muted' : '')}
            style={{ marginBottom: 20 }}
          />

          {/* Tabla resumen por socio registrado (si hay socios) */}
          {preview.resumen_por_socio.length > 0 && (
            <>
              <Divider style={{ margin: '12px 0' }} />
              <Text strong style={{ display: 'block', marginBottom: 8 }}>
                Resumen por socio registrado
              </Text>
              <Table<PreviewResumenSocio>
                dataSource={preview.resumen_por_socio}
                columns={previewColumns}
                rowKey="codigo"
                size="small"
                pagination={false}
                rowClassName={(r) =>
                  r.casos_encargado + r.casos_coordinador + r.clientes === 0
                    ? 'ant-table-row-muted'
                    : ''
                }
              />
            </>
          )}
        </Card>
      )}

      {/* Result */}
      {result && (
        <Card style={{ borderRadius: 12 }}>
          <Row gutter={[16, 16]} style={{ marginBottom: result.errores.length > 0 ? 16 : 0 }}>
            <Col xs={24} sm={8}>
              <Statistic
                title="Socios procesados"
                value={result.socios_procesados}
                prefix={<CheckCircleOutlined style={{ color: '#16a34a' }} />}
                valueStyle={{ color: '#16a34a', fontWeight: 700 }}
              />
            </Col>
            <Col xs={24} sm={8}>
              <Statistic
                title="Correos enviados"
                value={result.emails_enviados}
                prefix={<FileExcelOutlined style={{ color: '#1565C0' }} />}
                valueStyle={{ color: '#1565C0', fontWeight: 700 }}
              />
            </Col>
            <Col xs={24} sm={8}>
              <Statistic
                title="Errores"
                value={result.errores.length}
                prefix={<WarningOutlined style={{ color: result.errores.length > 0 ? '#ef4444' : '#999' }} />}
                valueStyle={{ color: result.errores.length > 0 ? '#ef4444' : '#999', fontWeight: 700 }}
              />
            </Col>
          </Row>

          {result.errores.length > 0 && (
            <Collapse
              items={[{
                key: '1',
                label: <Space><WarningOutlined style={{ color: '#ef4444' }} /><Text type="danger">Ver errores ({result.errores.length})</Text></Space>,
                children: (
                  <ul style={{ margin: 0, paddingLeft: 20 }}>
                    {result.errores.map((e, i) => (
                      <li key={i}><Text type="danger">{e}</Text></li>
                    ))}
                  </ul>
                ),
              }]}
            />
          )}
        </Card>
      )}
    </div>
  );
};

export default GenerarReportesPage;
