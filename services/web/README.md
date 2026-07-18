# Web FE (`services/web`)

Vite + React + TypeScript UI for the Authz Playground.

- **Login / logout / register** against Auth (`loginId` + password)
- **Memo** list · create · edit · delete
- **global / secure** toggles
- **Readable** tab lists own memos plus other users' global (non-secure) memos
- Uses **`pkg/api-client`** with relative bases `/api/auth` and `/api/memo`

## Cookie + proxy

Browser talks **same origin** to the Vite dev server. Proxies strip prefixes:

| Browser path | Upstream (local) | Upstream (compose) |
|--------------|------------------|--------------------|
| `/api/auth/*` | `http://127.0.0.1:3001/*` | `http://auth:3001/*` |
| `/api/memo/*` | `http://127.0.0.1:3002/*` | `http://memo:3002/*` |

Auth sets `Set-Cookie: playground_session=…; Path=/; HttpOnly; SameSite=Lax`.  
Because the response is same-origin via the proxy, the browser stores the cookie for the Vite origin and sends it on subsequent `/api/*` requests. Memo forwards that cookie to Auth for session validation.

Override targets with env:

```bash
export AUTH_PROXY_TARGET=http://127.0.0.1:3001
export MEMO_PROXY_TARGET=http://127.0.0.1:3002
```

## Local (outside Docker)

Prerequisites: Auth on `:3001`, Memo on `:3002` (and Postgres).

```bash
cd services/web
npm install
npm run dev          # http://localhost:5173
npm run build        # typecheck + production bundle
npm run check        # tsc only
```

Open http://localhost:5173 → register or log in → create memos → switch to **Readable** as another user to see global ones.

## Docker Compose

From repo root:

```bash
docker compose up --build web
# or full stack
docker compose up --build
```

Compose builds with **context = repository root** so `pkg/api-client` is copied into the image.  
Service env:

- `AUTH_PROXY_TARGET=http://auth:3001`
- `MEMO_PROXY_TARGET=http://memo:3002`
- Host port: `${WEB_PORT:-5173}` → container `5173`

## Layout

```
services/web/
  package.json
  vite.config.ts      # proxy + alias @api-client → pkg/api-client
  tsconfig.json
  index.html
  Dockerfile
  src/
    main.tsx
    App.tsx
    api/client.ts     # createAuthClient/createMemoClient wrappers
    pages/
      LoginPage.tsx
      MemoListPage.tsx
      MemoEditPage.tsx
    components/
      MemoFlags.tsx
```
