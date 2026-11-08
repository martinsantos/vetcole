// Pacientes e historia clínica. La historia clínica ES la libreta sanitaria: lo público lo ve el tutor/a.
import { useState } from 'react';
import { LOGO } from '../../components/ui.jsx';
import { url } from '../../lib/base.js';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api, useApi } from '../../lib/api.js';
import { fdate, ftime, chipFmt, edad, estadoCls, isoDate, EVT, DEPTOS } from '../../lib/format.js';
import { PageHead, Spinner, ErrorBox, Modal, Field, AsyncBtn, toast, Badge, Empty, Switch, QR, verifyUrl, Timeline } from '../../components/ui.jsx';
import { TurnoBadge } from './shared.jsx';

export function Pacientes() {
  const [q, setQ] = useState('');
  const { data, loading, error, reload } = useApi(`/clinic/pacientes?q=${encodeURIComponent(q)}`, [q]);
  const [nuevo, setNuevo] = useState(false), [buscar, setBuscar] = useState(false);
  const nav = useNavigate();
  return (
    <>
      <PageHead kicker="Historia clínica = libreta sanitaria digital" title="Pacientes">
        <button className="btn" onClick={() => setBuscar(true)}>Buscar libreta de la provincia</button>
        <button className="btn btn-primary" onClick={() => setNuevo(true)}>+ Nuevo paciente</button>
      </PageHead>
      <input type="search" placeholder="Buscar por nombre, N° de libreta, microchip, tutor/a o DNI" value={q} onChange={e => setQ(e.target.value)} style={{ marginBottom: 12 }} />
      {error ? <ErrorBox error={error} onRetry={reload} /> : !data ? <Spinner /> : (
        <div className="tblwrap"><table className="tbl">
          <thead><tr><th>Paciente</th><th>Especie</th><th>Tutor/a</th><th>Microchip</th><th>Estado sanitario</th><th>Último registro</th><th /></tr></thead>
          <tbody>
            {data.map(p => (
              <tr key={p.id} style={{ cursor: 'pointer' }} onClick={() => nav(`/vet/consultorio/pacientes/${p.id}`)}>
                <td><b>{p.nombre}</b>{p.perdido && <> <Badge cls="b-bad">Perdido/a</Badge></>}<div className="tiny muted mono">{p.libreta}</div></td>
                <td className="small">{p.especie}<div className="tiny muted">{p.raza} · {p.sexo}</div></td>
                <td className="small">{p.tutor.nombre}<div className="tiny muted">{p.tutor.telefono}</div></td>
                <td className="mono tiny">{p.microchip ? chipFmt(p.microchip) : '—'}</td>
                <td><Badge cls={estadoCls(p.estado.codigo)}>{p.estado.etiqueta}</Badge></td>
                <td className="small">{p.ultimo ? `${EVT[p.ultimo.tipo]?.[1] || p.ultimo.tipo} · ${fdate(p.ultimo.fecha)}` : '—'}</td>
                <td style={{ textAlign: 'right' }}><span className="btn btn-sm">Abrir →</span></td>
              </tr>
            ))}
            {!data.length && <tr><td colSpan={7}><Empty>No hay pacientes con esa búsqueda.</Empty></td></tr>}
          </tbody>
        </table></div>
      )}
      <NuevoPaciente open={nuevo} onClose={() => setNuevo(false)} onSaved={a => nav(`/vet/consultorio/pacientes/${a.id}`)} />
      <BuscarLibreta open={buscar} onClose={() => setBuscar(false)} onLinked={id => nav(`/vet/consultorio/pacientes/${id}`)} />
    </>
  );
}

