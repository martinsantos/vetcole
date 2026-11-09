// Portada B (concepto): la portada como «estado de la salud animal en Mendoza, ahora».
// En vez de presentar al Colegio, responde lo que la persona vino a resolver según la hora del día,
// con datos en vivo de la misma base: guardias abiertas, turnos libres, libretas y matrículas.
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useApi } from '../../lib/api.js';
import { Badge, QR, verifyUrl } from '../../components/ui.jsx';
import { telFmt, statusCls, edad, fdate } from '../../lib/format.js';
import { BRAND } from '../../lib/brand.js';
import MapView from '../../components/MapView.jsx';
import Buscador from './Buscador.jsx';
import { EstModal, useTurno, UrgenciaModal } from './shared.jsx';
import './concepto.css';

const momento = h => (h < 6 ? ['Es de madrugada', 'noche'] : h < 13 ? ['Buen día', 'dia'] : h < 20 ? ['Buenas tardes', 'dia'] : ['Buenas noches', 'noche']);

function Reloj() {
  const [t, setT] = useState(new Date());
  useEffect(() => { const i = setInterval(() => setT(new Date()), 30000); return () => clearInterval(i); }, []);
  return <>{t.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false })}</>;
}

export default function Concepto() {
  const nav = useNavigate();
  const { data: g } = useApi('/public/guardias');
  const { data: prox } = useApi('/public/proximos-turnos');
  const { data: stats } = useApi('/public/stats');
  const { data: luna } = useApi('/public/libretas/MZA-000231');
  const [est, setEst] = useState(null), [urg, setUrg] = useState(false), [mp, setMp] = useState('');
  const t = useTurno();
  // Para la demo se puede forzar el modo; por defecto lo decide la hora.
  const [forzado, setForzado] = useState(null);
  const [saludo, modo] = momento(forzado === 'noche' ? 23 : forzado === 'dia' ? 11 : new Date().getHours());
  const abiertas = (g?.items || []).filter(e => e.status.open);
  const activas = abiertas.filter(e => e.status.code === 'activa');
  const frase = !g ? 'Consultando las guardias…'
    : modo === 'noche' ? `Hay ${activas.length} guardias con veterinario/a en el lugar en este momento.`
    : `${activas.length} guardias abiertas y ${(prox || []).length} turnos libres para hoy y mañana.`;

  return (
    <div className={`cb cb-${modo}`}>
      <section className="cb-hero"><div className="wrap">
        <div className="cb-top">
          <span className="cb-live"><i />En vivo · <Reloj /> · Mendoza</span>
          <span className="cb-org">{BRAND.nombre} · <button type="button" className="cb-modo" onClick={() => setForzado(modo === 'noche' ? 'dia' : 'noche')}>Ver cómo se ve de {modo === 'noche' ? 'día' : 'noche'}</button></span>
        </div>
        <h1>{saludo}. <span>{frase}</span></h1>
        <div className="cb-busca"><Buscador onVet={v => nav(`/profesional/${v.mp}`)} onEst={setEst} onTurno={v => { if (!t.forVet(v)) nav(`/profesional/${v.mp}`); }} /></div>
        <div className="cb-nums">
          <button type="button" className="cb-num urg" onClick={() => setUrg(true)}><b>{g ? activas.length : '–'}</b><span>guardias abiertas ahora</span><em>Ver la más cercana →</em></button>
          <Link className="cb-num" to="/directorio?turnos=1"><b>{prox ? prox.length : '–'}</b><span>turnos libres próximos</span><em>Reservar →</em></Link>
          <Link className="cb-num" to="/directorio"><b>{stats ? stats.padronPublicado : '–'}</b><span>profesionales matriculados</span><em>Buscar →</em></Link>
          <Link className="cb-num" to="/mapa"><b>{stats ? stats.establecimientos : '–'}</b><span>establecimientos en el mapa</span><em>Abrir mapa →</em></Link>
        </div>
      </div></section>

      <section className="cb-sec"><div className="wrap cb-ahora">
        <div>
          <h2>Abierto ahora</h2>
          <div className="cb-lista">
            {abiertas.slice(0, 5).map(e => (
              <div key={e.codigo} className="cb-item">
                <button type="button" className="cb-item-main" onClick={() => setEst(e)}>
                  <b>{e.nombre}</b><span>{e.direccion}, {e.departamento}</span>
                  <Badge cls={statusCls(e.status)}>{e.status.label}</Badge>
                </button>
                <a className="btn btn-danger btn-sm" href={`tel:${e.telefono}`}>Llamar · {telFmt(e.telefono)}</a>
              </div>
            ))}
            {g && !abiertas.length && <p className="muted">No hay guardias declaradas en este momento.</p>}
          </div>
          {g?.sinCobertura?.length > 0 && <p className="cb-aviso">Sin guardia declarada hoy en: {g.sinCobertura.join(', ')}. <Link to="/directorio?domicilio=1">Ver quién atiende a domicilio →</Link></p>}
          <Link className="lnk" to="/guardias">Tablero de guardia completo →</Link>
        </div>
        <div className="cb-mapa"><MapView items={abiertas} onSelect={setEst} scrollWheel={false} /></div>
      </div></section>

      <section className="cb-sec cb-turnos"><div className="wrap">
        <h2>Próximos turnos libres</h2>
        <div className="cb-slots">
          {(prox || []).slice(0, 6).map(p => { const d = new Date(p.inicio); return (
            <button key={p.codigo + p.inicio} type="button" className="cb-slot" onClick={() => t.open(p.codigo, p.mp, p.inicio)}>
              <span className="cb-slot-h">{p.hora}</span>
              <span className="cb-slot-d">{d.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric' })}</span>
              <b>{p.establecimiento}</b>
              <span className="small muted">{p.especialidad} · {p.departamento}</span>
            </button>
          ); })}
        </div>
      </div></section>

      <section className="cb-sec"><div className="wrap cb-tres">
        <div className="cb-panel">
          <h3>¿Está matriculado/a?</h3>
          <p>Escribí el número de matrícula y lo verificamos contra el padrón en el momento.</p>
          <form onSubmit={e => { e.preventDefault(); if (mp.trim()) nav(`/verificar/${mp.trim()}`); }}><input type="text" inputMode="numeric" value={mp} onChange={e => setMp(e.target.value)} placeholder="Ej.: 1342" aria-label="Número de matrícula" /><button className="btn btn-primary">Verificar</button></form>
        </div>
        <Link className="cb-panel cb-lib" to={luna ? `/libreta/${luna.libreta}` : '/libreta'}>
          <h3>La libreta de tu animal</h3>
          {luna ? <div className="cb-lib-in"><div><b>{luna.nombre}</b><span>{luna.raza} · {edad(luna.nacimiento)}</span><span className="cb-ok">✓ {luna.estado.etiqueta}</span>{luna.eventos[0] && <span className="small">Último registro: {luna.eventos[0].titulo}, {fdate(luna.eventos[0].fecha)}</span>}</div><QR text={verifyUrl(`/libreta/${luna.libreta}`)} size={76} /></div> : <p>Vacunas firmadas por su veterinario/a, con QR.</p>}
          <span className="lnk">Ver un ejemplo →</span>
        </Link>
        <div className="cb-panel cb-mat">
          <h3>Soy matriculado/a</h3>
          <p>Cuota, credencial, recetas, trámites y tu consultorio en un solo lugar.</p>
          <Link className="btn btn-primary" to="/ingresar">Ingresar</Link>
          <Link className="lnk" to="/institucional">El Colegio: autoridades y legislación →</Link>
        </div>
      </div></section>

      <UrgenciaModal open={urg} onClose={() => setUrg(false)} />
      <EstModal est={est} onClose={() => setEst(null)} onTurno={c => { setEst(null); t.open(c); }} />
      {t.modal}
    </div>
  );
}
