// ColVet Digital — aplicación Express (separada de index.js para poder testearla).
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

export const app = express();
const API = '/api/v1';
app.use(express.json({ limit: '1mb' }));

// Igual que Psicole: CORS abierto sólo para la API pública.
app.use(`${API}/public`, cors({ origin: '*', methods: ['GET', 'POST', 'OPTIONS'] }), publicRoutes);
app.use(cors());
app.use(`${API}/auth`, authRoutes);
app.use(`${API}/vet`, vetRoutes);
app.use(`${API}/clinic`, clinicRoutes);
app.use(`${API}/admin`, adminRoutes);
app.use(`${API}/muni`, muniRoutes);
app.use(`${API}/tutor`, tutorRoutes);
app.get(`${API}/health`, (req, res) => res.json({ success: true, data: { ok: true, time: new Date() } }));
app.use(API, (req, res) => res.status(404).json({ success: false, message: 'Ruta no encontrada.' }));

// En producción sirve el frontend compilado (un solo puerto).
const dist = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../frontend/dist');
if (fs.existsSync(dist)) {
  app.use(express.static(dist));
  app.get('*', (req, res) => res.sendFile(path.join(dist, 'index.html')));
}
