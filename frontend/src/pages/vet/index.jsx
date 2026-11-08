// Portal del matriculado (lado Colegio): resumen + guardia, credencial, cuotas, trámites, recetas,
// establecimiento (credencial/oblea/cartel), notificación de casos, asamblea y ficha pública.
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, useApi } from '../../lib/api.js';
import { money, fdate, fdt, DEPTOS } from '../../lib/format.js';
import { Badge, Kpi, PageHead, Spinner, ErrorBox, Empty, Modal, Field, Switch, Seg, AsyncBtn, Av, toast, verifyUrl } from '../../components/ui.jsx';
import { CredencialCard, EstKit, RecetaDoc, printOnly } from './kit.jsx';
import './vet.css';

const useResumen = () => useApi('/vet/resumen');
const Load = ({ q, children }) => (q.error ? <ErrorBox error={q.error} onRetry={q.reload} /> : !q.data ? <Spinner /> : children(q.data));

// ───────────────── Resumen + declaración de guardia
function GuardiaCard({ e, onChange }) {
  const [g, setG] = useState(e.guardia || '');
  const set = async v => {
    try {
      const r = await api.patch(`/vet/establecimientos/${e.codigo}/guardia`, { guardia: v || null });
      setG(v); onChange?.(r);
      toast(v ? `Listo: ${e.nombre} figura con guardia ${v} en el tablero público.` : 'Sin guardia hoy. Se quitó del tablero público.');
    } catch (err) { toast(err.message, 'error'); }
  };
  return (
    <div className="card gcard" style={{ marginTop: 16 }}>
      <div className="row between" style={{ alignItems: 'center' }}>
        <div style={{ minWidth: 240, flex: 1 }}>
          <div className="kicker">Sos DT de {e.nombre}</div>
          <h3 style={{ margin: '6px 0 2px' }}>¿Hoy hacen guardia?</h3>
          <div className="small muted">Lo que elijas aparece al instante en el <Link to="/guardias">tablero de guardia</Link> y en el mapa público.</div>
        </div>
        <Seg value={g} onChange={set} options={[['', 'No'], ['pasiva', 'Pasiva (a llamado)'], ['activa', 'Activa 24 h']]} />
      </div>
    </div>
  );
}

export function VetHome() {
  const q = useResumen();
  return <Load q={q}>{d => {
    const v = d.vet, c = d.cuotaPendiente;
    const todos = [
      c && { t: `Pagar cuota ${c.periodo} (${money(c.monto)})`, to: '/vet/cuotas', b: 'Pagar' },
      ...d.tramites.filter(t => t.estado !== 'Resuelto').map(t => ({ t: `${t.tipo} · ${t.estado}`, to: '/vet/tramites', b: 'Ver trámite' })),
      !d.acreditado && { t: 'Asamblea ordinaria: acreditate para votar online', to: '/vet/asamblea', b: 'Acreditarme' },
      { t: `Tenés ${d.turnosHoy} turnos hoy en el consultorio`, to: '/vet/consultorio/agenda', b: 'Ver agenda' },
    ].filter(Boolean);
    return (
      <>
        <PageHead kicker={`Hola, ${v.nombre}`} title="Resumen"><Link className="btn" to="/vet/credencial">Mostrar credencial</Link></PageHead>
        <div className="grid g4">
          <Kpi label="Matrícula" value={v.estado} color={v.estado === 'Vigente' ? 'var(--ok)' : 'var(--bad)'} sub={`MP ${v.mp} · desde ${v.alta}`} />
          <Kpi label="Cuota" value={c ? money(c.monto) : 'Al día'} sub={c ? `Vence ${fdate(c.vence)}` : 'Sin deuda'} color={c ? 'var(--warn)' : undefined} />
          <Kpi label="Turnos hoy" value={d.turnosHoy} sub="en tu consultorio" />
          <Kpi label="Asamblea" value={d.acreditado ? 'Acreditada' : 'Pendiente'} sub="sáb. 12/12 · mixta" color={d.acreditado ? 'var(--ok)' : undefined} />
        </div>
        {d.establecimientos.filter(e => e.esDT).map(e => <GuardiaCard key={e.codigo} e={e} />)}
        <div className="grid g2" style={{ marginTop: 16 }}>
          <div className="card"><h3>Para hacer</h3>
            {todos.map((x, i) => <div className="vet-todo" key={i}><span className="small">{x.t}</span><Link className="btn btn-sm" to={x.to}>{x.b}</Link></div>)}
          </div>
          <div className="card"><h3>Alertas sanitarias</h3>
            {d.alertas.map(a => <div className="vet-todo" key={a.id}><div><b className="small">{a.evento}</b><div className="tiny muted">{a.departamento} · {a.casos} caso(s) · {a.especie}</div></div><span className="mono tiny muted">SE {a.semana}</span></div>)}
            <Link className="btn btn-sm" style={{ marginTop: 10 }} to="/vet/casos">Notificar un caso</Link>
          </div>
        </div>
      </>
    );
  }}</Load>;
}

