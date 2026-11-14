// Entorno de desarrollo independiente de la demo publicada y de backend/.env.
import { spawn } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync, linkSync, rmSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const data = process.env.VETCOLE_CLOUD_DATA_DIR
  ? path.resolve(process.env.VETCOLE_CLOUD_DATA_DIR)
  : path.join(root, '.local/cloud');
const database = path.join(data, 'vetcole.db');
const secretFile = path.join(data, 'jwt-secret');
const command = process.argv[2];
if (!['setup', 'prepare', 'start', 'dev'].includes(command)) {
  throw new Error('Uso: node scripts/cloud.mjs setup|prepare|start|dev');
}
if (Number(process.versions.node.split('.')[0]) < 22) throw new Error('Se requiere Node.js 22 o superior.');
mkdirSync(data, { recursive: true, mode: 0o700 });
try {
  writeFileSync(secretFile, randomBytes(48).toString('hex'), { flag: 'wx', mode: 0o600 });
} catch (error) {
  if (error.code !== 'EEXIST') throw error;
}
const env = {
  ...process.env,
  NODE_ENV: 'development',
  DATABASE_URL: `file:${database}`,
  JWT_SECRET: readFileSync(secretFile, 'utf8').trim(),
  BASE_PATH: '/',
  DEMO_RESET_HOURS: '0',
  RESEED_ON_START: 'false',
  DEMO_NOINDEX: 'true',
  PORT: process.env.PORT || '4000',
};
const children = new Set();
function run(bin, args, cwd = root, childEnv = env) {
  return new Promise((resolve, reject) => {
    const child = spawn(bin, args, { cwd, env: childEnv, stdio: 'inherit' });
    children.add(child);
    child.once('error', reject);
    child.once('exit', (code, signal) => {
      children.delete(child);
      code === 0 ? resolve() : reject(new Error(`${bin} terminó con ${signal || code}`));
    });
  });
}
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => {
  for (const child of children) child.kill(signal);
});
const backend = path.join(root, 'backend');
const prisma = path.join(backend, 'node_modules/prisma/build/index.js');

try {
  if (command === 'setup' || command === 'prepare') {
    if (command === 'setup') {
      await run('npm', ['ci', '--prefix', 'backend']);
      await run('npm', ['ci', '--prefix', 'frontend']);
    }
    await run(process.execPath, [prisma, 'generate'], backend);
    if (!existsSync(database)) {
      // Sembrar sólo una base nueva. Publicarla al terminar evita dejar datos parciales.
      const fresh = path.join(data, `initial-${process.pid}-${randomBytes(6).toString('hex')}.db`);
      const freshEnv = { ...env, DATABASE_URL: `file:${fresh}` };
      try {
        writeFileSync(fresh, '', { flag: 'wx', mode: 0o600 });
        await run(process.execPath, [prisma, 'db', 'push', '--skip-generate'], backend, freshEnv);
        await run(process.execPath, ['prisma/seed.js'], backend, freshEnv);
        linkSync(fresh, database); // Falla si otra preparación ya creó la base: nunca sobrescribe.
      } finally {
        rmSync(fresh, { force: true });
        rmSync(`${fresh}-journal`, { force: true });
      }
    } else {
      console.log('Base existente conservada: no se aplica el esquema ni se recargan los datos.');
    }
    await run('npm', ['run', 'build', '--prefix', 'frontend']);
    console.log('Web y sistema preparados. Ejecutar npm run cloud:start (puerto ' + env.PORT + ').');
  } else {
    if (!existsSync(database)) throw new Error('Primero ejecutar npm run cloud:setup.');
    if (command === 'start') {
      if (!existsSync(path.join(root, 'frontend/dist/index.html'))) throw new Error('Falta compilar: npm run cloud:prepare.');
      await run(process.execPath, ['src/index.js'], backend);
    } else {
      await Promise.all([
        run(process.execPath, ['--watch', 'src/index.js'], backend),
        run(process.execPath, ['node_modules/vite/bin/vite.js', '--host', '0.0.0.0'], path.join(root, 'frontend'), {
          ...env, API_TARGET: `http://127.0.0.1:${env.PORT}`,
        }),
      ]);
    }
  }
} catch (error) {
  for (const child of children) child.kill('SIGTERM');
  console.error(error.message);
  process.exitCode = 1;
}
