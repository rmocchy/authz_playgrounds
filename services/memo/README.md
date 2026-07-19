# Memo service (`services/memo`)

Markdown memo CRUD with a small **authorization matrix** (`owner` / `global` / `secure`).

Session validation is **delegated to Auth** via server-to-server HTTP (`GET /v1/sessions/me` with the browser Cookie forwarded). Memo never reads the Auth database.

## API

| Method | Path | Notes |
|--------|------|--------|
| `GET` | `/v1/memos?scope=mine\|readable` | `mine` (default): own only; `readable`: own + globally readable |
| `POST` | `/v1/memos` | `{ title?, body, global?, secure? }` → `201` |
| `GET` | `/v1/memos/{id}` | authz-checked |
| `PATCH` | `/v1/memos/{id}` | owner only |
| `DELETE` | `/v1/memos/{id}` | owner only → `204` |
| `GET` | `/health` | liveness |

All `/v1/memos*` routes require a valid session cookie → **401** if missing/invalid.

### Authorization matrix

| Actor | Flags | Read | Write (PATCH/DELETE) |
|-------|--------|------|----------------------|
| Owner | any | yes | yes |
| Non-owner | `global=true`, `secure=false` | yes | no |
| Non-owner | `global=false` | no | no |
| Non-owner | `secure=true` (even if global) | no | no |

### HTTP status mapping (consistent)

| Situation | Status |
|-----------|--------|
| Unauthenticated | **401** |
| Memo does not exist | **404** |
| Authenticated, cannot read (private / secure to others) | **404** (hide existence) |
| Can read (global) but not write | **403** on PATCH/DELETE |
| Validation error | **400** |
| Auth service down / bad response | **502** |

## Data (Postgres DB `memo`)

| Column | Notes |
|--------|--------|
| `id` | UUID PK |
| `owner_id` | UUID, logical FK to Auth user id |
| `title` | TEXT, default `''` |
| `body` | TEXT (Markdown) |
| `is_global` | API field `global` |
| `is_secure` | API field `secure` |
| `created_at` / `updated_at` | TIMESTAMPTZ |

## Layout

```
src/
  handler/      # one HTTP entry per file (handleList, handleCreate, …)
  usecase/      # one use case per file (listMemos, createMemo, …)
  domain/       # pure types / authz matrix / input parsing
  repository/   # Postgres + in-memory test doubles
  clients/      # Auth session client (not own DB)
  http/         # errors, shared JSON body helper
```

Size limits are enforced by ESLint (`max-lines` / `max-lines-per-function`; root `npm run lint:size`).

## SafeQL / SQL

Same as Auth: **postgres.js** + parameterized queries + explicit row types in `src/repository/*.ts`. SafeQL is not wired for Deno yet.

## Env

See `.env.example`.

| Variable | Default | Meaning |
|----------|---------|---------|
| `PORT` | `3002` | Listen port |
| `DATABASE_URL` | (compose) | Postgres URL for DB `memo` |
| `AUTH_BASE_URL` | `http://localhost:3001` | Auth base (compose: `http://auth:3001`) |
| `SESSION_COOKIE_NAME` | `playground_session` | Cookie name to expect |

## Local (outside Docker)

```bash
export DATABASE_URL=postgres://playground:changeme@localhost:5432/memo
export AUTH_BASE_URL=http://localhost:3001
deno task start   # from services/memo
deno task test
deno task check
```

## Docker

Built by root `docker-compose.yml` service `memo`. On start:

1. Apply `db/migration/memo/*.sql`
2. Serve on `0.0.0.0:3002`
3. Calls Auth at `AUTH_BASE_URL` (`http://auth:3001` in compose)