// ───────────────── Credencial
export function Credencial() {
  const q = useResumen();
  return <Load q={q}>{d => (
    <>
      <PageHead kicker="Credencial digital" title="Mi credencial" />
      <div className="grid g2" style={{ alignItems: 'start' }}>
        <div>
          <CredencialCard vet={d.vet} alDia={!d.cuotaPendiente} />
          <div className="row" style={{ marginTop: 16 }}>
            <button className="btn btn-sm wbtn" onClick={() => toast('Credencial agregada a Google Wallet (demo)')}>Google Wallet</button>
            <button className="btn btn-sm wbtn" onClick={() => toast('Credencial agregada a Apple Wallet (demo)')}>Apple Wallet</button>
            <Link className="btn btn-sm" to={`/verificar/${d.vet.mp}`}>Ver lo que ve quien escanea</Link>
          </div>
        </div>
        <div className="card"><h3>Cómo funciona</h3>
          <ul className="small" style={{ paddingLeft: 18 }}>
            <li>El QR abre la verificación pública: nombre, matrícula, estado y fecha de consulta.</li>
            <li>Si la matrícula se suspende, la credencial y la verificación lo muestran al instante.</li>
            <li>Se guarda en Google o Apple Wallet, sin instalar ninguna app.</li>
            <li>¿Querés la credencial plástica? Pedila como trámite y pagala online.</li>
          </ul>
          <div className="tiny muted mono" style={{ wordBreak: 'break-all' }}>{verifyUrl(`/verificar/${d.vet.mp}`)}</div>
        </div>
      </div>
    </>
  )}</Load>;
}

// ───────────────── Cuotas
export function Cuotas() {
  const q = useApi('/vet/cuotas');
  const [pay, setPay] = useState(null), [medio, setMedio] = useState('Tarjeta');
  const pagar = async () => { await api.post(`/vet/cuotas/${pay.id}/pagar`, { medio }); toast('Pago confirmado. La credencial ya muestra «cuota al día».'); setPay(null); q.reload(); };
  return (
    <>
      <PageHead kicker="Cuotas y pagos" title="Estado de cuenta"><Switch checked={false} onChange={v => toast(v ? 'Débito automático activado (demo)' : 'Débito automático desactivado')}>Débito automático</Switch></PageHead>
      <Load q={q}>{list => (
        <div className="tblwrap"><table className="tbl"><thead><tr><th>Período</th><th>Importe</th><th>Vencimiento</th><th>Estado</th><th /></tr></thead><tbody>
          {list.map(c => <tr key={c.id}><td><b>{c.periodo}</b></td><td>{money(c.monto)}</td><td>{fdate(c.vence)}</td>
            <td><Badge cls={c.estado === 'Pagada' ? 'b-ok' : 'b-warn'}>{c.estado}{c.pagadaEn ? ` · ${fdate(c.pagadaEn)}` : ''}</Badge></td>
            <td style={{ textAlign: 'right' }}>{c.estado === 'Pagada' ? <button className="btn btn-sm" onClick={() => toast('Comprobante descargado (demo)')}>Comprobante</button> : <button className="btn btn-sm btn-primary" onClick={() => setPay(c)}>Pagar</button>}</td></tr>)}
        </tbody></table></div>
      )}</Load>
      <p className="tiny muted" style={{ marginTop: 10 }}>El Colegio elige pasarela y medios de pago; Última Milla no cobra comisión por cuota.</p>
      <Modal open={!!pay} onClose={() => setPay(null)} title={`Pagar cuota ${pay?.periodo || ''}`} subtitle={pay ? `${money(pay.monto)} · vence ${fdate(pay.vence)}` : ''}>
        <Seg value={medio} onChange={setMedio} options={['Tarjeta', 'Transferencia', 'Mercado Pago', 'Débito automático']} />
        {medio === 'Tarjeta' && <div style={{ marginTop: 12 }}><Field label="Número de tarjeta"><input type="text" defaultValue="4509 9535 6623 3704" /></Field><div className="grid g2" style={{ gap: 10 }}><Field label="Vencimiento"><input type="text" defaultValue="11/28" /></Field><Field label="CVV"><input type="text" defaultValue="123" /></Field></div></div>}
        <AsyncBtn className="btn btn-primary btn-block" style={{ marginTop: 12 }} onClick={pagar}>Pagar {pay && money(pay.monto)}</AsyncBtn>
        <p className="tiny muted" style={{ margin: '8px 0 0' }}>Simulación: no se realiza ningún cobro.</p>
      </Modal>
    </>
  );
}

