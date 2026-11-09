// Dinero del Colegio: recaudación (por mes, concepto y medio de pago) y configuración de los medios de pago.
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api, useApi } from '../../lib/api.js';
import { money, fdt } from '../../lib/format.js';
import { Badge, Kpi, PageHead, Spinner, ErrorBox, VBars, HBars, Switch, AsyncBtn, toast, saveFile } from '../../components/ui.jsx';

const Load = ({ q, children }) => (q.error ? <ErrorBox error={q.error} onRetry={q.reload} /> : !q.data ? <Spinner /> : children(q.data));
const pct = (a, b) => (b ? `${Math.round((a / b) * 100)} %` : '—');

export function Recaudacion() {
  const q = useApi('/admin/dinero');
  const [concepto, setConcepto] = useState(''), [todos, setTodos] = useState(false);
  return (
    <>
      <PageHead kicker="Dinero" title="Recaudación">
        <Link className="btn" to="/admin/medios-pago">Medios de pago</Link>
        <Link className="btn" to="/admin/cobranzas">Cuotas pendientes</Link>
      </PageHead>
      <Load q={q}>{d => {
        const movs = d.movimientos.filter(m => !concepto || m.concepto === concepto);
        const exportar = () => saveFile('recaudacion-colegio.csv', [['fecha', 'concepto', 'detalle', 'matricula', 'medio', 'monto', 'comision', 'estado'], ...movs.map(m => [new Date(m.fecha).toISOString().slice(0, 10), m.concepto, m.detalle || '', m.vet?.mp || '', m.medio, m.monto, m.comision, m.estado])].map(r => r.map(x => `"${String(x).replace(/"/g, '""')}"`).join(',')).join('\n'));
        return (
          <>
            <div className="grid g4">
              <Kpi label="Recaudado este mes" value={money(d.mes.bruto)} sub={`${d.mes.cobros} cobros · neto ${money(d.mes.bruto - d.mes.comisiones)}`} color="var(--ok)" />
              <Kpi label="Recaudado en el año" value={money(d.anio.bruto)} sub={`comisiones ${money(d.anio.comisiones)}`} />
              <Kpi label="Cuotas pendientes" value={money(d.pendiente.monto)} sub={`${d.pendiente.cuotas} cuotas · ${d.pendiente.vencidas} vencidas`} color={d.pendiente.vencidas ? 'var(--warn)' : undefined} />
              <Kpi label="Morosidad" value={`${d.morosidad} %`} sub="matriculados con cuotas vencidas" color={d.morosidad > 15 ? 'var(--bad)' : undefined} />
            </div>
            {d.aAcreditar > 0 && <p className="small muted" style={{ margin: '10px 2px 0' }}>{money(d.aAcreditar)} cobrados con tarjeta o débito todavía están a acreditar en la cuenta del Colegio.</p>}
            <div className="grid g2" style={{ marginTop: 16, alignItems: 'start' }}>
              <div className="card">
                <div className="row between"><h3 style={{ margin: 0 }}>Recaudación por mes</h3><span className="row tiny muted" style={{ gap: 12 }}><span><i className="leg" style={{ background: 'var(--plum)' }} />Cuotas</span><span><i className="leg" style={{ background: 'var(--leaf-2)' }} />Otros conceptos</span></span></div>
                <VBars data={d.meses} keys={['cuotas', 'otros']} colors={['var(--plum)', 'var(--leaf-2)']} height={190} />
              </div>
              <div className="card">
                <h3 style={{ marginTop: 0 }}>Por concepto · últimos 12 meses</h3>
                <HBars data={d.porConcepto} fmt={money} />
              </div>
            </div>
            <div className="card" style={{ marginTop: 16 }}>
              <div className="row between"><h3 style={{ margin: 0 }}>Por medio de pago · últimos 12 meses</h3><Link className="small" to="/admin/medios-pago">Configurar medios →</Link></div>
              <div className="tblwrap" style={{ marginTop: 10 }}><table className="tbl"><thead><tr><th>Medio</th><th>Estado</th><th>Cobros</th><th>Recaudado</th><th>Participación</th><th>Comisión</th><th>Neto</th><th>Acreditación</th></tr></thead><tbody>
                {d.porMedio.map(m => { const total = d.porMedio.reduce((t, x) => t + x.monto, 0); return (
                  <tr key={m.id}><td><b>{m.nombre}</b><div className="tiny muted">{m.detalle}</div></td><td><Badge cls={m.activo ? 'b-ok' : 'b-grey'}>{m.activo ? 'Habilitado' : 'Deshabilitado'}</Badge></td><td>{m.cantidad}</td><td>{money(m.monto)}</td><td>{pct(m.monto, total)}</td><td className="small">{money(m.comision)} <span className="muted">({m.comisionPct} %)</span></td><td><b>{money(m.monto - m.comision)}</b></td><td className="small">{m.acreditacionDias ? `${m.acreditacionDias} días` : 'Inmediata'}</td></tr>
                ); })}
              </tbody></table></div>
            </div>
            <div className="card" style={{ marginTop: 16 }}>
              <div className="row between" style={{ gap: 8 }}>
                <h3 style={{ margin: 0 }}>Últimos cobros</h3>
                <div className="row" style={{ gap: 8 }}>
                  <select aria-label="Concepto" value={concepto} onChange={e => setConcepto(e.target.value)} style={{ width: 240 }}><option value="">Todos los conceptos</option>{d.porConcepto.map(c => <option key={c.label}>{c.label}</option>)}</select>
                  <button className="btn btn-sm" onClick={exportar}>Exportar CSV</button>
                </div>
              </div>
              <div className="tblwrap" style={{ marginTop: 10 }}><table className="tbl"><thead><tr><th>Fecha</th><th>Concepto</th><th>Detalle</th><th>Medio</th><th>Monto</th><th>Estado</th></tr></thead><tbody>
                {movs.slice(0, todos ? 999 : 12).map(m => <tr key={m.id}><td className="small">{fdt(m.fecha)}</td><td>{m.concepto}</td><td className="small">{m.vet ? <Link to={`/admin/matriculados?ficha=${m.vet.mp}`}>MP {m.vet.mp} · {m.vet.nombre}</Link> : m.detalle}{m.vet && m.detalle ? <span className="muted"> · {m.detalle}</span> : null}</td><td className="small">{m.medio}</td><td><b>{money(m.monto)}</b></td><td><Badge cls={m.estado === 'Acreditado' ? 'b-ok' : 'b-warn'}>{m.estado}</Badge></td></tr>)}
              </tbody></table></div>
              {movs.length > 12 && <button className="btn btn-sm" style={{ marginTop: 10 }} onClick={() => setTodos(t => !t)}>{todos ? 'Mostrar menos' : `Mostrar los ${movs.length} cobros`}</button>}
            </div>
          </>
        );
      }}</Load>
    </>
  );
}

