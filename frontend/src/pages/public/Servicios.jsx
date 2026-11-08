// Servicios que ofrece el Colegio sobre la plataforma: consultorio digital (tipo MyVete) y zoonosis municipal (tipo VetCard).
import { useNavigate } from 'react-router-dom';
import { Kicker, toast } from '../../components/ui.jsx';
import { loginAs } from '../../layouts/DemoBar.jsx';

const CONSULTORIO = [
  ['Agenda y turnos online', 'Turnos por tipo de servicio y profesional; los tutores reservan desde el directorio o la app, con recordatorio.'],
  ['Historia clínica = libreta oficial', 'Cada consulta, vacuna o castración queda firmada con la matrícula y se ve en la libreta del animal.'],
  ['Clientes y pacientes', 'Ficha de cada tutor con sus mascotas, historial, compras y saldo.'],
  ['Ventas y facturación', 'Factura B/C o ticket con CAE simulado, servicios y productos en una misma venta.'],
  ['Caja diaria', 'Totales por medio de pago: efectivo, tarjeta, transferencia, Mercado Pago y cuenta corriente.'],
  ['Inventario y pet shop', 'Stock con mínimos y vencimientos de vacunas y medicamentos; alertas en el tablero.'],
  ['Proveedores y compras', 'Ingreso de mercadería que actualiza stock y costo, con cuenta corriente del proveedor.'],
  ['Cuentas corrientes', 'Ventas a cuenta, cobros parciales y saldos por cliente.'],
  ['Mensajería y recordatorios', 'Chat con los tutores (lo ven en su app) y recordatorios de vacunas y desparasitaciones que vencen.'],
  ['Reportes', 'Facturación por mes, servicios y productos más vendidos, ausentismo de turnos.'],
];
const ZOONOSIS = [
  ['Credencial con identidad del municipio', 'Número y QR para cada animal, con el nombre, sigla y color del municipio; se guarda en Google o Apple Wallet.'],
  ['Antirrábica y castraciones', 'Registro de atenciones de zoonosis; si el animal ya tiene libreta de un veterinario, se suma sin duplicarlo.'],
  ['Campañas sin conexión', 'Carga rápida en operativos barriales desde el celular, aunque no haya señal; se sincroniza después.'],
  ['Mordeduras y observación', 'Denuncias de mordedura con observación antirrábica de 10 días y registro de perros mordedores.'],
  ['Perros potencialmente peligrosos', 'Registro específico, útil para la política de seguridad que se discute en la provincia.'],
  ['Panel de gestión', 'Cobertura antirrábica, castraciones por mes y mordeduras, para planificar y mostrar resultados.'],
];

export default function Servicios() {
  const nav = useNavigate();
  const probar = (email, to) => loginAs(email, nav, to).catch(e => toast(e.message, 'error'));
  return (
    <>
      <section className="hero" style={{ padding: '50px 0 56px' }}><div className="wrap">
        <Kicker style={{ color: '#9fd8c4' }}>Servicios de la plataforma</Kicker>
        <h1 style={{ maxWidth: 900 }}>Un consultorio digital para cada veterinaria y un servicio de zoonosis para cada municipio.</h1>
        <p className="lead">La misma base que usa el Colegio para el padrón: lo que firma un matriculado aparece en la libreta del animal, en el panel del municipio y en la app de la familia.</p>
        <div className="chips"><a className="chip" href="#consultorio">Consultorio digital</a><a className="chip" href="#zoonosis">Zoonosis municipal</a><a className="chip" href="#conexion">Cómo se conectan</a></div>
      </div></section>
      <section className="sec" id="consultorio"><div className="wrap">
        <div className="shead"><div><Kicker>01 · Para veterinarias</Kicker><h2>Consultorio digital</h2>
          <p className="muted">Todo lo que ofrece un software de gestión veterinaria (como MyVete), incluido para los matriculados. La diferencia: la historia clínica es la libreta oficial y los turnos salen del directorio del Colegio.</p></div>
          <button className="btn btn-primary" onClick={() => probar('lucia.ferreyra@demo.colvet', '/vet/consultorio')}>Probar el consultorio →</button></div>
        <div className="grid g3">{CONSULTORIO.map(([t, d], i) => <div key={t} className="card"><span className="mono tiny muted">{String(i + 1).padStart(2, '0')}</span><h3 style={{ margin: '6px 0 4px', fontSize: 18 }}>{t}</h3><p className="small muted" style={{ margin: 0 }}>{d}</p></div>)}</div>
        <div className="note" style={{ marginTop: 14 }}>¿Ya usás otro sistema? Se conecta por API: vacunas, turnos y recetas llegan a la libreta oficial sin cargar dos veces.</div>
      </div></section>
      <section className="libband" id="zoonosis"><div className="wrap">
        <div className="shead"><div><Kicker style={{ color: 'var(--leaf-2)' }}>02 · Para municipios</Kicker><h2>Zoonosis como servicio</h2>
          <p>Lo que hace una plataforma de zoonosis municipal (como VetCard), con un agregado que sólo el Colegio puede dar: cada vacuna aplicada por un matriculado vigente ya está en la base.</p></div>
          <button className="btn btn-light" onClick={() => probar('zoonosis@godoycruz.demo', '/muni')}>Probar como municipio →</button></div>
        <div className="grid g3">{ZOONOSIS.map(([t, d], i) => <div key={t} className="card" style={{ color: 'var(--ink)' }}><span className="mono tiny muted">{String(i + 1).padStart(2, '0')}</span><h3 style={{ margin: '6px 0 4px', fontSize: 18 }}>{t}</h3><p className="small muted" style={{ margin: 0 }}>{d}</p></div>)}</div>
      </div></section>
      <section className="sec" id="conexion"><div className="wrap">
        <Kicker>03 · Cómo se conecta todo</Kicker><h2 style={{ marginTop: 6 }}>Un registro, cuatro lugares</h2>
        <div className="grid g4" style={{ marginTop: 16 }}>
          <div className="card"><span className="mono tiny muted">VETERINARIO/A</span><h3 style={{ margin: '6px 0 4px' }}>Vacuna en el consultorio</h3><p className="small muted" style={{ margin: 0 }}>Registra la antirrábica con lote y sticker LUSCyF; queda firmada con su matrícula.</p></div>
          <div className="card"><span className="mono tiny muted">FAMILIA</span><h3 style={{ margin: '6px 0 4px' }}>La ve en su app</h3><p className="small muted" style={{ margin: 0 }}>Libreta actualizada, próxima dosis con recordatorio y credencial en Wallet.</p></div>
          <div className="card"><span className="mono tiny muted">MUNICIPIO</span><h3 style={{ margin: '6px 0 4px' }}>Suma a su cobertura</h3><p className="small muted" style={{ margin: 0 }}>Si el animal tiene credencial municipal, la vacuna cuenta en el panel de zoonosis.</p></div>
          <div className="card"><span className="mono tiny muted">CUALQUIERA</span><h3 style={{ margin: '6px 0 4px' }}>La verifica con QR</h3><p className="small muted" style={{ margin: 0 }}>Un transporte, una guardería o un control escanea y ve que la firmó un matriculado vigente.</p></div>
        </div>
        <div className="row" style={{ marginTop: 18 }}>
          <button className="btn btn-primary" onClick={() => probar('sofia.rios@demo.colvet', '/tutor')}>Ver la app de la familia →</button>
          <button className="btn" onClick={() => nav('/libreta/MZA-000231')}>Ver una libreta pública</button>
        </div>
      </div></section>
    </>
  );
}
