// Portal del matriculado (lado Colegio): credencial, cuotas, trámites, recetas, establecimiento, guardia y casos.
import { Router } from 'express';
import { prisma, ok, fail, h, parse, publicEst, vetName, addDays, startOfDay } from '../lib/core.js';
import { authenticate, requireRole } from '../middleware/auth.js';

const r = Router();
r.use(authenticate, requireRole('VET'));

const vetFull = id => prisma.vet.findUnique({ where: { id }, include: { equipos: { include: { est: true } } } });
const estInclude = { dt: true, equipo: { include: { vet: true } } };

r.get('/resumen', h(async (req, res) => {
  const v = await vetFull(req.user.vetId);
  const [cuotas, tramites, ests, casos] = await Promise.all([
    prisma.cuota.findMany({ where: { vetId: v.id }, orderBy: { vence: 'desc' } }),
    prisma.tramite.findMany({ where: { vetId: v.id }, orderBy: { createdAt: 'desc' } }),
    prisma.establecimiento.findMany({ where: { OR: [{ dtId: v.id }, { equipo: { some: { vetId: v.id } } }] }, include: estInclude }),
    prisma.casoEpi.findMany({ orderBy: { createdAt: 'desc' }, take: 4 }),
  ]);
  const hoy = startOfDay(), man = addDays(hoy, 1);
  const turnosHoy = await prisma.turno.count({ where: { vetId: v.id, inicio: { gte: hoy, lt: man }, NOT: { estado: 'cancelado' } } });
  ok(res, {
    vet: { ...v, especialidades: parse(v.especialidadesJson), especies: parse(v.especiesJson), titulo: vetName(v) },
    cuotaPendiente: cuotas.find(c => c.estado === 'Pendiente') || null,
    tramites, turnosHoy,
    establecimientos: ests.map(e => ({ ...publicEst(e), esDT: e.dtId === v.id })),
    alertas: casos,
  });
}));

r.get('/medios-pago', h(async (req, res) => ok(res, await prisma.medioPago.findMany({ where: { activo: true }, orderBy: { orden: 'asc' } }))));
r.get('/cuotas', h(async (req, res) => ok(res, await prisma.cuota.findMany({ where: { vetId: req.user.vetId }, orderBy: { vence: 'desc' } }))));
r.post('/cuotas/:id/pagar', h(async (req, res) => {
  const c = await prisma.cuota.findFirst({ where: { id: Number(req.params.id), vetId: req.user.vetId } });
  if (!c) return fail(res, 404, 'Cuota no encontrada.');
  if (c.estado === 'Pagada') return fail(res, 409, 'Esa cuota ya está paga.');
  // Sólo los medios de pago que el Colegio tiene habilitados; cada pago queda registrado como cobro.
  const medio = await prisma.medioPago.findFirst({ where: { clave: String(req.body?.medio || ''), activo: true } });
  if (!medio) return fail(res, 400, 'Ese medio de pago no está habilitado.');
  const ahora = new Date();
  const [upd] = await prisma.$transaction([
    prisma.cuota.update({ where: { id: c.id }, data: { estado: 'Pagada', pagadaEn: ahora, medio: medio.clave } }),
    prisma.cobro.create({ data: { fecha: ahora, concepto: 'Cuota de matrícula', detalle: c.periodo, medio: medio.clave, monto: c.monto, comision: Math.round(c.monto * medio.comisionPct) / 100, estado: medio.acreditacionDias ? 'A acreditar' : 'Acreditado', vetId: c.vetId, cuotaId: c.id } }),
  ]);
  ok(res, upd);
}));

r.get('/tramites', h(async (req, res) => ok(res, (await prisma.tramite.findMany({ where: { vetId: req.user.vetId }, orderBy: { createdAt: 'desc' } })).map(t => ({ ...t, pasos: parse(t.pasosJson) })))));
r.post('/tramites', h(async (req, res) => {
  const tipo = String(req.body?.tipo || '').trim();
  if (!tipo) return fail(res, 400, 'Elegí el tipo de trámite.');
  const n = await prisma.tramite.count();
  const t = await prisma.tramite.create({ data: { numero: `T-2026-${String(450 + n).padStart(4, '0')}`, vetId: req.user.vetId, tipo, estado: 'Solicitud enviada', pasosJson: JSON.stringify(['Solicitud enviada', 'Revisión del Colegio', 'Resolución']), actual: 1 } });
  ok(res, t, 201);
}));

