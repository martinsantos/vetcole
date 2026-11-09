// Ficha completa de un matriculado para la administración del Colegio: reúne en un solo lugar la matrícula,
// los datos personales, la credencial, las cuotas, los trámites, los establecimientos, las recetas,
// los registros firmados en libretas, los turnos y los casos notificados.
import { Link, useParams } from 'react-router-dom';
import { api, useApi } from '../../lib/api.js';
import { Badge, Kpi, Spinner, ErrorBox, Empty, AsyncBtn, toast } from '../../components/ui.jsx';
import { money, fdate, fdt, EVT, telFmt } from '../../lib/format.js';
import { CredencialCard } from '../vet/kit.jsx';
import { FotoVet } from '../public/Profesional.jsx';

const estadoCls = e => ({ Vigente: 'b-ok', Suspendida: 'b-bad', Baja: 'b-grey', Pagada: 'b-ok', Pendiente: 'b-warn', Resuelto: 'b-ok', Dispensada: 'b-ok', Vigente_: 'b-ok' }[e] || 'b-warn');
const Seccion = ({ titulo, extra, children }) => (
  <section className="card fm-sec"><div className="fm-sec-h"><h3>{titulo}</h3>{extra}</div>{children}</section>
);
const Dato = ({ l, children }) => <div className="fm-dato"><span>{l}</span><b>{children || '—'}</b></div>;

