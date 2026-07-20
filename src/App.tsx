// src/App.tsx
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { ConfigProvider, theme as antdTheme, App as AntdApp } from 'antd';
import esES from 'antd/locale/es_ES';
import dayjs from 'dayjs';
import 'dayjs/locale/es';
import { useEffect, lazy, Suspense } from 'react';
import useThemeStore from './hooks/useThemeStore';
import Loader from './components/Loader';
import ErrorBoundary from './components/ErrorBoundary';

// Páginas públicas
import Login from './pages/Login';
const CrearContrasena = lazy(() => import('./pages/CrearContrasena'));

// Layout / Guards (shell — se mantienen eager)
import PrivateRoute from './routes/PrivateRoute';
import ModuleRoute from './routes/ModuleRoute';
import DashboardLayout from './pages/DashboardLayout';
import DashboardPage from './pages/DashboardPage';

import useAuthStore from './auth/useAuthStore';
import { useToken } from './hooks/useToken';
import { PRIMARY, SUCCESS, DANGER, WARNING, INFO } from './pages/dashboard/theme';

/* ─── Páginas con carga diferida (code-splitting por ruta) ──────────────────
   Cada página se descarga solo al navegar a ella, sacando librerías pesadas
   (Nivo, AG Grid, ExcelJS, docx, etc.) del bundle inicial. */

// Módulo de cheques
const AutorizacionCheque = lazy(() => import('./pages/cheques/AutorizacionCheque'));
const CargarCheques = lazy(() => import('./pages/autorizacion-cheques/CargarCheques'));
const ListaCheques = lazy(() => import('./pages/autorizacion-cheques/ListaCheques'));
const MisCheques = lazy(() => import('./pages/autorizacion-cheques/MisCheques'));
const AutorizacionParcial = lazy(() => import('./pages/cheques/AutorizacionParcial'));
const LiquidacionCheque = lazy(() => import('./pages/cheques/LiquidacionCheque'));
const ChequesLiquidados = lazy(() => import('./pages/cheques/ChequesLiquidados'));
const GastosInmobiliarios = lazy(() => import('./pages/cheques/GastosInmobiliarios'));
const GastosLitigio = lazy(() => import('./pages/cheques/GastosLitigio'));
const ChequesPendientes = lazy(() => import('./pages/cheques/ChequesPendientes'));

// Módulo de reservaciones
const RoomReservation = lazy(() => import('./pages/reservaciones/RoomReservation'));
const RoomReservationForm = lazy(() => import('./pages/reservaciones/RoomReservationForm'));
const RoomReservationList = lazy(() => import('./pages/reservaciones/RoomReservationList'));

// Reporte exclusivo
const ExclusiveMonthlyReport = lazy(() => import('./pages/reportes/ExclusiveMonthlyReport'));
const Notificaciones = lazy(() => import('./pages/notifications/Notificaciones'));

// Módulo de recibos de caja
const RecibosCaja = lazy(() => import('./pages/recibos/RecibosCaja'));
const CrearRecibo = lazy(() => import('./pages/recibos/CrearRecibo'));
const EditarRecibo = lazy(() => import('./pages/recibos/EditarRecibo'));
const ListarRecibos = lazy(() => import('./pages/recibos/ListarRecibos'));

// Requerimientos de dinero
const MoneyReqList = lazy(() => import('./pages/money_req/List'));
const CreateMoneyRequirement = lazy(() => import('./pages/money_req/Create'));

// Notificaciones / Documentos
const CrearNotificacion = lazy(() => import('./pages/notifications/CrearNotificacion'));
const Entregadas = lazy(() => import('./pages/notifications/Entregadas'));
const Documentos = lazy(() => import('./pages/documents/Documentos'));
const CreateDocumentForm = lazy(() => import('./pages/documents/CreateDocumentForm'));
const DocumentFilters = lazy(() => import('./pages/documents/DocumentFilters'));

