// Pantallas de la administración del Colegio.
import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { FichaContenido } from './FichaMatriculado.jsx';
import { api, useApi } from '../../lib/api.js';
import { money, fdate, fdt, norm, DEPTOS, ESPECIALIDADES } from '../../lib/format.js';
import { Badge, Kpi, PageHead, Spinner, ErrorBox, Empty, Modal, Field, Seg, AsyncBtn, HBars, toast, saveFile } from '../../components/ui.jsx';
import Board from '../../components/Board.jsx';
import MapView from '../../components/MapView.jsx';
import { EstKit } from '../vet/kit.jsx';
import './admin.css';

const Load = ({ q, children }) => (q.error ? <ErrorBox error={q.error} onRetry={q.reload} /> : !q.data ? <Spinner /> : children(q.data));
const estadoCls = e => ({ Vigente: 'b-ok', Suspendida: 'b-bad', Baja: 'b-grey' }[e] || 'b-warn');

// ───────────────── Tablero
export function Tablero() {
  const q = useApi('/admin/tablero');
  return <Load q={q}>{d => {
    const cnt = e => d.porEstado.find(x => x.estado === e)?._count || 0;
    return (
      <>
        <PageHead kicker={new Date().toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })} title="Qué necesita atención hoy"><span className="small muted">Actualizado {fdt(new Date())}</span></PageHead>
        <div className="atencion">
          {d.atencion.map(a => (
            <Link key={a.clave} to={a.to} className={`card at at-${a.nivel}`}>
              <b className="at-n">{a.n}</b>
              <div className="at-t"><b>{a.t}</b><span className="small muted">{a.d}</span></div>
              <span className="btn btn-sm">{a.b} →</span>
            </Link>
          ))}
          {!d.atencion.length && <div className="card"><b>Todo al día.</b> <span className="muted">No hay pendientes.</span></div>}
        </div>
        <h3 className="tab-h">El Colegio en números</h3>
        <div className="grid g4">
          <Kpi label="Padrón publicado" value={d.padronPublicado} sub={`${cnt('Vigente')} vigentes en la demo · ${cnt('Suspendida')} suspendidos`} />
          <Kpi label="Establecimientos habilitados" value={d.establecimientosHabilitados} sub={<Link to="/admin/establecimientos">Carteles y credenciales</Link>} />
          <Kpi label="Cuotas pendientes" value={d.cuotasPendientes} sub={<Link to="/admin/dinero">Ver recaudación</Link>} />
          <Kpi label="Guardias" value="En vivo" sub={<Link to="/admin/guardias">Ver tablero</Link>} />
        </div>
        <div className="grid g2" style={{ marginTop: 16 }}>
          <div className="card"><h3>Matriculados vigentes por zona</h3><HBars data={d.porZona} label="zona" value="cantidad" /></div>
          <div className="card"><h3>Cobranza por período (% del padrón)</h3><HBars data={d.cobranza.map(c => ({ ...c, pct: Math.round(c.cobrado * 100) }))} label="periodo" value="pct" fmt={v => `${v}%`} /></div>
        </div>
      </>
    );
  }}</Load>;
}

