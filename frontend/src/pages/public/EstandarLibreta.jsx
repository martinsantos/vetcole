// Libreta sanitaria digital: bloque destacado de la portada y página del estándar abierto (LSAA).
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useApi } from '../../lib/api.js';
import { QR, verifyUrl, saveFile, Spinner } from '../../components/ui.jsx';
import { fdate, edad, chipFmt } from '../../lib/format.js';
import { CLAUDE } from '../../lib/base.js';
import schema from '../../../../estandar/libreta-sanitaria.schema.json';

export const REPO_ESTANDAR = 'https://github.com/martinsantos/vetcole/tree/main/estandar';

const PUNTOS = [
  ['Un microchip, un número', 'Identificación ISO 11784/11785, colocada y validada por un/a veterinario/a matriculado/a, como prevé el proyecto de registro provincial.'],
  ['Cada registro firmado', 'Vacunas, castración y certificados llevan la matrícula de quien los firmó, validada contra el padrón del Colegio.'],
  ['Un QR para verificar', 'Lo escanea la familia, el municipio o quien encuentra un animal perdido. Muestra sólo lo público.'],
  ['Abierto y portable', 'Formato libre que pueden usar consultorios, municipios y el futuro registro, sin volver a cargar datos.'],
];

// Libreta de ejemplo (Luna) con los datos reales de la demo.
function LibretaMuestra() {
  const { data: p } = useApi('/public/libretas/MZA-000231');
  if (!p) return <div className="lib-card lib-skel"><Spinner /></div>;
  const vacunas = p.eventos.filter(e => ['vac', 'des', 'cas', 'chip'].includes(e.tipo)).slice(0, 4);
  return (
    <Link to={`/libreta/${p.libreta}`} className="lib-card" aria-label={`Libreta sanitaria de ${p.nombre}`}>
      <div className="lib-head">
        <span>Libreta sanitaria digital</span>
        <span className="lib-num">{p.libreta}</span>
      </div>
      <div className="lib-body">
        <div className="lib-id">
          <div className="lib-avatar" aria-hidden="true">{p.nombre[0]}</div>
          <div>
            <b className="lib-name">{p.nombre}</b>
            <div className="small muted">{p.especie} · {p.raza} · {edad(p.nacimiento)}</div>
            {p.microchip && <div className="small">Microchip {chipFmt(p.microchip)}</div>}
          </div>
          <QR text={verifyUrl(`/libreta/${p.libreta}`)} size={72} />
        </div>
        <div className={`lib-estado ${p.estado.codigo}`}>✓ {p.estado.etiqueta}</div>
        <ul className="lib-ev">{vacunas.map(e => (
          <li key={e.id}><div><b>{e.titulo}</b>{e.firma?.mp && <span className="small muted">Firmó {e.firma.titulo} · MP {e.firma.mp}</span>}</div><span className="small">{fdate(e.fecha)}</span></li>
        ))}</ul>
      </div>
    </Link>
  );
}

// Bloque destacado de la portada.
export function LibretaDestacada() {
  const nav = useNavigate();
  const [q, setQ] = useState('');
  return (
    <section className="sec lib-band"><div className="wrap lib-grid">
      <div>
        <p className="ihero-org">Libreta sanitaria digital</p>
        <h2 className="lib-h2">Una libreta para cada animal, firmada por su veterinario/a</h2>
        <p className="lib-lead">Proponemos un estándar abierto para Mendoza, alineado con el proyecto de registro provincial de animales de compañía en discusión: el mismo formato para consultorios, municipios y el futuro registro.</p>
        <ul className="lib-puntos">{PUNTOS.map(([t, d]) => <li key={t}><b>{t}</b><span>{d}</span></li>)}</ul>
        <form className="lib-form" onSubmit={e => { e.preventDefault(); if (q.trim()) nav(`/libreta/${encodeURIComponent(q.trim())}`); }}>
          <input type="search" value={q} onChange={e => setQ(e.target.value)} placeholder="N.º de libreta o microchip (ej.: MZA-000231)" aria-label="Número de libreta o microchip" />
          <button className="btn btn-primary">Consultar</button>
        </form>
        <p className="small" style={{ marginTop: 12 }}><Link className="lnk" to="/estandar-libreta">Conocer el estándar abierto →</Link></p>
      </div>
      <LibretaMuestra />
    </div></section>
  );
}

const NIVELES = [
  ['Público', 'Quien escanea el QR', 'Animal, microchip, vacunas, desparasitaciones, castración, identificación y certificados, con su firma. Aviso de extravío.'],
  ['Tutor/a', 'La familia', 'Todo lo anterior, más consultas, cirugías, mordeduras y sus datos de contacto.'],
  ['Profesional', 'Veterinarios/as matriculados/as', 'La historia clínica completa.'],
  ['Autoridad', 'Zoonosis y registro provincial', 'Identificación, tutor/a, antirrábica, mordeduras y peligrosidad, según la reglamentación.'],
];
const EJEMPLOS = [['MZA-000231', 'Luna (canino)'], ['MZA-000198', 'Michi (felino)'], ['EQ-000017', 'Tormenta (equino)']];

