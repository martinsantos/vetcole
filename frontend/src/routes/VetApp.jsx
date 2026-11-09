// Panel del veterinario/a: portal del Colegio + consultorio (gestión tipo MyVete) en una sola barra lateral.
import { Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import AppShell from '../layouts/AppShell.jsx';
import { useAuth } from '../lib/store.js';
import { useApi } from '../lib/api.js';
import * as P from '../pages/vet/index.jsx';
import * as C from '../pages/clinic/index.jsx';

function ClinicPicker() {
  const { data } = useApi('/clinic/contexto');
  const clinicId = useAuth(s => s.clinicId), setClinic = useAuth(s => s.setClinic), nav = useNavigate();
  if (!data || data.todos.length < 2) return data ? <div className="tiny muted" style={{ padding: '0 10px 6px' }}>{data.actual.nombre}</div> : null;
  return <select style={{ margin: '0 0 8px', fontSize: 13 }} value={clinicId || data.actual.id} onChange={e => { setClinic(Number(e.target.value)); nav('/vet/consultorio'); setTimeout(() => window.location.reload(), 50); }}>{data.todos.map(e => <option key={e.id} value={e.id}>{e.nombre}</option>)}</select>;
}

export default function VetApp() {
  const user = useAuth(s => s.user);
  // Tres espacios: la matrícula (Colegio), el consultorio (gestión diaria) y el perfil público.
  const { pathname } = useLocation();
  const espacio = pathname.startsWith('/vet/consultorio') || pathname.startsWith('/vet/establecimiento') ? 'consultorio' : pathname.startsWith('/vet/ficha') ? 'perfil' : 'matricula';
  const MENU = {
    matricula: [
      { section: 'Mi matrícula' },
      { to: '/vet', end: true, label: 'Hoy', icon: '◧' },
      { to: '/vet/credencial', label: 'Credencial', icon: '▣' },
      { to: '/vet/cuotas', label: 'Cuotas y pagos', icon: '$' },
      { to: '/vet/tramites', label: 'Trámites', icon: '⇄' },
      { to: '/vet/recetas', label: 'Recetas', icon: '℞' },
      { to: '/vet/casos', label: 'Notificar un caso', icon: '✚' },
    ],
    consultorio: [
      { section: 'Atención' },
      { to: '/vet/consultorio', end: true, label: 'Tablero del día', icon: '◷' },
      { to: '/vet/consultorio/agenda', label: 'Agenda', icon: '▦' },
      { to: '/vet/consultorio/pacientes', label: 'Pacientes', icon: '♥' },
      { to: '/vet/consultorio/clientes', label: 'Clientes', icon: '☻' },
      { to: '/vet/consultorio/mensajes', label: 'Mensajes', icon: '✉' },
      { to: '/vet/consultorio/recordatorios', label: 'Recordatorios', icon: '⏰' },
      { section: 'Ventas y stock' },
      { to: '/vet/consultorio/ventas', label: 'Ventas y facturación', icon: '⊞' },
      { to: '/vet/consultorio/caja', label: 'Caja', icon: '◎' },
      { to: '/vet/consultorio/inventario', label: 'Inventario', icon: '▤' },
      { to: '/vet/consultorio/proveedores', label: 'Proveedores', icon: '⇲' },
      { to: '/vet/consultorio/cuentas', label: 'Cuentas corrientes', icon: '±' },
      { to: '/vet/consultorio/reportes', label: 'Reportes', icon: '▥' },
      { section: 'Establecimiento' },
      { to: '/vet/establecimiento', label: 'Habilitación y cartel', icon: '⌂' },
    ],
    perfil: [
      { section: 'Mi perfil público' },
      { to: '/vet/ficha', label: 'Editar mi ficha', icon: '☺' },
      { to: `/profesional/${user.vet?.mp}`, label: 'Ver cómo me ven', icon: '↗' },
    ],
  };
  const items = MENU[espacio];
  const tabs = [
    { to: '/vet', label: 'Mi matrícula', sub: 'Credencial, cuotas y trámites', on: espacio === 'matricula' },
    { to: '/vet/consultorio', label: 'Mi consultorio', sub: 'Agenda, pacientes y ventas', on: espacio === 'consultorio' },
    { to: '/vet/ficha', label: 'Mi perfil público', sub: 'Lo que ve la comunidad', on: espacio === 'perfil' },
  ];
  return (
    <Routes>
      <Route element={<AppShell items={items} who={user.nombre} whoSub={`MP ${user.vet?.mp} · matrícula vigente`} header={espacio === 'consultorio' ? <ClinicPicker /> : null} tabs={tabs} />}>
        <Route index element={<P.VetHome />} />
        <Route path="credencial" element={<P.Credencial />} />
        <Route path="cuotas" element={<P.Cuotas />} />
        <Route path="tramites" element={<P.Tramites />} />
        <Route path="recetas" element={<P.Recetas />} />
        <Route path="establecimiento" element={<P.Establecimiento />} />
        <Route path="casos" element={<P.Casos />} />
        <Route path="ficha" element={<P.Ficha />} />
        <Route path="consultorio" element={<C.ClinicHome />} />
        <Route path="consultorio/agenda" element={<C.Agenda />} />
        <Route path="consultorio/pacientes" element={<C.Pacientes />} />
        <Route path="consultorio/pacientes/:id" element={<C.Paciente />} />
        <Route path="consultorio/clientes" element={<C.Clientes />} />
        <Route path="consultorio/clientes/:id" element={<C.Cliente />} />
        <Route path="consultorio/ventas" element={<C.Ventas />} />
        <Route path="consultorio/caja" element={<C.Caja />} />
        <Route path="consultorio/inventario" element={<C.Inventario />} />
        <Route path="consultorio/proveedores" element={<C.Proveedores />} />
        <Route path="consultorio/cuentas" element={<C.CuentasCorrientes />} />
        <Route path="consultorio/mensajes" element={<C.Mensajes />} />
        <Route path="consultorio/recordatorios" element={<C.Recordatorios />} />
        <Route path="consultorio/reportes" element={<C.Reportes />} />
      </Route>
    </Routes>
  );
}
