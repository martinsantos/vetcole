// Router compatible con Express para correr las rutas del backend en el navegador.
// Soporta: Router(), use(mw...), get/post/patch/put/delete(path, ...handlers), parámetros :x.
function compile(path) {
  const keys = [];
  const re = new RegExp('^' + path.replace(/\/+$/, '').replace(/:([A-Za-z_]\w*)/g, (_, k) => { keys.push(k); return '([^/]+)'; }) + '/?$');
  return { re, keys };
}
export function Router() {
  const layers = [];
  const add = method => (path, ...fns) => { layers.push({ method, ...compile(path), fns: fns.flat() }); return router; };
  const router = {
    layers,
    use(...fns) { if (typeof fns[0] === 'string') throw new Error('use(path) no soportado en la demo'); layers.push({ method: '*', fns: fns.flat() }); return router; },
    get: add('GET'), post: add('POST'), patch: add('PATCH'), put: add('PUT'), delete: add('DELETE'),
    async handle(req, res) {
      for (const L of layers) {
        if (res.finished) return true;
        let fns = L.fns;
        if (L.method !== '*') {
          if (L.method !== req.method) continue;
          const m = req.path.match(L.re);
          if (!m) continue;
          req.params = Object.fromEntries(L.keys.map((k, i) => [k, decodeURIComponent(m[i + 1])]));
        }
        for (const fn of fns) {
          let nextCalled = false;
          await fn(req, res, () => { nextCalled = true; });
          if (res.finished) return true;
          if (!nextCalled) return true; // handler terminó sin responder ni pasar
        }
      }
      return res.finished;
    },
  };
  return router;
}
const express = () => { throw new Error('express() no disponible en la demo'); };
express.Router = Router;
express.json = () => (req, res, next) => next();
express.static = () => (req, res, next) => next();
export default express;
