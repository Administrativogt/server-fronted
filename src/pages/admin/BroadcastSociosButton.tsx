// src/pages/admin/BroadcastSociosButton.tsx
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
import { TeamOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import useAuthStore from '../../auth/useAuthStore';
import {
  broadcastSociosPassword,
  broadcastSociosPasswordTest,
  type SociosBroadcastResult,
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
 * Asigna una MISMA clave por defecto (generada, segura) a todos los socios y se
 * las envía por correo para que entren directo. Solo lo ve un superusuario.
 */
const BroadcastSociosButton: React.FC = () => {
  const isSuperuser = useAuthStore((s) => s.is_superuser);

  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SociosBroadcastResult | null>(null);

  if (!isSuperuser) return null;

  const runDryRun = async () => {
    setLoading(true);
    try {
      const data = await broadcastSociosPassword(true);
      setResult(data);
      message.info(`Simulación: la clave se enviaría a ${data.total} socio(s).`);
    } catch (e: any) {
      message.error(e?.response?.data?.message || 'Error al simular el envío');
    } finally {
      setLoading(false);
    }
  };

  const runSend = async () => {
    setLoading(true);
    try {
      const data = await broadcastSociosPassword(false);
      setResult(data);
      message.success(
        `Envío completado: ${data.sent} enviados, ${data.failed} fallidos, ${data.skipped} omitidos.`,
      );
    } catch (e: any) {
      message.error(e?.response?.data?.message || 'Error al enviar la clave a socios');
    } finally {
      setLoading(false);
    }
  };

  const runTestToSelf = async () => {
    setLoading(true);
    try {
      const data = await broadcastSociosPasswordTest();
      message.success(`Correo de prueba enviado a ${data.email}`);
      Modal.info({
        title: 'Prueba enviada (no cambió ninguna contraseña)',
        width: 560,
        content: (
          <div>
            <Paragraph>
              Se envió el correo de socios a <Text strong>{data.email}</Text> con la
              contraseña que recibirán los socios. <Text strong>No</Text> se cambió
              ninguna contraseña en esta prueba.
            </Paragraph>
            <Paragraph type="secondary">Contraseña de los socios:</Paragraph>
            <Paragraph copyable strong>
              {data.samplePassword}
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
      <Button icon={<TeamOutlined />} onClick={() => setOpen(true)}>
        Clave a socios
      </Button>

      <Modal
        title="Clave por defecto para socios"
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
              Se genera <b>una misma clave segura</b> y se le asigna a <b>todos los
              socios activos</b>. A cada uno le llega su usuario y esa clave para
              entrar directo a la plataforma (la clave queda fija; podrán cambiarla
              luego desde su perfil). Prueba primero con <b>Simular</b>.
            </span>
          }
        />

        <Space wrap style={{ marginBottom: 16 }}>
          <Button onClick={runDryRun} loading={loading}>
            Simular (ver socios)
          </Button>
          <Button onClick={runTestToSelf} loading={loading}>
            Enviarme prueba a mí
          </Button>
          <Popconfirm
            title="Asignar clave y enviar a todos los socios"
            description="Se cambiará la contraseña de todos los socios a la nueva clave compartida y se les enviará por correo. ¿Continuar?"
            okText="Sí, asignar y enviar"
            cancelText="Cancelar"
            onConfirm={runSend}
          >
            <Button type="primary" danger loading={loading}>
              Asignar y enviar a socios
            </Button>
          </Popconfirm>
        </Space>

        {result?.sharedPassword && (
          <Alert
            type="success"
            showIcon
            style={{ marginBottom: 16 }}
            message="Clave asignada a todos los socios (guárdala)"
            description={
              <Paragraph copyable strong style={{ fontSize: 18, margin: 0 }}>
                {result.sharedPassword}
              </Paragraph>
            }
          />
        )}

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

export default BroadcastSociosButton;
