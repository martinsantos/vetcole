// Home del sitio público: búsqueda, perfiles, guardias y turnos, cómo se conectan los servicios, normativa, mapa y novedades.
import { useEffect, useMemo, useRef, useState } from 'react';
import { url } from '../../lib/base.js';
import { Link, useNavigate } from 'react-router-dom';
import { api, useApi } from '../../lib/api.js';
import { Badge, Kicker } from '../../components/ui.jsx';
import Board from '../../components/Board.jsx';
import { norm, fdate } from '../../lib/format.js';
import { MapSection, UrgenciaModal, VetModal, EstModal, useTurno, useCached } from './shared.jsx';
import { TRAMITES } from './Info.jsx';
import { Conexiones, NormaCard } from './IdentidadAnimal.jsx';
import { NORMAS } from './normativa.js';

export function NewsCard({ n }) {
  return (
    <div className="card news">
      <div className="img"><span className="mono tiny">{n.categoria.toUpperCase()}</span></div>
      <div className="bd"><div className="row" style={{ gap: 8, marginBottom: 6 }}><Badge>{n.categoria}</Badge><span className="tiny muted">{fdate(n.fecha)}</span></div><h3 style={{ fontSize: 17 }}>{n.titulo}</h3><p className="muted small" style={{ margin: 0 }}>{n.resumen}</p></div>
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
      <div className="hph"><span><i className="live" />Próximos turnos libres</span><span className="mono">ONLINE</span></div>
      {(data || []).slice(0, 5).map(p => (
        <a key={p.codigo} href="#" className="hrow" onClick={e => { e.preventDefault(); onPick(p); }}>
          <span className="mono num tnum">{p.hora}</span>
          <span style={{ flex: 1, minWidth: 0 }}><b>{p.establecimiento}</b><span className="tiny muted" style={{ display: 'block' }}>{lbl(p)} · {p.departamento} · {p.especialidad}</span></span>
          <span className="arr">→</span>
        </a>
      ))}
      {!data && <div className="hrow tiny muted">Cargando agenda…</div>}
      <Link to="/directorio?turnos=1" className="hfoot"><span>Ver todos los profesionales con turnos online</span><span>→</span></Link>
    </aside>
  );
}

const QA = [
  ['/directorio', '☺', 'Encontrá un veterinario/a', 'Por especialidad, especie y departamento. Sólo matrículas vigentes.'],
  ['/verificar', '✓', '¿Está matriculado/a?', 'Escaneá el QR de la credencial o del establecimiento, o buscá por matrícula.'],
  ['/identidad-animal', '◉', 'Identidad animal', 'Chip, libreta y credencial: cómo funcionan y qué dice la normativa.'],
  ['/receta', '℞', 'Farmacias: verificar receta', 'Escaneá el QR de una receta veterinaria y registrá la dispensa.'],
  ['/datos', '▥', 'Datos abiertos', 'Panel de zoonosis por departamento y API pública.'],
  ['/tramites', '⇄', 'Trámites y denuncias', 'Matriculación, habilitaciones, certificados y denuncias de ejercicio ilegal.'],
];

const PERFILES = [
  ['Tengo una mascota', 'Turnos, guardias y la libreta de tu animal en el celular.', '/libreta'],
  ['Tengo caballos o animales de campo', 'Libreta equina digital, visitas a campo y certificados.', '/libreta/EQ-000017'],
  ['Soy veterinario/a', 'Matrícula, credencial y la gestión completa de tu consultorio.', '/servicios'],
  ['Trabajo en un municipio', 'Zoonosis: credencial municipal, campañas y mordeduras.', '/servicios'],
];

