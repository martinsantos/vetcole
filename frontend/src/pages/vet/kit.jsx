// Piezas compartidas del portal: QR crudo, credencial profesional, credencial/oblea/cartel del establecimiento, receta.
import { BRAND } from '../../lib/brand.js';
import { useEffect, useRef } from 'react';
import { CLAUDE } from '../../lib/base.js';
import { toast } from '../../components/ui.jsx';
import qrcode from 'qrcode-generator';
import { LOGO, verifyUrl } from '../../components/ui.jsx';
import { fdate } from '../../lib/format.js';
import './vet.css';

// QR sin marco, ocupa el 100% del contenedor (para .cred .qr, .ob-qr, .pt-qr, .rx).
export function QRSvg({ text }) {
  const ref = useRef(null);
  useEffect(() => {
    if (!ref.current) return;
    const q = qrcode(0, 'M'); q.addData(text); q.make();
    ref.current.innerHTML = q.createSvgTag({ cellSize: 2, margin: 0, scalable: true });
    const svg = ref.current.querySelector('svg');
    if (svg) Object.assign(svg.style, { width: '100%', height: '100%', display: 'block' });
  }, [text]);
  return <div ref={ref} style={{ width: '100%', height: '100%' }} />;
}

export function CredencialCard({ vet, alDia = true }) {
  const esp = vet.especialidades?.[0] || 'Clínica general';
  return (
    <div className="cred">
      <div className="lg"><img src={LOGO} alt="" /></div>
      <div className="nm">{vet.titulo || `${vet.femenino ? 'Dra.' : 'Dr.'} ${vet.nombre} ${vet.apellido}`}</div>
      <div style={{ fontSize: 12, opacity: 0.85, maxWidth: '62%' }}>{vet.femenino ? 'Médica Veterinaria' : 'Médico Veterinario'} · {esp}</div>
      <div style={{ fontSize: 12, marginTop: 8, opacity: 0.9, fontFamily: 'var(--mono)' }}>MP <b style={{ fontSize: 16 }}>{vet.mp}</b>{vet.dni && <> &nbsp; DNI ••• {String(vet.dni).slice(-3)}</>}</div>
      <div className="st">
        <span className="badge b-ok" style={{ background: vet.estado === 'Vigente' ? '#d6f5e6' : '#fbe6e3', color: vet.estado === 'Vigente' ? undefined : 'var(--bad)' }}>● {vet.estado === 'Vigente' ? `Vigente${alDia ? ' · cuota al día' : ''}` : vet.estado}</span>
        <div style={{ fontSize: 10, opacity: 0.7, marginTop: 4 }}>Ley 7825 · válida al {new Date().toLocaleDateString('es-AR')}</div>
      </div>
      <div className="qr"><QRSvg text={verifyUrl(`/verificar/${vet.mp}`)} /></div>
    </div>
  );
}

const dtName = e => e.dt?.titulo || '—';

export function EstCredencial({ e }) {
  return (
    <div className="cred estcred">
      <div className="lg"><img src={LOGO} alt="" /></div>
      <div className="ectag">✓ ESTABLECIMIENTO HABILITADO</div>
      <div className="nm">{e.nombre}</div>
      <div style={{ fontSize: 12, opacity: 0.85 }}>{e.tipo} · {e.departamento}</div>
      <div className="ecrow"><span>HAB.</span><b>{e.habilitacion || '—'}</b><span>DT</span><b>MP {e.dt?.mp || '—'}</b></div>
      <div className="st"><span className="badge b-ok" style={{ background: '#d6f5e6' }}>● Vigente hasta {fdate(e.venceHab)}</span></div>
      <div className="qr"><QRSvg text={verifyUrl(`/verificar/e/${e.codigo}`)} /></div>
    </div>
  );
}

export function Oblea({ e }) {
  return (
    <div className="oblea">
      <div className="ob-t">HABILITADO</div>
      <div className="ob-qr"><QRSvg text={verifyUrl(`/verificar/e/${e.codigo}`)} /></div>
      <div className="ob-b">{e.habilitacion || '—'}</div>
      <div className="ob-y">COLVET MZA · {e.venceHab ? new Date(e.venceHab).getFullYear() : ''}</div>
    </div>
  );
}

export function Poster({ e, id }) {
  const n = (e.equipo || []).length;
  return (
    <div className="poster" id={id}>
      <div className="pt-top"><img src={LOGO} alt="" /><span>Ley provincial N° 7825</span></div>
      <div className="pt-badge">✓ ESTABLECIMIENTO HABILITADO</div>
      <div className="pt-name">{e.nombre}</div>
      <div className="pt-sub">{e.tipo} · {e.direccion}, {e.departamento}</div>
      <div className="pt-qr"><QRSvg text={verifyUrl(`/verificar/e/${e.codigo}`)} /></div>
      <div className="pt-cta">Escaneá para verificar la habilitación, el director técnico y {n ? `los ${n} profesionales matriculados` : 'los profesionales'} que atienden acá{e.turnosOnline ? ', o para pedir turno online' : ''}.</div>
      <div className="pt-row">
        <div><span>Habilitación</span><b>{e.habilitacion || '—'}</b></div>
        <div><span>Director/a técnico/a</span><b>{dtName(e)}{e.dt && <><br />MP {e.dt.mp}</>}</b></div>
        <div><span>Vigente hasta</span><b>{fdate(e.venceHab)}</b></div>
      </div>
      <div className="pt-foot">¿Ves un establecimiento sin este cartel? Denuncialo {BRAND.demo ? 'ante el Colegio' : 'en colvetmza.com.ar'} · {BRAND.nombre}</div>
    </div>
  );
}

