// Zoonosis municipal como servicio (estilo VetCard): panel, credenciales, ficha, campañas con modo offline,
// mordeduras, perros potencialmente peligrosos y configuración de la identidad de la credencial.
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api, useApi } from '../../lib/api.js';
import { fdate, isoDate, estadoCls, norm, edad, DEPTOS } from '../../lib/format.js';
import { Kpi, VBars, PageHead, Spinner, ErrorBox, Badge, Modal, Field, AsyncBtn, Switch, Seg, Timeline, Empty, toast } from '../../components/ui.jsx';
import CredCard, { WalletButtons } from './CredCard.jsx';
import './muni.css';

export const useMuniConfig = () => useApi('/muni/config');

// ───────────────────────── Panel
export function Panel() {
  const { data, loading, error, reload } = useApi('/muni/panel');
  const cfg = useMuniConfig().data;
  if (error) return <ErrorBox error={error} onRetry={reload} />;
  if (loading || !data) return <Spinner />;
  return (
    <>
      <PageHead kicker={cfg ? `Zoonosis · ${cfg.nombreCredencial}` : 'Zoonosis'} title="Panel de zoonosis">
        <Link className="btn" to="/muni/campanias">Campañas</Link>
        <Link className="btn btn-primary" to="/muni/credenciales?nueva=1">+ Nueva credencial</Link>
      </PageHead>
      <div className="grid g4">
        <Kpi label="Credenciales emitidas" value={data.credenciales.toLocaleString('es-AR')} sub="animales con identidad municipal" />
        <Kpi label="Antirrábicas (12 meses)" value={data.antirrabicas.toLocaleString('es-AR')} sub="zoonosis + campañas" />
        <Kpi label="Castraciones (12 meses)" value={data.castraciones.toLocaleString('es-AR')} />
        <Kpi label="Cobertura antirrábica" value={`${Math.round(data.coberturaAntirrabica * 100)}%`} sub="credenciales con antirrábica al día" color={data.coberturaAntirrabica > 0.7 ? 'var(--ok)' : 'var(--warn)'} />
      </div>
      <div className="grid g3" style={{ marginTop: 16 }}>
        <Kpi label="Mordeduras (12 meses)" value={data.mordeduras} color="var(--bad)" sub={<Link to="/muni/mordeduras">Ver registro</Link>} />
        <Kpi label="En observación antirrábica" value={data.enObservacion} sub="10 días desde la mordedura" />
        <Kpi label="Perros potencialmente peligrosos" value={data.peligrosos} sub={<Link to="/muni/peligrosos">Ver registro</Link>} />
      </div>
      <div className="grid g2" style={{ marginTop: 16, alignItems: 'start' }}>
        <div className="card">
          <h3>Antirrábica por mes</h3>
          <div className="legend legend-sq small" style={{ marginBottom: 4 }}><span><i style={{ background: 'var(--leaf)' }} />Perros</span><span><i style={{ background: 'var(--leaf-2)' }} />Gatos</span></div>
          <VBars data={data.meses} keys={['antirrabicaPerros', 'antirrabicaGatos']} />
        </div>
        <div className="card">
          <h3>Castraciones por mes</h3>
          <VBars data={data.meses} keys={['castraciones']} colors={['var(--plum)']} />
        </div>
      </div>
      <div className="card" style={{ marginTop: 16 }}>
        <div className="row between"><h3 style={{ margin: 0 }}>Últimas campañas</h3><Link to="/muni/campanias" className="btn btn-sm">Todas</Link></div>
        <div className="tblwrap" style={{ marginTop: 10 }}><table className="tbl"><thead><tr><th>Campaña</th><th>Tipo</th><th>Lugar</th><th>Fecha</th><th>Estado</th><th>Registros</th></tr></thead><tbody>
          {data.campanias.map(c => <tr key={c.id}><td><b className="small">{c.nombre}</b></td><td className="small">{c.tipo}</td><td className="small">{c.lugar}</td><td className="small">{fdate(c.fecha)}</td><td><Badge cls={c.estado === 'Cerrada' ? 'b-grey' : c.estado === 'En curso' ? 'b-ok' : 'b-warn'}>{c.estado}</Badge></td><td className="mono">{c.registros}</td></tr>)}
        </tbody></table></div>
      </div>
      <p className="tiny muted" style={{ marginTop: 10 }}>Los registros firmados por veterinarios matriculados en sus consultorios se suman a los de zoonosis: el municipio ve la cobertura real sin cargar dos veces.</p>
    </>
  );
}

