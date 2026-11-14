# Publicar la demo en www.ultimamilla.com.ar/casos/vetcole/

La app ya está preparada para vivir bajo esa subruta (`BASE_PATH=/casos/vetcole/`). Sirve el frontend, la API (`/casos/vetcole/api/v1`) y los enlaces directos, por ejemplo los QR de libretas, recetas y credenciales.

`www.ultimamilla.com.ar` pasa por **Cloudflare**, así que hay dos caminos según dónde esté el sitio principal.

## Hostinger (VPS de Última Milla): camino recomendado

El VPS ya corre otros servicios, entre ellos SITREP. `deploy/hostinger/deploy.sh` se ejecuta desde una máquina que ya tiene el alias SSH `ultimamilla`, parado en la raíz del repo, y **sólo toca lo de vetcole**:

- la carpeta `/opt/vetcole`, marcada con `.vetcole`;
- el contenedor y el volumen `vetcole` (proyecto compose `vetcole`), en `127.0.0.1:4310`;
- dos bloques `location` en el server de www.ultimamilla.com.ar.

Nunca hace `prune` ni reinicia otros contenedores. Aborta sin tocar nada si:

- `/opt/vetcole` existe y no es de vetcole;
- ya hay un contenedor `vetcole` de otro proyecto;
- el puerto lo usa otro servicio (se cambia con `PUERTO=...`).

```bash
./deploy/hostinger/deploy.sh relevar            # 1. sólo lectura: contenedores, quién atiende 80/443, nginx, puerto libre
./deploy/hostinger/deploy.sh app                # 2. construye la imagen en el VPS y levanta la demo (sin token de GHCR)
./deploy/hostinger/deploy.sh proxy              # 3. SIMULA: muestra el diff del nginx, no cambia nada
./deploy/hostinger/deploy.sh proxy --aplicar SHA256_APROBADO # 4. solo tras aprobar el diff y su hash
./deploy/hostinger/deploy.sh verificar          # 5. prueba la URL pública
```

### Nginx real de UMSA (relevado el 11/11/2026)

El servicio público es `umsa-sitrep-ingress.service` (compartido con SITREP, DGE y otros sitios). `nginx.service` está inactivo. La configuración principal es `/srv/umsa-migration/sitrep-public-ingress/40607817805-1/nginx.conf`, que incluye `/srv/umsa-public-vhosts/ultimamilla.com.ar.conf`. El sitio Astro usa `127.0.0.1:4322`. La instancia `umsa-clean-front.service` escucha en localhost y no se modifica.

`proxy` usa `deploy/hostinger/nginx_proxy.py` por SSH (requiere Python 3 en el VPS). La simulación solo lee: imprime el diff y su SHA256 sin crear archivos remotos. Agrega únicamente las dos rutas de Vetcole al bloque HTTPS exacto de `www`, sin cambiar el HTTP, el apex, DGE ni otros vhosts. Si la estructura, el servicio, la configuración principal o una ruta Vetcole existente no coinciden, aborta.

Para aplicar hace falta aprobación explícita del diff y pasar su SHA256. El hash liga la configuración principal, el vhost original y la propuesta (incluido el puerto); un cambio exige nueva revisión. Antes de modificar verifica la identidad del servicio y del contenedor, la salud de Vetcole y la configuración completa de nginx. Guarda el respaldo exacto en `/opt/vetcole/nginx-backups/`, fuera de cualquier glob de nginx. Luego modifica solo el vhost, valida nuevamente con `nginx -t -c` y ejecuta `systemctl reload umsa-sitrep-ingress.service` (HUP; no restart). Si falla la validación restaura sin recargar; si falla la recarga restaura, valida y solicita una recarga de la configuración anterior. Los fallos se devuelven al operador.

La recarga es compartida por todos los vhosts de esa instancia. No ejecutar cambios concurrentes de nginx mientras se aplica. No usar el antiguo paso que escribía en `/etc/nginx` ni `systemctl reload nginx` en este VPS. La prueba de nginx real se reserva para el paso autorizado de aplicación: la simulación no la ejecuta.

Para sacar la demo: `cd /opt/vetcole && docker compose -p vetcole down`. La reversión del proxy debe revisarse contra la configuración vigente: retirar solo el bloque `VETCOLE-BEGIN` / `VETCOLE-END`, validar con la configuración principal indicada y recargar el servicio correcto. No restaurar a ciegas un respaldo antiguo que pueda borrar cambios posteriores de otros sitios.

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

### Opción A: otro servidor con nginx convencional (no el UMSA actual)

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

### Propuesta comercial publicada (11/11/2026)

- Infografía: `https://www.ultimamilla.com.ar/casos/vetcole/propuesta.html`
- PDF: `https://www.ultimamilla.com.ar/casos/vetcole/Propuesta-ColVet-Digital.pdf`
- Copia persistente de ambos archivos: `/opt/vetcole/publicaciones/propuesta/`.

Son archivos estáticos servidos por Vetcole con su cabecera `X-Robots-Tag: noindex, nofollow`; el HTML también declara la meta robots. No requieren cambios de nginx ni reinicios para actualizar contenido. El paso `app` restaura exclusivamente esos dos archivos desde la copia persistente después de recrear Vetcole. Si se usa otro procedimiento de despliegue, debe preservarse o restaurarse esa copia antes de dar la actualización por terminada. No publicar la carpeta de cálculos internos ni incorporarla al repositorio público.

- `https://www.ultimamilla.com.ar/casos/vetcole/` abre la home de la demo.
- `https://www.ultimamilla.com.ar/casos/vetcole/api/v1/health` devuelve `"base":"/casos/vetcole"`.
- `https://www.ultimamilla.com.ar/casos/vetcole/libreta/MZA-000231` abre directo, igual que al escanear un QR.
- Prueba completa desde cualquier máquina con Playwright: `node e2e/smoke.mjs https://www.ultimamilla.com.ar/casos/vetcole`. Ojo: modifica datos, que se restablecen en el próximo reseteo o con `docker compose restart` y `RESEED_ON_START=true`.

## Volver atrás

`docker compose -f docker-compose.prod.yml down` saca la demo. Para volver a una versión anterior, cambiá `:latest` por el tag del commit en `docker-compose.prod.yml`. La demo responde con `X-Robots-Tag: noindex` para que no la indexen los buscadores.
