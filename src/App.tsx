// src/App.tsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ConfigProvider } from 'antd';
import esES from 'antd/locale/es_ES';
import dayjs from 'dayjs';
import 'dayjs/locale/es';

// Páginas públicas
import Login from './pages/Login';

// Layout / Guards
import PrivateRoute from './routes/PrivateRoute';
import DashboardLayout from './pages/DashboardLayout';
import DashboardPage from './pages/DashboardPage';

// Estilos de AG Grid
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';

// Módulo de cheques
import AutorizacionCheque from './pages/cheques/AutorizacionCheque';
import LiquidacionCheque from './pages/cheques/LiquidacionCheque';
import ChequesLiquidados from './pages/cheques/ChequesLiquidados';
import GastosInmobiliarios from './pages/cheques/GastosInmobiliarios';
import ChequesPendientes from './pages/cheques/ChequesPendientes';

// Módulo de reservaciones
import RoomReservation from './pages/reservaciones/RoomReservation';
import RoomReservationForm from './pages/reservaciones/RoomReservationForm';
import RoomReservationList from './pages/reservaciones/RoomReservationList';

// Reporte exclusivo
import ExclusiveMonthlyReport from './pages/reportes/ExclusiveMonthlyReport';
import Notificaciones from './pages/notifications/Notificaciones';
import Documentos from './pages/notifications/Documentos';

// Módulo de recibos de caja
import RecibosCaja from './pages/recibos/RecibosCaja';
import CrearRecibo from './pages/recibos/CrearRecibo';
import EditarRecibo from './pages/recibos/EditarRecibo';
import ListarRecibos from './pages/recibos/ListarRecibos';

// 🆕 Requerimientos de dinero
import MoneyReqList from './pages/money_req/List';
import CreateMoneyRequirement from './pages/money_req/Create';

dayjs.locale('es');

function App() {
  return (
    <ConfigProvider locale={esES}>
      <BrowserRouter>
        <Routes>
          {/* Ruta pública */}
          <Route path="/login" element={<Login />} />

          {/* Rutas privadas */}
          <Route element={<PrivateRoute />}>
            <Route element={<DashboardLayout />}>
              {/* Dashboard principal */}
              <Route path="/dashboard" element={<DashboardPage />} />

              {/* Gestión de cheques */}
              <Route path="/dashboard/cheques/autorizacion" element={<AutorizacionCheque />} />
              <Route path="/dashboard/cheques/liquidacion" element={<LiquidacionCheque />} />
              <Route path="/dashboard/cheques/liquidados" element={<ChequesLiquidados />} />
              <Route path="/dashboard/cheques/inmobiliario" element={<GastosInmobiliarios />} />
              <Route path="/dashboard/cheques/pendientes" element={<ChequesPendientes />} />

              {/* Reservaciones */}
              <Route path="/dashboard/reservaciones" element={<RoomReservation />} />
              <Route path="/dashboard/reservaciones/crear" element={<RoomReservationForm />} />
              <Route path="/dashboard/reservaciones/listar" element={<RoomReservationList />} />
              <Route path="/dashboard/reservaciones/reporte-exclusivo" element={<ExclusiveMonthlyReport />} />

              {/* Notificaciones */}
              <Route path="/dashboard/notificaciones" element={<Notificaciones />} />
              <Route path="/dashboard/notificaciones/documentos" element={<Documentos />} />

              {/* Recibos de Caja */}
              <Route path="/dashboard/recibos/listar" element={<ListarRecibos />} />
              <Route path="/dashboard/recibos/crear" element={<CrearRecibo />} />
              <Route path="/dashboard/recibos/:id" element={<RecibosCaja />} />
              <Route path="/dashboard/recibos/editar/:id" element={<EditarRecibo mode="page" />} />

              {/* 🆕 Requerimientos de dinero */}
              <Route path="/dashboard/money-req" element={<MoneyReqList />} />
              <Route path="/dashboard/money-req/create" element={<CreateMoneyRequirement />} /> {/* 👈 nueva */}
            </Route>
          </Route>

          {/* Redirect raíz al dashboard */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />

          {/* Fallback 404 */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </ConfigProvider>
  );
}

export default App;