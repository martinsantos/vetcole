// Páginas informativas y de trámites del sitio público.
import { BRAND } from '../../lib/brand.js';
import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api, useApi } from '../../lib/api.js';
import { Kicker, Modal, Field, Switch, AsyncBtn, toast, Badge, Seg, Spinner } from '../../components/ui.jsx';
import Board from '../../components/Board.jsx';
import { MapSection } from './shared.jsx';
import { NewsCard } from './Home.jsx';

export const TRAMITES = [
  { k: 'mat', t: 'Matriculación (nuevo profesional)', d: 'Solicitud online, carga de título y documentación, pago del derecho de inscripción y seguimiento.', pub: true },
  { k: 'rep', t: 'Reposición de credencial', d: 'La credencial digital no se pierde. Si querés la física, pedila y pagala online.' },
  { k: 'hab', t: 'Habilitación de establecimiento', d: 'Requisitos, formulario de solicitud, planos, DT y turno de inspección.' },
  { k: 'dt', t: 'Declaraciones juradas de Dirección Técnica', d: 'Alta, baja y renovación de DT de establecimientos y SENASA.' },
  { k: 'cv', t: 'Control voluntario de establecimiento', d: 'Pedí una visita preventiva del Colegio antes de la inspección.' },
  { k: 'esp', t: 'Registro de especialidad', d: 'Presentá tu título o certificación según la reglamentación de especialidades.' },
  { k: 'cert', t: 'Certificado de matrícula vigente / ética', d: 'Descarga inmediata con QR verificable, sin pasar por la sede.' },
  { k: 'baja', t: 'Suspensión voluntaria o baja', d: 'Por inactividad, radicación en otra provincia o jubilación.' },
];

export function DenunciaModal({ open, onClose }) {
  const [f, setF] = useState({ tipo: 'Persona que vacuna o atiende sin matrícula', lugar: '', descripcion: '', anonima: true });
  const [num, setNum] = useState(null);
  useEffect(() => { if (open) setNum(null); }, [open]);
  const send = async () => {
    if (!f.lugar.trim()) return toast('Indicá dónde ocurre', 'error');
    const r = await api.post('/public/denuncias', f); setNum(r.numero);
  };
  return (
    <Modal open={open} onClose={onClose} icon={<div className="av" style={{ background: 'var(--bad-l)', color: 'var(--bad)' }}>⚑</div>} title="Denuncia" subtitle="Llega directo a la bandeja del Colegio, con número de seguimiento.">
      {num ? <div style={{ textAlign: 'center', padding: '12px 0' }}><h3>Denuncia recibida</h3><p className="muted">Tu número de caso es <b className="mono">{num}</b>. Podés seguirlo con ese número.</p><button className="btn" onClick={onClose}>Listo</button></div> : <>
        <Field label="¿Qué querés denunciar?"><select value={f.tipo} onChange={e => setF({ ...f, tipo: e.target.value })}>{['Persona que vacuna o atiende sin matrícula', 'Establecimiento no habilitado', 'Venta o aplicación de medicamentos sin profesional', 'Otro'].map(x => <option key={x}>{x}</option>)}</select></Field>
        <Field label="Dónde ocurre"><input type="text" value={f.lugar} onChange={e => setF({ ...f, lugar: e.target.value })} placeholder="Dirección, feria, barrio o referencia" /></Field>
        <Field label="Contanos qué pasó"><textarea rows={3} value={f.descripcion} onChange={e => setF({ ...f, descripcion: e.target.value })} /></Field>
        <Switch checked={f.anonima} onChange={v => setF({ ...f, anonima: v })}>Quiero hacerla de forma anónima</Switch>
        <AsyncBtn className="btn btn-danger" onClick={send}>Enviar denuncia</AsyncBtn>
      </>}
    </Modal>
  );
}

