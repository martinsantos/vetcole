// Kit de UI compartido. Usa las clases del sistema de diseño (styles.css): card, btn, badge, chip, seg, tbl, kpi...
import { useEffect, useRef, useState } from 'react';
import { create } from 'zustand';
import qrcode from 'qrcode-generator';
import { EVT, fdate } from '../lib/format.js';

export const LOGO = '/logo-colegio.svg';
export const cx = (...a) => a.filter(Boolean).join(' ');

// ── Toasts
const useToasts = create(set => ({ list: [], push: t => set(s => ({ list: [...s.list, t] })), drop: id => set(s => ({ list: s.list.filter(x => x.id !== id) })) }));
export function toast(msg, kind = 'ok') {
  const id = Math.random();
  useToasts.getState().push({ id, msg, kind });
  setTimeout(() => useToasts.getState().drop(id), 4000);
}
export function Toasts() {
  const list = useToasts(s => s.list);
  return list.map((t, i) => (
    <div key={t.id} className="toast" style={{ bottom: 22 + i * 58 }}>
      <span style={{ color: t.kind === 'error' ? '#f87171' : '#7ee2b0' }}>{t.kind === 'error' ? '✕' : '✓'}</span>{t.msg}
    </div>
  ));
}

// ── Modal
export function Modal({ open, onClose, title, subtitle, icon, wide, children }) {
  useEffect(() => {
    if (!open) return;
    const k = e => e.key === 'Escape' && onClose?.();
    document.addEventListener('keydown', k);
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', k); document.body.style.overflow = ''; };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="modal-bg" onMouseDown={e => e.target === e.currentTarget && onClose?.()}>
      <div className={cx('modal', wide && 'wide')}>
        <button className="x" onClick={onClose} aria-label="Cerrar">×</button>
        {(title || icon) && <div className="mh">{icon}<div><h3 style={{ margin: 0 }}>{title}</h3>{subtitle && <div className="muted small">{subtitle}</div>}</div></div>}
        <div className="mb">{children}</div>
      </div>
    </div>
  );
}

// ── Básicos
export const Badge = ({ cls = '', children, style }) => <span className={cx('badge', cls)} style={style}>{children}</span>;
export const Kicker = ({ children, style }) => <div className="kicker" style={style}>{children}</div>;
export const Spinner = ({ label = 'Cargando…' }) => <div className="empty"><span className="spin" /> {label}</div>;
export const Empty = ({ children = 'Sin resultados.' }) => <div className="empty">{children}</div>;
export const ErrorBox = ({ error, onRetry }) => <div className="note" style={{ background: 'var(--bad-l)', borderColor: '#f3b8b0', color: 'var(--bad)' }}>{error} {onRetry && <button className="btn btn-sm" onClick={onRetry}>Reintentar</button>}</div>;
export const Kpi = ({ label, value, sub, color }) => (
  <div className="card kpi"><div className="tiny muted">{label}</div><b style={color ? { color } : undefined}>{value}</b>{sub && <span className="small muted">{sub}</span>}</div>
);
export const PageHead = ({ kicker, title, children }) => (
  <div className="ph"><div>{kicker && <Kicker>{kicker}</Kicker>}<h2>{title}</h2></div>{children && <div className="row">{children}</div>}</div>
);
export function Field({ label, children, hint }) {
  return <label className="f">{label}{children}{hint && <span className="tiny muted" style={{ fontWeight: 400 }}>{hint}</span>}</label>;
}
export function Switch({ checked, onChange, children }) {
  return <label className="switch"><input type="checkbox" checked={!!checked} onChange={e => onChange(e.target.checked)} /><i />{children}</label>;
}
export function Seg({ options, value, onChange, dark }) {
  return (
    <div className={cx('seg', dark && 'dark')}>
      {options.map(o => { const [v, l, c] = Array.isArray(o) ? o : [o, o]; return <button type="button" key={v} className={value === v ? 'on' : ''} onClick={() => onChange(v)}>{l}{c !== undefined && <span className="ct">{c}</span>}</button>; })}
    </div>
  );
}
export const Av = ({ children, lg, style }) => <div className={cx('av', lg && 'lg')} style={style}>{children}</div>;

// ── Async button: evita doble envío y muestra error
export function AsyncBtn({ onClick, className = 'btn', children, ...p }) {
  const [busy, setBusy] = useState(false);
  return (
    <button {...p} className={className} disabled={busy || p.disabled} style={{ opacity: busy ? 0.6 : 1, ...(p.style || {}) }}
      onClick={async e => { setBusy(true); try { await onClick(e); } catch (err) { toast(err.message, 'error'); } finally { setBusy(false); } }}>
      {busy ? '…' : children}
    </button>
  );
}

// ── QR
export function QR({ text, size = 96, style }) {
  const ref = useRef(null);
  useEffect(() => {
    if (!ref.current) return;
    const q = qrcode(0, 'M'); q.addData(text); q.make();
    ref.current.innerHTML = q.createSvgTag({ cellSize: 2, margin: 0, scalable: true });
    const svg = ref.current.querySelector('svg'); if (svg) { svg.style.width = '100%'; svg.style.height = '100%'; svg.style.display = 'block'; }
  }, [text]);
  return <div className="qrbox" style={{ width: size + 14, height: size + 14, ...style }}><div ref={ref} style={{ width: size, height: size }} /></div>;
}
export const verifyUrl = path => `${window.location.origin}${path}`;

// ── Gráficos simples
export function VBars({ data, keys, colors = ['var(--leaf)', 'var(--leaf-2)'], label = 'mes', height = 150 }) {
  const max = Math.max(1, ...data.map(d => keys.reduce((s, k) => s + (d[k] || 0), 0)));
  return (
    <div className="vbars" style={{ height }}>
      {data.map((d, i) => (
        <div key={i} title={keys.map(k => `${k}: ${d[k]}`).join(' · ')}>
          {keys.map((k, j) => <i key={k} style={{ height: `${((d[k] || 0) / max) * 100}%`, background: colors[j], marginTop: j ? 2 : 0 }} />)}
          {d[label]}
        </div>
      ))}
    </div>
  );
}
export function HBars({ data, label = 'label', value = 'value', fmt = v => v }) {
  const max = Math.max(1, ...data.map(d => d[value]));
  return <div className="bars">{data.map((d, i) => <div className="b" key={i}><span className="small">{d[label]}</span><div className="t"><i style={{ width: `${(d[value] / max) * 100}%` }} /></div><b className="small">{fmt(d[value])}</b></div>)}</div>;
}

// ── Libreta: línea de tiempo de registros
export function Timeline({ eventos, onCert }) {
  if (!eventos?.length) return <Empty>Sin registros todavía.</Empty>;
  return (
    <ul className="tl">
      {eventos.map(e => { const k = EVT[e.tipo] || ['REG', 'Registro', '#666']; const firma = e.firma?.titulo ? `${e.firma.titulo} · MP ${e.firma.mp}` : e.firma?.zoonosis ? `Zoonosis ${e.firma.zoonosis}` : typeof e.firma === 'string' ? e.firma : null; return (
        <li key={e.id}>
          <span className="evk" style={{ background: k[2] }}>{k[0]}</span>
          <div>
            <b>{e.titulo}</b>
            {e.detalle && <div className="small muted">{e.detalle}</div>}
            {e.diagnostico && <div className="small"><span className="muted">Diagnóstico:</span> {e.diagnostico}</div>}
            {e.tratamiento && <div className="small"><span className="muted">Tratamiento:</span> {e.tratamiento}</div>}
            {(e.peso || e.temperatura) && <div className="tiny muted">{e.peso ? `Peso ${e.peso} kg` : ''}{e.peso && e.temperatura ? ' · ' : ''}{e.temperatura ? `T° ${Number(e.temperatura).toFixed(1)} °C` : ''}</div>}
            {e.sticker && <div className="tiny mono muted">Sticker LUSCyF {e.sticker}</div>}
            <div className="who">{firma && <>✓ Firmado por {firma}</>}{e.lugar && <> · {e.lugar}</>}{e.publico === false && <> · <Badge cls="b-grey">Sólo profesionales</Badge></>}</div>
            {e.tipo === 'via' && onCert && <button className="btn btn-sm" style={{ marginTop: 6 }} onClick={() => onCert(e)}>Ver certificado</button>}
          </div>
          <div className="dt">{fdate(e.fecha)}{e.proximo && <div style={{ color: 'var(--leaf)' }}>próx. {fdate(e.proximo)}</div>}</div>
        </li>
      ); })}
    </ul>
  );
}