function NuevoPaciente({ open, onClose, onSaved }) {
  const [a, setA] = useState({ nombre: '', especie: 'Canino', raza: '', sexo: 'Macho', nacimiento: isoDate(new Date(Date.now() - 365 * 864e5)), pelaje: '', microchip: '', castrado: false });
  const [t, setT] = useState({ nombre: '', dni: '', telefono: '', email: '', departamento: 'Capital' });
  const save = async () => {
    const r = await api.post('/clinic/pacientes', { ...a, tutor: t });
    toast(`Libreta ${r.libreta} creada`); onClose(); onSaved(r);
  };
  return (
    <Modal open={open} onClose={onClose} title="Nuevo paciente" subtitle="Se crea su libreta sanitaria digital única en la provincia">
      <div className="grid g2" style={{ gap: 10 }}>
        <Field label="Nombre"><input value={a.nombre} onChange={e => setA({ ...a, nombre: e.target.value })} /></Field>
        <Field label="Especie"><select value={a.especie} onChange={e => setA({ ...a, especie: e.target.value })}><option>Canino</option><option>Felino</option><option>Equino</option></select></Field>
        <Field label="Raza"><input value={a.raza} onChange={e => setA({ ...a, raza: e.target.value })} placeholder="Mestizo" /></Field>
        <Field label="Sexo"><select value={a.sexo} onChange={e => setA({ ...a, sexo: e.target.value })}><option>Macho</option><option>Hembra</option></select></Field>
        <Field label="Nacimiento (aprox.)"><input type="date" value={a.nacimiento} onChange={e => setA({ ...a, nacimiento: e.target.value })} /></Field>
        <Field label="Pelaje"><input value={a.pelaje} onChange={e => setA({ ...a, pelaje: e.target.value })} /></Field>
      </div>
      <Field label="Microchip (opcional)"><input value={a.microchip} onChange={e => setA({ ...a, microchip: e.target.value })} placeholder="15 dígitos" /></Field>
      <Switch checked={a.castrado} onChange={v => setA({ ...a, castrado: v })}>Castrado/a</Switch>
      <div className="tiny muted mono" style={{ margin: '10px 0 8px' }}>TUTOR/A (si ya existe por DNI, se reutiliza)</div>
      <div className="grid g2" style={{ gap: 10 }}>
        <Field label="Nombre y apellido"><input value={t.nombre} onChange={e => setT({ ...t, nombre: e.target.value })} /></Field>
        <Field label="DNI"><input value={t.dni} onChange={e => setT({ ...t, dni: e.target.value.replace(/\D/g, '') })} /></Field>
        <Field label="WhatsApp"><input value={t.telefono} onChange={e => setT({ ...t, telefono: e.target.value })} /></Field>
        <Field label="Departamento"><select value={t.departamento} onChange={e => setT({ ...t, departamento: e.target.value })}>{DEPTOS.map(d => <option key={d}>{d}</option>)}</select></Field>
      </div>
      <AsyncBtn className="btn btn-primary" onClick={save}>Crear libreta</AsyncBtn>
    </Modal>
  );
}

function BuscarLibreta({ open, onClose, onLinked }) {
  const [q, setQ] = useState(''), [res, setRes] = useState(null), [err, setErr] = useState(null);
  const buscar = async () => { setErr(null); setRes(null); try { setRes(await api.get(`/clinic/pacientes/buscar-libreta/${encodeURIComponent(q.trim())}`)); } catch (e) { setErr(e.message); } };
  const vincular = async () => { await api.post(`/clinic/pacientes/${res.id}/vincular`); toast(`${res.nombre} vinculado a tu consultorio`); onClose(); onLinked(res.id); };
  return (
    <Modal open={open} onClose={onClose} title="Buscar libreta de la provincia" subtitle="Un paciente que viene de otra veterinaria, una guardia o zoonosis: su historial lo sigue">
      <form className="row" onSubmit={e => { e.preventDefault(); buscar(); }}><input style={{ flex: 1 }} value={q} onChange={e => setQ(e.target.value)} placeholder="Ej.: EQ-000017 o 032098000555017" /><button className="btn btn-primary">Buscar</button></form>
      {err && <div className="note" style={{ marginTop: 12 }}>{err}</div>}
      {res && (
        <div className="card flat" style={{ marginTop: 12 }}>
          <div className="row between"><div><b>{res.nombre}</b> · {res.especie} · {res.raza}<div className="tiny muted mono">{res.libreta}</div><div className="small">Tutor/a: {res.tutor.nombre}</div></div><Badge cls={estadoCls(res.estado.codigo)}>{res.estado.etiqueta}</Badge></div>
          <AsyncBtn className="btn btn-primary" style={{ marginTop: 10 }} onClick={vincular}>Vincular a mi consultorio</AsyncBtn>
        </div>
      )}
    </Modal>
  );
}

const VACUNAS = { Canino: ['Antirrábica', 'Séxtuple', 'Óctuple', 'Tos de las perreras'], Felino: ['Antirrábica', 'Triple felina', 'Leucemia felina'], Equino: ['Influenza equina', 'Encefalomielitis equina', 'Tétanos', 'Rinoneumonitis'] };
const DEFAULT_TIT = { vac: '', des: 'Desparasitación interna', cas: 'Castración', chip: 'Microchip colocado', con: 'Consulta', lab: 'Análisis', inc: 'Mordedura', via: 'Certificado de viaje', cir: 'Cirugía' };
const MESES_PROX = { vac: 12, des: 3, lab: 12 };

