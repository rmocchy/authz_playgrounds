# Auth service — Deno runtime (app authz platform, NOT an IdP)
# Build context: repository root (see docker-compose.yml)
# Schema migrations: dbmate via compose service migrate-auth (not this image).
FROM denoland/deno:2.9.2

WORKDIR /app

# Cache deps from deno.json + lock for reproducible builds
COPY services/auth/deno.json services/auth/deno.lock ./
COPY services/auth/src ./src

# Warm npm/jsr caches (network at build time; lock pins versions)
RUN deno cache --lock=deno.lock src/main.ts

ENV PORT=3001
EXPOSE 3001

CMD ["deno", "run", "-A", "src/main.ts"]
