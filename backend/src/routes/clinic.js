// Gestión del consultorio (funciones tipo MyVete), con alcance al establecimiento del profesional:
// agenda y turnos por servicio, pacientes e historia clínica (= libreta), clientes, ventas y facturación,
// caja, inventario/pet shop, proveedores y compras, cuentas corrientes, mensajería, recordatorios y reportes.
import { Router } from 'express';
import { prisma, ok, fail, h, parse, vetName, startOfDay, addDays, estadoSanitario, httpError } from '../lib/core.js';
import { authenticate, requireRole, requireClinic } from '../middleware/auth.js';

const r = Router();
r.use(authenticate, requireRole('VET'), requireClinic);

const money = n => Math.round(n * 100) / 100;

r.get('/contexto', h(async (req, res) => ok(res, { actual: { id: req.clinic.id, codigo: req.clinic.codigo, nombre: req.clinic.nombre }, todos: req.clinics.map(e => ({ id: e.id, codigo: e.codigo, nombre: e.nombre })) })));

// ── Tablero del día
r.get('/tablero', h(async (req, res) => {
  const estId = req.clinic.id, hoy = startOfDay(), man = addDays(hoy, 1);
  const [turnos, ventasHoy, productos, recordatorios, mensajes] = await Promise.all([
    prisma.turno.findMany({ where: { estId, inicio: { gte: hoy, lt: man } }, include: { animal: true, servicio: true, vet: true }, orderBy: { inicio: 'asc' } }),
    prisma.venta.findMany({ where: { estId, fecha: { gte: hoy, lt: man } } }),
    prisma.producto.findMany({ where: { estId } }),
    prisma.evento.count({ where: { estId, proximo: { gte: hoy, lt: addDays(hoy, 15) } } }),
    prisma.mensaje.count({ where: { estId, desdeClinica: false, leido: false } }),
  ]);
  const deudores = await saldosClientes(estId);
  ok(res, {
    turnos: turnos.map(turnoOut),
    ventasHoy: { cantidad: ventasHoy.length, total: money(ventasHoy.reduce((s, v) => s + v.total, 0)) },
    stockBajo: productos.filter(p => p.stock <= p.stockMin).map(p => ({ id: p.id, nombre: p.nombre, stock: p.stock, stockMin: p.stockMin })),
    porVencer: productos.filter(p => p.vence && p.vence < addDays(hoy, 60)).map(p => ({ id: p.id, nombre: p.nombre, vence: p.vence })),
    recordatorios, mensajesSinLeer: mensajes,
    cuentasPorCobrar: money(deudores.reduce((s, c) => s + Math.max(0, c.saldo), 0)),
  });
}));

