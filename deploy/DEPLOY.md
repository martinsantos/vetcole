# Publicar la demo en www.ultimamilla.com.ar/casos/vetcole/

La app ya está preparada para vivir bajo esa subruta (`BASE_PATH=/casos/vetcole/`). Sirve el frontend, la API (`/casos/vetcole/api/v1`) y los enlaces directos, por ejemplo los QR de libretas, recetas y credenciales.

`www.ultimamilla.com.ar` pasa por **Cloudflare**, así que hay dos caminos según dónde esté el sitio principal.

## 1. La imagen (automática)

Cada push a `main` dispara `.github/workflows/deploy.yml`:

1. Corre los tests de la API.
2. Construye la imagen con `BASE_PATH=/casos/vetcole/`.
3. La publica en **`ghcr.io/martinsantos/vetcole:latest`**, además de un tag por commit.

Si el paquete queda privado en GHCR, el servidor tiene que hacer `docker login ghcr.io` con un token de lectura de paquetes. Otra opción es hacer público el paquete desde GitHub → Packages → vetcole → Package settings.

## 2. El servidor (una sola vez)

En cualquier servidor con Docker, por ejemplo uno de `umdev.com.ar`:

```bash
sudo mkdir -p /opt/vetcole && cd /opt/vetcole
# copiar deploy/docker-compose.prod.yml y deploy/.env.example de este repo
cp .env.example .env && sed -i "s/^JWT_SECRET=.*/JWT_SECRET=$(openssl rand -hex 32)/" .env
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d
curl -s http://127.0.0.1:4310/casos/vetcole/api/v1/health
```

El contenedor escucha sólo en `127.0.0.1:4310`. La base SQLite queda en el volumen `vetcole-data` y se carga con los datos de demo la primera vez. Además, los datos vuelven al estado inicial cada 24 h (`DEMO_RESET_HOURS`), para que las visitas no dejen la demo desprolija.

## 3. Publicar la subruta (elegí uno)

### Opción A: el sitio principal está en un servidor propio con nginx

Incluí `deploy/nginx/vetcole.location.conf` dentro del `server { }` de `www.ultimamilla.com.ar` y recargá nginx:

```bash
sudo cp vetcole.location.conf /etc/nginx/snippets/
# en el server block:  include snippets/vetcole.location.conf;
sudo nginx -t && sudo systemctl reload nginx
```

nginx **no** recorta el prefijo, porque la app ya lo espera. El contenedor tiene que estar en el mismo servidor; si no, cambiá `127.0.0.1:4310` por la dirección interna correspondiente.

### Opción B: el sitio está en otro hosting (Cloudflare Pages, Netlify, etc.)

Usá el Worker de `deploy/cloudflare/`. Reenvía sólo `www.ultimamilla.com.ar/casos/vetcole*` al servidor donde corre el contenedor, y el resto del sitio no cambia.

1. Publicá el contenedor detrás de un subdominio propio con HTTPS, por ejemplo `vetcole.umdev.com.ar`. Ese nginx también usa `vetcole.location.conf`.
2. En `deploy/cloudflare/wrangler.toml` poné ese subdominio en `ORIGIN`.
3. `cd deploy/cloudflare && npx wrangler deploy`, con una cuenta que tenga acceso a la zona ultimamilla.com.ar.

Si el sitio de Astro tiene su propia página en `/casos/`, la ruta del Worker sólo toma `/casos/vetcole*` y no la pisa.

## 4. Deploy automático (opcional)

Para que cada push a `main` actualice el servidor:

- En GitHub → Settings → Secrets and variables → Actions, cargá los secrets `DEPLOY_HOST`, `DEPLOY_USER` y `DEPLOY_SSH_KEY`.
- En la misma pantalla, creá la variable `DEPLOY_ENABLED=true`.

El job hace `docker compose pull && up -d` en `/opt/vetcole`.

## Verificación

- `https://www.ultimamilla.com.ar/casos/vetcole/` abre la home de la demo.
- `https://www.ultimamilla.com.ar/casos/vetcole/api/v1/health` devuelve `"base":"/casos/vetcole"`.
- `https://www.ultimamilla.com.ar/casos/vetcole/libreta/MZA-000231` abre directo, igual que al escanear un QR.
- Prueba completa desde cualquier máquina con Playwright: `node e2e/smoke.mjs https://www.ultimamilla.com.ar/casos/vetcole`. Ojo: modifica datos, que se restablecen en el próximo reseteo o con `docker compose restart` y `RESEED_ON_START=true`.

## Volver atrás

`docker compose -f docker-compose.prod.yml down` saca la demo. Para volver a una versión anterior, cambiá `:latest` por el tag del commit en `docker-compose.prod.yml`. La demo responde con `X-Robots-Tag: noindex` para que no la indexen los buscadores.
