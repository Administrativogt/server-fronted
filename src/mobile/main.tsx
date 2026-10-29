// Entrada de la app Android (Capacitor). Solo Vacaciones y Por autorizar;
// reutiliza src/api y useAuthStore de la web, con pantallas propias para teléfono.
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import 'antd/dist/reset.css';
import '@ant-design/v5-patch-for-react-19';
import '@fontsource-variable/plus-jakarta-sans';
import './mobile.css';
import MobileApp from './MobileApp';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <MobileApp />
  </StrictMode>,
);
