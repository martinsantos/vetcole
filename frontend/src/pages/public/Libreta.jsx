// Libreta sanitaria digital pública: consulta por N° de libreta o microchip, vista para quien escanea el QR.
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api, useApi } from '../../lib/api.js';
import { Badge, Kicker, QR, Spinner, Timeline, verifyUrl, toast, AsyncBtn } from '../../components/ui.jsx';
import { chipFmt, edad, estadoCls, fdate, EVT } from '../../lib/format.js';
import { CertViajeModal, useTurno, cached } from './shared.jsx';

const EJEMPLOS = [['MZA-000231', 'Luna (canino)'], ['032097000198877', 'Michi (felino, por microchip)'], ['EQ-000017', 'Tormenta (equino)'], ['MZA-000145', 'Rocco (antirrábica vencida)']];

function Lookup() {
  const nav = useNavigate();
  const [q, setQ] = useState('');
  return (
    <>
      <section className="libband"><div className="wrap libgrid">
        <div>
          <Kicker>Libreta sanitaria digital</Kicker>
          <h1 style={{ marginTop: 10 }}>La libreta de tu mascota, en tu celular y firmada por su veterinario/a.</h1>
          <p>Ingresá el número de libreta o de microchip, o escaneá el QR de la libreta o del sticker de vacunación.</p>
          <form className="libform" onSubmit={e => { e.preventDefault(); if (q.trim()) nav(`/libreta/${encodeURIComponent(q.trim())}`); }}>
            <input type="search" value={q} onChange={e => setQ(e.target.value)} placeholder="Ej.: MZA-000231 o 032097000123456" /><button className="btn btn-primary">Consultar</button>
          </form>
          <div className="tiny" style={{ marginTop: 12, color: 'var(--ink-3)' }}>Probá: {EJEMPLOS.map(([k, l], i) => <span key={k}>{i ? ' · ' : ''}<Link to={`/libreta/${k}`} style={{ color: 'var(--plum)' }}>{l}</Link></span>)}</div>
        </div>
        <div className="card" style={{ color: 'var(--ink)' }}>
          <Kicker>Cómo funciona</Kicker>
          <ol className="small" style={{ paddingLeft: 18, margin: '10px 0 0' }}>
            <li>El veterinario/a matriculado/a registra cada vacuna, desparasitación o castración desde su consultorio.</li>
            <li>El registro queda firmado con su matrícula y se ve acá, en la app del tutor y, si corresponde, en el panel de zoonosis del municipio.</li>
            <li>Quien escanea el QR ve vacunas y microchip. Las consultas e incidentes sólo los ven la familia y los profesionales.</li>
          </ol>
        </div>
      </div></section>
      <section className="sec"><div className="wrap"><div className="grid g3">
        <div className="card"><span className="mono tiny muted">Familias</span><h3 style={{ margin: '6px 0 4px' }}>Siempre a mano</h3><p className="small muted" style={{ margin: 0 }}>Vacunas y desparasitaciones con recordatorio, aunque cambies de veterinaria o pierdas la libreta de papel.</p></div>
        <div className="card"><span className="mono tiny muted">Veterinarios/as</span><h3 style={{ margin: '6px 0 4px' }}>Emisión gratuita</h3><p className="small muted" style={{ margin: 0 }}>Cada matriculado/a la emite desde su consultorio digital o desde su propio software. Quien vacuna sin matrícula no puede emitirla.</p></div>
        <div className="card"><span className="mono tiny muted">Municipios</span><h3 style={{ margin: '6px 0 4px' }}>Datos confiables</h3><p className="small muted" style={{ margin: 0 }}>Cobertura antirrábica, castraciones y mordeduras por zona, con la credencial municipal del animal.</p></div>
      </div></div></section>
    </>
  );
}

export default function Libreta() {
  const { q } = useParams();
  if (!q) return <Lookup />;
  return <LibretaView q={q} />;
}

