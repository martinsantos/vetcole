// Verificación pública: matrícula (QR de la credencial) y establecimiento (QR de la oblea/cartel).
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useApi } from '../../lib/api.js';
import { Badge, Kicker, QR, Spinner, verifyUrl } from '../../components/ui.jsx';
import { fdate, statusCls } from '../../lib/format.js';
import { useTurno, horario, FichaMapa } from './shared.jsx';

export function VerificarVet() {
  const { mp } = useParams(), nav = useNavigate();
  const [q, setQ] = useState(mp || '');
  const { data: v, loading, error } = useApi(mp ? `/public/vets/${encodeURIComponent(mp)}` : null);
  const vig = v?.estado === 'Vigente';
  return (
    <section className="sec" style={{ paddingTop: 30 }}><div className="wrap" style={{ maxWidth: 840 }}>
      <Kicker>Verificación pública</Kicker>
      <h1 style={{ fontSize: 36, marginTop: 6 }}>¿Tu veterinario/a está matriculado/a?</h1>
      <p className="muted">Consulta en vivo contra el padrón del Colegio. Es lo mismo que se ve al escanear el QR de una credencial digital.</p>
      <form className="row" style={{ margin: '18px 0' }} onSubmit={e => { e.preventDefault(); if (q.trim()) nav(`/verificar/${q.trim()}`); }}>
        <input type="search" value={q} onChange={e => setQ(e.target.value)} placeholder="N° de matrícula (probá 1342, 1204, 552 o 9999)" style={{ flex: 1, minWidth: 220 }} />
        <button className="btn btn-primary">Verificar</button>
      </form>
      {mp && loading && <Spinner />}
      {mp && error && (
        <div className="card" style={{ borderColor: 'var(--bad)' }}><h3 style={{ color: 'var(--bad)' }}>No encontramos la matrícula {mp}</h3>
          <p className="muted">Si alguien se presenta como veterinario/a con ese número, podés <Link to="/tramites?denuncia=1">hacer una denuncia</Link>.</p></div>
      )}
      {v && (
        <div className="card" style={{ border: `2px solid ${vig ? 'var(--ok)' : 'var(--bad)'}` }}>
          <div className="row" style={{ gap: 16, alignItems: 'flex-start' }}>
            <div className="av lg" style={vig ? { background: 'var(--ok-l)', color: 'var(--ok)' } : { background: 'var(--bad-l)', color: 'var(--bad)' }}>{vig ? '✓' : '!'}</div>
            <div style={{ flex: 1, minWidth: 220 }}>
              <Kicker style={{ color: vig ? 'var(--ok)' : 'var(--bad)' }}>{vig ? 'Matrícula vigente' : `Matrícula ${v.estado.toLowerCase()}`}</Kicker>
              <h2 style={{ margin: '4px 0' }}>{v.titulo}</h2>
              <div className="muted">Médico/a veterinario/a · MP {v.mp} · {v.especialidades.join(', ')}</div>
              <div className="small muted" style={{ marginTop: 8 }}>Consultado el {new Date(v.verificadoEn).toLocaleString('es-AR')} contra el padrón del Colegio.</div>
              {!vig && <p className="small" style={{ marginTop: 10, color: 'var(--bad)' }}>Este profesional no está habilitado para ejercer en Mendoza en este momento.</p>}
              {vig && !!v.establecimientos.length && <div className="small" style={{ marginTop: 10 }}>Atiende en: {v.establecimientos.map((e, i) => <span key={e.codigo}>{i ? ' · ' : ''}<Link to={`/verificar/e/${e.codigo}`}>{e.nombre}</Link></span>)}</div>}
            </div>
            {vig && <QR text={verifyUrl(`/verificar/${v.mp}`)} size={96} />}
          </div>
        </div>
      )}
      <div className="grid g3" style={{ marginTop: 20 }}>
        <div className="card flat"><b>Desde la credencial</b><p className="small muted" style={{ margin: '4px 0 0' }}>El QR de la credencial digital abre esta verificación con el estado del día.</p></div>
        <div className="card flat"><b>Desde el establecimiento</b><p className="small muted" style={{ margin: '4px 0 0' }}>La oblea o el cartel de la vidriera muestran habilitación, DT y equipo.</p></div>
        <div className="card flat"><b>Desde una vacuna</b><p className="small muted" style={{ margin: '4px 0 0' }}>Cada registro de la libreta digital muestra quién lo firmó.</p></div>
      </div>
    </div></section>
  );
}