// ───────────────────────── Credenciales
function AnimalTable({ list, onOpen }) {
  if (!list.length) return <Empty>No hay animales con esos criterios.</Empty>;
  return (
    <div className="tblwrap"><table className="tbl"><thead><tr><th>Credencial</th><th>Animal</th><th>Tutor/a</th><th>Estado sanitario</th><th>Marcas</th><th /></tr></thead><tbody>
      {list.map(a => (
        <tr key={a.id} style={{ cursor: 'pointer' }} onClick={() => onOpen(a)}>
          <td className="mono small"><b>N.º {String(a.credencialNro || '—').padStart(6, '0')}</b><div className="tiny muted">{a.libreta}</div></td>
          <td><b className="small">{a.nombre}</b><div className="tiny muted">{a.especie} · {a.raza} · {a.sexo}</div></td>
          <td className="small">{a.tutor.nombre}<div className="tiny muted">DNI {a.tutor.dni}</div></td>
          <td><Badge cls={estadoCls(a.estado.codigo)}>{a.estado.etiqueta}</Badge></td>
          <td><div className="row" style={{ gap: 4 }}>{a.castrado && <Badge cls="b-grey">Castrado/a</Badge>}{a.peligroso && <Badge cls="b-bad">PPP</Badge>}{a.mordedor && <Badge cls="b-warn">Mordedor</Badge>}{a.perdido && <Badge cls="b-bad">Perdido</Badge>}</div></td>
          <td style={{ textAlign: 'right' }}><span className="btn btn-sm">Abrir →</span></td>
        </tr>
      ))}
    </tbody></table></div>
  );
}

function NuevaCredencial({ open, onClose, onDone }) {
  const [modo, setModo] = useState('libreta');
  const [libreta, setLibreta] = useState('');
  const [f, setF] = useState({ nombre: '', especie: 'Canino', raza: 'Mestizo', sexo: 'Macho', nacimiento: '', castrado: false, microchip: '', peligroso: false, tutor: { nombre: '', dni: '', telefono: '', departamento: '' } });
  const set = (k, v) => setF(x => ({ ...x, [k]: v })), setT = (k, v) => setF(x => ({ ...x, tutor: { ...x.tutor, [k]: v } }));
  const save = async () => {
    const a = await api.post('/muni/animales', modo === 'libreta' ? { libreta } : f);
    toast(modo === 'libreta' ? `Credencial asignada a la libreta ${a.libreta}` : `Credencial N.º ${a.credencialNro} emitida`);
    onDone(a);
  };
  return (
    <Modal open={open} onClose={onClose} title="Nueva credencial" subtitle="Cada animal tiene una sola libreta en la provincia; el municipio le asigna su credencial.">
      <Seg value={modo} onChange={setModo} options={[['libreta', 'Ya tiene libreta de un veterinario'], ['alta', 'Alta nueva en zoonosis']]} />
      <div style={{ marginTop: 14 }}>
        {modo === 'libreta' ? (
          <>
            <Field label="N° de libreta o microchip" hint="Probá MZA-000145 (Rocco, libreta emitida en un consultorio).">
              <input type="text" value={libreta} onChange={e => setLibreta(e.target.value.toUpperCase())} placeholder="MZA-000145" />
            </Field>
            <div className="note small">Integración con los consultorios: el historial que cargaron los matriculados queda visible para zoonosis y no se duplica el animal.</div>
          </>
        ) : (
          <>
            <div className="grid g2" style={{ gap: 10 }}>
              <Field label="Nombre"><input type="text" value={f.nombre} onChange={e => set('nombre', e.target.value)} /></Field>
              <Field label="Especie"><select value={f.especie} onChange={e => set('especie', e.target.value)}><option>Canino</option><option>Felino</option></select></Field>
              <Field label="Raza"><input type="text" value={f.raza} onChange={e => set('raza', e.target.value)} /></Field>
              <Field label="Sexo"><select value={f.sexo} onChange={e => set('sexo', e.target.value)}><option>Macho</option><option>Hembra</option></select></Field>
              <Field label="Nacimiento (aprox.)"><input type="date" value={f.nacimiento} onChange={e => set('nacimiento', e.target.value)} /></Field>
              <Field label="Microchip (opcional)"><input type="text" value={f.microchip} onChange={e => set('microchip', e.target.value.replace(/\D/g, ''))} /></Field>
            </div>
            <div className="row"><Switch checked={f.castrado} onChange={v => set('castrado', v)}>Castrado/a</Switch><Switch checked={f.peligroso} onChange={v => set('peligroso', v)}>Perro potencialmente peligroso</Switch></div>
            <div className="tiny muted mono" style={{ margin: '10px 0 8px' }}>TUTOR/A</div>
            <div className="grid g2" style={{ gap: 10 }}>
              <Field label="Nombre y apellido"><input type="text" value={f.tutor.nombre} onChange={e => setT('nombre', e.target.value)} /></Field>
              <Field label="DNI"><input type="text" value={f.tutor.dni} onChange={e => setT('dni', e.target.value.replace(/\D/g, ''))} /></Field>
              <Field label="Teléfono"><input type="tel" value={f.tutor.telefono} onChange={e => setT('telefono', e.target.value)} /></Field>
              <Field label="Departamento"><select value={f.tutor.departamento} onChange={e => setT('departamento', e.target.value)}><option value="">—</option>{DEPTOS.map(d => <option key={d}>{d}</option>)}</select></Field>
            </div>
          </>
        )}
      </div>
      <AsyncBtn className="btn btn-primary" onClick={save}>{modo === 'libreta' ? 'Asignar credencial' : 'Emitir credencial'}</AsyncBtn>
    </Modal>
  );
}

