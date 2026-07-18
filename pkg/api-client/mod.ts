/**
 * @module pkg/api-client
 *
 * Deno- and browser-friendly HTTP client for Authz Playground APIs.
 * Contracts are defined in TypeSpec (`specs/`) and emitted to OpenAPI;
 * this client is maintained to match that contract (see tools/generate.sh).
 *
 * Session cookie: `playground_session` — use credentials: 'include' (default).
 *
 * @example Browser / Vite (same-origin proxy)
 * ```ts
 * import { createAuthClient, createMemoClient } from "../../pkg/api-client/mod.ts";
 * const auth = createAuthClient({ baseUrl: "" });
 * await auth.login({ loginId: "alice", password: "secret" });
 * const memos = createMemoClient({ baseUrl: "" });
 * await memos.list("readable");
 * ```
 *
 * @example Deno service calling Auth
 * ```ts
 * import { createAuthClient } from "../../pkg/api-client/mod.ts";
 * const auth = createAuthClient({
 *   baseUrl: Deno.env.get("AUTH_URL") ?? "http://auth:3001",
 *   headers: { Cookie: `playground_session=${sessionId}` },
 *   credentials: "include",
 * });
 * const me = await auth.me();
 * ```
 */

export {
  SESSION_COOKIE_NAME,
  type ClientOptions,
  type Credentials,
  type CreateMemoRequest,
  type ErrorBody,
  type ErrorCode,
  type HttpMethod,
  type Memo,
  type MemoList,
  type MemoListScope,
  type SessionMe,
  type UpdateMemoRequest,
  type User,
} from "./types.ts";

export { ApiError, isApiError } from "./error.ts";
export { apiRequest, createHttp } from "./http.ts";

export {
  createAuthClient,
  login,
  logout,
  me,
  register,
  type AuthClient,
} from "./auth.ts";

export {
  createMemo,
  createMemoClient,
  deleteMemo,
  getMemo,
  listMemos,
  updateMemo,
  type MemoClient,
} from "./memo.ts";
