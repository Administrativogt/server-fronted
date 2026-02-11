import { useNavigate } from 'react-router-dom';
import { Row, Col, Form, Input, Button, Typography, message, Checkbox, ConfigProvider, theme as antdTheme } from 'antd';
import api from '../api/axios';
import useAuthStore from '../auth/useAuthStore';
import loginImage from '../assets/new_cover_consortium copy.jpg';
import logoDark from '../assets/logo-dark.png';

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
  const setToken = useAuthStore((state) => state.setToken);
  const setUsername = useAuthStore((state) => state.setUsername);
  const setUserId = useAuthStore((state) => state.setUserId);
  const setRefreshToken = useAuthStore((state) => state.setRefreshToken);
  const setTipoUsuario = useAuthStore((state) => state.setTipoUsuario);
  const setIsSuperuser = useAuthStore((state) => state.setIsSuperuser);
  const setPermissions = useAuthStore((state) => state.setPermissions);

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
      const { access_token } = response.data;

      console.log('📦 Respuesta del backend:', response.data);

      const decoded = decodeJwt(access_token);
      console.log('🔓 JWT decodificado:', decoded);

      if (!decoded) {
        throw new Error('Token inválido');
      }

      setToken(access_token);
      setRefreshToken('');
      setUsername(decoded.username || transformedValues.username);
      setUserId(decoded.sub);

      try {
        const profileResponse = await api.get('/auth/profile', {
          headers: { Authorization: `Bearer ${access_token}` }
        });
        console.log('📋 Respuesta del profile:', profileResponse.data);

        if (profileResponse.data?.tipo_usuario) {
          setTipoUsuario(profileResponse.data.tipo_usuario);
        }

        setIsSuperuser(profileResponse.data?.is_superuser === true);

        if (profileResponse.data?.permissions && Array.isArray(profileResponse.data.permissions)) {
          setPermissions(profileResponse.data.permissions);
        } else {
          setPermissions([]);
        }

      } catch (error) {
        console.error('❌ Error al obtener profile:', error);
        setIsSuperuser(false);
        setPermissions([]);
      }

      message.success('Inicio de sesión exitoso');
      navigate('/dashboard');
    } catch (error: any) {
      console.error('❌ Error en login:', error);
      const errorMsg = error.response?.data?.message || 'Credenciales inválidas';
      message.error(errorMsg);
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
                  placeholder="Ej. JGOMEZ"
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
                  <Link style={{ color: accentBlue }}>¿Olvidaste tu contraseña?</Link>
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
    </ConfigProvider>
  );
}

export default Login;
