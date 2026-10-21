import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Row, Col, Form, Input, Button, Typography, message, Checkbox, ConfigProvider, Modal, theme as antdTheme } from 'antd';
import api from '../api/axios';
import useAuthStore from '../auth/useAuthStore';
import loginImage from '../assets/new_cover_consortium copy.jpg';
import logoDark from '../assets/logo-dark.png';
import type { ModuleAccessItem } from '../types/module-access.types';
import {
  verifyMfaLogin,
  startMfaSetupFromLogin,
  enableMfaFromLogin,
  type MfaSetupInfo,
} from '../api/mfa';
import MfaQrSetup from '../components/mfa/MfaQrSetup';
import RecoveryCodes from '../components/mfa/RecoveryCodes';

import './Login.css';

const { Title, Text, Link } = Typography;

const darkBg = '#111827';
const darkCard = '#1f2937';
const darkBorder = '#374151';
const accentBlue = '#3C50E0'; // índigo de marca (alineado con theme.ts)
const accentBlueHover = '#6675e8';
const textWhite = '#ffffff';
const textMuted = '#9ca3af';

function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  // Si el usuario llegó desde una URL protegida (ej. /dashboard/mis-cheques desde el correo),
  // PrivateRoute la guardó en location.state.from; si no, vamos al dashboard.
  const redirectTo =
    typeof (location.state as any)?.from === 'string'
      ? (location.state as any).from
      : '/dashboard';
  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotForm] = Form.useForm();
  const [forceChangeOpen, setForceChangeOpen] = useState(false);
  const [forceChangeLoading, setForceChangeLoading] = useState(false);
  const [forceChangeForm] = Form.useForm();
  // Doble factor: tras la contraseña, el backend puede pedir el código de la
  // app (verify) o, si es obligatorio y no lo tiene, configurarla (setup).
  const [mfaStep, setMfaStep] = useState<{
    mode: 'verify' | 'setup';
    token: string;
    password: string;
    username: string;
  } | null>(null);
  const [mfaCode, setMfaCode] = useState('');
  const [mfaLoading, setMfaLoading] = useState(false);
  const [mfaSetupInfo, setMfaSetupInfo] = useState<MfaSetupInfo | null>(null);
  const [newRecoveryCodes, setNewRecoveryCodes] = useState<{
    codes: string[];
    user: any;
    password: string;
  } | null>(null);
  const setToken = useAuthStore((state) => state.setToken);
  const setUsername = useAuthStore((state) => state.setUsername);
  const setFirstName = useAuthStore((state) => state.setFirstName);
  const setLastName = useAuthStore((state) => state.setLastName);
  const setUserId = useAuthStore((state) => state.setUserId);
  const setRefreshToken = useAuthStore((state) => state.setRefreshToken);
  const setTipoUsuario = useAuthStore((state) => state.setTipoUsuario);
  const setIsSuperuser = useAuthStore((state) => state.setIsSuperuser);
  const setPermissions = useAuthStore((state) => state.setPermissions);
  const setModules = useAuthStore((state) => state.setModules);

  const decodeJwt = (token: string) => {
    try {
      const base64Payload = token.split('.')[1];
      const payload = atob(base64Payload);
      return JSON.parse(payload);
    } catch {
      return null;
    }
  };

  /** Guarda la sesión que devolvió el backend (login directo o tras MFA). */
  const applySession = (data: any, fallbackUsername: string) => {
    const { access_token, user } = data;
    const decoded = decodeJwt(access_token);

    if (!decoded) {
      throw new Error('Token inválido');
    }

    setToken(access_token);
    setRefreshToken('');
    setUsername(decoded.username || fallbackUsername);
    setFirstName(user?.first_name || '');
    setLastName(user?.last_name || '');
    setUserId(decoded.sub);
    setTipoUsuario(user?.tipo_usuario ?? null);
    useAuthStore.getState().setAreaId(user?.area?.id ?? null);
    useAuthStore.getState().setEquipoId(user?.equipo?.id ?? null);
    setIsSuperuser(user?.is_superuser === true);
    setPermissions(Array.isArray(user?.codenames) ? user.codenames : []);
    setModules(Array.isArray(user?.modules) ? (user.modules as ModuleAccessItem[]) : []);
  };

  /** Último paso: cambio obligatorio de contraseña o entrar al dashboard. */
  const finishLogin = (user: any, password: string) => {
    if (user?.must_change_password === true) {
      forceChangeForm.setFieldsValue({
        currentPassword: password,
        newPassword: '',
        confirmPassword: '',
      });
      setForceChangeOpen(true);
      message.warning('Debes cambiar la contraseña temporal por una más segura.');
      return;
    }

    message.success('Inicio de sesión exitoso');
    navigate(redirectTo, { replace: true });
  };

  const onMfaVerify = async () => {
    if (!mfaStep) return;
    try {
      setMfaLoading(true);
      const { data } = await verifyMfaLogin(mfaStep.token, mfaCode.trim());
      applySession(data, mfaStep.username);
      if (data?.mfa?.used_recovery_code) {
        const left = data.mfa.recovery_codes_remaining;
        message.warning(
          `Entraste con un código de respaldo. Te quedan ${left}. Si perdiste el celular, pide que te reseteen el autenticador.`,
          8,
        );
      }
      finishLogin(data.user, mfaStep.password);
    } catch (error: any) {
      setMfaCode('');
      message.error(error.response?.data?.message || 'Código incorrecto');
    } finally {
      setMfaLoading(false);
    }
  };

  const onMfaEnable = async (code: string) => {
    if (!mfaStep) return;
    try {
      setMfaLoading(true);
      const { data } = await enableMfaFromLogin(mfaStep.token, code);
      applySession(data, mfaStep.username);
      setNewRecoveryCodes({ codes: data.recovery_codes ?? [], user: data.user, password: mfaStep.password });
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Código incorrecto');
    } finally {
      setMfaLoading(false);
    }
  };

  const cancelMfa = () => {
    setMfaStep(null);
    setMfaCode('');
    setMfaSetupInfo(null);
  };

  const onFinish = async (values: { username: string; password: string }) => {
    try {
      const transformedValues = {
        ...values,
        username: values.username.toUpperCase(),
      };

      const response = await api.post('/auth/login', transformedValues);

      if (response.data?.mfa_required || response.data?.mfa_setup_required) {
        const mode = response.data.mfa_required ? 'verify' : 'setup';
        const token = response.data.mfa_token as string;
        if (mode === 'setup') {
          const { data } = await startMfaSetupFromLogin(token);
          setMfaSetupInfo(data);
        }
        setMfaStep({ mode, token, password: values.password, username: transformedValues.username });
        return;
      }

      applySession(response.data, transformedValues.username);
      finishLogin(response.data.user, values.password);
    } catch (error: any) {
      console.error('❌ Error en login:', error);
      const errorMsg = error.response?.data?.message || 'Credenciales inválidas';
      message.error(errorMsg);
    }
  };

  const onForgotPassword = async (values: { email: string }) => {
    try {
      setForgotLoading(true);
      await api.post('/auth/forgot-password', {
        email: values.email.trim().toLowerCase(),
      });
      message.success('Si los datos son correctos, enviamos una contraseña temporal al correo registrado.');
      forgotForm.resetFields();
      setForgotOpen(false);
    } catch (error: any) {
      const errorMsg = error.response?.data?.message || 'No se pudo procesar la solicitud';
      message.error(errorMsg);
    } finally {
      setForgotLoading(false);
    }
  };

  const onForceChangePassword = async (values: { currentPassword: string; newPassword: string }) => {
    try {
      setForceChangeLoading(true);
      await api.post('/auth/change-password', {
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      });
      message.success('Contraseña actualizada. Bienvenido.');
      setForceChangeOpen(false);
      forceChangeForm.resetFields();
      navigate(redirectTo, { replace: true });
    } catch (error: any) {
      const errorMsg = error.response?.data?.message || 'No se pudo cambiar la contraseña';
      message.error(errorMsg);
    } finally {
      setForceChangeLoading(false);
    }
  };

  return (
    <ConfigProvider
      theme={{
        algorithm: antdTheme.darkAlgorithm,
        token: {
          colorPrimary: accentBlue,
          colorBgContainer: darkCard,
          colorBorder: darkBorder,
          colorText: textWhite,
          colorTextSecondary: textMuted,
          colorTextPlaceholder: textMuted,
          borderRadius: 8,
        },
        components: {
          Input: {
            colorBgContainer: darkCard,
            colorBorder: darkBorder,
            activeBorderColor: accentBlue,
            hoverBorderColor: accentBlueHover,
            colorText: textWhite,
            colorTextPlaceholder: textMuted,
          },
          Form: {
            labelColor: textWhite,
          },
          Checkbox: {
            colorText: textWhite,
          },
          Button: {
            colorPrimary: accentBlue,
            colorPrimaryHover: accentBlueHover,
            primaryColor: textWhite,
            borderRadius: 8,
          },
        },
      }}
    >
      <Row style={{ minHeight: '100vh' }}>
        {/* Columna izquierda: formulario */}
        <Col
          xs={24}
          md={12}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '2rem',
            background: darkBg,
          }}
        >
          <div style={{ maxWidth: 400, width: '100%' }}>
            {/* Logo */}
            <div style={{ marginBottom: 40, textAlign: 'center' }}>
              <img
                src={logoDark}
                alt="Consortium Legal"
                style={{ height: 40, marginBottom: 32 }}
              />
              <Title level={2} style={{ color: textWhite, marginBottom: 8 }}>
                {newRecoveryCodes
                  ? 'Códigos de respaldo'
                  : mfaStep?.mode === 'setup'
                    ? 'Configura tu autenticador'
                    : mfaStep
                      ? 'Verificación en dos pasos'
                      : 'Iniciar sesión'}
              </Title>
              <Text style={{ color: textMuted, fontSize: 14 }}>
                {newRecoveryCodes
                  ? 'El autenticador quedó activo.'
                  : mfaStep?.mode === 'setup'
                    ? 'Tu cuenta requiere verificación en dos pasos con Microsoft Authenticator.'
                    : mfaStep
                      ? 'Abre Microsoft Authenticator y escribe el código de 6 dígitos.'
                      : 'Accede a tu cuenta para continuar'}
              </Text>
            </div>

            {newRecoveryCodes ? (
              <div>
                <RecoveryCodes codes={newRecoveryCodes.codes} username={mfaStep?.username} />
                <Button
                  type="primary"
                  block
                  size="large"
                  style={{ marginTop: 24, height: 48, fontWeight: 600 }}
                  onClick={() => {
                    const pending = newRecoveryCodes;
                    setNewRecoveryCodes(null);
                    finishLogin(pending.user, pending.password);
                  }}
                >
                  Ya los guardé, continuar
                </Button>
              </div>
            ) : mfaStep?.mode === 'setup' ? (
              <div>
                {mfaSetupInfo ? (
                  <MfaQrSetup info={mfaSetupInfo} loading={mfaLoading} onSubmit={onMfaEnable} submitText="Activar" />
                ) : (
                  <Text style={{ color: textMuted }}>Generando código QR…</Text>
                )}
                <Button type="link" block style={{ marginTop: 16 }} onClick={cancelMfa}>
                  Volver al inicio de sesión
                </Button>
              </div>
            ) : mfaStep ? (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (mfaCode.trim().length >= 6) onMfaVerify();
                }}
              >
                <Input
                  size="large"
                  value={mfaCode}
                  onChange={(e) => setMfaCode(e.target.value.toUpperCase().slice(0, 9))}
                  placeholder="123456"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  aria-label="Código de verificación"
                  autoFocus
                  style={{ letterSpacing: 6, textAlign: 'center', fontSize: 22, marginBottom: 16 }}
                />
                <Button
                  type="primary"
                  htmlType="submit"
                  block
                  size="large"
                  loading={mfaLoading}
                  disabled={mfaCode.trim().length < 6}
                  style={{ height: 48, fontWeight: 600, fontSize: 15, borderRadius: 8 }}
                >
                  Verificar
                </Button>
                <Text style={{ color: textMuted, fontSize: 12, display: 'block', marginTop: 16 }}>
                  ¿No tienes el celular? Escribe uno de tus códigos de respaldo (XXXX-XXXX).
                </Text>
                <Button type="link" block style={{ marginTop: 8 }} onClick={cancelMfa}>
                  Volver al inicio de sesión
                </Button>
              </form>
            ) : (
            <Form layout="vertical" onFinish={onFinish}>
              <Form.Item
                label={<span style={{ color: textWhite, fontWeight: 500 }}>Usuario</span>}
                name="username"
                rules={[{ required: true, message: 'Ingrese su usuario' }]}
                normalize={(value) => value?.toUpperCase()}
              >
                <Input
                  size="large"
                  style={{
                    background: `${darkCard} !important`,
                    borderColor: darkBorder,
                  }}
                />
              </Form.Item>

              <Form.Item
                label={<span style={{ color: textWhite, fontWeight: 500 }}>Contraseña</span>}
                name="password"
                rules={[{ required: true, message: 'Ingrese su contraseña' }]}
              >
                <Input.Password
                  size="large"
                  placeholder="********"
                  style={{
                    background: `${darkCard} !important`,
                    borderColor: darkBorder,
                  }}
                />
              </Form.Item>

              <Form.Item style={{ marginBottom: 24 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Checkbox style={{ color: textWhite }}>Recordarme</Checkbox>
                  <Link
                    style={{ color: accentBlue }}
                    onClick={(e) => {
                      e.preventDefault();
                      setForgotOpen(true);
                    }}
                  >
                    ¿Olvidaste tu contraseña?
                  </Link>
                </div>
              </Form.Item>

              <Form.Item>
                <Button
                  type="primary"
                  htmlType="submit"
                  block
                  size="large"
                  style={{
                    height: 48,
                    fontWeight: 600,
                    fontSize: 15,
                    borderRadius: 8,
                  }}
                >
                  Entrar
                </Button>
              </Form.Item>
            </Form>
            )}
          </div>
        </Col>

        {/* Columna derecha: imagen */}
        <Col
          xs={0}
          md={12}
          style={{
            backgroundImage: `url(${loginImage})`,
            backgroundSize: '100%',
            backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          backgroundColor: '#0f172a',
          height: '100vh',
            width: '100%',
          }}
        />
      </Row>

      <Modal
        title="Restablecer contraseña"
        open={forgotOpen}
        onCancel={() => {
          if (!forgotLoading) setForgotOpen(false);
        }}
        onOk={() => forgotForm.submit()}
        okText="Enviar recuperación"
        cancelText="Cancelar"
        okButtonProps={{ loading: forgotLoading }}
      >
        <Form
          form={forgotForm}
          layout="vertical"
          onFinish={onForgotPassword}
          initialValues={{ email: '' }}
        >
          <Form.Item
            label="Correo electrónico registrado"
            name="email"
            rules={[
              { required: true, message: 'Ingrese su correo' },
              { type: 'email', message: 'Correo inválido' },
            ]}
          >
            <Input placeholder="usuario@correo.com" />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="Cambio obligatorio de contraseña"
        open={forceChangeOpen}
        closable={false}
        maskClosable={false}
        keyboard={false}
        onOk={() => forceChangeForm.submit()}
        okText="Actualizar contraseña"
        okButtonProps={{ loading: forceChangeLoading }}
        cancelButtonProps={{ style: { display: 'none' } }}
      >
        <Text style={{ display: 'block', marginBottom: 16 }}>
          Iniciaste sesión con una contraseña temporal. Debes cambiarla ahora por una contraseña segura.
        </Text>

        <Form
          form={forceChangeForm}
          layout="vertical"
          onFinish={onForceChangePassword}
        >
          <Form.Item
            label="Contraseña actual (temporal)"
            name="currentPassword"
            rules={[{ required: true, message: 'Ingrese la contraseña temporal' }]}
          >
            <Input.Password placeholder="Contraseña temporal" />
          </Form.Item>

          <Form.Item
            label="Nueva contraseña"
            name="newPassword"
            rules={[
              { required: true, message: 'Ingrese una nueva contraseña' },
              { min: 8, message: 'Debe tener al menos 8 caracteres' },
            ]}
          >
            <Input.Password placeholder="Nueva contraseña segura" />
          </Form.Item>

          <Form.Item
            label="Confirmar nueva contraseña"
            name="confirmPassword"
            dependencies={['newPassword']}
            rules={[
              { required: true, message: 'Confirme la nueva contraseña' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('newPassword') === value) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error('Las contraseñas no coinciden'));
                },
              }),
            ]}
          >
            <Input.Password placeholder="Confirmar nueva contraseña" />
          </Form.Item>
        </Form>
      </Modal>
    </ConfigProvider>
  );
}

export default Login;