// ───────────────── Trámites
const TIPOS_TRAMITE = ['Reposición de credencial plástica', 'Habilitación de establecimiento', 'Declaración jurada de Dirección Técnica', 'Control voluntario de establecimiento', 'Registro de especialidad', 'Certificado de matrícula vigente / ética', 'Suspensión voluntaria o baja'];
export function Tramites() {
  const q = useApi('/vet/tramites');
  const [open, setOpen] = useState(false);
  const crear = async tipo => { await api.post('/vet/tramites', { tipo }); toast('Trámite iniciado. Te avisamos cada avance.'); setOpen(false); q.reload(); };
  return (
    <>
      <PageHead kicker="Mesa de entradas digital" title="Trámites"><button className="btn btn-primary" onClick={() => setOpen(true)}>+ Nuevo trámite</button></PageHead>
      <Load q={q}>{list => list.length ? list.map(t => (
        <div className="card" style={{ marginBottom: 14 }} key={t.id}>
          <div className="row between"><div><b>{t.tipo}</b><div className="tiny muted mono">{t.numero} · iniciado {fdate(t.createdAt)}</div></div><Badge cls={t.actual >= t.pasos.length ? 'b-ok' : 'b-warn'}>{t.estado}</Badge></div>
          <ul className="timeline" style={{ marginTop: 14 }}>{t.pasos.map((p, i) => <li key={i} className={i < t.actual ? 'done' : i === t.actual ? 'cur' : ''}>{p}</li>)}</ul>
          <div className="row"><button className="btn btn-sm" onClick={() => toast('Mensaje enviado a Mesa de Entradas')}>Escribir al Colegio</button><button className="btn btn-sm" onClick={() => toast('Archivo adjuntado al trámite (demo)')}>Adjuntar documentación</button></div>
        </div>
      )) : <Empty>No tenés trámites.</Empty>}</Load>
      <Modal open={open} onClose={() => setOpen(false)} title="Nuevo trámite" subtitle="Los formularios y requisitos que hoy están en PDF, online y con seguimiento.">
        {TIPOS_TRAMITE.map(t => <AsyncBtn key={t} className="acct" onClick={() => crear(t)}><span className="badge">⇄</span><b className="small">{t}</b></AsyncBtn>)}
      </Modal>
    </>
  );
}

