import { useState, type FormEvent } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button } from 'antd';
import { EyeInvisibleOutlined, EyeOutlined } from '@ant-design/icons';
import api from '../../api/axios';
import useAuthStore from '../../auth/useAuthStore';
import type { ModuleAccessItem } from '../../types/module-access.types';
import logo from '../../assets/logo-cosortium.png';
import logoDark from '../../assets/logo-dark.png';
import { API_LABEL, IS_PROD_API } from '../env';

const decodeJwt = (token: string) => {
  try {
    return JSON.parse(atob(token.split('.')[1]));
  } catch {
    return null;
  }
};

// Mismo flujo que pages/Login.tsx. "Olvidé mi contraseña" y el cambio de
// contraseña temporal siguen en la web.
export default function MobileLogin() {
  const navigate = useNavigate();
  const location = useLocation();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const redirectTo = (location.state as { from?: string } | null)?.from || '/vacaciones';

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      setError('Ingresa tu usuario y tu contraseña.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const user_ = username.trim().toUpperCase();
      const { data } = await api.post('/auth/login', { username: user_, password });
      const { access_token, user } = data;
      const decoded = decodeJwt(access_token);
      if (!decoded) throw new Error('Token inválido');

      if (user?.must_change_password === true) {
        setError('Tienes una contraseña temporal. Cámbiala primero desde la web y luego vuelve a entrar aquí.');
        return;
      }

      const s = useAuthStore.getState();
      s.setToken(access_token);
      s.setRefreshToken('');
      s.setUsername(decoded.username || user_);
      s.setFirstName(user?.first_name || '');
      s.setLastName(user?.last_name || '');
      s.setUserId(decoded.sub);
      s.setTipoUsuario(user?.tipo_usuario ?? null);
      s.setAreaId(user?.area?.id ?? null);
      s.setEquipoId(user?.equipo?.id ?? null);
      s.setIsSuperuser(user?.is_superuser === true);
      s.setPermissions(Array.isArray(user?.codenames) ? user.codenames : []);
      s.setModules(Array.isArray(user?.modules) ? (user.modules as ModuleAccessItem[]) : []);

      navigate(redirectTo, { replace: true });
    } catch (err: any) {
      if (!err?.response) setError('Sin conexión con el servidor. Revisa tu internet e intenta de nuevo.');
      else setError(err.response.data?.message || 'Usuario o contraseña incorrectos.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="m-login">
      <div className="m-login-brand">
        <img src={isDark ? logoDark : logo} alt="Consortium Legal" />
        <h1>Administrativo</h1>
        <p>Entra con tu usuario del despacho.</p>
      </div>

      <form onSubmit={onSubmit} noValidate>
        <label className="m-field">
          <span>Usuario</span>
          <input
            className="m-input"
            value={username}
            onChange={(e) => setUsername(e.target.value.toUpperCase())}
            autoCapitalize="characters"
            autoCorrect="off"
            autoComplete="username"
            spellCheck={false}
            placeholder="Ej. ABC001"
            enterKeyHint="next"
          />
        </label>
        <label className="m-field">
          <span>Contraseña</span>
          <div style={{ position: 'relative' }}>
            <input
              className="m-input"
              type={showPw ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              enterKeyHint="go"
              style={{ paddingRight: 52 }}
            />
            <Button
              type="text"
              aria-label={showPw ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              icon={showPw ? <EyeOutlined /> : <EyeInvisibleOutlined />}
              onClick={() => setShowPw((v) => !v)}
              style={{ position: 'absolute', right: 4, top: 4, height: 40, width: 44 }}
            />
          </div>
        </label>

        {error && (
          <div className="m-note danger" role="alert" style={{ marginBottom: 16 }}>
            {error}
          </div>
        )}

        <Button type="primary" htmlType="submit" block loading={loading} style={{ height: 50, fontWeight: 600, fontSize: 16 }}>
          Iniciar sesión
        </Button>
      </form>

      <div className="m-login-foot">
        ¿Olvidaste tu contraseña? Recupérala desde administrativogt.com
        {!IS_PROD_API && (
          <div>
            <span className="m-env">Servidor: {API_LABEL}</span>
          </div>
        )}
      </div>
    </div>
  );
}
