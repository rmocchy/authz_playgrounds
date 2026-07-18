# Web FE — Vite dev server (proxy /api/auth → auth, /api/memo → memo)
# Build context: repository root (see docker-compose.yml) so pkg/api-client is available.
FROM node:22-alpine

WORKDIR /app

# Install web deps first (better layer cache)
COPY services/web/package.json services/web/package-lock.json* ./services/web/
WORKDIR /app/services/web
RUN npm install

# Shared API client + web sources
WORKDIR /app
COPY pkg/api-client ./pkg/api-client
COPY services/web ./services/web

WORKDIR /app/services/web

ENV PORT=5173
# Compose overrides these to http://auth:3001 and http://memo:3002
ENV AUTH_PROXY_TARGET=http://auth:3001
ENV MEMO_PROXY_TARGET=http://memo:3002

EXPOSE 5173

# Dev server with HMR; host 0.0.0.0 for container networking
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "5173"]
