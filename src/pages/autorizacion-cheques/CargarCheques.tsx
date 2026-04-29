import React, { useState } from 'react';
import { Card, Upload, Button, message, Typography, Alert, Table, Tag, Divider } from 'antd';
import { UploadOutlined, FileExcelOutlined, WarningOutlined, CheckCircleOutlined, MessageOutlined } from '@ant-design/icons';
import type { RcFile } from 'antd/es/upload/interface';
import { uploadLiquidationChecks, uploadCheckComments } from '../../api/accounting-checks';
import type { UploadCommentsResult } from '../../types/accounting-checks.types';

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

  const [commentsFile, setCommentsFile] = useState<File | null>(null);
  const [uploadingComments, setUploadingComments] = useState(false);
  const [commentsResult, setCommentsResult] = useState<UploadCommentsResult | null>(null);

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

  const beforeUploadComments = (file: RcFile) => {
    setCommentsFile(file);
    return false;
  };

  const handleUploadComments = async () => {
    if (!commentsFile) {
      message.warning('Seleccioná un archivo Excel de comentarios');
      return;
    }
    const ext = commentsFile.name.substring(commentsFile.name.lastIndexOf('.')).toLowerCase();
    if (ext !== '.xlsx') {
      message.error('Solo se permiten archivos Excel (.xlsx)');
      return;
    }
    setUploadingComments(true);
    setCommentsResult(null);
    try {
      const res = await uploadCheckComments(commentsFile);
      setCommentsResult(res.data);
      const { matched, unmatched, skipped_empty } = res.data;
      if (matched > 0 && unmatched.length === 0) {
        message.success(`Se aplicaron ${matched} comentario(s).`);
      } else if (matched > 0) {
        message.warning(`Se aplicaron ${matched}. ${unmatched.length} cheque(s) no encontrados.`);
      } else if (skipped_empty > 0 && matched === 0) {
        message.info('No se aplicó ningún comentario (todas las celdas están vacías).');
      } else {
        message.warning('No se aplicaron comentarios.');
      }
      setCommentsFile(null);
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Error al cargar los comentarios.');
    } finally {
      setUploadingComments(false);
    }
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

      <Divider style={{ marginTop: 32 }} />

      <Card
        style={{ maxWidth: 600 }}
        title={
          <span>
            <MessageOutlined style={{ color: '#1565C0', marginRight: 8 }} />
            Cargar comentarios desde Excel (opcional)
          </span>
        }
      >
        <Alert
          message="¿Para qué sirve?"
          description={
            <ul style={{ marginBottom: 0, paddingLeft: 20 }}>
              <li>Si un responsable devuelve sus comentarios en un Excel, aquí los podés importar masivamente.</li>
              <li>El archivo debe tener dos columnas: <b>NUMERO</b> (No. de cheque) y <b>COMENTARIO</b>.</li>
              <li>Solo se aplican comentarios <b>no vacíos</b>, los existentes no se borran.</li>
              <li>Este archivo es <b>independiente</b> del Excel de integración de saldos.</li>
            </ul>
          }
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
        />

        <Upload
          beforeUpload={beforeUploadComments}
          onRemove={() => setCommentsFile(null)}
          accept=".xlsx"
          maxCount={1}
          fileList={
            commentsFile
              ? [{ uid: '-c', name: commentsFile.name, status: 'done' }]
              : []
          }
        >
          <Button icon={<UploadOutlined />} block size="large">
            Seleccionar Excel de comentarios
          </Button>
        </Upload>

        {commentsFile && (
          <div style={{ marginTop: 16, padding: 12, background: '#f5f5f5', borderRadius: 4 }}>
            <FileExcelOutlined style={{ color: '#52c41a', marginRight: 8 }} />
            <Text>{commentsFile.name}</Text>
          </div>
        )}

        <Button
          type="primary"
          onClick={handleUploadComments}
          loading={uploadingComments}
          disabled={!commentsFile}
          block
          size="large"
          style={{ marginTop: 16 }}
        >
          {uploadingComments ? 'Procesando...' : 'Aplicar comentarios'}
        </Button>

        {commentsResult && (
          <div style={{ marginTop: 16 }}>
            <Alert
              type={commentsResult.matched > 0 ? 'success' : 'info'}
              showIcon
              message={
                <>
                  Aplicados: <b>{commentsResult.matched}</b>
                  {' · '}Sin coincidencia: <b>{commentsResult.unmatched.length}</b>
                  {' · '}Filas vacías: <b>{commentsResult.skipped_empty}</b>
                </>
              }
            />
            {commentsResult.unmatched.length > 0 && (
              <Table
                style={{ marginTop: 12 }}
                dataSource={commentsResult.unmatched}
                rowKey="check_number"
                size="small"
                pagination={{ pageSize: 5 }}
                columns={[
                  {
                    title: 'No. Cheque',
                    dataIndex: 'check_number',
                    width: 120,
                    render: (v: number) => <Tag color="orange">{v}</Tag>,
                  },
                  { title: 'Comentario', dataIndex: 'comment', ellipsis: true },
                ]}
              />
            )}
          </div>
        )}
      </Card>
    </div>
  );
};

export default CargarCheques;
