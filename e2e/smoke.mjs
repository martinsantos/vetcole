// Prueba de punta a punta de la demo (Playwright). Uso: node e2e/smoke.mjs [http://localhost:4000]
// Recorre todas las pantallas de las 5 aplicaciones y los flujos que cruzan aplicaciones. Modifica datos: después correr `npm run reseed`.
import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)('playwright'); // instalado global o en el proyecto
const BASE = process.argv[2] || 'http://localhost:4000';
const SHOTS = process.env.SHOTS;
const errors = [], results = [];
const ok = (cond, label) => { results.push([cond, label]); console.log(cond ? 'OK ' : 'XX ', label); };
const api = async (path, opt = {}, token) => { const r = await fetch(BASE + '/api/v1' + path, { ...opt, headers: { 'content-type': 'application/json', ...(token ? { authorization: 'Bearer ' + token } : {}) } }); return (await r.json()).data; };
const tokenOf = async email => api('/auth/login', { method: 'POST', body: JSON.stringify({ email, password: 'demo1234' }) });

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1360, height: 900 } });
const page = await ctx.newPage();
page.on('pageerror', e => errors.push(`${page.url()} → ${e.message}`));
page.on('console', m => { if (m.type() === 'error' && !/cartocdn|fonts\.g|Failed to load resource/.test(m.text())) errors.push(`${page.url()} → ${m.text()}`); });
const asUser = async email => { const { token, user } = await tokenOf(email); await page.goto(BASE + '/'); await page.evaluate(([t, u]) => localStorage.setItem('colvet-auth', JSON.stringify({ state: { token: t, user: u, clinicId: null }, version: 0 })), [token, user]); return token; };
const visit = async (path, expectText) => {
  await page.goto(BASE + path, { waitUntil: 'networkidle' }).catch(() => {});
  await page.waitForTimeout(250);
  const body = await page.textContent('body');
  ok(!/en construcción/.test(body) && (!expectText || body.includes(expectText)), `ruta ${path}${expectText ? ` («${expectText}»)` : ''}`);
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/${path.replace(/[/?=]/g, '_') || 'home'}.png` });
};

// 1) Sitio público
for (const [p, t] of [['/', 'Tablero de guardia'], ['/directorio', ''], ['/directorio?turnos=1', ''], ['/mapa', ''], ['/guardias', 'SIN COBERTURA'], ['/libreta', ''], ['/libreta/MZA-000231', 'Luna'], ['/libreta/EQ-000017', 'Tormenta'], ['/verificar/1342', 'Ferreyra'], ['/verificar/552', ''], ['/verificar/e/e1', 'Consultorio Veterinario Parque'], ['/receta/RV-2026-000412', 'RV-2026-000412'], ['/tramites', ''], ['/inscripcion', ''], ['/institucional', ''], ['/noticias', 'Masterclass'], ['/viajar', ''], ['/datos', ''], ['/servicios', ''], ['/ingresar', 'Lucía Ferreyra']]) await visit(p, t);

// 2) Tutora reserva un turno online → aparece en la agenda del consultorio
const tVet = (await tokenOf('lucia.ferreyra@demo.colvet')).token;
const ag = await api('/public/agenda/e1');
const slot = ag.dias.flatMap(d => d.slots).find(s => s.libre);
const reserva = await api('/public/turnos', { method: 'POST', body: JSON.stringify({ codigo: 'e1', mp: ag.mp, inicio: slot.inicio, tutorNombre: 'Prueba E2E', mascota: 'Firulais E2E' }) });
const desde = new Date(slot.inicio); desde.setHours(0, 0, 0, 0);
const agenda = await api(`/clinic/turnos?desde=${desde.toISOString()}&hasta=${new Date(+desde + 864e5).toISOString()}`, {}, tVet);
ok(reserva?.id && agenda.some(t => t.id === reserva.id && t.origen === 'web'), 'turno reservado en la web aparece en la agenda del consultorio');

// 3) Veterinaria vacuna → lo ven la tutora, el municipio y la libreta pública
const luna = (await api('/clinic/pacientes?q=MZA-000231', {}, tVet))[0];
await api(`/clinic/pacientes/${luna.id}/eventos`, { method: 'POST', body: JSON.stringify({ tipo: 'vac', titulo: 'Séxtuple E2E', proximo: '2027-11-10', sticker: true }) }, tVet);
const tTutor = (await tokenOf('sofia.rios@demo.colvet')).token, tMuni = (await tokenOf('zoonosis@godoycruz.demo')).token;
ok((await api(`/tutor/mascotas/${luna.id}`, {}, tTutor)).eventos.some(e => e.titulo === 'Séxtuple E2E'), 'vacuna firmada por la vet aparece en la app de la tutora');
ok((await api(`/muni/animales/${luna.id}`, {}, tMuni)).eventos.some(e => e.titulo === 'Séxtuple E2E'), 'vacuna firmada por la vet aparece en el panel del municipio');
ok((await api('/public/libretas/MZA-000231')).eventos.some(e => e.titulo === 'Séxtuple E2E'), 'vacuna aparece en la libreta pública (QR)');

// 4) Guardia declarada por la DT → tablero público
await api('/vet/establecimientos/e1/guardia', { method: 'PATCH', body: JSON.stringify({ guardia: 'activa' }) }, tVet);
ok((await api('/public/guardias')).items.some(e => e.codigo === 'e1' && e.status.code === 'activa'), 'guardia declarada en el portal aparece en el tablero público');
await api('/vet/establecimientos/e1/guardia', { method: 'PATCH', body: JSON.stringify({ guardia: null }) }, tVet);

// 5) Mensaje de la tutora → bandeja del consultorio
const hilos = await api('/tutor/mensajes', {}, tTutor);
await api(`/tutor/mensajes/${hilos[0].establecimiento.id}`, { method: 'POST', body: JSON.stringify({ texto: 'Mensaje E2E' }) }, tTutor);
const tutorId = (await api('/auth/me', {}, tTutor)).tutor.id;
ok((await api(`/clinic/mensajes/${tutorId}`, {}, tVet)).some(m => m.texto === 'Mensaje E2E'), 'mensaje de la tutora llega al consultorio');

// 6) Todas las pantallas de cada rol
await asUser('lucia.ferreyra@demo.colvet');
for (const p of ['/vet', '/vet/credencial', '/vet/cuotas', '/vet/tramites', '/vet/recetas', '/vet/establecimiento', '/vet/casos', '/vet/asamblea', '/vet/ficha', '/vet/consultorio', '/vet/consultorio/agenda', '/vet/consultorio/pacientes', `/vet/consultorio/pacientes/${luna.id}`, '/vet/consultorio/clientes', '/vet/consultorio/ventas', '/vet/consultorio/caja', '/vet/consultorio/inventario', '/vet/consultorio/proveedores', '/vet/consultorio/cuentas', '/vet/consultorio/mensajes', '/vet/consultorio/recordatorios', '/vet/consultorio/reportes']) await visit(p);
await asUser('admin@demo.colvet');
for (const p of ['/admin', '/admin/matriculados', '/admin/inscripciones', '/admin/establecimientos', '/admin/guardias', '/admin/cobranzas', '/admin/denuncias', '/admin/salud', '/admin/asamblea', '/admin/comunicaciones', '/admin/municipios']) await visit(p);
await asUser('zoonosis@godoycruz.demo');
for (const p of ['/muni', '/muni/credenciales', `/muni/animales/${luna.id}`, '/muni/campanias', '/muni/mordeduras', '/muni/peligrosos', '/muni/configuracion']) await visit(p);
await asUser('sofia.rios@demo.colvet');
for (const p of ['/tutor', `/tutor/mascotas/${luna.id}`, '/tutor/turnos', '/tutor/mensajes', '/tutor/perfil']) await visit(p);

// 7) Barra de demo: cambiar de rol en un clic
await page.goto(BASE + '/'); await page.click('.demobar nav a:has-text("Municipio")'); await page.waitForURL('**/muni**');
ok(page.url().includes('/muni'), 'barra de demo cambia de rol (municipio)');

// 8) Celular: sin scroll horizontal
const m = await browser.newPage({ viewport: { width: 390, height: 844 } });
let wide = [];
for (const p of ['/', '/guardias', '/libreta/MZA-000231', '/directorio']) { await m.goto(BASE + p, { waitUntil: 'networkidle' }).catch(() => {}); if (await m.evaluate(() => document.documentElement.scrollWidth > 392)) wide.push(p); }
ok(!wide.length, `celular 390 px sin scroll horizontal ${wide.join(' ')}`);

await browser.close();
const fails = results.filter(r => !r[0]).length;
console.log(errors.length ? `\nERRORES DE PÁGINA:\n${errors.join('\n')}` : '\nSin errores de página ni de consola.');
console.log(`${results.length - fails}/${results.length} verificaciones OK`);
process.exit(fails || errors.length ? 1 : 0);
