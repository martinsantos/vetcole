// Zoonosis municipal como servicio (funciones tipo VetCard), multi-municipio:
// panel, credenciales con identidad del municipio, atenciones, campañas con sincronización offline,
// mordeduras y registro de perros potencialmente peligrosos.
import { Router } from 'express';
import { prisma, ok, fail, h, vetName, startOfDay, addDays, estadoSanitario } from '../lib/core.js';
import { authenticate, requireRole } from '../middleware/auth.js';

const r = Router();
r.use(authenticate, requireRole('MUNICIPIO'));
const mid = req => req.user.municipioId;

r.get('/config', h(async (req, res) => ok(res, await prisma.municipio.findUnique({ where: { id: mid(req) } }))));
r.patch('/config', h(async (req, res) => {
  const data = {};
  for (const k of ['nombreCredencial', 'sigla', 'color']) if (req.body?.[k]) data[k] = String(req.body[k]);
  ok(res, await prisma.municipio.update({ where: { id: mid(req) }, data }));
}));

r.get('/panel', h(async (req, res) => {
  const m = mid(req), desde = addDays(new Date(), -365);
  const [animales, eventos, mord, campanias] = await Promise.all([
    prisma.animal.findMany({ where: { municipioId: m }, include: { eventos: true } }),
    prisma.evento.findMany({ where: { municipioId: m, fecha: { gte: desde } }, include: { animal: { select: { especie: true } } } }),
    prisma.mordedura.findMany({ where: { municipioId: m, fecha: { gte: desde } } }),
    prisma.campania.findMany({ where: { municipioId: m }, include: { _count: { select: { eventos: true } } }, orderBy: { fecha: 'desc' } }),
  ]);
  const meses = Array.from({ length: 12 }, (_, i) => { const d = new Date(); d.setMonth(d.getMonth() - 11 + i, 1); return { mes: d.toLocaleDateString('es-AR', { month: 'short' }), y: d.getFullYear(), m: d.getMonth(), antirrabicaPerros: 0, antirrabicaGatos: 0, castraciones: 0 }; });
  let ar = 0, cas = 0;
  for (const e of eventos) {
    const b = meses.find(x => x.y === e.fecha.getFullYear() && x.m === e.fecha.getMonth());
    if (e.tipo === 'vac' && /antirr/i.test(e.titulo)) { ar++; if (b) e.animal.especie === 'Felino' ? b.antirrabicaGatos++ : b.antirrabicaPerros++; }
    if (e.tipo === 'cas') { cas++; if (b) b.castraciones++; }
  }
  const alDia = animales.filter(a => estadoSanitario(a, a.eventos).codigo === 'al_dia').length;
  ok(res, {
    credenciales: animales.length, antirrabicas: ar, castraciones: cas, mordeduras: mord.length,
    coberturaAntirrabica: animales.length ? alDia / animales.length : 0,
    peligrosos: animales.filter(a => a.peligroso).length, enObservacion: mord.filter(x => x.estado === 'En observación').length,
    meses, campanias: campanias.slice(0, 4).map(c => ({ ...c, registros: c._count.eventos })),
  });
}));

