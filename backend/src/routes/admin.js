// Administración del Colegio: tablero, padrón (ABM), inscripciones, establecimientos, guardias, dinero y cobranzas, denuncias, salud pública, noticias.
import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { prisma, ok, fail, h, parse, publicEst, zonaOf, ZONAS, addDays, vetName } from '../lib/core.js';
import { authenticate, requireRole } from '../middleware/auth.js';

const r = Router();
r.use(authenticate, requireRole('ADMIN'));
const estInclude = { dt: true, equipo: { include: { vet: true } } };

r.get('/tablero', h(async (req, res) => {
  const [vets, porEstado, pendientes, tramites, inscr, ests, denuncias, cuotas] = await Promise.all([
    prisma.vet.findMany({ select: { departamento: true, estado: true } }),
    prisma.vet.groupBy({ by: ['estado'], _count: true }),
    prisma.cuota.count({ where: { estado: 'Pendiente' } }),
    prisma.tramite.count({ where: { NOT: { estado: 'Resuelto' } } }),
    prisma.inscripcion.count({ where: { etapa: { lt: 4 } } }),
    prisma.establecimiento.count({ where: { NOT: { habilitacion: null } } }),
    prisma.denuncia.count({ where: { NOT: { estado: 'Cerrada' } } }),
    prisma.cuota.findMany({ select: { periodo: true, estado: true, monto: true } }),
  ]);
  const porZona = Object.keys(ZONAS).map(z => ({ zona: z, cantidad: vets.filter(v => zonaOf(v.departamento) === z && v.estado === 'Vigente').length }));
  const periodos = [...new Set(cuotas.map(c => c.periodo))].slice(0, 6).map(p => {
    const cs = cuotas.filter(c => c.periodo === p);
    return { periodo: p, cobrado: cs.filter(c => c.estado === 'Pagada').length / cs.length };
  });
  // Lo que necesita atención hoy, con su acción.
  const hoy = new Date();
  const [inscListas, inspAtrasadas, vencidas, habPorVencer, noAcred, denNuevas] = await Promise.all([
    prisma.inscripcion.count({ where: { etapa: { gte: 2, lt: 4 } } }),
    prisma.inspeccion.count({ where: { estado: 'Programada', programada: { lt: hoy } } }),
    prisma.cuota.findMany({ where: { estado: 'Pendiente', vence: { lt: hoy } }, select: { monto: true, vetId: true } }),
    prisma.establecimiento.count({ where: { venceHab: { gte: hoy, lt: addDays(hoy, 90) } } }),
    prisma.establecimiento.count({ where: { acreditacion: 'No acreditado' } }),
    prisma.denuncia.count({ where: { estado: { in: ['Nueva', 'Recibida'] } } }),
  ]);
  const atencion = [
    inspAtrasadas && { clave: 'insp', n: inspAtrasadas, t: `inspecci${inspAtrasadas > 1 ? 'ones atrasadas' : 'ón atrasada'}`, d: 'Tenían fecha y todavía no se hicieron.', to: '/inspeccion', b: 'Ver agenda', nivel: 'alto' },
    noAcred && { clave: 'noacred', n: noAcred, t: `establecimiento${noAcred > 1 ? 's' : ''} no acreditado${noAcred > 1 ? 's' : ''}`, d: 'Con incumplimientos críticos; esperan reinspección.', to: '/inspeccion/establecimientos', b: 'Ver acreditación', nivel: 'alto' },
    denuncias && { clave: 'den', n: denuncias, t: `denuncia${denuncias > 1 ? 's' : ''} abierta${denuncias > 1 ? 's' : ''}`, d: denNuevas ? `${denNuevas} sin asignar.` : 'En investigación.', to: '/admin/denuncias', b: 'Abrir bandeja', nivel: 'alto' },
    vencidas.length && { clave: 'cuotas', n: new Set(vencidas.map(c => c.vetId)).size, t: 'matriculados con cuotas vencidas', d: `${vencidas.length} cuotas · $ ${vencidas.reduce((t, c) => t + c.monto, 0).toLocaleString('es-AR')}`, to: '/admin/cobranzas', b: 'Enviar recordatorios', nivel: 'medio' },
    inscr && { clave: 'insc', n: inscr, t: `inscripci${inscr > 1 ? 'ones' : 'ón'} en curso`, d: inscListas ? `${inscListas} con documentación para revisar.` : 'Esperan documentación.', to: '/admin/inscripciones', b: 'Revisar', nivel: 'medio' },
    tramites && { clave: 'tram', n: tramites, t: `trámite${tramites > 1 ? 's' : ''} sin resolver`, d: 'Habilitaciones, especialidades y certificados.', to: '/admin/matriculados', b: 'Ver padrón', nivel: 'bajo' },
    habPorVencer && { clave: 'hab', n: habPorVencer, t: `habilitaci${habPorVencer > 1 ? 'ones vencen' : 'ón vence'} en 90 días`, d: 'Conviene programar la renovación.', to: '/inspeccion/establecimientos', b: 'Programar', nivel: 'bajo' },
  ].filter(Boolean);
  ok(res, { atencion, padronPublicado: 877, enDemo: vets.length, porEstado, cuotasPendientes: pendientes, tramitesAbiertos: tramites, inscripciones: inscr, establecimientosHabilitados: ests, denunciasAbiertas: denuncias, porZona, cobranza: periodos });
}));

