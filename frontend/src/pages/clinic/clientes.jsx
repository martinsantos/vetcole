// Clientes (tutores del consultorio), su cuenta corriente y saldos con clientes y proveedores.
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api, useApi } from '../../lib/api.js';
import { money, fdate, fdt } from '../../lib/format.js';
import { PageHead, Spinner, ErrorBox, Modal, Field, AsyncBtn, toast, Badge, Empty, Kpi } from '../../components/ui.jsx';
import { MEDIOS } from './shared.jsx';

export function CobroModal({ cliente, onClose, onSaved }) {
  const [monto, setMonto] = useState(cliente ? Math.max(0, cliente.saldo) : 0), [medio, setMedio] = useState('Efectivo');
  if (!cliente) return null;
  const save = async () => { await api.post(`/clinic/clientes/${cliente.id}/cobro`, { monto: Number(monto), medio }); toast(`Cobro de ${money(monto)} registrado`); onSaved(); onClose(); };
  return (
    <Modal open onClose={onClose} title={`Registrar cobro · ${cliente.tutor.nombre}`} subtitle={`Saldo actual ${money(cliente.saldo)}`}>
      <div className="grid g2" style={{ gap: 10 }}>
        <Field label="Monto"><input type="number" min="0" value={monto} onChange={e => setMonto(e.target.value)} /></Field>
        <Field label="Medio"><select value={medio} onChange={e => setMedio(e.target.value)}>{MEDIOS.filter(m => m !== 'Cuenta corriente').map(m => <option key={m}>{m}</option>)}</select></Field>
      </div>
      <AsyncBtn className="btn btn-primary" onClick={save} disabled={!(Number(monto) > 0)}>Registrar cobro</AsyncBtn>
    </Modal>
  );
}

function NuevoCliente({ open, onClose, onSaved }) {
  const [f, setF] = useState({ nombre: '', dni: '', telefono: '', email: '' });
  const save = async () => { await api.post('/clinic/clientes', f); toast('Cliente creado'); onSaved(); onClose(); setF({ nombre: '', dni: '', telefono: '', email: '' }); };
  return (
    <Modal open={open} onClose={onClose} title="Nuevo cliente" subtitle="Si el DNI ya existe en la provincia, se vincula con sus mascotas">
      <div className="grid g2" style={{ gap: 10 }}>
        <Field label="Nombre y apellido"><input value={f.nombre} onChange={e => setF({ ...f, nombre: e.target.value })} /></Field>
        <Field label="DNI"><input value={f.dni} onChange={e => setF({ ...f, dni: e.target.value.replace(/\D/g, '') })} /></Field>
        <Field label="WhatsApp"><input value={f.telefono} onChange={e => setF({ ...f, telefono: e.target.value })} /></Field>
        <Field label="Email"><input type="email" value={f.email} onChange={e => setF({ ...f, email: e.target.value })} /></Field>
      </div>
      <AsyncBtn className="btn btn-primary" onClick={save}>Guardar</AsyncBtn>
    </Modal>
  );
}

