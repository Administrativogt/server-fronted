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

  const onFinish = async (values: { username: string; password: string }) => {
    try {
      const transformedValues = {
        ...values,
        username: values.username.toUpperCase(), // ✅ Convertir a mayúsculas antes de enviar
      };

      const response = await api.post('/auth/login', transformedValues);
      const token = response.data.access_token;

      setToken(token);
      setUsername(transformedValues.username);

      navigate('/dashboard');
    } catch (error) {
      message.error('Credenciales inválidas');
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
              normalize={(value) => value?.toUpperCase()} // ✅ Convierte mientras escribe
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
