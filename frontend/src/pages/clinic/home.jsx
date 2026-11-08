// Tablero del día y agenda semanal del consultorio.
import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, useApi } from '../../lib/api.js';
import { money, fdate, ftime, isoDate } from '../../lib/format.js';
import { Kpi, PageHead, Spinner, ErrorBox, Modal, Field, AsyncBtn, toast, Badge, Empty, Seg } from '../../components/ui.jsx';
import { ESTADOS_TURNO, TurnoBadge, OrigenBadge, HORAS, PacientePicker, weekStart, addD, nextWorkday } from './shared.jsx';

function TurnoEstadoModal({ turno, onClose, onSaved }) {
  const nav = useNavigate();
  if (!turno) return null;
  const set = async estado => { await api.patch(`/clinic/turnos/${turno.id}`, { estado }); toast(`Turno ${estado}`); onSaved(); onClose(); };
  return (
    <Modal open onClose={onClose} title={`${ftime(turno.inicio)} · ${turno.paciente?.nombre || 'Sin paciente'}`} subtitle={`${new Date(turno.inicio).toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })} · ${turno.servicio?.nombre || 'Consulta'}`}>
      <div className="facts" style={{ padding: 0, marginBottom: 14 }}>
        <div><span>Profesional</span><b>{turno.profesional?.titulo || '—'}</b></div>
        <div><span>Tutor/a</span><b>{turno.tutor?.nombre || '—'}</b>{turno.tutor?.telefono && <div className="tiny muted">{turno.tutor.telefono}</div>}</div>
        <div><span>Origen</span><OrigenBadge origen={turno.origen} /></div>
        <div><span>Estado</span><TurnoBadge estado={turno.estado} /></div>
        {turno.notas && <div style={{ gridColumn: '1/-1' }}><span>Notas</span><b>{turno.notas}</b></div>}
      </div>
      <div className="tiny muted mono" style={{ marginBottom: 6 }}>Cambiar estado</div>
      <div className="row" style={{ gap: 6 }}>
        {ESTADOS_TURNO.filter(e => e[0] !== turno.estado).map(([k, l]) => <AsyncBtn key={k} className={`btn btn-sm ${k === 'atendido' ? 'btn-primary' : ''}`} onClick={() => set(k)}>{l}</AsyncBtn>)}
      </div>
      {turno.paciente?.id && <div className="row" style={{ marginTop: 14 }}><button className="btn" onClick={() => nav(`/vet/consultorio/pacientes/${turno.paciente.id}`)}>Abrir historia clínica →</button></div>}
    </Modal>
  );
}

function NuevoTurnoModal({ open, onClose, onSaved, fecha }) {
  const { data: servicios } = useApi(open ? '/clinic/servicios' : null);
  const { data: pros } = useApi(open ? '/clinic/profesionales' : null);
  const [f, setF] = useState({ servicioId: '', vetMp: '', fecha: isoDate(nextWorkday(fecha || new Date())), hora: '10:00', notas: '' });
  const [pac, setPac] = useState(null);
  const save = async () => {
    const [H, M] = f.hora.split(':').map(Number);
    const ini = new Date(`${f.fecha}T00:00:00`); ini.setHours(H, M, 0, 0);
    await api.post('/clinic/turnos', { inicio: ini.toISOString(), servicioId: f.servicioId || undefined, vetMp: f.vetMp || undefined, animalId: pac?.id, notas: f.notas });
    toast('Turno agendado'); onSaved(); onClose(); setPac(null);
  };
  return (
    <Modal open={open} onClose={onClose} title="Nuevo turno" subtitle="Se carga en la agenda como turno de mostrador">
      <div className="tiny muted mono" style={{ marginBottom: 6 }}>Paciente</div>
      <PacientePicker value={pac} onChange={setPac} />
      <div className="grid g2" style={{ gap: 10 }}>
        <Field label="Servicio"><select value={f.servicioId} onChange={e => setF({ ...f, servicioId: e.target.value })}><option value="">Consulta (30 min)</option>{(servicios || []).map(s => <option key={s.id} value={s.id}>{s.nombre} · {s.duracionMin} min</option>)}</select></Field>
        <Field label="Profesional"><select value={f.vetMp} onChange={e => setF({ ...f, vetMp: e.target.value })}><option value="">Yo</option>{(pros || []).map(p => <option key={p.mp} value={p.mp}>{p.titulo}</option>)}</select></Field>
        <Field label="Fecha"><input type="date" value={f.fecha} onChange={e => setF({ ...f, fecha: e.target.value })} /></Field>
        <Field label="Hora"><select value={f.hora} onChange={e => setF({ ...f, hora: e.target.value })}>{HORAS.map(h => <option key={h}>{h}</option>)}</select></Field>
      </div>
      <Field label="Notas"><input type="text" value={f.notas} onChange={e => setF({ ...f, notas: e.target.value })} placeholder="Motivo, indicaciones…" /></Field>
      <AsyncBtn className="btn btn-primary" onClick={save}>Agendar</AsyncBtn>
    </Modal>
  );
}

