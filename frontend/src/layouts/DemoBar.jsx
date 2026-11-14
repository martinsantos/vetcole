// Barra superior de la demo: cambia de aplicación/rol en un clic (inicia sesión con la cuenta demo correspondiente).
import { useLocation, useNavigate } from 'react-router-dom';
import { flushSync } from 'react-dom';
import { useLayoutEffect, useRef } from 'react';
import { url, CLAUDE } from '../lib/base.js';
import { api } from '../lib/api.js';
import { useAuth, homeFor } from '../lib/store.js';
import { toast } from '../components/ui.jsx';

const APPS = [
  ['pub', 'Sitio público', '/', null],
  ['vet', 'Veterinario/a', '/vet', 'lucia.ferreyra@demo.colvet'],
  ['admin', 'Colegio', '/admin', 'admin@demo.colvet'],
  ['insp', 'Inspector/a', '/inspeccion', 'inspeccion@demo.colvet'],
  ['muni', 'Zoonosis', '/muni', 'zoonosis@godoycruz.demo'],
  ['tutor', 'App tutor/a', '/tutor', 'sofia.rios@demo.colvet'],
];

export async function loginAs(email, navigate, to) {
  const r = await api.post('/auth/login', { email, password: 'demo1234' });
  // Cambiar sesión y ruta en el mismo render evita que el panel anterior
  // redirija al ingreso al ver un rol que ya no le corresponde.
  flushSync(() => {
    useAuth.getState().login(r.token, r.user);
    navigate(to || homeFor(r.user.rol));
  });
}

export default function DemoBar() {
  const nav = useNavigate(), { pathname } = useLocation();
  const user = useAuth(s => s.user);
  const bar = useRef(null);
  useLayoutEffect(() => {
    const update = () => document.documentElement.style.setProperty('--demo-bar-height', `${bar.current.getBoundingClientRect().height}px`);
    const observer = new ResizeObserver(update);
    observer.observe(bar.current);
    update();
    return () => observer.disconnect();
  }, []);
  if (CLAUDE) window.__colvetNav = nav; // pruebas automáticas: navegar en el router en memoria
  const cur = pathname.startsWith('/vet') ? 'vet' : pathname.startsWith('/inspeccion') ? (user?.rol === 'ADMIN' ? 'admin' : 'insp') : pathname.startsWith('/admin') || (pathname.startsWith('/muni') && user?.rol === 'ADMIN') ? 'admin' : pathname.startsWith('/tutor') ? 'tutor' : pathname.startsWith('/muni') ? 'muni' : 'pub';
  const go = async ([, , to, email]) => {
    if (!email || user?.email === email) return nav(to);
    try { await loginAs(email, nav, to); } catch (e) { toast(e.message, 'error'); }
  };
  return (
    <div className="demobar" ref={bar}>
      <div className="wrap">
        <span className="tag">DEMO</span>
        <span className="desc"><b>ColVet Digital</b> · acceso directo sin contraseña · datos ficticios</span>
        <nav aria-label="Accesos directos a los roles de la demo">{APPS.map(a => <a key={a[0]} href={url(a[2])} rel="nofollow" className={cur === a[0] ? 'on' : ''} onClick={e => { e.preventDefault(); go(a); }}>{a[1]}</a>)}
          {CLAUDE && <a href="#" title="Vuelve los datos de la demo al estado inicial" onClick={async e => { e.preventDefault(); const { resetDemo } = await import('../demo/server.js'); await resetDemo(); useAuth.getState().logout(); nav('/'); toast('Datos de la demo reiniciados'); }}>↺ Reiniciar datos</a>}
        </nav>
      </div>
    </div>
  );
}
