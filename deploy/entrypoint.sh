#!/bin/sh
# Arranque de la demo: sincroniza el esquema y carga los datos de demostración si la base está vacía
# (o siempre, con RESEED_ON_START=true). Después levanta el servidor.
set -e
cd /app/backend
if [ -z "$JWT_SECRET" ] || [ "$JWT_SECRET" = "cambiar-en-produccion" ]; then
  echo "AVISO: definí JWT_SECRET con un valor propio." >&2
fi
# La base es sólo de demostración (se vuelve a cargar cada DEMO_RESET_HOURS): si cambió el modelo entre versiones,
# se acepta descartar las tablas viejas y se vuelven a cargar los datos de ejemplo.
HASH=$(md5sum prisma/schema.prisma | cut -d' ' -f1)
node node_modules/prisma/build/index.js db push --skip-generate --accept-data-loss >/dev/null
if [ "$RESEED_ON_START" = "true" ] || [ ! -f /data/.seeded ] || [ "$(cat /data/.schema 2>/dev/null)" != "$HASH" ]; then
  node prisma/seed.js && touch /data/.seeded && echo "$HASH" > /data/.schema
fi
exec node src/index.js
