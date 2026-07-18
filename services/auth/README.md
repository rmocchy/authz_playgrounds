# Auth service (`services/auth`)

**App authz platform** for this playground: local users, password verification, and session cookies.

This is **not** an IdP (Google/Okta equivalent). A future independent IdP may live under a separate `services/idp` path; do not rename this service to `idp`.

## API

| Method | Path | Notes |
|--------|------|--------|
| `POST` | `/v1/auth/register` | `{ loginId, password }` → `201` User (no session) |
| `POST` | `/v1/auth/login` | credentials → `200` User + `Set-Cookie: playground_session` |
| `POST` | `/v1/auth/logout` | invalidate session; clear cookie; always `204` |
| `GET` | `/v1/sessions/me` | `{ id, loginId }` or `401` |
| `GET` | `/health` | liveness |

Cookie: `HttpOnly; Path=/; SameSite=Lax` (no `Secure` on local HTTP).

## Data (Postgres DB `auth`)

- `users`: `id`, `login_id` (unique), `password_hash`, `created_at`
- `sessions`: `id` (cookie value), `user_id`, `expires_at`, `created_at`

Passwords are stored as **bcrypt** hashes (never plaintext). Input is capped at
**72 characters** to match bcrypt’s effective limit (longer passwords would only
use the first 72 bytes). Login always runs a bcrypt compare (dummy hash when the
user is missing) so response timing does not leak whether `loginId` exists.

## SafeQL / SQL

SafeQL + ESLint is not wired for Deno in this playground yet. Queries use **postgres.js** with:

- parameterized tagged templates
- explicit TypeScript row interfaces in `src/repository/*.ts`

If SafeQL becomes feasible later, replace the repository implementations without changing handler contracts.

## Layout

```
src/
  handler/      # one HTTP entry per file (handleRegister, handleLogin, …)
  usecase/      # one use case per file (register, login, …)
  domain/       # pure types / rules
  repository/   # Postgres + in-memory test doubles
  http/         # cookies, errors, shared request parsing
```

Enforced by `tools/architecture-lint` (see root `npm run lint:architecture`).

## Env

See `.env.example`. Important:

| Variable | Default | Meaning |
|----------|---------|---------|
| `PORT` | `3001` | Listen port |
| `DATABASE_URL` | (required in compose) | Postgres URL for DB `auth` |
| `SESSION_COOKIE_NAME` | `playground_session` | Cookie name |
| `SESSION_TTL_SECONDS` | `604800` (7d) | Session lifetime |
| `COOKIE_SECURE` | `false` | Set `true` behind HTTPS |
| `SEED_LOGIN_ID` / `SEED_PASSWORD` | unset | Optional demo user on boot |

## Local (outside Docker)

```bash
# Postgres with auth DB available (compose db or local)
export DATABASE_URL=postgres://playground:changeme@localhost:5432/auth
deno task start   # from services/auth
deno task test
deno task check
```

## Docker

Built by root `docker-compose.yml` service `auth`. On start:

1. Apply `migrations/*.sql`
2. Optional seed
3. Serve on `0.0.0.0:3001`
