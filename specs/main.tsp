/**
 * Authz Playground — HTTP API contracts (source of truth).
 *
 * Services:
 * - Auth  (register / login / logout / sessions/me)
 * - Memo  (CRUD + global/secure authorization attributes)
 *
 * Session cookie: playground_session (HttpOnly; Path=/; SameSite=Lax)
 *
 * Generate: `./tools/generate.sh` or `npm run generate` (or `npx tsp compile specs`)
 * Generated output: OpenAPI under `specs/tsp-output/openapi/`
 * Hand-synced client: `pkg/api-client/` (Deno-friendly fetch wrappers; update when paths/shapes change)
 */
import "@typespec/http";
import "@typespec/openapi";
import "./common/errors.tsp";
import "./auth/auth.tsp";
import "./auth/sessions.tsp";
import "./memo/memos.tsp";

using Http;
using OpenAPI;

/**
 * Combined service description for OpenAPI emission.
 * Runtime services may be split (auth :3001, memo :3002) but share this contract surface.
 */
@service(#{
  title: "Authz Playground API",
})
@info(#{
  version: "0.1.0",
})
@doc("Learning playground HTTP contracts for Auth (session cookie) and Memo CRUD.")
@server("http://localhost:3001", "Auth service (local)")
@server("http://localhost:3002", "Memo service (local)")
namespace AuthzPlayground;
