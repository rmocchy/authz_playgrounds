# Auth service — Deno runtime (app authz platform, NOT an IdP)
FROM denoland/deno:2.1.4

WORKDIR /app

# Cache deps from deno.json + lock for reproducible builds
COPY deno.json deno.lock ./
COPY src ./src
COPY migrations ./migrations

# Warm npm/jsr caches (network at build time; lock pins versions)
RUN deno cache --lock=deno.lock src/main.ts

ENV PORT=3001
EXPOSE 3001

# Run migrations + server (main.ts)
CMD ["deno", "run", "-A", "src/main.ts"]