// ── Agenda y turnos
const turnoOut = t => ({
  id: t.id, inicio: t.inicio, duracionMin: t.duracionMin, estado: t.estado, origen: t.origen, notas: t.notas,
  servicio: t.servicio ? { id: t.servicio.id, nombre: t.servicio.nombre, color: t.servicio.color } : null,
  profesional: t.vet ? { mp: t.vet.mp, titulo: vetName(t.vet) } : null,
  paciente: t.animal ? { id: t.animal.id, nombre: t.animal.nombre, especie: t.animal.especie, libreta: t.animal.libreta } : t.mascota ? { nombre: t.mascota } : null,
  tutor: t.animal?.tutor ? { nombre: t.animal.tutor.nombre, telefono: t.animal.tutor.telefono } : { nombre: t.tutorNombre, telefono: t.tutorTel },
});
r.get('/servicios', h(async (req, res) => ok(res, await prisma.servicio.findMany({ where: { estId: req.clinic.id }, orderBy: { nombre: 'asc' } }))));
r.get('/profesionales', h(async (req, res) => {
  const eq = await prisma.equipoVet.findMany({ where: { estId: req.clinic.id }, include: { vet: true } });
  ok(res, eq.map(q => ({ id: q.vet.id, mp: q.vet.mp, titulo: vetName(q.vet), especialidad: parse(q.vet.especialidadesJson)[0] })));
}));
r.get('/turnos', h(async (req, res) => {
  const desde = req.query.desde ? new Date(req.query.desde) : startOfDay();
  const hasta = req.query.hasta ? new Date(req.query.hasta) : addDays(desde, 7);
  const list = await prisma.turno.findMany({ where: { estId: req.clinic.id, inicio: { gte: desde, lt: hasta } }, include: { animal: { include: { tutor: true } }, servicio: true, vet: true }, orderBy: { inicio: 'asc' } });
  ok(res, list.map(turnoOut));
}));
r.post('/turnos', h(async (req, res) => {
  const { inicio, servicioId, animalId, vetMp, notas } = req.body || {};
  if (!inicio) return fail(res, 400, 'Indicá fecha y hora.');
  const srv = servicioId ? await prisma.servicio.findFirst({ where: { id: Number(servicioId), estId: req.clinic.id } }) : null;
  const vet = vetMp ? await prisma.vet.findUnique({ where: { mp: Number(vetMp) } }) : req.user.vet;
  const t = await prisma.turno.create({ data: { estId: req.clinic.id, vetId: vet.id, inicio: new Date(inicio), servicioId: srv?.id, duracionMin: srv?.duracionMin || 30, animalId: Number(animalId) || null, estado: 'confirmado', origen: 'manual', notas }, include: { animal: { include: { tutor: true } }, servicio: true, vet: true } });
  ok(res, turnoOut(t), 201);
}));
r.patch('/turnos/:id', h(async (req, res) => {
  const t = await prisma.turno.findFirst({ where: { id: Number(req.params.id), estId: req.clinic.id } });
  if (!t) return fail(res, 404, 'Turno no encontrado.');
  const data = {};
  if (req.body?.estado) data.estado = req.body.estado;
  if (req.body?.inicio) data.inicio = new Date(req.body.inicio);
  if (req.body?.animalId) data.animalId = Number(req.body.animalId);
  const upd = await prisma.turno.update({ where: { id: t.id }, data, include: { animal: { include: { tutor: true } }, servicio: true, vet: true } });
  ok(res, turnoOut(upd));
}));

