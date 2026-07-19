# Memo service — Deno runtime (CRUD + authorization matrix)
# Build context: repository root (see docker-compose.yml)
FROM denoland/deno:2.9.2

WORKDIR /app

# Cache deps from deno.json + lock for reproducible builds
COPY services/memo/deno.json services/memo/deno.lock ./
COPY services/memo/src ./src
COPY db/migration/memo ./migrations

# Warm npm/jsr caches (network at build time; lock pins versions)
RUN deno cache --lock=deno.lock src/main.ts

ENV PORT=3002
EXPOSE 3002

# Run migrations + server (main.ts)
CMD ["deno", "run", "-A", "src/main.ts"]
