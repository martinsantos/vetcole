// Endpoints públicos (sin login): directorio, mapa, guardias, turnos, libreta, verificación, recetas, datos abiertos.
import { aLsaa } from '../lib/estandar.js';
import { Router } from 'express';
import { prisma, ok, fail, h, parse, publicVet, publicEst, openStatus, zonaOf, ZONAS, DEPTOS, estadoSanitario, vetName, startOfDay, addDays } from '../lib/core.js';
import { asistente } from '../lib/asistente.js';

const r = Router();
const estInclude = { dt: true, equipo: { include: { vet: true } } };

r.get('/stats', h(async (req, res) => {
  const [vets, ests, guardias] = await Promise.all([
    prisma.vet.count({ where: { estado: 'Vigente' } }),
    prisma.establecimiento.count(),
    prisma.establecimiento.count({ where: { NOT: { guardia: null } } }),
  ]);
  ok(res, { vets, padronPublicado: 877, establecimientos: ests, guardias, departamentos: DEPTOS.length });
}));

r.get('/noticias', h(async (req, res) => ok(res, await prisma.noticia.findMany({ orderBy: { fecha: 'desc' }, take: Number(req.query.take) || 20 }))));

// Directorio de veterinarios: sólo matrícula vigente y ficha pública activa.
r.get('/vets', h(async (req, res) => {
  const { q = '', especialidad, especie, departamento, domicilio, turnos } = req.query;
  const vets = await prisma.vet.findMany({ where: { estado: 'Vigente', fichaPublica: true }, include: { equipos: { include: { est: true } } }, orderBy: { apellido: 'asc' } });
  const n = s => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const out = vets.map(publicVet).filter(v =>
    (!q || n(`${v.nombre} ${v.mp} ${v.departamento} ${v.especialidades.join(' ')}`).includes(n(q))) &&
    (!especialidad || v.especialidades.includes(especialidad)) &&
    (!especie || v.especies.includes(especie)) &&
    (!departamento || v.departamento === departamento) &&
    (domicilio !== 'true' || v.domicilio) &&
    (turnos !== 'true' || v.turnosOnline));
  ok(res, out);
}));

// Verificación de matrícula (también la usa el QR de la credencial).
r.get('/vets/:mp', h(async (req, res) => {
  const v = await prisma.vet.findUnique({ where: { mp: Number(req.params.mp) || 0 }, include: { equipos: { include: { est: true } } } });
  if (!v) return fail(res, 404, 'Matrícula no encontrada en el padrón.');
  ok(res, { ...publicVet(v), verificadoEn: new Date() });
}));

r.get('/establecimientos', h(async (req, res) => {
  const now = new Date();
  const list = await prisma.establecimiento.findMany({ include: estInclude, orderBy: { nombre: 'asc' } });
  ok(res, list.map(e => publicEst(e, now)));
}));

r.get('/establecimientos/:codigo', h(async (req, res) => {
  const e = await prisma.establecimiento.findUnique({ where: { codigo: req.params.codigo }, include: estInclude });
  if (!e) return fail(res, 404, 'Establecimiento no encontrado.');
  ok(res, { ...publicEst(e), verificadoEn: new Date() });
}));

// Tablero de guardia: estado en vivo y zonas sin cobertura.
r.get('/guardias', h(async (req, res) => {
  const now = new Date();
  const list = (await prisma.establecimiento.findMany({ where: { NOT: { guardia: null } }, include: estInclude })).map(e => publicEst(e, now));
  const rank = e => (e.status.code === 'activa' ? 0 : e.status.code === 'pasiva' ? 1 : 2);
  list.sort((a, b) => rank(a) - rank(b) || Object.keys(ZONAS).indexOf(a.zona) - Object.keys(ZONAS).indexOf(b.zona) || a.departamento.localeCompare(b.departamento));
  const sinCobertura = Object.keys(ZONAS).filter(z => !list.some(e => e.zona === z && e.status.open));
  ok(res, {
    actualizado: now,
    activas: list.filter(e => e.status.code === 'activa').length,
    pasivas: list.filter(e => e.status.code === 'pasiva').length,
    sinCobertura,
    items: list,
  });
}));

