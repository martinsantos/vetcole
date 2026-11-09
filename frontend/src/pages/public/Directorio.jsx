// Directorio oficial: veterinarios (sólo matrícula vigente) y establecimientos. Filtros en la URL (?turnos=1, ?domicilio=1, ?especie=…).
import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useApi } from '../../lib/api.js';
import { Badge, Av, Kicker, Spinner, ErrorBox, Switch } from '../../components/ui.jsx';
import { DEPTOS, ESPECIES, ESPECIALIDADES, ini, norm, statusCls, guardiaColor } from '../../lib/format.js';
import { EstModal, useTurno } from './shared.jsx';
import { FotoVet } from './Profesional.jsx';
import MapView, { DEPTOS_LL } from '../../components/MapView.jsx';

const centroDepto = d => { const x = DEPTOS_LL.find(([n]) => n === d); return x ? [x[1], x[2]] : [-32.89, -68.84]; };
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

export default function Directorio() {
  const [sp, setSp] = useSearchParams();
  const tab = sp.get('tab') === 'estab' ? 'estab' : 'vets';
  const f = { q: sp.get('q') || '', especialidad: sp.get('especialidad') || '', especie: sp.get('especie') || '', departamento: sp.get('departamento') || '', domicilio: !!sp.get('domicilio'), turnos: !!sp.get('turnos') };
  const set = (k, v) => { const n = new URLSearchParams(sp); if (v === '' || v === false || v == null) n.delete(k); else n.set(k, v === true ? '1' : v); setSp(n, { replace: true }); };
  const qs = new URLSearchParams({ q: f.q, especialidad: f.especialidad, especie: f.especie, departamento: f.departamento, ...(f.domicilio ? { domicilio: 'true' } : {}), ...(f.turnos ? { turnos: 'true' } : {}) });
  const vets = useApi(tab === 'vets' ? `/public/vets?${qs}` : null);
  const ests = useApi('/public/establecimientos');
  const [est, setEst] = useState(null);
  const navigate = useNavigate();
  const setVet = v => v && navigate(`/profesional/${v.mp}`);
  const t = useTurno();
  const vista = sp.get('vista') === 'mapa' ? 'mapa' : 'lista';
  const estBy = Object.fromEntries((ests.data || []).map(e => [e.codigo, e]));
  // Dónde atiende cada profesional: su primer establecimiento; si atiende sólo a domicilio, el centro de su departamento.
  const lugarVet = v => { const e = (v.establecimientos || []).map(x => estBy[x.codigo]).find(Boolean); return e ? { lat: e.lat, lng: e.lng, est: e } : { lat: centroDepto(v.departamento)[0], lng: centroDepto(v.departamento)[1], aprox: true }; };
  const estList = (ests.data || []).filter(e => (!f.q || norm(`${e.nombre} ${e.direccion} ${e.tipo}`).includes(norm(f.q))) && (!f.departamento || e.departamento === f.departamento) && (!f.especie || e.especies.includes(f.especie)));
  return (
    <section className="sec" style={{ paddingTop: 30 }}><div className="wrap">
      <Kicker>Directorio oficial</Kicker>
      <h1 style={{ fontSize: 36, marginTop: 6 }}>Encontrá profesionales y establecimientos habilitados</h1>
      <p className="muted">Se alimenta del padrón del Colegio: si una matrícula se suspende o vence, deja de aparecer. Cada ficha la completa el profesional desde su portal.</p>
      <div className="tabs">
        <a className={tab === 'vets' ? 'on' : ''} onClick={() => set('tab', '')}>Veterinarios/as</a>
        <a className={tab === 'estab' ? 'on' : ''} onClick={() => set('tab', 'estab')}>Establecimientos ({ests.data?.length ?? '…'})</a>
      </div>
      <div className="vista-toggle" role="group" aria-label="Ver como">
        <button type="button" className={vista === 'lista' ? 'on' : ''} aria-pressed={vista === 'lista'} onClick={() => set('vista', '')}>Lista</button>
        <button type="button" className={vista === 'mapa' ? 'on' : ''} aria-pressed={vista === 'mapa'} onClick={() => set('vista', 'mapa')}>Mapa</button>
      </div>
      <div className="card flat" style={{ marginBottom: 16 }}>
        <div className="filters" style={tab === 'estab' ? { gridTemplateColumns: '2fr 1fr 1fr' } : undefined}>
          <input type="search" value={f.q} onChange={e => set('q', e.target.value)} placeholder={tab === 'vets' ? 'Nombre o N° de matrícula' : 'Nombre, dirección o tipo'} />
          {tab === 'vets' && <select aria-label="Especialidad" value={f.especialidad} onChange={e => set('especialidad', e.target.value)}><option value="">Todas las especialidades</option>{ESPECIALIDADES.map(x => <option key={x}>{x}</option>)}</select>}
          <select aria-label="Especie" value={f.especie} onChange={e => set('especie', e.target.value)}><option value="">Todas las especies</option>{ESPECIES.map(x => <option key={x}>{x}</option>)}</select>
          <select aria-label="Departamento" value={f.departamento} onChange={e => set('departamento', e.target.value)}><option value="">Toda la provincia</option>{DEPTOS.map(x => <option key={x}>{x}</option>)}</select>
        </div>
        {tab === 'vets' && <div className="row" style={{ marginTop: 10 }}>
          <Switch checked={f.domicilio} onChange={v => set('domicilio', v)}>Atiende a domicilio / a campo</Switch>
          <Switch checked={f.turnos} onChange={v => set('turnos', v)}>Turnos online</Switch>
          <span className="muted small" style={{ marginLeft: 'auto' }}>{vets.data ? `${vets.data.length} resultado${vets.data.length === 1 ? '' : 's'}` : ''}</span>
        </div>}
      </div>
      {tab === 'vets' ? (vets.error ? <ErrorBox error={vets.error} onRetry={vets.reload} /> : !vets.data ? <Spinner /> : vista === 'mapa' ? (
        <MapaVets vets={vets.data} lugarVet={lugarVet} onVet={setVet} />
      ) : (
        <div className="grid g3">
          {vets.data.map(v => { const l = lugarVet(v); return (
            <div key={v.mp} className="card vcard" role="link" tabIndex={0} onClick={() => setVet(v)} onKeyDown={e => e.key === 'Enter' && setVet(v)}>
              <FotoVet vet={v} size={56} />
              <div style={{ minWidth: 0 }}><b>{v.titulo}</b><div className="tiny muted">MP {v.mp} · {v.departamento}</div>
                <div className="small" style={{ margin: '6px 0' }}>{v.especialidades.join(' · ')}</div>
                <div className="row" style={{ gap: 6 }}><Badge cls="b-ok">✓ Matrícula vigente</Badge>{v.turnosOnline && <Badge>Turnos online</Badge>}{v.domicilio && <Badge cls="b-grey">A domicilio</Badge>}</div>
                <div className="tiny muted" style={{ marginTop: 6 }}>{l.est ? `${l.est.nombre} · ${l.est.direccion}` : 'Atiende a domicilio o a campo'}</div>
              </div>
            </div>
          ); })}
          {!vets.data.length && <div className="empty card flat" style={{ gridColumn: '1/-1' }}>No hay profesionales con esos filtros. Probá ampliar el departamento.</div>}
        </div>
      )) : (!ests.data ? <Spinner /> : vista === 'mapa' ? (
        <div className="dir-mapa"><MapView items={estList} onSelect={setEst} popup={e => `<h4>${esc(e.nombre)}</h4><div class="small muted">${esc(e.tipo)} · ${esc(e.direccion)}, ${esc(e.departamento)}</div>`} /></div>
      ) : (
        <>
          <div className="grid g3">{estList.map(e => (
            <div key={e.codigo} className="card vcard" onClick={() => setEst(e)}>
              <Av style={{ background: guardiaColor(e) + '1f', color: guardiaColor(e) }}>⌂</Av>
              <div style={{ minWidth: 0 }}><b>{e.nombre}</b><div className="tiny muted">{e.tipo} · {e.direccion}, {e.departamento}</div>
                <div className="row" style={{ gap: 6, marginTop: 6 }}><Badge cls={statusCls(e.status)}><span className="dot" />{e.status.label}</Badge>{e.turnosOnline && <Badge>Turnos online</Badge>}</div></div>
            </div>
          ))}</div>
          <p className="tiny muted" style={{ marginTop: 14 }}>Hoy el listado de establecimientos habilitados se publica como PDF mensual. Acá es la misma base que usa el Colegio para habilitar e inspeccionar, siempre actualizada.</p>
        </>
      ))}
      <EstModal est={est} onClose={() => setEst(null)} onTurno={c => { setEst(null); t.open(c); }} />
      {t.modal}
    </div></section>
  );
}

