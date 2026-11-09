// Inspecciones de establecimientos: agenda, formulario de revisión, acta y acreditación.
// Las usa el rol INSPECTOR del Colegio; la administración (ADMIN) también puede verlas y programarlas.
import { Router } from 'express';
import { prisma, ok, fail, h, parse, publicEst, addDays, vetName } from '../lib/core.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { CHECKLIST, ITEMS, evaluar } from '../lib/inspeccion.js';

const r = Router();
r.use(authenticate, requireRole('INSPECTOR', 'ADMIN'));
const estInclude = { dt: true, equipo: { include: { vet: true } } };

const salida = i => ({
  ...i, checklist: parse(i.checklistJson, {}), checklistJson: undefined,
  est: i.est ? { ...publicEst(i.est), dtEstado: i.est.dt?.estado || null } : undefined,
  inspector: i.inspector ? i.inspector.nombre : null,
});

r.get('/checklist', h(async (req, res) => ok(res, CHECKLIST)));

r.get('/', h(async (req, res) => {
  const list = await prisma.inspeccion.findMany({ include: { est: { include: estInclude }, inspector: true }, orderBy: { programada: 'asc' } });
  const hoy = new Date();
  ok(res, {
    agenda: list.filter(i => i.estado === 'Programada' || i.estado === 'En curso').map(salida),
    historial: list.filter(i => i.estado === 'Finalizada').sort((a, b) => new Date(b.realizada) - new Date(a.realizada)).map(salida),
    resumen: {
      programadas: list.filter(i => i.estado !== 'Finalizada' && i.estado !== 'Cancelada').length,
      vencidas: list.filter(i => i.estado === 'Programada' && new Date(i.programada) < hoy).length,
      finalizadasMes: list.filter(i => i.estado === 'Finalizada' && new Date(i.realizada) > addDays(hoy, -30)).length,
    },
  });
}));

// Establecimientos con su estado de acreditación (para programar inspecciones).
r.get('/establecimientos', h(async (req, res) => {
  const ests = await prisma.establecimiento.findMany({ include: { ...estInclude, inspecciones: { orderBy: { programada: 'desc' }, take: 1 } }, orderBy: { nombre: 'asc' } });
  ok(res, ests.map(e => ({ ...publicEst(e), ultima: e.inspecciones[0] ? { id: e.inspecciones[0].id, estado: e.inspecciones[0].estado, programada: e.inspecciones[0].programada, realizada: e.inspecciones[0].realizada, resultado: e.inspecciones[0].resultado } : null })));
}));

async function nuevoNumero() {
  const n = await prisma.inspeccion.count();
  return `ACTA-${new Date().getFullYear()}-${String(n + 1).padStart(4, '0')}`;
}

r.post('/', h(async (req, res) => {
  const { estId, programada, motivo } = req.body || {};
  const est = await prisma.establecimiento.findUnique({ where: { id: Number(estId) } });
  if (!est) return fail(res, 400, 'Elegí un establecimiento.');
  const i = await prisma.inspeccion.create({ data: { numero: await nuevoNumero(), estId: est.id, motivo: motivo || 'Control periódico', programada: new Date(programada || Date.now()), inspectorId: req.user.rol === 'INSPECTOR' ? req.user.id : null } });
  ok(res, i, 201);
}));

r.get('/:id', h(async (req, res) => {
  const i = await prisma.inspeccion.findUnique({ where: { id: Number(req.params.id) }, include: { est: { include: estInclude }, inspector: true } });
  if (!i) return fail(res, 404, 'Inspección no encontrada.');
  const out = salida(i);
  // El ítem del director técnico se precarga con el padrón del Colegio.
  out.padron = { dt: i.est.dt ? { titulo: vetName(i.est.dt), mp: i.est.dt.mp, vigente: i.est.dt.estado === 'Vigente' } : null };
  out.evaluacion = evaluar(out.checklist);
  ok(res, out);
}));

r.patch('/:id', h(async (req, res) => {
  const i = await prisma.inspeccion.findUnique({ where: { id: Number(req.params.id) } });
  if (!i) return fail(res, 404, 'Inspección no encontrada.');
  if (i.estado === 'Finalizada') return fail(res, 409, 'El acta ya está cerrada.');
  const { checklist, observaciones, responsable } = req.body || {};
  const limpio = {};
  for (const it of ITEMS) { const x = checklist?.[it.id]; if (x && ['si', 'no', 'na'].includes(x.r)) limpio[it.id] = { r: x.r, obs: String(x.obs || '').slice(0, 400) }; }
  const upd = await prisma.inspeccion.update({ where: { id: i.id }, data: { checklistJson: JSON.stringify(limpio), observaciones: observaciones ?? i.observaciones, responsable: responsable ?? i.responsable, estado: 'En curso', inspectorId: i.inspectorId || (req.user.rol === 'INSPECTOR' ? req.user.id : null) } });
  ok(res, { ...upd, evaluacion: evaluar(limpio) });
}));

// Cierra el acta: calcula el resultado y actualiza la acreditación del establecimiento.
r.post('/:id/finalizar', h(async (req, res) => {
  const i = await prisma.inspeccion.findUnique({ where: { id: Number(req.params.id) } });
  if (!i) return fail(res, 404, 'Inspección no encontrada.');
  if (i.estado === 'Finalizada') return fail(res, 409, 'El acta ya está cerrada.');
  const ev = evaluar(parse(i.checklistJson, {}));
  if (!ev.completo) return fail(res, 400, `Faltan ${ev.faltan} ítems por responder.`);
  if (!i.responsable) return fail(res, 400, 'Indicá quién atendió la inspección.');
  const ahora = new Date();
  const hasta = ev.resultado === 'Acreditado' ? addDays(ahora, 730) : ev.resultado === 'Acreditado con observaciones' ? addDays(ahora, ev.plazoDias) : null;
  const [upd] = await prisma.$transaction([
    prisma.inspeccion.update({ where: { id: i.id }, data: { estado: 'Finalizada', realizada: ahora, resultado: ev.resultado, plazoDias: ev.plazoDias, inspectorId: i.inspectorId || (req.user.rol === 'INSPECTOR' ? req.user.id : null) } }),
    prisma.establecimiento.update({ where: { id: i.estId }, data: { acreditacion: ev.resultado, acreditadoHasta: hasta } }),
  ]);
  // Si hay observaciones o no se acreditó, queda programada la reinspección al vencer el plazo.
  if (ev.plazoDias) await prisma.inspeccion.create({ data: { numero: await nuevoNumero(), estId: i.estId, motivo: 'Reinspección', programada: addDays(ahora, ev.plazoDias), inspectorId: upd.inspectorId } });
  ok(res, { ...upd, evaluacion: ev });
}));

export default r;