const animalOut = a => ({ id: a.id, libreta: a.libreta, credencialNro: a.credencialNro, nombre: a.nombre, especie: a.especie, raza: a.raza, sexo: a.sexo, nacimiento: a.nacimiento, microchip: a.microchip, castrado: a.castrado, peligroso: a.peligroso, mordedor: a.mordedor, perdido: a.perdido, tutor: { nombre: a.tutor.nombre, dni: a.tutor.dni, telefono: a.tutor.telefono }, estado: estadoSanitario(a, a.eventos || []) });
r.get('/animales', h(async (req, res) => {
  const q = String(req.query.q || '').toLowerCase();
  const list = await prisma.animal.findMany({ where: { municipioId: mid(req), ...(req.query.peligrosos ? { peligroso: true } : {}) }, include: { tutor: true, eventos: true }, orderBy: { credencialNro: 'desc' } });
  ok(res, list.filter(a => !q || `${a.nombre} ${a.libreta} ${a.credencialNro} ${a.tutor.nombre} ${a.tutor.dni} ${a.microchip}`.toLowerCase().includes(q)).map(animalOut));
}));
r.get('/animales/:id', h(async (req, res) => {
  const a = await prisma.animal.findFirst({ where: { id: Number(req.params.id) }, include: { tutor: true, mordeduras: true, eventos: { include: { vet: true, municipio: true, est: true }, orderBy: { fecha: 'desc' } } } });
  if (!a) return fail(res, 404, 'No encontrado.');
  ok(res, { ...animalOut(a), mordeduras: a.mordeduras, eventos: a.eventos.map(e => ({ id: e.id, tipo: e.tipo, fecha: e.fecha, titulo: e.titulo, detalle: e.detalle, proximo: e.proximo, firma: e.vet ? `${vetName(e.vet)} · MP ${e.vet.mp}` : e.municipio ? `Zoonosis ${e.municipio.nombre}` : '', lugar: e.est?.nombre })) });
}));
async function nextCred(m) { const x = await prisma.animal.aggregate({ where: { municipioId: m }, _max: { credencialNro: true } }); return (x._max.credencialNro || 4200) + 1; }
async function nextLib(especie) {
  const pref = especie === 'Equino' ? 'EQ-' : 'MZA-';
  const last = await prisma.animal.findMany({ where: { libreta: { startsWith: pref } }, select: { libreta: true } });
  return pref + String(Math.max(0, ...last.map(x => Number(x.libreta.replace(pref, '')) || 0)) + 1).padStart(6, '0');
}
// Alta de credencial: si el animal ya tiene libreta (por un veterinario), se le asigna la credencial municipal sin duplicarlo.
r.post('/animales', h(async (req, res) => {
  const b = req.body || {}, m = mid(req);
  if (b.libreta) {
    const a = await prisma.animal.findUnique({ where: { libreta: b.libreta.toUpperCase() } });
    if (!a) return fail(res, 404, 'No existe esa libreta.');
    if (a.municipioId === m) return fail(res, 409, 'Ya tiene credencial de este municipio.');
    return ok(res, await prisma.animal.update({ where: { id: a.id }, data: { municipioId: m, credencialNro: await nextCred(m) } }), 201);
  }
  if (!b.nombre || !b.especie || !b.tutor?.dni || !b.tutor?.nombre) return fail(res, 400, 'Completá animal y tutor/a.');
  const tutor = await prisma.tutor.upsert({ where: { dni: b.tutor.dni }, update: {}, create: { dni: b.tutor.dni, nombre: b.tutor.nombre, telefono: b.tutor.telefono, departamento: b.tutor.departamento } });
  const a = await prisma.animal.create({ data: { libreta: await nextLib(b.especie), nombre: b.nombre, especie: b.especie, raza: b.raza || 'Mestizo', sexo: b.sexo || 'Macho', nacimiento: new Date(b.nacimiento || Date.now()), castrado: !!b.castrado, microchip: b.microchip || null, tutorId: tutor.id, municipioId: m, credencialNro: await nextCred(m), peligroso: !!b.peligroso } });
  ok(res, a, 201);
}));
r.patch('/animales/:id', h(async (req, res) => {
  const data = {};
  for (const k of ['peligroso', 'mordedor', 'castrado']) if (req.body?.[k] !== undefined) data[k] = !!req.body[k];
  ok(res, await prisma.animal.update({ where: { id: Number(req.params.id) }, data }));
}));
r.post('/animales/:id/atenciones', h(async (req, res) => {
  const b = req.body || {};
  if (!['vac', 'des', 'cas', 'chip', 'con', 'inc'].includes(b.tipo) || !b.titulo) return fail(res, 400, 'Tipo y título obligatorios.');
  const e = await prisma.evento.create({ data: { animalId: Number(req.params.id), tipo: b.tipo, fecha: new Date(b.fecha || Date.now()), titulo: b.titulo, detalle: b.detalle, proximo: b.proximo ? new Date(b.proximo) : null, origen: 'zoonosis', municipioId: mid(req) } });
  if (b.tipo === 'cas') await prisma.animal.update({ where: { id: e.animalId }, data: { castrado: true } });
  ok(res, e, 201);
}));

