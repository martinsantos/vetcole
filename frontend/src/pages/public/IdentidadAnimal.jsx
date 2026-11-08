// Identidad animal: cómo se conecta cada servicio alrededor de la libreta, la credencial del animal y la normativa en discusión.
import { Link, useNavigate } from 'react-router-dom';
import { useApi } from '../../lib/api.js';
import { Badge, Kicker, QR, verifyUrl, toast } from '../../components/ui.jsx';
import { loginAs } from '../../layouts/DemoBar.jsx';
import { NORMAS, ESTADO, CICLO, VISIBILIDAD } from './normativa.js';
import { fdate, edad, chipFmt, estadoCls } from '../../lib/format.js';

const CUENTAS = { muni: 'zoonosis@godoycruz.demo', tutor: 'sofia.rios@demo.colvet', vet: 'lucia.ferreyra@demo.colvet' };

// Enlace a una pantalla de la demo; si es de un área privada, entra con la cuenta de ejemplo de ese rol.
export function DemoLink({ to, rol, children, className = 'lnk' }) {
  const nav = useNavigate();
  if (!rol) return <Link className={className} to={to}>{children}</Link>;
  return <a href="#" className={className} onClick={async e => { e.preventDefault(); try { await loginAs(CUENTAS[rol], nav, to); } catch (err) { toast(err.message, 'error'); } }}>{children}</a>;
}

export function NormaCard({ n, compact }) {
  const [lbl, cls] = ESTADO[n.estado];
  return (
    <article className="card norma">
      <div className="row between" style={{ gap: 8 }}><span className="mono tiny muted">{n.ambito}</span><Badge cls={cls}>{lbl}</Badge></div>
      <h3>{n.t}</h3>
      {!compact && <p className="small" style={{ margin: 0 }}>{n.d}</p>}
      <div className="hace"><span className="mono tiny">LA PLATAFORMA</span><p className="small">{n.hace}</p></div>
      {n.demo && <DemoLink to={n.demo[0]} rol={n.demo[2]}>{n.demo[1]} →</DemoLink>}
    </article>
  );
}

// Credencial de ejemplo (Luna), con datos reales de la demo.
export function CredencialMuestra() {
  const { data: p } = useApi('/public/libretas/MZA-000231');
  if (!p) return <div className="acred skel" />;
  const vac = p.eventos.find(e => e.tipo === 'vac');
  return (
    <Link to={`/libreta/${p.libreta}`} className="acred">
      <div className="acred-top"><span className="mono tiny">CREDENCIAL DEL ANIMAL</span><Badge cls={estadoCls(p.estado.codigo)}>{p.estado.etiqueta}</Badge></div>
      <div className="acred-body">
        <div className="petav">{p.nombre[0]}</div>
        <div style={{ minWidth: 0 }}>
          <b className="acred-name">{p.nombre}</b>
          <div className="small muted">{p.especie} · {p.raza} · {edad(p.nacimiento)}</div>
          <div className="mono tiny" style={{ marginTop: 6 }}>N° {p.libreta}{p.microchip ? ` · chip ${chipFmt(p.microchip).slice(0, 7)}…` : ''}</div>
        </div>
        <QR text={verifyUrl(`/libreta/${p.libreta}`)} size={70} />
      </div>
      <div className="acred-foot">
        {vac && <span>✓ {vac.titulo} · {fdate(vac.fecha)}</span>}
        {p.vetCabecera && <span>Firmó {p.vetCabecera.titulo} · MP {p.vetCabecera.mp}</span>}
      </div>
    </Link>
  );
}

// Esquema: quién registra → qué queda → quién lo usa.
const ORIGEN = [
  { t: 'Veterinario/a matriculado/a', d: 'Coloca el chip, vacuna, castra y receta desde su consultorio.', to: '/vet/consultorio/pacientes', rol: 'vet', l: 'Consultorio digital' },
  { t: 'Zoonosis del municipio', d: 'Campañas de antirrábica y castración en barrios, incluso sin conexión.', to: '/muni/campanias', rol: 'muni', l: 'Panel de zoonosis' },
];
const DESTINO = [
  ['Familia', 'Lleva la credencial en el celular, recibe recordatorios y saca turnos.', '/tutor', 'tutor', 'App del tutor/a'],
  ['Municipio', 'Ve la cobertura antirrábica, las mordeduras y los perros potencialmente peligrosos de su territorio.', '/muni', 'muni', 'Panel municipal'],
  ['Farmacias', 'Verifican la receta por QR y registran la dispensa.', '/receta/RV-2026-000412', null, 'Verificar receta'],
  ['Quien encuentra un animal', 'Escanea el QR y ve cómo contactar a la familia si tiene aviso de extravío.', '/libreta/MZA-000231', null, 'Escanear QR'],
  ['Registro provincial', 'Si se aprueba la ley, recibe la identificación del animal desde la plataforma.', '/identidad-animal', null, 'Normativa', 'discusion'],
  ['SENASA', 'Libreta equina digital y certificados para viajar.', '/libreta/EQ-000017', null, 'Módulo equino', 'plazo'],
];

