# ── build ─────────────────────────────────────────────────────────────────────
FROM node:22-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
COPY api/package.json ./api/
COPY web/package.json ./web/
RUN npm ci --workspace @vera/api --include-workspace-root

COPY tsconfig.base.json ./
COPY api ./api
RUN npm run build -w @vera/api

# ── runtime ───────────────────────────────────────────────────────────────────
FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production

COPY package.json package-lock.json ./
COPY api/package.json ./api/
RUN npm ci --omit=dev --workspace @vera/api --include-workspace-root && npm cache clean --force

COPY --from=build /app/api/dist ./api/dist

# Cloud Run inyecta PORT; el servidor lo lee desde el entorno.
ENV PORT=8080
EXPOSE 8080
USER node
CMD ["node", "api/dist/index.js"]