export function Credenciales({ peligrosos }) {
  const nav = useNavigate();
  const [q, setQ] = useState(''), [filtro, setFiltro] = useState('todos');
  const [nueva, setNueva] = useState(() => new URLSearchParams(window.location.search).get('nueva') === '1');
  const { data, loading, error, reload } = useApi(peligrosos ? '/muni/animales?peligrosos=1' : '/muni/animales');
  const list = useMemo(() => (data || []).filter(a => (!q || norm(`${a.nombre} ${a.libreta} ${a.credencialNro} ${a.tutor.nombre} ${a.tutor.dni} ${a.microchip}`).includes(norm(q)))
    && (filtro === 'todos' || (filtro === 'vencida' ? ['vencida', 'sin'].includes(a.estado.codigo) : filtro === 'mordedor' ? a.mordedor : a.estado.codigo === filtro))), [data, q, filtro]);
  if (error) return <ErrorBox error={error} onRetry={reload} />;
  return (
    <>
      <PageHead kicker={peligrosos ? 'Registro municipal' : 'Identidad sanitaria animal'} title={peligrosos ? 'Perros potencialmente peligrosos' : 'Credenciales'}>
        {!peligrosos && <button className="btn btn-primary" onClick={() => setNueva(true)}>+ Nueva credencial</button>}
      </PageHead>
      {peligrosos && <p className="muted small" style={{ marginTop: -8 }}>Registro de animales declarados potencialmente peligrosos. Se marca desde la ficha del animal; el registro puede interoperar con el que proponga la autoridad provincial.</p>}
      <div className="row" style={{ marginBottom: 12 }}>
        <input type="search" value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar por nombre, credencial, libreta, tutor/a, DNI o microchip" style={{ flex: 1, minWidth: 240 }} />
        {!peligrosos && <Seg value={filtro} onChange={setFiltro} options={[['todos', 'Todos'], ['al_dia', 'Al día'], ['por_vencer', 'Por vencer'], ['vencida', 'Vencida'], ['mordedor', 'Mordedores']]} />}
      </div>
      {loading ? <Spinner /> : <><div className="tiny muted mono" style={{ marginBottom: 6 }}>{list.length} ANIMALES</div><AnimalTable list={list} onOpen={a => nav(`/muni/animales/${a.id}`)} /></>}
      {nueva && <NuevaCredencial open onClose={() => setNueva(false)} onDone={a => { setNueva(false); reload(); nav(`/muni/animales/${a.id}`); }} />}
    </>
  );
}
export const Peligrosos = () => <Credenciales peligrosos />;

