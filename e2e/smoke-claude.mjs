// Prueba de punta a punta de la versión para Claude (sin servidor). Uso: node e2e/smoke-claude.mjs
// Arma la página como la envuelve el visor (doctype + head mínimo), la abre y recorre las 5 aplicaciones.
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
const { chromium } = createRequire(import.meta.url)('playwright');

const page0 = fs.readFileSync(path.resolve('frontend/dist-claude/colvet-digital.html'), 'utf8');
const doc = `<!doctype html><html><head><meta charset=utf8><meta name=viewport content="width=device-width,initial-scale=1,viewport-fit=cover"><style>:root{color-scheme:light}body{margin:0}</style></head><body>${page0}</body></html>`;
const srv = http.createServer((q, r) => { r.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }); r.end(doc); }).listen(0);
const URL0 = `http://localhost:${srv.address().port}/`;
const errors = [], results = [];
const ok = (c, l) => { results.push(c); console.log(c ? 'OK ' : 'XX ', l); };

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1360, height: 900 } });
page.on('pageerror', e => errors.push(e.message));
page.on('console', m => { if (m.type() === 'error' && !/fonts\.g|Failed to load resource/.test(m.text())) errors.push(m.text()); });
await page.route(/^https?:\/\/(?!localhost)/, r => (/fonts\.(googleapis|gstatic)/.test(r.request().url()) ? r.continue() : r.abort())); // como el visor: nada externo salvo fuentes
await page.goto(URL0);
await page.waitForFunction(() => window.__colvetDemo && window.__colvetNav, null, { timeout: 15000 });
const t0 = Date.now();
await page.waitForFunction(() => document.body.innerText.includes('Tablero de guardia'), null, { timeout: 20000 });
console.log(`   primera carga con seed: ${Date.now() - t0} ms`);
const api = (method, p, body, token) => page.evaluate(([method, p, body, token]) => {
  const [path, qs] = p.split('?');
  return window.__colvetDemo.request({ method, path, query: Object.fromEntries(new URLSearchParams(qs || '')), body, headers: token ? { authorization: 'Bearer ' + token } : {} });
}, [method, p, body, token]);
const login = async email => (await api('POST', '/auth/login', { email, password: 'demo1234' })).body.data;
const go = async (p, text) => {
  await page.evaluate(p => window.__colvetNav(p), p); await page.waitForTimeout(350);
  const body = await page.evaluate(() => document.body.innerText);
  ok(!/en construcción|Ruta no encontrada/.test(body) && (!text || body.includes(text)), `pantalla ${p}${text ? ` («${text}»)` : ''}`);
};

// API (mismas reglas que el servidor)
ok((await api('GET', '/public/vets')).body.data.every(v => v.estado === 'Vigente'), 'directorio sólo vigentes');
ok((await api('GET', '/public/guardias')).body.data.sinCobertura.includes('Este'), 'tablero detecta zonas sin cobertura');
const ag = (await api('GET', '/public/agenda/e1')).body.data, slot = ag.dias.flatMap(d => d.slots).find(s => s.libre);
ok((await api('POST', '/public/turnos', { codigo: 'e1', mp: ag.mp, inicio: slot.inicio, tutorNombre: 'E2E' })).status === 201, 'reserva de turno');
ok((await api('POST', '/public/turnos', { codigo: 'e1', mp: ag.mp, inicio: slot.inicio, tutorNombre: 'Otro' })).status === 409, 'no permite doble reserva');
ok((await api('POST', '/public/recetas/RV-2026-000412/dispensar', {})).status === 200 && (await api('POST', '/public/recetas/RV-2026-000412/dispensar', {})).status === 409, 'receta se dispensa una sola vez');
const vet = await login('lucia.ferreyra@demo.colvet'), muni = await login('zoonosis@godoycruz.demo'), tutor = await login('sofia.rios@demo.colvet'), admin = await login('admin@demo.colvet');
ok((await api('GET', '/vet/resumen', null, admin.token)).status === 403 && (await api('GET', '/clinic/tablero')).status === 401, 'roles protegidos');
const prod = (await api('GET', '/clinic/productos', null, vet.token)).body.data.find(p => p.stock > 2);
const venta = await api('POST', '/clinic/ventas', { items: [{ productoId: prod.id, cantidad: 2 }], medioPago: 'Efectivo' }, vet.token);
const prod2 = (await api('GET', '/clinic/productos', null, vet.token)).body.data.find(p => p.id === prod.id);
ok(venta.status === 201 && prod2.stock === prod.stock - 2, 'venta descuenta stock');
const sinStock = await api('POST', '/clinic/ventas', { items: [{ productoId: prod.id, cantidad: 1 }, { productoId: prod.id, cantidad: 99999 }] }, vet.token);
ok(sinStock.status === 409 && (await api('GET', '/clinic/productos', null, vet.token)).body.data.find(p => p.id === prod.id).stock === prod2.stock, 'venta fallida no deja cambios (transacción)');
const luna = (await api('GET', '/clinic/pacientes?q=MZA-000231', null, vet.token)).body.data[0];
await api('POST', `/clinic/pacientes/${luna.id}/eventos`, { tipo: 'vac', titulo: 'Séxtuple E2E', proximo: '2027-11-10' }, vet.token);
ok((await api('GET', `/tutor/mascotas/${luna.id}`, null, tutor.token)).body.data.eventos.some(e => e.titulo === 'Séxtuple E2E')
  && (await api('GET', `/muni/animales/${luna.id}`, null, muni.token)).body.data.eventos.some(e => e.titulo === 'Séxtuple E2E')
  && (await api('GET', '/public/libretas/MZA-000231')).body.data.eventos.some(e => e.titulo === 'Séxtuple E2E'), 'vacuna de la vet llega a tutora, municipio y libreta pública');
