// "Servidor" de la demo dentro del navegador: monta las MISMAS rutas del backend (backend/src/routes/*)
// sobre el Prisma en memoria, carga los datos con el MISMO seed y guarda la copia de cada visitante en su navegador.
import './shims/process.js';
import { exportState, importState, clearState, onMutation, PrismaClient } from './prisma-memory.js';
import authRoutes from '../../../backend/src/routes/auth.js';
import publicRoutes from '../../../backend/src/routes/public.js';
import vetRoutes from '../../../backend/src/routes/vet.js';
import clinicRoutes from '../../../backend/src/routes/clinic.js';
import adminRoutes from '../../../backend/src/routes/admin.js';
import muniRoutes from '../../../backend/src/routes/muni.js';
import tutorRoutes from '../../../backend/src/routes/tutor.js';
import { main as seed } from '../../../backend/prisma/seed.js';
import { asistenteClaude } from './asistente.js';

const MOUNTS = [['/public', publicRoutes], ['/auth', authRoutes], ['/vet', vetRoutes], ['/clinic', clinicRoutes], ['/admin', adminRoutes], ['/muni', muniRoutes], ['/tutor', tutorRoutes]];
const KEY = 'colvet-demo-datos-v2'; // subir la versión cuando cambian el modelo o los datos de ejemplo
const store = {
  get() { try { return localStorage.getItem(KEY); } catch { return null; } },
  set(v) { try { localStorage.setItem(KEY, v); return true; } catch { return false; } },
  del() { try { localStorage.removeItem(KEY); } catch { /* sin almacenamiento */ } },
};

let saveTimer = null;
onMutation(() => { clearTimeout(saveTimer); saveTimer = setTimeout(() => store.set(exportState()), 400); });

let ready = null;
export function boot() {
  if (ready) return ready;
  ready = (async () => {
    const saved = store.get();
    if (saved) { try { importState(saved); return { restored: true }; } catch { store.del(); } }
    clearState();
    await seed();
    store.set(exportState());
    return { restored: false };
  })();
  return ready;
}

// Vuelve los datos al estado inicial (botón "Reiniciar demo").
export async function resetDemo() {
  clearTimeout(saveTimer);
  store.del();
  clearState();
  ready = null;
  return boot();
}

export async function request({ method = 'GET', path, query = {}, body, headers = {} }) {
  await boot();
  if (path === '/health') return { status: 200, body: { success: true, data: { ok: true, modo: 'claude' } } };
  if (method === 'POST' && path === '/public/asistente') {
    const r = await asistenteClaude(String(body?.pregunta || ''), fallback);
    if (r) return { status: 200, body: { success: true, data: r } };
  }
  return dispatch({ method, path, query, body, headers });
}

async function dispatch({ method, path, query, body, headers }) {
  const mount = MOUNTS.find(([p]) => path === p || path.startsWith(p + '/'));
  const res = { statusCode: 200, body: undefined, finished: false, headers: {},
    status(c) { this.statusCode = c; return this; },
    json(b) { this.body = b; this.finished = true; return this; },
    set(h) { Object.assign(this.headers, h); return this; },
  };
  if (!mount) return { status: 404, body: { success: false, message: 'Ruta no encontrada.' } };
  const req = { method, path: path.slice(mount[0].length) || '/', query, body: body ?? {}, params: {}, ip: '127.0.0.1',
    headers: Object.fromEntries(Object.entries(headers).map(([k, v]) => [k.toLowerCase(), v])) };
  try {
    await mount[1].handle(req, res);
  } catch (e) {
    console.error(e);
    return { status: 500, body: { success: false, message: e.message } };
  }
  if (!res.finished) return { status: 404, body: { success: false, message: 'Ruta no encontrada.' } };
  // Igual que por HTTP: las fechas viajan como texto ISO.
  return { status: res.statusCode, body: JSON.parse(JSON.stringify(res.body)) };
}
// El asistente con reglas del backend queda como respaldo si Claude no está disponible.
const fallback = pregunta => dispatch({ method: 'POST', path: '/public/asistente', query: {}, body: { pregunta }, headers: {} }).then(r => r.body.data)
  .then(d => ({ ...d, respuesta: d.respuesta.replace(/Podés escribir a .*$/, 'En la versión real acá aparecen los canales oficiales de contacto del Colegio.') }));

export const _debug = { PrismaClient, exportState };
// Acceso para las pruebas automáticas (e2e/smoke-claude.mjs).
if (typeof window !== 'undefined') window.__colvetDemo = { request, resetDemo };
