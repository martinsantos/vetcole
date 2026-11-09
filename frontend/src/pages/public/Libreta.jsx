// Libreta sanitaria digital pública: consulta por N° de libreta o microchip, vista para quien escanea el QR.
import { BRAND } from '../../lib/brand.js';
import { CLAUDE } from '../../lib/base.js';
import { LOGO, saveFile } from '../../components/ui.jsx';
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
  const pub = p.eventos;
  const grupos = [['Vacunas', ['vac']], ['Desparasitaciones', ['des']], ['Identificación y cirugías', ['chip', 'cas']], ['Análisis y certificados', ['lab', 'via']]].map(([t, tipos]) => [t, pub.filter(e => tipos.includes(e.tipo))]).filter(([, l]) => l.length);
  const bajarJson = async () => {
    const doc = await api.get(`/public/libretas/${p.libreta}/estandar`);
    const txt = JSON.stringify(doc, null, 2), nombre = `${p.libreta.toLowerCase()}.lsaa.json`;
    if (CLAUDE) return saveFile(nombre, txt, 'application/json');
    const el = document.createElement('a'); el.href = URL.createObjectURL(new Blob([txt], { type: 'application/json' })); el.download = nombre; el.click();
  };
  return (
    <section className="sec ldoc-bg" style={{ paddingTop: 22 }}><div className="wrap" style={{ maxWidth: 980 }}>
      <Link to="/libreta" className="small">← Consultar otra libreta</Link>
      {p.perdido && (
        <div className="lostban" style={{ marginTop: 10 }}><div><b>¡Me perdí!</b> Si encontraste a {p.nombre}, avisale a su familia. Su número no se muestra: el mensaje llega por el Colegio.</div>
          <AsyncBtn className="btn btn-light" onClick={async () => { await api.post(`/public/libretas/${p.libreta}/aviso`, {}); toast(`Mensaje enviado a la familia de ${p.nombre}. ¡Gracias por avisar!`); }}>Avisar a su familia</AsyncBtn></div>
      )}
      <article className="ldoc">
        <header className="ldoc-head">
          <img src={LOGO} alt="" />
          <div><b>Libreta sanitaria animal</b><span>{BRAND.nombre}</span></div>
          <div className="ldoc-num"><span>Libreta N.º</span><b>{p.libreta}</b></div>
        </header>

        <div className={`ldoc-estado ${p.estado.codigo}`}>
          <div><b>{p.estado.codigo === 'al_dia' ? '✓ ' : ''}{p.estado.etiqueta}</b>{p.estado.vence && <span>Próximo refuerzo: {fdate(p.estado.vence)}</span>}</div>
          <span className="ldoc-firma-ok">Todos los registros están firmados por profesionales con matrícula verificada</span>
        </div>

        <div className="ldoc-id">
          <div className="ldoc-id-main">
            <h1>{p.nombre}</h1>
            <dl>
              <div><dt>Especie</dt><dd>{p.especie}</dd></div>
              <div><dt>Raza</dt><dd>{p.raza}</dd></div>
              <div><dt>Sexo</dt><dd>{p.sexo}{p.castrado ? ' · castrado/a' : ''}</dd></div>
              <div><dt>Nacimiento</dt><dd>{fdate(p.nacimiento)} ({edad(p.nacimiento)})</dd></div>
              <div><dt>Pelaje</dt><dd>{p.pelaje || '—'}</dd></div>
              <div><dt>Microchip ISO 11784/11785</dt><dd className="ldoc-chip">{p.microchip ? chipFmt(p.microchip) : 'Sin microchip'}</dd></div>
              <div><dt>Tutor/a</dt><dd>{p.tutorInicial} · datos protegidos</dd></div>
              {p.vetCabecera && <div><dt>Veterinario/a de cabecera</dt><dd><Link to={`/profesional/${p.vetCabecera.mp}`}>{p.vetCabecera.titulo}</Link> · MP {p.vetCabecera.mp}</dd></div>}
              {p.municipio && <div><dt>Credencial municipal</dt><dd>{p.municipio.nombre} · {p.municipio.sigla} N.º {p.municipio.nro}</dd></div>}
            </dl>
          </div>
          <div className="ldoc-qr"><QR text={verifyUrl(`/libreta/${p.libreta}`)} size={120} /><span>Escaneá para verificar esta libreta</span></div>
        </div>

        {grupos.map(([titulo, lista]) => (
          <section key={titulo} className="ldoc-sec">
            <h2>{titulo}</h2>
            <table className="ldoc-tbl"><thead><tr><th>Fecha</th><th>Registro</th><th>Firma</th><th>Próximo</th></tr></thead><tbody>
              {lista.map(e => (
                <tr key={e.id}>
                  <td>{fdate(e.fecha)}</td>
                  <td><b>{e.titulo}</b>{e.detalle && <span>{e.detalle}</span>}{e.tipo === 'via' && <button className="btn btn-sm" style={{ marginTop: 6 }} onClick={() => setCert(e)}>Ver certificado</button>}</td>
                  <td>{e.firma?.mp ? <span className="sello"><b>{e.firma.titulo}</b><span>Matrícula {e.firma.mp} · verificada</span></span> : e.firma?.zoonosis ? <span className="sello muni"><b>Zoonosis {e.firma.zoonosis}</b><span>Servicio municipal</span></span> : '—'}</td>
                  <td>{e.proximo ? fdate(e.proximo) : '—'}</td>
                </tr>
              ))}
            </tbody></table>
          </section>
        ))}

        <footer className="ldoc-foot">
          <div>
            <b>Datos abiertos</b>
            <p>Esta libreta sigue el estándar abierto <Link to="/estandar-libreta">Libreta Sanitaria Animal Abierta (LSAA 0.1)</Link>: cualquier consultorio, municipio o registro puede leerla sin volver a cargar los datos. Acá se muestra el nivel público: no incluye datos del tutor/a, consultas ni mordeduras.</p>
          </div>
          <div className="row" style={{ gap: 8 }}>
            <AsyncBtn className="btn" onClick={bajarJson}>Descargar en formato abierto (JSON)</AsyncBtn>
            <Link className="btn" to="/estandar-libreta">Ver el estándar</Link>
          </div>
        </footer>
      </article>

      <div className="row" style={{ marginTop: 16, gap: 8 }}>
        {p.vetCabecera?.turnosOnline && <AsyncBtn className="btn btn-primary" onClick={pedirTurno}>Pedir turno con {p.vetCabecera.titulo}</AsyncBtn>}
        <button className="btn wbtn" onClick={() => toast('Libreta agregada a Google Wallet (demo)')}>Google Wallet</button>
        <button className="btn wbtn" onClick={() => toast('Libreta agregada a Apple Wallet (demo)')}>Apple Wallet</button>
        <Link className="btn" to="/viajar">Voy a viajar</Link>
      </div>
      <p className="tiny muted" style={{ marginTop: 10 }}>Consultada el {new Date().toLocaleString('es-AR')}. Las consultas e incidentes sólo los ven la familia (desde su app) y los profesionales.</p>
      <CertViajeModal libreta={p} evento={cert} onClose={() => setCert(null)} />
      {t.modal}
    </div></section>
  );
}