export function ClinicHome() {
  const { data, loading, error, reload } = useApi('/clinic/tablero');
  const { data: ctx } = useApi('/clinic/contexto');
  const [sel, setSel] = useState(null);
  if (loading && !data) return <Spinner />;
  if (error) return <ErrorBox error={error} onRetry={reload} />;
  const pend = data.turnos.filter(t => ['pendiente', 'confirmado'].includes(t.estado)).length;
  return (
    <>
      <PageHead kicker={`${ctx?.actual?.nombre || 'Consultorio'} · ${new Date().toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })}`} title="Tablero del día">
        <Link className="btn" to="/vet/consultorio/agenda">Agenda semanal</Link>
        <Link className="btn btn-primary" to="/vet/consultorio/ventas">Nueva venta</Link>
      </PageHead>
      <div className="grid g4">
        <Kpi label="Turnos de hoy" value={data.turnos.length} sub={`${pend} por atender`} />
        <Kpi label="Ventas de hoy" value={money(data.ventasHoy.total)} sub={`${data.ventasHoy.cantidad} comprobantes`} />
        <Kpi label="Cuentas por cobrar" value={money(data.cuentasPorCobrar)} sub="saldo de clientes" color={data.cuentasPorCobrar > 0 ? 'var(--warn)' : undefined} />
        <Kpi label="Mensajes sin leer" value={data.mensajesSinLeer} sub={`${data.recordatorios} recordatorios en 15 días`} />
      </div>
      <div className="grid" style={{ gridTemplateColumns: 'minmax(0,1.6fr) minmax(0,1fr)', marginTop: 16, alignItems: 'start' }}>
        <div className="card">
          <div className="row between"><h3 style={{ margin: 0 }}>Turnos de hoy</h3><span className="tiny muted mono">Clic para cambiar estado</span></div>
          {!data.turnos.length ? <Empty>No hay turnos hoy.</Empty> : data.turnos.map(t => (
            <div key={t.id} className="cl-turno" style={{ cursor: 'pointer' }} onClick={() => setSel(t)}>
              <span className="hh">{ftime(t.inicio)}</span>
              <span className="bar" style={{ background: t.servicio?.color || 'var(--leaf)' }} />
              <div style={{ minWidth: 0 }}><b>{t.paciente?.nombre || 'Sin paciente'}</b> <span className="small muted">· {t.servicio?.nombre || 'Consulta'}</span><div className="tiny muted">{t.tutor?.nombre || '—'} · {t.profesional?.titulo}</div></div>
              <div className="row" style={{ gap: 6 }}><OrigenBadge origen={t.origen} /><TurnoBadge estado={t.estado} /></div>
            </div>
          ))}
        </div>
        <div>
          <div className="card" style={{ marginBottom: 14 }}>
            <h3>Stock bajo</h3>
            {!data.stockBajo.length ? <div className="small muted">Todo en orden.</div> : data.stockBajo.map(p => <div key={p.id} className="row between small" style={{ padding: '6px 0', borderBottom: '1px solid var(--line)' }}><span>{p.nombre}</span><Badge cls="b-warn">{p.stock} / mín. {p.stockMin}</Badge></div>)}
            <Link className="btn btn-sm" style={{ marginTop: 10 }} to="/vet/consultorio/proveedores">Registrar compra</Link>
          </div>
          <div className="card" style={{ marginBottom: 14 }}>
            <h3>Por vencer (60 días)</h3>
            {!data.porVencer.length ? <div className="small muted">Sin productos por vencer.</div> : data.porVencer.map(p => <div key={p.id} className="row between small" style={{ padding: '6px 0', borderBottom: '1px solid var(--line)' }}><span>{p.nombre}</span><span className="mono tiny">{fdate(p.vence)}</span></div>)}
          </div>
          <div className="card">
            <h3>Accesos rápidos</h3>
            <div className="row" style={{ gap: 6 }}>
              <Link className="btn btn-sm" to="/vet/consultorio/pacientes">Pacientes</Link>
              <Link className="btn btn-sm" to="/vet/consultorio/recordatorios">Recordatorios</Link>
              <Link className="btn btn-sm" to="/vet/consultorio/mensajes">Mensajes</Link>
              <Link className="btn btn-sm" to="/vet/consultorio/caja">Caja</Link>
              <Link className="btn btn-sm" to="/vet/recetas">Emitir receta</Link>
            </div>
          </div>
        </div>
      </div>
      <TurnoEstadoModal turno={sel} onClose={() => setSel(null)} onSaved={reload} />
    </>
  );
}