export function VerificarEst() {
  const { codigo } = useParams();
  const { data: e, loading, error } = useApi(`/public/establecimientos/${encodeURIComponent(codigo)}`);
  const t = useTurno();
  if (loading) return <Spinner />;
  if (error) return (
    <section className="sec"><div className="wrap" style={{ maxWidth: 820 }}><div className="card" style={{ borderColor: 'var(--bad)' }}>
      <h2 style={{ color: 'var(--bad)' }}>Establecimiento no encontrado</h2><p className="muted">Si el lugar muestra un cartel con este código, puede ser falso. <Link to="/tramites?denuncia=1">Hacé una denuncia</Link>.</p></div></div></section>
  );
  const hab = !!e.dt;
  return (
    <section className="sec" style={{ paddingTop: 30 }}><div className="wrap" style={{ maxWidth: 880 }}>
      <Kicker>Verificación pública · establecimiento</Kicker>
      {hab ? (
        <div className="card" style={{ border: '2px solid var(--ok)', marginTop: 12 }}>
          <div className="row" style={{ gap: 16, alignItems: 'flex-start' }}>
            <div className="av lg" style={{ background: 'var(--ok-l)', color: 'var(--ok)' }}>✓</div>
            <div style={{ flex: 1, minWidth: 240 }}>
              <Kicker style={{ color: 'var(--ok)' }}>Establecimiento habilitado</Kicker>
              <h2 style={{ margin: '4px 0' }}>{e.nombre}</h2><div className="muted">{e.tipo} · {e.direccion}, {e.departamento}</div>
              <div className="grid g3" style={{ gap: 10, marginTop: 14 }}>
                <div><div className="tiny muted">Habilitación</div><b>{e.habilitacion}</b></div>
                <div><div className="tiny muted">Vigente hasta</div><b>{fdate(e.venceHab)}</b></div>
                <div><div className="tiny muted">Director/a técnico/a</div><b>{e.dt.titulo} · <Link to={`/verificar/${e.dt.mp}`}>MP {e.dt.mp}</Link></b></div>
              </div>
              <div className="small muted" style={{ marginTop: 10 }}>Consultado el {new Date(e.verificadoEn).toLocaleString('es-AR')} contra el registro del Colegio.</div>
            </div>
            <QR text={verifyUrl(`/verificar/e/${e.codigo}`)} size={96} />
          </div>
        </div>
      ) : (
        <div className="card" style={{ marginTop: 12 }}><h2>{e.nombre}</h2><div className="muted">{e.tipo} · {e.direccion}, {e.departamento}</div>
          <p className="muted" style={{ marginTop: 10 }}>Establecimiento informado en el listado de guardias del Colegio. En producción, acá se ve su habilitación, su director técnico y su equipo.</p></div>
      )}
      <div className="card flat" style={{ marginTop: 16 }}><div className="row between"><div><div className="tiny muted">Horario</div><b className="small">{horario(e)}</b></div><Badge cls={statusCls(e.status)}><span className="dot" />{e.status.label}</Badge></div></div>
      <div style={{ marginTop: 16 }}><FichaMapa lugares={[e]} alto={280} /></div>
      {!!e.equipo.length && <>
        <h3 style={{ marginTop: 22 }}>Profesionales que atienden acá</h3>
        <div className="grid g2">{e.equipo.map(v => <Link key={v.mp} to={`/verificar/${v.mp}`} className="card vcard"><div className="av">✓</div><div><b>{v.titulo}</b><div className="tiny muted">MP {v.mp} · {v.especialidad}</div>{v.turnosOnline && <Badge>Turnos online</Badge>}</div></Link>)}</div>
      </>}
      <div className="row" style={{ marginTop: 18 }}>
        {e.turnosOnline && <button className="btn btn-primary" onClick={() => t.open(e.codigo)}>Pedir turno</button>}
        <a className={`btn ${e.guardia ? 'btn-danger' : ''}`} href={`tel:${e.telefono}`}>Llamar</a>
        <a className="btn" target="_blank" rel="noreferrer" href={`https://www.google.com/maps/dir/?api=1&destination=${e.lat},${e.lng}`}>Cómo llegar</a>
        <Link className="btn" to="/tramites?denuncia=1">Algo no coincide: denunciar</Link>
      </div>
      {t.modal}
    </div></section>
  );
}
