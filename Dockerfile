# Imagen única para la demo: compila el frontend y lo sirve desde la API (puerto 4000).
FROM node:22-slim
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY backend/package*.json backend/
COPY frontend/package*.json frontend/
RUN npm ci --prefix backend && npm ci --prefix frontend
COPY . .
RUN npm run build --prefix frontend && cd backend && npx prisma generate
ENV DATABASE_URL="file:./demo.db" PORT=4000 NODE_ENV=production
EXPOSE 4000
# Crea la base y carga los datos de demostración en cada arranque (la demo siempre empieza limpia).
CMD ["sh", "-c", "cd backend && npx prisma db push --skip-generate && node prisma/seed.js && node src/index.js"]