// ───────────────────────── Ficha del animal
function Atencion({ open, onClose, animal, onDone }) {
  const [f, setF] = useState({ tipo: 'vac', titulo: 'Antirrábica', detalle: '', fecha: isoDate(new Date()), proximo: isoDate(new Date(Date.now() + 365 * 864e5)) });
  const tipos = { vac: ['Antirrábica', 365], des: ['Desparasitación', 90], cas: ['Castración', 0], chip: ['Microchip colocado', 0], con: ['Control zoonosis', 0], inc: ['Observación antirrábica', 0] };
  const pickTipo = t => setF(x => ({ ...x, tipo: t, titulo: tipos[t][0], proximo: tipos[t][1] ? isoDate(new Date(Date.now() + tipos[t][1] * 864e5)) : '' }));
  const save = async () => { await api.post(`/muni/animales/${animal.id}/atenciones`, f); toast('Atención registrada. Ya figura en la libreta del animal.'); onDone(); };
  return (
    <Modal open={open} onClose={onClose} title={`Registrar atención · ${animal.nombre}`} subtitle="Queda firmada por Zoonosis municipal en la libreta única del animal.">
      <Field label="Tipo"><select value={f.tipo} onChange={e => pickTipo(e.target.value)}><option value="vac">Vacuna</option><option value="des">Desparasitación</option><option value="cas">Castración</option><option value="chip">Microchip</option><option value="con">Control</option><option value="inc">Incidente / observación</option></select></Field>
      <div className="grid g2" style={{ gap: 10 }}>
        <Field label="Título"><input type="text" value={f.titulo} onChange={e => setF({ ...f, titulo: e.target.value })} /></Field>
        <Field label="Fecha"><input type="date" value={f.fecha} onChange={e => setF({ ...f, fecha: e.target.value })} /></Field>
      </div>
      <Field label="Detalle"><input type="text" value={f.detalle} onChange={e => setF({ ...f, detalle: e.target.value })} placeholder="Lote, operativo, observaciones…" /></Field>
      <Field label="Próxima dosis / control (opcional)"><input type="date" value={f.proximo} onChange={e => setF({ ...f, proximo: e.target.value })} /></Field>
      <AsyncBtn className="btn btn-primary" onClick={save}>Registrar</AsyncBtn>
    </Modal>
  );
}

export function Animal() {
  const { id } = useParams();
  const { data: a, loading, error, reload } = useApi(`/muni/animales/${id}`);
  const cfg = useMuniConfig().data;
  const [aten, setAten] = useState(false);
  if (error) return <ErrorBox error={error} onRetry={reload} />;
  if (loading || !a) return <Spinner />;
  const toggle = async (k, v) => { try { await api.patch(`/muni/animales/${a.id}`, { [k]: v }); toast('Actualizado'); reload(); } catch (e) { toast(e.message, 'error'); } };
  return (
    <>
      <Link to="/muni/credenciales" className="small">← Credenciales</Link>
      <PageHead kicker={`Credencial N.º ${String(a.credencialNro || '—').padStart(6, '0')} · Libreta ${a.libreta}`} title={a.nombre}>
        <a className="btn" href={`/libreta/${a.libreta}`} target="_blank" rel="noreferrer">Ver libreta pública</a>
        <button className="btn btn-primary" onClick={() => setAten(true)}>+ Registrar atención</button>
      </PageHead>
      <div className="muni-grid">
        <div>
          {cfg && <CredCard animal={a} municipio={cfg} nro={a.credencialNro} estado={a.estado} />}
          <div style={{ marginTop: 12 }}><WalletButtons what={`Credencial de ${a.nombre}`} /></div>
          <div className="card" style={{ marginTop: 16 }}>
            <div className="facts" style={{ padding: 0 }}>
              <div><span>Especie</span><b>{a.especie}</b></div><div><span>Edad</span><b>{edad(a.nacimiento)}</b></div>
              <div><span>Tutor/a</span><b>{a.tutor.nombre}</b><div className="tiny muted">DNI {a.tutor.dni}{a.tutor.telefono ? ` · ${a.tutor.telefono}` : ''}</div></div>
              <div><span>Castrado/a</span><b>{a.castrado ? 'Sí' : 'No'}</b></div>
            </div>
            <hr className="s" />
            <Switch checked={a.peligroso} onChange={v => toggle('peligroso', v)}>Perro potencialmente peligroso</Switch>
            <Switch checked={a.mordedor} onChange={v => toggle('mordedor', v)}>Registro de mordedores</Switch>
          </div>
          {!!a.mordeduras?.length && (
            <div className="card" style={{ marginTop: 16 }}>
              <h3>Mordeduras</h3>
              {a.mordeduras.map(m => <div key={m.id} style={{ padding: '8px 0', borderBottom: '1px solid var(--line)' }}><div className="row between"><b className="small">{m.lugar} · {m.victima}</b><Badge cls={m.estado === 'Cerrada' ? 'b-grey' : 'b-warn'}>{m.estado}</Badge></div><div className="tiny muted">{fdate(m.fecha)} · {m.descripcion}</div></div>)}
            </div>
          )}
        </div>
        <div className="card">
          <div className="row between"><h3 style={{ margin: 0 }}>Historia sanitaria</h3><span className="tiny muted">matriculados + zoonosis</span></div>
          <p className="tiny muted" style={{ margin: '4px 0 6px' }}>Una sola libreta por animal: lo que firman los veterinarios en sus consultorios y lo que registra zoonosis.</p>
          <Timeline eventos={a.eventos} />
        </div>
      </div>
      {aten && <Atencion open animal={a} onClose={() => setAten(false)} onDone={() => { setAten(false); reload(); }} />}
    </>
  );
}