export function Tramites() {
  const [sp] = useSearchParams();
  const [den, setDen] = useState(!!sp.get('denuncia'));
  return (
    <section className="sec" style={{ paddingTop: 30 }}><div className="wrap">
      <Kicker>Trámites online</Kicker>
      <h1 style={{ fontSize: 36, marginTop: 6 }}>Todo lo que hoy es un PDF o una visita a la sede, online y con seguimiento.</h1>
      <p className="muted">Cada trámite genera un número de seguimiento. El profesional ve en qué paso está y el Colegio gestiona todo desde una bandeja única.</p>
      <div className="grid g2" style={{ marginTop: 20 }}>{TRAMITES.map(t => (
        <Link key={t.k} className="card qa" to={t.pub ? '/inscripcion' : '/ingresar?rol=VET'}><div className="qt"><b>{t.t}</b><span className="muted small">{t.d}</span></div><span className="btn btn-sm">{t.pub ? 'Iniciar' : 'Iniciar con mi matrícula'}</span></Link>
      ))}</div>
      <h2 style={{ marginTop: 36 }}>Para la comunidad</h2>
      <div className="grid g3">
        <div className="card"><h3>Denunciar ejercicio ilegal o establecimiento no habilitado</h3><p className="muted small">Con ubicación y opción anónima. Recibís un número de caso.</p><button className="btn btn-danger" onClick={() => setDen(true)}>Hacer una denuncia</button></div>
        <div className="card"><h3>Verificar una matrícula</h3><p className="muted small">Escaneá el QR de la credencial o buscá el número.</p><Link className="btn" to="/verificar">Verificar</Link></div>
        <div className="card"><h3>Viajar con mascotas</h3><p className="muted small">Requisitos por destino y profesionales que emiten certificados.</p><Link className="btn" to="/viajar">Ver requisitos</Link></div>
      </div>
      <DenunciaModal open={den} onClose={() => setDen(false)} />
    </div></section>
  );
}

const PASOS = ['Datos personales', 'Título y antecedentes', 'Documentación', 'Pago', 'Listo'];
const DOCS = ['Título (frente y dorso)', 'DNI', 'Foto carnet', 'Certificado de antecedentes', 'Constancia de domicilio', 'Libre deuda de otro colegio (si corresponde)'];
export function Inscripcion() {
  const [step, setStep] = useState(0), [docs, setDocs] = useState({}), [res, setRes] = useState(null);
  const [f, setF] = useState({ nombre: 'Lautaro', apellido: 'Gómez', dni: '41.222.333', email: 'lautaro.gomez@mail.com', telefono: '261 555 0000', universidad: 'Universidad Juan Agustín Maza', egreso: '2026-07-15' });
  const inp = k => ({ value: f[k], onChange: e => setF({ ...f, [k]: e.target.value }) });
  const enviar = async () => { const r = await api.post('/public/inscripciones', f); setRes(r); setStep(4); };
  const nav = (label = 'Continuar', fn) => <div className="row between" style={{ marginTop: 14 }}>{step ? <button className="btn" onClick={() => setStep(step - 1)}>Volver</button> : <span />}{fn ? <AsyncBtn className="btn btn-primary" onClick={fn}>{label}</AsyncBtn> : <button className="btn btn-primary" onClick={() => setStep(step + 1)}>{label}</button>}</div>;
  return (
    <section className="sec" style={{ paddingTop: 30 }}><div className="wrap" style={{ maxWidth: 760 }}>
      <Kicker>Matriculación online</Kicker><h1 style={{ fontSize: 34, marginTop: 6 }}>Solicitud de matrícula</h1>
      <p className="muted">La solicitud llega al Colegio con la documentación completa y aparece en el tablero de inscripciones de la administración.</p>
      <div className="card">
        <div className="steps">{PASOS.map((_, i) => <span key={i} className={i <= step ? 'on' : ''} />)}</div>
        <div className="tiny muted" style={{ marginBottom: 10 }}>Paso {step + 1} de 5 · <b>{PASOS[step]}</b></div>
        {step === 0 && <><div className="grid g2" style={{ gap: 10 }}>
          <Field label="Nombre"><input type="text" {...inp('nombre')} /></Field><Field label="Apellido"><input type="text" {...inp('apellido')} /></Field>
          <Field label="DNI"><input type="text" {...inp('dni')} /></Field><Field label="Email"><input type="email" {...inp('email')} /></Field>
          <Field label="Celular"><input type="tel" {...inp('telefono')} /></Field></div>{nav()}</>}
        {step === 1 && <><div className="grid g2" style={{ gap: 10 }}>
          <Field label="Universidad"><select {...inp('universidad')}>{['Universidad Juan Agustín Maza', 'Universidad Nacional de Río Cuarto', 'Universidad Nacional de La Pampa', 'Universidad de Buenos Aires', 'Otra'].map(x => <option key={x}>{x}</option>)}</select></Field>
          <Field label="Fecha de egreso"><input type="date" {...inp('egreso')} /></Field></div>{nav()}</>}
        {step === 2 && <><div className="grid g2" style={{ gap: 10 }}>{DOCS.map(d => <div key={d} className={`upl ${docs[d] ? 'ok' : ''}`} onClick={() => setDocs({ ...docs, [d]: true })}>{docs[d] ? `✓ ${d}` : d}<div className="tiny">PDF o foto</div></div>)}</div>
          <p className="tiny muted" style={{ marginTop: 10 }}>Si falta algo, el Colegio lo pide dentro del mismo trámite, sin emails sueltos.</p>{nav()}</>}
        {step === 3 && <><div className="card flat" style={{ background: 'var(--plum-l)' }}><div className="row between"><b>Derecho de inscripción</b><b>$ 45.000</b></div><div className="row between small muted"><span>Primera cuota prorrateada</span><span>$ 18.500</span></div><hr className="s" /><div className="row between"><b>Total</b><b style={{ fontSize: 20 }}>$ 63.500</b></div></div>
          <p className="tiny muted">Importes de ejemplo. Simulación: no se realiza ningún cobro.</p>{nav('Pagar y enviar', enviar)}</>}
        {step === 4 && <div style={{ textAlign: 'center', padding: '16px 0' }}><div className="av lg" style={{ margin: '0 auto 12px', background: 'var(--ok-l)', color: 'var(--ok)' }}>✓</div><h2>Solicitud enviada</h2>
          <p className="muted">Trámite <b className="mono">{res?.numero}</b>. Vas a recibir avisos en cada paso: revisión documental, Comisión Directiva, registro en el Ministerio de Salud y emisión de tu credencial digital.</p>
          <Link className="btn btn-primary" to="/ingresar?rol=ADMIN">Ver cómo lo recibe el Colegio →</Link></div>}
      </div>
    </div></section>
  );
}

