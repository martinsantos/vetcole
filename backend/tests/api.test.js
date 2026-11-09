// Tests de integración de la API (node:test). Corren contra una base SQLite propia (test.db) recién sembrada.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { app } from '../src/app.js';

let server, B;
before(async () => { server = app.listen(0); await new Promise(r => server.once('listening', r)); B = `http://localhost:${server.address().port}/api/v1`; });
after(() => server.close());

const call = async (method, path, body, token) => {
  const r = await fetch(B + path, { method, headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) }, body: body ? JSON.stringify(body) : undefined });
  return { status: r.status, ...(await r.json()) };
};
const login = async email => (await call('POST', '/auth/login', { email, password: 'demo1234' })).data.token;

test('público: directorio sólo muestra matrículas vigentes', async () => {
  const r = await call('GET', '/public/vets');
  assert.equal(r.status, 200);
  assert.ok(r.data.length > 10);
  assert.ok(r.data.every(v => v.estado === 'Vigente'));
  assert.equal((await call('GET', '/public/vets/552')).data.estado, 'Suspendida');
  assert.equal((await call('GET', '/public/vets/9999')).status, 404);
});

test('público: tablero de guardia detecta zonas sin cobertura', async () => {
  const r = await call('GET', '/public/guardias');
  assert.ok(r.data.items.length >= 18);
  assert.ok(r.data.sinCobertura.includes('Este'));
});

test('turnos: reservar y evitar doble reserva del mismo horario', async () => {
  const ag = (await call('GET', '/public/agenda/e1')).data;
  const slot = ag.dias.flatMap(d => d.slots).find(s => s.libre);
  const a = await call('POST', '/public/turnos', { codigo: 'e1', mp: ag.mp, inicio: slot.inicio, tutorNombre: 'Test' });
  assert.equal(a.status, 201);
  const b = await call('POST', '/public/turnos', { codigo: 'e1', mp: ag.mp, inicio: slot.inicio, tutorNombre: 'Otro' });
  assert.equal(b.status, 409);
});

test('libreta pública: por número o microchip, sin consultas privadas', async () => {
  const l = await call('GET', '/public/libretas/MZA-000231');
  assert.equal(l.data.nombre, 'Luna');
  assert.ok(l.data.eventos.every(e => e.tipo !== 'con'));
  assert.equal((await call('GET', '/public/libretas/032097000198877')).data.nombre, 'Michi');
});

test('recetas: se dispensan una sola vez', async () => {
  assert.equal((await call('POST', '/public/recetas/RV-2026-000412/dispensar', { farmacia: 'Test' })).status, 200);
  assert.equal((await call('POST', '/public/recetas/RV-2026-000412/dispensar', {})).status, 409);
});

test('roles: cada panel exige su rol', async () => {
  assert.equal((await call('GET', '/clinic/tablero')).status, 401);
  const admin = await login('admin@demo.colvet');
  assert.equal((await call('GET', '/vet/resumen', null, admin)).status, 403);
  assert.equal((await call('GET', '/admin/tablero', null, admin)).status, 200);
});

test('consultorio: venta en cuenta corriente descuenta stock y genera deuda', async () => {
  const t = await login('lucia.ferreyra@demo.colvet');
  const prod = (await call('GET', '/clinic/productos', null, t)).data.find(p => p.stock > 2);
  const cli = (await call('GET', '/clinic/clientes', null, t)).data[0];
  const v = await call('POST', '/clinic/ventas', { items: [{ productoId: prod.id, cantidad: 2 }], clienteId: cli.id, medioPago: 'Cuenta corriente' }, t);
  assert.equal(v.status, 201);
  const prod2 = (await call('GET', '/clinic/productos', null, t)).data.find(p => p.id === prod.id);
  assert.equal(prod2.stock, prod.stock - 2);
  const cli2 = (await call('GET', `/clinic/clientes/${cli.id}`, null, t)).data;
  assert.ok(cli2.saldo >= cli.saldo + v.data.total - 0.01);
  assert.equal((await call('POST', '/clinic/ventas', { items: [{ productoId: prod.id, cantidad: 99999 }] }, t)).status, 409);
});

test('libreta compartida: lo que firma el veterinario lo ve el municipio y el tutor', async () => {
  const t = await login('lucia.ferreyra@demo.colvet');
  const luna = (await call('GET', '/clinic/pacientes?q=MZA-000231', null, t)).data[0];
  const e = await call('POST', `/clinic/pacientes/${luna.id}/eventos`, { tipo: 'des', titulo: 'Desparasitación test integración', proximo: '2027-03-01' }, t);
  assert.equal(e.status, 201);
  const muni = await login('zoonosis@godoycruz.demo');
  const fichaMuni = (await call('GET', `/muni/animales/${luna.id}`, null, muni)).data;
  assert.ok(fichaMuni.eventos.some(x => x.titulo === 'Desparasitación test integración'));
  const tutor = await login('sofia.rios@demo.colvet');
  const fichaTutor = (await call('GET', `/tutor/mascotas/${luna.id}`, null, tutor)).data;
  assert.ok(fichaTutor.eventos.some(x => x.titulo === 'Desparasitación test integración'));
});

test('municipio: campaña sin conexión se sincroniza y crea credenciales', async () => {
  const m = await login('zoonosis@godoycruz.demo');
  const camp = (await call('GET', '/muni/campanias', null, m)).data[0];
  const s = await call('POST', `/muni/campanias/${camp.id}/sync`, { registros: [{ nombre: 'Firulais', tutorDni: '90000001', tutorNombre: 'Test', antirrabica: true }] }, m);
  assert.equal(s.data.sincronizados, 1);
  const lista = (await call('GET', '/muni/animales?q=Firulais', null, m)).data;
  assert.ok(lista[0].credencialNro > 0);
});

test('municipios: el Colegio opera el panel de zoonosis del municipio que elige', async () => {
  const t = await login('admin@demo.colvet');
  const muni = (await call('GET', '/admin/municipios', null, t)).data[0];
  const sin = await fetch(`${B}/muni/config`, { headers: { authorization: `Bearer ${t}` } });
  assert.equal(sin.status, 400);
  const con = await (await fetch(`${B}/muni/config`, { headers: { authorization: `Bearer ${t}`, 'x-municipio': String(muni.id) } })).json();
  assert.equal(con.data.id, muni.id);
  const tutor = await login('sofia.rios@demo.colvet');
  assert.equal((await fetch(`${B}/muni/config`, { headers: { authorization: `Bearer ${tutor}`, 'x-municipio': String(muni.id) } })).status, 403);
});