// ───────────────────────── Campañas + modo operativo offline
const qKey = id => `colvet-op-${id}`;
const loadQ = id => { try { return JSON.parse(localStorage.getItem(qKey(id)) || '[]'); } catch { return []; } };
const saveQ = (id, q) => { try { localStorage.setItem(qKey(id), JSON.stringify(q)); } catch { /* sin storage */ } };

export function Campanias() {
  const { data, loading, error, reload } = useApi('/muni/campanias');
  const [nueva, setNueva] = useState(false);
  const [f, setF] = useState({ nombre: '', tipo: 'Antirrábica', lugar: '', fecha: isoDate(new Date(Date.now() + 7 * 864e5)) });
  const nav = useNavigate();
  if (error) return <ErrorBox error={error} onRetry={reload} />;
  return (
    <>
      <PageHead kicker="Operativos en barrios, ferias y delegaciones" title="Campañas"><button className="btn btn-primary" onClick={() => setNueva(true)}>+ Nueva campaña</button></PageHead>
      {loading || !data ? <Spinner /> : (
        <div className="grid g3">
          {data.map(c => { const pend = loadQ(c.id).length; return (
            <div key={c.id} className="card">
              <div className="row between"><Badge cls={c.tipo === 'Castración' ? '' : 'b-ok'}>{c.tipo}</Badge><Badge cls={c.estado === 'Cerrada' ? 'b-grey' : c.estado === 'En curso' ? 'b-ok' : 'b-warn'}>{c.estado}</Badge></div>
              <h3 style={{ margin: '10px 0 4px', fontSize: 18 }}>{c.nombre}</h3>
              <div className="small muted">{c.lugar} · {fdate(c.fecha)}</div>
              <div className="row between" style={{ marginTop: 12 }}>
                <span className="mono small"><b style={{ fontSize: 20 }}>{c.registros}</b> registros{pend ? <span style={{ color: 'var(--warn)' }}> · {pend} sin sincronizar</span> : ''}</span>
                {c.estado !== 'Cerrada' && <button className="btn btn-sm btn-primary" onClick={() => nav(`/muni/campanias/${c.id}`)}>Modo operativo</button>}
              </div>
            </div>
          ); })}
        </div>
      )}
      <Modal open={nueva} onClose={() => setNueva(false)} title="Nueva campaña">
        <Field label="Nombre"><input type="text" value={f.nombre} onChange={e => setF({ ...f, nombre: e.target.value })} placeholder="Antirrábica · B° San Martín" /></Field>
        <div className="grid g2" style={{ gap: 10 }}>
          <Field label="Tipo"><select value={f.tipo} onChange={e => setF({ ...f, tipo: e.target.value })}><option>Antirrábica</option><option>Castración</option><option>Mixta</option></select></Field>
          <Field label="Fecha"><input type="date" value={f.fecha} onChange={e => setF({ ...f, fecha: e.target.value })} /></Field>
        </div>
        <Field label="Lugar"><input type="text" value={f.lugar} onChange={e => setF({ ...f, lugar: e.target.value })} placeholder="Plaza, delegación, escuela…" /></Field>
        <AsyncBtn className="btn btn-primary" onClick={async () => { await api.post('/muni/campanias', f); toast('Campaña creada'); setNueva(false); reload(); }}>Crear</AsyncBtn>
      </Modal>
    </>
  );
}

