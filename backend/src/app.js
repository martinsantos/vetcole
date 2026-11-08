// ColVet Digital — aplicación Express (separada de index.js para poder testearla).
// BASE_PATH permite publicarla bajo una subruta, p. ej. www.ultimamilla.com.ar/casos/vetcole/.
import express from 'express';
import cors from 'cors';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import authRoutes from './routes/auth.js';
import publicRoutes from './routes/public.js';
import vetRoutes from './routes/vet.js';
import clinicRoutes from './routes/clinic.js';
import adminRoutes from './routes/admin.js';
import muniRoutes from './routes/muni.js';
import tutorRoutes from './routes/tutor.js';

export const BASE_PATH = ('/' + String(process.env.BASE_PATH || '/').replace(/^\/+|\/+$/g, '')).replace(/^\/$/, '');

export const app = express();
app.set('trust proxy', true);
app.disable('x-powered-by');
app.use((req, res, next) => {
  res.set({ 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'strict-origin-when-cross-origin' });
  if (process.env.DEMO_NOINDEX !== 'false') res.set('X-Robots-Tag', 'noindex, nofollow');
  next();
});

// Límite simple de intentos de ingreso por IP (la demo es pública).
const intentos = new Map();
const limitarLogin = (req, res, next) => {
  const k = req.ip, now = Date.now(), v = (intentos.get(k) || []).filter(t => now - t < 15 * 60000);
  if (v.length >= 30) return res.status(429).json({ success: false, message: 'Demasiados intentos. Probá en unos minutos.' });
  v.push(now); intentos.set(k, v); next();
};

const root = express.Router();
const API = '/api/v1';
root.use(express.json({ limit: '1mb' }));
// Igual que Psicole: CORS abierto sólo para la API pública.
root.use(`${API}/public`, cors({ origin: '*', methods: ['GET', 'POST', 'OPTIONS'] }), publicRoutes);
root.use(`${API}/auth/login`, limitarLogin);
root.use(`${API}/auth`, authRoutes);
root.use(`${API}/vet`, vetRoutes);
root.use(`${API}/clinic`, clinicRoutes);
root.use(`${API}/admin`, adminRoutes);
root.use(`${API}/muni`, muniRoutes);
root.use(`${API}/tutor`, tutorRoutes);
root.get(`${API}/health`, (req, res) => res.json({ success: true, data: { ok: true, time: new Date(), base: BASE_PATH || '/' } }));
root.use(API, (req, res) => res.status(404).json({ success: false, message: 'Ruta no encontrada.' }));

// Frontend compilado (un solo puerto). index.html sin caché; assets con hash, caché larga.
const dist = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../frontend/dist');
if (fs.existsSync(dist)) {
  root.use('/assets', express.static(path.join(dist, 'assets'), { immutable: true, maxAge: '1y' }));
  root.use(express.static(dist, { index: false, maxAge: '1h' }));
  root.get('*', (req, res) => { res.set('Cache-Control', 'no-cache'); res.sendFile(path.join(dist, 'index.html')); });
}

app.use(BASE_PATH || '/', root);
if (BASE_PATH) app.get('/', (req, res) => res.redirect(302, `${BASE_PATH}/`));