const camp = (await api('GET', '/muni/campanias', null, muni.token)).body.data[0];
ok((await api('POST', `/muni/campanias/${camp.id}/sync`, { registros: [{ nombre: 'Firulais', tutorDni: '90000001', antirrabica: true }] }, muni.token)).body.data.sincronizados === 1, 'campaña sin conexión sincroniza');
const asm = (await api('GET', '/vet/asamblea', null, vet.token)).body.data;
await api('POST', '/vet/asamblea/acreditar', {}, vet.token);
ok((await api('POST', '/vet/asamblea/votar', { itemId: asm.items[0].id, opcion: 'si' }, vet.token)).status === 200 && (await api('POST', '/vet/asamblea/votar', { itemId: asm.items[0].id, opcion: 'no' }, vet.token)).status === 409, 'voto único');
const asis = await api('POST', '/public/asistente', { pregunta: '¿hay guardia ahora?' });
ok(asis.status === 200 && /guardia/i.test(asis.body.data.respuesta), 'asistente responde (respaldo sin Claude)');

// Pantallas de las 5 aplicaciones
for (const [p, t] of [['/', 'Tablero de guardia'], ['/directorio', ''], ['/mapa', ''], ['/guardias', 'SIN COBERTURA'], ['/libreta/MZA-000231', 'Luna'], ['/verificar/1342', 'Ferreyra'], ['/verificar/e/e1', 'Parque'], ['/receta/RV-2026-000412', 'RV-2026-000412'], ['/tramites', ''], ['/datos', ''], ['/servicios', ''], ['/identidad-animal', 'Qué dice la norma'], ['/ingresar', 'Lucía Ferreyra']]) await go(p, t);
await page.click('.demobar nav a:has-text("Consultorio")'); await page.waitForTimeout(500);
for (const p of ['/vet', '/vet/credencial', '/vet/establecimiento', '/vet/recetas', '/vet/consultorio', '/vet/consultorio/agenda', '/vet/consultorio/pacientes', `/vet/consultorio/pacientes/${luna.id}`, '/vet/consultorio/ventas', '/vet/consultorio/inventario', '/vet/consultorio/mensajes', '/vet/consultorio/reportes']) await go(p);
await page.click('.demobar nav a:has-text("Colegio")'); await page.waitForTimeout(500);
for (const p of ['/admin', '/admin/matriculados', '/admin/inscripciones', '/admin/guardias', '/admin/salud']) await go(p);
await page.click('.demobar nav a:has-text("Municipio")'); await page.waitForTimeout(500);
for (const p of ['/muni', '/muni/credenciales', `/muni/animales/${luna.id}`, '/muni/campanias', '/muni/configuracion']) await go(p);
await page.click('.demobar nav a:has-text("App tutor/a")'); await page.waitForTimeout(500);
for (const p of ['/tutor', `/tutor/mascotas/${luna.id}`, '/tutor/mensajes']) await go(p);

// Persistencia y reinicio
await page.reload(); await page.waitForFunction(() => window.__colvetDemo, null, { timeout: 15000 });
ok((await api('GET', '/public/libretas/MZA-000231')).body.data.eventos.some(e => e.titulo === 'Séxtuple E2E'), 'los cambios sobreviven a recargar la página');
await page.click('.demobar nav a:has-text("Reiniciar datos")'); await page.waitForTimeout(2500);
ok(!(await api('GET', '/public/libretas/MZA-000231')).body.data.eventos.some(e => e.titulo === 'Séxtuple E2E'), '«Reiniciar datos» vuelve al estado inicial');

// Celular
const m = await browser.newPage({ viewport: { width: 390, height: 844 } });
await m.route(/^https?:\/\/(?!localhost)/, r => (/fonts\.(googleapis|gstatic)/.test(r.request().url()) ? r.continue() : r.abort()));
await m.goto(URL0); await m.waitForFunction(() => document.body.innerText.includes('Tablero de guardia'), null, { timeout: 20000 });
ok(!(await m.evaluate(() => document.documentElement.scrollWidth > 392)), 'celular 390 px sin scroll horizontal');
if (process.env.SHOTS) { await page.evaluate(() => window.__colvetNav('/')); await page.waitForTimeout(600); await page.screenshot({ path: process.env.SHOTS + '/claude-home.png' }); await page.evaluate(() => window.__colvetNav('/mapa')); await page.waitForTimeout(600); await page.screenshot({ path: process.env.SHOTS + '/claude-mapa.png' }); }

await browser.close(); srv.close();
const fails = results.filter(x => !x).length;
console.log(errors.length ? `\nERRORES:\n${[...new Set(errors)].join('\n')}` : '\nSin errores de página ni de consola.');
console.log(`${results.length - fails}/${results.length} verificaciones OK`);
process.exit(fails || errors.length ? 1 : 0);