// ───────────────── Recetas
export function Recetas() {
  const q = useApi('/vet/recetas');
  const pac = useApi('/clinic/pacientes');
  const [f, setF] = useState({ libreta: '', tipo: 'Común', medicamento: 'Meloxicam 1 mg', posologia: '1/2 comprimido cada 24 h por 5 días', cantidad: '5 comprimidos' });
  const [ver, setVer] = useState(null);
  const me = useResumen();
  useEffect(() => { if (pac.data?.length && !f.libreta) setF(x => ({ ...x, libreta: pac.data[0].libreta })); }, [pac.data, f.libreta]);
  const emitir = async () => {
    const rx = await api.post('/vet/recetas', { libreta: f.libreta, tipo: f.tipo, items: [{ medicamento: f.medicamento, posologia: f.posologia, cantidad: f.cantidad }] });
    toast('Receta firmada y emitida'); q.reload();
    setVer({ ...rx, prescriptor: me.data && { mp: me.data.vet.mp, titulo: me.data.vet.titulo, vigente: true } });
  };
  const cannabis = async simular => { await api.post('/vet/cannabis', simular ? { simularAprobacion: true } : {}); toast(simular ? 'Demo: el Colegio aprobó la inscripción' : 'Solicitud enviada. Queda como trámite con seguimiento.'); q.reload(); };
  const pc = q.data?.prescriptorCannabis;
  const prescriptor = me.data ? { mp: me.data.vet.mp, titulo: me.data.vet.titulo, vigente: me.data.vet.estado === 'Vigente' } : null;
  return (
    <>
      <PageHead kicker="Receta electrónica con QR · registro de prescriptores" title="Recetas"><Link className="btn" to="/receta">Cómo la verifica una farmacia</Link></PageHead>
      <div className="grid g2" style={{ alignItems: 'start' }}>
        <div className="card"><h3>Emitir receta</h3>
          <Field label="Paciente">{pac.data ? <select value={f.libreta} onChange={e => setF({ ...f, libreta: e.target.value })}>{pac.data.map(p => <option key={p.id} value={p.libreta}>{p.nombre} · {p.especie} · {p.libreta} · {p.tutor.nombre}</option>)}</select> : <Spinner />}</Field>
          <Field label="Tipo"><select value={f.tipo} onChange={e => setF({ ...f, tipo: e.target.value })}>{['Común', 'Antimicrobiano', 'Psicotrópico', 'Cannabis medicinal veterinario'].map(t => <option key={t}>{t}</option>)}</select></Field>
          <Field label="Medicamento y presentación"><input type="text" value={f.medicamento} onChange={e => setF({ ...f, medicamento: e.target.value })} /></Field>
          <div className="grid g2" style={{ gap: 10 }}>
            <Field label="Posología"><input type="text" value={f.posologia} onChange={e => setF({ ...f, posologia: e.target.value })} /></Field>
            <Field label="Cantidad"><input type="text" value={f.cantidad} onChange={e => setF({ ...f, cantidad: e.target.value })} /></Field>
          </div>
          <AsyncBtn className="btn btn-primary" onClick={emitir}>Firmar y emitir</AsyncBtn>
          <p className="tiny muted" style={{ margin: '10px 0 0' }}>Los antimicrobianos quedan registrados para el seguimiento de uso responsable.</p>
        </div>
        <div className="card" style={{ borderLeft: `4px solid ${pc === 'si' ? 'var(--ok)' : pc === 'tramite' ? 'var(--amber)' : 'var(--line)'}` }}>
          <div className="kicker">Registro de prescriptores</div><h3 style={{ margin: '6px 0' }}>Cannabis medicinal veterinario</h3>
          <p className="small muted">La normativa provincial exige matrícula vigente para prescribir. El Colegio certifica la habilitación de cada profesional y la farmacia la ve al escanear la receta.</p>
          <div className="row">
            <Badge cls={pc === 'si' ? 'b-ok' : pc === 'tramite' ? 'b-warn' : 'b-grey'}>{pc === 'si' ? 'Inscripto/a' : pc === 'tramite' ? 'Solicitud en revisión' : 'No inscripto/a'}</Badge>
            {pc === 'no' && <AsyncBtn className="btn btn-sm" onClick={() => cannabis(false)}>Solicitar inscripción</AsyncBtn>}
            {pc === 'tramite' && <AsyncBtn className="btn btn-sm" onClick={() => cannabis(true)}>Simular aprobación del Colegio</AsyncBtn>}
          </div>
        </div>
      </div>
      <h3 style={{ marginTop: 22 }}>Emitidas</h3>
      <Load q={q}>{d => (
        <div className="tblwrap"><table className="tbl"><thead><tr><th>Receta</th><th>Fecha</th><th>Paciente</th><th>Tipo</th><th>Estado</th><th /></tr></thead><tbody>
          {d.recetas.map(r => <tr key={r.id}><td className="mono small"><b>{r.codigo}</b></td><td className="small">{fdate(r.fecha)}</td><td className="small">{r.paciente?.nombre}</td><td><Badge cls="b-grey">{r.tipo}</Badge></td><td><Badge cls={r.estado === 'Vigente' ? 'b-ok' : 'b-grey'}>{r.estado}</Badge></td>
            <td style={{ textAlign: 'right' }}><button className="btn btn-sm" onClick={() => setVer({ ...r, prescriptor })}>Ver</button></td></tr>)}
        </tbody></table></div>
      )}</Load>
      <Modal open={!!ver} onClose={() => setVer(null)}>
        {ver && <>
          <div style={{ paddingTop: 24 }}><RecetaDoc rx={ver} id="rx-print" /></div>
          <div className="row" style={{ marginTop: 14 }}>
            <button className="btn btn-primary" onClick={() => toast('Receta enviada al tutor/a por WhatsApp')}>Enviar al tutor/a</button>
            <button className="btn" onClick={() => printOnly('rx-print')}>Imprimir</button>
            <Link className="btn" to={`/receta/${ver.codigo}`}>Ver como farmacia</Link>
          </div>
        </>}
      </Modal>
    </>
  );
}