// Mensajería
const CreateEncargoPage = lazy(() => import('./pages/mensajeria/CreateEncargoPage'));
const PendingEncargosPage = lazy(() => import('./pages/mensajeria/PendingEncargosPage'));
const EditEncargoPage = lazy(() => import('./pages/mensajeria/EditEncargoPage'));
const MensajeriaDashboardPage = lazy(() => import('./pages/mensajeria/MensajeriaDashboardPage'));
const AssignedEncargosPage = lazy(() => import('./pages/mensajeria/AssignedEncargosPage'));
const AllEncargosPage = lazy(() => import('./pages/mensajeria/AllEncargosPage'));

// Cargabilidad
const UploadCargabilityReport = lazy(() => import('./pages/cargability/UploadCargabilityReport'));
const CargabilityUsersList = lazy(() => import('./pages/cargability/CargabilityUsersList'));
const CargabilityReportView = lazy(() => import('./pages/cargability/CargabilityReportView'));

// Informe socios
const GenerarReportesPage = lazy(() => import('./pages/informe-socios/GenerarReportesPage'));
const ImportarDatosPage = lazy(() => import('./pages/informe-socios/ImportarDatosPage'));
const GestionSociosPage = lazy(() => import('./pages/informe-socios/GestionSociosPage'));
const DatosImportadosPage = lazy(() => import('./pages/informe-socios/DatosImportadosPage'));

// Control de casos
const CourtCasesPage = lazy(() => import('./pages/court-cases/CourtCasesPage'));
const CreateCourtCase = lazy(() => import('./pages/court-cases/CreateCourtCase'));

// Recursos humanos
const HumanResourcesPage = lazy(() => import('./pages/human-resources/HumanResourcesPage'));
const VacacionesPage = lazy(() => import('./pages/human-resources/VacacionesPage'));

// Appointments
const AppointmentsList = lazy(() => import('./pages/appointments/AppointmentsList'));
const CreateAppointment = lazy(() => import('./pages/appointments/CreateAppointment'));
const AsambleasPage = lazy(() => import('./pages/appointments/asambleas/AsambleasPage'));

// Control de Procuraciones
const ProcurationList = lazy(() => import('./pages/procuration/ProcurationList'));
const CreateProcuration = lazy(() => import('./pages/procuration/CreateProcuration'));
const ProcurationDetail = lazy(() => import('./pages/procuration/ProcurationDetail'));
const ClientsMasterDataPage = lazy(() => import('./pages/procuration/ClientsMasterDataPage'));
const ProcurationChartsPage = lazy(() => import('./pages/procuration/ProcurationChartsPage'));

// Clientes y casos
const ClientCreationPage = lazy(() => import('./pages/client-creation/ClientCreationPage'));
const ClientListPage = lazy(() => import('./pages/client-creation/ClientListPage'));
const ClientDetailPage = lazy(() => import('./pages/client-creation/ClientDetailPage'));
const EditClientPage = lazy(() => import('./pages/client-creation/EditClientPage'));
const CaseCreationPage = lazy(() => import('./pages/client-creation/CaseCreationPage'));
const CaseListPage = lazy(() => import('./pages/client-creation/CaseListPage'));
const CaseDetailPage = lazy(() => import('./pages/client-creation/CaseDetailPage'));
const EditCasePage = lazy(() => import('./pages/client-creation/EditCasePage'));

// Administración de Usuarios / Agendador
const UsersAdminPage = lazy(() => import('./pages/admin/UsersAdminPage'));
const SchedulerList = lazy(() => import('./pages/agendador/SchedulerList'));
const SchedulerForm = lazy(() => import('./pages/agendador/SchedulerForm'));
const SchedulerCalendar = lazy(() => import('./pages/agendador/SchedulerCalendar'));
const SchedulerHolidaysList = lazy(() => import('./pages/agendador/SchedulerHolidaysList'));
const SchedulerHolidayForm = lazy(() => import('./pages/agendador/SchedulerHolidayForm'));

