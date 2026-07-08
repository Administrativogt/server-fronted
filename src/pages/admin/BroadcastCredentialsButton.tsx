// src/pages/admin/BroadcastCredentialsButton.tsx
import React, { useState } from 'react';
import {
  Button,
  Modal,
  Space,
  Table,
  Tag,
  Typography,
  Alert,
  Popconfirm,
  message,
} from 'antd';
import { MailOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import useAuthStore from '../../auth/useAuthStore';
import {
  broadcastCredentials,
  broadcastCredentialsTest,
  type BroadcastResult,
  type BroadcastRecipient,
} from '../../api/auth';

const { Text, Paragraph } = Typography;

const statusColor: Record<string, string> = {
  enviado: 'green',
  simulado: 'blue',
  error: 'red',
  'sin-correo': 'orange',
};

/**
 * Botón de lanzamiento: envía a cada empleado activo su usuario + un enlace
 * para crear su contraseña. Solo lo ve un superusuario (el backend también lo
 * exige). Incluye simulación (dry-run) y envío de prueba a uno mismo.
 */
const BroadcastCredentialsButton: React.FC = () => {
  const isSuperuser = useAuthStore((s) => s.is_superuser);

  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<BroadcastResult | null>(null);

  if (!isSuperuser) return null;

  const runDryRun = async () => {
    setLoading(true);
    try {
      const data = await broadcastCredentials(true);
      setResult(data);
      message.info(`Simulación: se enviaría a ${data.total} usuario(s).`);
    } catch (e: any) {
      message.error(e?.response?.data?.message || 'Error al simular el envío');
    } finally {
      setLoading(false);
    }
  };

  const runSendToAll = async () => {
    setLoading(true);
    try {
      const data = await broadcastCredentials(false);
      setResult(data);
      message.success(
        `Envío completado: ${data.sent} enviados, ${data.failed} fallidos, ${data.skipped} omitidos.`,
      );
    } catch (e: any) {
      message.error(e?.response?.data?.message || 'Error al enviar credenciales');
    } finally {
      setLoading(false);
    }
  };

  const runTestToSelf = async () => {
    setLoading(true);
    try {
      const data = await broadcastCredentialsTest();
      message.success(`Correo de prueba enviado a ${data.email}`);
      Modal.info({
        title: 'Prueba enviada',
        width: 640,
        content: (
          <div>
            <Paragraph>
              Se envió el correo de credenciales a <Text strong>{data.email}</Text>.
            </Paragraph>
            <Paragraph type="secondary">Enlace generado (para inspeccionar):</Paragraph>
            <Paragraph copyable style={{ wordBreak: 'break-all' }}>
              {data.setPasswordLink}
            </Paragraph>
          </div>
        ),
      });
    } catch (e: any) {
      message.error(e?.response?.data?.message || 'Error al enviar la prueba');
    } finally {
      setLoading(false);
    }
  };

  const columns: ColumnsType<BroadcastRecipient> = [
    { title: 'Usuario', dataIndex: 'username', key: 'username' },
    { title: 'Correo', dataIndex: 'email', key: 'email' },
    {
      title: 'Estado',
      dataIndex: 'status',
      key: 'status',
      render: (s: string) => <Tag color={statusColor[s] || 'default'}>{s}</Tag>,
    },
  ];

  return (
    <>
      <Button icon={<MailOutlined />} onClick={() => setOpen(true)}>
        Enviar credenciales
      </Button>

      <Modal
        title="Enviar credenciales de acceso"
        open={open}
        onCancel={() => setOpen(false)}
        width={760}
        footer={null}
      >
        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
          message="Cómo funciona"
          description={
            <span>
              A cada empleado activo (excluye clientes) le llega un correo con su
              usuario y un enlace para <b>crear su contraseña</b>. Las contraseñas
              anteriores no se envían porque no se pueden recuperar. Prueba primero
              con <b>Simular</b> y con <b>Enviarme prueba</b> antes de enviar a todos.
            </span>
          }
        />

        <Space wrap style={{ marginBottom: 16 }}>
          <Button onClick={runDryRun} loading={loading}>
            Simular (ver destinatarios)
          </Button>
          <Button onClick={runTestToSelf} loading={loading}>
            Enviarme prueba a mí
          </Button>
          <Popconfirm
            title="Enviar a TODOS los empleados activos"
            description="Esta acción envía el correo real a todos. ¿Continuar?"
            okText="Sí, enviar a todos"
            cancelText="Cancelar"
            onConfirm={runSendToAll}
          >
            <Button type="primary" danger loading={loading}>
              Enviar a todos
            </Button>
          </Popconfirm>
        </Space>

        {result && (
          <>
            <Space wrap style={{ marginBottom: 12 }}>
              <Tag>Total: {result.total}</Tag>
              <Tag color={result.dryRun ? 'blue' : 'green'}>
                {result.dryRun ? 'Simulados' : 'Enviados'}: {result.dryRun ? result.total : result.sent}
              </Tag>
              {!result.dryRun && <Tag color="red">Fallidos: {result.failed}</Tag>}
              <Tag color="orange">Omitidos: {result.skipped}</Tag>
            </Space>
            <Table
              rowKey="id"
              size="small"
              columns={columns}
              dataSource={result.recipients}
              pagination={{ pageSize: 8 }}
              scroll={{ y: 320 }}
            />
          </>
        )}
      </Modal>
    </>
  );
};

export default BroadcastCredentialsButton;
