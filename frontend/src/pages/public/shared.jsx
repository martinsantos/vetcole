// Piezas compartidas del sitio público: datos cacheados, modales de veterinario/establecimiento,
// urgencia geolocalizada, bloque de mapa con lista y certificado de viaje.
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, useApi } from '../../lib/api.js';
import { Modal, Badge, Av, QR, verifyUrl, Seg, Spinner, LOGO } from '../../components/ui.jsx';
import MapView, { locate, dist } from '../../components/MapView.jsx';
import TurnoModal from '../../components/TurnoModal.jsx';
import { DEPTOS, fdate, ini, norm, statusCls, telFmt, guardiaColor, chipFmt } from '../../lib/format.js';
import './public.css';

// ── Caché simple en memoria para listados que usan varias páginas
const cache = {};
export const cached = path => (cache[path] ||= api.get(path).catch(e => { delete cache[path]; throw e; }));
export function useCached(path) {
  const [d, setD] = useState(null);
  useEffect(() => { let on = true; cached(path).then(x => on && setD(x)).catch(() => {}); return () => { on = false; }; }, [path]);
  return d;
}

export const horario = e => (e.guardia === 'activa' ? `24 h con profesional en el lugar${e.guardiaNota ? ` (${e.guardiaNota})` : ''}` : e.guardia === 'pasiva' ? `Guardia pasiva: llamar antes${e.guardiaNota ? ` (${e.guardiaNota})` : ''}` : 'Lun. a vie. 9–13 y 17–21 · Sáb. 9–13');
const mapsUrl = e => `https://www.google.com/maps/dir/?api=1&destination=${e.lat},${e.lng}`;

// ── Turno: abre la agenda real del primer establecimiento con turnos online del profesional
export function useTurno() {
  const [t, setT] = useState(null);
  const ests = useCached('/public/establecimientos');
  const open = (codigo, mp, preset) => setT({ codigo, mp, preset });
  const forVet = v => {
    const codigos = (v.establecimientos || []).map(x => x.codigo);
    const e = (ests || []).find(x => codigos.includes(x.codigo) && x.turnosOnline);
    if (e) open(e.codigo, v.mp);
    return !!e;
  };
  const modal = <TurnoModal open={!!t} codigo={t?.codigo} mp={t?.mp} preset={t?.preset} onClose={() => setT(null)} />;
  return { open, forVet, modal, ests };
}

export function VetModal({ vet, onClose, onTurno }) {
  const ests = useCached('/public/establecimientos');
  if (!vet) return null;
  const mine = (vet.establecimientos || []).map(x => (ests || []).find(e => e.codigo === x.codigo) || x);
  const conTurnos = mine.find(e => e.turnosOnline);
  const vigente = vet.estado === 'Vigente';
  return (
    <Modal open onClose={onClose} icon={<Av lg>{ini(vet.nombre)}</Av>} title={vet.titulo} subtitle={`Médico/a veterinario/a · MP ${vet.mp} · ${vet.departamento}`}>
      <Badge cls={vigente ? 'b-ok' : 'b-bad'}>{vigente ? '✓ Matrícula vigente · verificada hoy' : `Matrícula ${vet.estado.toLowerCase()}`}</Badge>
      <div className="grid g2" style={{ gap: 12, marginTop: 14 }}>
        <div><div className="tiny muted">Especialidades</div><b className="small">{vet.especialidades.join(', ')}</b></div>
        <div><div className="tiny muted">Especies</div><b className="small">{vet.especies.join(', ')}</b></div>
      </div>
      {vet.bio && <p className="small" style={{ marginTop: 12 }}>{vet.bio}</p>}
      <hr className="s" />
      <div className="tiny muted" style={{ marginBottom: 6 }}>Atiende en</div>
      {mine.length ? mine.map(e => (
        <div key={e.codigo} className="row" style={{ marginBottom: 8 }}>
          <Link to={`/verificar/e/${e.codigo}`} onClick={onClose}><b>{e.nombre}</b></Link><span className="small muted">{e.direccion}, {e.departamento}</span>
          {e.turnosOnline && <Badge>Turnos online</Badge>}
        </div>
      )) : <div className="small">Atención {vet.domicilio ? 'a domicilio / a campo' : 'particular'} en {vet.departamento} y alrededores.</div>}
      <hr className="s" />
      <div className="row">
        {vigente && vet.turnosOnline && conTurnos && <button className="btn btn-primary" onClick={() => onTurno(conTurnos.codigo, vet.mp)}>Pedir turno</button>}
        {vet.telefono && <a className="btn" style={{ color: '#128c4a' }} target="_blank" rel="noreferrer" href={`https://wa.me/549${vet.telefono}?text=${encodeURIComponent('Hola, te contacto desde el directorio del Colegio de Veterinarios de Mendoza.')}`}>WhatsApp</a>}
        {vet.telefono && <a className="btn" href={`tel:${vet.telefono}`}>Llamar</a>}
        <Link className="btn" to={`/verificar/${vet.mp}`} onClick={onClose}>Ver verificación</Link>
      </div>
      <p className="tiny muted" style={{ margin: '14px 0 0' }}>Ficha administrada por el profesional desde su portal. Los datos de matrícula los certifica el Colegio.</p>
    </Modal>
  );
}

