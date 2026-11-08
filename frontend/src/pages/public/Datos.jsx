// Datos abiertos: panel de zoonosis por departamento y explorador de la API pública con datos en vivo.
import { useState } from 'react';
import { api, useApi } from '../../lib/api.js';
import { Kicker, Kpi, VBars, Spinner, toast, saveFile } from '../../components/ui.jsx';
import { DEPTOS } from '../../lib/format.js';

const ENDPOINTS = [
  ['/public/vets?turnos=true', 'Profesionales con matrícula vigente y turnos online'],
  ['/public/vets/1342', 'Estado de una matrícula'],
  ['/public/establecimientos', 'Establecimientos (con estado de atención en vivo)'],
  ['/public/guardias', 'Guardias abiertas y zonas sin cobertura'],
  ['/public/proximos-turnos', 'Próximo turno libre por establecimiento'],
  ['/public/libretas/MZA-000231', 'Libreta sanitaria pública (sin datos del tutor)'],
  ['/public/recetas/RV-2026-000398', 'Verificación de receta'],
  ['/public/datos/panel?departamento=Godoy Cruz', 'Panel agregado de zoonosis'],
];

const csv = rows => rows.map(r => r.map(x => `"${String(x ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
const download = (name, text) => saveFile(name, text);

export default function Datos() {
  const [dep, setDep] = useState('');
  const { data: p, loading } = useApi(`/public/datos/panel${dep ? `?departamento=${encodeURIComponent(dep)}` : ''}`);
  const [sel, setSel] = useState(null), [out, setOut] = useState('// Elegí un endpoint para ver la respuesta en vivo');
  const tryIt = async i => {
    setSel(i); setOut('// Consultando…');
    try { const r = await api.get(ENDPOINTS[i][0]); setOut(`// GET /api/v1${ENDPOINTS[i][0]}\n` + JSON.stringify({ success: true, data: r }, null, 2)); }
    catch (e) { setOut(`// Error: ${e.message}`); }
  };
  const csvVets = async () => {
    const vs = await api.get('/public/vets');
    download('matriculados-vigentes.csv', csv([['matricula', 'nombre', 'departamento', 'zona', 'especialidades', 'especies', 'turnos_online'], ...vs.map(v => [v.mp, v.nombre, v.departamento, v.zona, v.especialidades.join(' / '), v.especies.join(' / '), v.turnosOnline ? 'sí' : 'no'])]));
    toast(`CSV con ${vs.length} matriculados descargado`);
  };
  const csvEst = async () => {
    const es = await api.get('/public/establecimientos');
    download('establecimientos.csv', csv([['codigo', 'nombre', 'tipo', 'direccion', 'departamento', 'guardia', 'habilitacion'], ...es.map(e => [e.codigo, e.nombre, e.tipo, e.direccion, e.departamento, e.guardia || '', e.habilitacion || ''])]));
  };
  return (
    <section className="sec" style={{ paddingTop: 30 }}><div className="wrap">
      <div className="shead"><div><Kicker>Para municipios, Salud y SENASA</Kicker><h1 style={{ fontSize: 40, margin: '6px 0 0' }}>Datos abiertos y panel de zoonosis</h1>
        <p className="muted" style={{ marginTop: 8 }}>Lo que firman los matriculados, agregado por departamento y sin datos personales. Municipios, ferias y refugios validan matrículas y vacunas sin pedir listados.</p></div></div>
      <div className="card">
        <div className="row between"><div><Kicker>Panel de los últimos 12 meses</Kicker><h3 style={{ margin: '6px 0 0' }}>{dep || 'Toda la provincia'}</h3></div>
          <select style={{ width: 220 }} value={dep} onChange={e => setDep(e.target.value)}><option value="">Toda la provincia</option>{DEPTOS.map(d => <option key={d}>{d}</option>)}</select></div>
        {loading || !p ? <Spinner /> : <>
          <div className="grid g4" style={{ marginTop: 14 }}>
            <Kpi label="Libretas digitales" value={p.libretas.toLocaleString('es-AR')} />
            <Kpi label="Antirrábicas registradas" value={p.antirrabicas.toLocaleString('es-AR')} />
            <Kpi label="Castraciones" value={p.castraciones.toLocaleString('es-AR')} />
            <Kpi label="Mordeduras (municipios en servicio)" value={p.mordeduras} color="var(--bad)" />
          </div>
          <div className="tiny muted mono" style={{ marginTop: 18 }}>ANTIRRÁBICAS POR MES · PERROS / GATOS</div>
          <VBars data={p.meses} keys={['perros', 'gatos']} />
        </>}
        <p className="tiny muted" style={{ margin: '8px 0 0' }}>Datos de la demo, calculados en vivo sobre las libretas firmadas.</p>
      </div>
      <div className="grid g2" style={{ marginTop: 18, alignItems: 'start' }}>
        <div className="card"><h3>API pública · /api/v1</h3><p className="small muted">CORS abierto, sin autenticación, igual que el directorio público de Psicole.</p>
          {ENDPOINTS.map(([path, d], i) => (
            <div key={path} className={`apil ${sel === i ? 'on' : ''}`} onClick={() => tryIt(i)}><span className="mono tiny" style={{ color: 'var(--leaf)', fontWeight: 700 }}>GET</span><div style={{ minWidth: 0 }}><div className="mono tiny" style={{ wordBreak: 'break-all' }}>{path}</div><div className="tiny muted">{d}</div></div></div>
          ))}
          <div className="row" style={{ marginTop: 12 }}><button className="btn btn-sm" onClick={csvVets}>CSV matriculados vigentes</button><button className="btn btn-sm" onClick={csvEst}>CSV establecimientos</button></div>
        </div>
        <pre className="json">{out}</pre>
      </div>
    </div></section>
  );
}
