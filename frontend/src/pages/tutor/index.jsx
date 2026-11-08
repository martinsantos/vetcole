// App del tutor/a (mobile-first): mascotas con credencial tipo Wallet, libreta completa, aviso de pérdida,
// turnos con su veterinaria y mensajes con el consultorio.
import { useEffect, useRef, useState } from 'react';
import { url } from '../../lib/base.js';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api, useApi } from '../../lib/api.js';
import { useAuth } from '../../lib/store.js';
import { fdate, fdt, edad, estadoCls, EVT } from '../../lib/format.js';
import { Spinner, ErrorBox, Badge, Timeline, Empty, Switch, AsyncBtn, toast, Modal } from '../../components/ui.jsx';
import TurnoModal from '../../components/TurnoModal.jsx';
import CredCard, { WalletButtons } from '../muni/CredCard.jsx';
import '../muni/muni.css';
import './tutor.css';

const codigoDe = mp => (mp === 1301 ? 'e12' : 'e1');

export function Mascotas() {
  const { data, loading, error, reload } = useApi('/tutor/mascotas');
  const user = useAuth(s => s.user);
  if (error) return <ErrorBox error={error} onRetry={reload} />;
  if (loading || !data) return <Spinner />;
  return (
    <div className="tpad">
      <div className="tiny muted">Hola, {user?.tutor?.nombre?.split(' ')[0] || user?.nombre}</div>
      <h2 className="ttitle">Mis mascotas</h2>
      {!data.length && <Empty>Todavía no tenés mascotas con libreta. Pedile a tu veterinario/a que la emita.</Empty>}
      {data.map(m => (
        <Link key={m.id} to={`/tutor/mascotas/${m.id}`} className="card petcardlite">
          <div className="petav">{m.nombre[0]}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="row between" style={{ flexWrap: 'nowrap' }}><b>{m.nombre}</b>{m.perdido && <Badge cls="b-bad">Perdido/a</Badge>}</div>
            <div className="tiny muted">{m.especie} · {m.raza} · {edad(m.nacimiento)}</div>
            <div style={{ marginTop: 6 }}><Badge cls={estadoCls(m.estado.codigo)}>{m.estado.etiqueta}</Badge></div>
            {m.proximos.length > 0 && <div className="tiny" style={{ marginTop: 6 }}>Próximo: <b>{m.proximos[0].titulo}</b> · {fdate(m.proximos[0].proximo)}</div>}
            {m.municipio && <div className="tiny muted mono" style={{ marginTop: 4 }}>{m.municipio.sigla} N.º {String(m.municipio.nro || '').padStart(6, '0')}</div>}
          </div>
          <span className="muted">›</span>
        </Link>
      ))}
      <div className="note small" style={{ marginTop: 12 }}>La libreta la firma tu veterinario/a matriculado/a. Si cambiás de veterinaria, la libreta sigue con tu mascota.</div>
    </div>
  );
}