// ───────────────── Matriculados (ABM)
const EMPTY = { mp: '', nombre: '', apellido: '', femenino: true, departamento: 'Capital', estado: 'Vigente', email: '', telefono: '', especialidad: ESPECIALIDADES[0] };
export function Matriculados() {
  const [qs, setQs] = useState(''), [estado, setEstado] = useState('');
  const [sp, setSp] = useSearchParams();
  const ficha = sp.get('ficha');
  const abrirFicha = mp => setSp(mp ? { ficha: String(mp) } : {}, { replace: !mp });
  const q = useApi(`/admin/vets?q=${encodeURIComponent(qs)}&estado=${encodeURIComponent(estado)}`);
  const [form, setForm] = useState(null);
  const guardar = async () => {
    const body = { ...form, femenino: !!form.femenino, especialidades: [form.especialidad] };
    if (form.id) await api.patch(`/admin/vets/${form.id}`, body); else await api.post('/admin/vets', body);
    toast('Guardado. Ya se refleja en el directorio y la verificación pública.'); setForm(null); q.reload();
  };
  const cambiarEstado = async (v, est) => { await api.patch(`/admin/vets/${v.id}`, { estado: est }); toast(est === 'Suspendida' ? `MP ${v.mp} suspendida: sale del directorio y la credencial muestra «no habilitado».` : `MP ${v.mp} rehabilitada.`); q.reload(); };
  const exportCSV = () => {
    const rows = [['matricula', 'apellido', 'nombre', 'departamento', 'especialidad', 'estado', 'cuotas_adeudadas'], ...(q.data || []).map(v => [v.mp, v.apellido, v.nombre, v.departamento, v.especialidades[0] || '', v.estado, v.deuda])];
    const csv = rows.map(r => r.map(x => `"${String(x).replace(/"/g, '""')}"`).join(',')).join('\n');
    saveFile('padron-colvet.csv', csv);
  };
  const set = k => e => setForm({ ...form, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });
  return (
    <>
      <PageHead kicker="Padrón" title="Matriculados">
        <button className="btn" onClick={exportCSV}>Exportar CSV</button>
        <button className="btn" onClick={() => toast('Importación del padrón actual (877 registros) disponible en la migración (demo)')}>Importar padrón</button>
        <button className="btn btn-primary" onClick={() => setForm({ ...EMPTY })}>+ Nuevo matriculado</button>
      </PageHead>
      <div className="row" style={{ marginBottom: 12 }}>
        <input type="search" placeholder="Buscar por nombre, matrícula o departamento" style={{ flex: 1, minWidth: 220 }} value={qs} onChange={e => setQs(e.target.value)} />
        <select style={{ width: 200 }} value={estado} onChange={e => setEstado(e.target.value)}><option value="">Todos los estados</option>{['Vigente', 'En trámite', 'Suspendida', 'Baja'].map(x => <option key={x}>{x}</option>)}</select>
      </div>
      <Load q={q}>{list => (
        <div className="tblwrap"><table className="tbl"><thead><tr><th>MP</th><th>Apellido y nombre</th><th>Departamento</th><th>Especialidad</th><th>Estado</th><th>Cuotas</th><th /></tr></thead><tbody>
          {list.map(v => <tr key={v.id}>
            <td className="mono"><b>{v.mp}</b></td>
            <td><a href="#" onClick={e => { e.preventDefault(); abrirFicha(v.mp); }}><b>{v.apellido}, {v.nombre}</b></a><div className="tiny muted">{v.email}</div></td>
            <td>{v.departamento}</td><td className="small">{v.especialidades[0]}</td>
            <td><Badge cls={estadoCls(v.estado)}>{v.estado}</Badge></td>
            <td className="small" style={v.deuda ? { color: 'var(--bad)' } : { color: 'var(--ink-3)' }}>{v.deuda ? `Adeuda ${v.deuda}` : 'Al día'}</td>
            <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
              <button className="btn btn-sm btn-primary" onClick={() => abrirFicha(v.mp)}>Ficha</button>{' '}
              <button className="btn btn-sm" onClick={() => setForm({ ...v, especialidad: v.especialidades[0] || ESPECIALIDADES[0] })}>Editar</button>{' '}
              {v.estado === 'Vigente' ? <AsyncBtn className="btn btn-sm" onClick={() => cambiarEstado(v, 'Suspendida')}>Suspender</AsyncBtn> : v.estado === 'Suspendida' ? <AsyncBtn className="btn btn-sm" onClick={() => cambiarEstado(v, 'Vigente')}>Rehabilitar</AsyncBtn> : null}{' '}
              <Link className="btn btn-sm" to={`/verificar/${v.mp}`}>QR</Link>
            </td></tr>)}
          {!list.length && <tr><td colSpan={7}><Empty /></td></tr>}
        </tbody></table></div>
      )}</Load>
      <p className="tiny muted" style={{ marginTop: 8 }}>Cada cambio impacta en el directorio, la credencial digital y la verificación pública.</p>
      <Modal open={!!ficha} onClose={() => abrirFicha(null)} wide>{ficha && <div className="fm-modal"><FichaContenido mp={ficha} onCambio={q.reload} /></div>}</Modal>
      <Modal open={!!form} onClose={() => setForm(null)} title={form?.id ? 'Editar matriculado' : 'Nuevo matriculado'} subtitle="ABM del padrón">
        {form && <>
          <div className="grid g2" style={{ gap: 10 }}>
            <Field label="Matrícula"><input type="number" value={form.mp} disabled={!!form.id} onChange={set('mp')} /></Field>
            <Field label="Estado"><select value={form.estado} onChange={set('estado')}>{['Vigente', 'En trámite', 'Suspendida', 'Baja'].map(x => <option key={x}>{x}</option>)}</select></Field>
            <Field label="Nombre"><input type="text" value={form.nombre} onChange={set('nombre')} /></Field>
            <Field label="Apellido"><input type="text" value={form.apellido} onChange={set('apellido')} /></Field>
            <Field label="Departamento"><select value={form.departamento} onChange={set('departamento')}>{DEPTOS.map(x => <option key={x}>{x}</option>)}</select></Field>
            <Field label="Especialidad principal"><select value={form.especialidad} onChange={set('especialidad')}>{ESPECIALIDADES.map(x => <option key={x}>{x}</option>)}</select></Field>
            <Field label="Email"><input type="email" value={form.email || ''} onChange={set('email')} /></Field>
            <Field label="Teléfono"><input type="tel" value={form.telefono || ''} onChange={set('telefono')} /></Field>
          </div>
          <label className="switch"><input type="checkbox" checked={!!form.femenino} onChange={set('femenino')} /><i />Tratamiento «Dra.»</label>
          <div className="row" style={{ marginTop: 8 }}><AsyncBtn className="btn btn-primary" onClick={guardar}>Guardar</AsyncBtn><button className="btn" onClick={() => setForm(null)}>Cancelar</button></div>
        </>}
      </Modal>
    </>
  );
}

