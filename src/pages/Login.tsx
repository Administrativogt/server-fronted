import { useNavigate } from 'react-router-dom';
import { Row, Col, Form, Input, Button, Typography, message, Checkbox, Divider } from 'antd';
import api from '../api/axios';
import useAuthStore from '../auth/useAuthStore';
import loginImage from '../assets/new_cover_consortium.jpg';

import './Login.css';

const { Title, Text, Link } = Typography;

function Login() {
  const navigate = useNavigate();
  const setToken = useAuthStore((state) => state.setToken);
  const setUsername = useAuthStore((state) => state.setUsername);
  const setUserId = useAuthStore((state) => state.setUserId); // ✅ AGREGAR
  const setRefreshToken = useAuthStore((state) => state.setRefreshToken); // ✅ AGREGAR
  const setTipoUsuario = useAuthStore((state) => state.setTipoUsuario); // ✅ AGREGAR

  // Función para decodificar el payload del JWT
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

      // Decodificar el JWT para obtener los datos del usuario
      const decoded = decodeJwt(access_token);
      console.log('🔓 JWT decodificado:', decoded);

      if (!decoded) {
        throw new Error('Token inválido');
      }

      // Guardar en el store
      setToken(access_token);
      setRefreshToken(''); // El backend no envía refresh_token
      setUsername(decoded.username || transformedValues.username);
      setUserId(decoded.sub); // 'sub' es el id del usuario en el JWT

      // Para tipo_usuario, hacer una llamada al profile después del login
      try {
        const profileResponse = await api.get('/auth/profile', {
          headers: { Authorization: `Bearer ${access_token}` }
        });
        if (profileResponse.data?.tipo_usuario) {
          setTipoUsuario(profileResponse.data.tipo_usuario);
        }
      } catch {
        // Si falla obtener el profile, continuamos sin tipo_usuario
        console.warn('No se pudo obtener tipo_usuario del profile');
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
          background: '#fff',
        }}
      >
        <div style={{ maxWidth: 400, width: '100%' }}>
          <div style={{ marginBottom: 32 }}>
            <Title level={2}>Iniciar sesión</Title>
            <Text type="secondary">Accede a tu cuenta para continuar</Text>
          </div>

          <Form layout="vertical" onFinish={onFinish}>
            <Form.Item
              label="Usuario"
              name="username"
              rules={[{ required: true, message: 'Ingrese su usuario' }]}
              normalize={(value) => value?.toUpperCase()}
            >
              <Input size="large" placeholder="Ej. JGOMEZ" />
            </Form.Item>

            <Form.Item
              label="Contraseña"
              name="password"
              rules={[{ required: true, message: 'Ingrese su contraseña' }]}
            >
              <Input.Password size="large" placeholder="********" />
            </Form.Item>

            <Form.Item>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <Checkbox>Recordarme</Checkbox>
                <Link>¿Olvidaste tu contraseña?</Link>
              </div>
            </Form.Item>

            <Form.Item>
              <Button type="primary" htmlType="submit" block size="large">
                Entrar
              </Button>
            </Form.Item>
          </Form>

          <Divider>O continuar con</Divider>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <Button block icon={<i className="fab fa-google" />} disabled>
              Google
            </Button>
            <Button block icon={<i className="fab fa-github" />} disabled>
              GitHub
            </Button>
          </div>
        </div>
      </Col>

      {/* Columna derecha: imagen */}
      <Col
        xs={0}
        md={12}
        style={{
          backgroundImage: `url(${loginImage})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          height: '100vh',
          width: '100%',
        }}
      />
    </Row>
  );
}

export default Login;