// ── Pacientes (la historia clínica ES la libreta: los registros públicos los ve el tutor)
const pacienteResumen = a => ({
  id: a.id, libreta: a.libreta, nombre: a.nombre, especie: a.especie, raza: a.raza, sexo: a.sexo, nacimiento: a.nacimiento,
  microchip: a.microchip, castrado: a.castrado, peso: a.peso, perdido: a.perdido,
  tutor: { id: a.tutor.id, nombre: a.tutor.nombre, dni: a.tutor.dni, telefono: a.tutor.telefono },
  estado: estadoSanitario(a, a.eventos || []),
  ultimo: (a.eventos || [])[0] ? { tipo: a.eventos[0].tipo, titulo: a.eventos[0].titulo, fecha: a.eventos[0].fecha } : null,
});
r.get('/pacientes', h(async (req, res) => {
  const q = String(req.query.q || '').trim();
  const list = await prisma.animal.findMany({
    where: { tutor: { clientes: { some: { estId: req.clinic.id } } } },
    include: { tutor: true, eventos: { orderBy: { fecha: 'desc' } } }, orderBy: { nombre: 'asc' },
  });
  const n = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  ok(res, list.filter(a => !q || n(`${a.nombre} ${a.libreta} ${a.microchip} ${a.tutor.nombre} ${a.tutor.dni}`).includes(n(q))).map(pacienteResumen));
}));
// Buscar cualquier libreta de la provincia (otro consultorio, guardia, zoonosis) para atenderla acá.
r.get('/pacientes/buscar-libreta/:q', h(async (req, res) => {
  const q = req.params.q.toUpperCase().replace(/\s/g, '');
  const a = await prisma.animal.findFirst({ where: { OR: [{ libreta: q }, { microchip: q.replace(/\D/g, '') || '—' }] }, include: { tutor: true, eventos: { orderBy: { fecha: 'desc' } } } });
  if (!a) return fail(res, 404, 'No existe esa libreta en la provincia.');
  ok(res, pacienteResumen(a));
}));
r.post('/pacientes/:id/vincular', h(async (req, res) => {
  const a = await prisma.animal.findUnique({ where: { id: Number(req.params.id) } });
  if (!a) return fail(res, 404, 'No encontrado.');
  await prisma.cliente.upsert({ where: { estId_tutorId: { estId: req.clinic.id, tutorId: a.tutorId } }, update: {}, create: { estId: req.clinic.id, tutorId: a.tutorId } });
  ok(res, { vinculado: true });
}));
r.get('/pacientes/:id', h(async (req, res) => {
  const a = await prisma.animal.findUnique({ where: { id: Number(req.params.id) }, include: { tutor: true, vetCabecera: true, municipio: true, eventos: { include: { vet: true, est: true, municipio: true }, orderBy: { fecha: 'desc' } }, recetas: { include: { vet: true }, orderBy: { fecha: 'desc' } }, turnos: { where: { estId: req.clinic.id }, include: { servicio: true }, orderBy: { inicio: 'desc' }, take: 10 } } });
  if (!a) return fail(res, 404, 'Paciente no encontrado.');
  ok(res, {
    ...pacienteResumen(a), pelaje: a.pelaje, peligroso: a.peligroso, mordedor: a.mordedor,
    municipio: a.municipio ? { nombre: a.municipio.nombre, credencial: a.municipio.nombreCredencial, nro: a.credencialNro } : null,
    vetCabecera: a.vetCabecera ? { mp: a.vetCabecera.mp, titulo: vetName(a.vetCabecera) } : null,
    eventos: a.eventos.map(e => ({ ...e, firma: e.vet ? { mp: e.vet.mp, titulo: vetName(e.vet) } : e.municipio ? { zoonosis: e.municipio.nombre } : null, lugar: e.est?.nombre || (e.municipio ? `Zoonosis ${e.municipio.nombre}` : null), vet: undefined, est: undefined, municipio: undefined })),
    recetas: a.recetas.map(x => ({ codigo: x.codigo, tipo: x.tipo, estado: x.estado, fecha: x.fecha, items: parse(x.itemsJson), prescriptor: vetName(x.vet) })),
    turnos: a.turnos.map(t => ({ id: t.id, inicio: t.inicio, estado: t.estado, servicio: t.servicio?.nombre })),
  });
}));
async function nextLibreta(especie) {
  const pref = especie === 'Equino' ? 'EQ-' : 'MZA-';
  const last = await prisma.animal.findMany({ where: { libreta: { startsWith: pref } }, select: { libreta: true } });
  const max = Math.max(0, ...last.map(x => Number(x.libreta.replace(pref, '')) || 0));
  return pref + String(max + 1).padStart(6, '0');
}
r.post('/pacientes', h(async (req, res) => {
  const b = req.body || {};
  if (!b.nombre || !b.especie || !b.tutor?.dni || !b.tutor?.nombre) return fail(res, 400, 'Completá nombre y especie del animal, y nombre y DNI del tutor/a.');
  const tutor = await prisma.tutor.upsert({ where: { dni: b.tutor.dni }, update: {}, create: { dni: b.tutor.dni, nombre: b.tutor.nombre, telefono: b.tutor.telefono, email: b.tutor.email, departamento: b.tutor.departamento || req.clinic.departamento } });
  await prisma.cliente.upsert({ where: { estId_tutorId: { estId: req.clinic.id, tutorId: tutor.id } }, update: {}, create: { estId: req.clinic.id, tutorId: tutor.id } });
  const a = await prisma.animal.create({ data: { libreta: await nextLibreta(b.especie), nombre: b.nombre, especie: b.especie, raza: b.raza || 'Mestizo', sexo: b.sexo || 'Macho', nacimiento: new Date(b.nacimiento || Date.now()), pelaje: b.pelaje, microchip: b.microchip ? String(b.microchip).replace(/\D/g, '') : null, castrado: !!b.castrado, tutorId: tutor.id, vetCabeceraId: req.user.vetId } });
  if (a.microchip) await prisma.evento.create({ data: { animalId: a.id, tipo: 'chip', fecha: new Date(), titulo: 'Microchip colocado', detalle: a.microchip, vetId: req.user.vetId, estId: req.clinic.id } });
  ok(res, a, 201);
}));
r.patch('/pacientes/:id', h(async (req, res) => {
  const data = {};
  for (const k of ['peso', 'castrado', 'peligroso', 'pelaje', 'raza']) if (req.body?.[k] !== undefined) data[k] = req.body[k];
  ok(res, await prisma.animal.update({ where: { id: Number(req.params.id) }, data }));
}));
// Registro en la historia clínica / libreta, firmado con la matrícula del profesional.
r.post('/pacientes/:id/eventos', h(async (req, res) => {
  const b = req.body || {};
  const a = await prisma.animal.findUnique({ where: { id: Number(req.params.id) } });
  if (!a) return fail(res, 404, 'Paciente no encontrado.');
  if (!['vac', 'des', 'cas', 'chip', 'con', 'lab', 'inc', 'via', 'cir'].includes(b.tipo)) return fail(res, 400, 'Tipo de registro inválido.');
  if (!b.titulo) return fail(res, 400, 'Falta el título del registro.');
  let sticker = null;
  if (b.tipo === 'vac' && b.sticker) { const n = await prisma.evento.count({ where: { NOT: { sticker: null } } }); sticker = `S-${req.user.vet.mp}-${String(232 + n).padStart(6, '0')}`; }
  const e = await prisma.evento.create({ data: {
    animalId: a.id, tipo: b.tipo, fecha: new Date(b.fecha || Date.now()), titulo: b.titulo, detalle: b.detalle, diagnostico: b.diagnostico, tratamiento: b.tratamiento,
    peso: b.peso ? Number(b.peso) : null, temperatura: b.temperatura ? Number(b.temperatura) : null, lote: b.lote, sticker,
    proximo: b.proximo ? new Date(b.proximo) : null, publico: b.publico !== false, vetId: req.user.vetId, estId: req.clinic.id,
  } });
  const upd = {};
  if (b.peso) upd.peso = Number(b.peso);
  if (b.tipo === 'cas') upd.castrado = true;
  if (b.tipo === 'chip' && b.detalle) upd.microchip = String(b.detalle).replace(/\D/g, '');
  if (b.tipo === 'inc' && /mordedura/i.test(b.titulo + b.detalle)) upd.mordedor = true;
  if (Object.keys(upd).length) await prisma.animal.update({ where: { id: a.id }, data: upd });
  ok(res, e, 201);
}));

