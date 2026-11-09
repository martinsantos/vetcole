// Perfil público de un profesional (como el perfil público de Psicole): foto si la cargó, matrícula verificada,
// credencial digital, dónde atiende con mapa, turnos y contacto.
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useApi } from '../../lib/api.js';
import { Badge, Spinner, ErrorBox } from '../../components/ui.jsx';
import { ini, statusCls, telFmt, fdt } from '../../lib/format.js';
import { CredencialCard } from '../vet/kit.jsx';
import { useCached, useTurno, horario, FichaMapa, mapsUrl } from './shared.jsx';

// Foto de perfil o, si no cargó una, sus iniciales.
export function FotoVet({ vet, size = 48, className = '' }) {
  const s = { width: size, height: size, fontSize: Math.round(size * 0.36) };
  return vet.foto
    ? <img className={`foto-vet ${className}`} src={vet.foto} alt={`Foto de ${vet.titulo || vet.nombre}`} style={s} />
    : <span className={`foto-vet foto-ini ${className}`} style={s} aria-hidden="true">{ini(vet.nombre || vet.titulo)}</span>;
}

export default function Profesional() {
  const { mp } = useParams();
  const nav = useNavigate();
  const { data: v, error, reload } = useApi(`/public/vets/${mp}`);
  const ests = useCached('/public/establecimientos');
  const t = useTurno();
  if (error) return <section className="sec"><div className="wrap"><ErrorBox error={error} onRetry={reload} /></div></section>;
  if (!v) return <section className="sec"><div className="wrap"><Spinner /></div></section>;
  const vigente = v.estado === 'Vigente';
  const lugares = (v.establecimientos || []).map(x => (ests || []).find(e => e.codigo === x.codigo) || x);
  const conTurnos = lugares.find(e => e.turnosOnline);
  const profesion = v.femenino ? 'Médica veterinaria' : 'Médico veterinario';
  return (
    <>
      <section className="perfil-head"><div className="wrap perfil-head-in">
        <button type="button" className="lnk perfil-volver" onClick={() => (window.history.length > 1 ? nav(-1) : nav('/directorio'))}>← Volver</button>
        <FotoVet vet={v} size={132} className="perfil-foto" />
        <div className="perfil-id">
          <h1>{v.titulo}</h1>
          <p className="perfil-sub">{profesion} · Matrícula {v.mp} · {v.departamento}</p>
          <div className="row" style={{ gap: 8, marginTop: 10 }}>
            <Badge cls={vigente ? 'b-ok' : 'b-bad'}>{vigente ? '✓ Matrícula vigente · verificada hoy' : `Matrícula ${v.estado.toLowerCase()}`}</Badge>
            {v.turnosOnline && <Badge>Turnos online</Badge>}
            {v.domicilio && <Badge cls="b-grey">Atiende a domicilio o a campo</Badge>}
          </div>
          <div className="row perfil-acciones">
            {vigente && v.turnosOnline && conTurnos && <button className="btn btn-primary btn-lg" onClick={() => t.open(conTurnos.codigo, v.mp)}>Pedir turno</button>}
            {v.telefono && <a className="btn btn-lg" target="_blank" rel="noreferrer" href={`https://wa.me/549${v.telefono}?text=${encodeURIComponent('Hola, te contacto desde el directorio del Colegio de Veterinarios.')}`}>WhatsApp</a>}
            {v.telefono && <a className="btn btn-lg" href={`tel:${v.telefono}`}>Llamar · {telFmt(v.telefono)}</a>}
          </div>
        </div>
      </div></section>

      <section className="sec"><div className="wrap perfil-grid">
        <div className="perfil-main">
          {v.bio && <div className="perfil-bloque"><h2>Presentación</h2><p className="perfil-bio">{v.bio}</p></div>}
          <div className="perfil-bloque">
            <h2>Especialidades</h2>
            <div className="perfil-chips">{v.especialidades.map(x => <span key={x} className="pchip">{x}</span>)}</div>
            <h3 className="perfil-h3">Especies que atiende</h3>
            <div className="perfil-chips">{v.especies.map(x => <span key={x} className="pchip pchip-s">{x}</span>)}</div>
          </div>
          <div className="perfil-bloque">
            <h2>Dónde atiende</h2>
            {lugares.length ? <>
              <div className="perfil-lugares">{lugares.map(e => (
                <div key={e.codigo} className="perfil-lugar">
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <Link to={`/verificar/e/${e.codigo}`}><b>{e.nombre}</b></Link>
                    <div className="small muted">{e.tipo ? `${e.tipo} · ` : ''}{e.direccion}, {e.departamento}</div>
                    {e.status && <div className="small" style={{ marginTop: 4 }}><Badge cls={statusCls(e.status)}>{e.status.label}</Badge> <span className="muted">{horario(e)}</span></div>}
                  </div>
                  <div className="perfil-lugar-acc">
                    {e.turnosOnline && vigente && v.turnosOnline && <button className="btn btn-sm btn-primary" onClick={() => t.open(e.codigo, v.mp)}>Turno aquí</button>}
                    {e.lat != null && <a className="btn btn-sm" target="_blank" rel="noreferrer" href={mapsUrl(e)}>Cómo llegar</a>}
                  </div>
                </div>
              ))}</div>
              <FichaMapa lugares={lugares} alto={300} />
            </> : <p className="muted">Atiende {v.domicilio ? 'a domicilio o a campo' : 'en forma particular'} en {v.departamento} y alrededores.</p>}
          </div>
        </div>

        <aside className="perfil-side">
          <div className="perfil-cred">
            <h2>Credencial digital</h2>
            <CredencialCard vet={v} alDia={false} />
            <p className="small muted" style={{ margin: '12px 0 0' }}>Es la credencial que el profesional muestra desde su celular. El QR abre la verificación de la matrícula en el padrón del Colegio, con el estado del día.</p>
          </div>
          <div className="perfil-verif">
            <b>{vigente ? '✓ Matrícula verificada' : 'Matrícula no vigente'}</b>
            <span className="small muted">Consultado en el padrón el {fdt(v.verificadoEn || new Date())}</span>
            <Link className="lnk" to={`/verificar/${v.mp}`}>Ver la verificación completa →</Link>
          </div>
        </aside>
      </div></section>
      <section className="sec" style={{ paddingTop: 0 }}><div className="wrap"><p className="tiny muted">La presentación, la foto y los lugares de atención los carga el profesional desde su portal. Los datos de matrícula los certifica el Colegio.</p></div></section>
      {t.modal}
    </>
  );
}