export function Clientes() {
  const [q, setQ] = useState('');
  const { data, error, reload } = useApi(`/clinic/clientes?q=${encodeURIComponent(q)}`, [q]);
  const [nuevo, setNuevo] = useState(false), [cobro, setCobro] = useState(null);
  const nav = useNavigate();
  return (
    <>
      <PageHead kicker="Tutores/as del consultorio" title="Clientes"><button className="btn btn-primary" onClick={() => setNuevo(true)}>+ Nuevo cliente</button></PageHead>
      <input type="search" placeholder="Buscar por nombre, DNI o mascota" value={q} onChange={e => setQ(e.target.value)} style={{ marginBottom: 12 }} />
      {error ? <ErrorBox error={error} onRetry={reload} /> : !data ? <Spinner /> : (
        <div className="tblwrap"><table className="tbl">
          <thead><tr><th>Cliente</th><th>Contacto</th><th>Mascotas</th><th>Saldo cuenta corriente</th><th /></tr></thead>
          <tbody>
            {data.map(c => (
              <tr key={c.id} style={{ cursor: 'pointer' }} onClick={() => nav(`/vet/consultorio/clientes/${c.id}`)}>
                <td><b>{c.tutor.nombre}</b><div className="tiny muted">DNI {c.tutor.dni}</div></td>
                <td className="small">{c.tutor.telefono || '—'}<div className="tiny muted">{c.tutor.email}</div></td>
                <td className="small">{c.mascotas.map(m => m.nombre).join(', ') || '—'}</td>
                <td>{c.saldo > 0 ? <b style={{ color: 'var(--bad)' }}>{money(c.saldo)}</b> : <span className="muted small">{c.saldo < 0 ? `A favor ${money(-c.saldo)}` : 'Al día'}</span>}</td>
                <td style={{ textAlign: 'right' }} onClick={e => e.stopPropagation()}>{c.saldo > 0 && <button className="btn btn-sm" onClick={() => setCobro(c)}>Cobrar</button>}</td>
              </tr>
            ))}
            {!data.length && <tr><td colSpan={5}><Empty /></td></tr>}
          </tbody>
        </table></div>
      )}
      <NuevoCliente open={nuevo} onClose={() => setNuevo(false)} onSaved={reload} />
      <CobroModal key={cobro?.id} cliente={cobro} onClose={() => setCobro(null)} onSaved={reload} />
    </>
  );
}

export function Cliente() {
  const { id } = useParams();
  const { data: c, error, reload } = useApi(`/clinic/clientes/${id}`, [id]);
  const [cobro, setCobro] = useState(false);
  if (error) return <ErrorBox error={error} onRetry={reload} />;
  if (!c) return <Spinner />;
  let acc = 0;
  const movs = [...c.movimientos].reverse().map(m => ({ ...m, saldo: (acc += m.debe - m.haber) })).reverse();
  return (
    <>
      <Link to="/vet/consultorio/clientes" className="small">← Clientes</Link>
      <PageHead kicker={`DNI ${c.tutor.dni}`} title={c.tutor.nombre}>
        <Link className="btn" to={`/vet/consultorio/mensajes?tutor=${c.tutor.id}`}>Enviar mensaje</Link>
        <button className="btn btn-primary" onClick={() => setCobro(true)} disabled={!(c.saldo > 0)}>Registrar cobro</button>
      </PageHead>
      <div className="grid g4">
        <Kpi label="Saldo" value={money(c.saldo)} color={c.saldo > 0 ? 'var(--bad)' : 'var(--ok)'} sub={c.saldo > 0 ? 'adeuda' : 'al día'} />
        <Kpi label="Compras" value={c.ventas.length} sub={money(c.ventas.reduce((s, v) => s + v.total, 0))} />
        <Kpi label="Mascotas" value={c.mascotas.length} />
        <Kpi label="Contacto" value={<span style={{ fontSize: 16 }}>{c.tutor.telefono || '—'}</span>} sub={c.tutor.email} />
      </div>
      <div className="grid g2" style={{ marginTop: 16, alignItems: 'start' }}>
        <div>
          <div className="card" style={{ marginBottom: 14 }}>
            <h3>Mascotas</h3>
            {c.mascotas.map(m => <Link key={m.id} to={`/vet/consultorio/pacientes/${m.id}`} className="row between" style={{ padding: '8px 0', borderBottom: '1px solid var(--line)', color: 'inherit' }}><span><b>{m.nombre}</b> <span className="small muted">· {m.especie} · {m.raza}</span></span><span className="mono tiny">{m.libreta} →</span></Link>)}
          </div>
          <div className="card">
            <h3>Compras</h3>
            {!c.ventas.length ? <div className="small muted">Sin compras.</div> : c.ventas.slice(0, 15).map(v => <div key={v.id} className="small" style={{ padding: '7px 0', borderBottom: '1px solid var(--line)' }}><div className="row between"><b>{v.comprobante} N° {String(v.numero).padStart(8, '0')}</b><b>{money(v.total)}</b></div><div className="tiny muted">{fdt(v.fecha)} · {v.medioPago} · {v.items.map(i => i.descripcion).join(', ')}</div></div>)}
          </div>
        </div>
        <div className="card">
          <h3>Cuenta corriente</h3>
          {!movs.length ? <div className="small muted">Sin movimientos.</div> : (
            <div className="tblwrap"><table className="tbl"><thead><tr><th>Fecha</th><th>Concepto</th><th>Debe</th><th>Haber</th><th>Saldo</th></tr></thead><tbody>
              {movs.map(m => <tr key={m.id}><td className="small">{fdate(m.fecha)}</td><td className="small">{m.concepto}</td><td className="small">{m.debe ? money(m.debe) : ''}</td><td className="small" style={{ color: 'var(--ok)' }}>{m.haber ? money(m.haber) : ''}</td><td className="small"><b>{money(m.saldo)}</b></td></tr>)}
            </tbody></table></div>
          )}
        </div>
      </div>
      {cobro && <CobroModal cliente={c} onClose={() => setCobro(false)} onSaved={reload} />}
    </>
  );
}