// ───────────────── Establecimiento: credencial, oblea y cartel
export function Establecimiento() {
  const q = useResumen();
  return <Load q={q}>{d => {
    const ests = d.establecimientos;
    if (!ests.length) return <Empty>No estás vinculado/a a ningún establecimiento.</Empty>;
    return ests.map(e => (
      <section key={e.codigo} style={{ marginBottom: 36 }}>
        <PageHead kicker={e.esDT ? 'Sos director/a técnico/a' : 'Integrás el equipo'} title={e.nombre}>
          <Link className="btn" to={`/verificar/e/${e.codigo}`}>Ver lo que ve quien escanea</Link>
          <button className="btn btn-primary" onClick={() => printOnly(`est-poster-${e.codigo}`)}>Imprimir cartel A4</button>
        </PageHead>
        <div className="grid g4" style={{ marginBottom: 16 }}>
          <Kpi label="Habilitación" value={e.habilitacion || '—'} sub={e.habilitacion ? 'Vigente' : 'A cargar'} color={e.habilitacion ? undefined : 'var(--warn)'} />
          <Kpi label="Vence" value={fdate(e.venceHab)} sub="te avisamos 60 días antes" />
          <Kpi label="Escaneos del QR este mes" value={100 + (e.codigo.charCodeAt(1) * 7) % 90} sub="ejemplo" />
          <Kpi label="Equipo" value={e.equipo.length} sub="profesionales vinculados" />
        </div>
        {e.habilitacion ? <EstKit e={e} idPrefix="est" /> : <div className="note">Este establecimiento todavía no tiene la habilitación cargada.</div>}
        <div className="tiny muted mono" style={{ margin: '22px 0 8px' }}>Equipo · credenciales vinculadas</div>
        <div className="grid g2">{e.equipo.map(v => (
          <div key={v.mp} className="card flat row" style={{ padding: '10px 12px', flexWrap: 'nowrap' }}>
            <Av style={{ width: 36, height: 36, fontSize: 12 }}>{v.titulo.split(' ').slice(1, 3).map(w => w[0]).join('')}</Av>
            <div style={{ flex: 1, minWidth: 0 }}><b className="small">{v.titulo}</b><div className="tiny muted">MP {v.mp} · {v.especialidad}</div></div>
            <Link className="btn btn-sm" to={`/verificar/${v.mp}`}>Verificar</Link>
          </div>
        ))}</div>
        <button className="btn btn-sm" style={{ marginTop: 8 }} onClick={() => toast('Invitación enviada: el profesional acepta desde su portal')}>+ Vincular profesional</button>
      </section>
    ));
  }}</Load>;
}