// ── Clientes
async function saldosClientes(estId) {
  const clientes = await prisma.cliente.findMany({ where: { estId }, include: { tutor: { include: { animales: true } }, movs: true } });
  return clientes.map(c => ({ id: c.id, tutor: { id: c.tutor.id, nombre: c.tutor.nombre, dni: c.tutor.dni, telefono: c.tutor.telefono, email: c.tutor.email }, mascotas: c.tutor.animales.map(a => ({ id: a.id, nombre: a.nombre, especie: a.especie })), saldo: money(c.movs.reduce((s, m) => s + m.debe - m.haber, 0)) }));
}
r.get('/clientes', h(async (req, res) => {
  const q = String(req.query.q || '').toLowerCase();
  ok(res, (await saldosClientes(req.clinic.id)).filter(c => !q || `${c.tutor.nombre} ${c.tutor.dni} ${c.mascotas.map(m => m.nombre).join(' ')}`.toLowerCase().includes(q)).sort((a, b) => a.tutor.nombre.localeCompare(b.tutor.nombre)));
}));
r.get('/clientes/:id', h(async (req, res) => {
  const c = await prisma.cliente.findFirst({ where: { id: Number(req.params.id), estId: req.clinic.id }, include: { tutor: { include: { animales: true } }, movs: { orderBy: { fecha: 'desc' } }, ventas: { include: { items: true }, orderBy: { fecha: 'desc' } } } });
  if (!c) return fail(res, 404, 'Cliente no encontrado.');
  ok(res, { id: c.id, tutor: c.tutor, mascotas: c.tutor.animales, movimientos: c.movs, ventas: c.ventas, saldo: money(c.movs.reduce((s, m) => s + m.debe - m.haber, 0)) });
}));
r.post('/clientes', h(async (req, res) => {
  const { dni, nombre, telefono, email } = req.body || {};
  if (!dni || !nombre) return fail(res, 400, 'Nombre y DNI son obligatorios.');
  const tutor = await prisma.tutor.upsert({ where: { dni }, update: { telefono, email }, create: { dni, nombre, telefono, email, departamento: req.clinic.departamento } });
  ok(res, await prisma.cliente.upsert({ where: { estId_tutorId: { estId: req.clinic.id, tutorId: tutor.id } }, update: {}, create: { estId: req.clinic.id, tutorId: tutor.id } }), 201);
}));
r.post('/clientes/:id/cobro', h(async (req, res) => {
  const c = await prisma.cliente.findFirst({ where: { id: Number(req.params.id), estId: req.clinic.id } });
  const monto = Number(req.body?.monto);
  if (!c || !(monto > 0)) return fail(res, 400, 'Indicá un monto válido.');
  ok(res, await prisma.movCC.create({ data: { estId: req.clinic.id, clienteId: c.id, fecha: new Date(), concepto: `Cobro · ${req.body?.medio || 'Efectivo'}`, haber: monto } }), 201);
}));

