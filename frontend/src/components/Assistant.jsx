// Asistente flotante del sitio público (POST /public/asistente).
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api.js';

const SUG = ['¿Qué necesito para viajar a Chile con mi perro?', '¿Hay guardia abierta ahora?', '¿Quién atiende exóticos?', 'Se perdió mi perro', '¿Cómo sé si mi veterinario está matriculado?'];

export default function Assistant() {
  const [open, setOpen] = useState(false), [msgs, setMsgs] = useState([]), [q, setQ] = useState(''), [busy, setBusy] = useState(false);
  const body = useRef(null), nav = useNavigate();
  useEffect(() => { body.current?.scrollTo(0, 1e6); }, [msgs, busy]);
  const ask = async text => {
    if (!text.trim()) return;
    setMsgs(m => [...m, { me: true, text }]); setQ(''); setBusy(true);
    try { const r = await api.post('/public/asistente', { pregunta: text }); setMsgs(m => [...m, { ...r }]); }
    catch (e) { setMsgs(m => [...m, { respuesta: e.message, enlaces: [], fuente: 'Error' }]); }
    finally { setBusy(false); }
  };
  return (
    <>
      <button className="chat-fab" onClick={() => setOpen(o => !o)}><span className="live" />Preguntale al Colegio</button>
      {open && (
        <div className="chat-panel">
          <div className="chat-h"><div><b>Asistente del Colegio</b><div className="tiny" style={{ opacity: 0.75 }}>Responde con información oficial y datos en vivo</div></div><button className="x" onClick={() => setOpen(false)}>×</button></div>
          <div className="chat-b" ref={body}>
            <div className="msg bot">Hola. Te ayudo con guardias, turnos, matrículas, libretas, viajes y trámites.</div>
            {!msgs.length && <div className="chat-sug">{SUG.map(s => <button key={s} onClick={() => ask(s)}>{s}</button>)}</div>}
            {msgs.map((m, i) => m.me ? <div key={i} className="msg me">{m.text}</div> : (
              <div key={i} className="msg bot">{m.respuesta}
                {!!m.enlaces?.length && <div className="row" style={{ gap: 6, marginTop: 8 }}>{m.enlaces.map(l => <button key={l.to} className="btn btn-sm" onClick={() => { nav(l.to); setOpen(false); }}>{l.label} →</button>)}</div>}
                <div className="tiny muted mono" style={{ marginTop: 6 }}>FUENTE: {String(m.fuente).toUpperCase()}</div>
              </div>
            ))}
            {busy && <div className="msg bot typing">···</div>}
          </div>
          <form className="chat-f" onSubmit={e => { e.preventDefault(); ask(q); }}><input value={q} onChange={e => setQ(e.target.value)} placeholder="Escribí tu consulta…" /><button className="btn btn-primary btn-sm">Enviar</button></form>
        </div>
      )}
    </>
  );
}
