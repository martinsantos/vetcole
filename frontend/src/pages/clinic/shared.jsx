// Piezas compartidas del Consultorio: estados de turno, selector de paciente, impresión de comprobantes.
import { useEffect, useState } from 'react';
import { CLAUDE } from '../../lib/base.js';
import { toast } from '../../components/ui.jsx';
import { api } from '../../lib/api.js';
import { Badge } from '../../components/ui.jsx';

export const ESTADOS_TURNO = [
  ['pendiente', 'Pendiente', 'b-warn'],
  ['confirmado', 'Confirmado', 'b-ok'],
  ['atendido', 'Atendido', 'b-grey'],
  ['ausente', 'Ausente', 'b-bad'],
  ['cancelado', 'Cancelado', 'b-bad'],
];
export const estadoTurnoCls = e => (ESTADOS_TURNO.find(x => x[0] === e) || [])[2] || 'b-grey';
export const TurnoBadge = ({ estado }) => <Badge cls={estadoTurnoCls(estado)}>{estado}</Badge>;
export const ORIGEN = { web: 'Web', app: 'App del tutor', manual: 'Mostrador' };
export const OrigenBadge = ({ origen }) => <Badge cls={origen === 'manual' ? 'b-grey' : ''}>{ORIGEN[origen] || origen}</Badge>;

export const HORAS = Array.from({ length: 24 }, (_, i) => `${String(9 + Math.floor(i / 2)).padStart(2, '0')}:${i % 2 ? '30' : '00'}`);
export const MEDIOS = ['Efectivo', 'Tarjeta', 'Transferencia', 'Mercado Pago', 'Cuenta corriente'];
export const COMPROBANTES = ['Factura B', 'Factura C', 'Ticket', 'Presupuesto'];
export const CATEGORIAS = ['Alimentos', 'Medicamentos', 'Vacunas', 'Antiparasitarios', 'Accesorios', 'Higiene'];

// Buscador de pacientes del consultorio (para turnos)
export function PacientePicker({ value, onChange }) {
  const [q, setQ] = useState(''), [list, setList] = useState([]);
  useEffect(() => {
    const t = setTimeout(() => api.get(`/clinic/pacientes?q=${encodeURIComponent(q)}`).then(r => setList(r.slice(0, 8))).catch(() => setList([])), 200);
    return () => clearTimeout(t);
  }, [q]);
  if (value) return (
    <div className="row between card flat" style={{ padding: '8px 12px', marginBottom: 12 }}>
      <span className="small"><b>{value.nombre}</b> · {value.especie} · {value.tutor?.nombre}</span>
      <button type="button" className="btn btn-sm" onClick={() => onChange(null)}>Cambiar</button>
    </div>
  );
  return (
    <div style={{ marginBottom: 12 }}>
      <input type="search" placeholder="Buscar paciente, libreta o tutor/a" value={q} onChange={e => setQ(e.target.value)} />
      <div className="cl-pick">{list.map(p => <button type="button" key={p.id} onClick={() => onChange(p)}><b>{p.nombre}</b> <span className="muted">· {p.especie} · {p.tutor.nombre} · {p.libreta}</span></button>)}</div>
    </div>
  );
}

// Imprime sólo el bloque .cl-printable
export function printBlock() {
  if (CLAUDE) return toast('Dentro de Claude no se puede imprimir. El comprobante se imprime desde la versión publicada en el servidor.', 'error');
  document.body.classList.add('cl-print');
  setTimeout(() => {
    try { window.print(); } catch { /* sandbox */ }
    setTimeout(() => document.body.classList.remove('cl-print'), 400);
  }, 50);
}

// La agenda es de lunes a sábado: el domingo abre la semana siguiente.
export const weekStart = (d = new Date()) => { const x = new Date(d); x.setHours(0, 0, 0, 0); if (x.getDay() === 0) x.setDate(x.getDate() + 1); const wd = (x.getDay() + 6) % 7; x.setDate(x.getDate() - wd); return x; };
export const nextWorkday = (d = new Date()) => { const x = new Date(d); if (x.getDay() === 0) x.setDate(x.getDate() + 1); return x; };
export const addD = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
