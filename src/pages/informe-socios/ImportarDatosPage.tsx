import React, { useState } from 'react';
import {
  Card, Upload, Button, message, Typography, Alert, Row, Col, Statistic, Divider,
} from 'antd';
import {
  UploadOutlined, FileExcelOutlined, CheckCircleOutlined,
  UsergroupAddOutlined, FileSearchOutlined,
} from '@ant-design/icons';
import type { RcFile } from 'antd/es/upload/interface';
import { informeSociosApi } from '../../api/informe-socios';

const { Title, Text, Paragraph } = Typography;

const ImportarDatosPage: React.FC = () => {
  const [fileCasos, setFileCasos] = useState<File | null>(null);
  const [fileClientes, setFileClientes] = useState<File | null>(null);
  const [uploadingCasos, setUploadingCasos] = useState(false);
  const [uploadingClientes, setUploadingClientes] = useState(false);
  const [resultCasos, setResultCasos] = useState<number | null>(null);
  const [resultClientes, setResultClientes] = useState<number | null>(null);

  const handleImportarCasos = async () => {
    if (!fileCasos) return message.warning('Selecciona el Excel de casos');
    setUploadingCasos(true);
    setResultCasos(null);
    try {
      const { data } = await informeSociosApi.importarCasos(fileCasos);
      message.success(`${data.importados} casos importados correctamente`);
      setResultCasos(data.importados);
      setFileCasos(null);
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Error al importar casos');
    } finally {
      setUploadingCasos(false);
    }
  };

  const handleImportarClientes = async () => {
    if (!fileClientes) return message.warning('Selecciona el Excel de clientes');
    setUploadingClientes(true);
    setResultClientes(null);
    try {
      const { data } = await informeSociosApi.importarClientes(fileClientes);
      message.success(`${data.importados} clientes importados correctamente`);
      setResultClientes(data.importados);
      setFileClientes(null);
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Error al importar clientes');
    } finally {
      setUploadingClientes(false);
    }
  };

  return (
    <div style={{ padding: '24px', maxWidth: 900, margin: '0 auto' }}>
      <Title level={2} style={{ marginBottom: 4 }}>
        Importar Datos Maestros
      </Title>
      <Paragraph type="secondary" style={{ marginBottom: 24 }}>
        Carga los Exceles maestros de casos y clientes. Cada importación
        <Text strong> reemplaza todos los datos existentes</Text>.
      </Paragraph>

      <Alert
        type="info"
        showIcon
        style={{ marginBottom: 24, borderRadius: 10 }}
        message="¿Qué archivo cargar?"
        description={
          <ul style={{ marginBottom: 0, paddingLeft: 20 }}>
            <li><strong>Casos:</strong> Excel con encabezados DIRECTORIO, NOMBRE, CASO, ENCARGADO, COORDINADOR… (encabezado en fila 1)</li>
            <li><strong>Clientes:</strong> Excel con encabezados CLIENTE, RAZON SOCIAL, Socio Encargado Cliente… (encabezado detectado automáticamente)</li>
          </ul>
        }
      />

      <Row gutter={[24, 24]}>
        {/* Casos */}
        <Col xs={24} md={12}>
          <Card
            title={<span><FileSearchOutlined style={{ marginRight: 8, color: '#1565C0' }} />Excel de Casos</span>}
            style={{ borderRadius: 12, height: '100%' }}
          >
            <Upload
              beforeUpload={(file: RcFile) => { setFileCasos(file); return false; }}
              onRemove={() => setFileCasos(null)}
              accept=".xlsx,.xls"
              maxCount={1}
              fileList={fileCasos ? [{ uid: '-1', name: fileCasos.name, status: 'done' }] : []}
            >
              <Button icon={<UploadOutlined />} block>
                Seleccionar archivo
              </Button>
            </Upload>

            {fileCasos && (
              <div style={{ marginTop: 12, padding: 10, background: '#f5f5f5', borderRadius: 6 }}>
                <FileExcelOutlined style={{ color: '#52c41a', marginRight: 8 }} />
                <Text>{fileCasos.name}</Text>
              </div>
            )}

            <Button
              type="primary"
              block
              size="large"
              style={{ marginTop: 16 }}
              loading={uploadingCasos}
              disabled={!fileCasos}
              onClick={handleImportarCasos}
            >
              {uploadingCasos ? 'Importando...' : 'Importar casos'}
            </Button>

            {resultCasos !== null && (
              <div style={{ marginTop: 16 }}>
                <Statistic
                  title="Casos importados"
                  value={resultCasos}
                  prefix={<CheckCircleOutlined style={{ color: '#16a34a' }} />}
                  valueStyle={{ color: '#16a34a', fontWeight: 700 }}
                />
              </div>
            )}
          </Card>
        </Col>

        {/* Clientes */}
        <Col xs={24} md={12}>
          <Card
            title={<span><UsergroupAddOutlined style={{ marginRight: 8, color: '#1565C0' }} />Excel de Clientes</span>}
            style={{ borderRadius: 12, height: '100%' }}
          >
            <Upload
              beforeUpload={(file: RcFile) => { setFileClientes(file); return false; }}
              onRemove={() => setFileClientes(null)}
              accept=".xlsx,.xls"
              maxCount={1}
              fileList={fileClientes ? [{ uid: '-1', name: fileClientes.name, status: 'done' }] : []}
            >
              <Button icon={<UploadOutlined />} block>
                Seleccionar archivo
              </Button>
            </Upload>

            {fileClientes && (
              <div style={{ marginTop: 12, padding: 10, background: '#f5f5f5', borderRadius: 6 }}>
                <FileExcelOutlined style={{ color: '#52c41a', marginRight: 8 }} />
                <Text>{fileClientes.name}</Text>
              </div>
            )}

            <Button
              type="primary"
              block
              size="large"
              style={{ marginTop: 16 }}
              loading={uploadingClientes}
              disabled={!fileClientes}
              onClick={handleImportarClientes}
            >
              {uploadingClientes ? 'Importando...' : 'Importar clientes'}
            </Button>

            {resultClientes !== null && (
              <div style={{ marginTop: 16 }}>
                <Statistic
                  title="Clientes importados"
                  value={resultClientes}
                  prefix={<CheckCircleOutlined style={{ color: '#16a34a' }} />}
                  valueStyle={{ color: '#16a34a', fontWeight: 700 }}
                />
              </div>
            )}
          </Card>
        </Col>
      </Row>

      <Divider />
      <Alert
        type="warning"
        showIcon
        message="Recuerda"
        description="Cada importación borra y reemplaza todos los datos anteriores. Asegúrate de subir el Excel maestro completo del período que deseas reportar."
        style={{ borderRadius: 10 }}
      />
    </div>
  );
};

export default ImportarDatosPage;
