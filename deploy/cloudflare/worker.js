// Cloudflare Worker: publica la demo en www.ultimamilla.com.ar/casos/vetcole/* aunque el sitio principal
// esté en otro hosting (p. ej. Cloudflare Pages). Reenvía esa subruta al servidor donde corre el contenedor.
// ORIGIN se define en wrangler.toml, p. ej. https://vetcole.umdev.com.ar (sin barra final).
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === '/casos/vetcole') return Response.redirect(`${url.origin}/casos/vetcole/`, 301);
    const target = new URL(url.pathname + url.search, env.ORIGIN);
    const req = new Request(target, request);
    req.headers.set('X-Forwarded-Host', url.host);
    req.headers.set('X-Forwarded-Proto', 'https');
    return fetch(req, { redirect: 'manual' });
  },
};