export function EstModal({ est, onClose, onTurno }) {
  if (!est) return null;
  const e = est;
  return (
    <Modal open onClose={onClose} icon={<Av lg style={{ background: guardiaColor(e) + '1f', color: guardiaColor(e) }}>⌂</Av>} title={e.nombre} subtitle={`${e.tipo} · ${e.direccion}, ${e.departamento}`}>
      <Badge cls={statusCls(e.status)}><span className="dot" />{e.status?.label}</Badge>
      <div className="grid g2" style={{ gap: 12, marginTop: 14 }}>
        <div><div className="tiny muted">Horario</div><b className="small">{horario(e)}</b></div>
        <div><div className="tiny muted">Especies</div><b className="small">{e.especies.join(', ')}</b></div>
        {e.dt ? <>
          <div><div className="tiny muted">Dirección técnica</div><b className="small">{e.dt.titulo} · MP {e.dt.mp}</b></div>
          <div><div className="tiny muted">Habilitación</div><b className="small">{e.habilitacion} · <Badge cls="b-ok">Vigente</Badge></b></div>
        </> : <div style={{ gridColumn: '1/-1' }}><div className="tiny muted">Fuente</div><span className="small">Listado público de Guardias 24 hs del Colegio. Cada establecimiento completa su ficha y equipo desde su portal.</span></div>}
      </div>
      {!!e.equipo?.length && <><hr className="s" /><div className="tiny muted" style={{ marginBottom: 8 }}>Equipo profesional</div>
        {e.equipo.map(v => <div key={v.mp} className="row" style={{ marginBottom: 6 }}><Av style={{ width: 32, height: 32, fontSize: 12 }}>{ini(v.titulo.replace(/^Dra?\. /, ''))}</Av><span className="small"><b>{v.titulo}</b> · {v.especialidad}</span></div>)}</>}
      <hr className="s" />
      <div className="row">
        {e.turnosOnline && <button className="btn btn-primary" onClick={() => onTurno(e.codigo)}>Pedir turno</button>}
        <a className={`btn ${e.guardia ? 'btn-danger' : ''}`} href={`tel:${e.telefono}`}>Llamar · {telFmt(e.telefono)}</a>
        <a className="btn" target="_blank" rel="noreferrer" href={mapsUrl(e)}>Cómo llegar</a>
        <Link className="btn" to={`/verificar/e/${e.codigo}`} onClick={onClose}>Verificación</Link>
      </div>
      {e.dt && <div className="row" style={{ marginTop: 14, gap: 12 }}><QR text={verifyUrl(`/verificar/e/${e.codigo}`)} size={80} /><div className="small muted" style={{ flex: 1 }}>Oblea de <b>Establecimiento habilitado</b> para la vidriera: el QR abre esta ficha verificada.</div></div>}
    </Modal>
  );
}

// ── Urgencia: guardias abiertas más cercanas
export function UrgenciaModal({ open, onClose }) {
  const [res, setRes] = useState(null);
  useEffect(() => {
    if (!open) return;
    setRes(null);
    api.get('/public/guardias').then(g => locate((pos, real) => {
      const list = g.items.filter(e => e.status.open).map(e => ({ e, km: dist(pos, [e.lat, e.lng]) }))
        .sort((a, b) => (a.e.status.code === 'activa' ? 0 : 1) - (b.e.status.code === 'activa' ? 0 : 1) || a.km - b.km).slice(0, 4);
      setRes({ list, real });
    }));
  }, [open]);
  return (
    <Modal open={open} onClose={onClose} icon={<div className="av" style={{ background: 'var(--bad-l)', color: 'var(--bad)' }}>!</div>} title="Guardias abiertas cerca tuyo"
      subtitle={res ? (res.real ? 'Según tu ubicación actual · primero las guardias activas' : 'Ubicación de referencia: Ciudad de Mendoza · primero las guardias activas') : ''}>
      {!res ? <Spinner label="Buscando la guardia más cercana…" /> : res.list.map(({ e, km }) => (
        <div key={e.codigo} className="card flat row" style={{ marginBottom: 10 }}>
          <div style={{ flex: 1, minWidth: 200 }}><b>{e.nombre}</b><div className="small muted">{e.direccion}, {e.departamento} · {km.toFixed(1)} km</div><Badge cls={statusCls(e.status)}>{e.status.label}</Badge></div>
          <a className="btn btn-danger btn-sm" href={`tel:${e.telefono}`}>Llamar</a>
          <a className="btn btn-sm" target="_blank" rel="noreferrer" href={mapsUrl(e)}>Cómo llegar</a>
        </div>
      ))}
    </Modal>
  );
}