// Agenda pública: slots libres de un establecimiento (opcionalmente por profesional) para los próximos días hábiles.
const HORAS = ['09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '12:00', '12:30', '17:00', '17:30', '18:00', '18:30', '19:00', '19:30', '20:00', '20:30'];
export async function slotsLibres(estId, vetId, dias = 6) {
  const desde = addDays(startOfDay(), 1), hasta = addDays(desde, dias + 2);
  const ocupados = await prisma.turno.findMany({ where: { estId, ...(vetId ? { vetId } : {}), inicio: { gte: desde, lt: hasta }, NOT: { estado: 'cancelado' } } });
  const out = [];
  for (let i = 0, d = new Date(desde); out.length < dias; i++, d = addDays(d, 1)) {
    if (d.getDay() === 0) continue;
    const horas = d.getDay() === 6 ? HORAS.slice(0, 8) : HORAS;
    const slots = horas.map(hh => {
      const [H, M] = hh.split(':').map(Number);
      const t = new Date(d); t.setHours(H, M, 0, 0);
      return { hora: hh, inicio: t, libre: !ocupados.some(o => Math.abs(new Date(o.inicio) - t) < 30 * 60000) };
    });
    out.push({ fecha: new Date(d), slots });
  }
  return out;
}

r.get('/agenda/:codigo', h(async (req, res) => {
  const e = await prisma.establecimiento.findUnique({ where: { codigo: req.params.codigo }, include: { equipo: { include: { vet: true } }, servicios: true } });
  if (!e || !e.turnosOnline) return fail(res, 404, 'Este establecimiento no tiene turnos online.');
  const pros = e.equipo.map(q => q.vet).filter(v => v.turnosOnline);
  const vetMp = Number(req.query.mp) || pros[0]?.mp;
  const vet = pros.find(v => v.mp === vetMp) || pros[0];
  ok(res, {
    establecimiento: { codigo: e.codigo, nombre: e.nombre, direccion: e.direccion },
    profesionales: pros.map(v => ({ mp: v.mp, titulo: vetName(v), especialidad: parse(v.especialidadesJson)[0] })),
    servicios: e.servicios.map(s => ({ id: s.id, nombre: s.nombre, duracionMin: s.duracionMin, precio: s.precio })),
    mp: vet?.mp,
    dias: vet ? await slotsLibres(e.id, vet.id) : [],
  });
}));

// Próximo turno libre de cada establecimiento con turnos online (para la home y el mapa).
r.get('/proximos-turnos', h(async (req, res) => {
  const ests = await prisma.establecimiento.findMany({ where: { turnosOnline: true }, include: { equipo: { include: { vet: true } } } });
  const out = [];
  for (const e of ests) {
    const v = e.equipo.map(q => q.vet).find(x => x.turnosOnline);
    if (!v) continue;
    const dias = await slotsLibres(e.id, v.id, 3);
    for (const d of dias) {
      const s = d.slots.find(x => x.libre);
      if (s) { out.push({ codigo: e.codigo, establecimiento: e.nombre, departamento: e.departamento, mp: v.mp, profesional: vetName(v), especialidad: parse(v.especialidadesJson)[0], inicio: s.inicio, hora: s.hora }); break; }
    }
  }
  out.sort((a, b) => new Date(a.inicio) - new Date(b.inicio));
  ok(res, out);
}));

r.post('/turnos', h(async (req, res) => {
  const { codigo, mp, inicio, servicioId, tutorNombre, tutorTel, mascota, motivo } = req.body || {};
  if (!codigo || !mp || !inicio || !tutorNombre) return fail(res, 400, 'Faltan datos: establecimiento, profesional, horario y tu nombre.');
  const e = await prisma.establecimiento.findUnique({ where: { codigo } });
  const v = await prisma.vet.findUnique({ where: { mp: Number(mp) } });
  if (!e || !v || !e.turnosOnline) return fail(res, 400, 'Turno no disponible.');
  const t0 = new Date(inicio);
  const choque = await prisma.turno.findFirst({ where: { estId: e.id, vetId: v.id, inicio: { gt: new Date(t0 - 30 * 60000 + 1), lt: new Date(+t0 + 30 * 60000) }, NOT: { estado: 'cancelado' } } });
  if (choque) return fail(res, 409, 'Ese horario se acaba de ocupar. Elegí otro.');
  const t = await prisma.turno.create({ data: { estId: e.id, vetId: v.id, inicio: t0, servicioId: Number(servicioId) || null, estado: 'pendiente', origen: 'web', tutorNombre, tutorTel, mascota, notas: motivo } });
  ok(res, { id: t.id, inicio: t.inicio, establecimiento: e.nombre, direccion: e.direccion, profesional: vetName(v) }, 201);
}));

// Libreta sanitaria pública: por N° de libreta o microchip. Sin consultas privadas ni datos del tutor.
r.get('/libretas/:q', h(async (req, res) => {
  const q = decodeURIComponent(req.params.q).trim().toUpperCase().replace(/\s/g, '');
  const a = await prisma.animal.findFirst({
    where: { OR: [{ libreta: q }, { microchip: q.replace(/\D/g, '') || '—' }] },
    include: { eventos: { include: { vet: true, municipio: true }, orderBy: { fecha: 'desc' } }, vetCabecera: true, municipio: true, tutor: true },
  });
  if (!a) return fail(res, 404, 'No encontramos esa libreta o microchip.');
  const visibles = ['vac', 'des', 'cas', 'chip', 'lab', 'via'];
  ok(res, {
    libreta: a.libreta, nombre: a.nombre, especie: a.especie, raza: a.raza, sexo: a.sexo, nacimiento: a.nacimiento, pelaje: a.pelaje,
    microchip: a.microchip, castrado: a.castrado, perdido: a.perdido,
    tutorInicial: a.tutor.nombre.split(' ')[0],
    municipio: a.municipio ? { nombre: a.municipio.nombre, credencial: a.municipio.nombreCredencial, sigla: a.municipio.sigla, color: a.municipio.color, nro: a.credencialNro } : null,
    vetCabecera: a.vetCabecera ? { mp: a.vetCabecera.mp, titulo: vetName(a.vetCabecera), turnosOnline: a.vetCabecera.turnosOnline } : null,
    estado: estadoSanitario(a, a.eventos),
    eventos: a.eventos.filter(e => e.publico && visibles.includes(e.tipo)).map(e => ({
      id: e.id, tipo: e.tipo, fecha: e.fecha, titulo: e.titulo, detalle: e.detalle, proximo: e.proximo,
      firma: e.vet ? { mp: e.vet.mp, titulo: vetName(e.vet) } : e.municipio ? { zoonosis: e.municipio.nombre } : null,
    })),
  });
}));

// Libreta en el formato abierto LSAA (nivel público). Especificación: /estandar en el repositorio.
r.get('/libretas/:q/estandar', h(async (req, res) => {
  const q = decodeURIComponent(req.params.q).trim().toUpperCase().replace(/\s/g, '');
  const a = await prisma.animal.findFirst({
    where: { OR: [{ libreta: q }, { microchip: q.replace(/\D/g, '') || '—' }] },
    include: { eventos: { include: { vet: true, municipio: true } }, municipio: true, tutor: true },
  });
  if (!a) return fail(res, 404, 'No encontramos esa libreta o microchip.');
  res.set({ 'Cache-Control': 'public, max-age=120' });
  ok(res, aLsaa(a, 'publico'));
}));

// Aviso "me encontraste": avisa a la familia sin exponer su número.
r.post('/libretas/:libreta/aviso', h(async (req, res) => {
  const a = await prisma.animal.findUnique({ where: { libreta: req.params.libreta } });
  if (!a?.perdido) return fail(res, 400, 'Este animal no está reportado como perdido.');
  ok(res, { enviado: true });
}));

// Recetas: verificación y dispensa por farmacias.
const recetaPublica = rx => ({
  codigo: rx.codigo, tipo: rx.tipo, items: parse(rx.itemsJson), estado: rx.estado, fecha: rx.fecha, vence: rx.vence,
  dispensadaEn: rx.dispensadaEn, farmacia: rx.farmacia,
  prescriptor: { mp: rx.vet.mp, titulo: vetName(rx.vet), vigente: rx.vet.estado === 'Vigente', cannabis: rx.vet.prescriptorCannabis === 'si' },
  paciente: { nombre: rx.animal.nombre, especie: rx.animal.especie, libreta: rx.animal.libreta },
});
r.get('/recetas/:codigo', h(async (req, res) => {
  const rx = await prisma.receta.findUnique({ where: { codigo: req.params.codigo.toUpperCase() }, include: { vet: true, animal: true } });
  if (!rx) return fail(res, 404, 'Receta no encontrada. No la dispenses.');
  ok(res, recetaPublica(rx));
}));
r.post('/recetas/:codigo/dispensar', h(async (req, res) => {
  const rx = await prisma.receta.findUnique({ where: { codigo: req.params.codigo.toUpperCase() }, include: { vet: true, animal: true } });
  if (!rx) return fail(res, 404, 'Receta no encontrada.');
  if (rx.estado === 'Dispensada') return fail(res, 409, `Ya fue dispensada el ${rx.dispensadaEn.toLocaleDateString('es-AR')} en ${rx.farmacia}.`);
  if (rx.vet.estado !== 'Vigente') return fail(res, 409, 'El prescriptor no tiene la matrícula vigente.');
  const upd = await prisma.receta.update({ where: { id: rx.id }, data: { estado: 'Dispensada', dispensadaEn: new Date(), farmacia: req.body?.farmacia || 'Farmacia (demo)' }, include: { vet: true, animal: true } });
  ok(res, recetaPublica(upd));
}));

r.post('/denuncias', h(async (req, res) => {
  const { tipo, lugar, descripcion, anonima } = req.body || {};
  if (!tipo || !lugar) return fail(res, 400, 'Indicá qué querés denunciar y dónde.');
  const n = await prisma.denuncia.count();
  const d = await prisma.denuncia.create({ data: { numero: `D-2026-${String(88 + n).padStart(4, '0')}`, tipo, lugar, descripcion: descripcion || '', origen: anonima ? 'Anónima' : 'Vecino/a' } });
  ok(res, { numero: d.numero }, 201);
}));

// Solicitud de matrícula online: aparece en el tablero de inscripciones de la administración.
r.post('/inscripciones', h(async (req, res) => {
  const { nombre, apellido, dni, email, universidad } = req.body || {};
  if (!nombre || !apellido || !dni || !email) return fail(res, 400, 'Completá nombre, apellido, DNI y email.');
  const i = await prisma.inscripcion.create({ data: { nombre: String(nombre), apellido: String(apellido), dni: String(dni), email: String(email), universidad: String(universidad || 'Sin informar') } });
  ok(res, { id: i.id, numero: `M-2026-${String(140 + i.id).padStart(4, '0')}` }, 201);
}));

r.post('/asistente', h(async (req, res) => ok(res, await asistente(String(req.body?.pregunta || '')))));

// Datos abiertos (agregados, sin datos personales).
r.get('/datos/panel', h(async (req, res) => {
  const dep = DEPTOS.includes(req.query.departamento) ? req.query.departamento : null;
  const desde = addDays(new Date(), -365);
  const where = { fecha: { gte: desde }, ...(dep ? { animal: { tutor: { departamento: dep } } } : {}) };
  const eventos = await prisma.evento.findMany({ where, select: { tipo: true, titulo: true, fecha: true, animal: { select: { especie: true } } } });
  const libretas = await prisma.animal.count({ where: dep ? { tutor: { departamento: dep } } : {} });
  const mordeduras = await prisma.mordedura.count({ where: { fecha: { gte: desde } } });
  const meses = Array.from({ length: 12 }, (_, i) => { const d = new Date(); d.setMonth(d.getMonth() - 11 + i, 1); return { mes: d.toLocaleDateString('es-AR', { month: 'short' }), y: d.getFullYear(), m: d.getMonth(), perros: 0, gatos: 0 }; });
  let antirrabicas = 0, castraciones = 0;
  for (const e of eventos) {
    if (e.tipo === 'cas') castraciones++;
    if (e.tipo === 'vac' && /antirr/i.test(e.titulo)) {
      antirrabicas++;
      const b = meses.find(x => x.y === e.fecha.getFullYear() && x.m === e.fecha.getMonth());
      if (b) e.animal.especie === 'Felino' ? b.gatos++ : b.perros++;
    }
  }
  ok(res, { departamento: dep, libretas, antirrabicas, castraciones, mordeduras, meses });
}));

r.get('/datos/zonas', h(async (req, res) => ok(res, { zonas: ZONAS, zonaOf: DEPTOS.map(d => ({ departamento: d, zona: zonaOf(d) })) })));

export default r;
