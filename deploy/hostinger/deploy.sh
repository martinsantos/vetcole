#!/usr/bin/env bash
# Deploy de la demo en el VPS de Hostinger (alias SSH "ultimamilla") bajo www.ultimamilla.com.ar/casos/vetcole/.
# Se ejecuta desde una máquina que ya tiene el alias configurado (la Mac de Última Milla), parado en la raíz del repo.
#
#   ./deploy/hostinger/deploy.sh relevar     # sólo lectura: qué proxy atiende www.ultimamilla.com.ar
#   ./deploy/hostinger/deploy.sh app         # sube el código, construye la imagen en el VPS y levanta el contenedor
#   ./deploy/hostinger/deploy.sh proxy       # SIMULA: muestra el cambio en el nginx del VPS sin tocar nada
#   ./deploy/hostinger/deploy.sh proxy --aplicar SHA256   # tras aprobación, aplica: backup + nginx -t + reload + rollback si falla
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
  ssh_ 'command -v nginx >/dev/null && nginx -v 2>&1; systemctl show umsa-sitrep-ingress.service umsa-clean-front.service -p Id -p ActiveState -p MainPID -p ExecStart -p ExecReload; grep -nE "listen|server_name|location.*vetcole" /srv/umsa-public-vhosts/ultimamilla.com.ar.conf'
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
    # Documentos comerciales persistentes, fuera del código y del repositorio público.
    # Restaurar sólo estos dos archivos después de recrear el contenedor Vetcole.
    if [ -d publicaciones/propuesta ]; then
      for DOC in propuesta.html Propuesta-ColVet-Digital.pdf; do
        test -f \"publicaciones/propuesta/\$DOC\"
        docker cp \"publicaciones/propuesta/\$DOC\" \"vetcole:/app/frontend/dist/\$DOC\"
      done
    fi
    OK=0; for i in \$(seq 1 30); do if curl -sf http://127.0.0.1:${PUERTO}/casos/vetcole/api/v1/health >/dev/null; then OK=1; break; fi; sleep 2; done
    if [ \$OK != 1 ]; then echo 'ERROR: la demo no respondió. Logs:'; docker logs --tail 40 vetcole; exit 20; fi
    curl -s http://127.0.0.1:${PUERTO}/casos/vetcole/api/v1/health; echo"
}

proxy() {
  # La simulación ejecuta Python por stdin y no escribe archivos en el VPS.
  # Aplicar requiere el hash exacto de una propuesta aprobada por el usuario.
  local MODE=preview HASH= SCRIPT_DIR
  if [ "$#" -gt 0 ]; then
    if [ "$#" != 2 ] || [ "$1" != '--aplicar' ] || ! [[ "$2" =~ ^[a-f0-9]{64}$ ]]; then
      echo 'Uso: deploy.sh proxy [--aplicar SHA256_DEL_DIFF_APROBADO]' >&2
      return 2
    fi
    MODE=apply
    HASH="$2"
  fi
  [[ "$PUERTO" =~ ^[0-9]{4,5}$ ]] || { echo 'Puerto inválido' >&2; return 2; }
  SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
  ssh_ "python3 - ${PUERTO} ${MODE} ${HASH}" < "$SCRIPT_DIR/nginx_proxy.py"
}

verificar() {
  for p in "/" "/api/v1/health" "/libreta/MZA-000231" "/guardias"; do
    printf '%-28s %s\n' "$p" "$(curl -s -o /dev/null -w '%{http_code}' "$URL$p")"
  done
}

case "${1:-}" in
  relevar) relevar ;;
  app) app ;;
  proxy) shift; proxy "$@" ;;
  verificar) verificar ;;
  *) sed -n 2,14p "$0"; exit 1 ;;
esac