// ───────────────── Inscripciones (kanban)
const ETAPAS = ['Solicitud online', 'Revisión documental', 'Aprobación Comisión Directiva', 'Registro Ministerio de Salud', 'Alta y credencial'];
export function Inscripciones() {
  const q = useApi('/admin/inscripciones');
  const avanzar = async i => {
    const r = await api.post(`/admin/inscripciones/${i.id}/avanzar`);
    toast(r.vet ? `Alta de ${i.nombre} ${i.apellido}: MP ${r.vet.mp} asignada, credencial digital emitida y primera cuota generada.` : `${i.nombre} ${i.apellido} pasó a «${ETAPAS[r.inscripcion.etapa]}». Se notificó al solicitante.`);
    q.reload();
  };
  return (
    <>
      <PageHead kicker="Ley 7825: el Ministerio de Salud otorga la matrícula y el Colegio emite la credencial" title="Inscripciones"><Link className="btn" to="/inscripcion">Ver formulario público</Link></PageHead>
      <Load q={q}>{list => (
        <div className="kanban">{ETAPAS.map((et, k) => { const cards = list.filter(i => i.etapa === k); return (
          <div className="kcol" key={et}><h4>{et}<Badge cls="b-grey">{cards.length}</Badge></h4>
            {cards.map(i => <div className="kcard" key={i.id}>
              <b>{i.nombre} {i.apellido}</b><div className="tiny muted">{i.universidad} · ingresó {fdate(i.createdAt)}</div>
              {i.faltante && <div style={{ marginTop: 6 }}><Badge cls="b-warn">Falta: {i.faltante}</Badge></div>}
              {k === 3 && <div style={{ marginTop: 6 }}><Badge cls="b-grey">Expediente enviado</Badge></div>}
              <div className="row" style={{ gap: 6, marginTop: 8 }}>
                {k < 4 ? <AsyncBtn className="btn btn-sm btn-primary" onClick={() => avanzar(i)}>{k === 3 ? 'Dar de alta' : 'Avanzar'} →</AsyncBtn> : <Badge cls="b-ok">Credencial emitida</Badge>}
                <button className="btn btn-sm" onClick={() => toast('Legajo con documentación adjunta (demo)')}>Legajo</button>
              </div>
            </div>)}
          </div>
        ); })}</div>
      )}</Load>
      <p className="tiny muted">Cada paso notifica al solicitante. Al dar de alta se crea el matriculado en el padrón con su primera cuota.</p>
    </>
  );
}

