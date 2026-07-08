// src/pages/CrearContrasena.tsx
import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, Form, Input, Button, Typography, Result, Spin, message } from 'antd';
import { LockOutlined } from '@ant-design/icons';
import logoDark from '../assets/logo-dark.png';
import { validateSetPasswordToken, setPasswordWithToken } from '../api/auth';

const { Title, Text } = Typography;

type Phase = 'validating' | 'invalid' | 'form' | 'done';

/**
 * Página pública a la que llega el usuario desde el enlace del correo de
 * lanzamiento para definir su propia contraseña.
 */
function CrearContrasena() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [form] = Form.useForm();

  const uid = params.get('uid') ?? '';
  const subjectId = params.get('subject_id') ?? '';
  const exp = params.get('exp') ?? '';
  const sig = params.get('sig') ?? '';

  const [phase, setPhase] = useState<Phase>('validating');
  const [username, setUsername] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!uid || !subjectId || !exp || !sig) {
        setPhase('invalid');
        return;
      }
      try {
        const res = await validateSetPasswordToken({ uid, subject_id: subjectId, exp, sig });
        if (!active) return;
        if (res.valid) {
          setUsername(res.username ?? '');
          setPhase('form');
        } else {
          setPhase('invalid');
        }
      } catch {
        if (active) setPhase('invalid');
      }
    })();
    return () => {
      active = false;
    };
  }, [uid, subjectId, exp, sig]);

  const onFinish = async (values: { newPassword: string }) => {
    setSubmitting(true);
    try {
      await setPasswordWithToken({ uid, subjectId, exp, sig, newPassword: values.newPassword });
      setPhase('done');
    } catch (e: any) {
      message.error(e?.response?.data?.message || 'No se pudo crear la contraseña. El enlace pudo expirar.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#111827',
        padding: 24,
      }}
    >
      <Card style={{ width: '100%', maxWidth: 420 }} styles={{ body: { padding: 32 } }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <img src={logoDark} alt="Consortium Legal" style={{ height: 40, marginBottom: 16 }} />
          <Title level={4} style={{ margin: 0 }}>
            Crear contraseña
          </Title>
        </div>

        {phase === 'validating' && (
          <div style={{ textAlign: 'center', padding: '24px 0' }}>
            <Spin />
            <div style={{ marginTop: 12 }}>
              <Text type="secondary">Validando enlace…</Text>
            </div>
          </div>
        )}

        {phase === 'invalid' && (
          <Result
            status="warning"
            title="Enlace inválido o expirado"
            subTitle="Solicita uno nuevo desde “¿Olvidaste tu contraseña?” en la pantalla de inicio de sesión."
            extra={
              <Button type="primary" onClick={() => navigate('/login')}>
                Ir a iniciar sesión
              </Button>
            }
          />
        )}

        {phase === 'form' && (
          <>
            <Text type="secondary">
              Usuario: <Text strong>{username}</Text>
            </Text>
            <Form form={form} layout="vertical" onFinish={onFinish} style={{ marginTop: 16 }}>
              <Form.Item
                name="newPassword"
                label="Nueva contraseña"
                rules={[
                  { required: true, message: 'Ingresa una contraseña' },
                  { min: 8, message: 'Debe tener al menos 8 caracteres' },
                ]}
                hasFeedback
              >
                <Input.Password prefix={<LockOutlined />} placeholder="Mínimo 8 caracteres" />
              </Form.Item>

              <Form.Item
                name="confirm"
                label="Confirmar contraseña"
                dependencies={['newPassword']}
                hasFeedback
                rules={[
                  { required: true, message: 'Confirma tu contraseña' },
                  ({ getFieldValue }) => ({
                    validator(_, value) {
                      if (!value || getFieldValue('newPassword') === value) return Promise.resolve();
                      return Promise.reject(new Error('Las contraseñas no coinciden'));
                    },
                  }),
                ]}
              >
                <Input.Password prefix={<LockOutlined />} placeholder="Repite la contraseña" />
              </Form.Item>

              <Button type="primary" htmlType="submit" block loading={submitting}>
                Crear contraseña
              </Button>
            </Form>
          </>
        )}

        {phase === 'done' && (
          <Result
            status="success"
            title="¡Contraseña creada!"
            subTitle="Ya puedes iniciar sesión con tu usuario y tu nueva contraseña."
            extra={
              <Button type="primary" onClick={() => navigate('/login')}>
                Iniciar sesión
              </Button>
            }
          />
        )}
      </Card>
    </div>
  );
}

export default CrearContrasena;
