// Directorio oficial: veterinarios (sólo matrícula vigente) y establecimientos. Filtros en la URL (?turnos=1, ?domicilio=1, ?especie=…).
import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useApi } from '../../lib/api.js';
import { Badge, Av, Kicker, Spinner, ErrorBox } from '../../components/ui.jsx';
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
  const [sel, setSel] = useState(null);
  const verEnMapa = k => { setSel(null); setTimeout(() => setSel(k), 0); if (vista !== 'mapa' && window.innerWidth < 980) set('vista', 'mapa'); };
  const claveLugar = (v, l) => (l.est ? l.est.codigo : `dep-${v.departamento}`);
  const hayFiltros = !!(f.q || f.especialidad || f.especie || f.departamento || f.domicilio || f.turnos);
  const estList = (ests.data || []).filter(e => (!f.q || norm(`${e.nombre} ${e.direccion} ${e.tipo}`).includes(norm(f.q))) && (!f.departamento || e.departamento === f.departamento) && (!f.especie || e.especies.includes(f.especie)));
  const lista = tab === 'vets' ? (ests.data ? vets.data : null) : (ests.data ? estList : null);
  // Puntos del mapa: los establecimientos filtrados o, para profesionales, un marcador por lugar de atención.
  const puntos = !lista ? [] : tab === 'estab' ? lista : Object.values(lista.reduce((g, v) => { const l = lugarVet(v), k = claveLugar(v, l); (g[k] ||= { codigo: k, nombre: l.est ? l.est.nombre : `${v.departamento} · a domicilio`, lat: l.lat, lng: l.lng, turnosOnline: false, guardia: l.est?.guardia, vets: [] }).vets.push(v); g[k].turnosOnline ||= v.turnosOnline; return g; }, {}));
  return (
    <section className="sec" style={{ paddingTop: 30 }}><div className="wrap dir-wrap">
      <Kicker>Directorio oficial</Kicker>
      <h1 style={{ fontSize: 32, marginTop: 6 }}>Profesionales y establecimientos habilitados</h1>
      <div className="tabs">
        <a className={tab === 'vets' ? 'on' : ''} onClick={() => set('tab', '')}>Veterinarios/as</a>
        <a className={tab === 'estab' ? 'on' : ''} onClick={() => set('tab', 'estab')}>Establecimientos ({ests.data?.length ?? '…'})</a>
      </div>
      <div className="dir-filtros">
        <input type="search" value={f.q} onChange={e => set('q', e.target.value)} placeholder={tab === 'vets' ? 'Nombre o N° de matrícula' : 'Nombre, dirección o tipo'} aria-label="Buscar" />
        {tab === 'vets' && <select aria-label="Especialidad" value={f.especialidad} onChange={e => set('especialidad', e.target.value)}><option value="">Todas las especialidades</option>{ESPECIALIDADES.map(x => <option key={x}>{x}</option>)}</select>}
        <select aria-label="Especie" value={f.especie} onChange={e => set('especie', e.target.value)}><option value="">Todas las especies</option>{ESPECIES.map(x => <option key={x}>{x}</option>)}</select>
        <select aria-label="Departamento" value={f.departamento} onChange={e => set('departamento', e.target.value)}><option value="">Toda la provincia</option>{DEPTOS.map(x => <option key={x}>{x}</option>)}</select>
        {tab === 'vets' && <>
          <button type="button" className={`chip ${f.turnos ? 'on' : ''}`} aria-pressed={f.turnos} onClick={() => set('turnos', !f.turnos)}>Turnos online</button>
          <button type="button" className={`chip ${f.domicilio ? 'on' : ''}`} aria-pressed={f.domicilio} onClick={() => set('domicilio', !f.domicilio)}>A domicilio o a campo</button>
        </>}
        {hayFiltros && <button type="button" className="lnk dir-limpiar" onClick={() => setSp(tab === 'estab' ? { tab: 'estab' } : {}, { replace: true })}>Quitar filtros</button>}
      </div>
      <div className="vista-toggle dir-movil" role="group" aria-label="Ver como">
        <button type="button" className={vista === 'lista' ? 'on' : ''} aria-pressed={vista === 'lista'} onClick={() => set('vista', '')}>Lista</button>
        <button type="button" className={vista === 'mapa' ? 'on' : ''} aria-pressed={vista === 'mapa'} onClick={() => set('vista', 'mapa')}>Mapa</button>
      </div>
      {tab === 'vets' && vets.error ? <ErrorBox error={vets.error} onRetry={vets.reload} /> : !lista ? <Spinner /> : (
        <div className={`dir-split ver-${vista}`}>
          <div className="dir-lista">
            <div className="small muted dir-cuenta">{lista.length} resultado{lista.length === 1 ? '' : 's'}{tab === 'vets' ? ` en ${puntos.length} lugares de atención` : ''}</div>
            {tab === 'vets' ? lista.map(v => { const l = lugarVet(v), k = claveLugar(v, l); return (
              <div key={v.mp} className={`card vcard ${sel === k ? 'sel' : ''}`} role="link" tabIndex={0} onClick={() => setVet(v)} onKeyDown={e => e.key === 'Enter' && setVet(v)}>
                <FotoVet vet={v} size={52} />
                <div style={{ minWidth: 0, flex: 1 }}><b>{v.titulo}</b><div className="tiny muted">MP {v.mp} · {v.especialidades.join(' · ')}</div>
                  <div className="row" style={{ gap: 6, margin: '6px 0' }}><Badge cls="b-ok">✓ Matrícula vigente</Badge>{v.turnosOnline && <Badge>Turnos online</Badge>}{v.domicilio && <Badge cls="b-grey">A domicilio</Badge>}</div>
                  <div className="tiny muted">{l.est ? `${l.est.nombre} · ${l.est.direccion}, ${l.est.departamento}` : `Atiende a domicilio o a campo · ${v.departamento}`}</div>
                </div>
                <button type="button" className="btn btn-sm dir-ver" onClick={e => { e.stopPropagation(); verEnMapa(k); }}>Ver en el mapa</button>
              </div>
            ); }) : lista.map(e => (
              <div key={e.codigo} className={`card vcard ${sel === e.codigo ? 'sel' : ''}`} role="link" tabIndex={0} onClick={() => setEst(e)} onKeyDown={ev => ev.key === 'Enter' && setEst(e)}>
                <Av style={{ background: guardiaColor(e) + '1f', color: guardiaColor(e) }}>⌂</Av>
                <div style={{ minWidth: 0, flex: 1 }}><b>{e.nombre}</b><div className="tiny muted">{e.tipo} · {e.direccion}, {e.departamento}</div>
                  <div className="row" style={{ gap: 6, marginTop: 6 }}><Badge cls={statusCls(e.status)}><span className="dot" />{e.status.label}</Badge>{e.turnosOnline && <Badge>Turnos online</Badge>}{e.acreditacion && <Badge cls="b-grey">{e.acreditacion}</Badge>}</div></div>
                <button type="button" className="btn btn-sm dir-ver" onClick={ev => { ev.stopPropagation(); verEnMapa(e.codigo); }}>Ver en el mapa</button>
              </div>
            ))}
            {!lista.length && <div className="empty card flat">No hay resultados con esos filtros. Probá ampliar el departamento.</div>}
          </div>
          <div className="dir-mapa" onClick={ev => { const b = ev.target.closest('[data-mp]'); if (b) navigate(`/profesional/${b.dataset.mp}`); }}>
            <MapView key={`${tab}-${vista}`} items={puntos} selected={sel} onSelect={tab === 'estab' ? setEst : undefined}
              popup={tab === 'estab' ? (e => `<h4>${esc(e.nombre)}</h4><div class="small muted">${esc(e.tipo)} · ${esc(e.direccion)}, ${esc(e.departamento)}</div>`)
                : (g => `<h4>${esc(g.nombre)}</h4>${g.vets.map(v => `<button class="lnk-btn" data-mp="${v.mp}">${esc(v.titulo)} · MP ${v.mp}</button>`).join('')}`)} />
          </div>
        </div>
      )}
      <p className="tiny muted" style={{ marginTop: 14 }}>Se alimenta del padrón del Colegio: si una matrícula se suspende o vence, deja de aparecer. Quienes atienden sólo a domicilio figuran en el centro de su departamento.</p>
      <EstModal est={est} onClose={() => setEst(null)} onTurno={c => { setEst(null); t.open(c); }} />
      {t.modal}
    </div></section>
  );
}