export function Institucional() {
  const cargos = ['Presidencia', 'Vicepresidencia', 'Secretaría', 'Tesorería'];
  return (
    <>
      <section className="ihero ihero-sm"><div className="wrap">
        <p className="ihero-org">Institucional</p>
        <h1>{BRAND.nombre}</h1>
        <p className="lead">Creado por la ley de colegiatura obligatoria, el Colegio matricula a quienes ejercen la medicina veterinaria en la provincia, aplica el Código de Ética, defiende las condiciones de trabajo de sus colegiados y contribuye a la salud de la comunidad.</p>
      </div></section>
      <section className="sec"><div className="wrap">
        <div className="sec-head"><h2>Comisión Directiva</h2></div>
        <div className="grid g4">{cargos.map(c => <div key={c} className="card autoridad"><div className="aut-foto" aria-hidden="true" /><b>{c}</b><span className="small muted">Nombre a cargar desde la administración</span></div>)}</div>
        <div className="grid g3" style={{ marginTop: 16 }}>
          {[['Asamblea', 'Órgano máximo del Colegio. Aprueba balances, cuotas y reglamentos.'], ['Tribunal de Disciplina', 'Juzga las faltas al Código de Ética y al ejercicio profesional.'], ['Tribunal Revisor de Cuentas', 'Controla la administración y los estados contables.']].map(([t, d]) => <div key={t} className="inst-item"><h3>{t}</h3><p className="small">{d}</p></div>)}
        </div>
      </div></section>
      <section className="sec sec-alt"><div className="wrap grid g2" style={{ alignItems: 'start' }}>
        <div>
          <h2>Legislación</h2>
          <ul className="doc-list">{[BRAND.ley, 'Estatuto del Colegio', 'Código de Ética', 'Reglamento de especialidades', 'Normativa de habilitación de establecimientos'].map(d => <li key={d}><span>{d}</span><span className="small muted">PDF</span></li>)}</ul>
          <p className="small"><Link className="lnk" to="/identidad-animal">Normativa sanitaria e identificación animal →</Link></p>
        </div>
        <div>
          <h2>Subcomisiones</h2>
          <ul className="doc-list">{['Formación Continua', 'Caninos y Felinos', 'Rumiantes', 'Equinos', 'Exóticos y No Convencionales', 'Salud Pública, Zoonosis y Tenencia Responsable', 'Jóvenes Profesionales'].map(d => <li key={d}><span>{d}</span></li>)}</ul>
        </div>
      </div></section>
      {!BRAND.demo && <section className="sec"><div className="wrap">
        <h2>Sede y atención</h2>
        <div className="card" style={{ maxWidth: 560 }}><p style={{ margin: 0 }}>{BRAND.sede}<br />{BRAND.horario}<br />{BRAND.tel} · {BRAND.mail}</p></div>
      </div></section>}
    </>
  );
}

export function Noticias() {
  const { data } = useApi('/public/noticias');
  const [cat, setCat] = useState('');
  const cats = [...new Set((data || []).map(n => n.categoria))];
  return (
    <section className="sec" style={{ paddingTop: 30 }}><div className="wrap">
      <Kicker>Noticias</Kicker><h1 style={{ fontSize: 36, marginTop: 6 }}>Novedades, formación, convenios y bolsa de trabajo</h1>
      <div style={{ margin: '12px 0 20px' }}><Seg value={cat} onChange={setCat} options={[['', 'Todas'], ...cats.map(c => [c, c])]} /></div>
      {!data ? <Spinner /> : <div className="grid g3">{data.filter(n => !cat || n.categoria === cat).map(n => <NewsCard key={n.id} n={n} />)}</div>}
    </div></section>
  );
}