export function MediosPago() {
  const q = useApi('/admin/medios-pago');
  const [edit, setEdit] = useState({});
  const val = (m, k) => (edit[m.id]?.[k] ?? m[k]);
  const set = (m, k, v) => setEdit(e => ({ ...e, [m.id]: { ...e[m.id], [k]: v } }));
  const guardar = async m => { await api.patch(`/admin/medios-pago/${m.id}`, edit[m.id] || {}); toast(`${m.nombre}: guardado. Ya se ofrece así en el portal de los matriculados.`); setEdit(e => ({ ...e, [m.id]: undefined })); q.reload(); };
  const activar = async (m, activo) => { try { await api.patch(`/admin/medios-pago/${m.id}`, { activo }); toast(`${m.nombre} ${activo ? 'habilitado' : 'deshabilitado'}`); q.reload(); } catch (e) { toast(e.message, 'error'); } };
  return (
    <>
      <PageHead kicker="Dinero" title="Medios de pago"><Link className="btn" to="/admin/dinero">Ver recaudación</Link></PageHead>
      <p className="muted small" style={{ maxWidth: 760 }}>Definí con qué medios pueden pagar los matriculados (cuotas, certificados, inscripciones y habilitaciones). Los habilitados aparecen en su portal; la comisión y los días de acreditación se usan para calcular lo que llega neto a la cuenta del Colegio.</p>
      <Load q={q}>{list => (
        <div className="grid g2" style={{ marginTop: 12 }}>
          {list.map(m => (
            <div key={m.id} className="card" style={{ opacity: m.activo ? 1 : 0.75 }}>
              <div className="row between"><div><b style={{ fontSize: 17 }}>{m.nombre}</b><div className="small muted">{m.detalle}</div></div><Switch checked={m.activo} onChange={v => activar(m, v)}>{m.activo ? 'Habilitado' : 'Deshabilitado'}</Switch></div>
              <div className="grid g2" style={{ gap: 10, marginTop: 12 }}>
                <label className="f">Comisión (%)<input type="number" min="0" max="30" step="0.01" value={val(m, 'comisionPct')} onChange={e => set(m, 'comisionPct', e.target.value)} /></label>
                <label className="f">Acreditación (días)<input type="number" min="0" max="60" value={val(m, 'acreditacionDias')} onChange={e => set(m, 'acreditacionDias', e.target.value)} /></label>
              </div>
              {edit[m.id] && <AsyncBtn className="btn btn-primary btn-sm" onClick={() => guardar(m)}>Guardar cambios</AsyncBtn>}
            </div>
          ))}
        </div>
      )}</Load>
      <p className="tiny muted" style={{ marginTop: 12 }}>Comisiones y plazos de ejemplo. En producción se toman del contrato del Colegio con cada pasarela.</p>
    </>
  );
}