export function Operativo() {
  const { id } = useParams();
  const { data: camps, reload } = useApi('/muni/campanias');
  const c = camps?.find(x => x.id === Number(id));
  const [queue, setQueue] = useState(() => loadQ(id));
  const [manualOff, setManualOff] = useState(() => localStorage.getItem('colvet-op-offline') === '1');
  const [online, setOnline] = useState(navigator.onLine);
  const [hechos, setHechos] = useState(0);
  const blank = { nombre: '', especie: 'Canino', sexo: 'Macho', tutorDni: '', tutorNombre: '', antirrabica: true, castracion: false };
  const [f, setF] = useState(blank);
  const nav = useNavigate();
  useEffect(() => { const up = () => setOnline(true), dn = () => setOnline(false); window.addEventListener('online', up); window.addEventListener('offline', dn); return () => { window.removeEventListener('online', up); window.removeEventListener('offline', dn); }; }, []);
  useEffect(() => { try { localStorage.setItem('colvet-op-offline', manualOff ? '1' : '0'); } catch { /* */ } }, [manualOff]);
  const offline = manualOff || !online;
  const setQ = q => { setQueue(q); saveQ(id, q); };
  const registrar = async () => {
    if (!f.nombre || !f.tutorDni) return toast('Completá nombre del animal y DNI del tutor/a', 'error');
    const reg = { ...f, registradoEn: new Date().toISOString(), uid: Math.random().toString(36).slice(2) };
    if (offline) { setQ([...queue, reg]); toast('Guardado en este dispositivo. Se sincroniza al volver la conexión.'); }
    else { await api.post(`/muni/campanias/${id}/sync`, { registros: [reg] }); setHechos(h => h + 1); toast(`${f.nombre} registrado: credencial emitida y antirrábica en su libreta.`); reload(); }
    setF({ ...blank, especie: f.especie });
  };
  const sincronizar = async () => {
    const r = await api.post(`/muni/campanias/${id}/sync`, { registros: queue });
    setHechos(h => h + r.sincronizados); setQ([]); toast(`${r.sincronizados} registros sincronizados`); reload();
  };
  const cerrar = async () => { await api.patch(`/muni/campanias/${id}`, { estado: 'Cerrada' }); toast('Campaña cerrada'); nav('/muni/campanias'); };
  const iniciar = async () => { await api.patch(`/muni/campanias/${id}`, { estado: 'En curso' }); reload(); };
  if (!c) return <Spinner />;
  return (
    <>
      <Link to="/muni/campanias" className="small">← Campañas</Link>
      <PageHead kicker={`Modo operativo · ${c.lugar} · ${fdate(c.fecha)}`} title={c.nombre}>
        {c.estado === 'Programada' && <AsyncBtn className="btn" onClick={iniciar}>Iniciar campaña</AsyncBtn>}
        <AsyncBtn className="btn" onClick={cerrar}>Cerrar campaña</AsyncBtn>
      </PageHead>
      <div className="grid g2" style={{ alignItems: 'start' }}>
        <div className="op-panel">
          <div className={`op-status ${offline ? 'off' : 'on'}`}>{offline ? '● Sin conexión: los registros se guardan en este dispositivo' : '● Conectado: cada registro se guarda al instante'}</div>
          <div style={{ margin: '10px 0' }}><Switch checked={manualOff} onChange={setManualOff}>Simular sin conexión</Switch></div>
          <div className="grid g2" style={{ gap: 10 }}>
            <Field label="Nombre del animal"><input type="text" value={f.nombre} onChange={e => setF({ ...f, nombre: e.target.value })} autoFocus /></Field>
            <Field label="Especie"><div style={{ marginTop: 5 }}><Seg value={f.especie} onChange={v => setF({ ...f, especie: v })} options={['Canino', 'Felino']} /></div></Field>
            <Field label="DNI del tutor/a"><input type="text" inputMode="numeric" value={f.tutorDni} onChange={e => setF({ ...f, tutorDni: e.target.value.replace(/\D/g, '') })} /></Field>
            <Field label="Nombre del tutor/a"><input type="text" value={f.tutorNombre} onChange={e => setF({ ...f, tutorNombre: e.target.value })} /></Field>
          </div>
          <div className="row"><Switch checked={f.antirrabica} onChange={v => setF({ ...f, antirrabica: v })}>Antirrábica</Switch><Switch checked={f.castracion} onChange={v => setF({ ...f, castracion: v })}>Castración</Switch><Seg value={f.sexo} onChange={v => setF({ ...f, sexo: v })} options={['Macho', 'Hembra']} /></div>
          <AsyncBtn className="btn btn-primary btn-block" style={{ marginTop: 10 }} onClick={registrar}>Registrar y siguiente</AsyncBtn>
        </div>
        <div className="card">
          <div className="grid g3" style={{ gap: 10 }}>
            <div className="kpi"><div className="tiny muted">En el servidor</div><b>{c.registros}</b></div>
            <div className="kpi"><div className="tiny muted">Esta sesión</div><b>{hechos}</b></div>
            <div className="kpi"><div className="tiny muted">Pendientes</div><b style={{ color: queue.length ? 'var(--warn)' : 'var(--ok)' }}>{queue.length}</b></div>
          </div>
          {queue.length > 0 && (
            <>
              <ul className="op-queue">{queue.map(g => <li key={g.uid}><span><b>{g.nombre}</b> · {g.especie} · DNI {g.tutorDni}</span><span className="tiny muted">{g.antirrabica ? 'AR ' : ''}{g.castracion ? 'CAS' : ''}</span></li>)}</ul>
              <AsyncBtn className="btn btn-primary" style={{ marginTop: 12 }} disabled={offline} onClick={sincronizar}>{offline ? 'Sin conexión para sincronizar' : `Sincronizar ${queue.length}`}</AsyncBtn>
            </>
          )}
          <p className="tiny muted" style={{ marginTop: 12 }}>Funciona en el celular del equipo de zoonosis aunque no haya señal en el barrio. Al sincronizar, cada animal recibe su credencial municipal y la vacuna queda en su libreta única.</p>
        </div>
      </div>
    </>
  );
}

