// Barra superior de la demo: cambia de aplicación/rol en un clic (inicia sesión con la cuenta demo correspondiente).
import { useLocation, useNavigate } from 'react-router-dom';
import { url } from '../lib/base.js';
import { api } from '../lib/api.js';
import { useAuth, homeFor } from '../lib/store.js';
import { toast } from '../components/ui.jsx';

const APPS = [
  ['pub', 'Sitio público', '/', null],
  ['vet', 'Veterinario/a', '/vet', 'lucia.ferreyra@demo.colvet'],
  ['clinic', 'Consultorio', '/vet/consultorio', 'lucia.ferreyra@demo.colvet'],
  ['admin', 'Colegio', '/admin', 'admin@demo.colvet'],
  ['muni', 'Municipio', '/muni', 'zoonosis@godoycruz.demo'],
  ['tutor', 'App tutor/a', '/tutor', 'sofia.rios@demo.colvet'],
];

export async function loginAs(email, navigate, to) {
  const r = await api.post('/auth/login', { email, password: 'demo1234' });
  useAuth.getState().login(r.token, r.user);
  navigate(to || homeFor(r.user.rol));
}

export default function DemoBar() {
  const nav = useNavigate(), { pathname } = useLocation();
  const user = useAuth(s => s.user);
  const cur = pathname.startsWith('/vet/consultorio') ? 'clinic' : pathname.startsWith('/vet') ? 'vet' : pathname.startsWith('/admin') ? 'admin' : pathname.startsWith('/muni') ? 'muni' : pathname.startsWith('/tutor') ? 'tutor' : 'pub';
  const go = async ([, , to, email]) => {
    if (!email || user?.email === email) return nav(to);
    try { await loginAs(email, nav, to); } catch (e) { toast(e.message, 'error'); }
  };
  return (
    <div className="demobar">
      <div className="wrap">
        <span className="tag">DEMO</span>
        <span className="desc"><b>ColVet Digital</b> · Colegio + consultorio + zoonosis municipal</span>
        <nav>{APPS.map(a => <a key={a[0]} href={url(a[2])} className={cur === a[0] ? 'on' : ''} onClick={e => { e.preventDefault(); go(a); }}>{a[1]}</a>)}</nav>
      </div>
    </div>
  );
}
