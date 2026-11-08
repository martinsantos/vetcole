// Adaptador de axios para la versión en Claude: en vez de ir por la red, cada pedido a /api/v1/... lo atiende
// el servidor en el navegador (demo/server.js). Las respuestas y los errores tienen la misma forma que por HTTP.
import { request } from './server.js';

export async function localAdapter(config) {
  const full = (config.baseURL || '') + (config.url || '');
  const u = new URL(full, 'http://demo.local');
  const query = Object.fromEntries(u.searchParams);
  for (const [k, v] of Object.entries(config.params || {})) if (v !== undefined) query[k] = String(v);
  const path = u.pathname.replace(/^.*?\/api\/v1/, '') || '/';
  let body = config.data;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch { /* texto plano */ } }
  const headers = typeof config.headers?.toJSON === 'function' ? config.headers.toJSON() : { ...config.headers };
  const r = await request({ method: (config.method || 'get').toUpperCase(), path, query, body, headers });
  const response = { data: r.body, status: r.status, statusText: String(r.status), headers: {}, config, request: {} };
  if (r.status >= 400) {
    const err = new Error(r.body?.message || `Error ${r.status}`);
    err.response = response; err.config = config; err.isAxiosError = true;
    throw err;
  }
  return response;
}