export function Mascota() {
  const { id } = useParams();
  const { data: a, loading, error, reload } = useApi(`/tutor/mascotas/${id}`);
  const [turno, setTurno] = useState(false), [cert, setCert] = useState(null);
  if (error) return <ErrorBox error={error} onRetry={reload} />;
  if (loading || !a) return <Spinner />;
  const muni = a.municipio ? { ...a.municipio } : null;
  const setPerdido = async v => {
    try { await api.patch(`/tutor/mascotas/${a.id}/perdido`, { perdido: v }); toast(v ? 'Aviso activado: quien escanee el QR verá que está perdido/a.' : '¡Qué bueno! Se quitó el aviso.'); reload(); }
    catch (e) { toast(e.message, 'error'); }
  };
  return (
    <div className="tpad">
      <Link to="/tutor" className="small">← Mis mascotas</Link>
      <h2 className="ttitle" style={{ marginTop: 6 }}>{a.nombre}</h2>
      <CredCard animal={a} municipio={muni} nro={a.credencialNro} estado={a.estado} compact />
      <div style={{ margin: '12px 0' }}><WalletButtons what={`Credencial de ${a.nombre}`} /></div>

      <div className={`card lostcard ${a.perdido ? 'on' : ''}`}>
        <Switch checked={a.perdido} onChange={setPerdido}><b>{a.perdido ? 'Reportado/a como perdido/a' : 'Reportar como perdido/a'}</b></Switch>
        <div className="tiny muted">Cuando está activo, el QR de la credencial y de la chapita muestra «Me perdí» y quien lo encuentre puede avisarte sin ver tu número.</div>
        {a.perdido && <Link className="btn btn-sm" style={{ marginTop: 8 }} to={`/libreta/${a.libreta}`}>Ver lo que ve quien escanea</Link>}
      </div>

      <div className="row" style={{ margin: '14px 0', gap: 8 }}>
        <button className="btn btn-primary" onClick={() => setTurno(true)}>Pedir turno{a.vetCabecera ? ` con ${a.vetCabecera.titulo}` : ''}</button>
      </div>

      <div className="card" style={{ padding: 14 }}>
        <div className="facts" style={{ padding: 0 }}>
          <div><span>Especie</span><b>{a.especie}</b></div><div><span>Edad</span><b>{edad(a.nacimiento)}</b></div>
          <div><span>Libreta</span><b className="mono">{a.libreta}</b></div><div><span>Castrado/a</span><b>{a.castrado ? 'Sí' : 'No'}</b></div>
        </div>
      </div>

      <h3 style={{ marginTop: 18 }}>Libreta sanitaria</h3>
      <div className="card" style={{ padding: '4px 14px' }}><Timeline eventos={a.eventos} onCert={e => setCert(e)} /></div>

      {a.recetas?.length > 0 && (
        <>
          <h3 style={{ marginTop: 18 }}>Recetas</h3>
          {a.recetas.map(r => (
            <div key={r.codigo} className="card" style={{ padding: 12, marginBottom: 8 }}>
              <div className="row between"><b className="mono small">{r.codigo}</b><Badge cls={r.estado === 'Vigente' ? 'b-ok' : 'b-grey'}>{r.estado}</Badge></div>
              {r.items.map((it, i) => <div key={i} className="small" style={{ marginTop: 4 }}>℞ <b>{it.medicamento}</b>{it.posologia ? ` · ${it.posologia}` : ''}</div>)}
              <div className="tiny muted" style={{ marginTop: 4 }}>{r.prescriptor} · {fdate(r.fecha)} · {r.tipo}</div>
              <Link className="small" to={`/receta/${r.codigo}`}>Mostrar en la farmacia →</Link>
            </div>
          ))}
        </>
      )}
      {turno && <TurnoModal open codigo={codigoDe(a.vetCabecera?.mp)} mp={a.vetCabecera?.mp} onClose={() => setTurno(false)} />}
      <Modal open={!!cert} onClose={() => setCert(null)} title="Certificado de salud para viajar" subtitle={a.nombre}>
        {cert && <div className="small">
          <p>{cert.detalle}</p>
          <p>Emitido el {fdate(cert.fecha)}{cert.firma ? ` · ${cert.firma}` : ''}.</p>
          <p className="tiny muted">Vacunas vigentes: {a.eventos.filter(e => e.tipo === 'vac' && e.proximo && new Date(e.proximo) > new Date()).map(e => e.titulo).join(', ') || '—'}. Para viajes al exterior, SENASA emite el CVI a partir de este certificado.</p>
        </div>}
      </Modal>
    </div>
  );
}

export function Turnos() {
  const { data, loading, error, reload } = useApi('/tutor/turnos');
  const { data: mascotas } = useApi('/tutor/mascotas');
  const [nuevo, setNuevo] = useState(null);
  if (error) return <ErrorBox error={error} onRetry={reload} />;
  if (loading || !data) return <Spinner />;
  const prox = data.filter(t => t.estado !== 'cancelado');
  return (
    <div className="tpad">
      <h2 className="ttitle">Turnos</h2>
      {!prox.length && <Empty>No tenés turnos próximos.</Empty>}
      {data.map(t => (
        <div key={t.id} className={`card turnocard ${t.estado}`}>
          <div className="tdate"><b>{new Date(t.inicio).getDate()}</b><span>{new Date(t.inicio).toLocaleDateString('es-AR', { month: 'short' })}</span></div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <b className="small">{new Date(t.inicio).toLocaleDateString('es-AR', { weekday: 'long' })} · {new Date(t.inicio).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false })} h</b>
            <div className="tiny">{t.servicio || 'Consulta'}{t.mascota ? ` · ${t.mascota}` : ''}</div>
            <div className="tiny muted">{t.profesional} · {t.establecimiento.nombre}</div>
            <div className="tiny muted">{t.establecimiento.direccion}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <Badge cls={t.estado === 'cancelado' ? 'b-grey' : t.estado === 'pendiente' ? 'b-warn' : 'b-ok'}>{t.estado}</Badge>
            {['confirmado', 'pendiente'].includes(t.estado) && new Date(t.inicio) > new Date() && <div><AsyncBtn className="btn btn-sm" style={{ marginTop: 6 }} onClick={async () => { await api.patch(`/tutor/turnos/${t.id}/cancelar`); toast('Turno cancelado. El horario quedó libre.'); reload(); }}>Cancelar</AsyncBtn></div>}
          </div>
        </div>
      ))}
      <h3 style={{ marginTop: 18 }}>Pedir un turno</h3>
      {(mascotas || []).map(m => <button key={m.id} className="acct" onClick={() => setNuevo(m)}><span className="petav" style={{ width: 36, height: 36, fontSize: 16 }}>{m.nombre[0]}</span><span><b className="small">Para {m.nombre}</b><div className="tiny muted">{m.vetCabecera ? m.vetCabecera.titulo : 'Tu veterinaria'}</div></span></button>)}
      {nuevo && <TurnoModal open codigo={codigoDe(nuevo.vetCabecera?.mp)} mp={nuevo.vetCabecera?.mp} onClose={() => { setNuevo(null); reload(); }} />}
    </div>
  );
}

