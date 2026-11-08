// Ingreso. En la demo ofrece las cuentas de prueba de cada rol (contraseña demo1234).
import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api, useApi } from '../lib/api.js';
import { useAuth, homeFor } from '../lib/store.js';
import { Field, AsyncBtn, Kicker } from '../components/ui.jsx';

export default function Login() {
  const [sp] = useSearchParams(), nav = useNavigate();
  const { data: cuentas } = useApi('/auth/demo-accounts');
  const wanted = sp.get('rol');
  const [email, setEmail] = useState(''), [password, setPassword] = useState('demo1234');
  const enter = async (e = email, p = password) => {
    const r = await api.post('/auth/login', { email: e, password: p });
    useAuth.getState().login(r.token, r.user);
    nav(homeFor(r.user.rol));
  };
  return (
    <section className="sec"><div className="wrap"><div className="grid g2" style={{ alignItems: 'start', gap: 40 }}>
      <div>
        <Kicker>Ingresar</Kicker>
        <h1 style={{ fontSize: 40, marginTop: 8 }}>Una sola plataforma, cada uno con su panel.</h1>
        <p className="muted">Profesionales, Colegio, municipios y familias usan la misma base: lo que firma un veterinario matriculado aparece en la libreta del animal, en el panel del municipio y en la app del tutor.</p>
        {sp.get('otro') && <div className="note">Esa sección es para otro rol. Elegí la cuenta correspondiente.</div>}
      </div>
      <div className="card login-card" style={{ padding: 24 }}>
        <div className="tiny muted mono" style={{ marginBottom: 10 }}>CUENTAS DE LA DEMO · UN CLIC</div>
        {(cuentas || []).map(c => (
          <button key={c.email} className="acct" style={wanted === c.rol ? { borderColor: 'var(--leaf)', background: 'var(--leaf-l)' } : undefined}
            onClick={() => enter(c.email, c.password).catch(err => alert(err.message))}>
            <span className="badge">{c.rol}</span><span><b className="small">{c.label}</b><div className="tiny muted">{c.detalle}</div></span>
          </button>
        ))}
        <hr className="s" />
        <form onSubmit={e => { e.preventDefault(); }}>
          <Field label="Email"><input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="usuario@..." /></Field>
          <Field label="Contraseña"><input type="password" value={password} onChange={e => setPassword(e.target.value)} /></Field>
          <AsyncBtn className="btn btn-primary btn-block" onClick={() => enter()}>Ingresar</AsyncBtn>
        </form>
      </div>
    </div></div></section>
  );
}
