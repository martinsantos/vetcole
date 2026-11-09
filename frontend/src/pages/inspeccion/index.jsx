// Inspecciones de establecimientos (rol INSPECTOR del Colegio): agenda, formulario de revisión, acta y acreditación.
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api, useApi } from '../../lib/api.js';
import { Badge, Kpi, PageHead, Spinner, ErrorBox, Empty, Modal, Field, AsyncBtn, QR, verifyUrl, toast } from '../../components/ui.jsx';
import { fdate, fdt, isoDate } from '../../lib/format.js';
import './inspeccion.css';

const Load = ({ q, children }) => (q.error ? <ErrorBox error={q.error} onRetry={q.reload} /> : !q.data ? <Spinner /> : children(q.data));
export const resCls = r => ({ Acreditado: 'b-ok', 'Acreditado con observaciones': 'b-warn', 'No acreditado': 'b-bad' }[r] || 'b-grey');
const MOTIVOS = ['Habilitación', 'Renovación', 'Control periódico', 'Denuncia', 'Reinspección'];

function Programar({ open, onClose, onOk, estId }) {
  const ests = useApi(open ? '/inspeccion/establecimientos' : null);
  const [f, setF] = useState(null);
  useEffect(() => { if (open) setF({ estId: estId || '', programada: isoDate(new Date(Date.now() + 864e5)), motivo: 'Control periódico' }); }, [open, estId]);
  const guardar = async () => { await api.post('/inspeccion', f); toast('Inspección programada'); onOk(); };
  return (
    <Modal open={open} onClose={onClose} title="Programar inspección" subtitle="Queda en la agenda de inspecciones">
      {f && <>
        <Field label="Establecimiento"><select value={f.estId} onChange={e => setF({ ...f, estId: e.target.value })}><option value="">Elegí un establecimiento</option>{(ests.data || []).map(e => <option key={e.id} value={e.id}>{e.nombre} · {e.departamento}</option>)}</select></Field>
        <div className="grid g2" style={{ gap: 10 }}>
          <Field label="Fecha"><input type="date" value={f.programada} onChange={e => setF({ ...f, programada: e.target.value })} /></Field>
          <Field label="Motivo"><select value={f.motivo} onChange={e => setF({ ...f, motivo: e.target.value })}>{MOTIVOS.map(m => <option key={m}>{m}</option>)}</select></Field>
        </div>
        <AsyncBtn className="btn btn-primary" disabled={!f.estId} onClick={guardar}>Programar</AsyncBtn>
      </>}
    </Modal>
  );
}

export function Agenda() {
  const q = useApi('/inspeccion');
  const [prog, setProg] = useState(false);
  const nav = useNavigate();
  return (
    <>
      <PageHead kicker="Inspecciones" title="Agenda de inspecciones"><button className="btn btn-primary" onClick={() => setProg(true)}>+ Programar inspección</button></PageHead>
      <Load q={q}>{d => (
        <>
          <div className="grid g3">
            <Kpi label="Pendientes" value={d.resumen.programadas} sub="programadas o en curso" />
            <Kpi label="Atrasadas" value={d.resumen.vencidas} sub="con fecha vencida" color={d.resumen.vencidas ? 'var(--bad)' : undefined} />
            <Kpi label="Realizadas" value={d.resumen.finalizadasMes} sub="en los últimos 30 días" />
          </div>
          <div className="insp-lista">
            {d.agenda.map(i => { const atrasada = i.estado === 'Programada' && new Date(i.programada) < new Date(); return (
              <div key={i.id} className={`card insp-item ${atrasada ? 'atrasada' : ''}`}>
                <div className="insp-fecha"><b>{new Date(i.programada).getDate()}</b><span>{new Date(i.programada).toLocaleDateString('es-AR', { month: 'short' }).replace('.', '')}</span></div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <b>{i.est.nombre}</b>
                  <div className="small muted">{i.est.tipo} · {i.est.direccion}, {i.est.departamento}</div>
                  <div className="row" style={{ gap: 6, marginTop: 6 }}><Badge cls="b-grey">{i.motivo}</Badge>{atrasada && <Badge cls="b-bad">Atrasada</Badge>}{i.estado === 'En curso' && <Badge cls="b-warn">En curso</Badge>}{i.est.acreditacion && <Badge cls={resCls(i.est.acreditacion)}>{i.est.acreditacion}</Badge>}</div>
                </div>
                <button className="btn btn-primary" onClick={() => nav(`/inspeccion/${i.id}`)}>{i.estado === 'En curso' ? 'Continuar' : 'Inspeccionar'}</button>
              </div>
            ); })}
            {!d.agenda.length && <Empty>No hay inspecciones pendientes.</Empty>}
          </div>
        </>
      )}</Load>
      <Programar open={prog} onClose={() => setProg(false)} onOk={() => { setProg(false); q.reload(); }} />
    </>
  );
}