// ───────────────── Cobranzas
export function Cobranzas() {
  const q = useApi('/admin/cobranzas');
  return <Load q={q}>{d => {
    const total = d.pendientes.reduce((s, c) => s + c.monto, 0);
    return (
      <>
        <PageHead kicker="Cuotas" title="Cobranzas"><button className="btn btn-primary" onClick={() => toast(`Recordatorio enviado a ${new Set(d.pendientes.map(c => c.vet.mp)).size} matriculados por email y WhatsApp`)}>Recordar a todos los deudores</button></PageHead>
        <div className="grid g4">
          <Kpi label="Recaudado (demo)" value={money(d.recaudado)} sub={`${d.pagas} cuotas pagas`} />
          <Kpi label="Pendiente" value={money(total)} color="var(--warn)" sub={`${d.pendientes.length} cuotas`} />
          <Kpi label="Débito automático" value="41%" sub="ejemplo" />
          <Kpi label="Conciliación" value="Automática" color="var(--ok)" />
        </div>
        <h3 style={{ marginTop: 20 }}>Cuotas pendientes</h3>
        <div className="tblwrap"><table className="tbl"><thead><tr><th>MP</th><th>Matriculado</th><th>Período</th><th>Importe</th><th>Vencimiento</th><th>Estado</th><th /></tr></thead><tbody>
          {d.pendientes.map(c => { const venc = new Date(c.vence) < new Date(); return <tr key={c.id}><td className="mono">{c.vet.mp}</td><td>{c.vet.nombre}</td><td className="small">{c.periodo}</td><td>{money(c.monto)}</td><td className="small" style={venc ? { color: 'var(--bad)' } : undefined}>{fdate(c.vence)}{venc ? ' · vencida' : ''}</td><td><Badge cls={estadoCls(c.vet.estado)}>{c.vet.estado}</Badge></td>
            <td style={{ textAlign: 'right' }}><button className="btn btn-sm" onClick={() => toast(`Plan de pagos ofrecido a ${c.vet.nombre}`)}>Plan de pagos</button></td></tr>; })}
        </tbody></table></div>
      </>
    );
  }}</Load>;
}

// ───────────────── Comunicaciones
export function Comunicaciones() {
  const q = useApi('/public/noticias');
  const [f, setF] = useState({ titulo: 'Nuevo nomenclador noviembre/diciembre', categoria: 'Comunicados', resumen: 'Ya está disponible el nomenclador vigente con el nuevo valor GAVET.', segmento: 'Todos los matriculados (877)', canales: { web: true, app: true, email: true, wa: false } });
  const enviar = async () => {
    await api.post('/admin/noticias', { titulo: f.titulo, categoria: f.categoria, resumen: f.resumen });
    const n = f.segmento.match(/\((\d+)\)/)?.[1] || '';
    toast(`Publicado en la web y enviado a ${n} destinatarios por ${Object.entries(f.canales).filter(([, v]) => v).map(([k]) => ({ web: 'web', app: 'app', email: 'email', wa: 'WhatsApp' }[k])).join(', ')}`);
    q.reload();
  };
  return (
    <>
      <PageHead kicker="Una sola carga, todos los canales" title="Comunicaciones" />
      <div className="grid g2" style={{ alignItems: 'start' }}>
        <div className="card">
          <Field label="Título"><input type="text" value={f.titulo} onChange={e => setF({ ...f, titulo: e.target.value })} /></Field>
          <Field label="Categoría"><select value={f.categoria} onChange={e => setF({ ...f, categoria: e.target.value })}>{['Comunicados', 'Formación', 'Convenios', 'Bolsa de trabajo', 'Alerta sanitaria'].map(x => <option key={x}>{x}</option>)}</select></Field>
          <Field label="Mensaje"><textarea rows={4} value={f.resumen} onChange={e => setF({ ...f, resumen: e.target.value })} /></Field>
          <Field label="Destinatarios"><select value={f.segmento} onChange={e => setF({ ...f, segmento: e.target.value })}>{['Todos los matriculados (877)', 'Subcomisión Rumiantes (96)', 'Subcomisión Equinos (58)', 'Departamento San Rafael (64)', 'Establecimientos con guardia (18)', 'Con cuota impaga (31)'].map(x => <option key={x}>{x}</option>)}</select></Field>
          <div className="row">{[['web', 'Web'], ['app', 'App (push)'], ['email', 'Email'], ['wa', 'WhatsApp']].map(([k, l]) => <label key={k} className="switch"><input type="checkbox" checked={f.canales[k]} onChange={e => setF({ ...f, canales: { ...f.canales, [k]: e.target.checked } })} /><i />{l}</label>)}</div>
          <AsyncBtn className="btn btn-primary" style={{ marginTop: 8 }} onClick={enviar}>Publicar y enviar</AsyncBtn>
        </div>
        <div><h3>Publicadas</h3>
          <Load q={q}>{list => list.map(n => <div className="card flat" style={{ marginBottom: 10 }} key={n.id}><div className="row between"><b className="small">{n.titulo}</b><span className="tiny muted">{fdate(n.fecha)}</span></div><div className="row" style={{ gap: 6, marginTop: 4 }}><Badge>{n.categoria}</Badge></div><div className="tiny muted" style={{ marginTop: 4 }}>{n.resumen}</div></div>)}</Load>
        </div>
      </div>
    </>
  );
}

