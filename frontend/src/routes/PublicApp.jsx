// Sitio público del Colegio.
import { Route, Routes } from 'react-router-dom';
import SiteLayout from '../layouts/SiteLayout.jsx';
import Login from '../pages/Login.jsx';
import Home from '../pages/public/Home.jsx';
import Directorio from '../pages/public/Directorio.jsx';
import Libreta from '../pages/public/Libreta.jsx';
import Receta from '../pages/public/Receta.jsx';
import Datos from '../pages/public/Datos.jsx';
import Servicios from '../pages/public/Servicios.jsx';
import { VerificarVet, VerificarEst } from '../pages/public/Verificar.jsx';
import { Tramites, Inscripcion, Institucional, Noticias, Viajar, Mapa, Guardias, NotFound } from '../pages/public/Info.jsx';

export default function PublicApp() {
  return (
    <Routes>
      <Route element={<SiteLayout />}>
        <Route index element={<Home />} />
        <Route path="ingresar" element={<Login />} />
        <Route path="directorio" element={<Directorio />} />
        <Route path="mapa" element={<Mapa />} />
        <Route path="guardias" element={<Guardias />} />
        <Route path="libreta" element={<Libreta />} />
        <Route path="libreta/:q" element={<Libreta />} />
        <Route path="verificar" element={<VerificarVet />} />
        <Route path="verificar/e/:codigo" element={<VerificarEst />} />
        <Route path="verificar/:mp" element={<VerificarVet />} />
        <Route path="receta" element={<Receta />} />
        <Route path="receta/:codigo" element={<Receta />} />
        <Route path="tramites" element={<Tramites />} />
        <Route path="inscripcion" element={<Inscripcion />} />
        <Route path="institucional" element={<Institucional />} />
        <Route path="noticias" element={<Noticias />} />
        <Route path="viajar" element={<Viajar />} />
        <Route path="datos" element={<Datos />} />
        <Route path="servicios" element={<Servicios />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
