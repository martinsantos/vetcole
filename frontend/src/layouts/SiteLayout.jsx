// Layout del sitio público del Colegio: barra institucional, encabezado, navegación, pie y asistente.
import { useState } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { LOGO } from '../components/ui.jsx';
import { useAuth, homeFor } from '../lib/store.js';
import { BRAND } from '../lib/brand.js';
import Assistant from '../components/Assistant.jsx';

const NAV = [['/', 'Inicio'], ['/institucional', 'Institucional'], ['/tramites', 'Matrícula'], ['/directorio', 'Comunidad'], ['/guardias', 'Guardias'], ['/identidad-animal', 'Normativa'], ['/noticias', 'Noticias']];

export default function SiteLayout() {
  const [open, setOpen] = useState(false);
  const user = useAuth(s => s.user), nav = useNavigate();
  return (
    <div className="site-inst">
      <div className="infobar"><div className="wrap">
        {BRAND.demo ? <span>{BRAND.aviso}</span> : <><span>{BRAND.sede}</span><span>{BRAND.horario}</span><span>{BRAND.tel}</span></>}
        <span className="ib-right"><Link to="/verificar">Verificar matrícula</Link><Link to="/guardias">Guardias de hoy</Link></span>
      </div></div>
      <header className="top"><div className="wrap">
        <Link className="logo" to="/"><img src={LOGO} alt={BRAND.corto} /></Link>
        <nav className={`main ${open ? 'open' : ''}`} onClick={() => setOpen(false)}>
          {NAV.map(([to, l]) => <NavLink key={to} to={to} end={to === '/'} className={({ isActive }) => (isActive ? 'on' : '')}>{l}</NavLink>)}
        </nav>
        {user ? <button className="btn btn-primary cta-login" onClick={() => nav(homeFor(user.rol))}>Mi panel · {user.nombre.split(' ')[0]}</button>
          : <Link className="btn btn-primary cta-login" to="/ingresar">Acceso matriculados</Link>}
        <button className="btn burger" onClick={() => setOpen(o => !o)} aria-label="Menú">☰</button>
      </div></header>
      <main><Outlet /></main>
      <footer className="site"><div className="wrap">
        <div className="cols">
          <div>
            <div className="foot-logo"><img src={LOGO} alt="" /></div>
            <p className="foot-name">{BRAND.nombre}</p>
            <p>{BRAND.ley}</p>
            {!BRAND.demo && <p>{BRAND.sede}<br />{BRAND.horario}<br />{BRAND.tel} · {BRAND.mail}</p>}
          </div>
          <div><h4>El Colegio</h4><Link to="/institucional">Autoridades y gobierno</Link><Link to="/institucional">Legislación y Código de Ética</Link><Link to="/noticias">Noticias y agenda</Link><Link to="/datos">Datos abiertos</Link></div>
          <div><h4>Matriculados</h4><Link to="/ingresar">Acceso matriculados</Link><Link to="/inscripcion">Matricularme</Link><Link to="/tramites">Trámites</Link><Link to="/servicios">Servicios del Colegio</Link></div>
          <div><h4>Comunidad</h4><Link to="/directorio">Buscar veterinario/a</Link><Link to="/guardias">Guardias</Link><Link to="/verificar">Verificar matrícula</Link><Link to="/libreta">Libreta sanitaria</Link><Link to="/receta">Verificar receta</Link></div>
        </div>
        <div className="foot-legal"><span>{BRAND.aviso}</span><span>Plataforma: Última Milla</span></div>
      </div></footer>
      <Assistant />
    </div>
  );
}
