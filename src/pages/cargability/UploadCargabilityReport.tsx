import React, { useState } from 'react';
import { Card, Upload, Button, message, Typography, Alert } from 'antd';
import { UploadOutlined, FileExcelOutlined } from '@ant-design/icons';
import type { RcFile } from 'antd/es/upload/interface';
import { cargabilityApi } from '../../api/cargability';

const { Title, Text } = Typography;

const UploadCargabilityReport: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const handleUpload = async () => {
    if (!selectedFile) {
      message.warning('Por favor selecciona un archivo Excel');
      return;
    }

    // Validar extensión
    const validExtensions = ['.xlsx', '.xls'];
    const fileExtension = selectedFile.name.substring(selectedFile.name.lastIndexOf('.')).toLowerCase();
    
    if (!validExtensions.includes(fileExtension)) {
      message.error('Solo se permiten archivos Excel (.xlsx o .xls)');
      return;
    }

    setUploading(true);

    try {
      const { data } = await cargabilityApi.uploadExcel(selectedFile);
      message.success(data?.message || 'Archivo procesado exitosamente');
      setSelectedFile(null);
    } catch (error: any) {
      console.error('Error al procesar archivo:', error);
      const errorMsg = error.response?.data?.message || 'Error al procesar el archivo';
      message.error(errorMsg);
    } finally {
      setUploading(false);
    }
  };

  const beforeUpload = (file: RcFile) => {
    setSelectedFile(file);
    return false; // Prevenir auto-upload
  };

  return (
    <div style={{ padding: '24px' }}>
      <Title level={2}>Subir Reporte de Cargabilidad</Title>

      <Card style={{ maxWidth: 600 }}>
        <Alert
          message="Instrucciones"
          description={
            <ul style={{ marginBottom: 0, paddingLeft: 20 }}>
              <li>Sube el archivo Excel exportado desde Time Manager</li>
              <li>El archivo debe contener la hoja "Worksheet"</li>
              <li>Se procesarán las columnas: Usuario, Número del caso, Tiempo Trabajado (Minutos), Fecha Trabajo, Facturable</li>
              <li>El sistema detecta automáticamente si es un reporte histórico o actual</li>
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
          fileList={selectedFile ? [{
            uid: '-1',
            name: selectedFile.name,
            status: 'done',
          }] : []}
        >
          <Button icon={<UploadOutlined />} block size="large">
            Seleccionar archivo Excel
          </Button>
        </Upload>

        {selectedFile && (
          <div style={{ marginTop: 16, padding: 12, background: '#f5f5f5', borderRadius: 4 }}>
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
    </div>
  );
};

export default UploadCargabilityReport;