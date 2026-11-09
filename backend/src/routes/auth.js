import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { prisma, ok, fail, h } from '../lib/core.js';
import { authenticate, signToken } from '../middleware/auth.js';

const r = Router();

const shape = u => ({
  id: u.id, email: u.email, nombre: u.nombre, rol: u.rol,
  vet: u.vet ? { id: u.vet.id, mp: u.vet.mp, nombre: u.vet.nombre, apellido: u.vet.apellido, femenino: u.vet.femenino } : null,
  municipio: u.municipio ? { id: u.municipio.id, nombre: u.municipio.nombre, slug: u.municipio.slug, nombreCredencial: u.municipio.nombreCredencial, color: u.municipio.color, sigla: u.municipio.sigla } : null,
  tutor: u.tutor ? { id: u.tutor.id, nombre: u.tutor.nombre, dni: u.tutor.dni } : null,
});

r.post('/login', h(async (req, res) => {
  const { email, password } = req.body || {};
  const u = await prisma.user.findUnique({ where: { email: String(email || '').toLowerCase().trim() }, include: { vet: true, municipio: true, tutor: true } });
  if (!u || !(await bcrypt.compare(String(password || ''), u.password))) return fail(res, 401, 'Email o contraseña incorrectos.');
  ok(res, { token: signToken(u), user: shape(u) });
}));

r.get('/me', authenticate, h(async (req, res) => ok(res, shape(req.user))));

// Cuentas de la demo (sólo para la pantalla de ingreso de la demo).
r.get('/demo-accounts', h(async (req, res) => ok(res, [
  { rol: 'VET', email: 'lucia.ferreyra@demo.colvet', label: 'Veterinaria · Dra. Lucía Ferreyra (MP 1342)', detalle: 'Portal del Colegio + consultorio' },
  { rol: 'ADMIN', email: 'admin@demo.colvet', label: 'Administración del Colegio', detalle: 'Padrón, dinero, inspecciones, municipios' },
  { rol: 'INSPECTOR', email: 'inspeccion@demo.colvet', label: 'Inspectora del Colegio · M.V. Andrea Quiroga', detalle: 'Agenda y formulario de revisión de establecimientos' },
  { rol: 'MUNICIPIO', email: 'zoonosis@godoycruz.demo', label: 'Zoonosis · Municipio de Godoy Cruz', detalle: 'Credenciales, campañas, mordeduras' },
  { rol: 'TUTOR', email: 'sofia.rios@demo.colvet', label: 'Tutora · Sofía Ríos', detalle: 'App: mascotas, turnos, mensajes' },
].map(a => ({ ...a, password: 'demo1234' })))));

export default r;
