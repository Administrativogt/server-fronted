import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Row, Col, Form, Input, Button, Typography, message, Checkbox, ConfigProvider, Modal, theme as antdTheme } from 'antd';
import api from '../api/axios';
import useAuthStore from '../auth/useAuthStore';
import loginImage from '../assets/new_cover_consortium copy.jpg';
import logoDark from '../assets/logo-dark.png';
import type { ModuleAccessItem } from '../types/module-access.types';

import './Login.css';

const { Title, Text, Link } = Typography;

const darkBg = '#111827';
const darkCard = '#1f2937';
const darkBorder = '#374151';
const accentBlue = '#6366f1';
const accentBlueHover = '#818cf8';
const textWhite = '#ffffff';
const textMuted = '#9ca3af';

function Login() {
  const navigate = useNavigate();
  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotForm] = Form.useForm();
  const [forceChangeOpen, setForceChangeOpen] = useState(false);
  const [forceChangeLoading, setForceChangeLoading] = useState(false);
  const [forceChangeForm] = Form.useForm();
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

  const onFinish = async (values: { username: string; password: string }) => {
    try {
      const transformedValues = {
        ...values,
        username: values.username.toUpperCase(),
      };

      const response = await api.post('/auth/login', transformedValues);
      const { access_token, user } = response.data;

      console.log('📦 Respuesta del backend:', response.data);

      const decoded = decodeJwt(access_token);
      console.log('🔓 JWT decodificado:', decoded);

      if (!decoded) {
        throw new Error('Token inválido');
      }

      setToken(access_token);
      setRefreshToken('');
      setUsername(decoded.username || transformedValues.username);
      setFirstName(user?.first_name || '');
      setLastName(user?.last_name || '');
      setUserId(decoded.sub);
      setTipoUsuario(user?.tipo_usuario ?? null);
      useAuthStore.getState().setAreaId(user?.area?.id ?? null);
      setIsSuperuser(user?.is_superuser === true);
      setPermissions(Array.isArray(user?.codenames) ? user.codenames : []);
      setModules(Array.isArray(user?.modules) ? (user.modules as ModuleAccessItem[]) : []);

      if (user?.must_change_password === true) {
        forceChangeForm.setFieldsValue({
          currentPassword: values.password,
          newPassword: '',
          confirmPassword: '',
        });
        setForceChangeOpen(true);
        message.warning('Debes cambiar la contraseña temporal por una más segura.');
        return;
      }

      message.success('Inicio de sesión exitoso');
      navigate('/dashboard');
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
      navigate('/dashboard');
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
                Iniciar sesión
              </Title>
              <Text style={{ color: textMuted, fontSize: 14 }}>
                Accede a tu cuenta para continuar
              </Text>
            </div>

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
