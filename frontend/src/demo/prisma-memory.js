// Prisma Client en memoria para la versión de la demo que corre dentro de Claude (sin servidor).
// Lee el mismo backend/prisma/schema.prisma y emula el subconjunto de la API de Prisma que usan
// las rutas del backend y el seed: find*, count, create (con create anidado), update(Many), upsert,
// delete(Many), aggregate, groupBy, $transaction, filtros where (incluidos relacionales) e include/select.
import schemaText from '../../../backend/prisma/schema.prisma?raw';

// ───────────── Esquema ─────────────
function parseSchema(text) {
  const models = {};
  const re = /model\s+(\w+)\s*\{([\s\S]*?)\n\}/g;
  let m;
  while ((m = re.exec(text))) {
    const M = { name: m[1], fields: {}, uniques: [] };
    for (let line of m[2].split('\n')) {
      line = line.replace(/\/\/.*$/, '').trim();
      if (!line) continue;
      const block = line.match(/^@@(id|unique)\(\[([^\]]+)\]/);
      if (block) { M.uniques.push(block[2].split(',').map(s => s.trim())); continue; }
      if (line.startsWith('@@')) continue;
      const [name, type, ...rest] = line.split(/\s+/);
      const attrs = rest.join(' ');
      const f = { name, type: type.replace(/[[\]?]/g, ''), list: type.endsWith('[]'), optional: type.endsWith('?'), id: /@id\b/.test(attrs), unique: /@unique\b/.test(attrs) };
      const def = attrs.match(/@default\(((?:[^()]|\([^()]*\))*)\)/);
      if (def) {
        const d = def[1].trim();
        f.default = d === 'autoincrement()' ? { auto: true } : d === 'now()' ? { now: true }
          : /^".*"$/.test(d) ? { value: JSON.parse(d) } : d === 'true' || d === 'false' ? { value: d === 'true' } : { value: Number(d) };
      }
      const rel = attrs.match(/@relation\(([^)]*)\)/);
      if (rel) {
        f.relName = (rel[1].match(/^\s*"([^"]+)"/) || [])[1] || null;
        const fl = rel[1].match(/fields:\s*\[([^\]]+)\]/), rf = rel[1].match(/references:\s*\[([^\]]+)\]/);
        if (fl) { f.fk = fl[1].split(',').map(s => s.trim()); f.refs = rf[1].split(',').map(s => s.trim()); }
      }
      M.fields[name] = f;
      if (f.unique || (f.id && !f.default?.auto)) M.uniques.push([name]);
    }
    models[M.name] = M;
  }
  for (const M of Object.values(models)) {
    for (const f of Object.values(M.fields)) {
      if (!models[f.type]) { f.kind = 'scalar'; continue; }
      f.kind = 'relation';
      if (f.fk) { f.rel = 'owner'; continue; }
      const T = models[f.type];
      f.back = Object.values(T.fields).find(g => g.type === M.name && g.fk && (g.relName || null) === (f.relName || null));
      f.rel = f.list ? 'many' : 'oneBack';
    }
  }
  return models;
}
export const MODELS = parseSchema(schemaText);

// ───────────── Almacén (compartido por todas las instancias de PrismaClient) ─────────────
const STORE = (globalThis.__colvetStore ||= { tables: {}, seq: {} });
for (const name of Object.keys(MODELS)) { STORE.tables[name] ||= []; STORE.seq[name] ||= 0; }
const listeners = new Set();
export const onMutation = fn => { listeners.add(fn); return () => listeners.delete(fn); };
const mutated = () => listeners.forEach(fn => fn());

export function exportState() { return JSON.stringify({ v: 1, tables: STORE.tables, seq: STORE.seq }); }
export function importState(json) {
  const s = JSON.parse(json);
  for (const [name, M] of Object.entries(MODELS)) {
    const dates = Object.values(M.fields).filter(f => f.kind === 'scalar' && f.type === 'DateTime').map(f => f.name);
    STORE.tables[name] = (s.tables[name] || []).map(r => { for (const d of dates) if (r[d] != null) r[d] = new Date(r[d]); return r; });
    STORE.seq[name] = s.seq?.[name] || Math.max(0, ...STORE.tables[name].map(r => r.id || 0));
  }
}
export function clearState() { for (const name of Object.keys(MODELS)) { STORE.tables[name] = []; STORE.seq[name] = 0; } }

