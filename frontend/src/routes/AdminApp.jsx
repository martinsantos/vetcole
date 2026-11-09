// Administración del Colegio (Mesa de Entradas).
import { useEffect, useState } from 'react';
import { Navigate, Route, Routes, useParams } from 'react-router-dom';
import { useApi } from '../lib/api.js';
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
  { section: 'Municipios · zoonosis' },
  { to: '/admin/municipios', end: true, label: 'Municipios adheridos', icon: '⌘', badge: 'SaaS' },
];

// Abre el panel de zoonosis de un municipio operado por el Colegio.
function AbrirMunicipio() {
  const { id } = useParams();
  const [listo, setListo] = useState(false);
  useEffect(() => { useAuth.getState().setMuni(Number(id)); setListo(true); }, [id]);
  return listo ? <Navigate to="/muni" replace /> : null;
}

export default function AdminApp() {
  const user = useAuth(s => s.user);
  const { data: munis } = useApi('/admin/municipios');
  const menu = [...items, ...(munis || []).map(m => ({ to: `/admin/municipios/${m.id}/abrir`, label: `Zoonosis ${m.nombre}`, icon: '→' }))];
  return (
    <Routes>
      <Route element={<AppShell dark items={menu} who={user.nombre} whoSub="Administración del Colegio" />}>
        <Route index element={<Navigate to="tablero" replace />} />
        <Route path="tablero" element={<A.Tablero />} />
        <Route path="municipios/:id/abrir" element={<AbrirMunicipio />} />
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
