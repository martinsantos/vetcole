// App de inspecciones del Colegio (rol INSPECTOR). La administración del Colegio también entra desde su menú.
import { Route, Routes } from 'react-router-dom';
import AppShell from '../layouts/AppShell.jsx';
import { useAuth } from '../lib/store.js';
import * as I from '../pages/inspeccion/index.jsx';

export default function InspeccionApp() {
  const user = useAuth(s => s.user);
  const colegio = user.rol === 'ADMIN';
  const items = [
    ...(colegio ? [{ section: 'Colegio' }, { to: '/admin/tablero', label: 'Volver al Colegio', icon: '←' }] : []),
    { section: 'Inspecciones' },
    { to: '/inspeccion', end: true, label: 'Agenda', icon: '◷' },
    { to: '/inspeccion/establecimientos', label: 'Acreditación', icon: '⌂' },
    { to: '/inspeccion/actas', label: 'Actas', icon: '☰' },
  ];
  return (
    <Routes>
      <Route element={<AppShell items={items} who={colegio ? 'Inspecciones' : user.nombre} whoSub={colegio ? 'Administración del Colegio' : 'Inspector/a del Colegio'} />}>
        <Route index element={<I.Agenda />} />
        <Route path="establecimientos" element={<I.Establecimientos />} />
        <Route path="actas" element={<I.Historial />} />
        <Route path=":id" element={<I.Formulario />} />
      </Route>
    </Routes>
  );
}