// ───────────────────────── Mordeduras
export function Mordeduras() {
  const { data, loading, error, reload } = useApi('/muni/mordeduras');
  const [nueva, setNueva] = useState(false);
  const [f, setF] = useState({ libreta: '', lugar: 'Vía pública', victima: '', descripcion: '', fecha: isoDate(new Date()) });
  if (error) return <ErrorBox error={error} onRetry={reload} />;
  const dias = m => Math.ceil((new Date(m.observacionHasta) - new Date()) / 864e5);
  return (
    <>
      <PageHead kicker="Denuncias de mordedura y observación antirrábica" title="Mordeduras"><button className="btn btn-primary" onClick={() => setNueva(true)}>+ Registrar mordedura</button></PageHead>
      {loading || !data ? <Spinner /> : !data.length ? <Empty>Sin mordeduras registradas.</Empty> : (
        <div className="tblwrap"><table className="tbl"><thead><tr><th>Fecha</th><th>Animal</th><th>Lugar</th><th>Víctima</th><th>Observación (10 días)</th><th>Estado</th><th /></tr></thead><tbody>
          {data.map(m => (
            <tr key={m.id}>
              <td className="small">{fdate(m.fecha)}</td>
              <td>{m.animal ? <Link to={`/muni/animales/${m.animal.id}`}><b className="small">{m.animal.nombre}</b></Link> : <span className="small muted">Sin identificar</span>}<div className="tiny muted">{m.animal ? `${m.animal.libreta} · ${m.animal.tutor?.nombre}` : ''}</div></td>
              <td className="small">{m.lugar}</td>
              <td className="small">{m.victima}<div className="tiny muted">{m.descripcion}</div></td>
              <td>{m.estado === 'En observación' ? <span className={`cd ${dias(m) <= 3 ? 'urg' : ''}`}>{dias(m) > 0 ? `Faltan ${dias(m)} días` : 'Cumplida: cerrar'}</span> : <span className="tiny muted">hasta {fdate(m.observacionHasta)}</span>}</td>
              <td><Badge cls={m.estado === 'Cerrada' ? 'b-grey' : 'b-warn'}>{m.estado}</Badge></td>
              <td style={{ textAlign: 'right' }}>{m.estado !== 'Cerrada' && <AsyncBtn className="btn btn-sm" onClick={async () => { await api.patch(`/muni/mordeduras/${m.id}`, { estado: 'Cerrada' }); toast('Observación cerrada'); reload(); }}>Cerrar</AsyncBtn>}</td>
            </tr>
          ))}
        </tbody></table></div>
      )}
      <Modal open={nueva} onClose={() => setNueva(false)} title="Registrar mordedura" subtitle="Abre una observación antirrábica de 10 días y marca al animal como mordedor.">
        <Field label="Libreta o N° del animal (si está identificado)" hint="Opcional. Ej.: MZA-000231"><input type="text" value={f.libreta} onChange={e => setF({ ...f, libreta: e.target.value.toUpperCase() })} /></Field>
        <div className="grid g2" style={{ gap: 10 }}>
          <Field label="Lugar"><select value={f.lugar} onChange={e => setF({ ...f, lugar: e.target.value })}><option>Vía pública</option><option>Domicilio del tutor</option><option>Plaza</option><option>Escuela</option><option>Otro</option></select></Field>
          <Field label="Fecha"><input type="date" value={f.fecha} onChange={e => setF({ ...f, fecha: e.target.value })} /></Field>
        </div>
        <Field label="Víctima"><input type="text" value={f.victima} onChange={e => setF({ ...f, victima: e.target.value })} placeholder="Ej.: adulto, vecino" /></Field>
        <Field label="Descripción"><textarea rows="2" value={f.descripcion} onChange={e => setF({ ...f, descripcion: e.target.value })} /></Field>
        <AsyncBtn className="btn btn-primary" onClick={async () => { await api.post('/muni/mordeduras', f); toast('Mordedura registrada. Observación hasta dentro de 10 días.'); setNueva(false); reload(); }}>Registrar</AsyncBtn>
      </Modal>
    </>
  );
}

