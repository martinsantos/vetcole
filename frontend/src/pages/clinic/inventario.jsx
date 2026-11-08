// Inventario / pet shop y proveedores (compras que ingresan stock y cuenta corriente con proveedores).
import { useState } from 'react';
import { api, useApi } from '../../lib/api.js';
import { money, fdate, norm } from '../../lib/format.js';
import { PageHead, Spinner, Modal, Field, AsyncBtn, toast, Badge, Empty, Kpi, Seg, Switch } from '../../components/ui.jsx';
import { CATEGORIAS } from './shared.jsx';

function ProductoModal({ open, onClose, onSaved }) {
  const [f, setF] = useState({ nombre: '', categoria: 'Alimentos', sku: '', precio: '', costo: '', stock: 0, stockMin: 0, vence: '' });
  const save = async () => { await api.post('/clinic/productos', { ...f, vence: f.vence || undefined }); toast('Producto creado'); onSaved(); onClose(); };
  return (
    <Modal open={open} onClose={onClose} title="Nuevo producto">
      <Field label="Nombre"><input value={f.nombre} onChange={e => setF({ ...f, nombre: e.target.value })} /></Field>
      <div className="grid g2" style={{ gap: 10 }}>
        <Field label="Categoría"><select value={f.categoria} onChange={e => setF({ ...f, categoria: e.target.value })}>{CATEGORIAS.map(c => <option key={c}>{c}</option>)}</select></Field>
        <Field label="SKU / código"><input value={f.sku} onChange={e => setF({ ...f, sku: e.target.value })} placeholder="automático" /></Field>
        <Field label="Precio de venta"><input type="number" value={f.precio} onChange={e => setF({ ...f, precio: e.target.value })} /></Field>
        <Field label="Costo"><input type="number" value={f.costo} onChange={e => setF({ ...f, costo: e.target.value })} /></Field>
        <Field label="Stock inicial"><input type="number" value={f.stock} onChange={e => setF({ ...f, stock: e.target.value })} /></Field>
        <Field label="Stock mínimo"><input type="number" value={f.stockMin} onChange={e => setF({ ...f, stockMin: e.target.value })} /></Field>
      </div>
      <Field label="Vencimiento (vacunas, medicamentos)"><input type="date" value={f.vence} onChange={e => setF({ ...f, vence: e.target.value })} /></Field>
      <AsyncBtn className="btn btn-primary" onClick={save} disabled={!f.nombre || f.precio === ''}>Guardar</AsyncBtn>
    </Modal>
  );
}

function AjusteModal({ p, onClose, onSaved }) {
  const [aj, setAj] = useState(0), [precio, setPrecio] = useState(p?.precio ?? 0), [motivo, setMotivo] = useState('Conteo físico');
  if (!p) return null;
  const save = async () => { await api.patch(`/clinic/productos/${p.id}`, { ajusteStock: Number(aj), precio: Number(precio) }); toast(`Stock de ${p.nombre}: ${p.stock + Number(aj)}`); onSaved(); onClose(); };
  return (
    <Modal open onClose={onClose} title={`Ajustar · ${p.nombre}`} subtitle={`Stock actual ${p.stock} · mínimo ${p.stockMin}`}>
      <div className="grid g2" style={{ gap: 10 }}>
        <Field label="Ajuste (+ ingreso / − egreso)"><input type="number" value={aj} onChange={e => setAj(e.target.value)} /></Field>
        <Field label="Precio de venta"><input type="number" value={precio} onChange={e => setPrecio(e.target.value)} /></Field>
      </div>
      <Field label="Motivo"><select value={motivo} onChange={e => setMotivo(e.target.value)}><option>Conteo físico</option><option>Rotura / vencimiento</option><option>Uso interno en consultorio</option><option>Devolución</option></select></Field>
      <div className="small muted" style={{ marginBottom: 10 }}>Stock resultante: <b>{p.stock + (Number(aj) || 0)}</b></div>
      <AsyncBtn className="btn btn-primary" onClick={save}>Guardar ajuste</AsyncBtn>
    </Modal>
  );
}