// ── Bloque de mapa + lista (home y página Mapa)
const CHIPS = [['all', 'Todos'], ['guardia', 'Guardia ahora'], ['turnos', 'Con turnos online'], ['grandes', 'Grandes animales'], ['exoticos', 'Exóticos y aves']];
const GRANDES = ['Equinos', 'Bovinos', 'Caprinos y ovinos', 'Porcinos'];
const match = (e, chip) => chip === 'guardia' ? e.guardia && e.status.open : chip === 'turnos' ? e.turnosOnline : chip === 'grandes' ? e.especies.some(x => GRANDES.includes(x)) : chip === 'exoticos' ? e.especies.some(x => x === 'Exóticos' || x === 'Aves') : true;

export function MapSection({ home, initialChip = 'all' }) {
  const { data: ests } = useApi('/public/establecimientos');
  const { data: prox } = useApi('/public/proximos-turnos');
  const [chip, setChip] = useState(initialChip), [q, setQ] = useState(''), [dep, setDep] = useState('');
  const [sel, setSel] = useState(null), [ficha, setFicha] = useState(null);
  const t = useTurno();
  const next = useMemo(() => Object.fromEntries((prox || []).map(p => [p.codigo, p])), [prox]);
  const base = (ests || []).filter(e => (!q || norm(`${e.nombre} ${e.direccion} ${e.tipo} ${e.departamento}`).includes(norm(q))) && (!dep || e.departamento === dep));
  const list = base.filter(e => match(e, chip));
  const slotLbl = p => { const d = new Date(p.inicio), tm = new Date(); tm.setDate(tm.getDate() + 1); return `${d.toDateString() === tm.toDateString() ? 'mañana' : d.toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric' })} ${p.hora}`; };
  const popup = e => {
    const p = next[e.codigo];
    return `<div class="mono tiny muted">${e.tipo.toUpperCase()} · ${e.departamento.toUpperCase()}</div><h4>${e.nombre}</h4><div class="small muted">${e.direccion}</div><span class="badge ${statusCls(e.status)}" style="margin:6px 0">${e.status.label}</span>
      <div class="row" style="gap:6px;margin-top:6px">${p ? `<button class="slotbtn" data-act="turno" data-c="${e.codigo}"><span>Próximo turno</span><b>${slotLbl(p)}</b></button>` : ''}${e.guardia ? `<a class="btn btn-sm btn-danger" href="tel:${e.telefono}">Llamar</a>` : ''}<button class="btn btn-sm" data-act="ficha" data-c="${e.codigo}">Ficha</button></div>`;
  };
  const onMapClick = ev => {
    const b = ev.target.closest('[data-act]'); if (!b) return;
    const e = (ests || []).find(x => x.codigo === b.dataset.c); if (!e) return;
    if (b.dataset.act === 'turno') { const p = next[e.codigo]; t.open(e.codigo, p?.mp, p?.inicio); } else setFicha(e);
  };
  const cercaMio = () => locate(pos => { const n = list.slice().sort((a, b) => dist(pos, [a.lat, a.lng]) - dist(pos, [b.lat, b.lng]))[0]; if (n) setSel(n.codigo); });
  return (
    <div className={`mapx ${home ? 'mapx-home' : 'mapx-page'}`}>
      <div className="mapx-bar">
        <Seg value={chip} onChange={setChip} options={CHIPS.map(([k, l]) => [k, l, (ests ? base.filter(e => match(e, k)).length : undefined)])} />
        <div className="mapx-tools">
          <div className="mapx-search"><input type="search" value={q} onChange={e => setQ(e.target.value)} placeholder="Nombre, calle o tipo" style={{ paddingLeft: 12 }} /></div>
          <select value={dep} onChange={e => setDep(e.target.value)}><option value="">Toda la provincia</option>{DEPTOS.map(d => <option key={d}>{d}</option>)}</select>
          <button className="btn btn-sm" onClick={cercaMio}>◎ Cerca mío</button>
        </div>
      </div>
      <div className="mapx-body">
        <div className="mapx-list">
          {!ests ? <Spinner /> : list.length ? list.map(e => { const p = next[e.codigo]; return (
            <div key={e.codigo} className={`mi ${sel === e.codigo ? 'sel' : ''}`} onClick={() => setSel(e.codigo)}>
              <div className="mi-mk" style={{ background: guardiaColor(e) }}>{e.guardia === 'activa' ? '24' : e.guardia === 'pasiva' ? 'P' : e.turnosOnline ? 'T' : '·'}</div>
              <div className="mi-b"><div className="mi-t">{e.nombre}</div><div className="mi-s">{e.tipo} · {e.departamento}</div><div className="mi-d">{e.direccion}</div><Badge cls={statusCls(e.status)}>{e.status.label}</Badge></div>
              <div className="mi-a">{p ? <button className="slotbtn" onClick={ev => { ev.stopPropagation(); t.open(e.codigo, p.mp, p.inicio); }}><span>Próximo turno</span><b>{slotLbl(p)}</b></button>
                : e.guardia ? <a className="btn btn-sm btn-danger" href={`tel:${e.telefono}`} onClick={ev => ev.stopPropagation()}>Llamar</a> : null}</div>
            </div>); }) : <div className="empty">Ningún establecimiento con esos filtros.</div>}
        </div>
        <div className="mapx-map" onClick={onMapClick}>
          <MapView items={list} selected={sel} popup={popup} scrollWheel={!home} />
          <div className="mapx-legend"><span><i style={{ background: '#c0392b' }} />Guardia activa</span><span><i style={{ background: '#e08a00' }} />Guardia pasiva</span><span><i style={{ background: '#2d6b5a' }} />Turnos online</span><span><i style={{ background: '#7c1c6f' }} />Establecimiento</span></div>
        </div>
      </div>
      <EstModal est={ficha} onClose={() => setFicha(null)} onTurno={c => { setFicha(null); t.open(c, next[c]?.mp); }} />
      {t.modal}
    </div>
  );
}