export function Historial() {
  const q = useApi('/inspeccion');
  return (
    <>
      <PageHead kicker="Inspecciones" title="Actas" />
      <Load q={q}>{d => (
        <div className="tblwrap"><table className="tbl"><thead><tr><th>Acta</th><th>Establecimiento</th><th>Motivo</th><th>Fecha</th><th>Resultado</th><th>Inspector/a</th><th /></tr></thead><tbody>
          {d.historial.map(i => <tr key={i.id}><td className="mono">{i.numero}</td><td><b>{i.est.nombre}</b><div className="tiny muted">{i.est.departamento}</div></td><td className="small">{i.motivo}</td><td className="small">{fdate(i.realizada)}</td><td><Badge cls={resCls(i.resultado)}>{i.resultado}</Badge></td><td className="small">{i.inspector || '—'}</td><td><Link className="btn btn-sm" to={`/inspeccion/${i.id}`}>Ver acta</Link></td></tr>)}
          {!d.historial.length && <tr><td colSpan={7}><Empty /></td></tr>}
        </tbody></table></div>
      )}</Load>
    </>
  );
}

export function Establecimientos() {
  const q = useApi('/inspeccion/establecimientos');
  const [prog, setProg] = useState(null);
  const [filtro, setFiltro] = useState('');
  return (
    <>
      <PageHead kicker="Inspecciones" title="Acreditación de establecimientos" />
      <Load q={q}>{list => {
        const cuenta = r => list.filter(e => (r === 'sin' ? !e.acreditacion : e.acreditacion === r)).length;
        const vis = list.filter(e => !filtro || (filtro === 'sin' ? !e.acreditacion : e.acreditacion === filtro));
        return (
          <>
            <div className="row" style={{ gap: 8, marginBottom: 12 }}>
              {[['', `Todos (${list.length})`], ['Acreditado', `Acreditados (${cuenta('Acreditado')})`], ['Acreditado con observaciones', `Con observaciones (${cuenta('Acreditado con observaciones')})`], ['No acreditado', `No acreditados (${cuenta('No acreditado')})`], ['sin', `Sin inspeccionar (${cuenta('sin')})`]].map(([k, l]) => <button key={k} className={`chip ${filtro === k ? 'on' : ''}`} onClick={() => setFiltro(k)}>{l}</button>)}
            </div>
            <div className="tblwrap"><table className="tbl"><thead><tr><th>Establecimiento</th><th>Acreditación</th><th>Vigente hasta</th><th>Última inspección</th><th /></tr></thead><tbody>
              {vis.map(e => <tr key={e.id}>
                <td><b>{e.nombre}</b><div className="tiny muted">{e.tipo} · {e.direccion}, {e.departamento}</div></td>
                <td>{e.acreditacion ? <Badge cls={resCls(e.acreditacion)}>{e.acreditacion}</Badge> : <Badge cls="b-grey">Sin inspeccionar</Badge>}</td>
                <td className="small">{e.acreditadoHasta ? fdate(e.acreditadoHasta) : '—'}</td>
                <td className="small">{e.ultima ? `${e.ultima.estado === 'Finalizada' ? fdate(e.ultima.realizada) : `programada ${fdate(e.ultima.programada)}`}` : '—'}</td>
                <td style={{ textAlign: 'right' }}><button className="btn btn-sm" onClick={() => setProg(e.id)}>Programar</button></td>
              </tr>)}
            </tbody></table></div>
          </>
        );
      }}</Load>
      <Programar open={!!prog} estId={prog} onClose={() => setProg(null)} onOk={() => { setProg(null); q.reload(); }} />
    </>
  );
}