// Imprime sólo el elemento indicado (A4). Ver vet.css → body.print-only.
export function printOnly(elId) {
  if (CLAUDE) return toast('Dentro de Claude no se puede imprimir. El cartel se imprime desde la versión publicada en el servidor.', 'error');
  const el = document.getElementById(elId);
  if (!el) return;
  el.classList.add('print-target');
  document.body.classList.add('print-only');
  const done = () => { el.classList.remove('print-target'); document.body.classList.remove('print-only'); window.removeEventListener('afterprint', done); };
  window.addEventListener('afterprint', done);
  try { window.print(); } catch { /* sandbox sin diálogo */ }
  setTimeout(done, 1500);
}

// Kit completo: credencial + oblea + cartel (se usa en el portal y en la administración).
export function EstKit({ e, idPrefix = 'kit' }) {
  const pid = `${idPrefix}-poster-${e.codigo}`;
  return (
    <div className="estgrid">
      <div>
        <div className="tiny muted mono" style={{ marginBottom: 8 }}>Credencial del establecimiento</div>
        <EstCredencial e={e} />
        <div className="tiny muted mono" style={{ margin: '22px 0 8px' }}>Oblea para la puerta (10 × 10 cm)</div>
        <div className="row" style={{ alignItems: 'center', gap: 16 }}><Oblea e={e} /><div className="small muted" style={{ flex: 1, minWidth: 180 }}>Sticker resistente al sol para la puerta o la vidriera. Se entrega impreso al habilitar y se renueva con cada vencimiento.</div></div>
      </div>
      <div>
        <div className="row between" style={{ marginBottom: 8 }}><span className="tiny muted mono">Cartel para vidriera (A4)</span><button className="btn btn-sm btn-primary" onClick={() => printOnly(pid)}>Imprimir cartel A4</button></div>
        <Poster e={e} id={pid} />
        <p className="tiny muted" style={{ marginTop: 10 }}>El QR siempre muestra los datos vigentes: si la habilitación vence o se suspende, el QR lo muestra al instante.</p>
      </div>
    </div>
  );
}

export function RecetaDoc({ rx, id }) {
  const items = rx.items || [];
  const p = rx.prescriptor || {};
  return (
    <div className="rx" id={id}>
      <div className="rx-h"><div><div className="mono tiny" style={{ opacity: 0.8 }}>Receta veterinaria electrónica</div><b className="mono">{rx.codigo}</b></div><img src={LOGO} alt="" /></div>
      <div className="rx-b">
        <div className="facts" style={{ padding: 0 }}>
          <div><span>Prescriptor/a</span><b>{p.titulo || '—'}</b><div className="tiny" style={{ color: 'var(--ok)' }}>✓ MP {p.mp} {p.vigente === false ? 'NO vigente' : 'vigente'}</div></div>
          <div><span>Paciente</span><b>{rx.paciente ? `${rx.paciente.nombre} · ${rx.paciente.especie}` : '—'}</b><div className="tiny muted">{rx.paciente ? `Libreta ${rx.paciente.libreta}` : ''}</div></div>
          <div><span>Fecha</span><b>{fdate(rx.fecha)}</b></div>
          <div><span>Válida hasta</span><b>{fdate(rx.vence)}</b></div>
        </div>
        <div className="rx-tipo">{rx.tipo}</div>
        {items.map((i, k) => <div className="rx-it" key={k}><b>℞ {i.medicamento}</b>{i.posologia && <div className="small">{i.posologia}</div>}{i.cantidad && <div className="tiny muted">Cantidad: {i.cantidad}</div>}</div>)}
        <div className="row between" style={{ marginTop: 14, alignItems: 'flex-end' }}>
          <div className="tiny muted" style={{ maxWidth: 300 }}>Verificable en {window.location.host}/receta/{rx.codigo}. Se puede dispensar una sola vez; la farmacia registra la dispensa escaneando el QR.{rx.estado === 'Dispensada' && <><br /><b style={{ color: 'var(--warn)' }}>Dispensada {fdate(rx.dispensadaEn)} · {rx.farmacia}</b></>}</div>
          <div className="qrbox" style={{ width: 104, height: 104 }}><QRSvg text={verifyUrl(`/receta/${rx.codigo}`)} /></div>
        </div>
      </div>
    </div>
  );
}