// ── Inventario / pet shop
r.get('/productos', h(async (req, res) => ok(res, await prisma.producto.findMany({ where: { estId: req.clinic.id }, orderBy: [{ categoria: 'asc' }, { nombre: 'asc' }] }))));
r.post('/productos', h(async (req, res) => {
  const b = req.body || {};
  if (!b.nombre || b.precio === undefined) return fail(res, 400, 'Nombre y precio son obligatorios.');
  ok(res, await prisma.producto.create({ data: { estId: req.clinic.id, nombre: b.nombre, categoria: b.categoria || 'Accesorios', sku: b.sku || `SKU-${Date.now() % 100000}`, stock: Number(b.stock) || 0, stockMin: Number(b.stockMin) || 0, precio: Number(b.precio), costo: Number(b.costo) || 0, vence: b.vence ? new Date(b.vence) : null } }), 201);
}));
r.patch('/productos/:id', h(async (req, res) => {
  const p = await prisma.producto.findFirst({ where: { id: Number(req.params.id), estId: req.clinic.id } });
  if (!p) return fail(res, 404, 'Producto no encontrado.');
  const data = {};
  for (const k of ['nombre', 'categoria', 'precio', 'costo', 'stockMin']) if (req.body?.[k] !== undefined) data[k] = k === 'nombre' || k === 'categoria' ? req.body[k] : Number(req.body[k]);
  if (req.body?.ajusteStock) data.stock = p.stock + Number(req.body.ajusteStock);
  ok(res, await prisma.producto.update({ where: { id: p.id }, data }));
}));

