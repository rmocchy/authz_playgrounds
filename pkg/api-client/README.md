# pkg/api-client

TypeScript HTTP client for Auth and Memo APIs.

- **Contracts:** TypeSpec in `specs/` (source of truth)
- **OpenAPI:** `specs/tsp-output/openapi/openapi.yaml` (from `./tools/generate.sh`)
- **This package:** Deno/browser-friendly fetch client matching the contract

## Import

```ts
// Deno / relative import
import {
  createAuthClient,
  createMemoClient,
  SESSION_COOKIE_NAME,
  ApiError,
} from "./mod.ts";

const auth = createAuthClient({
  baseUrl: "", // same-origin (Vite proxy) or http://localhost:3001
  credentials: "include", // default — sends cookie playground_session
});

await auth.login({ loginId: "alice", password: "secret" });
const me = await auth.me();

const memos = createMemoClient({ baseUrl: "" });
await memos.create({ body: "# hello", global: false, secure: false });
await memos.list("readable");
```

## Cookie

Session cookie name: **`playground_session`** (`SESSION_COOKIE_NAME`).  
Auth sets it on login; browsers send it when `credentials: "include"`.  
Memo/server-side callers may forward via `headers: { Cookie: "playground_session=..." }`.

## Regenerate OpenAPI

```bash
./tools/generate.sh
# or
npm run generate
```

After TypeSpec changes, update types/paths in this package if they diverge.