function RegistroModal({ tipo, paciente, onClose, onSaved }) {
  const k = EVT[tipo] || [];
  const prox = MESES_PROX[tipo] ? (() => { const d = new Date(); d.setMonth(d.getMonth() + MESES_PROX[tipo]); return isoDate(d); })() : '';
  const [f, setF] = useState({ titulo: tipo === 'vac' ? (VACUNAS[paciente.especie] || VACUNAS.Canino)[0] : DEFAULT_TIT[tipo], fecha: isoDate(new Date()), detalle: tipo === 'chip' ? paciente.microchip || '' : '', diagnostico: '', tratamiento: '', peso: paciente.peso || '', temperatura: '', lote: '', proximo: prox, publico: tipo !== 'con', sticker: tipo === 'vac' && paciente.especie !== 'Equino' });
  const s = (key, v) => setF(x => ({ ...x, [key]: v }));
  const save = async () => {
    const body = { tipo, titulo: f.titulo, fecha: f.fecha, detalle: tipo === 'vac' && f.lote ? `Lote ${f.lote}${f.detalle ? ' · ' + f.detalle : ''}` : f.detalle, publico: f.publico, proximo: f.proximo || undefined };
    if (tipo === 'vac') { body.lote = f.lote; body.sticker = f.sticker; }
    if (['con', 'cir'].includes(tipo)) Object.assign(body, { diagnostico: f.diagnostico, tratamiento: f.tratamiento, peso: f.peso || undefined, temperatura: f.temperatura || undefined });
    if (tipo === 'des' && f.peso) body.peso = f.peso;
    await api.post(`/clinic/pacientes/${paciente.id}/eventos`, body);
    toast(`Registrado y firmado con tu matrícula. ${paciente.tutor.nombre} lo ve en su libreta.`); onSaved(); onClose();
  };
  return (
    <Modal open onClose={onClose} icon={<span className="evk" style={{ background: k[2], width: 56 }}>{k[0]}</span>} title={`${k[1]} · ${paciente.nombre}`} subtitle={`Libreta ${paciente.libreta} · se firma con tu matrícula`}>
      <Field label="Fecha"><input type="date" value={f.fecha} onChange={e => s('fecha', e.target.value)} /></Field>
      {tipo === 'vac' ? (
        <>
          <Field label="Vacuna"><select value={f.titulo} onChange={e => s('titulo', e.target.value)}>{(VACUNAS[paciente.especie] || VACUNAS.Canino).map(v => <option key={v}>{v}</option>)}</select></Field>
          <div className="grid g2" style={{ gap: 10 }}><Field label="Lote"><input value={f.lote} onChange={e => s('lote', e.target.value)} placeholder="L-26-..." /></Field><Field label="Laboratorio / detalle"><input value={f.detalle} onChange={e => s('detalle', e.target.value)} /></Field></div>
          {paciente.especie !== 'Equino' && <Switch checked={f.sticker} onChange={v => s('sticker', v)}>Asignar sticker LUSCyF numerado</Switch>}
        </>
      ) : tipo === 'chip' ? (
        <Field label="Número de microchip"><div className="row" style={{ flexWrap: 'nowrap' }}><input value={f.detalle} onChange={e => s('detalle', e.target.value)} placeholder="15 dígitos" /><button type="button" className="btn btn-sm" onClick={() => s('detalle', '032097' + String(Date.now()).slice(-9))}>Leer con lector</button></div></Field>
      ) : (
        <Field label={tipo === 'lab' ? 'Análisis y resultado' : tipo === 'via' ? 'Título' : 'Motivo / título'}><input value={f.titulo} onChange={e => s('titulo', e.target.value)} /></Field>
      )}
      {['con', 'cir'].includes(tipo) && (
        <>
          <div className="grid g2" style={{ gap: 10 }}><Field label="Peso (kg)"><input type="number" step="0.1" value={f.peso} onChange={e => s('peso', e.target.value)} /></Field><Field label="Temperatura (°C)"><input type="number" step="0.1" value={f.temperatura} onChange={e => s('temperatura', e.target.value)} /></Field></div>
          <Field label="Diagnóstico"><input value={f.diagnostico} onChange={e => s('diagnostico', e.target.value)} /></Field>
          <Field label="Tratamiento"><textarea rows={2} value={f.tratamiento} onChange={e => s('tratamiento', e.target.value)} /></Field>
        </>
      )}
      {tipo === 'des' && <Field label="Peso (kg)"><input type="number" step="0.1" value={f.peso} onChange={e => s('peso', e.target.value)} /></Field>}
      {!['vac', 'chip'].includes(tipo) && <Field label={tipo === 'via' ? 'Destino y observaciones' : tipo === 'inc' ? 'Descripción del incidente' : 'Observaciones'}><textarea rows={2} value={f.detalle} onChange={e => s('detalle', e.target.value)} /></Field>}
      {tipo === 'inc' && <div className="note" style={{ marginBottom: 12 }}>Si es una mordedura, el animal queda marcado como mordedor. Si se aprueba el registro provincial (RUPAC), se informa automáticamente.</div>}
      {MESES_PROX[tipo] && <Field label="Próxima dosis / control"><input type="date" value={f.proximo} onChange={e => s('proximo', e.target.value)} /></Field>}
      <Switch checked={f.publico} onChange={v => s('publico', v)}>Visible para el tutor/a en su libreta</Switch>
      <div className="row" style={{ marginTop: 10 }}><AsyncBtn className="btn btn-primary" onClick={save}>Registrar y firmar</AsyncBtn><button className="btn" onClick={onClose}>Cancelar</button></div>
    </Modal>
  );
}

