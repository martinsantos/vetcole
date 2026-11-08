// Portada institucional del Colegio: matriculados, noticias y agenda, comunidad e institucional.
import { useEffect, useMemo, useRef, useState } from 'react';
import { url } from '../../lib/base.js';
import { Link, useNavigate } from 'react-router-dom';
import { api, useApi } from '../../lib/api.js';
import { norm, fdate } from '../../lib/format.js';
import { VetModal, EstModal, useTurno, useCached } from './shared.jsx';
import { BRAND } from '../../lib/brand.js';
import { TRAMITES } from './Info.jsx';
import { DemoLink } from './IdentidadAnimal.jsx';

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

const MATRICULADOS = [
  ['Pagar la cuota', 'Estado de cuenta y pago en línea.', '/vet/cuotas'],
  ['Credencial digital', 'Con QR para verificar la matrícula.', '/vet/credencial'],
  ['Trámites', 'Habilitaciones, certificados y especialidades.', '/vet/tramites'],
  ['Recetas electrónicas', 'Con QR para farmacias.', '/vet/recetas'],
  ['Mi consultorio', 'Agenda, pacientes, ventas y stock.', '/vet/consultorio'],
];

// Agenda de ejemplo, con fechas relativas a hoy.
const AGENDA = [
  [5, 'Curso de ecografía abdominal en pequeños animales', 'Sede del Colegio · cupos limitados'],
  [19, 'Masterclass: distress respiratorio felino', 'Modalidad virtual'],
  [34, 'Asamblea General Ordinaria', 'Sede del Colegio · modalidad mixta'],
];
const enDias = n => { const d = new Date(); d.setDate(d.getDate() + n); return d; };

function GuardiasHoy() {
  const { data } = useApi('/public/guardias');
  return (
    <Link to="/guardias" className="card com-card">
      <h3>Guardias de hoy</h3>
      <p className="small muted">{data ? `${data.activas} clínicas con guardia activa y ${data.pasivas} a llamado.` : 'Clínicas que atienden urgencias ahora.'}</p>
      <span className="lnk">Ver el tablero de guardia →</span>
    </Link>
  );
}

export default function Home() {
  const { data: news } = useApi('/public/noticias?take=4');
  const [vet, setVet] = useState(null), [est, setEst] = useState(null);
  const t = useTurno();
  return (
    <>
      <section className="ihero"><div className="wrap ihero-grid">
        <div>
          <p className="ihero-org">{BRAND.nombre}</p>
          <h1>Ejercicio profesional responsable, al servicio de la salud animal y de la comunidad.</h1>
          <p className="lead">El Colegio matricula a los médicos veterinarios de la provincia, vela por el cumplimiento del Código de Ética y acompaña la formación continua de sus colegiados.</p>
          <div className="row" style={{ gap: 10 }}>
            <Link className="btn btn-primary btn-lg" to="/ingresar">Soy matriculado/a</Link>
            <Link className="btn btn-lg" to="/directorio">Busco un veterinario/a</Link>
          </div>
        </div>
        <figure className="foto-slot" aria-label="Espacio para foto institucional">
          <div><b>Foto institucional</b><span>Sede, actos o capacitaciones del Colegio</span></div>
        </figure>
      </div></section>

      <section className="sec"><div className="wrap">
        <div className="sec-head"><h2>Matriculados</h2><Link className="lnk" to="/tramites">Todos los trámites →</Link></div>
        <div className="accesos">{MATRICULADOS.map(([ti, d, to]) => (
          <DemoLink key={ti} to={to} rol="vet" className="card acceso"><b>{ti}</b><span className="small muted">{d}</span></DemoLink>
        ))}</div>
        <p className="small muted" style={{ marginTop: 12 }}>¿Todavía no estás matriculado/a? <Link className="lnk" to="/inscripcion">Iniciá la matriculación</Link></p>
      </div></section>

      <section className="sec sec-alt"><div className="wrap news-grid">
        <div>
          <div className="sec-head"><h2>Noticias</h2><Link className="lnk" to="/noticias">Ver todas →</Link></div>
          <div className="news-list">{(news || []).map((n, i) => (
            <article key={n.id} className={i === 0 ? 'news-main card' : 'news-item'}>
              <span className="small muted">{n.categoria} · {fdate(n.fecha)}</span>
              <h3>{n.titulo}</h3>
              {i === 0 && <p className="muted">{n.resumen}</p>}
            </article>
          ))}</div>
        </div>
        <aside>
          <div className="sec-head"><h2>Agenda</h2></div>
          <ul className="agenda">{AGENDA.map(([d, ti, lugar]) => { const f = enDias(d); return (
            <li key={ti}><div className="ag-date"><b>{f.getDate()}</b><span>{f.toLocaleDateString('es-AR', { month: 'short' }).replace('.', '')}</span></div><div><b>{ti}</b><span className="small muted">{lugar}</span></div></li>
          ); })}</ul>
        </aside>
      </div></section>

      <section className="sec"><div className="wrap">
        <div className="sec-head"><h2>Para la comunidad</h2></div>
        <Search onVet={setVet} onEst={setEst} />
        <div className="grid g4" style={{ marginTop: 16 }}>
          <Link to="/directorio" className="card com-card"><h3>Buscar un veterinario/a</h3><p className="small muted">Por especialidad, especie y departamento. Sólo matrículas vigentes.</p><span className="lnk">Ir al directorio →</span></Link>
          <GuardiasHoy />
          <Link to="/verificar" className="card com-card"><h3>Verificar una matrícula</h3><p className="small muted">Comprobá que quien atiende a tu animal esté matriculado/a.</p><span className="lnk">Verificar →</span></Link>
          <Link to="/libreta" className="card com-card"><h3>Libreta sanitaria</h3><p className="small muted">Las vacunas de tu animal, firmadas por su veterinario/a.</p><span className="lnk">Consultar →</span></Link>
        </div>
      </div></section>

      <section className="sec sec-inst"><div className="wrap">
        <div className="sec-head"><h2>El Colegio</h2><Link className="lnk" to="/institucional">Institucional →</Link></div>
        <div className="grid g4">
          <Link to="/institucional" className="inst-item"><h3>Autoridades</h3><p className="small">Comisión Directiva, Tribunal de Disciplina y Tribunal Revisor de Cuentas.</p></Link>
          <Link to="/institucional" className="inst-item"><h3>Legislación</h3><p className="small">{BRAND.ley}, estatuto y Código de Ética.</p></Link>
          <Link to="/identidad-animal" className="inst-item"><h3>Normativa sanitaria</h3><p className="small">Libreta sanitaria, identificación animal y protocolos.</p></Link>
          <Link to="/institucional" className="inst-item"><h3>Subcomisiones</h3><p className="small">Formación continua, pequeños animales, rumiantes, equinos, salud pública.</p></Link>
        </div>
      </div></section>

      <VetModal vet={vet} onClose={() => setVet(null)} onTurno={(c, mp) => { setVet(null); t.open(c, mp); }} />
      <EstModal est={est} onClose={() => setEst(null)} onTurno={c => { setEst(null); t.open(c); }} />
      {t.modal}
    </>
  );
}