// ───────────────── Notificar caso
const EVENTOS = ['Leptospirosis canina', 'Brucelosis', 'Rabia (sospecha)', 'Parvovirus (brote)', 'Moquillo', 'Sarna sarcóptica', 'Mordedura grave a persona', 'Intoxicación masiva', 'Otro'];
export function Casos() {
  const q = useApi('/vet/casos');
  const [f, setF] = useState({ evento: EVENTOS[0], especie: 'Perros', casos: 1, departamento: 'Capital', diagnostico: 'Sospecha clínica' });
  const enviar = async () => { await api.post('/vet/casos', f); toast('Caso notificado. Llega a la subcomisión de Salud Pública y Zoonosis.'); q.reload(); };
  const set = k => e => setF({ ...f, [k]: e.target.value });
  return (
    <>
      <PageHead kicker="Vigilancia epidemiológica veterinaria" title="Notificar un caso"><span className="small muted">30 segundos · llega a Salud Pública y Zoonosis del Colegio</span></PageHead>
      <div className="grid g2" style={{ alignItems: 'start' }}>
        <div className="card">
          <Field label="Evento"><select value={f.evento} onChange={set('evento')}>{EVENTOS.map(x => <option key={x}>{x}</option>)}</select></Field>
          <div className="grid g2" style={{ gap: 10 }}>
            <Field label="Especie"><select value={f.especie} onChange={set('especie')}>{['Perros', 'Gatos', 'Equinos', 'Bovinos', 'Caprinos', 'Fauna'].map(x => <option key={x}>{x}</option>)}</select></Field>
            <Field label="Casos"><input type="number" min="1" value={f.casos} onChange={set('casos')} /></Field>
            <Field label="Departamento"><select value={f.departamento} onChange={set('departamento')}>{DEPTOS.map(x => <option key={x}>{x}</option>)}</select></Field>
            <Field label="Diagnóstico"><select value={f.diagnostico} onChange={set('diagnostico')}><option>Sospecha clínica</option><option>Confirmado por laboratorio</option></select></Field>
          </div>
          <AsyncBtn className="btn btn-primary" onClick={enviar}>Notificar</AsyncBtn>
        </div>
        <div className="card"><h3>Notificaciones recientes en la provincia</h3>
          <Load q={q}>{list => list.slice(0, 8).map(c => <div className="vet-todo" key={c.id}><div><b className="small">{c.evento}</b><div className="tiny muted">{c.departamento} · {c.casos} caso(s) · {c.especie} · {c.diagnostico}</div></div><span className="mono tiny muted">SE {c.semana}</span></div>)}</Load>
          <p className="tiny muted" style={{ margin: '10px 0 0' }}>Se comparten agregados y sin datos personales con Salud y SENASA.</p>
        </div>
      </div>
    </>
  );
}

// ───────────────── Asamblea
export function Asamblea() {
  const q = useApi('/vet/asamblea');
  const acreditar = async () => { await api.post('/vet/asamblea/acreditar'); toast('Acreditación confirmada con tu matrícula'); q.reload(); };
  const votar = async (itemId, opcion) => { await api.post('/vet/asamblea/votar', { itemId, opcion }); toast('Voto registrado (secreto)'); q.reload(); };
  return <Load q={q}>{a => {
    const need = Math.floor(a.padron / 2) + 1;
    return (
      <>
        <PageHead kicker="Asamblea ordinaria · sáb. 12 de diciembre, 10 h · mixta (sede + online)" title="Asamblea">
          <Badge cls={a.habilitado ? 'b-ok' : 'b-bad'}>{a.habilitado ? 'Habilitado/a para votar · cuota al día' : 'No habilitado/a: regularizá tu cuota'}</Badge>
        </PageHead>
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="row between"><div><b>Quórum</b><div className="small muted">{a.presentes} acreditados de {a.padron} habilitados · se necesitan {need}</div></div>
            {a.acreditado ? <Badge cls="b-ok">✓ Acreditado/a online</Badge> : <AsyncBtn className="btn btn-primary" disabled={!a.habilitado} onClick={acreditar}>Acreditarme (presente online)</AsyncBtn>}</div>
          <div className="qbar"><i style={{ width: `${Math.min(100, (a.presentes / a.padron) * 100)}%` }} /><span style={{ left: '50%' }} /></div>
        </div>
        <h3>Orden del día</h3>
        {a.items.map(it => (
          <div className="card" style={{ marginBottom: 10 }} key={it.id}>
            <div className="row between">
              <div><span className="mono tiny muted">PUNTO {it.orden}</span><div><b>{it.titulo}</b></div><a className="small" href="#doc" onClick={e => { e.preventDefault(); toast('Documento abierto (demo)'); }}>Ver documentación</a></div>
              {it.votado ? <Badge cls="b-ok">Votaste · voto secreto registrado</Badge>
                : a.acreditado ? <div className="row" style={{ gap: 6 }}>{[['si', 'Sí'], ['no', 'No'], ['abst', 'Abstención']].map(([k, l]) => <AsyncBtn key={k} className="btn btn-sm" onClick={() => votar(it.id, k)}>{l}</AsyncBtn>)}</div>
                : <span className="small muted">Acreditate para votar</span>}
            </div>
          </div>
        ))}
        <p className="tiny muted">El padrón se arma solo con quienes tienen la cuota al día. El sistema registra que votaste, no qué votaste.</p>
      </>
    );
  }}</Load>;
}

