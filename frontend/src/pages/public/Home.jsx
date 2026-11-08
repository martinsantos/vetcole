// Home del sitio público: búsqueda universal, próximos turnos, urgencia, mapa, tablero, libreta, servicios y novedades.
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, useApi } from '../../lib/api.js';
import { Badge, Kicker } from '../../components/ui.jsx';
import Board from '../../components/Board.jsx';
import { norm, fdate, edad, chipFmt, estadoCls, EVT } from '../../lib/format.js';
import { MapSection, UrgenciaModal, VetModal, EstModal, useTurno, useCached } from './shared.jsx';
import { TRAMITES } from './Info.jsx';

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
          {res.t.map(t => <a key={t.k} href="/tramites" onClick={e => { e.preventDefault(); nav('/tramites'); }}><div className="av" style={{ width: 34, height: 34 }}>⇄</div><div><b>{t.t}</b></div></a>)}
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

function LibretaBand() {
  const nav = useNavigate();
  const { data: p } = useApi('/public/libretas/MZA-000231');
  const [q, setQ] = useState('');
  return (
    <section className="libband"><div className="wrap libgrid">
      <div>
        <Kicker style={{ color: 'var(--leaf-2)' }}>03 · Libreta sanitaria digital</Kicker>
        <h2 style={{ marginTop: 10 }}>La libreta de tu mascota, firmada por su veterinario/a matriculado/a.</h2>
        <p>Vacunas, desparasitaciones, castración y microchip en el celular. Cada registro lo firma un profesional del padrón del Colegio y se verifica con QR. Convive con la LUSCyF en papel.</p>
        <form className="libform" onSubmit={e => { e.preventDefault(); if (q.trim()) nav(`/libreta/${encodeURIComponent(q.trim())}`); }}>
          <input type="search" value={q} onChange={e => setQ(e.target.value)} placeholder="N° de libreta o microchip (ej.: MZA-000231)" /><button className="btn btn-light">Consultar</button>
        </form>
        <div className="row" style={{ marginTop: 14 }}><Link className="btn btn-light btn-sm" to="/libreta">Cómo funciona</Link><Link className="btn btn-light btn-sm" to="/servicios">Soy veterinario/a: emitir libretas</Link></div>
      </div>
      {p && (
        <Link to={`/libreta/${p.libreta}`} className="libprev">
          <div className="row between"><span className="mono tiny muted">LIBRETA {p.libreta}</span><Badge cls={estadoCls(p.estado.codigo)}>{p.estado.etiqueta}</Badge></div>
          <div className="row" style={{ margin: '14px 0', gap: 12, flexWrap: 'nowrap' }}><div className="petav">{p.nombre[0]}</div><div><b style={{ fontSize: 22, fontFamily: 'var(--serif)' }}>{p.nombre}</b><div className="small muted">{p.raza} · {edad(p.nacimiento)}{p.microchip ? ` · chip ${chipFmt(p.microchip).slice(0, 7)}…` : ''}</div></div></div>
          {p.eventos.filter(e => ['vac', 'des', 'cas'].includes(e.tipo)).slice(0, 4).map(e => <div key={e.id} className="lprow"><span className="evk sm" style={{ background: EVT[e.tipo][2] }}>{EVT[e.tipo][0]}</span><span style={{ flex: 1 }}>{e.titulo}</span><span className="mono tiny">{fdate(e.fecha)}</span></div>)}
          {p.vetCabecera && <div className="tiny muted" style={{ marginTop: 10 }}>✓ Veterinaria de cabecera: {p.vetCabecera.titulo} · MP {p.vetCabecera.mp}</div>}
        </Link>
      )}
    </div></section>
  );
}

const QA = [
  ['/directorio', '☺', 'Encontrá un veterinario/a', 'Por especialidad, especie y departamento. Sólo matrículas vigentes.'],
  ['/verificar', '✓', '¿Está matriculado/a?', 'Escaneá el QR de la credencial o del establecimiento, o buscá por matrícula.'],
  ['/servicios', '⊞', 'Consultorio digital y zoonosis', 'Gestión para veterinarias y servicio de zoonosis para municipios.'],
  ['/receta', '℞', 'Farmacias: verificar receta', 'Escaneá el QR de una receta veterinaria y registrá la dispensa.'],
  ['/datos', '▥', 'Datos abiertos', 'Panel de zoonosis por departamento y API pública.'],
  ['/tramites', '⇄', 'Trámites y denuncias', 'Matriculación, habilitaciones, certificados y denuncias de ejercicio ilegal.'],
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
          <Kicker style={{ color: '#9fd8c4' }}>Colegio de Veterinarios · Mendoza</Kicker>
          <h1>Veterinarios matriculados, guardias y turnos en toda Mendoza.</h1>
          <p className="lead">Buscá un profesional, mirá quién está de guardia ahora, sacá un turno o consultá la libreta sanitaria de tu mascota.</p>
          <Search onVet={setVet} onEst={setEst} />
          <div className="chips">
            <Link className="chip" to="/guardias">◷ Tablero de guardia</Link>
            <Link className="chip" to="/directorio?turnos=1">▦ Pedir turno online</Link>
            <Link className="chip" to="/libreta">✚ Libreta sanitaria digital</Link>
            <Link className="chip" to="/verificar">✓ Verificar matrícula</Link>
          </div>
        </div>
        <HeroTurnos onPick={p => t.open(p.codigo, p.mp, p.inicio)} />
      </div></section>
      <div className="wrap">
        <div className="urgent">
          <div className="pulse">!</div>
          <div style={{ flex: 1, minWidth: 220 }}><b>¿Es una urgencia?</b><div className="muted small">Te mostramos las guardias abiertas más cercanas a tu ubicación, con llamada directa.</div></div>
          <button className="btn btn-danger" onClick={() => setUrg(true)}>Ver guardia más cercana</button>
        </div>
      </div>
      <section className="sec" style={{ paddingBottom: 24 }}><div className="wrap">
        <div className="shead"><div><Kicker>01 · Mapa</Kicker><h2>Establecimientos y turnos cerca tuyo</h2><p className="muted">Clínicas, consultorios, agroveterinarias y guardias habilitadas. Donde dice «Próximo turno», lo reservás en un clic.</p></div><Link className="btn" to="/mapa">Abrir mapa completo →</Link></div>
        <MapSection home />
      </div></section>
      <section className="sec" style={{ paddingTop: 24 }}><div className="wrap">
        <div className="shead"><div><Kicker>02 · Guardias</Kicker><h2>Tablero de guardia</h2><p className="muted">Quién está atendiendo urgencias ahora, por zona. Lo actualiza cada clínica desde su portal.</p></div><Link className="btn" to="/guardias">Ver tablero completo →</Link></div>
        <Board limit={6} />
      </div></section>
      <LibretaBand />
      <section className="sec"><div className="wrap">
        <div className="shead"><div><Kicker>04 · Servicios</Kicker><h2>Todo lo demás, a un clic</h2></div></div>
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