// ABM de matriculados
const vetOut = v => ({ ...v, especialidades: parse(v.especialidadesJson), especies: parse(v.especiesJson), deuda: (v.cuotas || []).filter(c => c.estado === 'Pendiente').length });
r.get('/vets', h(async (req, res) => {
  const { q = '', estado } = req.query;
  const list = await prisma.vet.findMany({ where: { ...(estado ? { estado } : {}) }, include: { cuotas: true }, orderBy: { apellido: 'asc' } });
  const n = s => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  ok(res, list.filter(v => !q || n(`${v.nombre} ${v.apellido} ${v.mp} ${v.departamento}`).includes(n(q))).map(vetOut));
}));
const cnt = x => (typeof x._count === 'number' ? x._count : x._count?._all ?? 0);
// Ficha completa de un matriculado: todo lo que el Colegio sabe de él/ella en un solo lugar.
r.get('/vets/:mp/ficha', h(async (req, res) => {
  const v = await prisma.vet.findUnique({ where: { mp: Number(req.params.mp) }, include: { cuotas: { orderBy: { vence: 'desc' } }, user: true } });
  if (!v) return fail(res, 404, 'No existe esa matrícula.');
  const desde = addDays(new Date(), -30);
  const [tramites, ests, recetas, nRecetas, eventos, porTipo, turnos30, proxTurnos, casos, pacientes] = await Promise.all([
    prisma.tramite.findMany({ where: { vetId: v.id }, orderBy: { createdAt: 'desc' } }),
    prisma.establecimiento.findMany({ where: { OR: [{ dtId: v.id }, { equipo: { some: { vetId: v.id } } }] }, include: { dt: true, equipo: { include: { vet: true } } } }),
    prisma.receta.findMany({ where: { vetId: v.id }, include: { animal: { select: { nombre: true, libreta: true } } }, orderBy: { fecha: 'desc' }, take: 8 }),
    prisma.receta.count({ where: { vetId: v.id } }),
    prisma.evento.findMany({ where: { vetId: v.id }, include: { animal: { select: { nombre: true, libreta: true, especie: true } } }, orderBy: { fecha: 'desc' }, take: 10 }),
    prisma.evento.groupBy({ by: ['tipo'], where: { vetId: v.id }, _count: true }),
    prisma.turno.count({ where: { vetId: v.id, inicio: { gte: desde, lt: new Date() }, NOT: { estado: 'cancelado' } } }),
    prisma.turno.count({ where: { vetId: v.id, inicio: { gte: new Date() }, NOT: { estado: 'cancelado' } } }),
    prisma.casoEpi.findMany({ where: { vetId: v.id }, orderBy: { createdAt: 'desc' } }),
    prisma.animal.count({ where: { vetCabeceraId: v.id } }),
  ]);
  const pendientes = v.cuotas.filter(c => c.estado === 'Pendiente');
  ok(res, {
    vet: { ...vetOut(v), titulo: vetName(v), usuario: v.user ? { email: v.user.email, rol: v.user.rol } : null, user: undefined, cuotas: undefined },
    deuda: { cuotas: pendientes.length, monto: pendientes.reduce((s, c) => s + c.monto, 0) },
    cuotas: v.cuotas,
    tramites: tramites.map(t => ({ ...t, pasos: parse(t.pasosJson) })),
    establecimientos: ests.map(e => ({ ...publicEst(e), rol: e.dtId === v.id ? 'Director/a técnico/a' : 'Equipo' })),
    recetas: { total: nRecetas, ultimas: recetas },
    registros: { total: porTipo.reduce((s, x) => s + cnt(x), 0), porTipo: Object.fromEntries(porTipo.map(x => [x.tipo, cnt(x)])), ultimos: eventos },
    turnos: { ultimos30: turnos30, proximos: proxTurnos },
    casos,
    pacientesCabecera: pacientes,
  });
}));

