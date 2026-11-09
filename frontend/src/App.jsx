// Rutas por aplicación. Cada área tiene su propio <Routes> anidado en src/routes/.
import { Route, Routes, Navigate } from 'react-router-dom';
import DemoBar from './layouts/DemoBar.jsx';
import { Toasts } from './components/ui.jsx';
import { useAuth } from './lib/store.js';
import PublicApp from './routes/PublicApp.jsx';
import VetApp from './routes/VetApp.jsx';
import AdminApp from './routes/AdminApp.jsx';
import MuniApp from './routes/MuniApp.jsx';
import TutorApp from './routes/TutorApp.jsx';
import InspeccionApp from './routes/InspeccionApp.jsx';

export function RequireRole({ rol, children }) {
  const user = useAuth(s => s.user);
  const roles = [].concat(rol);
  if (!user) return <Navigate to={`/ingresar?rol=${roles[0]}`} replace />;
  if (!roles.includes(user.rol)) return <Navigate to={`/ingresar?rol=${roles[0]}&otro=1`} replace />;
  return children;
}

// Zoonosis municipal: la usa el municipio o el Colegio, que elige qué municipio operar desde su administración.
function MuniRoute() {
  const user = useAuth(s => s.user), muniId = useAuth(s => s.muniId);
  if (user?.rol === 'ADMIN' && !muniId) return <Navigate to="/admin/municipios" replace />;
  return <MuniApp key={muniId || 'propio'} />;
}

export default function App() {
  return (
    <>
      <DemoBar />
      <Routes>
        <Route path="/vet/*" element={<RequireRole rol="VET"><VetApp /></RequireRole>} />
        <Route path="/admin/*" element={<RequireRole rol="ADMIN"><AdminApp /></RequireRole>} />
        <Route path="/muni/*" element={<RequireRole rol={['MUNICIPIO', 'ADMIN']}><MuniRoute /></RequireRole>} />
        <Route path="/inspeccion/*" element={<RequireRole rol={['INSPECTOR', 'ADMIN']}><InspeccionApp /></RequireRole>} />
        <Route path="/tutor/*" element={<RequireRole rol="TUTOR"><TutorApp /></RequireRole>} />
        <Route path="/*" element={<PublicApp />} />
      </Routes>
      <Toasts />
    </>
  );
}
