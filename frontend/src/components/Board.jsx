// Tablero de guardia (público, home y administración). Datos en vivo de /public/guardias, reloj cada segundo.
import { useEffect, useState } from 'react';
import { url } from '../lib/base.js';
import { Link, useNavigate } from 'react-router-dom';
import { useApi } from '../lib/api.js';
import { telFmt, ZONAS } from '../lib/format.js';
import { Seg, Spinner } from './ui.jsx';

export default function Board({ limit, full, onFicha }) {
  const { data, loading } = useApi('/public/guardias');
  const [zona, setZona] = useState('');
  const [now, setNow] = useState(new Date());
  const [fs, setFs] = useState(false);
  const nav = useNavigate();
  useEffect(() => { const t = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(t); }, []);
  useEffect(() => { const k = e => e.key === 'Escape' && setFs(false); document.addEventListener('keydown', k); return () => document.removeEventListener('keydown', k); }, []);
  if (loading || !data) return <Spinner />;
  const rows = data.items.filter(e => !zona || e.zona === zona);
  const shown = limit ? rows.slice(0, limit) : rows;
  const gaps = data.sinCobertura.filter(z => !zona || z === zona);
  return (
    <div className={`board ${fs ? 'board-full' : ''}`}>
      <div className="bhead">
        <div><div className="lbl">Tablero de guardia veterinaria</div><h2>Provincia de Mendoza</h2></div>
        {full && <Seg dark value={zona} onChange={setZona} options={[['', 'Todas las zonas'], ...ZONAS.map(z => [z, z])]} />}
        <div style={{ textAlign: 'right' }}><div className="bclock">{now.toLocaleTimeString('es-AR', { hour12: false })}</div><div className="lbl" style={{ color: 'var(--b-mute, #8f8189)' }}>{now.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })}</div></div>
      </div>
      <div className="bsum">
        <span>En guardia activa <b style={{ color: 'var(--b-ok, #4ade80)' }}>{data.activas}</b></span><span>Pasiva <b style={{ color: 'var(--b-warn, #fbbf24)' }}>{data.pasivas}</b></span>
        <span>Zonas sin cobertura <b style={{ color: data.sinCobertura.length ? 'var(--b-bad, #f87171)' : 'var(--b-ok, #4ade80)' }}>{data.sinCobertura.length}</b></span>
        <span className="bsr">En vivo · lo declara cada clínica desde su portal</span>
      </div>
      <div className="bcols"><span>Estado</span><span>Establecimiento</span><span>Zona</span><span>Modalidad</span><span>Horario</span><span>Teléfono</span><span /></div>
      {gaps.map(z => (
        <div key={z} className="brow gap"><span className="bst"><span className="led" />Sin cobertura</span>
          <span className="bgap"><b>{z}</b>: ninguna clínica declaró guardia hoy. <a href={url('/directorio?domicilio=1')} onClick={e => { e.preventDefault(); nav('/directorio?domicilio=1'); }}>Ver profesionales que atienden a domicilio →</a></span></div>
      ))}
      {shown.map(e => { const c = e.status.code === 'activa' ? 'on' : e.status.code === 'pasiva' ? 'pas' : 'off'; return (
        <div key={e.codigo} className={`brow ${c}`}>
          <span className="bst"><span className="led" />{c === 'on' ? 'En guardia' : c === 'pas' ? 'Pasiva' : 'Cerrada'}</span>
          <span className="bn"><b>{e.nombre}</b><small>{e.direccion}</small></span>
          <span className="bz">{e.zona}<small>{e.departamento}</small></span>
          <span className="bm">{e.guardia === 'activa' ? 'Profesional en el lugar' : 'A llamado'}<small>{e.guardia === 'activa' ? 'Podés ir directo' : 'Llamá antes de ir'}</small></span>
          <span className="bh">{e.guardiaDias ? 'Vie. y sáb.' : e.guardiaNota?.includes('0 h') ? 'Hasta 0 h' : '24 h'}</span>
          <span className="bt">{telFmt(e.telefono)}</span>
          <span className="ba"><a className="bbtn call" href={`tel:${e.telefono}`}>Llamar</a><button className="bbtn" onClick={() => (onFicha ? onFicha(e) : nav(`/verificar/e/${e.codigo}`))}>Ficha</button></span>
        </div>
      ); })}
      <div className="bfoot">
        <span>{limit && rows.length > limit ? `+ ${rows.length - limit} establecimientos más con guardia declarada` : `${rows.length} establecimientos con guardia declarada`}</span>
        {limit ? <Link to="/guardias">Ver tablero completo →</Link> : <button className="bbtn" onClick={() => setFs(f => !f)}>{fs ? 'Salir de pantalla completa' : '⛶ Modo pantalla'}</button>}
      </div>
    </div>
  );
}
