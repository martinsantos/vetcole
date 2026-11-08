// Recetas veterinarias: verificación y registro de dispensa por farmacias (escaneando el QR).
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api, useApi } from '../../lib/api.js';
import { Badge, Kicker, QR, Spinner, verifyUrl, toast, AsyncBtn, LOGO, Field } from '../../components/ui.jsx';
import { fdate } from '../../lib/format.js';

export function RecetaDoc({ rx }) {
  return (
    <div className="rx">
      <div className="rx-h"><div><div className="mono tiny" style={{ opacity: 0.8 }}>RECETA VETERINARIA ELECTRÓNICA</div><b className="mono">{rx.codigo}</b></div><img src={LOGO} alt="" /></div>
      <div className="rx-b">
        <div className="facts" style={{ padding: 0 }}>
          <div><span>Prescriptor/a</span><b>{rx.prescriptor.titulo}</b><div className="tiny" style={{ color: rx.prescriptor.vigente ? 'var(--ok)' : 'var(--bad)' }}>{rx.prescriptor.vigente ? '✓' : '✕'} MP {rx.prescriptor.mp} {rx.prescriptor.vigente ? 'vigente' : 'no vigente'}</div></div>
          <div><span>Paciente</span><b>{rx.paciente.nombre} · {rx.paciente.especie}</b><div className="tiny muted">Libreta {rx.paciente.libreta}</div></div>
          <div><span>Fecha</span><b>{fdate(rx.fecha)}</b></div><div><span>Válida hasta</span><b>{fdate(rx.vence)}</b></div>
        </div>
        <div className="rx-tipo">{rx.tipo}</div>
        {rx.items.map((i, k) => <div key={k} className="rx-it"><b>℞ {i.medicamento}</b>{i.posologia && <div className="small">{i.posologia}</div>}{i.cantidad && <div className="tiny muted">Cantidad: {i.cantidad}</div>}</div>)}
        <div className="row between" style={{ marginTop: 14, alignItems: 'flex-end' }}>
          <div className="tiny muted" style={{ maxWidth: 320 }}>Se puede dispensar una sola vez. La farmacia registra la dispensa escaneando el QR.</div>
          <QR text={verifyUrl(`/receta/${rx.codigo}`)} size={80} />
        </div>
      </div>
    </div>
  );
}

export default function Receta() {
  const { codigo } = useParams(), nav = useNavigate();
  const [q, setQ] = useState(''), [farmacia, setFarmacia] = useState('Farmacia del Parque (demo)');
  const { data: rx, loading, error, setData } = useApi(codigo ? `/public/recetas/${encodeURIComponent(codigo)}` : null);
  if (!codigo) return (
    <section className="sec" style={{ paddingTop: 30 }}><div className="wrap" style={{ maxWidth: 820 }}>
      <Kicker>Para farmacias</Kicker><h1 style={{ fontSize: 38, marginTop: 6 }}>Verificar una receta veterinaria</h1>
      <p className="muted">Escaneá el QR de la receta o ingresá su número. Vas a ver si el profesional tiene la matrícula vigente y si la receta ya fue dispensada.</p>
      <form className="row" style={{ margin: '16px 0' }} onSubmit={e => { e.preventDefault(); if (q.trim()) nav(`/receta/${encodeURIComponent(q.trim())}`); }}>
        <input type="search" value={q} onChange={e => setQ(e.target.value)} placeholder="Ej.: RV-2026-000412" style={{ flex: 1, minWidth: 220 }} /><button className="btn btn-primary">Verificar</button>
      </form>
      <div className="tiny muted">Probá: <Link to="/receta/RV-2026-000412">RV-2026-000412</Link> · <Link to="/receta/RV-2026-000398">RV-2026-000398</Link></div>
      <div className="grid g3" style={{ marginTop: 22 }}>
        <div className="card flat"><b>Profesional habilitado</b><p className="small muted" style={{ margin: '4px 0 0' }}>La receta muestra si la matrícula del prescriptor está vigente hoy.</p></div>
        <div className="card flat"><b>Una sola dispensa</b><p className="small muted" style={{ margin: '4px 0 0' }}>Si alguien intenta usarla de nuevo, el sistema lo avisa.</p></div>
        <div className="card flat"><b>Antimicrobianos y cannabis</b><p className="small muted" style={{ margin: '4px 0 0' }}>Quedan registrados para el seguimiento sanitario; cannabis sólo con prescriptor inscripto.</p></div>
      </div>
    </div></section>
  );
  if (loading) return <Spinner />;
  if (error) return (
    <section className="sec"><div className="wrap" style={{ maxWidth: 820 }}><div className="card" style={{ borderColor: 'var(--bad)' }}>
      <h2 style={{ color: 'var(--bad)' }}>Receta no encontrada</h2><p className="muted">No la dispenses: puede ser falsa. <Link to="/tramites?denuncia=1">Avisá al Colegio</Link>.</p><Link className="btn" to="/receta">Volver</Link></div></div></section>
  );
  const ok = rx.estado === 'Vigente' && rx.prescriptor.vigente;
  const dispensar = async () => {
    try { const r = await api.post(`/public/recetas/${rx.codigo}/dispensar`, { farmacia }); setData(r); toast('Dispensa registrada.'); }
    catch (e) { toast(e.message, 'error'); const r = await api.get(`/public/recetas/${rx.codigo}`); setData(r); }
  };
  return (
    <section className="sec" style={{ paddingTop: 30 }}><div className="wrap" style={{ maxWidth: 860 }}>
      <Link to="/receta" className="small">← Verificar otra receta</Link>
      <div className="card" style={{ margin: '12px 0 16px', border: `2px solid ${ok ? 'var(--ok)' : 'var(--warn)'}` }}>
        <Kicker style={{ color: ok ? 'var(--ok)' : 'var(--warn)' }}>{ok ? 'Receta válida · se puede dispensar' : rx.estado === 'Dispensada' ? 'Atención · ya fue dispensada' : 'Atención · no dispensar'}</Kicker>
        <p className="small" style={{ margin: '6px 0 0' }}>{ok ? 'El prescriptor tiene matrícula vigente en el Colegio y la receta no fue dispensada.'
          : rx.estado === 'Dispensada' ? `Dispensada el ${fdate(rx.dispensadaEn)} en ${rx.farmacia}. No la dispenses de nuevo.` : 'El prescriptor no tiene la matrícula vigente o la receta venció.'}</p>
        <div className="row" style={{ marginTop: 10, alignItems: 'flex-end' }}>
          <Field label="Farmacia"><input type="text" value={farmacia} onChange={e => setFarmacia(e.target.value)} style={{ minWidth: 260 }} /></Field>
          <AsyncBtn className={`btn ${ok ? 'btn-primary' : ''}`} onClick={dispensar}>Registrar dispensa</AsyncBtn>
          {rx.estado === 'Dispensada' && <Badge cls="b-grey">Dispensada</Badge>}
        </div>
      </div>
      <RecetaDoc rx={rx} />
    </div></section>
  );
}
