// Buscador principal de la portada: busca a la vez en el directorio de profesionales, en los establecimientos
// y en trámites, normativa y páginas del Colegio. Muestra los resultados en la misma página, agrupados.
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Badge } from '../../components/ui.jsx';
import { norm, ini, statusCls, telFmt } from '../../lib/format.js';
import { useCached } from './shared.jsx';
import { TRAMITES } from './Info.jsx';
import { NORMAS } from './normativa.js';
import { FotoVet } from './Profesional.jsx';
import { COLEGIO } from '../../content/colegio.js';
import { useNoticias } from '../../lib/noticias.js';

const PAGINAS = [
  ['/libreta', 'Libreta sanitaria digital', 'Consultá las vacunas de un animal por número de libreta o microchip.'],
  ['/estandar-libreta', 'Estándar abierto de libreta sanitaria', 'Formato libre para la libreta digital y el registro provincial de animales: microchip, firma y QR.'],
  ['/verificar', 'Verificar matrícula', 'Comprobá que un profesional esté matriculado y vigente.'],
  ['/receta', 'Verificar receta', 'Para farmacias: verificá una receta veterinaria por su QR.'],
  ['/viajar', 'Viajar con mascotas', 'Certificado de salud y requisitos de SENASA.'],
  ['/guardias', 'Guardias y urgencias', 'Clínicas que atienden urgencias ahora, por zona.'],
  ['/inscripcion', 'Matricularme', 'Solicitud de matrícula para nuevos profesionales.'],
  ['/datos', 'Datos abiertos', 'Vacunación antirrábica y zoonosis por departamento.'],
  ['/institucional', 'Institucional', 'Autoridades, legislación, Código de Ética y subcomisiones.'],
];

const SUGERENCIAS = ['Guardia 24 h', 'Exóticos', 'Equinos', 'Cirugía', 'Tunuyán', 'Habilitación'];
const TABS = [['todo', 'Todo'], ['vets', 'Profesionales'], ['ests', 'Establecimientos'], ['info', 'Trámites e información']];

// Distancia de edición (para tolerar errores de tipeo: «cirujia» → «cirugía»).
function lev(a, b) {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[a.length][b.length];
}
const parecido = (h, t) => t.length >= 4 && h.split(/[^a-z0-9]+/).some(w => w.length >= t.length - 1 && lev(w.slice(0, t.length), t) <= (t.length >= 7 ? 2 : 1));
// Todas las palabras de la búsqueda tienen que aparecer (en cualquier orden). Con «flex», también palabras parecidas.
const match = (texto, tokens, flex) => { const h = norm(texto); return tokens.every(t => h.includes(t) || (flex && parecido(h, t))); };

