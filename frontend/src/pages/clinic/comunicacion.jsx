// Mensajería con tutores (llega a la app del tutor), recordatorios sanitarios y reportes del consultorio.
import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api, useApi } from '../../lib/api.js';
import { money, fdate, fdt, EVT, ini } from '../../lib/format.js';
import { PageHead, Spinner, AsyncBtn, toast, Badge, Empty, Kpi, Seg, VBars, HBars, Av } from '../../components/ui.jsx';

export function Mensajes() {
  const [sp] = useSearchParams();
  const { data: hilos, reload } = useApi('/clinic/mensajes');
  const { data: clientes } = useApi('/clinic/clientes');
  const [sel, setSel] = useState(sp.get('tutor') ? Number(sp.get('tutor')) : null);
  const [msgs, setMsgs] = useState(null), [texto, setTexto] = useState('');
  const box = useRef(null);
  useEffect(() => { if (!sel && hilos?.length) setSel(hilos[0].tutor.id); }, [hilos, sel]);
  useEffect(() => {
    if (!sel) return;
    setMsgs(null);
    api.get(`/clinic/mensajes/${sel}`).then(m => { setMsgs(m); reload(); }).catch(e => toast(e.message, 'error'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sel]);
  useEffect(() => { box.current?.scrollTo(0, 1e6); }, [msgs]);
  const enviar = async () => {
    if (!texto.trim()) return;
    const m = await api.post(`/clinic/mensajes/${sel}`, { texto });
    setMsgs(x => [...(x || []), m]); setTexto(''); reload();
  };
  const nombreSel = hilos?.find(h => h.tutor.id === sel)?.tutor.nombre || clientes?.find(c => c.tutor.id === sel)?.tutor.nombre;
  const sinHilo = (clientes || []).filter(c => !(hilos || []).some(h => h.tutor.id === c.tutor.id));
  return (
    <>
      <PageHead kicker="Lo que escribís acá llega a la app del tutor/a" title="Mensajes" />
      {!hilos ? <Spinner /> : (
        <div className="cl-threads">
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            {hilos.map(h => (
              <div key={h.tutor.id} className={`th ${sel === h.tutor.id ? 'on' : ''}`} onClick={() => setSel(h.tutor.id)}>
                <Av style={{ width: 36, height: 36, fontSize: 12 }}>{ini(h.tutor.nombre)}</Av>
                <div style={{ flex: 1, minWidth: 0 }}><div className="row between"><b className="small">{h.tutor.nombre}</b><span className="tiny muted">{fdate(h.ultimo.fecha)}</span></div><div className="tiny muted" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{h.ultimo.desdeClinica ? 'Vos: ' : ''}{h.ultimo.texto}</div></div>
                {h.sinLeer > 0 && <Badge cls="b-warn">{h.sinLeer}</Badge>}
              </div>
            ))}
            {!hilos.length && <Empty>Sin conversaciones.</Empty>}
            <div style={{ padding: 12 }}>
              <select value="" onChange={e => e.target.value && setSel(Number(e.target.value))}><option value="">+ Nueva conversación…</option>{sinHilo.map(c => <option key={c.tutor.id} value={c.tutor.id}>{c.tutor.nombre}</option>)}</select>
            </div>
          </div>
          <div className="card">
            {!sel ? <Empty>Elegí una conversación.</Empty> : (
              <>
                <div className="row between" style={{ marginBottom: 10 }}><h3 style={{ margin: 0 }}>{nombreSel}</h3><span className="tiny muted mono">App del tutor · WhatsApp</span></div>
                <div className="chat-thread" ref={box}>
                  {!msgs ? <Spinner /> : !msgs.length ? <Empty>Todavía no hay mensajes. Escribí el primero.</Empty> : msgs.map(m => (
                    <div key={m.id} className={`msg ${m.desdeClinica ? 'me' : 'bot'}`}>{m.texto}<div className="tiny" style={{ opacity: 0.6, marginTop: 4 }}>{fdt(m.fecha)}</div></div>
                  ))}
                </div>
                <form className="chat-f" style={{ padding: '10px 0 0' }} onSubmit={e => { e.preventDefault(); enviar().catch(err => toast(err.message, 'error')); }}>
                  <input value={texto} onChange={e => setTexto(e.target.value)} placeholder="Escribí un mensaje…" />
                  <button className="btn btn-primary btn-sm" disabled={!texto.trim()}>Enviar</button>
                </form>
                <div className="row" style={{ gap: 6, marginTop: 8 }}>
                  {['Tu turno quedó confirmado. ¡Te esperamos!', 'Ya están los resultados, ¿podés pasar a retirarlos?', 'Recordá traer la libreta sanitaria.'].map(t => <button key={t} className="btn btn-sm" onClick={() => setTexto(t)}>{t.slice(0, 32)}…</button>)}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}

export function Recordatorios() {
  const { data, reload } = useApi('/clinic/recordatorios');
  const [sel, setSel] = useState([]), [filtro, setFiltro] = useState('');
  if (!data) return <Spinner />;
  const lista = data.filter(r => !filtro || (filtro === 'vencidos' ? r.vencido : !r.vencido));
  const toggle = id => setSel(s => (s.includes(id) ? s.filter(x => x !== id) : [...s, id]));
  const enviar = async () => {
    const r = await api.post('/clinic/recordatorios/enviar', { ids: sel });
    toast(`${r.enviados} recordatorios enviados a la app y por WhatsApp`); setSel([]); reload();
  };
  return (
    <>
      <PageHead kicker="Vacunas, desparasitaciones y controles de los próximos y últimos 30 días" title="Recordatorios">
        <button className="btn" onClick={() => setSel(lista.map(r => r.id))}>Seleccionar todos</button>
        <AsyncBtn className="btn btn-primary" onClick={enviar} disabled={!sel.length}>Enviar {sel.length || ''} por WhatsApp / app</AsyncBtn>
      </PageHead>
      <div className="grid g3" style={{ marginBottom: 14 }}>
        <Kpi label="Vencidos" value={data.filter(r => r.vencido).length} color="var(--bad)" sub="últimos 30 días" />
        <Kpi label="Próximos 30 días" value={data.filter(r => !r.vencido).length} color="var(--leaf)" />
        <Kpi label="Seleccionados" value={sel.length} />
      </div>
      <Seg value={filtro} onChange={setFiltro} options={[['', 'Todos'], ['vencidos', 'Vencidos'], ['proximos', 'Próximos']]} />
      <div className="tblwrap" style={{ marginTop: 12 }}><table className="tbl"><thead><tr><th /><th>Paciente</th><th>Qué le toca</th><th>Fecha</th><th>Tutor/a</th></tr></thead><tbody>
        {lista.map(r => (
          <tr key={r.id} onClick={() => toggle(r.id)} style={{ cursor: 'pointer' }}>
            <td><input type="checkbox" checked={sel.includes(r.id)} readOnly /></td>
            <td><Link to={`/vet/consultorio/pacientes/${r.paciente.id}`} onClick={e => e.stopPropagation()}><b>{r.paciente.nombre}</b></Link><div className="tiny muted">{r.paciente.especie}</div></td>
            <td className="small"><span className="evk sm" style={{ background: EVT[r.tipo]?.[2] }}>{EVT[r.tipo]?.[0]}</span> {r.titulo}</td>
            <td>{r.vencido ? <Badge cls="b-bad">Vencido {fdate(r.proximo)}</Badge> : <Badge cls="b-ok">{fdate(r.proximo)}</Badge>}</td>
            <td className="small">{r.tutor.nombre}<div className="tiny muted">{r.tutor.telefono}</div></td>
          </tr>
        ))}
        {!lista.length && <tr><td colSpan={5}><Empty>Nada pendiente.</Empty></td></tr>}
      </tbody></table></div>
    </>
  );
}

export function Reportes() {
  const { data } = useApi('/clinic/reportes');
  if (!data) return <Spinner />;
  const total = data.meses.reduce((s, m) => s + m.servicios + m.productos, 0);
  const serv = data.meses.reduce((s, m) => s + m.servicios, 0);
  const tTot = data.turnos.reduce((s, t) => s + t._count, 0);
  const aus = data.turnos.find(t => t.estado === 'ausente')?._count || 0;
  return (
    <>
      <PageHead kicker="Últimos 6 meses" title="Reportes" />
      <div className="grid g4">
        <Kpi label="Facturación" value={money(total)} />
        <Kpi label="Servicios" value={money(serv)} sub={total ? `${Math.round((serv / total) * 100)}% del total` : ''} />
        <Kpi label="Productos / pet shop" value={money(total - serv)} />
        <Kpi label="Ausentismo de turnos" value={tTot ? `${Math.round((aus / tTot) * 100)}%` : '—'} sub={`${tTot} turnos`} />
      </div>
      <div className="grid g2" style={{ marginTop: 16, alignItems: 'start' }}>
        <div className="card"><h3>Ventas por mes</h3>
          <VBars data={data.meses} keys={['servicios', 'productos']} height={190} />
          <div className="legend" style={{ marginTop: 8 }}><span><i className="dot" style={{ color: 'var(--leaf)' }} />Servicios</span><span><i className="dot" style={{ color: 'var(--leaf-2)' }} />Productos</span></div>
        </div>
        <div className="card"><h3>Lo más vendido</h3><HBars data={data.top} label="descripcion" value="total" fmt={money} /></div>
        <div className="card"><h3>Turnos por estado</h3><HBars data={data.turnos.map(t => ({ label: t.estado, value: t._count }))} /></div>
      </div>
    </>
  );
}