// ───────────── Utilidades ─────────────
const prismaError = (code, message) => Object.assign(new Error(message), { code });
const toCmp = v => (v instanceof Date ? v.getTime() : typeof v === 'string' && /^\d{4}-\d\d-\d\dT/.test(v) ? new Date(v).getTime() : v);
const eq = (a, b) => (a == null && b == null) || (a != null && b != null && toCmp(a) === toCmp(b));
const cmp = (a, b) => { const x = toCmp(a), y = toCmp(b); return x < y ? -1 : x > y ? 1 : 0; };
const copy = v => (v instanceof Date ? new Date(v) : v);
const lcFirst = s => s[0].toLowerCase() + s.slice(1);

function related(M, row, f) {
  const rows = STORE.tables[f.type];
  if (f.rel === 'owner') {
    if (f.fk.some(k => row[k] == null)) return null;
    return rows.find(r => f.refs.every((ref, i) => eq(r[ref], row[f.fk[i]]))) || null;
  }
  const b = f.back;
  const list = rows.filter(r => b.fk.every((k, i) => eq(r[k], row[b.refs[i]])));
  return f.rel === 'many' ? list : list[0] || null;
}

function scalarMatch(val, cond) {
  if (cond === null) return val == null;
  if (cond instanceof Date || typeof cond !== 'object') return eq(val, cond);
  for (const [op, x] of Object.entries(cond)) {
    if (x === undefined || op === 'mode') continue;
    switch (op) {
      case 'equals': if (!eq(val, x)) return false; break;
      case 'not': if (x !== null && typeof x === 'object' && !(x instanceof Date)) { if (scalarMatch(val, x)) return false; } else if (eq(val, x)) return false; break;
      case 'in': if (!x.some(y => eq(val, y))) return false; break;
      case 'notIn': if (x.some(y => eq(val, y))) return false; break;
      case 'lt': if (val == null || cmp(val, x) >= 0) return false; break;
      case 'lte': if (val == null || cmp(val, x) > 0) return false; break;
      case 'gt': if (val == null || cmp(val, x) <= 0) return false; break;
      case 'gte': if (val == null || cmp(val, x) < 0) return false; break;
      case 'contains': if (typeof val !== 'string' || !val.includes(x)) return false; break;
      case 'startsWith': if (typeof val !== 'string' || !val.startsWith(x)) return false; break;
      case 'endsWith': if (typeof val !== 'string' || !val.endsWith(x)) return false; break;
      default: throw new Error(`Operador no soportado en la demo: ${op}`);
    }
  }
  return true;
}

function matches(M, row, where) {
  if (!where) return true;
  for (const [k, v] of Object.entries(where)) {
    if (v === undefined) continue;
    if (k === 'AND') { if (!(Array.isArray(v) ? v : [v]).every(w => matches(M, row, w))) return false; continue; }
    if (k === 'OR') { if (!v.some(w => matches(M, row, w))) return false; continue; }
    if (k === 'NOT') { if ((Array.isArray(v) ? v : [v]).some(w => matches(M, row, w))) return false; continue; }
    const f = M.fields[k];
    if (!f) { if (v && typeof v === 'object') { if (!matches(M, row, v)) return false; continue; } throw new Error(`Campo desconocido ${M.name}.${k}`); }
    if (f.kind === 'scalar') { if (!scalarMatch(row[k], v)) return false; continue; }
    const T = MODELS[f.type];
    if (f.rel === 'many') {
      const list = related(M, row, f);
      if (v.some && !list.some(r => matches(T, r, v.some))) return false;
      if (v.every && !list.every(r => matches(T, r, v.every))) return false;
      if (v.none && list.some(r => matches(T, r, v.none))) return false;
      continue;
    }
    const r = related(M, row, f);
    if (v === null) { if (r) return false; continue; }
    if ('isNot' in v) { if (v.isNot === null ? !r : r && matches(T, r, v.isNot)) return false; continue; }
    const c = 'is' in v ? v.is : v;
    if (c === null) { if (r) return false; continue; }
    if (!r || !matches(T, r, c)) return false;
  }
  return true;
}

function sortRows(list, orderBy) {
  if (!orderBy) return list;
  const keys = (Array.isArray(orderBy) ? orderBy : [orderBy]).flatMap(o => Object.entries(o));
  return [...list].sort((a, b) => {
    for (const [k, dir] of keys) {
      const av = a[k], bv = b[k];
      if (av == null && bv == null) continue;
      if (av == null) return dir === 'desc' ? 1 : -1;
      if (bv == null) return dir === 'desc' ? -1 : 1;
      const c = cmp(av, bv);
      if (c) return dir === 'desc' ? -c : c;
    }
    return 0;
  });
}

