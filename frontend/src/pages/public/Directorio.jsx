// Directorio oficial: veterinarios (sólo matrícula vigente) y establecimientos. Filtros en la URL (?turnos=1, ?domicilio=1, ?especie=…).
import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useApi } from '../../lib/api.js';
import { Badge, Av, Kicker, Spinner, ErrorBox, Switch } from '../../components/ui.jsx';
import { DEPTOS, ESPECIES, ESPECIALIDADES, ini, norm, statusCls, guardiaColor } from '../../lib/format.js';
import { VetModal, EstModal, useTurno } from './shared.jsx';

export default function Directorio() {
  const [sp, setSp] = useSearchParams();
  const tab = sp.get('tab') === 'estab' ? 'estab' : 'vets';
  const f = { q: sp.get('q') || '', especialidad: sp.get('especialidad') || '', especie: sp.get('especie') || '', departamento: sp.get('departamento') || '', domicilio: !!sp.get('domicilio'), turnos: !!sp.get('turnos') };
  const set = (k, v) => { const n = new URLSearchParams(sp); if (v === '' || v === false || v == null) n.delete(k); else n.set(k, v === true ? '1' : v); setSp(n, { replace: true }); };
  const qs = new URLSearchParams({ q: f.q, especialidad: f.especialidad, especie: f.especie, departamento: f.departamento, ...(f.domicilio ? { domicilio: 'true' } : {}), ...(f.turnos ? { turnos: 'true' } : {}) });
  const vets = useApi(tab === 'vets' ? `/public/vets?${qs}` : null);
  const ests = useApi('/public/establecimientos');
  const [vet, setVet] = useState(null), [est, setEst] = useState(null);
  const t = useTurno();
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
      <div className="card flat" style={{ marginBottom: 16 }}>
        <div className="filters" style={tab === 'estab' ? { gridTemplateColumns: '2fr 1fr 1fr' } : undefined}>
          <input type="search" value={f.q} onChange={e => set('q', e.target.value)} placeholder={tab === 'vets' ? 'Nombre o N° de matrícula' : 'Nombre, dirección o tipo'} />
          {tab === 'vets' && <select value={f.especialidad} onChange={e => set('especialidad', e.target.value)}><option value="">Todas las especialidades</option>{ESPECIALIDADES.map(x => <option key={x}>{x}</option>)}</select>}
          <select value={f.especie} onChange={e => set('especie', e.target.value)}><option value="">Todas las especies</option>{ESPECIES.map(x => <option key={x}>{x}</option>)}</select>
          <select value={f.departamento} onChange={e => set('departamento', e.target.value)}><option value="">Toda la provincia</option>{DEPTOS.map(x => <option key={x}>{x}</option>)}</select>
        </div>
        {tab === 'vets' && <div className="row" style={{ marginTop: 10 }}>
          <Switch checked={f.domicilio} onChange={v => set('domicilio', v)}>Atiende a domicilio / a campo</Switch>
          <Switch checked={f.turnos} onChange={v => set('turnos', v)}>Turnos online</Switch>
          <span className="muted small" style={{ marginLeft: 'auto' }}>{vets.data ? `${vets.data.length} resultado${vets.data.length === 1 ? '' : 's'}` : ''}</span>
        </div>}
      </div>
      {tab === 'vets' ? (vets.error ? <ErrorBox error={vets.error} onRetry={vets.reload} /> : !vets.data ? <Spinner /> : (
        <div className="grid g3">
          {vets.data.map(v => (
            <div key={v.mp} className="card vcard" onClick={() => setVet(v)}>
              <Av>{ini(v.nombre)}</Av>
              <div style={{ minWidth: 0 }}><b>{v.titulo}</b><div className="tiny muted">MP {v.mp} · {v.departamento}</div>
                <div className="small" style={{ margin: '6px 0' }}>{v.especialidades.join(' · ')}</div>
                <div className="row" style={{ gap: 6 }}><Badge cls="b-ok">✓ Matrícula vigente</Badge>{v.turnosOnline && <Badge>Turnos online</Badge>}{v.domicilio && <Badge cls="b-grey">A domicilio</Badge>}</div>
              </div>
            </div>
          ))}
          {!vets.data.length && <div className="empty card flat" style={{ gridColumn: '1/-1' }}>No hay profesionales con esos filtros. Probá ampliar el departamento.</div>}
        </div>
      )) : (!ests.data ? <Spinner /> : (
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
      <VetModal vet={vet} onClose={() => setVet(null)} onTurno={(c, mp) => { setVet(null); t.open(c, mp); }} />
      <EstModal est={est} onClose={() => setEst(null)} onTurno={c => { setEst(null); t.open(c); }} />
      {t.modal}
    </div></section>
  );
}
