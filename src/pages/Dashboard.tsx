import { useEffect, useState } from 'react';
import api from '../api/axios';
import useAuthStore from '../auth/useAuthStore';
import { useNavigate } from 'react-router-dom';

interface UserProfile {
  userId: number;
  username: string;
}


function Dashboard() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const logout = useAuthStore((state) => state.logout);
  const navigate = useNavigate();

  const getProfile = async () => {
    try {
      const response = await api.get('/auth/profile');
      setUser(response.data);
    } catch (error) {
      console.error('No se pudo obtener el perfil:', error);
      logout();
      navigate('/login');
    }
  };

  useEffect(() => {
    getProfile();
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div style={{ padding: '2rem' }}>
      <h2>Dashboard</h2>
      {user ? (
        <div>
          <p>Bienvenido, <strong>{user.username}</strong> (ID: {user.userId})</p>

          <button onClick={handleLogout}>Cerrar sesión</button>
        </div>
      ) : (
        <p>Cargando perfil...</p>
      )}
    </div>
  );
}

export default Dashboard;
