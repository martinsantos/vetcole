// Credencial sanitaria del animal con la identidad del municipio (o libreta ColVet si no tiene municipio).
// La usan el panel municipal y la app del tutor/a.
import { QR, verifyUrl, toast, LOGO } from '../../components/ui.jsx';
import { fdate, chipFmt } from '../../lib/format.js';

export default function CredCard({ animal, municipio, nro, estado, compact }) {
  const color = municipio?.color || '#211019';
  const titulo = municipio ? municipio.nombreCredencial || municipio.credencial : 'Libreta sanitaria digital';
  const sigla = municipio?.sigla || 'COLVET';
  return (
    <div className="wallet credcard" style={{ background: `linear-gradient(135deg, ${color} 0%, ${shade(color)} 100%)` }}>
      <div className="row between" style={{ alignItems: 'flex-start', flexWrap: 'nowrap' }}>
        <div>
          <div className="mono tiny" style={{ opacity: 0.8, letterSpacing: '.08em' }}>{municipio ? `MUNICIPIO DE ${String(municipio.nombre).toUpperCase()}` : 'COLEGIO DE VETERINARIOS · MENDOZA'}</div>
          <div style={{ fontWeight: 700, fontSize: 13, marginTop: 2 }}>{titulo}</div>
        </div>
        <span className="credsigla">{sigla}</span>
      </div>
      <div className="row" style={{ marginTop: 14, alignItems: 'flex-end', flexWrap: 'nowrap', gap: 14 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="credname">{animal.nombre}</div>
          <div className="small" style={{ opacity: 0.85 }}>{animal.raza} · {animal.sexo}{animal.castrado ? ' · Castrado/a' : ''}</div>
          {!compact && animal.microchip && <div className="mono tiny" style={{ opacity: 0.8, marginTop: 4 }}>Chip {chipFmt(animal.microchip)}</div>}
          <div className="row" style={{ gap: 6, marginTop: 10 }}>
            {estado && <span className={`credst ${estado.codigo}`}>{estado.etiqueta}</span>}
            {animal.perdido && <span className="credst vencida">PERDIDO/A</span>}
          </div>
          <div className="mono tiny" style={{ marginTop: 10, opacity: 0.9 }}>{nro ? `Credencial N.º ${String(nro).padStart(6, '0')}` : `Libreta ${animal.libreta}`}</div>
          {nro && <div className="mono tiny" style={{ opacity: 0.7 }}>Libreta {animal.libreta}</div>}
          {estado?.vence && !compact && <div className="tiny" style={{ opacity: 0.7 }}>Vence {fdate(estado.vence)}</div>}
        </div>
        <QR text={verifyUrl(`/libreta/${animal.libreta}`)} size={compact ? 64 : 82} style={{ padding: 6 }} />
      </div>
      {!municipio && <img src={LOGO} alt="" className="credlogo" />}
    </div>
  );
}

export function WalletButtons({ what = 'Credencial' }) {
  return (
    <div className="row" style={{ gap: 6 }}>
      <button className="btn btn-sm wbtn" onClick={() => toast(`${what} agregada a Google Wallet (demo)`)}>Google Wallet</button>
      <button className="btn btn-sm wbtn" onClick={() => toast(`${what} agregada a Apple Wallet (demo)`)}>Apple Wallet</button>
    </div>
  );
}

function shade(hex) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex || '');
  if (!m) return '#111';
  const n = parseInt(m[1], 16);
  const f = c => Math.max(0, Math.round(c * 0.55)).toString(16).padStart(2, '0');
  return `#${f(n >> 16)}${f((n >> 8) & 255)}${f(n & 255)}`;
}