function LibretaView({ q }) {
  const { data: p, loading, error } = useApi(`/public/libretas/${encodeURIComponent(q)}`);
  const [cert, setCert] = useState(null);
  const t = useTurno();
  if (loading) return <Spinner />;
  if (error) return (
    <section className="sec"><div className="wrap" style={{ maxWidth: 760 }}><div className="card"><h2>No encontramos esa libreta</h2><p className="muted">{error} Revisá el número o el microchip. Probá con MZA-000231.</p><Link className="btn" to="/libreta">Volver</Link></div></div></section>
  );
  const pedirTurno = async () => {
    const v = await cached(`/public/vets/${p.vetCabecera.mp}`);
    if (!t.forVet(v)) toast('Su veterinaria no tiene turnos online. Llamala desde el directorio.', 'error');
  };
  return (
    <section className="sec" style={{ paddingTop: 26 }}><div className="wrap">
      <Link to="/libreta" className="small">← Consultar otra libreta</Link>
      <div className="shead" style={{ marginTop: 8 }}><div><Kicker>Libreta sanitaria digital</Kicker><h1 style={{ fontSize: 44, margin: '6px 0 0' }}>{p.nombre}</h1></div></div>
      {p.perdido && (
        <div className="lostban"><div><b>¡Me perdí!</b> Si encontraste a {p.nombre}, avisale a su familia. Su número no se muestra: el mensaje llega por el Colegio.</div>
          <AsyncBtn className="btn btn-light" onClick={async () => { await api.post(`/public/libretas/${p.libreta}/aviso`, {}); toast(`Mensaje enviado a la familia de ${p.nombre}. ¡Gracias por avisar!`); }}>Avisar a su familia</AsyncBtn></div>
      )}
      <div className="lst" style={{ marginBottom: 16 }}>
        <Badge cls={estadoCls(p.estado.codigo)}>{p.estado.etiqueta}{p.estado.vence ? ` · ${fdate(p.estado.vence)}` : ''}</Badge>
        <Badge cls="b-ok">✓ Registros firmados por profesionales matriculados</Badge>
        {p.castrado && <Badge cls="b-grey">Castrado/a</Badge>}
        {p.municipio && <Badge style={{ background: p.municipio.color, color: '#fff' }}>{p.municipio.sigla} · {p.municipio.credencial} N° {p.municipio.nro}</Badge>}
      </div>
      <div className="libdet">
        <div className="petcard">
          <div className="pethead"><div className="petav">{p.nombre[0]}</div><div style={{ flex: 1, minWidth: 0 }}><div className="mono tiny muted">{p.especie.slice(0, 3).toUpperCase()} · {p.libreta}</div><h3 style={{ margin: '2px 0 0', fontSize: 22 }}>{p.nombre}</h3><div className="small muted">{p.raza} · {p.sexo} · {edad(p.nacimiento)}</div></div><QR text={verifyUrl(`/libreta/${p.libreta}`)} size={72} /></div>
          <div className="facts">
            <div><span>Especie</span><b>{p.especie}</b></div><div><span>Nacimiento</span><b>{fdate(p.nacimiento)}</b></div>
            <div><span>Pelaje</span><b>{p.pelaje || '—'}</b></div><div><span>Castrado/a</span><b>{p.castrado ? 'Sí' : 'No'}</b></div>
            <div style={{ gridColumn: '1/-1' }}><span>Microchip ISO 11784/85</span><b className="mono">{p.microchip ? chipFmt(p.microchip) : 'Sin microchip'}</b></div>
            <div style={{ gridColumn: '1/-1' }}><span>Tutor/a</span><b>{p.tutorInicial} (datos protegidos)</b></div>
            {p.vetCabecera && <div style={{ gridColumn: '1/-1' }}><span>Veterinario/a de cabecera</span><b>{p.vetCabecera.titulo} · <Link to={`/verificar/${p.vetCabecera.mp}`}>MP {p.vetCabecera.mp}</Link></b></div>}
          </div>
        </div>
        <div>
          <div className="card"><h3>Vacunas, microchip y controles</h3><Timeline eventos={p.eventos} onCert={e => setCert(e)} />
            <p className="tiny muted" style={{ margin: '10px 0 0' }}>Las consultas e incidentes sólo los ven la familia (desde su app) y los profesionales.</p></div>
          <div className="row" style={{ marginTop: 14 }}>
            {p.vetCabecera?.turnosOnline && <AsyncBtn className="btn btn-primary" onClick={pedirTurno}>Pedir turno con {p.vetCabecera.titulo}</AsyncBtn>}
            <button className="btn wbtn" onClick={() => toast('Libreta agregada a Google Wallet (demo)')}>Google Wallet</button>
            <button className="btn wbtn" onClick={() => toast('Libreta agregada a Apple Wallet (demo)')}>Apple Wallet</button>
            <Link className="btn" to="/viajar">Voy a viajar</Link>
          </div>
          <div className="tiny muted" style={{ marginTop: 10 }}>Tipos de registro: {Object.values(EVT).map(e => e[1]).join(' · ')}.</div>
        </div>
      </div>
      <CertViajeModal libreta={p} evento={cert} onClose={() => setCert(null)} />
      {t.modal}
    </div></section>
  );
}
