import React, { useState } from 'react';
import { Card, Upload, Button, message, Typography, Alert, Table, Tag } from 'antd';
import { UploadOutlined, FileExcelOutlined, WarningOutlined, CheckCircleOutlined } from '@ant-design/icons';
import type { RcFile } from 'antd/es/upload/interface';
import { uploadLiquidationChecks } from '../../api/accounting-checks';

const { Title, Text } = Typography;

interface UnmatchedUser {
  codigo: string;
  nombre: string;
}

const CargarCheques: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [unmatchedUsers, setUnmatchedUsers] = useState<UnmatchedUser[]>([]);
  const [uploadDone, setUploadDone] = useState(false);

  const handleUpload = async () => {
    if (!selectedFile) {
      message.warning('Por favor selecciona un archivo Excel');
      return;
    }

    const ext = selectedFile.name.substring(selectedFile.name.lastIndexOf('.')).toLowerCase();
    if (ext !== '.xlsx') {
      message.error('Solo se permiten archivos Excel (.xlsx)');
      return;
    }

    setUploading(true);
    setUnmatchedUsers([]);
    setUploadDone(false);
    try {
      const res = await uploadLiquidationChecks(selectedFile);
      const unmatched: UnmatchedUser[] = res.data?.unmatched || [];
      setUnmatchedUsers(unmatched);
      setUploadDone(true);
      if (unmatched.length === 0) {
        message.success('Archivo cargado con éxito. Todos los usuarios fueron identificados.');
      } else {
        message.warning(`Archivo procesado. ${unmatched.length} usuario(s) sin código de directorio asignado.`);
      }
      setSelectedFile(null);
    } catch (error: any) {
      const msg = error.response?.data?.message || 'Ha ocurrido un error. Revisa el formato o encabezados del archivo.';
      message.error(msg);
    } finally {
      setUploading(false);
    }
  };

  const beforeUpload = (file: RcFile) => {
    setSelectedFile(file);
    return false;
  };

  return (
    <div style={{ padding: '24px' }}>
      <Title level={2}>Cargar cheques</Title>

      <Card style={{ maxWidth: 600 }}>
        <Alert
          message="Instrucciones"
          description={
            <ul style={{ marginBottom: 0, paddingLeft: 20 }}>
              <li>Sube el archivo Excel de integración de saldos (.xlsx)</li>
              <li>El archivo debe contener la fecha en la celda A4</li>
              <li>Los encabezados deben estar en la fila 7: FECHA, TIPO/DOC, SERIE, NÚMERO, NOMBRE, CLIENTES, CARGO</li>
              <li>Al cargar un nuevo archivo se desactivan los cheques anteriores</li>
            </ul>
          }
          type="info"
          showIcon
          style={{ marginBottom: 24 }}
        />

        <Upload
          beforeUpload={beforeUpload}
          onRemove={() => setSelectedFile(null)}
          accept=".xlsx"
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

      {uploadDone && unmatchedUsers.length === 0 && (
        <Alert
          icon={<CheckCircleOutlined />}
          message="Todos los usuarios del Excel tienen código de directorio asignado."
          type="success"
          showIcon
          style={{ marginTop: 24, maxWidth: 600 }}
        />
      )}

      {unmatchedUsers.length > 0 && (
        <Card
          style={{ marginTop: 24, maxWidth: 600 }}
          title={
            <span>
              <WarningOutlined style={{ color: '#faad14', marginRight: 8 }} />
              Usuarios sin match ({unmatchedUsers.length})
            </span>
          }
        >
          <Alert
            message="Estos usuarios no tienen código de directorio asignado en la aplicación. Sus cheques NO fueron procesados."
            type="warning"
            showIcon
            style={{ marginBottom: 16 }}
          />
          <Table
            dataSource={unmatchedUsers}
            rowKey="codigo"
            size="small"
            pagination={false}
            columns={[
              {
                title: 'Código (Excel)',
                dataIndex: 'codigo',
                render: (val: string) => <Tag color="orange">{val}</Tag>,
              },
              {
                title: 'Nombre (Excel)',
                dataIndex: 'nombre',
              },
            ]}
          />
        </Card>
      )}
    </div>
  );
};

export default CargarCheques;
