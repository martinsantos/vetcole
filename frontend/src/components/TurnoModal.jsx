// Reserva de turno online (pública y desde la app del tutor). Usa la agenda real del establecimiento.
import { useEffect, useState } from 'react';
import { api } from '../lib/api.js';
import { Modal, Field, AsyncBtn, Spinner, ErrorBox, toast } from './ui.jsx';
import { useAuth } from '../lib/store.js';

export default function TurnoModal({ codigo, mp, open, onClose, preset }) {
  const user = useAuth(s => s.user);
  const [ag, setAg] = useState(null), [err, setErr] = useState(null);
  const [day, setDay] = useState(0), [slot, setSlot] = useState(null), [pro, setPro] = useState(mp);
  const [f, setF] = useState({ servicioId: '', mascota: '', tutorNombre: user?.tutor?.nombre || '', tutorTel: '', motivo: '' });
  const [done, setDone] = useState(null);
  useEffect(() => {
    if (!open || !codigo) return;
    setErr(null); setAg(null); setDone(null);
    api.get(`/public/agenda/${codigo}${pro ? `?mp=${pro}` : ''}`).then(a => {
      setAg(a); setPro(a.mp);
      if (preset) { const di = a.dias.findIndex(d => d.slots.some(s => s.inicio === preset)); if (di >= 0) { setDay(di); setSlot(preset); } }
    }).catch(e => setErr(e.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, codigo, pro]);
  const book = async () => {
    if (!slot) return toast('Elegí un horario', 'error');
    if (!f.tutorNombre) return toast('Completá tu nombre', 'error');
    const r = await api.post('/public/turnos', { codigo, mp: pro, inicio: slot, ...f });
    setDone(r); toast('Turno reservado');
  };
  return (
    <Modal open={open} onClose={onClose} title="Pedir turno" subtitle={ag ? `${ag.establecimiento.nombre} · ${ag.establecimiento.direccion}` : ''}>
      {err ? <ErrorBox error={err} /> : !ag ? <Spinner /> : done ? (
        <div style={{ textAlign: 'center', padding: '16px 0' }}>
          <div className="av lg" style={{ margin: '0 auto 12px', background: 'var(--ok-l)', color: 'var(--ok)' }}>✓</div>
          <h3>¡Turno reservado!</h3>
          <p className="muted">{new Date(done.inicio).toLocaleString('es-AR', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })} con {done.profesional} en {done.establecimiento}.</p>
          <p className="small muted">Ya aparece en la agenda del consultorio. Te llega un recordatorio por WhatsApp 24 h antes.</p>
          <button className="btn" onClick={onClose}>Listo</button>
        </div>
      ) : (
        <>
          {ag.profesionales.length > 1 && <Field label="Profesional"><select value={pro} onChange={e => { setPro(Number(e.target.value)); setSlot(null); }}>{ag.profesionales.map(p => <option key={p.mp} value={p.mp}>{p.titulo} · {p.especialidad}</option>)}</select></Field>}
          <div className="tiny muted mono" style={{ marginBottom: 6 }}>Día</div>
          <div className="days">{ag.dias.map((d, i) => { const x = new Date(d.fecha); return <div key={i} className={`day ${i === day ? 'on' : ''}`} onClick={() => { setDay(i); setSlot(null); }}>{x.toLocaleDateString('es-AR', { weekday: 'short' })}<b>{x.getDate()}</b>{x.toLocaleDateString('es-AR', { month: 'short' })}</div>; })}</div>
          <div className="tiny muted mono" style={{ margin: '14px 0 6px' }}>Horarios disponibles</div>
          <div className="slots">{ag.dias[day]?.slots.map(s => <div key={s.inicio} className={`slot ${s.libre ? '' : 'off'} ${slot === s.inicio ? 'on' : ''}`} onClick={() => s.libre && setSlot(s.inicio)}>{s.hora}</div>)}</div>
          <div className="grid g2" style={{ marginTop: 16, gap: 10 }}>
            <Field label="Servicio"><select value={f.servicioId} onChange={e => setF({ ...f, servicioId: e.target.value })}><option value="">Consulta general</option>{ag.servicios.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}</select></Field>
            <Field label="Mascota"><input type="text" value={f.mascota} placeholder="Ej.: Luna" onChange={e => setF({ ...f, mascota: e.target.value })} /></Field>
            <Field label="Tu nombre"><input type="text" value={f.tutorNombre} onChange={e => setF({ ...f, tutorNombre: e.target.value })} /></Field>
            <Field label="WhatsApp"><input type="tel" value={f.tutorTel} placeholder="261 ..." onChange={e => setF({ ...f, tutorTel: e.target.value })} /></Field>
          </div>
          <AsyncBtn className="btn btn-primary btn-block" onClick={book} disabled={!slot}>Confirmar turno</AsyncBtn>
        </>
      )}
    </Modal>
  );
}