// ── Ventas y facturación
r.get('/ventas', h(async (req, res) => {
  const desde = req.query.desde ? new Date(req.query.desde) : addDays(startOfDay(), -30);
  ok(res, await prisma.venta.findMany({ where: { estId: req.clinic.id, fecha: { gte: desde } }, include: { items: true, cliente: { include: { tutor: true } } }, orderBy: { fecha: 'desc' } }));
}));
r.post('/ventas', h(async (req, res) => {
  const { items, clienteId, medioPago, comprobante } = req.body || {};
  if (!Array.isArray(items) || !items.length) return fail(res, 400, 'Agregá al menos un ítem.');
  if (medioPago === 'Cuenta corriente' && !clienteId) return fail(res, 400, 'Para vender en cuenta corriente elegí un cliente.');
  const estId = req.clinic.id;
  const venta = await prisma.$transaction(async tx => {
    const lines = [];
    for (const it of items) {
      const cant = Number(it.cantidad) || 1;
      if (it.productoId) {
        const p = await tx.producto.findFirst({ where: { id: Number(it.productoId), estId } });
        if (!p) throw httpError(400, 'Producto inexistente.');
        if (p.stock < cant) throw httpError(409, `Sin stock suficiente de ${p.nombre} (quedan ${p.stock}).`);
        await tx.producto.update({ where: { id: p.id }, data: { stock: { decrement: cant } } });
        lines.push({ productoId: p.id, descripcion: p.nombre, cantidad: cant, precio: it.precio !== undefined ? Number(it.precio) : p.precio });
      } else if (it.servicioId) {
        const s = await tx.servicio.findFirst({ where: { id: Number(it.servicioId), estId } });
        if (!s) throw httpError(400, 'Servicio inexistente.');
        lines.push({ servicioId: s.id, descripcion: s.nombre, cantidad: cant, precio: it.precio !== undefined ? Number(it.precio) : s.precio });
      } else lines.push({ descripcion: String(it.descripcion || 'Ítem'), cantidad: cant, precio: Number(it.precio) || 0 });
    }
    const total = money(lines.reduce((s, l) => s + l.cantidad * l.precio, 0));
    const ultimo = await tx.venta.findFirst({ where: { estId }, orderBy: { numero: 'desc' } });
    const comp = comprobante || 'Factura B';
    const v = await tx.venta.create({ data: { estId, clienteId: Number(clienteId) || null, numero: (ultimo?.numero || 0) + 1, comprobante: comp, fecha: new Date(), total, medioPago: medioPago || 'Efectivo', cae: comp.startsWith('Factura') ? `7${String(Date.now()).slice(-13)}` : null, items: { create: lines } }, include: { items: true } });
    if (medioPago === 'Cuenta corriente') await tx.movCC.create({ data: { estId, clienteId: Number(clienteId), fecha: new Date(), concepto: `${comp} N° ${String(v.numero).padStart(8, '0')}`, debe: total } });
    return v;
  });
  ok(res, venta, 201);
}));
r.get('/caja', h(async (req, res) => {
  const d = req.query.fecha ? startOfDay(new Date(req.query.fecha + 'T12:00:00')) : startOfDay();
  const ventas = await prisma.venta.findMany({ where: { estId: req.clinic.id, fecha: { gte: d, lt: addDays(d, 1) } }, include: { items: true }, orderBy: { fecha: 'asc' } });
  const cobros = await prisma.movCC.findMany({ where: { estId: req.clinic.id, clienteId: { not: null }, haber: { gt: 0 }, fecha: { gte: d, lt: addDays(d, 1) } } });
  const porMedio = {};
  for (const v of ventas) porMedio[v.medioPago] = money((porMedio[v.medioPago] || 0) + v.total);
  ok(res, { fecha: d, ventas, porMedio, cobrosCuentaCorriente: money(cobros.reduce((s, c) => s + c.haber, 0)), total: money(ventas.reduce((s, v) => s + v.total, 0)) });
}));

