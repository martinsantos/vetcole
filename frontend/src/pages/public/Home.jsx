// Portada institucional del Colegio: buscador general, matriculados, noticias y agenda, comunidad e institucional.
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useApi } from '../../lib/api.js';
import { fdate } from '../../lib/format.js';
import { EstModal, useTurno, MapSection, UrgenciaModal } from './shared.jsx';
import { BRAND } from '../../lib/brand.js';
import heroFoto from '../../assets/hero-veterinaria.jpg';
import { COLEGIO } from '../../content/colegio.js';
import { useNoticias, imgColegio } from '../../lib/noticias.js';
import { DemoLink } from './IdentidadAnimal.jsx';
import Buscador from './Buscador.jsx';
import { LibretaDestacada } from './EstandarLibreta.jsx';

// Enlace a la nota completa: en el sitio del Colegio si viene de ahí.
const NotaLink = ({ n, children, className }) => (n.url ? <a className={className} href={n.url} target="_blank" rel="noopener noreferrer">{children}</a> : <span className={className}>{children}</span>);

export function NewsCard({ n }) {
  return (
    <NotaLink n={n} className="card news-card">
      {n.img && <img src={n.img} alt="" loading="lazy" />}
      <div className="nc-body">
        <span className="small muted">{n.categoria} · {fdate(n.fecha)}</span>
        <h3>{n.titulo}</h3>
        <p className="muted small">{n.resumen}</p>
      </div>
    </NotaLink>
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
];
const enDias = n => { const d = new Date(); d.setDate(d.getDate() + n); return d; };

// Franja «Ahora»: lo urgente en una línea, sin ocupar la portada.
function Ahora({ onUrgencia }) {
  const { data: g } = useApi('/public/guardias');
  const { data: prox } = useApi('/public/proximos-turnos');
  return (
    <section className="ahora" aria-label="Ahora"><div className="wrap ahora-in">
      <span className="ahora-t"><i />Ahora</span>
      <Link to="/guardias" className="ahora-i"><b>{g ? g.activas : '–'}</b><span>Guardias de hoy abiertas{g ? ` · ${g.pasivas} a llamado` : ''}</span></Link>
      <Link to="/directorio?turnos=1" className="ahora-i"><b>{prox ? prox.length : '–'}</b><span>turnos libres próximos</span></Link>
      <Link to="/verificar" className="ahora-i ahora-l"><span>Verificar una matrícula →</span></Link>
      <button type="button" className="btn btn-danger" onClick={onUrgencia}>Urgencia: guardia más cercana</button>
    </div></section>
  );
}

export default function Home() {
  const news = useNoticias(5);
  const agenda = (COLEGIO?.agenda || AGENDA).map(([d, ti, lugar]) => [typeof d === 'number' ? enDias(d) : new Date(`${d}T12:00:00`), ti, lugar]);
  const [est, setEst] = useState(null), [urg, setUrg] = useState(false);
  const { data: stats } = useApi('/public/stats');
  const navigate = useNavigate();
  const t = useTurno();
  return (
    <>
      <section className="ihero-foto">
        <img className="ihf-img" src={heroFoto} alt="" />
        <div className="wrap ihf-in">
          <p className="ihero-org">{BRAND.nombre}</p>
          <h1>Al servicio de la salud animal y de la comunidad</h1>
          <p className="ihf-lead">Profesionales matriculados que cuidan a los animales y a sus familias, con ética, formación continua y compromiso con la salud pública.</p>
          <Buscador onVet={v => navigate(`/profesional/${v.mp}`)} onEst={setEst} onTurno={v => { if (!t.forVet(v)) navigate(`/profesional/${v.mp}`); }} />
        </div>
        <span className="ihf-credit">Foto: Unsplash</span>
      </section>

      <Ahora onUrgencia={() => setUrg(true)} />

      <section className="sec"><div className="wrap news-grid">
        <div>
          <div className="sec-head"><h2>Noticias del Colegio</h2><Link className="lnk" to="/noticias">Ver todas →</Link></div>
          <div className="news-list">{(news || []).map((n, i) => (
            <NotaLink key={n.id} n={n} className={i === 0 ? 'news-main card' : 'news-item'}>
              {n.img && <img src={n.img} alt="" loading="lazy" />}
              <div>
                <span className="small muted">{n.categoria} · {fdate(n.fecha)}</span>
                <h3>{n.titulo}</h3>
                {i === 0 && <p className="muted">{n.resumen}</p>}
              </div>
            </NotaLink>
          ))}</div>
        </div>
        <aside>
          <div className="sec-head"><h2>Agenda</h2></div>
          <ul className="agenda">{agenda.map(([f, ti, lugar]) => { return (
            <li key={ti}><div className="ag-date"><b>{f.getDate()}</b><span>{f.toLocaleDateString('es-AR', { month: 'short' }).replace('.', '')}</span></div><div><b>{ti}</b><span className="small muted">{lugar}</span></div></li>
          ); })}</ul>
        </aside>
      </div></section>

      <LibretaDestacada />

      <section className="sec sec-alt"><div className="wrap">
        <div className="sec-head"><h2>Veterinarias de turno y guardias</h2><Link className="lnk" to="/mapa">Abrir el mapa completo →</Link></div>
        <p className="muted" style={{ margin: '-6px 0 14px' }}>Quién atiende urgencias ahora y los próximos turnos libres, en el mapa.</p>
        <MapSection home initialChip="guardia" />
      </div></section>

      <section className="cifras"><div className="wrap cifras-in">
        <div><b>{stats ? stats.padronPublicado : '—'}</b><span>profesionales matriculados</span></div>
        <div><b>{stats ? stats.establecimientos : '—'}</b><span>establecimientos en el mapa</span></div>
        <div><b>{stats ? stats.guardias : '—'}</b><span>clínicas con guardia declarada</span></div>
        <div><b>{stats ? stats.departamentos : '—'}</b><span>departamentos de la provincia</span></div>
      </div></section>

      <section className="sec"><div className="wrap">
        <div className="sec-head"><h2>Matriculados</h2><Link className="lnk" to="/tramites">Todos los trámites →</Link></div>
        <div className="accesos">{MATRICULADOS.map(([ti, d, to]) => (
          <DemoLink key={ti} to={to} rol="vet" className="card acceso"><b>{ti}</b><span className="small muted">{d}</span></DemoLink>
        ))}</div>
        <p className="small muted" style={{ marginTop: 12 }}>¿Todavía no estás matriculado/a? <Link className="lnk" to="/inscripcion">Iniciá la matriculación</Link></p>
      </div></section>

      <section className="sec sec-inst"><div className="wrap">
        <div className="sec-head"><h2>El Colegio</h2><Link className="lnk" to="/institucional">Institucional →</Link></div>
        <div className="inst-grid">
          {COLEGIO ? <figure className="marca-fig"><img src={imgColegio('marca-colegio.png')} alt={`Marca institucional del ${BRAND.nombre}`} /></figure>
            : <figure className="foto-slot" aria-label="Espacio para foto institucional"><div><b>Foto institucional</b><span>Sede, actos o capacitaciones del Colegio</span></div></figure>}
          <div>
            <p className="inst-lead">{COLEGIO ? COLEGIO.institucion.sobre : 'El Colegio matricula a los médicos veterinarios de la provincia, vela por el cumplimiento del Código de Ética y acompaña la formación continua de sus colegiados.'}</p>
            <div className="grid g2">
              <Link to="/institucional" className="inst-item"><h3>Autoridades</h3><p className="small">Comisión Directiva, Tribunal de Disciplina y Tribunal Revisor de Cuentas.</p></Link>
              <Link to="/institucional" className="inst-item"><h3>Legislación</h3><p className="small">{BRAND.ley}, estatuto y Código de Ética.</p></Link>
              <Link to="/identidad-animal" className="inst-item"><h3>Normativa sanitaria</h3><p className="small">Libreta sanitaria, identificación animal y protocolos.</p></Link>
              <Link to="/institucional" className="inst-item"><h3>Subcomisiones</h3><p className="small">Formación continua, pequeños animales, rumiantes, equinos, salud pública.</p></Link>
            </div>
          </div>
        </div>
      </div></section>

      <UrgenciaModal open={urg} onClose={() => setUrg(false)} />
      <EstModal est={est} onClose={() => setEst(null)} onTurno={c => { setEst(null); t.open(c); }} />
      {t.modal}
    </>
  );
}
