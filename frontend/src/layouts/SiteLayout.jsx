// Layout del sitio público del Colegio: encabezado, navegación, pie y asistente flotante.
import { useState } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { LOGO } from '../components/ui.jsx';
import { useAuth, homeFor } from '../lib/store.js';
import Assistant from '../components/Assistant.jsx';

const NAV = [['/', 'Inicio'], ['/directorio', 'Directorio'], ['/mapa', 'Mapa'], ['/guardias', 'Guardias'], ['/libreta', 'Libreta digital'], ['/tramites', 'Trámites'], ['/institucional', 'Institucional']];

export default function SiteLayout() {
  const [open, setOpen] = useState(false);
  const user = useAuth(s => s.user), nav = useNavigate();
  return (
    <>
      <div className="infobar"><div className="wrap">
        <span>Pte. Santiago Derqui 114, Godoy Cruz</span><span>☎ 0261 4243250</span><span>info@colvetmza.com.ar</span>
        <span style={{ marginLeft: 'auto' }}>Ley provincial N° 7825 · Decreto 1958/11</span>
      </div></div>
      <header className="top"><div className="wrap">
        <Link className="logo" to="/"><img src={LOGO} alt="Colegio de Veterinarios de Mendoza" /></Link>
        <nav className={`main ${open ? 'open' : ''}`} onClick={() => setOpen(false)}>
          {NAV.map(([to, l]) => <NavLink key={to} to={to} end={to === '/'} className={({ isActive }) => (isActive ? 'on' : '')}>{l}</NavLink>)}
        </nav>
        {user ? <button className="btn btn-primary cta-login" onClick={() => nav(homeFor(user.rol))}>Mi panel · {user.nombre.split(' ')[0]}</button>
          : <Link className="btn btn-primary cta-login" to="/ingresar">Ingresar</Link>}
        <button className="btn burger" onClick={() => setOpen(o => !o)} aria-label="Menú">☰</button>
      </div></header>
      <main><Outlet /></main>
      <footer className="site"><div className="wrap">
        <div className="cols">
          <div>
            <div style={{ background: '#fff', borderRadius: 10, padding: '8px 12px', display: 'inline-block', marginBottom: 12 }}><img src={LOGO} style={{ height: 34, display: 'block' }} alt="" /></div>
            <p>El Colegio de Médicos Veterinarios de Mendoza regula la actividad veterinaria en la provincia: matricula a quienes ejercen, aplica el Código de Ética y contribuye a la salud de la comunidad.</p>
          </div>
          <div><h4>Comunidad</h4><Link to="/directorio">Buscar veterinario/a</Link><br /><Link to="/guardias">Tablero de guardia</Link><br /><Link to="/libreta">Libreta sanitaria</Link><br /><Link to="/verificar">Verificar matrícula</Link><br /><Link to="/receta">Verificar receta</Link><br /><Link to="/viajar">Viajar con mascotas</Link></div>
          <div><h4>Profesionales</h4><Link to="/ingresar">Ingresar</Link><br /><Link to="/inscripcion">Matricularme</Link><br /><Link to="/tramites">Trámites</Link><br /><Link to="/datos">Datos abiertos</Link></div>
          <div><h4>Servicios</h4><Link to="/servicios">Consultorio digital para veterinarias</Link><br /><Link to="/servicios">Zoonosis para municipios</Link><br /><Link to="/institucional">Institucional</Link><br /><Link to="/noticias">Noticias</Link></div>
        </div>
        <hr style={{ border: 0, borderTop: '1px solid rgba(255,255,255,.12)', margin: '24px 0 14px' }} />
        <div className="row between tiny"><span>Demo con datos de ejemplo. Guardias tomadas del listado público actual; profesionales, tutores y municipios en servicio son ficticios.</span><span>ColVet Digital · Última Milla · código abierto</span></div>
      </div></footer>
      <Assistant />
    </>
  );
}
