import { Alert, Button, Space, message } from 'antd';
import { CopyOutlined, DownloadOutlined } from '@ant-design/icons';

interface Props {
  codes: string[];
  username?: string | null;
}

/** Códigos de respaldo: se muestran UNA sola vez, para entrar si se pierde el celular. */
function RecoveryCodes({ codes, username }: Props) {
  const text = codes.join('\n');

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      message.success('Códigos copiados');
    } catch {
      message.error('No se pudieron copiar; selecciónalos a mano');
    }
  };

  const download = () => {
    const header =
      `Consortium Legal — códigos de respaldo${username ? ` de ${username}` : ''}\n` +
      'Cada código sirve UNA sola vez si no tienes el celular a mano.\n\n';
    const blob = new Blob([header + text + '\n'], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'codigos-respaldo-consortium.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <Alert
        type="warning"
        showIcon
        style={{ marginBottom: 16 }}
        message="Guarda estos códigos en un lugar seguro"
        description="Si pierdes o cambias de celular, cada código te deja entrar una vez. No se volverán a mostrar."
      />
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: 8,
          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
          fontSize: 16,
          textAlign: 'center',
          marginBottom: 16,
        }}
      >
        {codes.map((c) => (
          <div key={c} style={{ padding: '6px 0', border: '1px dashed rgba(128,128,128,0.45)', borderRadius: 6 }}>
            {c}
          </div>
        ))}
      </div>
      <Space>
        <Button icon={<CopyOutlined />} onClick={copy}>
          Copiar
        </Button>
        <Button icon={<DownloadOutlined />} onClick={download}>
          Descargar .txt
        </Button>
      </Space>
    </div>
  );
}

export default RecoveryCodes;