// ── Proveedores y compras (ingreso de stock + cuenta corriente con proveedores)
r.get('/proveedores', h(async (req, res) => {
  const list = await prisma.proveedor.findMany({ where: { estId: req.clinic.id }, include: { movs: true, compras: { orderBy: { fecha: 'desc' }, take: 5 } }, orderBy: { nombre: 'asc' } });
  ok(res, list.map(p => ({ ...p, saldo: money(p.movs.reduce((s, m) => s + m.debe - m.haber, 0)), movs: undefined })));
}));
r.post('/proveedores', h(async (req, res) => {
  const { nombre, cuit, telefono, rubro } = req.body || {};
  if (!nombre || !cuit) return fail(res, 400, 'Nombre y CUIT son obligatorios.');
  ok(res, await prisma.proveedor.create({ data: { estId: req.clinic.id, nombre, cuit, telefono, rubro: rubro || 'General' } }), 201);
}));
r.post('/compras', h(async (req, res) => {
  const { proveedorId, comprobante, items, pagada } = req.body || {};
  const prov = await prisma.proveedor.findFirst({ where: { id: Number(proveedorId), estId: req.clinic.id } });
  if (!prov || !Array.isArray(items) || !items.length) return fail(res, 400, 'Elegí proveedor e ítems.');
  const compra = await prisma.$transaction(async tx => {
    let total = 0;
    for (const it of items) {
      const p = await tx.producto.findFirst({ where: { id: Number(it.productoId), estId: req.clinic.id } });
      if (!p) throw httpError(400, 'Producto inexistente.');
      const cant = Number(it.cantidad) || 0, costo = Number(it.costo) || p.costo;
      total += cant * costo;
      await tx.producto.update({ where: { id: p.id }, data: { stock: { increment: cant }, costo } });
    }
    total = money(total);
    const c = await tx.compra.create({ data: { estId: req.clinic.id, proveedorId: prov.id, fecha: new Date(), comprobante: comprobante || 'Factura A', total, itemsJson: JSON.stringify(items) } });
    await tx.movCC.create({ data: { estId: req.clinic.id, proveedorId: prov.id, fecha: new Date(), concepto: `Compra ${c.comprobante}`, debe: total } });
    if (pagada) await tx.movCC.create({ data: { estId: req.clinic.id, proveedorId: prov.id, fecha: new Date(), concepto: 'Pago al contado', haber: total } });
    return c;
  });
  ok(res, compra, 201);
}));
r.post('/proveedores/:id/pago', h(async (req, res) => {
  const p = await prisma.proveedor.findFirst({ where: { id: Number(req.params.id), estId: req.clinic.id } });
  const monto = Number(req.body?.monto);
  if (!p || !(monto > 0)) return fail(res, 400, 'Indicá un monto válido.');
  ok(res, await prisma.movCC.create({ data: { estId: req.clinic.id, proveedorId: p.id, fecha: new Date(), concepto: 'Pago a proveedor', haber: monto } }), 201);
}));

// ── Mensajería con tutores (se ve en la app del tutor)
r.get('/mensajes', h(async (req, res) => {
  const msgs = await prisma.mensaje.findMany({ where: { estId: req.clinic.id }, include: { tutor: true }, orderBy: { fecha: 'desc' } });
  const hilos = {};
  for (const m of msgs) {
    if (!hilos[m.tutorId]) hilos[m.tutorId] = { tutor: { id: m.tutor.id, nombre: m.tutor.nombre }, ultimo: m, sinLeer: 0 };
    if (!m.desdeClinica && !m.leido) hilos[m.tutorId].sinLeer++;
  }
  ok(res, Object.values(hilos));
}));
r.get('/mensajes/:tutorId', h(async (req, res) => {
  const tutorId = Number(req.params.tutorId);
  await prisma.mensaje.updateMany({ where: { estId: req.clinic.id, tutorId, desdeClinica: false }, data: { leido: true } });
  ok(res, await prisma.mensaje.findMany({ where: { estId: req.clinic.id, tutorId }, orderBy: { fecha: 'asc' } }));
}));
r.post('/mensajes/:tutorId', h(async (req, res) => {
  const texto = String(req.body?.texto || '').trim();
  if (!texto) return fail(res, 400, 'Escribí un mensaje.');
  ok(res, await prisma.mensaje.create({ data: { estId: req.clinic.id, tutorId: Number(req.params.tutorId), desdeClinica: true, texto } }), 201);
}));