r.post('/vets', h(async (req, res) => {
  const b = req.body || {};
  if (!b.mp || !b.nombre || !b.apellido || !b.departamento) return fail(res, 400, 'Matrícula, nombre, apellido y departamento son obligatorios.');
  const v = await prisma.vet.create({ data: { mp: Number(b.mp), nombre: b.nombre, apellido: b.apellido, femenino: !!b.femenino, departamento: b.departamento, especialidadesJson: JSON.stringify(b.especialidades || ['Clínica de pequeños animales']), especiesJson: JSON.stringify(b.especies || ['Perros', 'Gatos']), estado: b.estado || 'Vigente', email: b.email, telefono: b.telefono, dni: b.dni } });
  ok(res, vetOut(v), 201);
}));
r.patch('/vets/:id', h(async (req, res) => {
  const b = req.body || {};
  const data = {};
  for (const k of ['nombre', 'apellido', 'departamento', 'estado', 'email', 'telefono', 'femenino']) if (b[k] !== undefined) data[k] = b[k];
  if (b.especialidades) data.especialidadesJson = JSON.stringify(b.especialidades);
  ok(res, vetOut(await prisma.vet.update({ where: { id: Number(req.params.id) }, data, include: { cuotas: true } })));
}));

// Inscripciones (Ley 7825: el Ministerio otorga la matrícula, el Colegio emite la credencial)
r.get('/inscripciones', h(async (req, res) => ok(res, await prisma.inscripcion.findMany({ orderBy: { createdAt: 'desc' } }))));
r.post('/inscripciones/:id/avanzar', h(async (req, res) => {
  const i = await prisma.inscripcion.findUnique({ where: { id: Number(req.params.id) } });
  if (!i || i.etapa >= 4) return fail(res, 400, 'La inscripción ya está finalizada.');
  const etapa = i.etapa + 1;
  let vet = null;
  if (etapa === 4) {
    const max = await prisma.vet.aggregate({ _max: { mp: true } });
    vet = await prisma.vet.create({ data: { mp: (max._max.mp || 1300) + 1, nombre: i.nombre, apellido: i.apellido, dni: i.dni, email: i.email, femenino: /a$/i.test(i.nombre), departamento: 'Capital', alta: new Date().getFullYear() } });
    await prisma.cuota.create({ data: { vetId: vet.id, periodo: 'Primera cuota', monto: 18500, vence: addDays(new Date(), 30), estado: 'Pendiente' } });
  }
  const upd = await prisma.inscripcion.update({ where: { id: i.id }, data: { etapa, faltante: null } });
  ok(res, { inscripcion: upd, vet });
}));