export function Conexiones() {
  return (
    <div className="flow">
      <div className="flow-col">
        <div className="flow-h mono tiny">QUIÉN REGISTRA</div>
        {ORIGEN.map(o => (
          <div key={o.t} className="card flow-node">
            <div><b>{o.t}</b><p className="small muted">{o.d}</p><DemoLink to={o.to} rol={o.rol}>{o.l} →</DemoLink></div>
          </div>
        ))}
        <div className="flow-note tiny muted">Cada registro se firma con la matrícula, que se valida en el momento contra el padrón del Colegio.</div>
      </div>
      <div className="flow-arrow" aria-hidden="true"><span>firma</span></div>
      <div className="flow-col center">
        <div className="flow-h mono tiny">QUÉ QUEDA</div>
        <CredencialMuestra />
        <ul className="flow-list small">
          <li><b>Un número por animal</b>, asociado a su microchip.</li>
          <li><b>Una sola libreta</b>, aunque la familia cambie de veterinaria.</li>
          <li><b>Un QR</b> que muestra sólo lo público.</li>
        </ul>
      </div>
      <div className="flow-arrow" aria-hidden="true"><span>QR</span></div>
      <div className="flow-col">
        <div className="flow-h mono tiny">QUIÉN LO USA</div>
        {DESTINO.map(([t, d, to, rol, l, st]) => (
          <div key={t} className="flow-dest">
            <div className="row between" style={{ gap: 6 }}><b>{t}</b>{st && <Badge cls={ESTADO[st][1]}>{ESTADO[st][0]}</Badge>}</div>
            <p className="small muted">{d}</p>
            <DemoLink to={to} rol={rol}>{l} →</DemoLink>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function IdentidadAnimal() {
  return (
    <>
      <section className="sec idhero"><div className="wrap">
        <div>
          <Kicker>Identidad animal</Kicker>
          <h1>Un número, una libreta y un QR para cada animal.</h1>
          <p className="lead">El chip identifica al animal y la libreta digital guarda sus cuidados. La firma de un/a veterinario/a matriculado/a es lo que vuelve confiables esos datos para la familia, el municipio y, si se aprueba la ley, el registro provincial.</p>
          <div className="row"><a className="btn btn-primary" href="#normativa" onClick={e => { e.preventDefault(); document.getElementById('normativa')?.scrollIntoView({ behavior: 'smooth' }); }}>Ver normativa y protocolos</a><Link className="btn" to="/libreta">Consultar una libreta</Link></div>
        </div>
      </div></section>

      <section className="sec" style={{ paddingTop: 8 }}><div className="wrap">
        <div className="shead"><div><Kicker>Cómo se conecta</Kicker><h2>Del consultorio al celular de la familia</h2><p className="muted">Los mismos datos, con permisos distintos para cada uno. Los enlaces abren cada parte de la demo.</p></div></div>
        <Conexiones />
      </div></section>

      <section className="sec band-soft"><div className="wrap">
        <div className="shead"><div><Kicker>Ciclo de vida</Kicker><h2>De la primera vacuna a la baja</h2></div></div>
        <ol className="ciclo">{CICLO.map(c => (
          <li key={c.n} className="card"><span className="mono tiny muted">{c.n}</span><h3>{c.t}</h3><p className="small">{c.d}</p><Badge cls={c.ok ? 'b-ok' : 'b-grey'}>{c.demo}</Badge></li>
        ))}</ol>
      </div></section>

      <section className="sec" id="normativa"><div className="wrap">
        <div className="shead"><div><Kicker>Normativa y protocolos</Kicker><h2>Qué dice la norma y qué hace la plataforma</h2><p className="muted">Algunas normas están vigentes, otras tienen plazo y otras todavía se discuten. La plataforma registra lo que ya exige la norma vigente, y los datos ya están listos para lo que se apruebe.</p></div></div>
        <div className="grid g2 normas">{NORMAS.map(n => <NormaCard key={n.k} n={n} />)}</div>
        <p className="tiny muted" style={{ marginTop: 14 }}>Resumen orientativo armado para esta demo. Antes de usarlo en producción, el Colegio tiene que validarlo contra el texto vigente de cada norma.</p>
      </div></section>

      <section className="sec" style={{ paddingTop: 0 }}><div className="wrap grid g2" style={{ alignItems: 'start' }}>
        <div>
          <Kicker>Privacidad</Kicker><h2 style={{ marginTop: 6 }}>Quién ve qué</h2>
          <div className="tblwrap"><table className="tbl"><tbody>{VISIBILIDAD.map(([a, b]) => <tr key={a}><td style={{ width: '38%' }}><b>{a}</b></td><td className="small">{b}</td></tr>)}</tbody></table></div>
        </div>
        <div className="card">
          <Kicker>Protocolo</Kicker><h3 style={{ margin: '6px 0 10px' }}>Si un animal muerde</h3>
          <ol className="pasos small">
            <li>La persona mordida recibe atención médica. Se identifica al animal por su chip o su QR.</li>
            <li>Un/a veterinario/a matriculado/a abre una <b>observación antirrábica de 10 días</b>.</li>
            <li>La mordedura queda en la libreta y la ve zoonosis del municipio.</li>
            <li>Cuando terminan los 10 días, se registra el alta o la derivación. Los casos que se repiten quedan en el registro de perros potencialmente peligrosos.</li>
          </ol>
          <DemoLink to="/muni/mordeduras" rol="muni" className="btn btn-sm">Ver el panel de mordeduras →</DemoLink>
        </div>
      </div></section>
    </>
  );
}