// ───────────────── Establecimientos
export function Establecimientos() {
  const q = useApi('/admin/establecimientos');
  const [qs, setQs] = useState(''), [kit, setKit] = useState(null);
  return (
    <>
      <PageHead kicker="Habilitaciones e inspecciones" title="Establecimientos">
        <button className="btn" onClick={() => toast('Listado mensual publicado en la web (reemplaza el PDF)')}>Publicar listado</button>
        <button className="btn btn-primary" onClick={() => toast('Nueva solicitud de habilitación (demo)')}>+ Habilitación</button>
      </PageHead>
      <input type="search" placeholder="Buscar por nombre o departamento" value={qs} onChange={e => setQs(e.target.value)} style={{ marginBottom: 12 }} />
      <Load q={q}>{list => {
        const rows = list.filter(e => !qs || norm(`${e.nombre} ${e.departamento}`).includes(norm(qs)));
        return (
          <div className="tblwrap"><table className="tbl"><thead><tr><th>Habilitación</th><th>Establecimiento</th><th>Depto.</th><th>Director/a técnico/a</th><th>Vence</th><th>Estado</th><th /></tr></thead><tbody>
            {rows.map(e => { const dias = e.venceHab ? Math.round((new Date(e.venceHab) - new Date()) / 864e5) : null; const st = dias === null ? ['A cargar', 'b-grey'] : dias < 0 ? ['Vencida', 'b-bad'] : dias < 90 ? ['Por vencer', 'b-warn'] : ['Vigente', 'b-ok']; return (
              <tr key={e.codigo}><td className="mono small"><b>{e.habilitacion || '—'}</b></td><td>{e.nombre}<div className="tiny muted">{e.tipo}{e.guardia ? ` · guardia ${e.guardia}` : ''}</div></td><td className="small">{e.departamento}</td><td className="small">{e.dt ? `${e.dt.titulo} · MP ${e.dt.mp}` : '—'}</td><td className="small">{fdate(e.venceHab)}</td><td><Badge cls={st[1]}>{st[0]}</Badge></td>
                <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>{e.habilitacion && <button className="btn btn-sm" onClick={() => setKit(e)}>Cartel y credencial</button>}{' '}<button className="btn btn-sm" onClick={() => toast('Inspección programada y notificada al DT')}>Inspección</button></td></tr>
            ); })}
          </tbody></table></div>
        );
      }}</Load>
      <Modal open={!!kit} onClose={() => setKit(null)} wide title={kit?.nombre} subtitle="Credencial, oblea y cartel con QR">
        {kit && <><EstKit e={kit} idPrefix="adm" /><div className="row" style={{ marginTop: 14 }}><button className="btn" onClick={() => toast('Credencial, oblea y cartel enviados al DT por email')}>Enviar al director/a técnico/a</button></div></>}
      </Modal>
    </>
  );
}

// ───────────────── Guardias
export function Guardias() {
  return (
    <>
      <PageHead kicker="Hoy, en vivo" title="Guardias"><Link className="btn" to="/guardias">Ver tablero público</Link><button className="btn btn-primary" onClick={() => toast('Recordatorio por WhatsApp enviado a las clínicas que no confirmaron su guardia')}>Recordar a quienes no confirmaron</button></PageHead>
      <div className="note" style={{ marginBottom: 14 }}>Cada director/a técnico/a declara la guardia del día desde su portal. Las zonas sin cobertura aparecen en rojo: el Colegio puede proponer una rotación entre establecimientos de la zona.</div>
      <Board full />
    </>
  );
}