// Jurisprudencia
const JurisprudenceListPage = lazy(() => import('./pages/jurisprudence/JurisprudenceListPage'));
const JurisprudenceDashboardPage = lazy(() => import('./pages/jurisprudence/JurisprudenceDashboardPage'));
const SentenceDetailPage = lazy(() => import('./pages/jurisprudence/SentenceDetailPage'));
const SentenceFormPage = lazy(() => import('./pages/jurisprudence/SentenceFormPage'));

dayjs.locale('es');

function AppInner() {
  const { isAuthenticated, clearToken } = useToken();
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Rutas públicas que no requieren autenticación
    if (location.pathname === '/autorizacion-parcial') return;
    if (location.pathname === '/crear-contrasena') return;
    if (location.pathname === '/login') return;
    if (!isAuthenticated()) {
      clearToken();
      logout(false);
      navigate('/login', {
        replace: true,
        state: { from: `${location.pathname}${location.search}${location.hash}` },
      });
    }
  }, [isAuthenticated, clearToken, logout, navigate, location.pathname]);

  const themeMode = useThemeStore((s) => s.mode);

  return (
    <ConfigProvider
      locale={esES}
      theme={{
        algorithm: themeMode === 'dark' ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
        token: {
          // Marca única (índigo) y semánticos alineados con theme.ts —
          // así los componentes AntD y las superficies custom comparten acento.
          colorPrimary: PRIMARY,
          colorSuccess: SUCCESS,
          colorError: DANGER,
          colorWarning: WARNING,
          colorInfo: INFO,
          borderRadius: 6,
          fontFamily: "'Plus Jakarta Sans', system-ui, -apple-system, sans-serif",
        },
      }}
    >
      <AntdApp>
        <ErrorBoundary>
        <Suspense fallback={<Loader fullScreen label="Cargando…" />}>
        <Routes>
          {/* Ruta pública */}
          <Route path="/login" element={<Login />} />
          <Route path="/crear-contrasena" element={<CrearContrasena />} />
          <Route path="/autorizacion-parcial" element={<AutorizacionParcial />} />

          {/* Rutas privadas */}
          <Route element={<PrivateRoute />}>
            <Route element={<DashboardLayout />}>
              {/* Dashboard principal */}
              <Route path="/dashboard" element={<DashboardPage />} />

              {/* Autorización de cheques (cargar + lista) */}
              <Route element={<ModuleRoute moduleKeys={['cheques', 'autorizacion_cheques']} />}>
                <Route path="/dashboard/autorizacion-cheques/cargar" element={<CargarCheques />} />
                <Route path="/dashboard/autorizacion-cheques/lista" element={<ListaCheques />} />
                <Route path="/dashboard/mis-cheques" element={<MisCheques />} />
              </Route>

              {/* Gestión de cheques */}
              <Route element={<ModuleRoute moduleKeys={['cheques', 'autorizacion_cheques']} />}>
                <Route path="/dashboard/cheques/autorizacion" element={<AutorizacionCheque />} />
                <Route path="/dashboard/cheques/liquidacion" element={<LiquidacionCheque />} />
                <Route path="/dashboard/cheques/liquidados" element={<ChequesLiquidados />} />
              </Route>

              {/* Gastos inmobiliario — Django: superuser o secretaria equipo Inmobiliario */}
              <Route element={<ModuleRoute moduleKey="cheques_inmobiliario" />}>
                <Route path="/dashboard/cheques/inmobiliario" element={<GastosInmobiliarios />} />
              </Route>

              {/* Gastos litigio — espejo: superuser o secretaria equipo Litigio */}
              <Route element={<ModuleRoute moduleKey="cheques_litigio" />}>
                <Route path="/dashboard/cheques/litigio" element={<GastosLitigio />} />
              </Route>

              {/* Cheques antiguos pendientes — Django: superuser o is_staff */}
              <Route element={<ModuleRoute moduleKey="cheques_antiguos" />}>
                <Route path="/dashboard/cheques/pendientes" element={<ChequesPendientes />} />
              </Route>

              {/* Reservaciones */}
              <Route element={<ModuleRoute moduleKey="reservas_salas" />}>
                <Route path="/dashboard/reservaciones" element={<RoomReservation />} />
                <Route path="/dashboard/reservaciones/crear" element={<RoomReservationForm />} />
                <Route path="/dashboard/reservaciones/listar" element={<RoomReservationList />} />
                <Route path="/dashboard/reservaciones/reporte-exclusivo" element={<ExclusiveMonthlyReport />} />
              </Route>

              {/* Notificaciones */}
              <Route element={<ModuleRoute moduleKey="notificaciones" />}>
                <Route path="/dashboard/notificaciones" element={<Notificaciones />} />
                <Route path="/dashboard/notificaciones/crear" element={<CrearNotificacion />} />
                <Route path="/dashboard/notificaciones/entregadas" element={<Entregadas />} />
              </Route>

              {/* Recibos de Caja */}
              <Route element={<ModuleRoute moduleKey="recibos_caja" />}>
                <Route path="/dashboard/recibos/listar" element={<ListarRecibos />} />
                <Route path="/dashboard/recibos/crear" element={<CrearRecibo />} />
                <Route path="/dashboard/recibos/:id" element={<RecibosCaja />} />
                <Route path="/dashboard/recibos/editar/:id" element={<EditarRecibo mode="page" />} />
              </Route>

              <Route path="/dashboard/documentos" element={<Documentos />} />
              <Route path="/dashboard/documentos/crear" element={<CreateDocumentForm />} />
              <Route path="/dashboard/documentos/entregados" element={<DocumentFilters />} />

              {/* Requerimientos de dinero */}
              <Route element={<ModuleRoute moduleKey="solicitudes_dinero" />}>
                <Route path="/dashboard/money-req" element={<MoneyReqList />} />
                <Route path="/dashboard/money-req/create" element={<CreateMoneyRequirement />} />
              </Route>

              {/* Módulo Mensajería */}
              <Route element={<ModuleRoute moduleKey="encargos" />}>
                <Route path="/dashboard/mensajeria/crear" element={<CreateEncargoPage />} />
                <Route path="/dashboard/mensajeria" element={<PendingEncargosPage />} />
                <Route path="/dashboard/mensajeria/editar/:id" element={<EditEncargoPage />} />
                <Route path="/dashboard/mensajeria/dashboard" element={<MensajeriaDashboardPage />} />
                <Route path="/dashboard/mensajeria/asignados" element={<AssignedEncargosPage />} />
                <Route path="/dashboard/mensajeria/todos" element={<AllEncargosPage />} />
              </Route>

              {/* Módulo Cargabilidad */}
              <Route element={<ModuleRoute moduleKey="cargabilidad" />}>
                <Route path="/dashboard/cargability/upload" element={<UploadCargabilityReport />} />
                <Route path="/dashboard/cargability/users" element={<CargabilityUsersList />} />
                <Route path="/dashboard/cargability/report/:username" element={<CargabilityReportView />} />
              </Route>

              {/* Módulo Informe Socios */}
              <Route element={<ModuleRoute moduleKey="informe_socios" />}>
                <Route path="/dashboard/informe-socios" element={<GenerarReportesPage />} />
                <Route path="/dashboard/informe-socios/importar" element={<ImportarDatosPage />} />
                <Route path="/dashboard/informe-socios/socios" element={<GestionSociosPage />} />
                <Route path="/dashboard/informe-socios/datos" element={<DatosImportadosPage />} />
              </Route>

              {/* Control de casos */}
              <Route element={<ModuleRoute moduleKey="expedientes_judiciales" />}>
                <Route path="/dashboard/casos" element={<CourtCasesPage />} />
                <Route path="/dashboard/casos/crear" element={<CreateCourtCase />} />
                <Route path="/casos" element={<Navigate to="/dashboard/casos" replace />} />
                <Route path="/casos/crear" element={<Navigate to="/dashboard/casos/crear" replace />} />
              </Route>

              {/* Recursos humanos */}
              <Route element={<ModuleRoute moduleKey="recursos_humanos" />}>
                <Route path="/dashboard/recursos-humanos" element={<HumanResourcesPage />} />
                <Route path="/dashboard/recursos-humanos/vacaciones" element={<VacacionesPage />} />
              </Route>

              {/* ✨ NUEVO - Módulo Appointments (Actas de Nombramiento) */}
              <Route element={<ModuleRoute moduleKey="actas" />}>
                <Route path="/dashboard/appointments" element={<AppointmentsList />} />
                <Route path="/dashboard/appointments/create" element={<CreateAppointment />} />
                <Route path="/dashboard/appointments/asambleas" element={<AsambleasPage />} />
              </Route>

              {/* Agendador (control_de_plazos) */}
              <Route element={<ModuleRoute moduleKey="control_plazos" />}>
                <Route path="/dashboard/agendador" element={<SchedulerList />} />
                <Route path="/dashboard/agendador/crear" element={<SchedulerForm />} />
                <Route path="/dashboard/agendador/feriados" element={<SchedulerHolidaysList />} />
                <Route path="/dashboard/agendador/feriados/crear" element={<SchedulerHolidayForm />} />
                <Route path="/dashboard/agendador/calendario" element={<SchedulerCalendar />} />
              </Route>

              {/* Módulo Control de Procuraciones */}
              <Route element={<ModuleRoute moduleKey="procuracion" />}>
                <Route path="/dashboard/procuration" element={<ProcurationList />} />
                <Route path="/dashboard/procuration/create" element={<CreateProcuration />} />
                <Route path="/dashboard/procuration/:id" element={<ProcurationDetail />} />
                <Route path="/dashboard/procuration/clients" element={<ClientsMasterDataPage />} />
                <Route path="/dashboard/procuration/charts" element={<ProcurationChartsPage />} />
              </Route>

              {/* ✨ NUEVO - Módulo de Administración de Usuarios */}
              <Route element={<ModuleRoute moduleKey="usuarios" />}>
                <Route path="/dashboard/admin/users" element={<UsersAdminPage />} />
              </Route>
              
              {/* Módulo Clientes y Casos */}
              <Route element={<ModuleRoute moduleKey="clientes" />}>
                <Route path="/dashboard/clientes" element={<ClientListPage />} />
                <Route path="/dashboard/clientes/crear" element={<ClientCreationPage />} />
                <Route path="/dashboard/clientes/:id" element={<ClientDetailPage />} />
                <Route path="/dashboard/clientes/editar/:id" element={<EditClientPage />} />
                <Route path="/dashboard/casos/crear-solicitud" element={<CaseCreationPage />} />
                <Route path="/dashboard/casos/solicitudes" element={<CaseListPage />} />
                <Route path="/dashboard/casos/solicitud/:id" element={<CaseDetailPage />} />
                <Route path="/dashboard/casos/solicitud/editar/:id" element={<EditCasePage />} />
              </Route>

              {/* Módulo de Jurisprudencia */}
              <Route path="/dashboard/jurisprudencia" element={<JurisprudenceListPage />} />
              <Route path="/dashboard/jurisprudencia/panel" element={<JurisprudenceDashboardPage />} />
              <Route path="/dashboard/jurisprudencia/crear" element={<SentenceFormPage />} />
              <Route path="/dashboard/jurisprudencia/:id" element={<SentenceDetailPage />} />
              <Route path="/dashboard/jurisprudencia/:id/editar" element={<SentenceFormPage />} />

              {/* Fallback dentro del layout */}
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Route>
          </Route>

          {/* Redirect raíz al dashboard */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />

          {/* Fallback 404 */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
        </Suspense>
        </ErrorBoundary>
      </AntdApp>
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