r.get('/establecimientos', h(async (req, res) => {
  const list = await prisma.establecimiento.findMany({ include: estInclude, orderBy: { nombre: 'asc' } });
  ok(res, list.map(e => publicEst(e)));
}));

// Dinero: recaudación por mes, concepto y medio de pago.
r.get('/dinero', h(async (req, res) => {
  const hoy = new Date(), ini = new Date(hoy.getFullYear(), hoy.getMonth() - 11, 1), mesIni = new Date(hoy.getFullYear(), hoy.getMonth(), 1), anioIni = new Date(hoy.getFullYear(), 0, 1);
  const [cobros, pend, medios] = await Promise.all([
    prisma.cobro.findMany({ where: { fecha: { gte: ini } }, include: { vet: { select: { mp: true, nombre: true, apellido: true } } }, orderBy: { fecha: 'desc' } }),
    prisma.cuota.findMany({ where: { estado: 'Pendiente' } }),
    prisma.medioPago.findMany({ orderBy: { orden: 'asc' } }),
  ]);
  const suma = l => l.reduce((t, c) => t + c.monto, 0);
  const meses = Array.from({ length: 12 }, (_, i) => { const d = new Date(ini.getFullYear(), ini.getMonth() + i, 1); return { key: `${d.getFullYear()}-${d.getMonth()}`, mes: d.toLocaleDateString('es-AR', { month: 'short' }).replace('.', ''), cuotas: 0, otros: 0 }; });
  const porMes = Object.fromEntries(meses.map(m => [m.key, m]));
  const porConcepto = {}, porMedio = {};
  for (const c of cobros) {
    const d = new Date(c.fecha), m = porMes[`${d.getFullYear()}-${d.getMonth()}`];
    if (m) m[c.concepto === 'Cuota de matrícula' ? 'cuotas' : 'otros'] += c.monto;
    porConcepto[c.concepto] = (porConcepto[c.concepto] || 0) + c.monto;
    (porMedio[c.medio] ||= { monto: 0, cantidad: 0, comision: 0 });
    porMedio[c.medio].monto += c.monto; porMedio[c.medio].cantidad++; porMedio[c.medio].comision += c.comision;
  }
  const delMes = cobros.filter(c => new Date(c.fecha) >= mesIni), delAnio = cobros.filter(c => new Date(c.fecha) >= anioIni);
  const vencidas = pend.filter(c => new Date(c.vence) < hoy);
  const vetsConDeuda = new Set(vencidas.map(c => c.vetId)).size, totalVets = await prisma.vet.count({ where: { estado: { in: ['Vigente', 'Suspendida'] } } });
  ok(res, {
    mes: { bruto: suma(delMes), comisiones: delMes.reduce((t, c) => t + c.comision, 0), cobros: delMes.length },
    anio: { bruto: suma(delAnio), comisiones: delAnio.reduce((t, c) => t + c.comision, 0) },
    aAcreditar: suma(cobros.filter(c => c.estado === 'A acreditar')),
    pendiente: { monto: suma(pend), cuotas: pend.length, vencidas: vencidas.length },
    morosidad: totalVets ? Math.round((vetsConDeuda / totalVets) * 100) : 0,
    meses: meses.map(({ key, ...m }) => m),
    porConcepto: Object.entries(porConcepto).map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value),
    porMedio: medios.map(m => ({ ...m, ...(porMedio[m.clave] || { monto: 0, cantidad: 0, comision: 0 }) })),
    movimientos: cobros.slice(0, 80).map(c => ({ ...c, vet: c.vet ? { mp: c.vet.mp, nombre: `${c.vet.apellido}, ${c.vet.nombre}` } : null })),
  });
}));