export function CuentasCorrientes() {
  const { data: cli, reload: r1 } = useApi('/clinic/clientes');
  const { data: prov, reload: r2 } = useApi('/clinic/proveedores');
  const [cobro, setCobro] = useState(null);
  if (!cli || !prov) return <Spinner />;
  const deud = cli.filter(c => c.saldo > 0).sort((a, b) => b.saldo - a.saldo);
  const provD = prov.filter(p => p.saldo > 0);
  const totC = deud.reduce((s, c) => s + c.saldo, 0), totP = provD.reduce((s, p) => s + p.saldo, 0);
  return (
    <>
      <PageHead kicker="Lo que te deben y lo que debés" title="Cuentas corrientes"><Link className="btn" to="/vet/consultorio/proveedores">Pagar a proveedores</Link></PageHead>
      <div className="grid g3">
        <Kpi label="Por cobrar a clientes" value={money(totC)} sub={`${deud.length} clientes con saldo`} color="var(--warn)" />
        <Kpi label="Por pagar a proveedores" value={money(totP)} sub={`${provD.length} proveedores`} />
        <Kpi label="Posición neta" value={money(totC - totP)} color={totC - totP >= 0 ? 'var(--ok)' : 'var(--bad)'} />
      </div>
      <div className="grid g2" style={{ marginTop: 16, alignItems: 'start' }}>
        <div className="card"><h3>Clientes con saldo deudor</h3>
          {!deud.length ? <Empty>Ningún cliente adeuda.</Empty> : deud.map(c => (
            <div key={c.id} className="row between" style={{ padding: '9px 0', borderBottom: '1px solid var(--line)' }}>
              <Link to={`/vet/consultorio/clientes/${c.id}`} style={{ color: 'inherit' }}><b className="small">{c.tutor.nombre}</b><div className="tiny muted">{c.mascotas.map(m => m.nombre).join(', ')}</div></Link>
              <div className="row" style={{ gap: 8 }}><b style={{ color: 'var(--bad)' }}>{money(c.saldo)}</b><button className="btn btn-sm" onClick={() => setCobro(c)}>Cobrar</button></div>
            </div>
          ))}
        </div>
        <div className="card"><h3>Proveedores</h3>
          {prov.map(p => <div key={p.id} className="row between" style={{ padding: '9px 0', borderBottom: '1px solid var(--line)' }}><span className="small"><b>{p.nombre}</b><div className="tiny muted">{p.rubro}</div></span>{p.saldo > 0 ? <Badge cls="b-warn">Debés {money(p.saldo)}</Badge> : <Badge cls="b-ok">Al día</Badge>}</div>)}
        </div>
      </div>
      <CobroModal key={cobro?.id} cliente={cobro} onClose={() => setCobro(null)} onSaved={() => { r1(); r2(); }} />
    </>
  );
}
