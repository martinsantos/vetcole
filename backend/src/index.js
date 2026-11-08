import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { app, BASE_PATH } from './app.js';

const port = Number(process.env.PORT) || 4000;
app.listen(port, () => console.log(`ColVet Digital escuchando en http://localhost:${port}${BASE_PATH}/`));

// Demo pública: vuelve los datos al estado inicial cada N horas (DEMO_RESET_HOURS), para que cada visita empiece prolija.
const horas = Number(process.env.DEMO_RESET_HOURS) || 0;
if (horas > 0) {
  const seed = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../prisma/seed.js');
  setInterval(() => {
    const p = spawn(process.execPath, [seed], { stdio: 'inherit', env: process.env });
    p.on('exit', code => console.log(`Reseteo de la demo terminado (código ${code})`));
  }, horas * 3600 * 1000);
  console.log(`Reseteo automático de datos cada ${horas} h`);
}
