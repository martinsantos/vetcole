// Punto de venta (servicios + pet shop), facturación, historial y caja diaria.
import { useMemo, useState } from 'react';
import { api, useApi } from '../../lib/api.js';
import { money, fdt, fdate, isoDate, norm } from '../../lib/format.js';
import { PageHead, Spinner, Modal, Field, AsyncBtn, toast, Badge, Empty, Kpi, Seg } from '../../components/ui.jsx';
import { MEDIOS, COMPROBANTES, printBlock } from './shared.jsx';

export function Comprobante({ venta, clinica, onClose }) {
  if (!venta) return null;
  const letra = venta.comprobante === 'Factura B' ? 'B' : venta.comprobante === 'Factura C' ? 'C' : 'X';
  const cli = venta.cliente?.tutor;
  return (
    <Modal open onClose={onClose} title="Comprobante emitido" subtitle={`${venta.comprobante} N° 0001-${String(venta.numero).padStart(8, '0')}`}>
      <div className="cl-comp cl-printable">
        <div className="h">
          <div><b style={{ fontFamily: 'var(--serif)', fontSize: 18 }}>{clinica?.nombre || 'Consultorio'}</b><div className="tiny muted">CUIT 30-00000000-0 (demo) · IVA Responsable Inscripto</div></div>
          <div className="letra">{letra}</div>
          <div style={{ textAlign: 'right' }}><b>{venta.comprobante}</b><div className="mono tiny">N° 0001-{String(venta.numero).padStart(8, '0')}</div><div className="tiny">{fdt(venta.fecha)}</div></div>
        </div>
        <div className="small" style={{ marginBottom: 8 }}>Cliente: <b>{cli ? `${cli.nombre} · DNI ${cli.dni}` : 'Consumidor final'}</b></div>
        <table className="tbl"><thead><tr><th>Descripción</th><th>Cant.</th><th>P. unit.</th><th style={{ textAlign: 'right' }}>Importe</th></tr></thead><tbody>
          {venta.items.map(i => <tr key={i.id}><td>{i.descripcion}</td><td>{i.cantidad}</td><td>{money(i.precio)}</td><td style={{ textAlign: 'right' }}>{money(i.cantidad * i.precio)}</td></tr>)}
        </tbody></table>
        <div className="cl-total"><span>Total · {venta.medioPago}</span><b>{money(venta.total)}</b></div>
        {venta.cae ? <div className="tiny mono muted">CAE {venta.cae} (simulado) · Facturación electrónica ARCA a integrar</div> : <div className="tiny muted">Documento no válido como factura.</div>}
      </div>
      <div className="row" style={{ marginTop: 12 }}>
        <button className="btn btn-primary" onClick={printBlock}>Imprimir</button>
        {cli && <button className="btn" onClick={() => toast(`Comprobante enviado a ${cli.nombre} por email/WhatsApp (demo)`)}>Enviar al cliente</button>}
      </div>
    </Modal>
  );
}

