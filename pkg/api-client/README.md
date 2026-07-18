# pkg/api-client

TypeScript HTTP client for Auth and Memo APIs.

- **Contracts (source of truth):** TypeSpec in `specs/`
- **Generated:** OpenAPI at `specs/tsp-output/openapi/openapi.yaml` via `./tools/generate.sh` / `npm run generate`
- **This package:** Hand-synced Deno/browser-friendly fetch client matching the contract (not a TypeSpec emitter output)

## Import

```ts
// Deno / relative import
import {
  createAuthClient,
  createMemoClient,
  SESSION_COOKIE_NAME,
  ApiError,
} from "./mod.ts";

// Vite proxy layout (design §6.3): /api/auth → Auth, /api/memo → Memo
const auth = createAuthClient({
  baseUrl: "/api/auth",
  credentials: "include", // default — sends cookie playground_session
});

await auth.login({ loginId: "alice", password: "secret" });
const me = await auth.me();

const memos = createMemoClient({ baseUrl: "/api/memo" });
await memos.create({ body: "# hello", global: false, secure: false });
await memos.list("readable");
```

Absolute bases work for Deno service-to-service calls, e.g. `baseUrl: "http://auth:3001"`.

## Cookie

Session cookie name: **`playground_session`** (`SESSION_COOKIE_NAME`).  
Auth sets it on login; browsers send it when `credentials: "include"`.  
Memo/server-side callers may forward via `headers: { Cookie: "playground_session=..." }`.

## Regenerate OpenAPI

```bash
./tools/generate.sh
# or
npm run generate
# or
bash tools/generate.sh
```

After TypeSpec changes, update types/paths in this package if they diverge.  
Unit tests for URL joining: `deno test pkg/api-client/http_test.ts`
