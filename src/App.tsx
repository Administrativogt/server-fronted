import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Login from './pages/Login';
import PrivateRoute from './routes/PrivateRoute';
import DashboardLayout from './pages/DashboardLayout';
import DashboardPage from './pages/DashboardPage';

// Páginas del módulo de cheques
import AutorizacionCheque from './pages/cheques/AutorizacionCheque';
import LiquidacionCheque from './pages/cheques/LiquidacionCheque';
import ChequesLiquidados from './pages/cheques/ChequesLiquidados';
import GastosInmobiliarios from './pages/cheques/GastosInmobiliarios';
import ChequesPendientes from './pages/cheques/ChequesPendientes';
import RoomReservation from './pages/reservaciones/RoomReservation';
import RoomReservationForm from './pages/reservaciones/RoomReservationForm';

// paginas del módulo de reservaciones

import RoomReservationList from './pages/reservaciones/RoomReservationList';




function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Ruta pública de login */}
        <Route path="/login" element={<Login />} />

        {/* Rutas privadas (requieren autenticación) */}
        <Route element={<PrivateRoute />}>
          <Route element={<DashboardLayout />}>
            {/* Ruta principal del dashboard */}
            <Route path="/dashboard" element={<DashboardPage />} />

            {/* Rutas de gestión de cheques */}
            <Route path="/dashboard/cheques/autorizacion" element={<AutorizacionCheque />} />
            <Route path="/dashboard/cheques/liquidacion" element={<LiquidacionCheque />} />
            <Route path="/dashboard/cheques/liquidados" element={<ChequesLiquidados />} />
            <Route path="/dashboard/cheques/inmobiliario" element={<GastosInmobiliarios />} />
            <Route path="/dashboard/cheques/pendientes" element={<ChequesPendientes />} />
            <Route path="/dashboard/reservaciones" element={<RoomReservation />} />
            <Route path="/dashboard/reservaciones/crear" element={<RoomReservationForm />} />
            <Route path="/dashboard/reservaciones/listar" element={<RoomReservationList />} />



          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