function POS({ onSold }) {
  const { data: productos, reload: rp } = useApi('/clinic/productos');
  const { data: servicios } = useApi('/clinic/servicios');
  const { data: clientes } = useApi('/clinic/clientes');
  const [q, setQ] = useState(''), [tab, setTab] = useState('servicios');
  const [cart, setCart] = useState([]), [clienteId, setClienteId] = useState(''), [medio, setMedio] = useState('Efectivo'), [comp, setComp] = useState('Factura B');
  const items = useMemo(() => {
    const src = tab === 'servicios' ? (servicios || []).map(s => ({ key: `s${s.id}`, servicioId: s.id, nombre: s.nombre, precio: s.precio, sub: `${s.duracionMin} min` }))
      : (productos || []).map(p => ({ key: `p${p.id}`, productoId: p.id, nombre: p.nombre, precio: p.precio, sub: `${p.categoria} · stock ${p.stock}`, stock: p.stock }));
    return src.filter(x => !q || norm(x.nombre + ' ' + x.sub).includes(norm(q)));
  }, [tab, q, productos, servicios]);
  const add = it => setCart(c => { const e = c.find(x => x.key === it.key); if (e) return c.map(x => (x.key === it.key ? { ...x, cantidad: x.cantidad + 1 } : x)); return [...c, { ...it, cantidad: 1 }]; });
  const total = cart.reduce((s, x) => s + x.cantidad * x.precio, 0);
  const vender = async () => {
    if (!cart.length) throw new Error('Agregá al menos un ítem.');
    const v = await api.post('/clinic/ventas', { items: cart.map(x => ({ productoId: x.productoId, servicioId: x.servicioId, cantidad: x.cantidad, precio: x.precio })), clienteId: clienteId || undefined, medioPago: medio, comprobante: comp });
    const cli = clientes?.find(c => String(c.id) === String(clienteId));
    toast(`${comp} N° ${String(v.numero).padStart(8, '0')} emitida`);
    setCart([]); setClienteId(''); rp();
    onSold({ ...v, cliente: cli ? { tutor: cli.tutor } : null });
  };
  return (
    <div className="pos">
      <div className="card">
        <div className="row between" style={{ marginBottom: 10 }}>
          <Seg value={tab} onChange={setTab} options={[['servicios', 'Servicios'], ['productos', 'Productos / pet shop']]} />
          <input type="search" placeholder="Buscar…" value={q} onChange={e => setQ(e.target.value)} style={{ maxWidth: 260 }} />
        </div>
        {!productos || !servicios ? <Spinner /> : (
          <div className="cl-prod">
            {items.map(it => <button key={it.key} onClick={() => add(it)} disabled={it.stock === 0}><b>{it.nombre}</b><span className="tiny muted">{it.sub}</span><span className="pr">{money(it.precio)}</span></button>)}
            {!items.length && <Empty />}
          </div>
        )}
      </div>
      <div className="card cl-cart">
        <h3>Venta</h3>
        {!cart.length ? <div className="small muted" style={{ padding: '10px 0' }}>Tocá un servicio o producto para agregarlo.</div> : cart.map(x => (
          <div className="line" key={x.key}>
            <span>{x.nombre}</span>
            <input type="number" min="1" value={x.cantidad} onChange={e => setCart(c => c.map(y => (y.key === x.key ? { ...y, cantidad: Math.max(1, Number(e.target.value) || 1) } : y)))} />
            <input type="number" min="0" value={x.precio} onChange={e => setCart(c => c.map(y => (y.key === x.key ? { ...y, precio: Number(e.target.value) || 0 } : y)))} />
            <button className="x" onClick={() => setCart(c => c.filter(y => y.key !== x.key))}>×</button>
          </div>
        ))}
        <div className="cl-total"><span>Total</span><b>{money(total)}</b></div>
        <Field label="Cliente"><select value={clienteId} onChange={e => setClienteId(e.target.value)}><option value="">Consumidor final</option>{(clientes || []).map(c => <option key={c.id} value={c.id}>{c.tutor.nombre}{c.mascotas.length ? ` (${c.mascotas.map(m => m.nombre).join(', ')})` : ''}</option>)}</select></Field>
        <div className="grid g2" style={{ gap: 10 }}>
          <Field label="Medio de pago"><select value={medio} onChange={e => setMedio(e.target.value)}>{MEDIOS.map(m => <option key={m}>{m}</option>)}</select></Field>
          <Field label="Comprobante"><select value={comp} onChange={e => setComp(e.target.value)}>{COMPROBANTES.map(m => <option key={m}>{m}</option>)}</select></Field>
        </div>
        {medio === 'Cuenta corriente' && !clienteId && <div className="note" style={{ marginBottom: 10 }}>Para cuenta corriente elegí un cliente.</div>}
        <AsyncBtn className="btn btn-primary btn-block" onClick={vender} disabled={!cart.length || (medio === 'Cuenta corriente' && !clienteId)}>Cobrar y emitir {comp}</AsyncBtn>
      </div>
    </div>
  );
}

