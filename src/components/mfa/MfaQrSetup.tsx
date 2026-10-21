import { useState } from 'react';
import { Button, Input, QRCode, Typography } from 'antd';
import type { MfaSetupInfo } from '../../api/mfa';

const { Text, Paragraph } = Typography;

interface Props {
  info: MfaSetupInfo;
  loading?: boolean;
  submitText?: string;
  onSubmit: (code: string) => void;
}

/** Pasos para vincular Microsoft Authenticator: QR (o clave manual) + primer código. */
function MfaQrSetup({ info, loading, submitText = 'Activar', onSubmit }: Props) {
  const [code, setCode] = useState('');
  const [showKey, setShowKey] = useState(false);
  // Clave en grupos de 4 para copiarla a mano sin errores
  const groupedKey = info.secret.match(/.{1,4}/g)?.join(' ') ?? info.secret;

  return (
    <div>
      <ol style={{ paddingLeft: 20, marginBottom: 16, lineHeight: 1.7 }}>
        <li>
          Instala <Text strong>Microsoft Authenticator</Text> en tu celular (App Store o Google Play).
        </li>
        <li>
          En la app toca <Text strong>+</Text> → <Text strong>Otra cuenta (Google, Facebook, etc.)</Text> y
          escanea este código.
        </li>
        <li>Escribe abajo el código de 6 dígitos que te muestra la app.</li>
      </ol>

      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 8 }}>
        <div style={{ background: '#fff', padding: 8, borderRadius: 8 }}>
          <QRCode value={info.otpauth_url} size={184} color="#000000" bgColor="#ffffff" bordered={false} />
        </div>
      </div>

      <div style={{ textAlign: 'center', marginBottom: 16 }}>
        {showKey ? (
          <Paragraph copyable={{ text: info.secret }} style={{ marginBottom: 0 }}>
            <Text code>{groupedKey}</Text>
          </Paragraph>
        ) : (
          <Button type="link" size="small" onClick={() => setShowKey(true)}>
            ¿No puedes escanear? Escribe la clave a mano
          </Button>
        )}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (code.length === 6) onSubmit(code);
        }}
        style={{ display: 'flex', gap: 8 }}
      >
        <Input
          size="large"
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
          placeholder="123456"
          inputMode="numeric"
          autoComplete="one-time-code"
          aria-label="Código de 6 dígitos"
          style={{ letterSpacing: 6, textAlign: 'center', fontSize: 20 }}
          autoFocus
        />
        <Button type="primary" size="large" htmlType="submit" loading={loading} disabled={code.length !== 6}>
          {submitText}
        </Button>
      </form>
    </div>
  );
}

export default MfaQrSetup;