// Campañas + sincronización de registros cargados sin conexión
r.get('/campanias', h(async (req, res) => ok(res, (await prisma.campania.findMany({ where: { municipioId: mid(req) }, include: { _count: { select: { eventos: true } } }, orderBy: { fecha: 'desc' } })).map(c => ({ ...c, registros: c._count.eventos })))));
r.post('/campanias', h(async (req, res) => {
  const { nombre, tipo, lugar, fecha } = req.body || {};
  if (!nombre || !lugar || !fecha) return fail(res, 400, 'Nombre, lugar y fecha son obligatorios.');
  ok(res, await prisma.campania.create({ data: { municipioId: mid(req), nombre, tipo: tipo || 'Antirrábica', lugar, fecha: new Date(fecha) } }), 201);
}));
r.patch('/campanias/:id', h(async (req, res) => ok(res, await prisma.campania.update({ where: { id: Number(req.params.id) }, data: { estado: String(req.body?.estado) } }))));
r.post('/campanias/:id/sync', h(async (req, res) => {
  const c = await prisma.campania.findFirst({ where: { id: Number(req.params.id), municipioId: mid(req) } });
  if (!c) return fail(res, 404, 'Campaña no encontrada.');
  const regs = Array.isArray(req.body?.registros) ? req.body.registros : [];
  let creados = 0;
  for (const g of regs) {
    if (!g.nombre || !g.tutorDni) continue;
    const tutor = await prisma.tutor.upsert({ where: { dni: g.tutorDni }, update: {}, create: { dni: g.tutorDni, nombre: g.tutorNombre || 'Sin nombre' } });
    let a = await prisma.animal.findFirst({ where: { tutorId: tutor.id, nombre: g.nombre } });
    if (!a) a = await prisma.animal.create({ data: { libreta: await nextLib(g.especie || 'Canino'), nombre: g.nombre, especie: g.especie || 'Canino', raza: 'Mestizo', sexo: g.sexo || 'Macho', nacimiento: new Date(Date.now() - 2 * 365 * 864e5), tutorId: tutor.id, municipioId: c.municipioId, credencialNro: await nextCred(c.municipioId) } });
    const f = new Date(g.registradoEn || Date.now());
    if (g.antirrabica) await prisma.evento.create({ data: { animalId: a.id, tipo: 'vac', fecha: f, titulo: 'Antirrábica', detalle: `Campaña ${c.nombre}`, proximo: addDays(f, 365), origen: 'campania', municipioId: c.municipioId, campaniaId: c.id } });
    if (g.castracion) { await prisma.evento.create({ data: { animalId: a.id, tipo: 'cas', fecha: f, titulo: 'Castración', detalle: `Campaña ${c.nombre}`, origen: 'campania', municipioId: c.municipioId, campaniaId: c.id } }); await prisma.animal.update({ where: { id: a.id }, data: { castrado: true } }); }
    creados++;
  }
  ok(res, { sincronizados: creados });
}));

// Mordeduras y observación antirrábica (10 días)
r.get('/mordeduras', h(async (req, res) => ok(res, await prisma.mordedura.findMany({ where: { municipioId: mid(req) }, include: { animal: { include: { tutor: true } } }, orderBy: { fecha: 'desc' } }))));
r.post('/mordeduras', h(async (req, res) => {
  const { libreta, lugar, victima, descripcion, fecha } = req.body || {};
  if (!lugar || !victima) return fail(res, 400, 'Lugar y víctima son obligatorios.');
  const a = libreta ? await prisma.animal.findUnique({ where: { libreta: libreta.toUpperCase() } }) : null;
  const f = new Date(fecha || Date.now());
  const m = await prisma.mordedura.create({ data: { municipioId: mid(req), animalId: a?.id, fecha: f, lugar, victima, descripcion: descripcion || '', observacionHasta: addDays(f, 10) } });
  if (a) await prisma.animal.update({ where: { id: a.id }, data: { mordedor: true } });
  ok(res, m, 201);
}));
r.patch('/mordeduras/:id', h(async (req, res) => ok(res, await prisma.mordedura.update({ where: { id: Number(req.params.id) }, data: { estado: String(req.body?.estado || 'Cerrada') } }))));

export default r;
