// Home del sitio público: búsqueda, perfiles, guardias y turnos, cómo se conectan los servicios, normativa, mapa y novedades.
import { useEffect, useMemo, useRef, useState } from 'react';
import { url } from '../../lib/base.js';
import { Link, useNavigate } from 'react-router-dom';
import { api, useApi } from '../../lib/api.js';
import Board from '../../components/Board.jsx';
import { norm, fdate } from '../../lib/format.js';
import { MapSection, UrgenciaModal, VetModal, EstModal, useTurno, useCached } from './shared.jsx';
import { TRAMITES } from './Info.jsx';
import { Conexiones, NormaCard } from './IdentidadAnimal.jsx';
import { NORMAS } from './normativa.js';

export function NewsCard({ n }) {
  return (
    <div className="card news-plain">
      <span className="small muted">{fdate(n.fecha)}</span>
      <h3>{n.titulo}</h3>
      <p className="muted small">{n.resumen}</p>
    </div>
  );
}

function Search({ onVet, onEst }) {
  const vets = useCached('/public/vets'), ests = useCached('/public/establecimientos');
  const [q, setQ] = useState(''), [open, setOpen] = useState(false);
  const box = useRef(null), nav = useNavigate();
  useEffect(() => { const k = e => { if (box.current && !box.current.contains(e.target)) setOpen(false); }; document.addEventListener('mousedown', k); return () => document.removeEventListener('mousedown', k); }, []);
  const n = norm(q.trim());
  const res = useMemo(() => n.length < 2 ? null : {
    v: (vets || []).filter(v => norm(`${v.nombre} ${v.mp} ${v.departamento} ${v.especialidades.join(' ')} ${v.especies.join(' ')}`).includes(n)).slice(0, 5),
    e: (ests || []).filter(e => norm(`${e.nombre} ${e.departamento} ${e.tipo} ${e.direccion} ${e.especies.join(' ')}`).includes(n)).slice(0, 5),
    t: TRAMITES.filter(t => norm(`${t.t} ${t.d}`).includes(n)).slice(0, 3),
  }, [n, vets, ests]);
  const empty = res && !res.v.length && !res.e.length && !res.t.length;
  return (
    <div className="search-xl" ref={box}>
      <span className="sx-ic">⌕</span>
      <input type="search" value={q} onChange={e => { setQ(e.target.value); setOpen(true); }} onFocus={() => setOpen(true)} autoComplete="off" placeholder="Probá: «exóticos», «Tunuyán», «equinos», «habilitación» o un N° de matrícula" />
      {open && res && (
        <div className="sresults">
          {!!res.v.length && <div className="grp">Profesionales</div>}
          {res.v.map(v => <a key={v.mp} href="#" onClick={e => { e.preventDefault(); setOpen(false); onVet(v); }}><div className="av" style={{ width: 34, height: 34, fontSize: 12 }}>{v.nombre.split(' ').map(w => w[0]).slice(0, 2).join('')}</div><div><b>{v.titulo}</b><div className="tiny muted">MP {v.mp} · {v.especialidades[0]} · {v.departamento}</div></div></a>)}
          {!!res.e.length && <div className="grp">Establecimientos</div>}
          {res.e.map(x => <a key={x.codigo} href="#" onClick={e => { e.preventDefault(); setOpen(false); onEst(x); }}><div className="av" style={{ width: 34, height: 34 }}>⌂</div><div><b>{x.nombre}</b><div className="tiny muted">{x.tipo} · {x.departamento}{x.guardia ? ` · guardia ${x.guardia}` : ''}</div></div></a>)}
          {!!res.t.length && <div className="grp">Trámites</div>}
          {res.t.map(t => <a key={t.k} href={url('/tramites')} onClick={e => { e.preventDefault(); nav('/tramites'); }}><div className="av" style={{ width: 34, height: 34 }}>⇄</div><div><b>{t.t}</b></div></a>)}
          {empty && <div className="empty">Sin resultados para «{q}»</div>}
        </div>
      )}
    </div>
  );
}