// ───────────────── Denuncias
const DEN_ESTADOS = ['Recibida', 'En investigación', 'Derivada a Tribunal de Disciplina', 'Cerrada'];
export function Denuncias() {
  const q = useApi('/admin/denuncias');
  const cambiar = async (d, estado) => { await api.patch(`/admin/denuncias/${d.id}`, { estado }); toast(estado.startsWith('Derivada') ? 'Expediente creado en el Tribunal de Disciplina' : `Denuncia ${d.numero}: ${estado}`); q.reload(); };
  return (
    <>
      <PageHead kicker="Ejercicio ilegal y establecimientos no habilitados" title="Denuncias" />
      <Load q={q}>{list => (
        <div className="tblwrap"><table className="tbl"><thead><tr><th>N°</th><th>Fecha</th><th>Tipo</th><th>Lugar</th><th>Origen</th><th>Estado</th><th /></tr></thead><tbody>
          {list.map(d => <tr key={d.id}><td className="mono small">{d.numero}</td><td className="small">{fdate(d.createdAt)}</td><td><b className="small">{d.tipo}</b>{d.descripcion && <div className="tiny muted">{d.descripcion}</div>}</td><td className="small">{d.lugar}</td><td className="small muted">{d.origen}</td>
            <td><select value={d.estado} onChange={e => cambiar(d, e.target.value).catch(err => toast(err.message, 'error'))} style={{ fontSize: 13, padding: '6px 8px' }}>{DEN_ESTADOS.map(x => <option key={x}>{x}</option>)}</select></td>
            <td style={{ textAlign: 'right' }}>{!d.estado.startsWith('Derivada') && d.estado !== 'Cerrada' && <AsyncBtn className="btn btn-sm" onClick={() => cambiar(d, 'Derivada a Tribunal de Disciplina')}>Derivar a Tribunal</AsyncBtn>}</td></tr>)}
          {!list.length && <tr><td colSpan={7}><Empty>No hay denuncias.</Empty></td></tr>}
        </tbody></table></div>
      )}</Load>
      <p className="tiny muted" style={{ marginTop: 8 }}>Lo que el Tribunal resuelve se publica en «Causas en curso» y «Profesionales sancionados» sin reescribir la web.</p>
    </>
  );
}

// ───────────────── Salud pública
const COORD = { Capital: [-32.889, -68.845], 'Godoy Cruz': [-32.926, -68.845], Guaymallén: [-32.9, -68.79], 'Las Heras': [-32.85, -68.83], 'Luján de Cuyo': [-33.0, -68.88], Maipú: [-32.98, -68.79], Lavalle: [-32.72, -68.59], 'San Martín': [-33.08, -68.47], Rivadavia: [-33.19, -68.46], Junín: [-33.14, -68.49], 'Santa Rosa': [-33.25, -68.15], 'La Paz': [-33.46, -67.55], Tunuyán: [-33.577, -69.017], Tupungato: [-33.37, -69.15], 'San Carlos': [-33.77, -69.04], 'San Rafael': [-34.617, -68.33], 'General Alvear': [-34.977, -67.7], Malargüe: [-35.475, -69.585] };
export function Salud() {
  const q = useApi('/admin/casos');
  const [esp, setEsp] = useState('');
  return (
    <>
      <PageHead kicker="Vigilancia epidemiológica veterinaria" title="Salud pública"><button className="btn btn-primary" onClick={() => toast('Alerta enviada a los colegas de la zona por app y WhatsApp')}>Emitir alerta a colegas de la zona</button></PageHead>
      <p className="muted small">Los matriculados notifican casos desde su portal en 30 segundos. La subcomisión de Salud Pública y Zoonosis ve el mapa, alerta a la zona y comparte datos agregados con Salud y SENASA.</p>
      <Load q={q}>{list => {
        const especies = [...new Set(list.map(c => c.especie))];
        const rows = list.filter(c => !esp || c.especie === esp);
        const byDep = {};
        rows.forEach(c => { byDep[c.departamento] = byDep[c.departamento] || { n: 0, ev: [] }; byDep[c.departamento].n += c.casos; byDep[c.departamento].ev.push(c.evento); });
        const circles = Object.entries(byDep).filter(([d]) => COORD[d]).map(([d, x]) => ({ ll: COORD[d], r: 3000 + x.n * 1800, label: `<b>${d}</b><br>${x.n} caso(s)<br>${[...new Set(x.ev)].join(', ')}` }));
        return (
          <>
            <Seg value={esp} onChange={setEsp} options={[['', 'Todas las especies'], ...especies.map(e => [e, e])]} />
            <div className="grid g2" style={{ alignItems: 'start', marginTop: 12 }}>
              <div className="card" style={{ padding: 0, overflow: 'hidden', height: 380 }}><MapView items={[]} circles={circles} center={[-33.6, -68.6]} zoom={7} scrollWheel={false} /></div>
              <div className="tblwrap"><table className="tbl"><thead><tr><th>Sem.</th><th>Evento</th><th>Departamento</th><th>Casos</th><th>Notificó</th></tr></thead><tbody>
                {rows.map(c => <tr key={c.id}><td className="mono">{c.semana}</td><td><b className="small">{c.evento}</b><div className="tiny muted">{c.especie} · {c.diagnostico}</div></td><td className="small">{c.departamento}</td><td><b>{c.casos}</b></td><td className="tiny muted">{c.vet ? `MP ${c.vet.mp}` : '—'}</td></tr>)}
              </tbody></table></div>
            </div>
          </>
        );
      }}</Load>
    </>
  );
}