// ───────────────────────── Configuración de la credencial
export function Config({ onSaved }) {
  const { data, loading, reload } = useMuniConfig();
  const [f, setF] = useState(null);
  useEffect(() => { if (data) setF({ nombreCredencial: data.nombreCredencial, sigla: data.sigla, color: data.color }); }, [data]);
  if (loading || !data || !f) return <Spinner />;
  const muestra = { nombre: 'Luna', raza: 'Golden Retriever', sexo: 'Hembra', castrado: true, libreta: 'MZA-000231', microchip: '032097000123456' };
  return (
    <>
      <PageHead kicker="Cada municipio con su identidad" title="Configuración de la credencial" />
      <div className="muni-grid">
        <div className="card">
          <Field label="Nombre de la credencial"><input type="text" value={f.nombreCredencial} onChange={e => setF({ ...f, nombreCredencial: e.target.value })} /></Field>
          <Field label="Sigla"><input type="text" maxLength={6} value={f.sigla} onChange={e => setF({ ...f, sigla: e.target.value.toUpperCase() })} /></Field>
          <Field label="Color institucional"><div className="row" style={{ flexWrap: 'nowrap' }}><input type="color" value={f.color} onChange={e => setF({ ...f, color: e.target.value })} style={{ width: 56, height: 40, padding: 2 }} /><input type="text" value={f.color} onChange={e => setF({ ...f, color: e.target.value })} /></div></Field>
          <div className="row" style={{ gap: 6, marginBottom: 12 }}>{['#1f5e7a', '#2d6b5a', '#7c1c6f', '#b3541e', '#2b3a67'].map(c => <button key={c} type="button" onClick={() => setF({ ...f, color: c })} style={{ width: 28, height: 28, borderRadius: 4, background: c, border: f.color === c ? '3px solid var(--ink)' : '1px solid var(--line)', cursor: 'pointer' }} aria-label={c} />)}</div>
          <AsyncBtn className="btn btn-primary" onClick={async () => { await api.patch('/muni/config', f); toast('Identidad guardada. Se aplica a todas las credenciales.'); reload(); onSaved?.(); }}>Guardar</AsyncBtn>
          <p className="tiny muted" style={{ marginTop: 12 }}>La plataforma es la misma para todos los municipios; la credencial que ven los vecinos lleva el nombre, la sigla y el color de cada uno.</p>
        </div>
        <div>
          <div className="tiny muted mono" style={{ marginBottom: 8 }}>VISTA PREVIA</div>
          <CredCard animal={muestra} municipio={{ ...data, ...f }} nro={4217} estado={{ codigo: 'al_dia', etiqueta: 'Antirrábica al día' }} />
        </div>
      </div>
    </>
  );
}