export function Inventario() {
  const { data, reload } = useApi('/clinic/productos');
  const [cat, setCat] = useState(''), [q, setQ] = useState(''), [soloBajo, setSoloBajo] = useState(false);
  const [nuevo, setNuevo] = useState(false), [aj, setAj] = useState(null);
  if (!data) return <Spinner />;
  const lista = data.filter(p => (!cat || p.categoria === cat) && (!q || norm(p.nombre + p.sku).includes(norm(q))) && (!soloBajo || p.stock <= p.stockMin));
  const valor = data.reduce((s, p) => s + p.stock * p.costo, 0);
  const pronto = d => d && new Date(d) < new Date(Date.now() + 60 * 864e5);
  return (
    <>
      <PageHead kicker="Pet shop, farmacia y vacunas" title="Inventario"><button className="btn btn-primary" onClick={() => setNuevo(true)}>+ Nuevo producto</button></PageHead>
      <div className="grid g4">
        <Kpi label="Productos" value={data.length} />
        <Kpi label="Valor del stock (a costo)" value={money(valor)} />
        <Kpi label="Bajo mínimo" value={data.filter(p => p.stock <= p.stockMin).length} color="var(--warn)" />
        <Kpi label="Vencen en 60 días" value={data.filter(p => pronto(p.vence)).length} color="var(--bad)" />
      </div>
      <div className="row between" style={{ margin: '16px 0 12px' }}>
        <Seg value={cat} onChange={setCat} options={[['', 'Todas'], ...CATEGORIAS.map(c => [c, c, data.filter(p => p.categoria === c).length])]} />
        <div className="row"><Switch checked={soloBajo} onChange={setSoloBajo}>Sólo bajo mínimo</Switch><input type="search" placeholder="Buscar" value={q} onChange={e => setQ(e.target.value)} style={{ width: 200 }} /></div>
      </div>
      <div className="tblwrap"><table className="tbl"><thead><tr><th>Producto</th><th>Categoría</th><th>Stock</th><th>Costo</th><th>Precio</th><th>Margen</th><th>Vence</th><th /></tr></thead><tbody>
        {lista.map(p => (
          <tr key={p.id} className={p.stock <= p.stockMin ? 'cl-row-low' : ''}>
            <td><b className="small">{p.nombre}</b><div className="mono tiny muted">{p.sku}</div></td>
            <td><Badge cls="b-grey">{p.categoria}</Badge></td>
            <td><b>{p.stock}</b> <span className="tiny muted">/ mín. {p.stockMin}</span>{p.stock <= p.stockMin && <> <Badge cls="b-warn">Reponer</Badge></>}</td>
            <td className="small">{money(p.costo)}</td><td className="small"><b>{money(p.precio)}</b></td>
            <td className="small">{p.precio ? `${Math.round(((p.precio - p.costo) / p.precio) * 100)}%` : '—'}</td>
            <td className="small">{p.vence ? <span style={pronto(p.vence) ? { color: 'var(--bad)', fontWeight: 600 } : undefined}>{fdate(p.vence)}</span> : '—'}</td>
            <td style={{ textAlign: 'right' }}><button className="btn btn-sm" onClick={() => setAj(p)}>Ajustar</button></td>
          </tr>
        ))}
        {!lista.length && <tr><td colSpan={8}><Empty /></td></tr>}
      </tbody></table></div>
      <ProductoModal open={nuevo} onClose={() => setNuevo(false)} onSaved={reload} />
      <AjusteModal key={aj?.id} p={aj} onClose={() => setAj(null)} onSaved={reload} />
    </>
  );
}

function CompraModal({ prov, productos, onClose, onSaved }) {
  const [lines, setLines] = useState([{ productoId: '', cantidad: 1, costo: '' }]);
  const [comp, setComp] = useState('Factura A 0003-'), [pagada, setPagada] = useState(false);
  if (!prov) return null;
  const set = (i, k, v) => setLines(ls => ls.map((l, j) => (j === i ? { ...l, [k]: v, ...(k === 'productoId' ? { costo: productos.find(p => String(p.id) === v)?.costo ?? '' } : {}) } : l)));
  const total = lines.reduce((s, l) => s + (Number(l.cantidad) || 0) * (Number(l.costo) || 0), 0);
  const save = async () => {
    const items = lines.filter(l => l.productoId).map(l => ({ productoId: Number(l.productoId), cantidad: Number(l.cantidad), costo: Number(l.costo) }));
    if (!items.length) throw new Error('Agregá al menos un producto.');
    await api.post('/clinic/compras', { proveedorId: prov.id, comprobante: comp, items, pagada });
    toast(`Compra registrada: ${items.length} productos ingresaron al stock`); onSaved(); onClose();
  };
  return (
    <Modal open onClose={onClose} wide title={`Registrar compra · ${prov.nombre}`} subtitle="Ingresa el stock y actualiza el costo de cada producto">
      <Field label="Comprobante del proveedor"><input value={comp} onChange={e => setComp(e.target.value)} /></Field>
      {lines.map((l, i) => (
        <div key={i} className="grid" style={{ gridTemplateColumns: '1fr 100px 140px 36px', gap: 8, marginBottom: 8, alignItems: 'center' }}>
          <select value={l.productoId} onChange={e => set(i, 'productoId', e.target.value)}><option value="">Producto…</option>{productos.map(p => <option key={p.id} value={p.id}>{p.nombre} (stock {p.stock})</option>)}</select>
          <input type="number" min="1" value={l.cantidad} onChange={e => set(i, 'cantidad', e.target.value)} placeholder="Cant." />
          <input type="number" min="0" value={l.costo} onChange={e => set(i, 'costo', e.target.value)} placeholder="Costo unit." />
          <button className="btn btn-sm" onClick={() => setLines(ls => ls.filter((_, j) => j !== i))} disabled={lines.length === 1}>×</button>
        </div>
      ))}
      <button className="btn btn-sm" onClick={() => setLines(ls => [...ls, { productoId: '', cantidad: 1, costo: '' }])}>+ Agregar línea</button>
      <div className="cl-total"><span>Total</span><b>{money(total)}</b></div>
      <Switch checked={pagada} onChange={setPagada}>Pagada al contado (si no, queda en la cuenta corriente del proveedor)</Switch>
      <AsyncBtn className="btn btn-primary" style={{ marginTop: 8 }} onClick={save}>Registrar compra</AsyncBtn>
    </Modal>
  );
}