// Profesionales en el mapa: un marcador por lugar de atención, con los profesionales que atienden ahí.
function MapaVets({ vets, lugarVet, onVet }) {
  const grupos = {};
  for (const v of vets) {
    const l = lugarVet(v), k = l.est ? l.est.codigo : `dep-${v.departamento}`;
    (grupos[k] ||= { codigo: k, nombre: l.est ? l.est.nombre : `${v.departamento} · a domicilio`, lat: l.lat, lng: l.lng, turnosOnline: v.turnosOnline, guardia: l.est?.guardia, vets: [] }).vets.push(v);
  }
  const items = Object.values(grupos);
  const porMp = Object.fromEntries(vets.map(v => [String(v.mp), v]));
  return (
    <div className="dir-mapa" onClick={ev => { const b = ev.target.closest('[data-mp]'); if (b) onVet(porMp[b.dataset.mp]); }}>
      <MapView items={items} popup={g => `<h4>${esc(g.nombre)}</h4>${g.vets.map(v => `<button class="lnk-btn" data-mp="${v.mp}">${esc(v.titulo)} · MP ${v.mp}</button>`).join('')}`} />
      <p className="tiny muted" style={{ margin: '8px 2px 0' }}>{vets.length} profesionales en {items.length} lugares de atención. Quienes atienden sólo a domicilio aparecen en el centro de su departamento.</p>
    </div>
  );
}
