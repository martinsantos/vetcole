// Administración del Colegio (Mesa de Entradas).
import { Navigate, Route, Routes } from 'react-router-dom';
import AppShell from '../layouts/AppShell.jsx';
import { useAuth } from '../lib/store.js';
import * as A from '../pages/admin/index.jsx';

const items = [
  { section: 'Colegio' },
  { to: '/admin/tablero', label: 'Tablero', icon: '◧' },
  { to: '/admin/matriculados', label: 'Matriculados (ABM)', icon: '☻' },
  { to: '/admin/inscripciones', label: 'Inscripciones', icon: '⇥' },
  { to: '/admin/cobranzas', label: 'Cobranzas', icon: '$' },
  { to: '/admin/asamblea', label: 'Asamblea', icon: '☷' },
  { to: '/admin/comunicaciones', label: 'Comunicaciones', icon: '✉' },
  { section: 'Control y salud pública' },
  { to: '/admin/establecimientos', label: 'Establecimientos', icon: '⌂' },
  { to: '/admin/guardias', label: 'Guardias', icon: '◷' },
  { to: '/admin/denuncias', label: 'Denuncias', icon: '⚑' },
  { to: '/admin/salud', label: 'Salud pública', icon: '✚' },
  { section: 'Servicios' },
  { to: '/admin/municipios', label: 'Municipios (zoonosis)', icon: '⌘', badge: 'SaaS' },
];

export default function AdminApp() {
  const user = useAuth(s => s.user);
  return (
    <Routes>
      <Route element={<AppShell dark items={items} who={user.nombre} whoSub="Administración del Colegio" />}>
        <Route index element={<Navigate to="tablero" replace />} />
        <Route path="tablero" element={<A.Tablero />} />
        <Route path="matriculados" element={<A.Matriculados />} />
        <Route path="inscripciones" element={<A.Inscripciones />} />
        <Route path="cobranzas" element={<A.Cobranzas />} />
        <Route path="asamblea" element={<A.AsambleaAdmin />} />
        <Route path="comunicaciones" element={<A.Comunicaciones />} />
        <Route path="establecimientos" element={<A.Establecimientos />} />
        <Route path="guardias" element={<A.Guardias />} />
        <Route path="denuncias" element={<A.Denuncias />} />
        <Route path="salud" element={<A.Salud />} />
        <Route path="municipios" element={<A.Municipios />} />
      </Route>
    </Routes>
  );
}
