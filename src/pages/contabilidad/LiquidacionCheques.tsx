import React, { useState } from 'react';
import { Button, Card, message, Table, Typography, Upload } from 'antd';
import { InboxOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { useNavigate } from 'react-router-dom';
import { checksApi } from '../../api/accounting';

const { Dragger } = Upload;
const { Text } = Typography;

export default function LiquidacionCheques() {
  const navigate = useNavigate();
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ processed: number } | null>(null);

  const handleUpload = async () => {
    if (!file) {
      message.warning('Seleccione un archivo Excel');
      return;
    }
    try {
      setLoading(true);
      const res = await checksApi.uploadExcel(file);
      setResult(res.data);
      message.success(`Procesados ${res.data.processed} cheques`);
    } catch (e: any) {
      message.error(e?.response?.data?.message ?? 'Error al procesar archivo');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card title="Cargar Liquidación de Cheques">
      <Dragger
        beforeUpload={(f) => {
          setFile(f);
          return false; // Prevent auto upload
        }}
        accept=".xlsx,.xls"
        maxCount={1}
        onRemove={() => setFile(null)}
        style={{ marginBottom: 24 }}
      >
        <p className="ant-upload-drag-icon">
          <InboxOutlined />
        </p>
        <p className="ant-upload-text">
          Haz clic o arrastra el archivo Excel aquí
        </p>
        <p className="ant-upload-hint">
          Solo archivos .xlsx o .xls. Las primeras 5 filas se usan como encabezado.
        </p>
      </Dragger>

      <Button
        type="primary"
        onClick={handleUpload}
        loading={loading}
        disabled={!file}
        style={{ marginRight: 12 }}
      >
        Procesar archivo
      </Button>
      <Button onClick={() => navigate('/dashboard/contabilidad/cheques/lista')}>
        Ver lista de cheques
      </Button>

      {result && (
        <Card style={{ marginTop: 24 }}>
          <Text strong>Cheques procesados: </Text>
          <Text>{result.processed}</Text>
        </Card>
      )}
    </Card>
  );
}
