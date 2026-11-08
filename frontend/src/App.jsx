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

export function RequireRole({ rol, children }) {
  const user = useAuth(s => s.user);
  if (!user) return <Navigate to={`/ingresar?rol=${rol}`} replace />;
  if (user.rol !== rol) return <Navigate to={`/ingresar?rol=${rol}&otro=1`} replace />;
  return children;
}

export default function App() {
  return (
    <>
      <DemoBar />
      <Routes>
        <Route path="/vet/*" element={<RequireRole rol="VET"><VetApp /></RequireRole>} />
        <Route path="/admin/*" element={<RequireRole rol="ADMIN"><AdminApp /></RequireRole>} />
        <Route path="/muni/*" element={<RequireRole rol="MUNICIPIO"><MuniApp /></RequireRole>} />
        <Route path="/tutor/*" element={<RequireRole rol="TUTOR"><TutorApp /></RequireRole>} />
        <Route path="/*" element={<PublicApp />} />
      </Routes>
      <Toasts />
    </>
  );
}
