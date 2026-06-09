import React, { useMemo, useState } from 'react';
import {
  Card, Upload, Button, message, Typography, Alert,
  Row, Col, Statistic, Table, Tag, Empty, Modal,
} from 'antd';
import {
  UploadOutlined, FileExcelOutlined, CheckCircleOutlined,
  UserDeleteOutlined, QuestionCircleOutlined, MailOutlined, StopOutlined,
} from '@ant-design/icons';
import type { RcFile } from 'antd/es/upload/interface';
import type { ColumnsType } from 'antd/es/table';
import { cargabilityApi } from '../../api/cargability';
import type {
  CargabilityUploadResponse,
  IgnoredCargabilityUser,
  ProcessedCargabilityUser,
} from '../../types/cargability.types';

const { Title, Text, Paragraph } = Typography;

/** Normaliza un nombre a formato título: inicial mayúscula por palabra,
 * resto en minúscula. Soporta acentos y la ñ. */
const toTitleCase = (value: string): string =>
  (value ?? '')
    .toLowerCase()
    .replace(/\p{L}+/gu, (word) => word.charAt(0).toUpperCase() + word.slice(1));

const UploadCargabilityReport: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<CargabilityUploadResponse | null>(null);
  const [processedModalOpen, setProcessedModalOpen] = useState(false);

  const handleUpload = async () => {
    if (!selectedFile) {
      message.warning('Por favor selecciona un archivo Excel');
      return;
    }

    const validExtensions = ['.xlsx', '.xls'];
    const fileExtension = selectedFile.name
      .substring(selectedFile.name.lastIndexOf('.'))
      .toLowerCase();

    if (!validExtensions.includes(fileExtension)) {
      message.error('Solo se permiten archivos Excel (.xlsx o .xls)');
      return;
    }

    setUploading(true);
    setResult(null);

    try {
      const { data } = await cargabilityApi.uploadExcel(selectedFile);
      message.success(data?.message || 'Archivo procesado exitosamente');
      setResult(data);
      setSelectedFile(null);
    } catch (error: any) {
      console.error('Error al procesar archivo:', error);
      const errorMsg =
        error.response?.data?.message || 'Error al procesar el archivo';
      message.error(errorMsg);
    } finally {
      setUploading(false);
    }
  };

  const beforeUpload = (file: RcFile) => {
    setSelectedFile(file);
    return false;
  };

  const ignoredColumns: ColumnsType<IgnoredCargabilityUser> = useMemo(
    () => [
      {
        title: 'Nombre (en Excel)',
        dataIndex: 'name',
        key: 'name',
        ellipsis: true,
      },
      {
        title: 'Horas trabajadas',
        dataIndex: 'hours',
        key: 'hours',
        width: 160,
        align: 'right',
        sorter: (a, b) => a.hours - b.hours,
        defaultSortOrder: 'descend',
        render: (h: number) => <Text strong>{h.toFixed(2)} h</Text>,
      },
      {
        title: 'Minutos',
        dataIndex: 'minutes',
        key: 'minutes',
        width: 120,
        align: 'right',
        render: (m: number) => m.toLocaleString('es-GT'),
      },
    ],
    [],
  );

  const totalInactiveHours = useMemo(
    () =>
      result?.inactiveUsers.reduce((acc, u) => acc + u.hours, 0) ?? 0,
    [result],
  );
  const totalNotFoundHours = useMemo(
    () =>
      result?.notFoundUsers.reduce((acc, u) => acc + u.hours, 0) ?? 0,
    [result],
  );

  const processedUsers = result?.processedUsers ?? [];
  const eligibleCount = useMemo(
    () => processedUsers.filter((u) => u.emailEligible).length,
    [processedUsers],
  );
  const notEligibleCount = processedUsers.length - eligibleCount;
  const totalProcessedHours = useMemo(
    () => processedUsers.reduce((acc, u) => acc + u.hours, 0),
    [processedUsers],
  );

  const processedColumns: ColumnsType<ProcessedCargabilityUser> = useMemo(
    () => [
      {
        title: 'Nombre',
        dataIndex: 'fullName',
        key: 'fullName',
        ellipsis: true,
        sorter: (a, b) => a.fullName.localeCompare(b.fullName),
        render: (v: string) => <Text strong>{toTitleCase(v)}</Text>,
      },
      {
        title: 'Correo',
        dataIndex: 'email',
        key: 'email',
        ellipsis: true,
        render: (v: string) => <Text type="secondary">{v}</Text>,
      },
      {
        title: 'Tipo',
        dataIndex: 'userType',
        key: 'userType',
        width: 70,
        align: 'center',
      },
      {
        title: 'Horas',
        dataIndex: 'hours',
        key: 'hours',
        width: 110,
        align: 'right',
        sorter: (a, b) => a.hours - b.hours,
        defaultSortOrder: 'descend',
        render: (h: number) => <Text strong>{h.toFixed(2)} h</Text>,
      },
      {
        title: 'Recibe correo',
        dataIndex: 'emailEligible',
        key: 'emailEligible',
        width: 150,
        align: 'center',
        filters: [
          { text: 'Sí recibe', value: true },
          { text: 'No recibe', value: false },
        ],
        onFilter: (value, record) => record.emailEligible === value,
        render: (eligible: boolean) =>
          eligible ? (
            <Tag color="success" icon={<MailOutlined />}>
              Sí
            </Tag>
          ) : (
            <Tag color="default" icon={<StopOutlined />}>
              No (por tipo)
            </Tag>
          ),
      },
    ],
    [],
  );

  return (
    <div style={{ padding: '24px', maxWidth: 1100, margin: '0 auto' }}>
      <Title level={2} style={{ marginBottom: 4 }}>
        Subir Reporte de Cargabilidad
      </Title>
      <Paragraph type="secondary" style={{ marginBottom: 24 }}>
        Procesa el Excel exportado desde Time Manager y calcula las horas
        facturables, no facturables y horas Consortium por usuario.
      </Paragraph>

      <Card style={{ borderRadius: 12, marginBottom: 16 }}>
        <Alert
          message="Instrucciones"
          description={
            <ul style={{ marginBottom: 0, paddingLeft: 20 }}>
              <li>Sube el archivo Excel exportado desde Time Manager.</li>
              <li>El archivo debe contener la hoja <Text code>Worksheet</Text>.</li>
              <li>
                Columnas requeridas: <Text code>Usuario</Text>,{' '}
                <Text code>Número del caso</Text>,{' '}
                <Text code>Tiempo Trabajado (Minutos)</Text>,{' '}
                <Text code>Fecha Trabajo</Text>,{' '}
                <Text code>Facturable</Text>.
              </li>
              <li>El sistema detecta automáticamente si es un reporte histórico o actual.</li>
              <li>
                Cada carga <Text strong>reemplaza</Text> los datos previos de cargabilidad.
              </li>
            </ul>
          }
          type="info"
          showIcon
          style={{ marginBottom: 24 }}
        />

        <Upload
          beforeUpload={beforeUpload}
          onRemove={() => setSelectedFile(null)}
          accept=".xlsx,.xls"
          maxCount={1}
          fileList={
            selectedFile
              ? [{ uid: '-1', name: selectedFile.name, status: 'done' }]
              : []
          }
        >
          <Button icon={<UploadOutlined />} block size="large">
            Seleccionar archivo Excel
          </Button>
        </Upload>

        {selectedFile && (
          <div
            style={{
              marginTop: 16,
              padding: 12,
              background: '#f5f5f5',
              borderRadius: 6,
            }}
          >
            <FileExcelOutlined style={{ color: '#52c41a', marginRight: 8 }} />
            <Text>{selectedFile.name}</Text>
          </div>
        )}

        <Button
          type="primary"
          onClick={handleUpload}
          loading={uploading}
          disabled={!selectedFile}
          block
          size="large"
          style={{ marginTop: 16 }}
        >
          {uploading ? 'Procesando...' : 'Procesar archivo'}
        </Button>
      </Card>

      {/* Resultados */}
      {result && (
        <>
          <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
            <Col xs={24} sm={8}>
              <Card
                hoverable={processedUsers.length > 0}
                onClick={() =>
                  processedUsers.length > 0 && setProcessedModalOpen(true)
                }
                style={{
                  borderRadius: 12,
                  cursor: processedUsers.length > 0 ? 'pointer' : 'default',
                }}
              >
                <Statistic
                  title="Procesados correctamente"
                  value={result.processed}
                  prefix={<CheckCircleOutlined style={{ color: '#16a34a' }} />}
                  valueStyle={{ color: '#16a34a', fontWeight: 700 }}
                />
                {processedUsers.length > 0 && (
                  <Text
                    type="secondary"
                    style={{ fontSize: 12, display: 'block', marginTop: 4 }}
                  >
                    Clic para ver quiénes son ({eligibleCount} reciben correo)
                  </Text>
                )}
              </Card>
            </Col>
            <Col xs={24} sm={8}>
              <Card
                style={{
                  borderRadius: 12,
                  borderColor:
                    result.inactiveUsers.length > 0 ? '#f59e0b' : undefined,
                }}
              >
                <Statistic
                  title="Inactivos (ya no en empresa)"
                  value={result.inactiveUsers.length}
                  prefix={<UserDeleteOutlined style={{ color: '#d97706' }} />}
                  valueStyle={{
                    color:
                      result.inactiveUsers.length > 0 ? '#d97706' : undefined,
                    fontWeight: 700,
                  }}
                  suffix={
                    result.inactiveUsers.length > 0 ? (
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        ({totalInactiveHours.toFixed(1)} h)
                      </Text>
                    ) : null
                  }
                />
              </Card>
            </Col>
            <Col xs={24} sm={8}>
              <Card
                style={{
                  borderRadius: 12,
                  borderColor:
                    result.notFoundUsers.length > 0 ? '#dc2626' : undefined,
                }}
              >
                <Statistic
                  title="No encontrados en BD"
                  value={result.notFoundUsers.length}
                  prefix={<QuestionCircleOutlined style={{ color: '#dc2626' }} />}
                  valueStyle={{
                    color:
                      result.notFoundUsers.length > 0 ? '#dc2626' : undefined,
                    fontWeight: 700,
                  }}
                  suffix={
                    result.notFoundUsers.length > 0 ? (
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        ({totalNotFoundHours.toFixed(1)} h)
                      </Text>
                    ) : null
                  }
                />
              </Card>
            </Col>
          </Row>

          {result.inactiveUsers.length === 0 && result.notFoundUsers.length === 0 && (
            <Alert
              type="success"
              showIcon
              message="Todos los usuarios del Excel se procesaron correctamente"
              description="No hay usuarios inactivos ni nombres sin coincidencia."
              style={{ borderRadius: 12 }}
            />
          )}

          {result.inactiveUsers.length > 0 && (
            <Card
              title={
                <span>
                  <UserDeleteOutlined style={{ color: '#d97706', marginRight: 8 }} />
                  Usuarios inactivos
                  <Tag color="warning" style={{ marginLeft: 8 }}>
                    {result.inactiveUsers.length}
                  </Tag>
                </span>
              }
              extra={
                <Text type="secondary">
                  Existen en el sistema pero su estado no está activo
                </Text>
              }
              style={{ borderRadius: 12, marginBottom: 16 }}
            >
              <Alert
                type="warning"
                showIcon
                style={{ marginBottom: 12 }}
                message="Estos usuarios ya no continúan en la empresa pero registraron horas en el período del Excel. Sus datos se ignoraron."
              />
              <Table<IgnoredCargabilityUser>
                dataSource={result.inactiveUsers}
                columns={ignoredColumns}
                rowKey={(r) => r.name}
                size="small"
                pagination={{
                  defaultPageSize: 10,
                  pageSizeOptions: ['10', '20', '50'],
                  showSizeChanger: true,
                  showTotal: (t, r) => `${r[0]}-${r[1]} de ${t}`,
                }}
              />
            </Card>
          )}

          {result.notFoundUsers.length > 0 && (
            <Card
              title={
                <span>
                  <QuestionCircleOutlined style={{ color: '#dc2626', marginRight: 8 }} />
                  Usuarios no encontrados
                  <Tag color="error" style={{ marginLeft: 8 }}>
                    {result.notFoundUsers.length}
                  </Tag>
                </span>
              }
              extra={
                <Text type="secondary">
                  El nombre del Excel no coincide con ningún usuario de la BD
                </Text>
              }
              style={{ borderRadius: 12, marginBottom: 16 }}
            >
              <Alert
                type="error"
                showIcon
                style={{ marginBottom: 12 }}
                message="No se encontró ningún usuario que coincida con estos nombres del Excel."
                description="Verifica que el nombre esté escrito igual que en la base de datos (sin diferencias de mayúsculas/minúsculas, acentos u orden de apellidos), o registra al usuario si es nuevo."
              />
              <Table<IgnoredCargabilityUser>
                dataSource={result.notFoundUsers}
                columns={ignoredColumns}
                rowKey={(r) => r.name}
                size="small"
                pagination={{
                  defaultPageSize: 10,
                  pageSizeOptions: ['10', '20', '50'],
                  showSizeChanger: true,
                  showTotal: (t, r) => `${r[0]}-${r[1]} de ${t}`,
                }}
              />
            </Card>
          )}

          {result.processed === 0 && (
            <Empty description="No se procesó ningún usuario" />
          )}

          <Modal
            open={processedModalOpen}
            onCancel={() => setProcessedModalOpen(false)}
            title={
              <span>
                <CheckCircleOutlined
                  style={{ color: '#16a34a', marginRight: 8 }}
                />
                Usuarios procesados
                <Tag color="success" style={{ marginLeft: 8 }}>
                  {processedUsers.length}
                </Tag>
              </span>
            }
            footer={[
              <Button
                key="close"
                onClick={() => setProcessedModalOpen(false)}
              >
                Cerrar
              </Button>,
            ]}
            width={780}
          >
            <Alert
              type="info"
              showIcon
              style={{ marginBottom: 12 }}
              message={
                <span>
                  De los <Text strong>{processedUsers.length}</Text> procesados,{' '}
                  <Text strong>{eligibleCount}</Text> reciben correo y{' '}
                  <Text strong>{notEligibleCount}</Text> quedan fuera por su tipo
                  de usuario (no están en los tipos habilitados para envío).{' '}
                  Total de horas procesadas:{' '}
                  <Text strong>{totalProcessedHours.toFixed(1)} h</Text>.
                </span>
              }
            />
            <Table<ProcessedCargabilityUser>
              dataSource={processedUsers}
              columns={processedColumns}
              rowKey={(r) => r.username}
              size="small"
              pagination={{
                defaultPageSize: 10,
                pageSizeOptions: ['10', '20', '50', '100'],
                showSizeChanger: true,
                showTotal: (t, r) => `${r[0]}-${r[1]} de ${t}`,
              }}
            />
          </Modal>
        </>
      )}
    </div>
  );
};

export default UploadCargabilityReport;