function HeroTurnos({ onPick }) {
  const { data } = useApi('/public/proximos-turnos');
  const lbl = p => { const d = new Date(p.inicio), tm = new Date(); tm.setDate(tm.getDate() + 1); return d.toDateString() === tm.toDateString() ? 'mañana' : d.toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric' }); };
  return (
    <aside className="hpanel">
      <div className="hph"><span><i className="live" />Próximos turnos libres</span></div>
      {(data || []).slice(0, 5).map(p => (
        <a key={p.codigo} href="#" className="hrow" onClick={e => { e.preventDefault(); onPick(p); }}>
          <span className="mono num tnum">{p.hora}</span>
          <span style={{ flex: 1, minWidth: 0 }}><b>{p.establecimiento}</b><span className="tiny muted" style={{ display: 'block' }}>{lbl(p)} · {p.departamento} · {p.especialidad}</span></span>
          <span className="arr">→</span>
        </a>
      ))}
      {!data && <div className="hrow tiny muted">Cargando agenda…</div>}
      <Link to="/directorio?turnos=1" className="hfoot"><span>Ver más turnos</span><span>→</span></Link>
    </aside>
  );
}

const QA = [
  ['/directorio', 'Buscar veterinario/a', 'Por especialidad, especie y zona.'],
  ['/verificar', 'Verificar matrícula', 'Por número o escaneando el QR.'],
  ['/identidad-animal', 'Identidad animal', 'Chip, libreta, credencial y normativa.'],
  ['/receta', 'Verificar receta', 'Para farmacias.'],
  ['/datos', 'Datos abiertos', 'Zoonosis por departamento.'],
  ['/tramites', 'Trámites y denuncias', 'Matrícula, habilitaciones, certificados.'],
];

const PERFILES = [
  ['Tengo una mascota', '/libreta'],
  ['Tengo caballos o animales de campo', '/libreta/EQ-000017'],
  ['Soy veterinario/a', '/servicios'],
  ['Trabajo en un municipio', '/servicios'],
];

export default function Home() {
  const { data: news } = useApi('/public/noticias?take=3');
  const [urg, setUrg] = useState(false), [vet, setVet] = useState(null), [est, setEst] = useState(null);
  const t = useTurno();
  return (
    <>
      <section className="hero"><div className="wrap hero-grid">
        <div>
          <h1>Veterinarios matriculados, guardias y turnos en Mendoza.</h1>
          <p className="lead">Y la libreta de tu animal en el celular.</p>
          <Search onVet={setVet} onEst={setEst} />
          <div className="chips">
            <button className="chip chip-urg" onClick={() => setUrg(true)}>Urgencia: guardia más cercana</button>
            <Link className="chip" to="/directorio?turnos=1">Pedir turno</Link>
            <Link className="chip" to="/libreta">Ver una libreta</Link>
          </div>
        </div>
        <HeroTurnos onPick={p => t.open(p.codigo, p.mp, p.inicio)} />
      </div></section>

      <section className="sec"><div className="wrap">
        <h2>¿Qué estás buscando?</h2>
        <div className="perfiles">{PERFILES.map(([ti, to]) => <Link key={ti} to={to} className="card perfil"><b>{ti}</b><span className="arr">→</span></Link>)}</div>
      </div></section>

      <section className="sec" style={{ paddingTop: 0 }}><div className="wrap">
        <div className="row between" style={{ marginBottom: 14 }}><h2 style={{ margin: 0 }}>Tablero de guardia</h2><Link className="btn btn-sm" to="/guardias">Ver todo</Link></div>
        <Board limit={6} />
      </div></section>

      <section className="sec band-soft"><div className="wrap">
        <div className="row between" style={{ marginBottom: 14 }}><h2 style={{ margin: 0 }}>Una credencial por animal</h2><Link className="btn btn-sm" to="/identidad-animal">Cómo funciona</Link></div>
        <Conexiones />
      </div></section>

      <section className="sec"><div className="wrap">
        <div className="row between" style={{ marginBottom: 14 }}><h2 style={{ margin: 0 }}>Normativa</h2><Link className="btn btn-sm" to="/identidad-animal">Ver todas</Link></div>
        <div className="grid g4 normas">{NORMAS.filter(n => ['rupac', 'luscyf', 'lsed', 'mordedura'].includes(n.k)).map(n => <NormaCard key={n.k} n={n} compact />)}</div>
      </div></section>

      <section className="sec" style={{ paddingTop: 0 }}><div className="wrap">
        <div className="row between" style={{ marginBottom: 14 }}><h2 style={{ margin: 0 }}>Mapa</h2><Link className="btn btn-sm" to="/mapa">Abrir mapa</Link></div>
        <MapSection home />
      </div></section>

      <section className="sec" style={{ paddingTop: 0 }}><div className="wrap">
        <h2>Servicios</h2>
        <div className="grid g3">{QA.map(([to, ti, d]) => (
          <Link key={to} className="card qa" to={to}><div className="qt"><b>{ti}</b><span className="muted small">{d}</span></div><span className="arr">→</span></Link>
        ))}</div>
      </div></section>

      <section className="sec" style={{ paddingTop: 0 }}><div className="wrap">
        <div className="row between" style={{ marginBottom: 14 }}><h2 style={{ margin: 0 }}>Novedades</h2><Link to="/noticias" className="btn btn-sm">Ver todas</Link></div>
        <div className="grid g3">{(news || []).map(n => <NewsCard key={n.id} n={n} />)}</div>
      </div></section>
      <UrgenciaModal open={urg} onClose={() => setUrg(false)} />
      <VetModal vet={vet} onClose={() => setVet(null)} onTurno={(c, mp) => { setVet(null); t.open(c, mp); }} />
      <EstModal est={est} onClose={() => setEst(null)} onTurno={c => { setEst(null); t.open(c); }} />
      {t.modal}
    </>
  );
}