r.get('/medios-pago', h(async (req, res) => ok(res, await prisma.medioPago.findMany({ orderBy: { orden: 'asc' } }))));
r.patch('/medios-pago/:id', h(async (req, res) => {
  const b = req.body || {}, data = {};
  if (b.activo !== undefined) data.activo = !!b.activo;
  if (b.comisionPct !== undefined) { const v = Number(b.comisionPct); if (!(v >= 0 && v <= 30)) return fail(res, 400, 'La comisión tiene que estar entre 0 y 30 %.'); data.comisionPct = v; }
  if (b.acreditacionDias !== undefined) { const v = Number(b.acreditacionDias); if (!(Number.isInteger(v) && v >= 0 && v <= 60)) return fail(res, 400, 'Los días de acreditación tienen que estar entre 0 y 60.'); data.acreditacionDias = v; }
  if (b.detalle !== undefined) data.detalle = String(b.detalle).slice(0, 120);
  const activos = await prisma.medioPago.count({ where: { activo: true, NOT: { id: Number(req.params.id) } } });
  if (data.activo === false && !activos) return fail(res, 400, 'Tiene que quedar al menos un medio de pago habilitado.');
  ok(res, await prisma.medioPago.update({ where: { id: Number(req.params.id) }, data }));
}));

r.get('/cobranzas', h(async (req, res) => {
  const pend = await prisma.cuota.findMany({ where: { estado: 'Pendiente' }, include: { vet: true }, orderBy: { vence: 'asc' } });
  const pagas = await prisma.cuota.aggregate({ where: { estado: 'Pagada' }, _sum: { monto: true }, _count: true });
  ok(res, { pendientes: pend.map(c => ({ ...c, vet: { mp: c.vet.mp, nombre: `${c.vet.apellido}, ${c.vet.nombre}`, estado: c.vet.estado } })), recaudado: pagas._sum.monto || 0, pagas: pagas._count });
}));

r.get('/denuncias', h(async (req, res) => ok(res, await prisma.denuncia.findMany({ orderBy: { createdAt: 'desc' } }))));
r.patch('/denuncias/:id', h(async (req, res) => ok(res, await prisma.denuncia.update({ where: { id: Number(req.params.id) }, data: { estado: String(req.body?.estado || 'En investigación') } }))));

r.get('/casos', h(async (req, res) => ok(res, await prisma.casoEpi.findMany({ include: { vet: { select: { mp: true, nombre: true, apellido: true } } }, orderBy: { createdAt: 'desc' } }))));

r.post('/noticias', h(async (req, res) => {
  const { titulo, categoria, resumen } = req.body || {};
  if (!titulo) return fail(res, 400, 'Falta el título.');
  ok(res, await prisma.noticia.create({ data: { titulo, categoria: categoria || 'Comunicados', resumen: resumen || '', fecha: new Date() } }), 201);
}));

// Alta de usuario para un municipio que contrata el servicio de zoonosis
r.post('/municipios', h(async (req, res) => {
  const { nombre, nombreCredencial, sigla, color, email } = req.body || {};
  if (!nombre || !email) return fail(res, 400, 'Nombre del municipio y email del responsable son obligatorios.');
  const slug = nombre.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const m = await prisma.municipio.create({ data: { nombre, slug, nombreCredencial: nombreCredencial || 'Credencial Sanitaria Animal', sigla: sigla || 'CSA', color: color || '#2d6b5a' } });
  await prisma.user.create({ data: { email: email.toLowerCase(), password: await bcrypt.hash('demo1234', 8), nombre: `Zoonosis ${nombre}`, rol: 'MUNICIPIO', municipioId: m.id } });
  ok(res, m, 201);
}));
r.get('/municipios', h(async (req, res) => ok(res, await prisma.municipio.findMany({ include: { _count: { select: { animales: true, campanias: true, mordeduras: true } } } }))));

export default r;
