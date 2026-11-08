#!/usr/bin/env bash
# Deploy de la demo en el VPS de Hostinger (alias SSH "ultimamilla") bajo www.ultimamilla.com.ar/casos/vetcole/.
# Se ejecuta desde una máquina que ya tiene el alias configurado (la Mac de Última Milla), parado en la raíz del repo.
#
#   ./deploy/hostinger/deploy.sh relevar     # sólo lectura: qué proxy atiende www.ultimamilla.com.ar
#   ./deploy/hostinger/deploy.sh app         # sube el código, construye la imagen en el VPS y levanta el contenedor
#   ./deploy/hostinger/deploy.sh proxy       # SIMULA: muestra el cambio en el nginx del VPS sin tocar nada
#   ./deploy/hostinger/deploy.sh proxy --aplicar   # aplica: backup + nginx -t + reload + rollback si falla
#   ./deploy/hostinger/deploy.sh verificar   # prueba la URL pública
#
# Sólo toca lo de vetcole: /opt/vetcole, el contenedor y volumen "vetcole" (proyecto compose vetcole) y
# dos bloques location en el server de www.ultimamilla.com.ar. Nunca hace prune, ni reinicia otros servicios.
# Variables: SSH_HOST (por defecto ultimamilla), REMOTE_DIR (/opt/vetcole), PUERTO (4310).
set -euo pipefail
SSH_HOST="${SSH_HOST:-ultimamilla}"
REMOTE_DIR="${REMOTE_DIR:-/opt/vetcole}"
PUERTO="${PUERTO:-4310}"
URL="https://www.ultimamilla.com.ar/casos/vetcole"
ssh_() { ssh -o ConnectTimeout=15 "$SSH_HOST" "$@"; }

relevar() {
  echo "== Contenedores (nombre · imagen · puertos)"
  ssh_ 'docker ps --format "{{.Names}} · {{.Image}} · {{.Ports}}"'
  echo; echo "== ¿Quién escucha en 80/443?"
  ssh_ 'ss -ltnp 2>/dev/null | grep -E ":(80|443) " || netstat -ltnp 2>/dev/null | grep -E ":(80|443) "'
  echo; echo "== nginx del host"
  ssh_ 'command -v nginx >/dev/null && nginx -v 2>&1; systemctl is-active nginx 2>/dev/null || true; grep -rlE "server_name[^;]*(www\.)?ultimamilla\.com\.ar" /etc/nginx 2>/dev/null || true'
  echo; echo "== Contenedores proxy (traefik/caddy/nginx-proxy-manager) y etiquetas de ruteo"
  ssh_ 'for c in $(docker ps --format "{{.Names}}"); do docker inspect -f "{{.Name}} {{.Config.Image}}" $c; done | grep -iE "traefik|caddy|nginx|proxy" || true'
  ssh_ 'for c in $(docker ps --format "{{.Names}}"); do echo "$c $(docker inspect --format "{{json .Config.Labels}}" $c)"; done | grep -iE "traefik|caddy" | grep -i ultimamilla | cut -c1-400 || true'
  echo; echo "== Puerto ${PUERTO} libre?"
  ssh_ "ss -ltn 2>/dev/null | grep -q ':${PUERTO} ' && echo 'OCUPADO: elegí otro con PUERTO=...' || echo 'libre'"
}