export function Viajar() {
  const D = [['Dentro de Argentina', ['Libreta sanitaria con antirrábica vigente', 'Certificado de salud firmado por profesional matriculado', 'Consultar requisitos de la empresa de transporte']],
    ['A Chile (paso Cristo Redentor)', ['Antirrábica con más de 30 días', 'Certificado Veterinario Internacional (CVI) de SENASA', 'Desparasitación interna y externa según exigencia', 'Turno en SENASA con anticipación']],
    ['Otros países / avión', ['Identificación con microchip', 'Vacunas y serologías según país', 'CVI de SENASA y requisitos de la aerolínea']]];
  return (
    <section className="sec" style={{ paddingTop: 30 }}><div className="wrap" style={{ maxWidth: 920 }}>
      <Kicker>Servicios a la comunidad</Kicker><h1 style={{ fontSize: 36, marginTop: 6 }}>Viajar con tu mascota</h1>
      <p className="muted">Guía según el destino, con los certificados que emite un profesional matriculado.</p>
      <div className="grid g3" style={{ margin: '18px 0' }}>{D.map(([t, l]) => <div key={t} className="card"><h3>{t}</h3><ol className="small muted" style={{ paddingLeft: 18, margin: 0 }}>{l.map(x => <li key={x}>{x}</li>)}</ol></div>)}</div>
      <div className="card row between"><div><b>¿Necesitás el certificado?</b><div className="small muted">Buscá profesionales con turnos online y elegí «Certificado para viajar».</div></div><Link className="btn btn-primary" to="/directorio?turnos=1">Buscar y pedir turno</Link></div>
      <p className="tiny muted" style={{ marginTop: 12 }}>Contenido orientativo. Los requisitos oficiales los define SENASA y cada país de destino.</p>
    </div></section>
  );
}

export function Mapa() {
  const [sp] = useSearchParams();
  return (
    <section className="sec" style={{ padding: '26px 0 40px' }}><div className="wrap">
      <div className="shead"><div><Kicker>Mapa oficial</Kicker><h1 style={{ fontSize: 40, margin: '6px 0 0' }}>Establecimientos, guardias y turnos</h1></div><Link className="btn" to="/guardias">Ver tablero de guardia →</Link></div>
      <MapSection initialChip={sp.get('guardia') ? 'guardia' : sp.get('grandes') ? 'grandes' : 'all'} />
    </div></section>
  );
}

export function Guardias() {
  return (
    <section className="sec" style={{ paddingTop: 26 }}><div className="wrap">
      <div className="shead"><div><Kicker>Servicio a la comunidad</Kicker><h1 style={{ fontSize: 40, margin: '6px 0 0' }}>Tablero de guardia</h1>
        <p className="muted" style={{ maxWidth: 680, marginTop: 8 }}>Qué clínicas atienden urgencias ahora, en toda la provincia. Cada establecimiento declara su guardia desde el portal y el tablero se actualiza solo.</p></div>
        <Link className="btn" to="/mapa?guardia=1">Ver en el mapa</Link></div>
      <Board full />
      <div className="grid g3" style={{ marginTop: 22 }}>
        <div className="card"><span className="mono tiny muted">01</span><h3 style={{ marginTop: 4 }}>La clínica declara</h3><p className="small muted" style={{ margin: 0 }}>Desde su portal, en un toque: hoy guardia activa, pasiva o no.</p></div>
        <div className="card"><span className="mono tiny muted">02</span><h3 style={{ marginTop: 4 }}>La comunidad ve</h3><p className="small muted" style={{ margin: 0 }}>El tablero, el mapa y el botón de urgencia muestran sólo lo que está abierto, con llamada directa.</p></div>
        <div className="card"><span className="mono tiny muted">03</span><h3 style={{ marginTop: 4 }}>El Colegio coordina</h3><p className="small muted" style={{ margin: 0 }}>Ve las zonas sin cobertura (hoy, Este y Valle de Uco) y propone rotaciones entre establecimientos.</p></div>
      </div>
    </div></section>
  );
}

export function NotFound() {
  return <section className="sec"><div className="wrap" style={{ maxWidth: 640, textAlign: 'center' }}><Kicker>Error 404</Kicker><h1 style={{ fontSize: 40 }}>No encontramos esta página</h1><p className="muted">Puede que el enlace haya cambiado.</p><Link className="btn btn-primary" to="/">Ir al inicio</Link> <Badge cls="b-grey">ColVet Digital</Badge></div></section>;
}