// ── Recordatorios (vacunas, desparasitaciones y controles que vencen)
r.get('/recordatorios', h(async (req, res) => {
  const hoy = startOfDay();
  const ev = await prisma.evento.findMany({ where: { proximo: { gte: addDays(hoy, -30), lt: addDays(hoy, 30) }, animal: { tutor: { clientes: { some: { estId: req.clinic.id } } } } }, include: { animal: { include: { tutor: true } } }, orderBy: { proximo: 'asc' } });
  // sólo el último registro de cada tipo+título por animal
  const vistos = new Set();
  const out = [];
  for (const e of ev.sort((a, b) => b.fecha - a.fecha)) {
    const k = `${e.animalId}|${e.tipo}|${e.titulo}`;
    if (vistos.has(k)) continue;
    vistos.add(k);
    out.push({ id: e.id, tipo: e.tipo, titulo: e.titulo, proximo: e.proximo, vencido: e.proximo < hoy, paciente: { id: e.animal.id, nombre: e.animal.nombre, especie: e.animal.especie }, tutor: { id: e.animal.tutor.id, nombre: e.animal.tutor.nombre, telefono: e.animal.tutor.telefono } });
  }
  ok(res, out.sort((a, b) => new Date(a.proximo) - new Date(b.proximo)));
}));
r.post('/recordatorios/enviar', h(async (req, res) => {
  const ids = (req.body?.ids || []).map(Number);
  const ev = await prisma.evento.findMany({ where: { id: { in: ids } }, include: { animal: true } });
  for (const e of ev) await prisma.mensaje.create({ data: { estId: req.clinic.id, tutorId: e.animal.tutorId, desdeClinica: true, texto: `Recordatorio: a ${e.animal.nombre} le toca ${e.titulo.toLowerCase()} el ${e.proximo.toLocaleDateString('es-AR')}. ¿Te reservamos un turno?` } });
  ok(res, { enviados: ev.length });
}));

// ── Reportes
r.get('/reportes', h(async (req, res) => {
  const desde = addDays(startOfDay(), -180);
  const ventas = await prisma.venta.findMany({ where: { estId: req.clinic.id, fecha: { gte: desde } }, include: { items: true } });
  const meses = Array.from({ length: 6 }, (_, i) => { const d = new Date(); d.setMonth(d.getMonth() - 5 + i, 1); return { mes: d.toLocaleDateString('es-AR', { month: 'short' }), y: d.getFullYear(), m: d.getMonth(), servicios: 0, productos: 0 }; });
  const top = {};
  for (const v of ventas) {
    const b = meses.find(x => x.y === v.fecha.getFullYear() && x.m === v.fecha.getMonth());
    for (const it of v.items) {
      const imp = it.cantidad * it.precio;
      if (b) it.servicioId ? (b.servicios += imp) : (b.productos += imp);
      top[it.descripcion] = (top[it.descripcion] || 0) + imp;
    }
  }
  const turnos = await prisma.turno.groupBy({ by: ['estado'], where: { estId: req.clinic.id, inicio: { gte: desde } }, _count: true });
  ok(res, { meses: meses.map(m => ({ ...m, servicios: money(m.servicios), productos: money(m.productos) })), top: Object.entries(top).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([d, t]) => ({ descripcion: d, total: money(t) })), turnos });
}));

export default r;
