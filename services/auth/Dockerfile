# Auth service — Deno runtime (app authz platform, NOT an IdP)
FROM denoland/deno:2.1.4

WORKDIR /app

# Cache deps from deno.json import map
COPY deno.json ./
COPY src ./src
COPY migrations ./migrations

# Warm npm/jsr caches (network at build time)
RUN deno cache src/main.ts

ENV PORT=3001
EXPOSE 3001

# Run migrations + server (main.ts)
CMD ["deno", "run", "-A", "src/main.ts"]
