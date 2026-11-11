# Prompt para publicar ColVet Digital en UMSA (VPS de Hostinger)

Copiá todo lo que está debajo de la línea y pegalo en la IA que tiene acceso SSH a UMSA (alias `ultimamilla`).

---

Necesito que publiques una demo en el VPS de Hostinger de Última Milla (UMSA), en **https://www.ultimamilla.com.ar/casos/vetcole/**. Tenés el alias SSH `ultimamilla` configurado.

## Reglas que no se negocian

**No borres ni rompas ningún otro servicio de UMSA.** En concreto:

- Nada de `docker system prune`, `docker image prune`, `docker volume prune` ni `docker compose down` de otros proyectos.
- No reinicies ni recrees contenedores que no se llamen `vetcole`.
- No toques otras carpetas que no sean `/opt/vetcole`.
- Para cambiar nginx: primero copia de respaldo, después `nginx -t`, y recién ahí `reload`. Si `nginx -t` falla, restaurá el respaldo y avisame.
- Si algo no coincide con lo que espero (la carpeta ya existe y no es de vetcole, el puerto está ocupado, el sitio no lo atiende nginx del host), **frená y avisame** antes de seguir.
- Mostrame la salida de cada paso antes de pasar al siguiente.

## Qué es

**ColVet Digital** es una demo de Última Milla para el Colegio de Médicos Veterinarios de Mendoza, sobre el mismo producto que Psicole. Incluye:

- **Sitio público institucional:**
  - buscador general;
  - directorio con lista y mapa de OpenStreetMap;
  - perfil de cada profesional, con foto y credencial;
  - guardias y turnos online;
  - libreta sanitaria pública, que se ve como documento y se descarga en el formato abierto **LSAA**;
  - contenido real del sitio colvetmza.com.ar: autoridades, legislación y noticias.
- **Portal del veterinario/a,** en tres espacios:
  - Mi matrícula: credencial, cuotas con pago, trámites y recetas;
  - Mi consultorio: agenda, pacientes, ventas, stock y caja;
  - Mi perfil público.
- **Administración del Colegio:**
  - tablero «qué necesita atención hoy»;
  - padrón con la ficha completa de cada matriculado en una ventana emergente;
  - dinero: recaudación por mes, concepto y medio de pago, más los medios de pago configurables;
  - inspecciones;
  - municipios.
- **Inspector/a:** agenda, formulario de revisión de establecimientos y acta. El resultado del acta define si el establecimiento queda acreditado.
- **Zoonosis municipal:** la opera cada municipio o el Colegio.
- **App del tutor/a:** la mascota, sus vencimientos, turnos y credencial.

**Stack:** Node 22 + Express + Prisma (SQLite en un volumen), React 18 + Vite. Corre en un solo contenedor Docker que sirve el frontend y la API bajo `/casos/vetcole`.

- **Repositorio (público):** https://github.com/martinsantos/vetcole, rama `main`.
- **Guía completa:** `deploy/DEPLOY.md`.
- **Script con resguardos:** `deploy/hostinger/deploy.sh`.

## Cómo publicarla

1. Cloná el repo en una máquina que tenga el alias `ultimamilla`. Puede ser tu entorno; lo que importa es que el script use ese alias:
   ```bash
   git clone https://github.com/martinsantos/vetcole.git && cd vetcole
   ```
2. Relevamiento, que es solo lectura. Mostrame el resultado:
   ```bash
   ./deploy/hostinger/deploy.sh relevar
   ```
   Tiene que mostrar:
   - qué atiende los puertos 80/443 (si es nginx del host, Traefik, Caddy u otro);
   - qué archivo de nginx tiene `server_name www.ultimamilla.com.ar`;
   - si el puerto `4310` está libre.

   Si el puerto está ocupado, usá otro con `PUERTO=43xx`.
