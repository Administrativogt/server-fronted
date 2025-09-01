// src/App.tsx
import React from 'react';
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

// Estilos de AG Grid (si los usas en otras vistas)
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';

// Páginas del módulo de cheques
import AutorizacionCheque from './pages/cheques/AutorizacionCheque';
import LiquidacionCheque from './pages/cheques/LiquidacionCheque';
import ChequesLiquidados from './pages/cheques/ChequesLiquidados';
import GastosInmobiliarios from './pages/cheques/GastosInmobiliarios';
import ChequesPendientes from './pages/cheques/ChequesPendientes';

// Páginas del módulo de reservaciones
import RoomReservation from './pages/reservaciones/RoomReservation';
import RoomReservationForm from './pages/reservaciones/RoomReservationForm';
import RoomReservationList from './pages/reservaciones/RoomReservationList';

// 📊 Reporte exclusivo (nuevo)
import ExclusiveMonthlyReport from './pages/reportes/ExclusiveMonthlyReport';

// 👇 Establece español como idioma global en dayjs
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

              {/* ⭐ Reporte mensual exclusivo (NUEVO) */}
              <Route
                path="/dashboard/reservaciones/reporte-exclusivo"
                element={<ExclusiveMonthlyReport />}
              />
            </Route>
          </Route>

          {/* Redirect raíz al dashboard */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />

          {/* Fallback 404 → dashboard (evita pantallas en blanco) */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </ConfigProvider>
  );
}

export default App;
