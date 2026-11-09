// Utilidades compartidas: cliente Prisma, respuestas, fechas, estado de guardias y serialización.
import { PrismaClient } from '@prisma/client';

export const prisma = new PrismaClient();

// Formato de respuesta igual que Psicole: { success, data?, message? }
export const ok = (res, data, status = 200) => res.status(status).json({ success: true, data });
export const fail = (res, status, message) => res.status(status).json({ success: false, message });

// Envuelve handlers async y traduce errores conocidos de Prisma.
export const h = fn => async (req, res) => {
  try {
    await fn(req, res);
  } catch (e) {
    if (e.code === 'P2002') return fail(res, 409, 'Ya existe un registro con ese valor único.');
    if (e.code === 'P2025') return fail(res, 404, 'No encontrado.');
    if (e.status) return fail(res, e.status, e.message);
    console.error(e);
    fail(res, 500, e.message || 'Error interno');
  }
};
export const httpError = (status, message) => Object.assign(new Error(message), { status });

export const parse = (s, d = []) => { try { return JSON.parse(s); } catch { return d; } };
export const num = v => (v === undefined || v === null || v === '' ? undefined : Number(v));

export const ZONAS = {
  'Gran Mendoza': ['Capital', 'Godoy Cruz', 'Guaymallén', 'Las Heras', 'Luján de Cuyo', 'Maipú', 'Lavalle'],
  'Este': ['San Martín', 'Rivadavia', 'Junín', 'Santa Rosa', 'La Paz'],
  'Valle de Uco': ['Tunuyán', 'Tupungato', 'San Carlos'],
  'Sur': ['San Rafael', 'General Alvear', 'Malargüe'],
};
export const DEPTOS = Object.values(ZONAS).flat();
export const zonaOf = dep => Object.keys(ZONAS).find(z => ZONAS[z].includes(dep)) || null;

// Estado de atención de un establecimiento en un momento dado.
export function openStatus(e, now = new Date()) {
  const wd = now.getDay(), hr = now.getHours() + now.getMinutes() / 60;
  if (e.guardia === 'activa') {
    if (e.guardiaDias && !e.guardiaDias.split(',').map(Number).includes(wd)) return { open: false, code: 'cerrada', label: 'Guardia activa sólo vie. y sáb.' };
    return { open: true, code: 'activa', label: 'Guardia activa · abierto ahora' };
  }
  if (e.guardia === 'pasiva') {
    if (e.guardiaNota && e.guardiaNota.includes('0 h') && hr < 8) return { open: false, code: 'cerrada', label: 'Guardia pasiva hasta 0 h' };
    return { open: true, code: 'pasiva', label: 'Guardia pasiva · llamar antes' };
  }
  const open = (wd >= 1 && wd <= 5 && ((hr >= 9 && hr < 13) || (hr >= 17 && hr < 21))) || (wd === 6 && hr >= 9 && hr < 13);
  return open ? { open: true, code: 'abierto', label: 'Abierto ahora' } : { open: false, code: 'cerrado', label: 'Cerrado ahora' };
}

export const vetName = v => (v ? `${v.femenino ? 'Dra.' : 'Dr.'} ${v.nombre} ${v.apellido}` : null);

// Serializa un veterinario para vistas públicas (sin datos privados).
export const publicVet = v => ({
  mp: v.mp,
  nombre: `${v.nombre} ${v.apellido}`,
  titulo: vetName(v),
  femenino: v.femenino,
  departamento: v.departamento,
  zona: zonaOf(v.departamento),
  especialidades: parse(v.especialidadesJson),
  especies: parse(v.especiesJson),
  estado: v.estado,
  domicilio: v.domicilio,
  turnosOnline: v.turnosOnline,
  bio: v.bio,
  foto: v.foto || null,
  telefono: v.telefono,
  establecimientos: (v.equipos || []).map(q => q.est && { codigo: q.est.codigo, nombre: q.est.nombre, direccion: q.est.direccion, departamento: q.est.departamento }).filter(Boolean),
});

export const publicEst = (e, now = new Date()) => ({
  id: e.id,
  codigo: e.codigo,
  nombre: e.nombre,
  tipo: e.tipo,
  direccion: e.direccion,
  departamento: e.departamento,
  zona: zonaOf(e.departamento),
  lat: e.lat,
  lng: e.lng,
  telefono: e.telefono,
  guardia: e.guardia,
  guardiaNota: e.guardiaNota,
  guardiaDias: e.guardiaDias,
  especies: parse(e.especiesJson),
  turnosOnline: e.turnosOnline,
  real: e.real,
  habilitacion: e.habilitacion,
  venceHab: e.venceHab,
  dt: e.dt ? { mp: e.dt.mp, titulo: vetName(e.dt) } : null,
  equipo: (e.equipo || []).map(q => q.vet && { mp: q.vet.mp, titulo: vetName(q.vet), especialidad: parse(q.vet.especialidadesJson)[0], turnosOnline: q.vet.turnosOnline }).filter(Boolean),
  status: openStatus(e, now),
});

// Estado sanitario principal de un animal (antirrábica, o AIE en equinos).
export function estadoSanitario(animal, eventos) {
  const eq = animal.especie === 'Equino';
  const rx = eq ? /AIE/i : /antirr/i;
  const v = eventos.filter(e => e.proximo && rx.test(e.titulo)).sort((a, b) => b.fecha - a.fecha)[0];
  const etiqueta = eq ? 'AIE' : 'Antirrábica';
  if (!v) return { codigo: 'sin', etiqueta: `${etiqueta}: sin registro` };
  const dias = Math.round((new Date(v.proximo) - new Date()) / 864e5);
  if (dias < 0) return { codigo: 'vencida', etiqueta: `${etiqueta} vencida`, vence: v.proximo };
  if (dias < 45) return { codigo: 'por_vencer', etiqueta: `${etiqueta} vence en ${dias} días`, vence: v.proximo };
  return { codigo: 'al_dia', etiqueta: `${etiqueta} al día`, vence: v.proximo };
}

export const startOfDay = (d = new Date()) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
export const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