// Ficha pública del directorio
r.patch('/ficha', h(async (req, res) => {
  const { fichaPublica, domicilio, turnosOnline, bio, foto } = req.body || {};
  // Foto de perfil: imagen ya reducida en el navegador (data URL), hasta ~400 KB. null la quita.
  if (foto !== undefined && foto !== null && (typeof foto !== 'string' || !/^data:image\/(jpeg|png|webp);base64,/.test(foto) || foto.length > 550_000)) return fail(res, 400, 'La foto tiene que ser una imagen JPG, PNG o WebP de hasta 400 KB.');
  const v = await prisma.vet.update({ where: { id: req.user.vetId }, data: { fichaPublica, domicilio, turnosOnline, bio, ...(foto !== undefined ? { foto } : {}) } });
  ok(res, v);
}));

// Establecimientos: guardia del día
r.patch('/establecimientos/:codigo/guardia', h(async (req, res) => {
  const e = await prisma.establecimiento.findUnique({ where: { codigo: req.params.codigo } });
  if (!e || e.dtId !== req.user.vetId) return fail(res, 403, 'Sólo el/la director/a técnico/a declara la guardia.');
  const g = ['activa', 'pasiva'].includes(req.body?.guardia) ? req.body.guardia : null;
  const upd = await prisma.establecimiento.update({ where: { id: e.id }, data: { guardia: g, guardiaNota: g ? 'declarada hoy desde el portal' : null }, include: estInclude });
  ok(res, publicEst(upd));
}));

// Recetas
const recetaOut = rx => ({ ...rx, items: parse(rx.itemsJson), paciente: rx.animal && { nombre: rx.animal.nombre, especie: rx.animal.especie, libreta: rx.animal.libreta } });
r.get('/recetas', h(async (req, res) => {
  const v = await prisma.vet.findUnique({ where: { id: req.user.vetId } });
  const list = await prisma.receta.findMany({ where: { vetId: v.id }, include: { animal: true }, orderBy: { fecha: 'desc' } });
  ok(res, { prescriptorCannabis: v.prescriptorCannabis, recetas: list.map(recetaOut) });
}));
r.post('/recetas', h(async (req, res) => {
  const { libreta, tipo, items } = req.body || {};
  const v = await prisma.vet.findUnique({ where: { id: req.user.vetId } });
  if (/cannabis/i.test(tipo || '') && v.prescriptorCannabis !== 'si') return fail(res, 403, 'Para recetar cannabis medicinal tenés que estar inscripto/a en el registro de prescriptores.');
  const a = await prisma.animal.findUnique({ where: { libreta: String(libreta || '') } });
  if (!a) return fail(res, 400, 'Elegí un paciente con libreta.');
  if (!Array.isArray(items) || !items.length || !items[0].medicamento) return fail(res, 400, 'Agregá al menos un medicamento.');
  const n = await prisma.receta.count();
  const rx = await prisma.receta.create({ data: { codigo: `RV-2026-${String(413 + n).padStart(6, '0')}`, animalId: a.id, vetId: v.id, tipo: tipo || 'Común', itemsJson: JSON.stringify(items), vence: addDays(new Date(), 30) }, include: { animal: true } });
  ok(res, recetaOut(rx), 201);
}));
r.post('/cannabis', h(async (req, res) => {
  const v = await prisma.vet.findUnique({ where: { id: req.user.vetId } });
  const next = v.prescriptorCannabis === 'no' ? 'tramite' : req.body?.simularAprobacion ? 'si' : v.prescriptorCannabis;
  ok(res, await prisma.vet.update({ where: { id: v.id }, data: { prescriptorCannabis: next } }));
}));

// Vigilancia epidemiológica
r.post('/casos', h(async (req, res) => {
  const { evento, departamento, casos, especie, diagnostico } = req.body || {};
  if (!evento || !departamento) return fail(res, 400, 'Indicá evento y departamento.');
  const now = new Date(), start = new Date(now.getFullYear(), 0, 1);
  const semana = Math.ceil(((now - start) / 864e5 + start.getDay() + 1) / 7);
  ok(res, await prisma.casoEpi.create({ data: { evento, departamento, casos: Number(casos) || 1, especie: especie || 'Perros', diagnostico: diagnostico || 'Sospecha clínica', semana, vetId: req.user.vetId } }), 201);
}));
r.get('/casos', h(async (req, res) => ok(res, await prisma.casoEpi.findMany({ orderBy: { createdAt: 'desc' }, take: 20 }))));

export default r;
