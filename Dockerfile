# ColVet Digital — imagen única: compila el frontend y lo sirve desde la API.
# BASE_PATH define la subruta pública (por defecto /casos/vetcole/ para www.ultimamilla.com.ar).
FROM node:22-slim AS build
RUN apt-get update -y && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY backend/package*.json backend/
COPY frontend/package*.json frontend/
RUN npm ci --prefix backend && npm ci --prefix frontend
COPY . .
ARG BASE_PATH=/casos/vetcole/
RUN BASE_PATH=$BASE_PATH npm run build --prefix frontend && cd backend && npx prisma generate && npm prune --omit=dev

FROM node:22-slim
RUN apt-get update -y && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY --from=build /app/backend /app/backend
COPY --from=build /app/frontend/dist /app/frontend/dist
COPY deploy/entrypoint.sh /app/entrypoint.sh
ARG BASE_PATH=/casos/vetcole/
ENV NODE_ENV=production PORT=4000 BASE_PATH=$BASE_PATH DATABASE_URL="file:/data/colvet.db" DEMO_RESET_HOURS=24
RUN chmod +x /app/entrypoint.sh && mkdir -p /data && chown -R node:node /data /app/backend
USER node
VOLUME /data
EXPOSE 4000
HEALTHCHECK --interval=30s --timeout=5s --retries=3 CMD node -e "fetch('http://localhost:'+process.env.PORT+(process.env.BASE_PATH||'/').replace(/\/?$/,'/')+'api/v1/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
ENTRYPOINT ["/app/entrypoint.sh"]