function countRel(M, row, spec) {
  const out = {};
  for (const [k, on] of Object.entries(spec.select || {})) {
    if (!on) continue;
    let list = related(M, row, M.fields[k]);
    if (on.where) list = list.filter(r => matches(MODELS[M.fields[k].type], r, on.where));
    out[k] = list.length;
  }
  return out;
}

function relProject(M, row, f, spec) {
  const T = MODELS[f.type], opts = spec === true ? {} : spec;
  if (f.rel === 'many') {
    let list = related(M, row, f);
    if (opts.where) list = list.filter(r => matches(T, r, opts.where));
    list = sortRows(list, opts.orderBy);
    if (opts.skip) list = list.slice(opts.skip);
    if (opts.take != null) list = list.slice(0, opts.take);
    return list.map(r => project(T, r, opts));
  }
  const r = related(M, row, f);
  return r ? project(T, r, opts) : null;
}

function project(M, row, args = {}) {
  const out = {};
  if (args.select) {
    for (const [k, v] of Object.entries(args.select)) {
      if (!v) continue;
      if (k === '_count') { out._count = countRel(M, row, v); continue; }
      const f = M.fields[k];
      out[k] = f.kind === 'scalar' ? copy(row[k]) : relProject(M, row, f, v);
    }
    return out;
  }
  for (const f of Object.values(M.fields)) if (f.kind === 'scalar') out[f.name] = copy(row[f.name]);
  for (const [k, v] of Object.entries(args.include || {})) {
    if (!v) continue;
    if (k === '_count') { out._count = countRel(M, row, v); continue; }
    out[k] = relProject(M, row, M.fields[k], v);
  }
  return out;
}

function coerce(f, v) {
  if (v == null) return v ?? null;
  if (f.type === 'DateTime') return v instanceof Date ? new Date(v) : new Date(v);
  if ((f.type === 'Int' || f.type === 'Float') && typeof v === 'string' && v !== '') return Number(v);
  return v;
}

function checkUnique(M, row) {
  const table = STORE.tables[M.name];
  for (const keys of M.uniques) {
    if (keys.some(k => row[k] == null)) continue;
    if (table.some(r => r !== row && keys.every(k => eq(r[k], row[k])))) throw prismaError('P2002', `Unique constraint failed on ${M.name}(${keys.join(', ')})`);
  }
}

// ───────────── Delegado por modelo ─────────────
class Delegate {
  constructor(M) { this.M = M; }
  get table() { return STORE.tables[this.M.name]; }
  rows(where) { return this.table.filter(r => matches(this.M, r, where)); }
  async findMany(a = {}) {
    let list = sortRows(this.rows(a.where), a.orderBy);
    if (a.skip) list = list.slice(a.skip);
    if (a.take != null) list = list.slice(0, a.take);
    return list.map(r => project(this.M, r, a));
  }
  async findFirst(a = {}) { return (await this.findMany({ ...a, take: 1 }))[0] || null; }
  async findUnique(a = {}) { const r = this.rows(a.where)[0]; return r ? project(this.M, r, a) : null; }
  async findUniqueOrThrow(a) { const r = await this.findUnique(a); if (!r) throw prismaError('P2025', 'No encontrado'); return r; }
  async findFirstOrThrow(a) { const r = await this.findFirst(a); if (!r) throw prismaError('P2025', 'No encontrado'); return r; }
  async count(a = {}) { return this.rows(a.where).length; }

  insert(data) {
    const M = this.M, row = {};
    for (const f of Object.values(M.fields)) {
      if (f.kind !== 'scalar') continue;
      if (data[f.name] !== undefined) row[f.name] = coerce(f, data[f.name]);
      else if (f.default?.auto) row[f.name] = ++STORE.seq[M.name];
      else if (f.default?.now) row[f.name] = new Date();
      else if (f.default && 'value' in f.default) row[f.name] = f.default.value;
      else row[f.name] = null;
    }
    if (M.fields.id?.default?.auto && data.id != null) STORE.seq[M.name] = Math.max(STORE.seq[M.name], Number(data.id));
    checkUnique(M, row);
    this.table.push(row);
    // create anidado en relaciones a-muchos: items: { create: [...] }
    for (const [k, v] of Object.entries(data)) {
      const f = M.fields[k];
      if (!f || f.kind !== 'relation' || !v?.create) continue;
      const child = new Delegate(MODELS[f.type]);
      for (const c of Array.isArray(v.create) ? v.create : [v.create]) {
        const fkData = {};
        f.back.fk.forEach((fk, i) => { fkData[fk] = row[f.back.refs[i]]; });
        child.insert({ ...c, ...fkData });
      }
    }
    return row;
  }
  async create(a) { const row = this.insert(a.data); mutated(); return project(this.M, row, a); }