export default function Buscador({ onVet, onEst, onTurno }) {
  const vets = useCached('/public/vets'), ests = useCached('/public/establecimientos');
  const noticias = useNoticias(20);
  // La búsqueda queda en la dirección (?q=) para poder compartirla.
  const [sp, setSp] = useSearchParams();
  const [q, setQ0] = useState(sp.get('q') || ''), [tab, setTab] = useState('todo');
  const setQ = v => { setQ0(v); setTab('todo'); setSp(v ? { q: v } : {}, { replace: true }); };
  const input = useRef(null), box = useRef(null);
  // «/» enfoca el buscador desde cualquier parte de la página.
  useEffect(() => {
    const k = e => { if (e.key === '/' && !/input|textarea|select/i.test(document.activeElement?.tagName)) { e.preventDefault(); input.current?.focus(); } };
    document.addEventListener('keydown', k); return () => document.removeEventListener('keydown', k);
  }, []);
  const tokens = useMemo(() => norm(q).replace(/24 ?h/g, '24h').split(/\s+/).filter(t => t.length > 1 || /\d/.test(t)), [q]);

  const res = useMemo(() => {
    if (!tokens.length) return null;
    const run = flex => {
    const v = (vets || []).filter(x => match(`${x.titulo} ${x.nombre} mp ${x.mp} ${x.departamento} ${x.zona} ${x.especialidades.join(' ')} ${x.especies.join(' ')} ${x.turnosOnline ? 'turnos online' : ''} ${x.domicilio ? 'domicilio' : ''}`, tokens, flex));
    const e = (ests || []).filter(x => match(`${x.nombre} ${x.tipo} ${x.direccion} ${x.departamento} ${x.zona} ${x.especies.join(' ')} ${x.guardia ? `guardia urgencia ${x.guardia} ${x.guardia === 'activa' ? '24h' : ''}` : ''} ${x.turnosOnline ? 'turnos online' : ''}`, tokens, flex))
      .sort((a, b) => (b.status?.code === 'activa') - (a.status?.code === 'activa'));
    const i = [
      ...TRAMITES.map(t => ({ to: '/tramites', t: t.t, d: t.d, tipo: 'Trámite' })),
      ...NORMAS.map(n => ({ to: '/identidad-animal', t: n.t, d: n.d, tipo: 'Normativa' })),
      ...PAGINAS.map(([to, t, d]) => ({ to, t, d, tipo: 'Página' })),
      ...(COLEGIO ? [...COLEGIO.leyes, ...COLEGIO.resoluciones].map(x => ({ href: x.url, t: x.t, d: 'Documento del Colegio', tipo: 'Legislación' })) : []),
      ...(noticias || []).map(n => ({ to: '/noticias', href: n.url, t: n.titulo, d: n.resumen, tipo: 'Noticia' })),
    ].filter(x => match(`${x.t} ${x.d}`, tokens, flex));
    return { v, e, i, flex };
    };
    const exact = run(false);
    // Si no hay coincidencias exactas, se buscan palabras parecidas (errores de tipeo).
    return exact.v.length + exact.e.length + exact.i.length ? exact : run(true);
  }, [tokens, vets, ests, noticias]);

  const total = res ? res.v.length + res.e.length + res.i.length : 0;
  // En «Todo» se muestran sólo los grupos con resultados.
  const show = k => (tab === 'todo' ? res && res[k[0]].length > 0 : tab === k);
  const cols = tab === 'todo' && res ? ['vets', 'ests', 'info'].filter(show).length : 1;
  const lim = cols > 1 ? 4 : 12;
  const qs = encodeURIComponent(q.trim());

  const Vets = () => (
    <div className="bres-col">
      <div className="bres-h"><h3>Profesionales</h3><span className="muted small">{res.v.length}</span></div>
      {res.v.slice(0, lim).map(v => (
        <div key={v.mp} className="bres-item">
          <FotoVet vet={v} size={44} />
          <div className="bres-main">
            <Link to={`/profesional/${v.mp}`}><b>{v.titulo}</b></Link>
            <span className="small muted">Matrícula {v.mp} · {v.especialidades.slice(0, 2).join(', ')} · {v.departamento}</span>
            <span className="row" style={{ gap: 6, marginTop: 4 }}><Badge cls="b-ok">Matrícula vigente</Badge>{v.turnosOnline && <Badge>Turnos online</Badge>}</span>
          </div>
          {v.turnosOnline && <button className="btn btn-sm" onClick={() => onTurno(v)}>Pedir turno</button>}
        </div>
      ))}
      {!res.v.length && <p className="small muted">Sin profesionales para esta búsqueda.</p>}
      {res.v.length > lim && <Link className="lnk" to={`/directorio?q=${qs}`}>Ver los {res.v.length} en el directorio →</Link>}
    </div>
  );
  const Ests = () => (
    <div className="bres-col">
      <div className="bres-h"><h3>Establecimientos</h3><span className="muted small">{res.e.length}</span></div>
      {res.e.slice(0, lim).map(x => (
        <div key={x.codigo} className="bres-item">
          <div className="bres-main">
            <a href="#" onClick={ev => { ev.preventDefault(); onEst(x); }}><b>{x.nombre}</b></a>
            <span className="small muted">{x.tipo} · {x.direccion}, {x.departamento}</span>
            <span className="row" style={{ gap: 6, marginTop: 4 }}><Badge cls={statusCls(x.status)}>{x.status?.label}</Badge></span>
          </div>
          {x.telefono && <a className="btn btn-sm" href={`tel:${x.telefono}`}>Llamar</a>}
        </div>
      ))}
      {!res.e.length && <p className="small muted">Sin establecimientos para esta búsqueda.</p>}
      {res.e.length > lim && <Link className="lnk" to="/mapa">Ver los {res.e.length} en el mapa →</Link>}
    </div>
  );
  const Info = () => (
    <div className="bres-col">
      <div className="bres-h"><h3>Trámites e información</h3><span className="muted small">{res.i.length}</span></div>
      {res.i.slice(0, lim).map(x => (
        x.href ? <a key={x.tipo + x.t} href={x.href} target="_blank" rel="noopener noreferrer" className="bres-item bres-link">
          <div className="bres-main"><b>{x.t}</b><span className="small muted">{x.tipo} · {x.d.slice(0, 140)}</span></div>
        </a> : <Link key={x.tipo + x.t} to={x.to} className="bres-item bres-link">
          <div className="bres-main"><b>{x.t}</b><span className="small muted">{x.tipo} · {x.d.slice(0, 140)}</span></div>
        </Link>
      ))}
      {!res.i.length && <p className="small muted">Sin trámites ni páginas para esta búsqueda.</p>}
    </div>
  );

  return (
    <div className="buscador">
      <form className="bsearch" role="search" onSubmit={e => e.preventDefault()}>
        <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" strokeWidth="2" /><path d="M16.5 16.5 21 21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
        <input ref={input} type="search" value={q} onChange={e => setQ(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Escape') setQ('');
            if (e.key === 'ArrowDown' || e.key === 'Enter') { const first = box.current?.querySelector('.bres-main a, .bres-link, .bres-item .btn'); if (first) { e.preventDefault(); first.focus(); } }
          }} placeholder="Buscá un veterinario/a, un establecimiento, una localidad o un trámite" aria-label="Buscar en el sitio del Colegio" autoComplete="off" />
        {q && <button type="button" className="bclear" onClick={() => setQ('')} aria-label="Borrar">×</button>}
      </form>
      {!res && (
        <div className="bsug"><span className="small muted">Por ejemplo:</span>{SUGERENCIAS.map(s => <button key={s} type="button" className="chip" onClick={() => setQ(s)}>{s}</button>)}</div>
      )}
      {res && (
        <div className="bres" ref={box} aria-live="polite">
          <div className="btabs" role="tablist">
            {TABS.map(([k, l]) => { const n = k === 'todo' ? total : res[k[0]].length; return <button key={k} type="button" role="tab" aria-selected={tab === k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>{l} <span>{n}</span></button>; })}
          </div>
          {res.flex && !!total && <p className="small muted" style={{ margin: '12px 0 0' }}>No hay coincidencias exactas para «{q}». Estos son los resultados más parecidos.</p>}
          {!total ? <p className="muted" style={{ margin: '18px 0 4px' }}>No encontramos resultados para «{q}». Probá con otra palabra o buscá en el <Link className="lnk" to="/directorio">directorio completo</Link>.</p> : (
            <div className={`bres-grid ${cols > 1 ? `c${cols}` : ''}`}>
              {show('vets') && <Vets />}
              {show('ests') && <Ests />}
              {show('info') && <Info />}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