app() {
  echo "== Empaquetando el repo (HEAD) y subiendo al VPS"
  git archive --format=tar.gz -o /tmp/vetcole-src.tgz HEAD
  # Resguardos: no pisar nada que no sea de esta demo.
  ssh_ "set -e
    if [ -e ${REMOTE_DIR} ] && [ ! -f ${REMOTE_DIR}/.vetcole ]; then echo 'ABORTO: ${REMOTE_DIR} ya existe y no es de vetcole.'; exit 10; fi
    OTRO=\$(docker ps -a --filter name=^/vetcole\$ --format '{{.Label \"com.docker.compose.project\"}}')
    if [ -n \"\$OTRO\" ] && [ \"\$OTRO\" != vetcole ]; then echo \"ABORTO: ya existe un contenedor 'vetcole' de otro proyecto (\$OTRO).\"; exit 11; fi
    # ¿Alguien escucha en el puerto? curl sale con 7 sólo si la conexión es rechazada (puerto libre). No depende de ss/netstat.
    RC=0; curl -s -o /dev/null --max-time 3 http://127.0.0.1:${PUERTO}/ || RC=\$?
    if [ \"\$RC\" != 7 ] && ! docker ps --filter name=^/vetcole\$ --filter label=com.docker.compose.project=vetcole --format '{{.Ports}}' | grep -q ':${PUERTO}->'; then echo 'ABORTO: el puerto ${PUERTO} lo usa otro servicio. Elegí otro con PUERTO=...'; exit 12; fi
    mkdir -p ${REMOTE_DIR} && touch ${REMOTE_DIR}/.vetcole"
  scp -q /tmp/vetcole-src.tgz "${SSH_HOST}:${REMOTE_DIR}/vetcole-src.tgz"
  ssh_ "set -e; cd ${REMOTE_DIR} && rm -rf ${REMOTE_DIR}/src && mkdir src && tar xzf vetcole-src.tgz -C src --no-same-owner
    [ -f .env ] || printf 'JWT_SECRET=%s\n' \"\$(openssl rand -hex 32)\" > .env
    cat > docker-compose.yml <<EOF
services:
  vetcole:
    build:
      context: ./src
      args:
        BASE_PATH: /casos/vetcole/
    image: vetcole:local
    container_name: vetcole
    restart: unless-stopped
    env_file: .env
    environment:
      BASE_PATH: /casos/vetcole/
      DEMO_RESET_HOURS: \"24\"
    ports:
      - \"127.0.0.1:${PUERTO}:4000\"
    volumes:
      - vetcole-data:/data
    logging:
      driver: json-file
      options: { max-size: \"10m\", max-file: \"3\" }
volumes:
  vetcole-data:
EOF
    # Sólo el proyecto vetcole: sin prune, sin tocar otros contenedores, redes ni volúmenes.
    docker compose -p vetcole build vetcole
    docker compose -p vetcole up -d vetcole
    OK=0; for i in \$(seq 1 30); do if curl -sf http://127.0.0.1:${PUERTO}/casos/vetcole/api/v1/health >/dev/null; then OK=1; break; fi; sleep 2; done
    if [ \$OK != 1 ]; then echo 'ERROR: la demo no respondió. Logs:'; docker logs --tail 40 vetcole; exit 20; fi
    curl -s http://127.0.0.1:${PUERTO}/casos/vetcole/api/v1/health; echo"
}

proxy() {
  # Sólo para nginx del host. Si el relevamiento muestra Traefik/Caddy, ver deploy/DEPLOY.md.
  # Por defecto SIMULA: muestra el diff y no toca nada. Con --aplicar: backup, nginx -t, reload (graceful) y rollback si falla.
  local APLICAR="${1:-}"
  ssh_ "set -e; APLICAR='${APLICAR}'
    CONF=\$(grep -rlE 'server_name[^;]*www\.ultimamilla\.com\.ar' /etc/nginx/sites-enabled /etc/nginx/conf.d 2>/dev/null | head -1)
    [ -n \"\$CONF\" ] || { echo 'No encontré el server block de www.ultimamilla.com.ar en nginx del host. Revisá la salida de relevar.'; exit 2; }
    echo \"server block: \$CONF\"
    if grep -q 'casos/vetcole' \"\$CONF\"; then echo 'Ya estaba conectado.'; exit 0; fi
    SNIP='    location = /casos/vetcole { return 301 /casos/vetcole/; }\n    location ^~ /casos/vetcole/ { proxy_pass http://127.0.0.1:${PUERTO}; proxy_http_version 1.1; proxy_set_header Host \$host; proxy_set_header X-Real-IP \$remote_addr; proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for; proxy_set_header X-Forwarded-Proto \$scheme; client_max_body_size 2m; }'
    # se inserta antes del primer 'location' de cada server block de www.ultimamilla.com.ar (más específico que el catch-all del sitio)
    awk -v snip=\"\$SNIP\" 'BEGIN{gsub(/\\\\n/,\"\n\",snip)} /^[[:space:]]*server[[:space:]]*\\{/{want=0} /server_name[^;]*www\.ultimamilla\.com\.ar/{want=1} want && /^[[:space:]]*location/{print snip; want=0} {print}' \"\$CONF\" > /tmp/vetcole-nginx.conf
    echo '--- cambio propuesto (diff):'; diff -u \"\$CONF\" /tmp/vetcole-nginx.conf || true
    if [ \"\$APLICAR\" != '--aplicar' ]; then echo; echo 'SIMULACIÓN: no se modificó nada. Para aplicarlo: deploy.sh proxy --aplicar'; exit 0; fi
    cp \"\$CONF\" \"\$CONF.bak-vetcole-\$(date +%Y%m%d%H%M%S)\"
    cp /tmp/vetcole-nginx.conf \"\$CONF\"
    if nginx -t; then systemctl reload nginx && echo 'nginx recargado'; else echo 'nginx -t falló: restauro el backup'; cp \"\$(ls -t \$CONF.bak-vetcole-* | head -1)\" \"\$CONF\"; nginx -t; exit 3; fi"
}

verificar() {
  for p in "/" "/api/v1/health" "/libreta/MZA-000231" "/guardias"; do
    printf '%-28s %s\n' "$p" "$(curl -s -o /dev/null -w '%{http_code}' "$URL$p")"
  done
}

case "${1:-}" in
  relevar) relevar ;;
  app) app ;;
  proxy) proxy "${2:-}" ;;
  verificar) verificar ;;
  *) sed -n 2,14p "$0"; exit 1 ;;
esac