export function Ventas() {
  const [tab, setTab] = useState('pos');
  const { data: ventas, reload } = useApi('/clinic/ventas', [tab]);
  const { data: ctx } = useApi('/clinic/contexto');
  const [comp, setComp] = useState(null), [q, setQ] = useState('');
  const lista = (ventas || []).filter(v => !q || norm(`${v.comprobante} ${v.numero} ${v.cliente?.tutor?.nombre || ''} ${v.medioPago}`).includes(norm(q)));
  return (
    <>
      <PageHead kicker="Servicios, pet shop y facturación" title="Ventas y facturación"><Seg value={tab} onChange={setTab} options={[['pos', 'Nueva venta'], ['hist', 'Historial (30 días)']]} /></PageHead>
      {tab === 'pos' ? <POS onSold={v => { setComp(v); reload(); }} /> : !ventas ? <Spinner /> : (
        <>
          <input type="search" placeholder="Buscar por cliente, número o medio" value={q} onChange={e => setQ(e.target.value)} style={{ marginBottom: 12 }} />
          <div className="tblwrap"><table className="tbl"><thead><tr><th>Fecha</th><th>Comprobante</th><th>Cliente</th><th>Detalle</th><th>Medio</th><th style={{ textAlign: 'right' }}>Total</th></tr></thead><tbody>
            {lista.map(v => <tr key={v.id} style={{ cursor: 'pointer' }} onClick={() => setComp(v)}><td className="small">{fdt(v.fecha)}</td><td className="small"><b>{v.comprobante}</b><div className="mono tiny muted">0001-{String(v.numero).padStart(8, '0')}</div></td><td className="small">{v.cliente?.tutor?.nombre || 'Consumidor final'}</td><td className="small">{v.items.map(i => i.descripcion).join(', ')}</td><td><Badge cls={v.medioPago === 'Cuenta corriente' ? 'b-warn' : 'b-grey'}>{v.medioPago}</Badge></td><td style={{ textAlign: 'right' }}><b>{money(v.total)}</b></td></tr>)}
            {!lista.length && <tr><td colSpan={6}><Empty /></td></tr>}
          </tbody></table></div>
        </>
      )}
      <Comprobante venta={comp} clinica={ctx?.actual} onClose={() => setComp(null)} />
    </>
  );
}

export function Caja() {
  const [fecha, setFecha] = useState(isoDate(new Date()));
  const { data, loading } = useApi(`/clinic/caja?fecha=${fecha}`, [fecha]);
  const { data: ctx } = useApi('/clinic/contexto');
  const [comp, setComp] = useState(null);
  const ingresos = data ? Object.entries(data.porMedio).filter(([m]) => m !== 'Cuenta corriente').reduce((s, [, v]) => s + v, 0) + data.cobrosCuentaCorriente : 0;
  return (
    <>
      <PageHead kicker="Cierre diario" title="Caja">
        <input type="date" value={fecha} onChange={e => setFecha(e.target.value)} style={{ width: 170 }} />
        <button className="btn" onClick={() => toast(`Caja del ${fdate(fecha + 'T12:00')} cerrada (demo)`)}>Cerrar caja</button>
      </PageHead>
      {loading || !data ? <Spinner /> : (
        <>
          <div className="grid g4">
            <Kpi label="Facturado" value={money(data.total)} sub={`${data.ventas.length} comprobantes`} />
            <Kpi label="Ingresos de caja" value={money(ingresos)} sub="sin cuenta corriente, con cobros" color="var(--ok)" />
            <Kpi label="Vendido en cuenta corriente" value={money(data.porMedio['Cuenta corriente'] || 0)} color="var(--warn)" />
            <Kpi label="Cobros de cuenta corriente" value={money(data.cobrosCuentaCorriente)} />
          </div>
          <div className="grid g2" style={{ marginTop: 16, alignItems: 'start' }}>
            <div className="card"><h3>Por medio de pago</h3>
              {!Object.keys(data.porMedio).length ? <Empty>Sin ventas ese día.</Empty> : Object.entries(data.porMedio).map(([m, v]) => <div key={m} className="row between" style={{ padding: '9px 0', borderBottom: '1px solid var(--line)' }}><span>{m}</span><b>{money(v)}</b></div>)}
            </div>
            <div className="card"><h3>Comprobantes del día</h3>
              {!data.ventas.length ? <Empty>Sin ventas ese día.</Empty> : data.ventas.map(v => <div key={v.id} className="row between small" style={{ padding: '7px 0', borderBottom: '1px solid var(--line)', cursor: 'pointer' }} onClick={() => setComp(v)}><span><span className="mono tiny">{new Date(v.fecha).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}</span> · {v.comprobante} {String(v.numero).padStart(8, '0')} · {v.medioPago}</span><b>{money(v.total)}</b></div>)}
            </div>
          </div>
        </>
      )}
      <Comprobante venta={comp} clinica={ctx?.actual} onClose={() => setComp(null)} />
    </>
  );
}