export default function FichaMatriculado() {
  const { mp } = useParams();
  const q = useApi(`/admin/vets/${mp}/ficha`);
  if (q.error) return <ErrorBox error={q.error} onRetry={q.reload} />;
  if (!q.data) return <Spinner />;
  const d = q.data, v = d.vet;
  const cambiarEstado = async est => { await api.patch(`/admin/vets/${v.id}`, { estado: est }); toast(est === 'Suspendida' ? `MP ${v.mp} suspendida: sale del directorio y la credencial muestra «no habilitado».` : `MP ${v.mp} rehabilitada.`); q.reload(); };
  return (
    <>
      <Link className="small" to="/admin/matriculados">← Volver al padrón</Link>
      <header className="fm-head">
        <FotoVet vet={{ ...v, nombre: `${v.nombre} ${v.apellido}` }} size={96} />
        <div style={{ flex: 1, minWidth: 240 }}>
          <div className="tiny muted">Matrícula provincial {v.mp}</div>
          <h2 className="fm-nombre">{v.titulo}</h2>
          <div className="row" style={{ gap: 8 }}>
            <Badge cls={estadoCls(v.estado)}>{v.estado}</Badge>
            <Badge cls={d.deuda.cuotas ? 'b-warn' : 'b-ok'}>{d.deuda.cuotas ? `Adeuda ${d.deuda.cuotas} cuota${d.deuda.cuotas > 1 ? 's' : ''} · ${money(d.deuda.monto)}` : 'Cuotas al día'}</Badge>
            {v.fichaPublica ? <Badge cls="b-grey">Ficha pública activa</Badge> : <Badge cls="b-grey">Sin ficha pública</Badge>}
          </div>
        </div>
        <div className="row" style={{ gap: 8 }}>
          <Link className="btn" to={`/profesional/${v.mp}`}>Perfil público</Link>
          <Link className="btn" to={`/verificar/${v.mp}`}>Verificación</Link>
          {v.estado === 'Vigente' ? <AsyncBtn className="btn" onClick={() => cambiarEstado('Suspendida')}>Suspender</AsyncBtn>
            : v.estado === 'Suspendida' ? <AsyncBtn className="btn btn-primary" onClick={() => cambiarEstado('Vigente')}>Rehabilitar</AsyncBtn> : null}
        </div>
      </header>

      <div className="grid g4" style={{ marginBottom: 16 }}>
        <Kpi label="Establecimientos" value={d.establecimientos.length} sub={d.establecimientos.some(e => e.rol.startsWith('Director')) ? 'incluye uno como DT' : 'donde atiende'} />
        <Kpi label="Registros firmados" value={d.registros.total} sub="en libretas sanitarias" />
        <Kpi label="Recetas emitidas" value={d.recetas.total} sub={`${d.pacientesCabecera} pacientes de cabecera`} />
        <Kpi label="Turnos" value={d.turnos.ultimos30} sub={`últimos 30 días · ${d.turnos.proximos} próximos`} />
      </div>

      <div className="fm-grid">
        <div className="fm-col">
          <Seccion titulo="Datos personales y matrícula">
            <div className="fm-datos">
              <Dato l="Apellido y nombre">{v.apellido}, {v.nombre}</Dato>
              <Dato l="DNI">{v.dni}</Dato>
              <Dato l="Matrícula">MP {v.mp} · desde {v.alta}</Dato>
              <Dato l="Departamento">{v.departamento}</Dato>
              <Dato l="Correo">{v.email}</Dato>
              <Dato l="Teléfono">{v.telefono && telFmt(v.telefono)}</Dato>
              <Dato l="Especialidades">{v.especialidades.join(', ')}</Dato>
              <Dato l="Especies">{v.especies.join(', ')}</Dato>
              <Dato l="Prescriptor de cannabis">{{ si: 'Inscripto/a', tramite: 'En trámite', no: 'No' }[v.prescriptorCannabis]}</Dato>
              <Dato l="Usuario del portal">{v.usuario ? v.usuario.email : 'Sin usuario'}</Dato>
              <Dato l="Atiende a domicilio">{v.domicilio ? 'Sí' : 'No'}</Dato>
              <Dato l="Turnos online">{v.turnosOnline ? 'Sí' : 'No'}</Dato>
            </div>
          </Seccion>

          <Seccion titulo="Cuotas" extra={<Link className="small" to="/admin/cobranzas">Cobranzas →</Link>}>
            {d.cuotas.length ? <div className="tblwrap"><table className="tbl"><thead><tr><th>Período</th><th>Monto</th><th>Vence</th><th>Estado</th><th>Pago</th></tr></thead><tbody>
              {d.cuotas.map(c => <tr key={c.id}><td>{c.periodo}</td><td>{money(c.monto)}</td><td className="small">{fdate(c.vence)}</td><td><Badge cls={estadoCls(c.estado)}>{c.estado}</Badge></td><td className="small muted">{c.pagadaEn ? `${fdate(c.pagadaEn)} · ${c.medio || ''}` : '—'}</td></tr>)}
            </tbody></table></div> : <Empty>Sin cuotas registradas.</Empty>}
          </Seccion>

          <Seccion titulo="Trámites">
            {d.tramites.length ? d.tramites.map(t => (
              <div key={t.id} className="fm-fila"><div><b>{t.tipo}</b><div className="tiny muted">{t.numero} · iniciado el {fdate(t.createdAt)}</div></div><Badge cls={estadoCls(t.estado)}>{t.estado}</Badge></div>
            )) : <Empty>Sin trámites.</Empty>}
          </Seccion>

          <Seccion titulo="Registros firmados en libretas" extra={<span className="small muted">{d.registros.total} en total</span>}>
            <div className="row" style={{ gap: 6, marginBottom: 10 }}>{Object.entries(d.registros.porTipo).map(([k, n]) => <span key={k} className="fm-tipo" style={{ background: (EVT[k]?.[2] || '#666') + '18', color: EVT[k]?.[2] }}>{EVT[k]?.[1] || k}: <b>{n}</b></span>)}</div>
            {d.registros.ultimos.map(e => (
              <div key={e.id} className="fm-fila"><div><b>{e.titulo}</b><div className="tiny muted">{e.animal?.nombre} · <Link to={`/libreta/${e.animal?.libreta}`}>{e.animal?.libreta}</Link></div></div><span className="small muted">{fdate(e.fecha)}</span></div>
            ))}
          </Seccion>
        </div>

        <div className="fm-col">
          <Seccion titulo="Credencial digital">
            <CredencialCard vet={v} alDia={!d.deuda.cuotas} />
          </Seccion>

          <Seccion titulo="Establecimientos">
            {d.establecimientos.length ? d.establecimientos.map(e => (
              <div key={e.codigo} className="fm-fila"><div><Link to={`/verificar/e/${e.codigo}`}><b>{e.nombre}</b></Link><div className="tiny muted">{e.tipo} · {e.direccion}, {e.departamento}</div></div><Badge cls="b-grey">{e.rol}</Badge></div>
            )) : <Empty>No figura en ningún establecimiento.</Empty>}
          </Seccion>

          <Seccion titulo="Recetas" extra={<span className="small muted">{d.recetas.total} emitidas</span>}>
            {d.recetas.ultimas.length ? d.recetas.ultimas.map(r => (
              <div key={r.id} className="fm-fila"><div><Link to={`/receta/${r.codigo}`}><b>{r.codigo}</b></Link><div className="tiny muted">{r.tipo} · {r.animal?.nombre}</div></div><span className="small"><Badge cls={estadoCls(r.estado)}>{r.estado}</Badge> {fdate(r.fecha)}</span></div>
            )) : <Empty>Sin recetas.</Empty>}
          </Seccion>

          <Seccion titulo="Casos notificados">
            {d.casos.length ? d.casos.map(c => (
              <div key={c.id} className="fm-fila"><div><b>{c.evento}</b><div className="tiny muted">{c.departamento} · {c.especie} · semana {c.semana}</div></div><span className="small">{c.casos} caso{c.casos > 1 ? 's' : ''}</span></div>
            )) : <Empty>No notificó casos.</Empty>}
          </Seccion>
          <p className="tiny muted">Consultado el {fdt(new Date())}. Cada cambio en el padrón impacta en el directorio, la credencial y la verificación pública.</p>
        </div>
      </div>
    </>
  );
}
