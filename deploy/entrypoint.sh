#!/bin/sh
# Arranque de la demo: sincroniza el esquema y carga los datos de demostración si la base está vacía
# (o siempre, con RESEED_ON_START=true). Después levanta el servidor.
set -e
cd /app/backend
if [ -z "$JWT_SECRET" ] || [ "$JWT_SECRET" = "cambiar-en-produccion" ]; then
  echo "AVISO: definí JWT_SECRET con un valor propio." >&2
fi
node node_modules/prisma/build/index.js db push --skip-generate >/dev/null
if [ "$RESEED_ON_START" = "true" ] || [ ! -f /data/.seeded ]; then
  node prisma/seed.js && touch /data/.seeded
fi
exec node src/index.js
