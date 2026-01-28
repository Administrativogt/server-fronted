// src/App.tsx
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { ConfigProvider } from 'antd';
import esES from 'antd/locale/es_ES';
import dayjs from 'dayjs';
import 'dayjs/locale/es';
import { useEffect } from 'react';

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

// Módulo de recibos de caja
import RecibosCaja from './pages/recibos/RecibosCaja';
import CrearRecibo from './pages/recibos/CrearRecibo';
import EditarRecibo from './pages/recibos/EditarRecibo';
import ListarRecibos from './pages/recibos/ListarRecibos';

// Requerimientos de dinero
import MoneyReqList from './pages/money_req/List';
import CreateMoneyRequirement from './pages/money_req/Create';

import useAuthStore from './auth/useAuthStore';
import { useToken } from './hooks/useToken';
import CrearNotificacion from './pages/notifications/CrearNotificacion';
import Entregadas from './pages/notifications/Entregadas';
import Documentos from './pages/documents/Documentos';
import CreateDocumentForm from './pages/documents/CreateDocumentForm';
import DocumentFilters from './pages/documents/DocumentFilters';
import CreateEncargoPage from './pages/mensajeria/CreateEncargoPage';
import PendingEncargosPage from './pages/mensajeria/PendingEncargosPage';
import EditEncargoPage from './pages/mensajeria/EditEncargoPage';
import MensajeriaDashboardPage from './pages/mensajeria/MensajeriaDashboardPage';
import AssignedEncargosPage from './pages/mensajeria/AssignedEncargosPage';
import AllEncargosPage from './pages/mensajeria/components/AllEncargosPage';
import UploadCargabilityReport from './pages/cargability/UploadCargabilityReport';
import CargabilityUsersList from './pages/cargability/CargabilityUsersList';
import CargabilityReportView from './pages/cargability/CargabilityReportView';
import CourtCasesPage from './pages/court-cases/CourtCasesPage';
import CreateCourtCase from './pages/court-cases/CreateCourtCase';
import HumanResourcesPage from './pages/human-resources/HumanResourcesPage';

// ✨ NUEVO - Módulo de Appointments
import AppointmentsList from './pages/appointments/AppointmentsList';
import CreateAppointment from './pages/appointments/CreateAppointment';

// Módulo de Control de Procuraciones
import ProcurationList from './pages/procuration/ProcurationList';
import CreateProcuration from './pages/procuration/CreateProcuration';
import ProcurationDetail from './pages/procuration/ProcurationDetail';

dayjs.locale('es');

function AppInner() {
  const { isAuthenticated, clearToken } = useToken();
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();

  useEffect(() => {
    if (!isAuthenticated()) {
      clearToken();
      logout(false);
      navigate('/login', { replace: true });
    }
  }, [isAuthenticated, clearToken, logout, navigate]);

  return (
    <ConfigProvider locale={esES}>
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
            <Route path="/dashboard/notificaciones/crear" element={<CrearNotificacion />} />
            <Route path="/dashboard/notificaciones/entregadas" element={<Entregadas />} />

            {/* Recibos de Caja */}
            <Route path="/dashboard/recibos/listar" element={<ListarRecibos />} />
            <Route path="/dashboard/recibos/crear" element={<CrearRecibo />} />
            <Route path="/dashboard/recibos/:id" element={<RecibosCaja />} />
            <Route path="/dashboard/recibos/editar/:id" element={<EditarRecibo mode="page" />} />

            <Route path="/dashboard/documentos" element={<Documentos />} />
            <Route path="/dashboard/documentos/crear" element={<CreateDocumentForm />} />
            <Route path="/dashboard/documentos/entregados" element={<DocumentFilters />} />

            {/* Requerimientos de dinero */}
            <Route path="/dashboard/money-req" element={<MoneyReqList />} />
            <Route path="/dashboard/money-req/create" element={<CreateMoneyRequirement />} />

            {/* Módulo Mensajería */}
            <Route path="/dashboard/mensajeria/crear" element={<CreateEncargoPage />} />
            <Route path="/dashboard/mensajeria" element={<PendingEncargosPage />} />
            <Route path="/dashboard/mensajeria/editar/:id" element={<EditEncargoPage />} />
            <Route path="/dashboard/mensajeria/dashboard" element={<MensajeriaDashboardPage />} />
            <Route path="/dashboard/mensajeria/asignados" element={<AssignedEncargosPage />} />
            <Route path="/dashboard/mensajeria/todos" element={<AllEncargosPage />} />

            {/* Módulo Cargabilidad */}
            <Route path="/dashboard/cargability/upload" element={<UploadCargabilityReport />} />
            <Route path="/dashboard/cargability/users" element={<CargabilityUsersList />} />
            <Route path="/dashboard/cargability/report/:username" element={<CargabilityReportView />} />

            {/* Control de casos */}
            <Route path="/dashboard/casos" element={<CourtCasesPage />} />
            <Route path="/dashboard/casos/crear" element={<CreateCourtCase />} />
            <Route path="/casos" element={<Navigate to="/dashboard/casos" replace />} />
            <Route path="/casos/crear" element={<Navigate to="/dashboard/casos/crear" replace />} />

            {/* Recursos humanos */}
            <Route path="/dashboard/recursos-humanos" element={<HumanResourcesPage />} />

            {/* ✨ NUEVO - Módulo Appointments (Actas de Nombramiento) */}
            <Route path="/dashboard/appointments" element={<AppointmentsList />} />
            <Route path="/dashboard/appointments/create" element={<CreateAppointment />} />

            {/* Módulo Control de Procuraciones */}
            <Route path="/dashboard/procuration" element={<ProcurationList />} />
            <Route path="/dashboard/procuration/create" element={<CreateProcuration />} />
            <Route path="/dashboard/procuration/:id" element={<ProcurationDetail />} />

            {/* Fallback dentro del layout */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Route>
        </Route>

        {/* Redirect raíz al dashboard */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />

        {/* Fallback 404 */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </ConfigProvider>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppInner />
    </BrowserRouter>
  );
}