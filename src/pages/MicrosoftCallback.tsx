import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Result, Spin } from 'antd';
import { applySession } from '../auth/applySession';
import { completeMicrosoftLogin } from '../auth/microsoftSso';

/** /login/microsoft — Microsoft regresa aquí con ?code=…&state=… */
export default function MicrosoftCallback() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const started = useRef(false); // StrictMode monta dos veces: el code solo sirve una

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const search = window.location.search;
    // Que el code no quede en el historial
    window.history.replaceState(null, '', '/login/microsoft');
    completeMicrosoftLogin(search)
      .then(({ data, redirectTo }) => {
        applySession(data.access_token, data.user);
        navigate(redirectTo, { replace: true });
      })
      .catch((e: any) => setError(e?.response?.data?.message || e?.message || 'No se pudo iniciar sesión con Microsoft'));
  }, [navigate]);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      {error ? (
        <Result
          status="warning"
          title="No se pudo iniciar sesión con Microsoft"
          subTitle={error}
          extra={
            <Button type="primary" onClick={() => navigate('/login', { replace: true })}>
              Volver al inicio de sesión
            </Button>
          }
        />
      ) : (
        <Spin size="large" tip="Iniciando sesión con Microsoft…">
          <div style={{ width: 240, height: 80 }} />
        </Spin>
      )}
    </div>
  );
}
