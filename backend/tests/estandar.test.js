// El formato abierto LSAA: lo que entrega la API tiene que validar contra el esquema publicado en /estandar.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import Ajv from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import { app } from '../src/app.js';

const dir = new URL('../../estandar/', import.meta.url);
const schema = JSON.parse(readFileSync(new URL('libreta-sanitaria.schema.json', dir)));
const ajv = new Ajv({ allErrors: true, strict: false }); addFormats(ajv);
const validar = ajv.compile(schema);

let server, B;
before(async () => { server = app.listen(0); await new Promise(r => server.once('listening', r)); B = `http://localhost:${server.address().port}/api/v1`; });
after(() => server.close());

test('estándar: las libretas que exporta la API validan contra el esquema', async () => {
  for (const q of ['MZA-000231', 'MZA-000198', 'EQ-000017', '032097000123456']) {
    const r = await (await fetch(`${B}/public/libretas/${q}/estandar`)).json();
    assert.equal(r.success, true, q);
    assert.ok(validar(r.data), `${q}: ${ajv.errorsText(validar.errors)}`);
    assert.equal(r.data.tutor, undefined, 'el nivel público no incluye datos del tutor');
    assert.ok(r.data.eventos.every(e => e.visibilidad === 'publico'));
  }
});

test('estándar: los ejemplos publicados validan contra el esquema', () => {
  for (const f of readdirSync(new URL('ejemplos/', dir)).filter(f => f.endsWith('.json'))) {
    const doc = JSON.parse(readFileSync(new URL(`ejemplos/${f}`, dir)));
    assert.ok(validar(doc), `${f}: ${ajv.errorsText(validar.errors)}`);
  }
});
