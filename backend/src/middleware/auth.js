// JWT + RBAC, mismo patrón que Psicole: authenticate → requireRole → controller.
import jwt from 'jsonwebtoken';
import { prisma, fail } from '../lib/core.js';

const SECRET = process.env.JWT_SECRET || 'colvet-demo-secret';

export const signToken = user => jwt.sign({ sub: user.id, rol: user.rol }, SECRET, { expiresIn: '12h' });

export async function authenticate(req, res, next) {
  const hdr = req.headers.authorization || '';
  const token = hdr.startsWith('Bearer ') ? hdr.slice(7) : null;
  if (!token) return fail(res, 401, 'Necesitás iniciar sesión.');
  try {
    const payload = jwt.verify(token, SECRET);
    const user = await prisma.user.findUnique({ where: { id: payload.sub }, include: { vet: true, municipio: true, tutor: true } });
    if (!user) return fail(res, 401, 'Sesión inválida.');
    req.user = user;
    next();
  } catch {
    fail(res, 401, 'Sesión vencida. Volvé a ingresar.');
  }
}

export const requireRole = (...roles) => (req, res, next) =>
  roles.includes(req.user?.rol) ? next() : fail(res, 403, 'No tenés permiso para esta sección.');

// Resuelve el establecimiento (consultorio) donde trabaja el veterinario: el que dirige o, si no, el primero de su equipo.
export async function requireClinic(req, res, next) {
  const vetId = req.user?.vetId;
  if (!vetId) return fail(res, 403, 'Sólo para profesionales.');
  const wanted = Number(req.headers['x-establecimiento']) || null;
  const links = await prisma.equipoVet.findMany({ where: { vetId }, include: { est: true } });
  const dirige = await prisma.establecimiento.findMany({ where: { dtId: vetId } });
  const all = [...dirige, ...links.map(l => l.est)].filter((e, i, a) => a.findIndex(x => x.id === e.id) === i);
  if (!all.length) return fail(res, 403, 'No estás vinculado/a a ningún establecimiento.');
  req.clinic = all.find(e => e.id === wanted) || all[0];
  req.clinics = all;
  next();
}
