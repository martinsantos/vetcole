// Identidad animal: cómo se conecta cada servicio alrededor de la libreta, la credencial del animal y la normativa en discusión.
import { Link, useNavigate } from 'react-router-dom';
import { useApi } from '../../lib/api.js';
import { QR, verifyUrl, toast } from '../../components/ui.jsx';
import { loginAs } from '../../layouts/DemoBar.jsx';
import { NORMAS, ESTADO, CICLO, VISIBILIDAD } from './normativa.js';
import { edad } from '../../lib/format.js';

const CUENTAS = { muni: 'zoonosis@godoycruz.demo', tutor: 'sofia.rios@demo.colvet', vet: 'lucia.ferreyra@demo.colvet' };

// Enlace a una pantalla de la demo; si es de un área privada, entra con la cuenta de ejemplo de ese rol.
export function DemoLink({ to, rol, children, className = 'lnk' }) {
  const nav = useNavigate();
  if (!rol) return <Link className={className} to={to}>{children}</Link>;
  return <a href="#" className={className} onClick={async e => { e.preventDefault(); try { await loginAs(CUENTAS[rol], nav, to); } catch (err) { toast(err.message, 'error'); } }}>{children}</a>;
}

export function Estado({ e }) {
  const [lbl, cls] = ESTADO[e];
  return <span className={`estado ${cls}`}>{lbl}</span>;
}

export function NormaCard({ n, compact }) {
  return (
    <article className="card norma">
      <Estado e={n.estado} />
      <h3>{n.t}</h3>
      {!compact && <p className="small muted">{n.d}</p>}
      <p className="small">{n.hace}</p>
      {n.demo && !compact && <DemoLink to={n.demo[0]} rol={n.demo[2]}>{n.demo[1]} →</DemoLink>}
    </article>
  );
}

// Credencial de ejemplo (Luna), con datos reales de la demo.
export function CredencialMuestra() {
  const { data: p } = useApi('/public/libretas/MZA-000231');
  if (!p) return <div className="acred skel" />;
  return (
    <Link to={`/libreta/${p.libreta}`} className="acred">
      <div className="acred-body">
        <div>
          <b className="acred-name">{p.nombre}</b>
          <div className="small muted">{p.especie} · {p.raza} · {edad(p.nacimiento)}</div>
          <div className="small" style={{ marginTop: 8 }}>Libreta {p.libreta}</div>
          <div className="small" style={{ color: 'var(--ok)' }}>✓ {p.estado.etiqueta}</div>
        </div>
        <QR text={verifyUrl(`/libreta/${p.libreta}`)} size={76} />
      </div>
      {p.vetCabecera && <div className="acred-foot">Firmado por {p.vetCabecera.titulo}, matrícula {p.vetCabecera.mp}</div>}
    </Link>
  );
}

const ORIGEN = [
  ['Veterinarios/as matriculados/as', 'Colocan el chip, vacunan y recetan.', '/vet/consultorio/pacientes', 'vet'],
  ['Zoonosis del municipio', 'Vacunan y castran en campañas.', '/muni/campanias', 'muni'],
];
const DESTINO = [
  ['La familia', 'la lleva en el celular.', '/tutor', 'tutor'],
  ['El municipio', 've vacunación y mordeduras.', '/muni', 'muni'],
  ['Las farmacias', 'verifican recetas.', '/receta/RV-2026-000412'],
  ['Quien encuentra un animal', 'escanea el QR.', '/libreta/MZA-000231'],
];

// Esquema simple: quién registra → credencial del animal → quién la usa.
export function Conexiones() {
  return (
    <div className="flow">
      <div className="flow-col">
        <h3>Registran</h3>
        {ORIGEN.map(([t, d, to, rol]) => <DemoLink key={t} to={to} rol={rol} className="flow-item"><b>{t}</b><span>{d}</span></DemoLink>)}
      </div>
      <div className="flow-arrow" aria-hidden="true" />
      <div className="flow-col">
        <h3>Queda en una credencial</h3>
        <CredencialMuestra />
      </div>
      <div className="flow-arrow" aria-hidden="true" />
      <div className="flow-col">
        <h3>La usan</h3>
        {DESTINO.map(([t, d, to, rol]) => <DemoLink key={t} to={to} rol={rol} className="flow-item"><b>{t}</b><span>{d}</span></DemoLink>)}
      </div>
    </div>
  );
}

export default function IdentidadAnimal() {
  return (
    <>
      <section className="sec idhero"><div className="wrap">
        <h1>Identidad animal</h1>
        <p className="lead">Cada animal con un número, una libreta y un QR, firmados por veterinarios/as matriculados/as.</p>
      </div></section>

      <section className="sec" style={{ paddingTop: 8 }}><div className="wrap">
        <h2>Cómo funciona</h2>
        <Conexiones />
      </div></section>

      <section className="sec band-soft"><div className="wrap">
        <h2>De la primera vacuna a la baja</h2>
        <ol className="ciclo">{CICLO.map(c => (
          <li key={c.n} className="card"><h3>{c.t}</h3><p className="small">{c.d}</p>{!c.ok && <span className="small muted">Propuesta</span>}</li>
        ))}</ol>
      </div></section>

      <section className="sec"><div className="wrap">
        <h2>Normativa y protocolos</h2>
        <div className="grid g2 normas">{NORMAS.map(n => <NormaCard key={n.k} n={n} />)}</div>
        <p className="small muted" style={{ marginTop: 14 }}>Resumen orientativo. El Colegio debe validarlo con el texto vigente de cada norma.</p>
      </div></section>

      <section className="sec" style={{ paddingTop: 0 }}><div className="wrap grid g2" style={{ alignItems: 'start' }}>
        <div>
          <h2>Quién ve qué</h2>
          <div className="tblwrap"><table className="tbl"><tbody>{VISIBILIDAD.map(([a, b]) => <tr key={a}><td style={{ width: '38%' }}><b>{a}</b></td><td className="small">{b}</td></tr>)}</tbody></table></div>
        </div>
        <div>
          <h2>Si un animal muerde</h2>
          <ol className="pasos">
            <li>Se identifica al animal por su chip o su QR.</li>
            <li>Un/a veterinario/a lo observa durante 10 días.</li>
            <li>Zoonosis del municipio lo ve en su panel.</li>
            <li>Al terminar se registra el alta o la derivación.</li>
          </ol>
          <DemoLink to="/muni/mordeduras" rol="muni" className="btn btn-sm">Ver el panel de mordeduras</DemoLink>
        </div>
      </div></section>
    </>
  );
}