function PagoModal({ prov, onClose, onSaved }) {
  const [monto, setMonto] = useState(prov ? Math.max(0, prov.saldo) : 0);
  if (!prov) return null;
  const save = async () => { await api.post(`/clinic/proveedores/${prov.id}/pago`, { monto: Number(monto) }); toast(`Pago de ${money(monto)} a ${prov.nombre} registrado`); onSaved(); onClose(); };
  return (
    <Modal open onClose={onClose} title={`Pagar a ${prov.nombre}`} subtitle={`Saldo ${money(prov.saldo)}`}>
      <Field label="Monto"><input type="number" value={monto} onChange={e => setMonto(e.target.value)} /></Field>
      <AsyncBtn className="btn btn-primary" onClick={save} disabled={!(Number(monto) > 0)}>Registrar pago</AsyncBtn>
    </Modal>
  );
}

export function Proveedores() {
  const { data, reload } = useApi('/clinic/proveedores');
  const { data: productos, reload: rp } = useApi('/clinic/productos');
  const [nuevo, setNuevo] = useState(false), [f, setF] = useState({ nombre: '', cuit: '', telefono: '', rubro: '' });
  const [compra, setCompra] = useState(null), [pago, setPago] = useState(null);
  if (!data || !productos) return <Spinner />;
  const alta = async () => { await api.post('/clinic/proveedores', f); toast('Proveedor creado'); setNuevo(false); setF({ nombre: '', cuit: '', telefono: '', rubro: '' }); reload(); };
  return (
    <>
      <PageHead kicker="Compras, ingreso de stock y cuenta corriente" title="Proveedores"><button className="btn btn-primary" onClick={() => setNuevo(true)}>+ Nuevo proveedor</button></PageHead>
      <div className="grid g3">
        {data.map(p => (
          <div key={p.id} className="card">
            <div className="row between"><Badge cls="b-grey">{p.rubro}</Badge>{p.saldo > 0 ? <Badge cls="b-warn">Debés {money(p.saldo)}</Badge> : <Badge cls="b-ok">Al día</Badge>}</div>
            <h3 style={{ margin: '8px 0 2px' }}>{p.nombre}</h3>
            <div className="tiny muted mono">CUIT {p.cuit} · {p.telefono}</div>
            <div className="tiny muted mono" style={{ margin: '12px 0 4px' }}>Últimas compras</div>
            {!p.compras.length ? <div className="small muted">Sin compras.</div> : p.compras.map(c => <div key={c.id} className="row between small" style={{ padding: '4px 0' }}><span>{fdate(c.fecha)} · {c.comprobante}</span><b>{money(c.total)}</b></div>)}
            <div className="row" style={{ marginTop: 12, gap: 6 }}>
              <button className="btn btn-sm btn-primary" onClick={() => setCompra(p)}>Registrar compra</button>
              <button className="btn btn-sm" onClick={() => setPago(p)} disabled={!(p.saldo > 0)}>Registrar pago</button>
            </div>
          </div>
        ))}
        {!data.length && <Empty>Sin proveedores.</Empty>}
      </div>
      <Modal open={nuevo} onClose={() => setNuevo(false)} title="Nuevo proveedor">
        <div className="grid g2" style={{ gap: 10 }}>
          <Field label="Razón social"><input value={f.nombre} onChange={e => setF({ ...f, nombre: e.target.value })} /></Field>
          <Field label="CUIT"><input value={f.cuit} onChange={e => setF({ ...f, cuit: e.target.value })} placeholder="30-..." /></Field>
          <Field label="Teléfono"><input value={f.telefono} onChange={e => setF({ ...f, telefono: e.target.value })} /></Field>
          <Field label="Rubro"><input value={f.rubro} onChange={e => setF({ ...f, rubro: e.target.value })} placeholder="Alimentos, medicamentos…" /></Field>
        </div>
        <AsyncBtn className="btn btn-primary" onClick={alta} disabled={!f.nombre || !f.cuit}>Guardar</AsyncBtn>
      </Modal>
      <CompraModal key={compra?.id} prov={compra} productos={productos} onClose={() => setCompra(null)} onSaved={() => { reload(); rp(); }} />
      <PagoModal key={`p${pago?.id}`} prov={pago} onClose={() => setPago(null)} onSaved={reload} />
    </>
  );
}