// ── Certificado de viaje (desde la libreta pública)
export function CertViajeModal({ libreta, evento, onClose }) {
  if (!libreta || !evento) return null;
  const vacs = libreta.eventos.filter(e => e.tipo === 'vac' && e.proximo && new Date(e.proximo) > new Date());
  const destino = (evento.detalle || '').split('· ').pop();
  const f = evento.firma;
  return (
    <Modal open onClose={onClose} title="">
      <div className="rx">
        <div className="rx-h"><div><div className="mono tiny" style={{ opacity: 0.8 }}>CERTIFICADO DE SALUD PARA VIAJAR</div><b className="mono">CV-{libreta.libreta}-{evento.fecha.slice(0, 10).replace(/-/g, '')}</b></div><img src={LOGO} alt="" /></div>
        <div className="rx-b">
          <p className="small" style={{ marginTop: 0 }}>Certifico que el animal descripto fue examinado en la fecha indicada y no presenta signos clínicos de enfermedades infectocontagiosas, encontrándose apto para viajar.</p>
          <div className="facts" style={{ padding: 0 }}>
            <div><span>Animal</span><b>{libreta.nombre} · {libreta.especie}</b></div><div><span>Microchip</span><b className="mono">{libreta.microchip ? chipFmt(libreta.microchip) : '—'}</b></div>
            <div><span>Destino</span><b>{destino || '—'}</b></div><div><span>Fecha de examen</span><b>{fdate(evento.fecha)}</b></div>
          </div>
          <div className="rx-tipo">Vacunas vigentes</div>
          {vacs.length ? vacs.map(e => <div key={e.id} className="small">✓ {e.titulo} · aplicada {fdate(e.fecha)} · vence {fdate(e.proximo)}</div>) : <div className="small muted">Sin vacunas vigentes registradas.</div>}
          <div className="row between" style={{ marginTop: 14, alignItems: 'flex-end' }}>
            <div className="small">{f?.titulo && <><b>{f.titulo}</b><div className="tiny" style={{ color: 'var(--ok)' }}>✓ MP {f.mp} vigente · firma electrónica</div></>}<div className="tiny muted" style={{ maxWidth: 300, marginTop: 6 }}>Para viajes al exterior, SENASA emite el CVI a partir de este certificado.</div></div>
            <QR text={verifyUrl(`/libreta/${libreta.libreta}`)} size={80} />
          </div>
        </div>
      </div>
      <div className="row" style={{ marginTop: 14 }}><Link className="btn" to="/viajar" onClick={onClose}>Requisitos por destino</Link></div>
    </Modal>
  );
}

export function useNav() { return useNavigate(); }