  apply(row, data) {
    for (const [k, v] of Object.entries(data)) {
      if (v === undefined) continue;
      const f = this.M.fields[k];
      if (!f || f.kind !== 'scalar') throw new Error(`Actualización no soportada en la demo: ${this.M.name}.${k}`);
      if (v && typeof v === 'object' && !(v instanceof Date)) {
        if ('increment' in v) row[k] = (row[k] || 0) + Number(v.increment);
        else if ('decrement' in v) row[k] = (row[k] || 0) - Number(v.decrement);
        else if ('multiply' in v) row[k] = (row[k] || 0) * Number(v.multiply);
        else if ('set' in v) row[k] = coerce(f, v.set);
        else throw new Error(`Operación no soportada en la demo: ${JSON.stringify(v)}`);
      } else row[k] = coerce(f, v);
    }
    checkUnique(this.M, row);
  }
  async update(a) {
    const row = this.rows(a.where)[0];
    if (!row) throw prismaError('P2025', `No existe el registro de ${this.M.name} a actualizar`);
    this.apply(row, a.data); mutated();
    return project(this.M, row, a);
  }
  async updateMany(a = {}) { const list = this.rows(a.where); for (const r of list) this.apply(r, a.data); if (list.length) mutated(); return { count: list.length }; }
  async upsert(a) {
    const row = this.rows(a.where)[0];
    if (row) { this.apply(row, a.update || {}); mutated(); return project(this.M, row, a); }
    return this.create({ data: a.create, include: a.include, select: a.select });
  }
  async delete(a) {
    const row = this.rows(a.where)[0];
    if (!row) throw prismaError('P2025', `No existe el registro de ${this.M.name} a borrar`);
    STORE.tables[this.M.name] = this.table.filter(r => r !== row); mutated();
    return project(this.M, row, a);
  }
  async deleteMany(a = {}) {
    const before = this.table.length;
    STORE.tables[this.M.name] = this.table.filter(r => !matches(this.M, r, a.where));
    if (!a.where) STORE.seq[this.M.name] = 0;
    mutated();
    return { count: before - STORE.tables[this.M.name].length };
  }
  agg(list, a) {
    const out = {};
    const num = (k, fn) => { const vals = list.map(r => r[k]).filter(v => v != null); return vals.length ? fn(vals) : null; };
    for (const [op, fn] of [['_max', v => v.reduce((x, y) => (cmp(y, x) > 0 ? y : x))], ['_min', v => v.reduce((x, y) => (cmp(y, x) < 0 ? y : x))], ['_sum', v => v.reduce((x, y) => x + y, 0)], ['_avg', v => v.reduce((x, y) => x + y, 0) / v.length]]) {
      if (!a[op]) continue;
      out[op] = {};
      for (const [k, on] of Object.entries(a[op])) if (on) out[op][k] = num(k, fn);
    }
    if (a._count === true) out._count = list.length;
    else if (a._count) { out._count = {}; for (const [k, on] of Object.entries(a._count)) if (on) out._count[k] = k === '_all' ? list.length : list.filter(r => r[k] != null).length; }
    return out;
  }
  async aggregate(a = {}) { return this.agg(this.rows(a.where), a); }
  async groupBy(a) {
    const groups = new Map();
    for (const r of this.rows(a.where)) {
      const key = JSON.stringify(a.by.map(k => toCmp(r[k])));
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(r);
    }
    return [...groups.values()].map(list => ({ ...this.agg(list, a), ...Object.fromEntries(a.by.map(k => [k, copy(list[0][k])])) }));
  }
}

// ───────────── Cliente ─────────────
export class PrismaClient {
  constructor() {
    for (const M of Object.values(MODELS)) this[lcFirst(M.name)] = new Delegate(M);
  }
  async $connect() {}
  async $disconnect() {}
  async $transaction(arg) {
    if (Array.isArray(arg)) return Promise.all(arg);
    const snapshot = { tables: Object.fromEntries(Object.entries(STORE.tables).map(([k, v]) => [k, v.map(r => ({ ...r }))])), seq: { ...STORE.seq } };
    try { return await arg(this); }
    catch (e) { STORE.tables = Object.assign(STORE.tables, snapshot.tables); STORE.seq = Object.assign(STORE.seq, snapshot.seq); throw e; }
  }
}
export default { PrismaClient };