export default function Home() {
  const { data: stats } = useApi('/public/stats');
  const { data: news } = useApi('/public/noticias?take=3');
  const [urg, setUrg] = useState(false), [vet, setVet] = useState(null), [est, setEst] = useState(null);
  const t = useTurno();
  return (
    <>
      <section className="hero"><div className="wrap hero-grid">
        <div>
          <Kicker style={{ color: '#9fd8c4' }}>Salud animal · Mendoza</Kicker>
          <h1>Cada animal, cuidado por un/a veterinario/a matriculado/a.</h1>
          <p className="lead">Encontrá quién atiende cerca y quién está de guardia ahora. Sacá un turno y llevá la libreta de tu animal en el celular, con cada vacuna firmada por un profesional del Colegio.</p>
          <Search onVet={setVet} onEst={setEst} />
          <div className="chips">
            <button className="chip chip-urg" onClick={() => setUrg(true)}>! Urgencia: guardia más cercana</button>
            <Link className="chip" to="/directorio?turnos=1">▦ Pedir turno</Link>
            <Link className="chip" to="/libreta">✚ Ver una libreta</Link>
            <Link className="chip" to="/verificar">✓ Verificar matrícula</Link>
          </div>
        </div>
        <HeroTurnos onPick={p => t.open(p.codigo, p.mp, p.inicio)} />
      </div></section>

      <section className="sec perfiles-sec"><div className="wrap">
        <div className="shead"><div><Kicker>Por dónde empezar</Kicker><h2>¿Qué estás buscando?</h2></div></div>
        <div className="perfiles">{PERFILES.map(([ti, d, to], i) => (
          <Link key={ti} to={to} className="card perfil"><span className="mono tiny muted">{String(i + 1).padStart(2, '0')}</span><div><b>{ti}</b><span className="small muted">{d}</span></div><span className="arr">→</span></Link>
        ))}</div>
      </div></section>

      <section className="sec" style={{ paddingTop: 12 }}><div className="wrap">
        <div className="shead"><div><Kicker>Ahora</Kicker><h2>Tablero de guardia</h2><p className="muted">Quién atiende urgencias en este momento, por zona. Cada clínica lo actualiza desde su portal.</p></div><Link className="btn" to="/guardias">Ver tablero completo →</Link></div>
        <Board limit={6} />
      </div></section>

      <section className="sec band-soft"><div className="wrap">
        <div className="shead"><div><Kicker>Cómo se conecta todo</Kicker><h2>Lo que firma tu veterinario/a llega a todos los que lo necesitan</h2><p className="muted">El consultorio y la zoonosis municipal registran. La libreta del animal guarda. La familia, el municipio y las farmacias consultan, cada uno con sus permisos.</p></div><Link className="btn" to="/identidad-animal">Identidad animal →</Link></div>
        <Conexiones />
      </div></section>

      <section className="sec"><div className="wrap">
        <div className="shead"><div><Kicker>Credencial del animal · normativa</Kicker><h2>Lo que exigen hoy las normas y lo que se está discutiendo</h2><p className="muted">La plataforma ya cumple con lo vigente, y el chip, la firma y las mordeduras quedan registrados para el registro provincial si se aprueba.</p></div><Link className="btn" to="/identidad-animal">Ver todo →</Link></div>
        <div className="grid g4 normas">{NORMAS.filter(n => ['rupac', 'luscyf', 'lsed', 'mordedura'].includes(n.k)).map(n => <NormaCard key={n.k} n={n} compact />)}</div>
      </div></section>

      <section className="sec" style={{ paddingTop: 12 }}><div className="wrap">
        <div className="shead"><div><Kicker>Mapa</Kicker><h2>Establecimientos y turnos cerca tuyo</h2><p className="muted">Clínicas, consultorios, agroveterinarias y guardias habilitadas. Donde dice «Próximo turno», lo reservás en un clic.</p></div><Link className="btn" to="/mapa">Abrir mapa completo →</Link></div>
        <MapSection home />
      </div></section>

      <section className="sec" style={{ paddingTop: 12 }}><div className="wrap">
        <div className="shead"><div><Kicker>Servicios</Kicker><h2>Todo lo demás, a un clic</h2></div></div>
        <div className="grid g3">{QA.map(([to, ic, ti, d], i) => (
          <Link key={to} className="card qa" to={to}><span className="idx">{String(i + 1).padStart(2, '0')}</span><div className="ic">{ic}</div><div className="qt"><b>{ti}</b><span className="muted small">{d}</span></div><span className="arr">→</span></Link>
        ))}</div>
      </div></section>
      {stats && <div className="wrap"><div className="stats">
        <div><b>{stats.padronPublicado}</b><span className="muted small">profesionales habilitados en el padrón publicado</span></div>
        <div><b>{stats.guardias}</b><span className="muted small">guardias informadas al Colegio</span></div>
        <div><b>{stats.establecimientos}</b><span className="muted small">establecimientos en el mapa de la demo</span></div>
        <div><b>{stats.departamentos}</b><span className="muted small">departamentos con cobertura</span></div>
      </div></div>}
      <section className="sec"><div className="wrap">
        <div className="row between" style={{ marginBottom: 14 }}><h2 style={{ margin: 0 }}>Novedades</h2><Link to="/noticias" className="btn btn-sm">Ver todas</Link></div>
        <div className="grid g3">{(news || []).map(n => <NewsCard key={n.id} n={n} />)}</div>
      </div></section>
      <section className="sec" style={{ paddingTop: 0 }}><div className="wrap">
        <div className="card row between" style={{ padding: 24 }}>
          <div style={{ maxWidth: 640 }}><Kicker>Para matriculados</Kicker><h2 style={{ marginTop: 6 }}>Tu matrícula y tu consultorio, en un solo lugar.</h2>
            <p className="muted" style={{ margin: 0 }}>Credencial digital con QR, cuotas, trámites, recetas, libretas sanitarias y, si querés, la gestión completa del consultorio: agenda, historia clínica, ventas, stock y caja.</p></div>
          <div className="row"><Link className="btn btn-primary" to="/ingresar">Ingresar</Link><Link className="btn" to="/servicios">Ver servicios</Link></div>
        </div>
      </div></section>
      <UrgenciaModal open={urg} onClose={() => setUrg(false)} />
      <VetModal vet={vet} onClose={() => setVet(null)} onTurno={(c, mp) => { setVet(null); t.open(c, mp); }} />
      <EstModal est={est} onClose={() => setEst(null)} onTurno={c => { setEst(null); t.open(c); }} />
      {t.modal}
    </>
  );
}
