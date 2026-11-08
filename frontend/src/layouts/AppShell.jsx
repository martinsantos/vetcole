// Panel con barra lateral para Veterinario/a, Consultorio, Colegio y Municipio.
// items: [{ to, label, icon?, badge?, section? }]
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/store.js';
import { Av } from '../components/ui.jsx';
import { ini } from '../lib/format.js';

export default function AppShell({ items, dark, who, whoSub, accent, header }) {
  const logout = useAuth(s => s.logout), nav = useNavigate();
  return (
    <div className="shell">
      <aside className={`side ${dark ? 'dark' : ''}`} style={accent ? { '--shell-accent': accent } : undefined}>
        <div className="who">
          <Av style={accent ? { background: accent, color: '#fff' } : dark ? { background: '#fff', color: 'var(--plum-dd)' } : undefined}>{ini(who)}</Av>
          <div><b className="small" style={dark ? { color: '#fff' } : undefined}>{who}</b><div className="tiny" style={{ opacity: 0.7 }}>{whoSub}</div></div>
        </div>
        {header}
        {items.map((it, i) => it.section
          ? <div key={i} className="side-sec">{it.section}</div>
          : <NavLink key={it.to} to={it.to} end={it.end} className={({ isActive }) => `it ${isActive ? 'on' : ''}`}>{it.icon && <span className="ic">{it.icon}</span>}{it.label}{it.badge ? <span className="new">{it.badge}</span> : null}</NavLink>)}
        <div className="sep" style={{ borderTop: '1px solid var(--line)', margin: '12px 0', opacity: dark ? 0.2 : 1 }} />
        <NavLink to="/" className="it">↩ Sitio público</NavLink>
        <a href="/" className="it" onClick={e => { e.preventDefault(); logout(); nav('/'); }}>Salir</a>
      </aside>
      <div className="content"><Outlet /></div>
    </div>
  );
}