export function Mensajes() {
  const { data, loading, error, reload } = useApi('/tutor/mensajes');
  const [sel, setSel] = useState(null), [txt, setTxt] = useState('');
  const box = useRef(null);
  useEffect(() => { if (data?.length && !sel) setSel(data[0].establecimiento.id); }, [data, sel]);
  useEffect(() => { box.current?.scrollTo(0, 1e6); }, [data, sel]);
  if (error) return <ErrorBox error={error} onRetry={reload} />;
  if (loading || !data) return <Spinner />;
  const hilo = data.find(h => h.establecimiento.id === sel);
  const send = async () => {
    if (!txt.trim() || !sel) return;
    await api.post(`/tutor/mensajes/${sel}`, { texto: txt.trim() });
    setTxt(''); reload();
  };
  return (
    <div className="tpad">
      <h2 className="ttitle">Mensajes</h2>
      {!data.length ? <Empty>Todavía no tenés conversaciones con una veterinaria.</Empty> : (
        <>
          {data.length > 1 && <select value={sel || ''} onChange={e => setSel(Number(e.target.value))} style={{ marginBottom: 10 }}>{data.map(h => <option key={h.establecimiento.id} value={h.establecimiento.id}>{h.establecimiento.nombre}</option>)}</select>}
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div className="thhead"><b className="small">{hilo?.establecimiento.nombre}</b><div className="tiny muted">Te responden en horario de atención</div></div>
            <div className="chat-thread" ref={box} style={{ padding: 12 }}>
              {hilo?.mensajes.map(m => <div key={m.id} className={`msg ${m.desdeClinica ? 'bot' : 'me'}`}>{m.texto}<div className="tiny" style={{ opacity: 0.6, marginTop: 4 }}>{fdt(m.fecha)}</div></div>)}
            </div>
            <form className="chat-f" onSubmit={e => { e.preventDefault(); send().catch(err => toast(err.message, 'error')); }}>
              <input value={txt} onChange={e => setTxt(e.target.value)} placeholder="Escribí tu mensaje…" />
              <button className="btn btn-primary btn-sm">Enviar</button>
            </form>
          </div>
        </>
      )}
    </div>
  );
}

export function Perfil() {
  const user = useAuth(s => s.user), logout = useAuth(s => s.logout), nav = useNavigate();
  const { data: mascotas } = useApi('/tutor/mascotas');
  const vacunas = (mascotas || []).flatMap(m => m.proximos.map(p => ({ ...p, mascota: m.nombre })));
  return (
    <div className="tpad">
      <h2 className="ttitle">Perfil</h2>
      <div className="card">
        <div className="row" style={{ flexWrap: 'nowrap' }}><div className="petav">{user?.nombre?.[0]}</div><div><b>{user?.tutor?.nombre || user?.nombre}</b><div className="tiny muted">DNI {user?.tutor?.dni} · {user?.email}</div></div></div>
      </div>
      <h3 style={{ marginTop: 18 }}>Recordatorios</h3>
      <div className="card" style={{ padding: '4px 14px' }}>
        {!vacunas.length ? <Empty>Sin recordatorios próximos.</Empty> : vacunas.sort((x, y) => new Date(x.proximo) - new Date(y.proximo)).map((v, i) => (
          <div key={i} className="row between" style={{ padding: '10px 0', borderBottom: '1px solid var(--line)' }}><span className="small"><b>{v.mascota}</b> · {v.titulo}</span><span className="mono tiny">{fdate(v.proximo)}</span></div>
        ))}
      </div>
      <div className="card" style={{ marginTop: 14 }}>
        <Switch checked onChange={() => toast('Preferencia guardada (demo)')}>Recordatorios por WhatsApp</Switch>
        <Switch checked={false} onChange={() => toast('Preferencia guardada (demo)')}>Novedades de campañas municipales</Switch>
      </div>
      <button className="btn btn-block" style={{ marginTop: 14 }} onClick={() => { logout(); nav('/'); }}>Cerrar sesión</button>
      <p className="tiny muted" style={{ marginTop: 10 }}>App instalable (PWA): agregala a la pantalla de inicio desde el menú del navegador.</p>
    </div>
  );
}

export const EVT_TYPES = EVT;