3. Levantar la app. El script sube el código, construye la imagen en el VPS y arranca solo el contenedor `vetcole` en `127.0.0.1:4310`:
   ```bash
   ./deploy/hostinger/deploy.sh app
   ```
   El script aborta solo en tres casos:
   - `/opt/vetcole` existe y no es de vetcole (código 10);
   - ya hay un contenedor `vetcole` de otro proyecto (11);
   - el puerto está ocupado (12).

   Después comprobá:
   ```bash
   ssh ultimamilla 'curl -s http://127.0.0.1:4310/casos/vetcole/api/v1/health'
   ```
4. Simular el cambio de nginx. No cambia nada; mostrame el diff:
   ```bash
   ./deploy/hostinger/deploy.sh proxy
   ```
   Solo sirve si www.ultimamilla.com.ar lo atiende el **nginx del host**. Si lo atiende Traefik, Caddy o un proxy en contenedor, **no lo apliques**: proponeme cómo agregar la ruta `/casos/vetcole` a ese proxy, con prioridad sobre el sitio Astro, y esperá mi confirmación. El bloque que hay que agregar está en `deploy/nginx/vetcole.location.conf`: un `location ^~ /casos/vetcole/` con `proxy_pass http://127.0.0.1:4310`, sin recortar el prefijo.
5. Aplicar, solo después de que yo confirme el diff. El script hace copia de respaldo, `nginx -t` y `reload`, y vuelve atrás si falla:
   ```bash
   ./deploy/hostinger/deploy.sh proxy --aplicar
   ```
6. Verificar:
   ```bash
   ./deploy/hostinger/deploy.sh verificar
   ```
   Y además, desde afuera:
   - `https://www.ultimamilla.com.ar/casos/vetcole/` abre la portada;
   - `https://www.ultimamilla.com.ar/casos/vetcole/api/v1/health` responde `success: true`;
   - `https://www.ultimamilla.com.ar/casos/vetcole/libreta/MZA-000231` abre directo, como al escanear un QR;
   - `https://www.ultimamilla.com.ar/casos/vetcole/profesional/1342` abre el perfil de la Dra. Lucía Ferreyra.

   Si www pasa por Cloudflare y la ruta devuelve el sitio Astro en vez de la demo, revisá que no haya caché o una regla de página que la tape. Si no lo resolvés, avisame.

## Datos útiles

- **Cuentas de la demo**, todas con contraseña `demo1234`:

  | Rol | Correo |
  |---|---|
  | Veterinaria | `lucia.ferreyra@demo.colvet` |
  | Colegio | `admin@demo.colvet` |
  | Inspectora | `inspeccion@demo.colvet` |
  | Zoonosis Godoy Cruz | `zoonosis@godoycruz.demo` |
  | Tutora | `sofia.rios@demo.colvet` |

  La barra de la demo, arriba (o la pestaña «Demo · cambiar de vista»), cambia de rol en un clic.
- **Datos:** son ficticios y vuelven al estado inicial cada 24 h (`DEMO_RESET_HOURS`). Al arrancar, si cambió el modelo de datos, la base de la demo se vuelve a cargar sola.
- **Buscadores:** la demo responde con `X-Robots-Tag: noindex` para que no la indexen.
- **Secreto:** el `.env` con `JWT_SECRET` lo genera el script en `/opt/vetcole/.env`. No lo subas a ningún lado.
- **Para actualizar después de un cambio en el repo:** `git pull` y de nuevo `./deploy/hostinger/deploy.sh app`. Reconstruye y reinicia solo `vetcole`.
- **Para sacarla:**
  ```bash
  ssh ultimamilla 'cd /opt/vetcole && docker compose -p vetcole down'
  ```
  Después restaurá el `.bak-vetcole-*` del nginx que dejó el paso 5.

## Qué tenés que devolverme

- Qué atiende www.ultimamilla.com.ar: nginx del host u otro proxy.
- El diff de nginx aplicado y la ruta del respaldo.
- El resultado de los cuatro chequeos del paso 6.
- Cualquier cosa que hayas tenido que hacer distinto de lo que dice este prompt.
