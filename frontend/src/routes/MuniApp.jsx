// App del municipio: zoonosis digital como servicio (estilo VetCard), con la identidad de cada municipio.
import { Route, Routes } from 'react-router-dom';
import AppShell from '../layouts/AppShell.jsx';
import { useAuth } from '../lib/store.js';
import { useApi } from '../lib/api.js';
import * as M from '../pages/muni/index.jsx';

export default function MuniApp() {
  const user = useAuth(s => s.user);
  const { data: cfg, reload } = useApi('/muni/config');
  const muni = cfg || user.municipio || {};
  const items = [
    { section: muni.nombreCredencial || 'Zoonosis' },
    { to: '/muni', end: true, label: 'Panel', icon: '◧' },
    { to: '/muni/credenciales', label: 'Credenciales', icon: '▣' },
    { to: '/muni/campanias', label: 'Campañas', icon: '⚑' },
    { to: '/muni/mordeduras', label: 'Mordeduras', icon: '!' },
    { to: '/muni/peligrosos', label: 'Perros potencialmente peligrosos', icon: '⚠' },
    { section: 'Servicio' },
    { to: '/muni/configuracion', label: 'Identidad de la credencial', icon: '✎' },
  ];
  return (
    <Routes>
      <Route element={<AppShell items={items} accent={muni.color} who={`Zoonosis ${muni.nombre || ''}`} whoSub={`Municipio · ${muni.sigla || ''}`} />}>
        <Route index element={<M.Panel />} />
        <Route path="credenciales" element={<M.Credenciales />} />
        <Route path="animales/:id" element={<M.Animal />} />
        <Route path="campanias" element={<M.Campanias />} />
        <Route path="campanias/:id" element={<M.Operativo />} />
        <Route path="mordeduras" element={<M.Mordeduras />} />
        <Route path="peligrosos" element={<M.Peligrosos />} />
        <Route path="configuracion" element={<M.Config onSaved={reload} />} />
      </Route>
    </Routes>
  );
}