// Página del estándar abierto.
export default function EstandarLibreta() {
  const [ej, setEj] = useState(EJEMPLOS[0][0]);
  const { data } = useApi(`/public/libretas/${ej}/estandar`);
  const json = data ? JSON.stringify(data, null, 2) : '';
  const bajar = (nombre, texto) => (CLAUDE ? saveFile(nombre, texto, 'application/json') : (() => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([texto], { type: 'application/json' })); a.download = nombre; a.click(); })());
  return (
    <>
      <section className="ihero ihero-sm"><div className="wrap">
        <p className="ihero-org">Estándar abierto · borrador 0.1</p>
        <h1>Libreta Sanitaria Animal Abierta</h1>
        <p className="lead">Un formato libre para que la libreta de cada animal pase del consultorio al municipio y al registro provincial sin volver a cargar datos y sin perder la firma de quien los registró. Es una propuesta para la discusión del registro provincial de animales de compañía en Mendoza, no una norma oficial.</p>
        <div className="row" style={{ gap: 10 }}>
          <button className="btn btn-primary" onClick={() => bajar('libreta-sanitaria.schema.json', JSON.stringify(schema, null, 2))}>Descargar el esquema (JSON)</button>
          {!CLAUDE && <a className="btn" href={REPO_ESTANDAR} target="_blank" rel="noopener noreferrer">Ver en GitHub</a>}
        </div>
      </div></section>

      <section className="sec"><div className="wrap">
        <div className="sec-head"><h2>Principios</h2></div>
        <div className="grid g4">{PUNTOS.map(([t, d]) => <div key={t} className="card"><h3>{t}</h3><p className="small muted" style={{ margin: 0 }}>{d}</p></div>)}</div>
      </div></section>

      <section className="sec sec-alt"><div className="wrap grid g2" style={{ alignItems: 'start' }}>
        <div>
          <div className="sec-head"><h2>Qué ve cada uno</h2></div>
          <div className="tblwrap"><table className="tbl"><thead><tr><th>Nivel</th><th>Quién</th><th>Qué incluye</th></tr></thead>
            <tbody>{NIVELES.map(([n, q, d]) => <tr key={n}><td><b>{n}</b></td><td className="small">{q}</td><td className="small">{d}</td></tr>)}</tbody></table></div>
        </div>
        <div>
          <div className="sec-head"><h2>Convive con lo que existe</h2></div>
          <ul className="doc-list">
            <li><span><b>LUSCyF.</b> Guarda el número de sticker de cada vacuna de la libreta en papel, que el Colegio reconoce como certificado válido (Res. 36/22).</span></li>
            <li><span><b>LSED de SENASA.</b> Para equinos, guarda el número de la Libreta Sanitaria Equina Digital.</span></li>
            <li><span><b>Credencial municipal.</b> Vincula el número de credencial de zoonosis de cada municipio.</span></li>
            <li><span><b>Registro provincial.</b> Si se aprueba, recibe los datos en este formato desde la plataforma.</span></li>
          </ul>
        </div>
      </div></section>

      <section className="sec"><div className="wrap">
        <div className="sec-head"><h2>Ejemplo en vivo</h2><span className="small muted">GET /api/v1/public/libretas/{'{numero}'}/estandar</span></div>
        <div className="row" style={{ gap: 8, marginBottom: 12 }}>
          {EJEMPLOS.map(([k, l]) => <button key={k} type="button" className={`chip ${ej === k ? 'on' : ''}`} onClick={() => setEj(k)}>{l}</button>)}
          {data && <button type="button" className="btn btn-sm" style={{ marginLeft: 'auto' }} onClick={() => bajar(`${ej.toLowerCase()}.lsaa.json`, json)}>Descargar este ejemplo</button>}
        </div>
        {data ? <pre className="json" tabIndex={0} aria-label="Documento de ejemplo en formato LSAA">{json}</pre> : <Spinner />}
      </div></section>

      <section className="sec sec-alt"><div className="wrap grid g2" style={{ alignItems: 'start' }}>
        <div>
          <div className="sec-head"><h2>Temas abiertos</h2></div>
          <ul className="doc-list">
            <li><span>Quién emite el número de libreta cuando exista el registro provincial.</span></li>
            <li><span>Qué datos del tutor/a recibe el registro y por cuánto tiempo se conservan.</span></li>
            <li><span>Si las mordeduras deben verse cuando alguien encuentra un animal perdido.</span></li>
            <li><span>Firma digital con certificado, además de la matrícula validada.</span></li>
            <li><span>Intercambio con la LSED de SENASA y con registros de otras provincias.</span></li>
          </ul>
        </div>
        <div>
          <div className="sec-head"><h2>Licencia y participación</h2></div>
          <p>La especificación, el esquema y los ejemplos se publican con licencia <b>Creative Commons Atribución 4.0</b>; el código de referencia, con licencia <b>MIT</b>. Cualquier colegio, municipio o software veterinario puede usarlos.</p>
          <p className="small muted">Las propuestas de cambio se hacen en el repositorio público del proyecto, con un <i>issue</i> o un <i>pull request</i>.</p>
        </div>
      </div></section>
    </>
  );
}