function CertModal({ paciente, ev, onClose }) {
  const vacs = paciente.eventos.filter(e => e.tipo === 'vac' && e.proximo && new Date(e.proximo) > new Date());
  return (
    <Modal open onClose={onClose}>
      <div className="rx">
        <div className="rx-h"><div><div className="mono tiny" style={{ opacity: 0.8 }}>CERTIFICADO DE SALUD PARA VIAJAR</div><b className="mono">CV-{paciente.libreta}-{isoDate(ev.fecha).replace(/-/g, '')}</b></div><img src={LOGO} alt="" /></div>
        <div className="rx-b">
          <p className="small" style={{ marginTop: 0 }}>Certifico que el animal fue examinado y no presenta signos clínicos de enfermedades infectocontagiosas, encontrándose apto para viajar.</p>
          <div className="facts" style={{ padding: 0 }}>
            <div><span>Animal</span><b>{paciente.nombre} · {paciente.especie}</b></div><div><span>Microchip</span><b className="mono">{paciente.microchip ? chipFmt(paciente.microchip) : '—'}</b></div>
            <div><span>Tutor/a</span><b>{paciente.tutor.nombre}</b></div><div><span>Fecha de examen</span><b>{fdate(ev.fecha)}</b></div>
            <div style={{ gridColumn: '1/-1' }}><span>Detalle</span><b>{ev.detalle || '—'}</b></div>
          </div>
          <div className="rx-tipo">Vacunas vigentes</div>
          {vacs.length ? vacs.map(v => <div key={v.id} className="small">✓ {v.titulo} · aplicada {fdate(v.fecha)} · vence {fdate(v.proximo)}</div>) : <div className="small muted">Sin vacunas vigentes registradas.</div>}
          <div className="row between" style={{ marginTop: 14, alignItems: 'flex-end' }}>
            <div className="small"><b>{ev.firma?.titulo}</b><div className="tiny" style={{ color: 'var(--ok)' }}>✓ MP {ev.firma?.mp} vigente</div></div>
            <QR text={verifyUrl(`/libreta/${paciente.libreta}`)} size={80} />
          </div>
        </div>
      </div>
    </Modal>
  );
}