// ───────────────── Ficha pública
export function Ficha() {
  const q = useResumen();
  const [f, setF] = useState(null);
  useEffect(() => { if (q.data && !f) { const v = q.data.vet; setF({ fichaPublica: v.fichaPublica, turnosOnline: v.turnosOnline, domicilio: v.domicilio, bio: v.bio || '' }); } }, [q.data, f]);
  const guardar = async () => { await api.patch('/vet/ficha', f); toast('Ficha actualizada en el directorio público'); };
  const v = q.data?.vet;
  const prev = useMemo(() => f && v, [f, v]);
  if (q.error) return <ErrorBox error={q.error} onRetry={q.reload} />;
  if (!f || !v) return <Spinner />;
  return (
    <>
      <PageHead kicker="Directorio público" title="Mi ficha pública"><AsyncBtn className="btn btn-primary" onClick={guardar}>Guardar cambios</AsyncBtn></PageHead>
      <div className="grid g2" style={{ alignItems: 'start' }}>
        <div className="card">
          <Switch checked={f.fichaPublica} onChange={x => setF({ ...f, fichaPublica: x })}>Aparecer en el directorio público</Switch>
          <Switch checked={f.turnosOnline} onChange={x => setF({ ...f, turnosOnline: x })}>Recibir turnos online</Switch>
          <Switch checked={f.domicilio} onChange={x => setF({ ...f, domicilio: x })}>Atiendo a domicilio / a campo</Switch>
          <Field label="Presentación"><textarea rows={4} value={f.bio} onChange={e => setF({ ...f, bio: e.target.value })} /></Field>
          <div className="small muted">Especialidades registradas: {v.especialidades.join(', ')} <Badge cls="b-ok">Validadas por el Colegio</Badge></div>
        </div>
        <div>
          <div className="tiny muted" style={{ marginBottom: 6 }}>Vista previa</div>
          {!prev || !f.fichaPublica ? <div className="card flat empty">Tu ficha no aparece en el directorio. Igual se puede verificar tu matrícula por número o QR.</div> : (
            <div className="card">
              <div className="row" style={{ alignItems: 'flex-start' }}><Av lg>{v.nombre[0]}{v.apellido[0]}</Av>
                <div style={{ flex: 1 }}><b>{v.titulo}</b><div className="tiny muted">MP {v.mp} · {v.departamento}</div>
                  <div className="row" style={{ gap: 6, marginTop: 6 }}><Badge cls="b-ok">Matrícula vigente</Badge>{f.turnosOnline && <Badge>Turnos online</Badge>}{f.domicilio && <Badge cls="b-grey">A domicilio</Badge>}</div></div></div>
              <p className="small" style={{ marginTop: 12 }}>{f.bio}</p>
              <div className="row">{f.turnosOnline && <span className="btn btn-primary btn-sm">Pedir turno</span>}<span className="btn btn-sm">WhatsApp</span><span className="btn btn-sm">Enviar consulta</span></div>
              <div className="tiny muted" style={{ marginTop: 10 }}>Actualizado {fdt(new Date())}</div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