// ───────────────── Municipios (zoonosis como servicio)
export function Municipios() {
  const q = useApi('/admin/municipios');
  const nav = useNavigate();
  const abrir = m => nav(`/admin/municipios/${m.id}/abrir`);
  const [f, setF] = useState(null);
  const alta = async () => { await api.post('/admin/municipios', f); toast(`Municipio dado de alta. Usuario ${f.email} con contraseña demo1234.`); setF(null); q.reload(); };
  const set = k => e => setF({ ...f, [k]: e.target.value });
  return (
    <>
      <PageHead kicker="Servicio para municipios · zoonosis digital" title="Municipios"><button className="btn btn-primary" onClick={() => setF({ nombre: 'Las Heras', nombreCredencial: 'Credencial Sanitaria Animal', sigla: 'CSA', color: '#7c1c6f', email: 'zoonosis@lasheras.demo' })}>+ Alta de municipio</button></PageHead>
      <p className="muted small" style={{ maxWidth: 760 }}>El Colegio ofrece la plataforma a los municipios: cada uno tiene su panel de zoonosis, su credencial animal con nombre y color propios, campañas con carga sin conexión y registro de mordeduras. Las vacunas que firman los matriculados aparecen solas en la credencial municipal.</p>
      <Load q={q}>{list => (
        <div className="grid g3" style={{ marginTop: 12 }}>
          {list.map(m => (
            <div className="card" key={m.id} style={{ borderTop: `4px solid ${m.color}` }}>
              <div className="row between"><b>{m.nombre}</b><Badge cls="b-ok">Activo</Badge></div>
              <div className="small muted" style={{ marginTop: 4 }}>{m.nombreCredencial} · <span className="mono">{m.sigla}</span></div>
              <div className="grid g3" style={{ gap: 6, marginTop: 12 }}>
                <div><div className="tiny muted">Credenciales</div><b>{m._count.animales}</b></div>
                <div><div className="tiny muted">Campañas</div><b>{m._count.campanias}</b></div>
                <div><div className="tiny muted">Mordeduras</div><b>{m._count.mordeduras}</b></div>
              </div>
              <button className="btn btn-primary btn-sm" style={{ marginTop: 14, width: '100%' }} onClick={() => abrir(m)}>Abrir el panel de zoonosis</button>
            </div>
          ))}
          {!list.length && <Empty>Todavía no hay municipios.</Empty>}
        </div>
      )}</Load>
      <Modal open={!!f} onClose={() => setF(null)} title="Alta de municipio" subtitle="Crea el panel de zoonosis y el usuario responsable">
        {f && <>
          <div className="grid g2" style={{ gap: 10 }}>
            <Field label="Municipio"><input type="text" value={f.nombre} onChange={set('nombre')} /></Field>
            <Field label="Email del responsable"><input type="email" value={f.email} onChange={set('email')} /></Field>
            <Field label="Nombre de la credencial"><input type="text" value={f.nombreCredencial} onChange={set('nombreCredencial')} /></Field>
            <Field label="Sigla"><input type="text" value={f.sigla} onChange={set('sigla')} /></Field>
            <Field label="Color institucional"><input type="color" value={f.color} onChange={set('color')} style={{ height: 42, padding: 4 }} /></Field>
          </div>
          <AsyncBtn className="btn btn-primary" onClick={alta}>Dar de alta</AsyncBtn>
        </>}
      </Modal>
    </>
  );
}