export function Paciente() {
  const { id } = useParams();
  const { data: p, loading, error, reload } = useApi(`/clinic/pacientes/${id}`, [id]);
  const [reg, setReg] = useState(null), [cert, setCert] = useState(null), [filtro, setFiltro] = useState('');
  if (loading && !p) return <Spinner />;
  if (error) return <ErrorBox error={error} onRetry={reload} />;
  const evs = p.eventos.filter(e => !filtro || e.tipo === filtro);
  return (
    <>
      <Link to="/vet/consultorio/pacientes" className="small">← Pacientes</Link>
      <PageHead kicker={`Libreta ${p.libreta}`} title={p.nombre}>
        <Link className="btn" to="/vet/recetas">Emitir receta</Link>
        <Link className="btn" to="/vet/consultorio/agenda">Dar turno</Link>
        <a className="btn" href={url(`/libreta/${p.libreta}`)} target="_blank" rel="noreferrer">Ver como el tutor/a</a>
      </PageHead>
      <div className="libdet">
        <div>
          <div className="petcard">
            <div className="pethead"><div className="petav">{p.nombre[0]}</div><div style={{ flex: 1, minWidth: 0 }}><div className="mono tiny muted">{p.especie.slice(0, 3).toUpperCase()} · {p.libreta}</div><h3 style={{ margin: '2px 0 0', fontSize: 22 }}>{p.nombre}</h3><div className="small muted">{p.raza} · {p.sexo} · {edad(p.nacimiento)}</div></div><QR text={verifyUrl(`/libreta/${p.libreta}`)} size={70} /></div>
            <div className="facts">
              <div><span>Nacimiento</span><b>{fdate(p.nacimiento)}</b></div><div><span>Peso</span><b>{p.peso ? `${p.peso} kg` : '—'}</b></div>
              <div><span>Pelaje</span><b>{p.pelaje || '—'}</b></div><div><span>Castrado/a</span><b>{p.castrado ? 'Sí' : 'No'}</b></div>
              <div style={{ gridColumn: '1/-1' }}><span>Microchip</span><b className="mono">{p.microchip ? chipFmt(p.microchip) : 'Sin microchip'}</b></div>
              <div style={{ gridColumn: '1/-1' }}><span>Tutor/a</span><b>{p.tutor.nombre}</b><div className="tiny muted">DNI {p.tutor.dni} · {p.tutor.telefono}</div></div>
              {p.vetCabecera && <div style={{ gridColumn: '1/-1' }}><span>Veterinario/a de cabecera</span><b>{p.vetCabecera.titulo} · MP {p.vetCabecera.mp}</b></div>}
              {p.municipio && <div style={{ gridColumn: '1/-1' }}><span>Credencial municipal</span><b>{p.municipio.credencial} N° {p.municipio.nro}</b><div className="tiny muted">{p.municipio.nombre}</div></div>}
            </div>
            <div className="lst" style={{ padding: '0 16px 16px' }}>
              <Badge cls={estadoCls(p.estado.codigo)}>{p.estado.etiqueta}</Badge>
              {p.mordedor && <Badge cls="b-bad">Antecedente de mordedura</Badge>}
              {p.peligroso && <Badge cls="b-bad">Potencialmente peligroso</Badge>}
              {p.perdido && <Badge cls="b-bad">Reportado perdido</Badge>}
            </div>
          </div>
          <div className="card" style={{ marginTop: 14 }}>
            <h3>Recetas</h3>
            {!p.recetas.length ? <div className="small muted">Sin recetas.</div> : p.recetas.map(r => <div key={r.codigo} className="small" style={{ padding: '6px 0', borderBottom: '1px solid var(--line)' }}><div className="row between"><b className="mono tiny">{r.codigo}</b><Badge cls={r.estado === 'Vigente' ? 'b-ok' : 'b-grey'}>{r.estado}</Badge></div>{r.items.map((i, k) => <div key={k}>℞ {i.medicamento}</div>)}<div className="tiny muted">{fdate(r.fecha)} · {r.tipo} · {r.prescriptor}</div></div>)}
          </div>
          <div className="card" style={{ marginTop: 14 }}>
            <h3>Turnos en este consultorio</h3>
            {!p.turnos.length ? <div className="small muted">Sin turnos.</div> : p.turnos.map(t => <div key={t.id} className="row between small" style={{ padding: '6px 0', borderBottom: '1px solid var(--line)' }}><span>{fdate(t.inicio)} {ftime(t.inicio)} · {t.servicio || 'Consulta'}</span><TurnoBadge estado={t.estado} /></div>)}
          </div>
        </div>
        <div>
          <div className="card" style={{ marginBottom: 14 }}>
            <div className="tiny muted mono" style={{ marginBottom: 10 }}>REGISTRAR · SE FIRMA CON TU MATRÍCULA</div>
            <div className="regbar">{Object.entries(EVT).filter(([k]) => !(p.especie === 'Equino' && k === 'cas')).map(([k, v]) => <button key={k} className="btn btn-sm" onClick={() => setReg(k)}><span className="evk sm" style={{ background: v[2] }}>{v[0]}</span>{v[1]}</button>)}</div>
          </div>
          <div className="card">
            <div className="row between"><h3 style={{ margin: 0 }}>Historia clínica</h3>
              <select style={{ width: 200 }} value={filtro} onChange={e => setFiltro(e.target.value)}><option value="">Todos los registros ({p.eventos.length})</option>{Object.entries(EVT).map(([k, v]) => <option key={k} value={k}>{v[1]}</option>)}</select>
            </div>
            <Timeline eventos={evs} onCert={e => setCert(e)} />
          </div>
        </div>
      </div>
      {reg && <RegistroModal tipo={reg} paciente={p} onClose={() => setReg(null)} onSaved={reload} />}
      {cert && <CertModal paciente={p} ev={cert} onClose={() => setCert(null)} />}
    </>
  );
}
