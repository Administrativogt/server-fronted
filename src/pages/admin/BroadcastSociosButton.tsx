// src/pages/admin/BroadcastSociosButton.tsx
import React, { useMemo, useState } from 'react';
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
import { TeamOutlined, LinkOutlined, KeyOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import type { TableRowSelection } from 'antd/es/table/interface';
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
 * Envía credenciales a los socios activos. Por defecto una MISMA clave
 * compartida; los socios marcados como "personalizada" reciben en su lugar un
 * enlace para crear su propia contraseña. Solo lo ve un superusuario.
 */
const BroadcastSociosButton: React.FC = () => {
  const isSuperuser = useAuthStore((s) => s.is_superuser);

  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SociosBroadcastResult | null>(null);
  // IDs de socios que recibirán el enlace personalizado (en vez de la clave fija).
  const [customIds, setCustomIds] = useState<number[]>([]);

  const customCount = customIds.length;

  const runDryRun = async () => {
    setLoading(true);
    try {
      const data = await broadcastSociosPassword(true, customIds);
      setResult(data);
      message.info(
        `Simulación: ${data.total} socio(s). ${customCount} con clave personalizada, ${
          data.total - customCount
        } con clave por defecto.`,
      );
    } catch (e: any) {
      message.error(e?.response?.data?.message || 'Error al simular el envío');
    } finally {
      setLoading(false);
    }
  };

  const runSend = async () => {
    setLoading(true);
    try {
      const data = await broadcastSociosPassword(false, customIds);
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

  const runTestToSelf = async (custom: boolean) => {
    setLoading(true);
    try {
      const data = await broadcastSociosPasswordTest(custom);
      message.success(`Correo de prueba enviado a ${data.email}`);
      Modal.info({
        title: 'Prueba enviada (no cambió ninguna contraseña)',
        width: 560,
        content:
          data.variant === 'personalizada' ? (
            <div>
              <Paragraph>
                Se envió a <Text strong>{data.email}</Text> el correo con el{' '}
                <Text strong>enlace para crear la propia contraseña</Text>, igual
                que recibiría un socio marcado como personalizado.{' '}
                <Text strong>No</Text> se cambió ninguna contraseña.
              </Paragraph>
              <Paragraph type="secondary">Enlace generado:</Paragraph>
              <Paragraph copyable={{ text: data.setPasswordLink }} strong>
                {data.setPasswordLink}
              </Paragraph>
            </div>
          ) : (
            <div>
              <Paragraph>
                Se envió el correo de socios a <Text strong>{data.email}</Text> con
                la contraseña que recibirán los socios. <Text strong>No</Text> se
                cambió ninguna contraseña en esta prueba.
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

  // Se puede seleccionar personalizada solo tras cargar la lista (Simular).
  const rowSelection: TableRowSelection<BroadcastRecipient> = {
    selectedRowKeys: customIds,
    onChange: (keys) => setCustomIds(keys as number[]),
    getCheckboxProps: (r) => ({
      disabled: !r.email, // sin correo no se le puede enviar nada
    }),
    columnTitle: 'Personalizada',
    columnWidth: 130,
  };

  const columns: ColumnsType<BroadcastRecipient> = [
    { title: 'Usuario', dataIndex: 'username', key: 'username' },
    { title: 'Correo', dataIndex: 'email', key: 'email' },
    {
      title: 'Recibirá',
      key: 'tipo',
      render: (_: unknown, r: BroadcastRecipient) =>
        customIds.includes(r.id) ? (
          <Tag icon={<LinkOutlined />} color="purple">
            Personalizada (enlace)
          </Tag>
        ) : (
          <Tag icon={<KeyOutlined />} color="blue">
            Clave por defecto
          </Tag>
        ),
    },
    {
      title: 'Estado',
      dataIndex: 'status',
      key: 'status',
      render: (s: string) => <Tag color={statusColor[s] || 'default'}>{s}</Tag>,
    },
  ];

  const sendDescription = useMemo(
    () =>
      customCount > 0
        ? `Se enviará el enlace para crear contraseña a ${customCount} socio(s) marcado(s) (no se les cambia la clave), y la clave compartida al resto (a esos sí se les cambia). ¿Continuar?`
        : 'Se cambiará la contraseña de todos los socios a la nueva clave compartida y se les enviará por correo. ¿Continuar?',
    [customCount],
  );

  // Sólo lo ve un superusuario. El early-return va DESPUÉS de todos los hooks
  // (useState/useMemo) para no romper las reglas de hooks de React.
  if (!isSuperuser) return null;

  return (
    <>
      <Button icon={<TeamOutlined />} onClick={() => setOpen(true)}>
        Clave a socios
      </Button>

      <Modal
        title="Credenciales para socios"
        open={open}
        onCancel={() => setOpen(false)}
        width={820}
        footer={null}
      >
        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
          message="Cómo funciona"
          description={
            <span>
              Por defecto se genera <b>una misma clave segura</b> y se le asigna a
              todos los socios activos (entran directo). Si algún socio quiere{' '}
              <b>su propia contraseña</b>, primero pulsa <b>Simular</b> para cargar
              la lista, márcalo con la casilla <b>Personalizada</b> y recibirá en su
              lugar un <b>enlace para crearla</b> (a esos no se les cambia la clave).
            </span>
          }
        />

        <Space wrap style={{ marginBottom: 16 }}>
          <Button onClick={runDryRun} loading={loading}>
            Simular (ver socios)
          </Button>
          <Button onClick={() => runTestToSelf(false)} loading={loading}>
            Probar clave por defecto a mí
          </Button>
          <Button
            icon={<LinkOutlined />}
            onClick={() => runTestToSelf(true)}
            loading={loading}
          >
            Probar personalizada a mí
          </Button>
          <Popconfirm
            title="Enviar credenciales a los socios"
            description={sendDescription}
            okText="Sí, enviar"
            cancelText="Cancelar"
            onConfirm={runSend}
          >
            <Button type="primary" danger loading={loading}>
              Enviar a socios
            </Button>
          </Popconfirm>
        </Space>

        {result?.sharedPassword && (
          <Alert
            type="success"
            showIcon
            style={{ marginBottom: 16 }}
            message="Clave compartida asignada a los socios por defecto (guárdala)"
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
              <Tag color="purple">Personalizada: {customCount}</Tag>
              <Tag color={result.dryRun ? 'blue' : 'green'}>
                {result.dryRun ? 'Simulados' : 'Enviados'}:{' '}
                {result.dryRun ? result.total : result.sent}
              </Tag>
              {!result.dryRun && <Tag color="red">Fallidos: {result.failed}</Tag>}
              <Tag color="orange">Omitidos: {result.skipped}</Tag>
            </Space>
            <Table
              rowKey="id"
              size="small"
              rowSelection={rowSelection}
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
