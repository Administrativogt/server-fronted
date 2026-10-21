import { useEffect, useState } from 'react';
import { Alert, Button, Input, Modal, Result, Space, Spin, Typography, message } from 'antd';
import { SafetyCertificateOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import {
  disableMfa,
  enableMfa,
  getMfaStatus,
  regenerateRecoveryCodes,
  startMfaSetup,
  type MfaSetupInfo,
  type MfaStatus,
} from '../../api/mfa';
import MfaQrSetup from './MfaQrSetup';
import RecoveryCodes from './RecoveryCodes';

const { Text, Paragraph } = Typography;

interface Props {
  open: boolean;
  onClose: () => void;
  username?: string | null;
}

type Action = 'disable' | 'regenerate' | null;

/** Menú de usuario → "Verificación en dos pasos": activar, regenerar códigos o desactivar. */
function MfaSettingsModal({ open, onClose, username }: Props) {
  const [status, setStatus] = useState<MfaStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [setupInfo, setSetupInfo] = useState<MfaSetupInfo | null>(null);
  const [codes, setCodes] = useState<string[] | null>(null);
  const [action, setAction] = useState<Action>(null);
  const [actionCode, setActionCode] = useState('');
  const [busy, setBusy] = useState(false);

  const loadStatus = async () => {
    setLoading(true);
    try {
      const { data } = await getMfaStatus();
      setStatus(data);
    } catch {
      message.error('No se pudo consultar el estado del autenticador');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!open) return;
    setSetupInfo(null);
    setCodes(null);
    setAction(null);
    setActionCode('');
    loadStatus();
  }, [open]);

  const errorMsg = (e: any, fallback: string) => e?.response?.data?.message || fallback;

  const beginSetup = async () => {
    setBusy(true);
    try {
      const { data } = await startMfaSetup();
      setSetupInfo(data);
    } catch (e) {
      message.error(errorMsg(e, 'No se pudo iniciar la configuración'));
    } finally {
      setBusy(false);
    }
  };

  const confirmSetup = async (code: string) => {
    setBusy(true);
    try {
      const { data } = await enableMfa(code);
      setSetupInfo(null);
      setCodes(data.recovery_codes);
      message.success('Autenticador activado');
      loadStatus();
    } catch (e) {
      message.error(errorMsg(e, 'Código incorrecto'));
    } finally {
      setBusy(false);
    }
  };

  const runAction = async () => {
    setBusy(true);
    try {
      if (action === 'disable') {
        await disableMfa(actionCode);
        message.success('Verificación en dos pasos desactivada');
      } else if (action === 'regenerate') {
        const { data } = await regenerateRecoveryCodes(actionCode);
        setCodes(data.recovery_codes);
        message.success('Códigos nuevos generados; los anteriores ya no sirven');
      }
      setAction(null);
      setActionCode('');
      loadStatus();
    } catch (e) {
      setActionCode('');
      message.error(errorMsg(e, 'Código incorrecto'));
    } finally {
      setBusy(false);
    }
  };

  const renderBody = () => {
    if (loading || !status) {
      return (
        <div style={{ textAlign: 'center', padding: 32 }}>
          <Spin />
        </div>
      );
    }

    if (codes) {
      return (
        <>
          <RecoveryCodes codes={codes} username={username} />
          <Button type="primary" block style={{ marginTop: 20 }} onClick={() => setCodes(null)}>
            Ya los guardé
          </Button>
        </>
      );
    }

    if (setupInfo) {
      return (
        <>
          <MfaQrSetup info={setupInfo} loading={busy} onSubmit={confirmSetup} />
          <Button type="link" block style={{ marginTop: 12 }} onClick={() => setSetupInfo(null)}>
            Cancelar
          </Button>
        </>
      );
    }

    if (!status.enabled) {
      return (
        <Result
          icon={<SafetyCertificateOutlined />}
          title="Protege tu cuenta"
          subTitle="Además de tu contraseña, al iniciar sesión se pedirá un código de Microsoft Authenticator en tu celular."
          extra={
            <Button type="primary" loading={busy} onClick={beginSetup}>
              Activar verificación en dos pasos
            </Button>
          }
        />
      );
    }

    return (
      <div>
        <Alert
          type="success"
          showIcon
          message="Verificación en dos pasos activa"
          description={
            <>
              {status.enabled_at && <>Desde el {dayjs(status.enabled_at).format('DD/MM/YYYY')}. </>}
              Te quedan <Text strong>{status.recovery_codes_remaining}</Text> códigos de respaldo.
            </>
          }
          style={{ marginBottom: 16 }}
        />

        {action ? (
          <div>
            <Paragraph style={{ marginBottom: 8 }}>
              {action === 'disable'
                ? 'Para desactivarla, escribe el código actual de Microsoft Authenticator:'
                : 'Para generar códigos nuevos, escribe el código actual de Microsoft Authenticator:'}
            </Paragraph>
            <Space.Compact style={{ width: '100%' }}>
              <Input
                value={actionCode}
                onChange={(e) => setActionCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="123456"
                inputMode="numeric"
                autoComplete="one-time-code"
                aria-label="Código de 6 dígitos"
                onPressEnter={() => actionCode.length === 6 && runAction()}
                autoFocus
              />
              <Button
                type="primary"
                danger={action === 'disable'}
                loading={busy}
                disabled={actionCode.length !== 6}
                onClick={runAction}
              >
                {action === 'disable' ? 'Desactivar' : 'Generar'}
              </Button>
            </Space.Compact>
            <Button type="link" style={{ paddingLeft: 0, marginTop: 8 }} onClick={() => setAction(null)}>
              Cancelar
            </Button>
          </div>
        ) : (
          <Space wrap>
            <Button onClick={() => setAction('regenerate')}>Generar nuevos códigos de respaldo</Button>
            {status.required ? (
              <Text type="secondary">Es obligatoria para tu cuenta.</Text>
            ) : (
              <Button danger onClick={() => setAction('disable')}>
                Desactivar
              </Button>
            )}
          </Space>
        )}

        <Paragraph type="secondary" style={{ marginTop: 16, marginBottom: 0, fontSize: 12 }}>
          ¿Cambiaste de celular? Desactívala y vuelve a activarla con el nuevo, o pide a un administrador que la resetee.
        </Paragraph>
      </div>
    );
  };

  return (
    <Modal
      title="Verificación en dos pasos"
      open={open}
      onCancel={onClose}
      footer={null}
      destroyOnClose
      width={460}
    >
      {renderBody()}
    </Modal>
  );
}

export default MfaSettingsModal;
