// App del tutor/a: mis mascotas (libreta completa y credencial), turnos, mensajes con la veterinaria, aviso de pérdida.
import { Router } from 'express';
import { prisma, ok, fail, h, vetName, estadoSanitario, parse } from '../lib/core.js';
import { authenticate, requireRole } from '../middleware/auth.js';

const r = Router();
r.use(authenticate, requireRole('TUTOR'));
const tid = req => req.user.tutorId;

r.get('/mascotas', h(async (req, res) => {
  const list = await prisma.animal.findMany({ where: { tutorId: tid(req) }, include: { municipio: true, vetCabecera: true, eventos: { orderBy: { fecha: 'desc' } } } });
  ok(res, list.map(a => ({
    id: a.id, libreta: a.libreta, nombre: a.nombre, especie: a.especie, raza: a.raza, sexo: a.sexo, nacimiento: a.nacimiento, microchip: a.microchip, castrado: a.castrado, perdido: a.perdido,
    municipio: a.municipio ? { nombre: a.municipio.nombre, credencial: a.municipio.nombreCredencial, sigla: a.municipio.sigla, color: a.municipio.color, nro: a.credencialNro } : null,
    vetCabecera: a.vetCabecera ? { mp: a.vetCabecera.mp, titulo: vetName(a.vetCabecera) } : null,
    estado: estadoSanitario(a, a.eventos),
    proximos: a.eventos.filter(e => e.proximo && e.proximo > new Date()).sort((x, y) => x.proximo - y.proximo).slice(0, 3).map(e => ({ titulo: e.titulo, proximo: e.proximo })),
  })));
}));
r.get('/mascotas/:id', h(async (req, res) => {
  const a = await prisma.animal.findFirst({ where: { id: Number(req.params.id), tutorId: tid(req) }, include: { municipio: true, eventos: { include: { vet: true, municipio: true, est: true }, orderBy: { fecha: 'desc' } }, recetas: { include: { vet: true } } } });
  if (!a) return fail(res, 404, 'No encontrado.');
  ok(res, { ...a, estado: estadoSanitario(a, a.eventos), eventos: a.eventos.filter(e => e.publico).map(e => ({ id: e.id, tipo: e.tipo, fecha: e.fecha, titulo: e.titulo, detalle: e.detalle, proximo: e.proximo, firma: e.vet ? `${vetName(e.vet)} · MP ${e.vet.mp}` : e.municipio ? `Zoonosis ${e.municipio.nombre}` : '', lugar: e.est?.nombre })), recetas: a.recetas.map(x => ({ codigo: x.codigo, tipo: x.tipo, estado: x.estado, fecha: x.fecha, items: parse(x.itemsJson), prescriptor: vetName(x.vet) })) });
}));
r.patch('/mascotas/:id/perdido', h(async (req, res) => {
  const a = await prisma.animal.findFirst({ where: { id: Number(req.params.id), tutorId: tid(req) } });
  if (!a) return fail(res, 404, 'No encontrado.');
  ok(res, await prisma.animal.update({ where: { id: a.id }, data: { perdido: !!req.body?.perdido } }));
}));

r.get('/turnos', h(async (req, res) => {
  const list = await prisma.turno.findMany({ where: { animal: { tutorId: tid(req) }, inicio: { gte: new Date(Date.now() - 864e5) } }, include: { est: true, vet: true, servicio: true, animal: true }, orderBy: { inicio: 'asc' } });
  ok(res, list.map(t => ({ id: t.id, inicio: t.inicio, estado: t.estado, establecimiento: { nombre: t.est.nombre, direccion: t.est.direccion, codigo: t.est.codigo }, profesional: vetName(t.vet), servicio: t.servicio?.nombre, mascota: t.animal?.nombre })));
}));
r.patch('/turnos/:id/cancelar', h(async (req, res) => {
  const t = await prisma.turno.findFirst({ where: { id: Number(req.params.id), animal: { tutorId: tid(req) } } });
  if (!t) return fail(res, 404, 'Turno no encontrado.');
  ok(res, await prisma.turno.update({ where: { id: t.id }, data: { estado: 'cancelado' } }));
}));

r.get('/mensajes', h(async (req, res) => {
  const msgs = await prisma.mensaje.findMany({ where: { tutorId: tid(req) }, include: { est: true }, orderBy: { fecha: 'asc' } });
  const hilos = {};
  for (const m of msgs) (hilos[m.estId] ||= { establecimiento: { id: m.est.id, nombre: m.est.nombre }, mensajes: [] }).mensajes.push({ id: m.id, desdeClinica: m.desdeClinica, texto: m.texto, fecha: m.fecha });
  ok(res, Object.values(hilos));
}));
r.post('/mensajes/:estId', h(async (req, res) => {
  const texto = String(req.body?.texto || '').trim();
  if (!texto) return fail(res, 400, 'Escribí un mensaje.');
  ok(res, await prisma.mensaje.create({ data: { estId: Number(req.params.estId), tutorId: tid(req), desdeClinica: false, texto } }), 201);
}));

export default r;