const HOURS = Array.from({ length: 12 }, (_, i) => 9 + i);

export function Agenda() {
  const [start, setStart] = useState(weekStart());
  const desde = start, hasta = addD(start, 6);
  const { data, loading, error, reload } = useApi(`/clinic/turnos?desde=${desde.toISOString()}&hasta=${hasta.toISOString()}`, [start]);
  const { data: pros } = useApi('/clinic/profesionales');
  const [pro, setPro] = useState('');
  const [sel, setSel] = useState(null), [nuevo, setNuevo] = useState(false);
  const days = Array.from({ length: 6 }, (_, i) => addD(start, i));
  const turnos = useMemo(() => (data || []).filter(t => !pro || String(t.profesional?.mp) === pro), [data, pro]);
  const today = new Date().toDateString();
  const servicios = useMemo(() => { const m = {}; (data || []).forEach(t => t.servicio && (m[t.servicio.nombre] = t.servicio.color)); return Object.entries(m); }, [data]);
  return (
    <>
      <PageHead kicker="Turnos web, app del tutor y mostrador en una sola agenda" title="Agenda">
        <button className="btn" onClick={() => setStart(addD(start, -7))}>← Semana anterior</button>
        <button className="btn" onClick={() => setStart(weekStart())}>Hoy</button>
        <button className="btn" onClick={() => setStart(addD(start, 7))}>Semana siguiente →</button>
        <button className="btn btn-primary" onClick={() => setNuevo(true)}>+ Nuevo turno</button>
      </PageHead>
      <div className="row between" style={{ marginBottom: 12 }}>
        <Seg value={pro} onChange={setPro} options={[['', 'Todo el equipo'], ...(pros || []).map(p => [String(p.mp), p.titulo])]} />
        <div className="legend">{servicios.map(([n, c]) => <span key={n}><i className="dot" style={{ color: c }} />{n}</span>)}</div>
      </div>
      <div className="small muted" style={{ marginBottom: 8 }}>Semana del {start.toLocaleDateString('es-AR', { day: 'numeric', month: 'long' })} al {hasta.toLocaleDateString('es-AR', { day: 'numeric', month: 'long' })} · {turnos.length} turnos</div>
      {error ? <ErrorBox error={error} onRetry={reload} /> : loading && !data ? <Spinner /> : (
        <div className="cal cl-cal" style={{ '--days': 6 }}>
          <div className="ch" />
          {days.map(d => <div key={d} className={`ch ${d.toDateString() === today ? 'today' : ''}`}>{d.toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric' })}</div>)}
          {HOURS.map(h => [
            <div key={`h${h}`} className="hr">{String(h).padStart(2, '0')}:00</div>,
            ...days.map(d => {
              const cell = turnos.filter(t => { const x = new Date(t.inicio); return x.toDateString() === d.toDateString() && x.getHours() === h; });
              return (
                <div key={`${h}-${d}`} className={d.toDateString() === today ? 'today' : ''}>
                  {cell.map(t => (
                    <div key={t.id} className={`tchip ${t.estado}`} style={{ background: t.servicio?.color || 'var(--leaf)' }} onClick={() => setSel(t)} title={`${t.servicio?.nombre || 'Consulta'} · ${t.estado} · ${t.origen}`}>
                      <div className="tt">{ftime(t.inicio)} {t.paciente?.nombre || '—'}</div>
                      <div className="ts">{t.servicio?.nombre || 'Consulta'}{t.origen !== 'manual' ? ` · ${t.origen}` : ''}</div>
                    </div>
                  ))}
                </div>
              );
            }),
          ])}
        </div>
      )}
      <TurnoEstadoModal turno={sel} onClose={() => setSel(null)} onSaved={reload} />
      <NuevoTurnoModal open={nuevo} onClose={() => setNuevo(false)} onSaved={reload} fecha={nextWorkday(new Date() > start ? new Date() : start)} />
    </>
  );
}
