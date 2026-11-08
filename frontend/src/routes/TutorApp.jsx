// App del tutor/a: mobile-first, instalable (PWA). En escritorio se muestra como un teléfono centrado.
import { NavLink, Route, Routes } from 'react-router-dom';
import { useApi } from '../lib/api.js';
import * as T from '../pages/tutor/index.jsx';

function TabBar() {
  const { data } = useApi('/tutor/mensajes');
  const sinLeer = (data || []).reduce((s, h) => s + (h.mensajes.at(-1)?.desdeClinica ? 1 : 0), 0);
  const tabs = [['/tutor', 'Mascotas', '🐾', true], ['/tutor/turnos', 'Turnos', '📅'], ['/tutor/mensajes', `Mensajes${sinLeer ? ` (${sinLeer})` : ''}`, '✉'], ['/tutor/perfil', 'Perfil', '☺']];
  return <nav className="tabbar-app">{tabs.map(([to, l, ic, end]) => <NavLink key={to} to={to} end={end} className={({ isActive }) => (isActive ? 'on' : '')}><span className="ti">{ic}</span>{l}</NavLink>)}</nav>;
}

export default function TutorApp() {
  return (
    <div className="tutor-bg">
      <div className="phone-frame">
        <div className="tapp-top"><b>ColVet · Mis mascotas</b><span className="tiny mono" style={{ opacity: 0.7 }}>APP TUTOR/A</span></div>
        <Routes>
          <Route index element={<T.Mascotas />} />
          <Route path="mascotas/:id" element={<T.Mascota />} />
          <Route path="turnos" element={<T.Turnos />} />
          <Route path="mensajes" element={<T.Mensajes />} />
          <Route path="perfil" element={<T.Perfil />} />
        </Routes>
        <TabBar />
      </div>
    </div>
  );
}