// Formulario de revisión y acta.
export function Formulario() {
  const { id } = useParams();
  const q = useApi(`/inspeccion/${id}`);
  const cl = useApi('/inspeccion/checklist');
  const [resp, setResp] = useState(null), [obs, setObs] = useState(''), [responsable, setResponsable] = useState('');
  const [cerrar, setCerrar] = useState(false);
  useEffect(() => {
    if (!q.data || resp) return;
    const r = { ...q.data.checklist };
    // El ítem del director técnico se responde solo con el padrón del Colegio.
    if (!r.doc_dt && q.data.padron.dt) r.doc_dt = { r: q.data.padron.dt.vigente ? 'si' : 'no', obs: `${q.data.padron.dt.titulo} · MP ${q.data.padron.dt.mp} · ${q.data.padron.dt.vigente ? 'vigente' : 'no vigente'} según el padrón` };
    setResp(r); setObs(q.data.observaciones || ''); setResponsable(q.data.responsable || '');
  }, [q.data, resp]);
  const items = useMemo(() => (cl.data || []).flatMap(s => s.items), [cl.data]);
  const ev = useMemo(() => {
    if (!resp || !items.length) return null;
    const criticos = items.filter(i => i.critico && resp[i.id]?.r === 'no'), observ = items.filter(i => !i.critico && resp[i.id]?.r === 'no');
    return { respondidos: items.filter(i => resp[i.id]?.r).length, total: items.length, criticos, observ, resultado: criticos.length ? 'No acreditado' : items.some(i => !resp[i.id]?.r) ? 'En revisión' : observ.length ? 'Acreditado con observaciones' : 'Acreditado' };
  }, [resp, items]);
  if (q.error) return <ErrorBox error={q.error} onRetry={q.reload} />;
  if (!q.data || !cl.data || !resp) return <Spinner />;
  const i = q.data, cerrada = i.estado === 'Finalizada';
  const set = (itemId, k, v) => setResp(r => ({ ...r, [itemId]: { ...r[itemId], [k]: v } }));
  const guardar = async (silencio) => { await api.patch(`/inspeccion/${i.id}`, { checklist: resp, observaciones: obs, responsable }); if (!silencio) toast('Borrador guardado'); };
  const finalizar = async () => { await guardar(true); await api.post(`/inspeccion/${i.id}/finalizar`); toast('Acta cerrada. La acreditación del establecimiento quedó actualizada.'); setCerrar(false); q.reload(); };
  return (
    <>
      <Link className="small" to="/inspeccion">← Agenda</Link>
      <div className="insp-head card">
        <div style={{ flex: 1, minWidth: 260 }}>
          <div className="tiny muted">{i.numero} · {i.motivo}</div>
          <h2 style={{ margin: '4px 0' }}>{i.est.nombre}</h2>
          <div className="small muted">{i.est.tipo} · {i.est.direccion}, {i.est.departamento}</div>
          <div className="small" style={{ marginTop: 6 }}>Director/a técnico/a: <b>{i.padron.dt ? `${i.padron.dt.titulo} · MP ${i.padron.dt.mp}` : 'sin designar'}</b>{i.padron.dt && <> <Badge cls={i.padron.dt.vigente ? 'b-ok' : 'b-bad'}>{i.padron.dt.vigente ? 'Matrícula vigente' : 'Matrícula no vigente'}</Badge></>}</div>
        </div>
        <div className="insp-res">
          {cerrada ? <><span className="tiny muted">Resultado del acta</span><Badge cls={resCls(i.resultado)} style={{ fontSize: 14, padding: '6px 12px' }}>{i.resultado}</Badge><span className="tiny muted">{fdt(i.realizada)}{i.inspector ? ` · ${i.inspector}` : ''}</span></>
            : <><span className="tiny muted">Resultado provisorio</span><Badge cls={resCls(ev.resultado)} style={{ fontSize: 14, padding: '6px 12px' }}>{ev.resultado}</Badge><div className="insp-prog"><i style={{ width: `${(ev.respondidos / ev.total) * 100}%` }} /></div><span className="tiny muted">{ev.respondidos} de {ev.total} ítems respondidos</span></>}
        </div>
      </div>

      {cl.data.map(sec => (
        <section key={sec.id} className="card insp-sec">
          <h3>{sec.titulo}</h3>
          {sec.items.map(it => { const r = resp[it.id] || {}; return (
            <div key={it.id} className={`insp-row ${r.r === 'no' ? (it.critico ? 'mal-critico' : 'mal') : ''}`}>
              <div className="insp-q"><span>{it.t}</span>{it.critico && <Badge cls="b-bad">Crítico</Badge>}{it.auto && <Badge cls="b-grey">Desde el padrón</Badge>}</div>
              <div className="insp-op" role="radiogroup" aria-label={it.t}>
                {[['si', 'Cumple'], ['no', 'No cumple'], ['na', 'No aplica']].map(([k, l]) => <button key={k} type="button" role="radio" aria-checked={r.r === k} disabled={cerrada} className={`op-${k} ${r.r === k ? 'on' : ''}`} onClick={() => set(it.id, 'r', k)}>{l}</button>)}
              </div>
              {(r.r === 'no' || r.obs) && <input type="text" className="insp-obs" disabled={cerrada} placeholder="Observación (qué se encontró y qué hay que corregir)" value={r.obs || ''} onChange={e => set(it.id, 'obs', e.target.value)} />}
            </div>
          ); })}
        </section>
      ))}

      <section className="card insp-sec">
        <h3>Cierre</h3>
        <div className="grid g2" style={{ gap: 12 }}>
          <Field label="Atendió la inspección (nombre y cargo)"><input type="text" disabled={cerrada} value={responsable} onChange={e => setResponsable(e.target.value)} placeholder="Ej.: Dra. Lucía Ferreyra, directora técnica" /></Field>
          <Field label="Observaciones generales"><input type="text" disabled={cerrada} value={obs} onChange={e => setObs(e.target.value)} /></Field>
        </div>
        {cerrada ? (
          <div className="row" style={{ gap: 14, alignItems: 'center' }}>
            <QR text={verifyUrl(`/verificar/e/${i.est.codigo}`)} size={84} />
            <p className="small" style={{ flex: 1, margin: 0 }}>Acta {i.numero} cerrada. {i.plazoDias ? `Plazo de corrección: ${i.plazoDias} días; la reinspección quedó en la agenda.` : 'Sin observaciones.'} La acreditación se ve en la verificación pública del establecimiento (QR de la oblea).</p>
          </div>
        ) : (
          <div className="row" style={{ gap: 8 }}>
            <AsyncBtn className="btn" onClick={() => guardar()}>Guardar borrador</AsyncBtn>
            <button className="btn btn-primary" disabled={ev.respondidos < ev.total || !responsable.trim()} onClick={() => setCerrar(true)}>Finalizar y cerrar el acta</button>
            {(ev.respondidos < ev.total || !responsable.trim()) && <span className="small muted">{ev.respondidos < ev.total ? `Faltan ${ev.total - ev.respondidos} ítems.` : 'Indicá quién atendió la inspección.'}</span>}
          </div>
        )}
      </section>

      <Modal open={cerrar} onClose={() => setCerrar(false)} title="Cerrar el acta" subtitle={`${i.numero} · ${i.est.nombre}`}>
        {ev && <>
          <p>Resultado: <Badge cls={resCls(ev.resultado)}>{ev.resultado}</Badge></p>
          {!!ev.criticos.length && <><b className="small">Incumplimientos críticos</b><ul className="small">{ev.criticos.map(x => <li key={x.id}>{x.t}</li>)}</ul></>}
          {!!ev.observ.length && <><b className="small">Observaciones</b><ul className="small">{ev.observ.map(x => <li key={x.id}>{x.t}</li>)}</ul></>}
          <p className="small muted">{ev.resultado === 'Acreditado' ? 'El establecimiento queda acreditado por 2 años.' : ev.resultado === 'Acreditado con observaciones' ? 'Queda acreditado con 30 días para corregir; se agenda la reinspección.' : 'Queda no acreditado; se agenda la reinspección a 60 días.'} Una vez cerrada, el acta no se puede modificar.</p>
          <AsyncBtn className="btn btn-primary" onClick={finalizar}>Cerrar el acta</AsyncBtn>
        </>}
      </Modal>
    </>
  );
}
