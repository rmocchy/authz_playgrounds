/**
 * Types matching TypeSpec contracts in `specs/`.
 * Source of truth: specs/*.tsp → OpenAPI at specs/tsp-output/openapi/openapi.yaml
 *
 * Session cookie name: `playground_session` (HttpOnly; Path=/; SameSite=Lax).
 */

/** Cookie name issued by Auth on login. */
export const SESSION_COOKIE_NAME = "playground_session" as const;

/** Machine-readable error code from common ErrorBody. */
export type ErrorCode = string;

/** Common error body for 400/401/403/404/409 responses. */
export interface ErrorBody {
  code: ErrorCode;
  message: string;
}

/** Credentials for register and login (JSON body uses camelCase). */
export interface Credentials {
  loginId: string;
  password: string;
}

/** Public user returned by register/login. */
export interface User {
  id: string;
  loginId: string;
  createdAt: string;
}

/** Current session user from GET /v1/sessions/me. */
export interface SessionMe {
  id: string;
  loginId: string;
}

/** Memo resource. */
export interface Memo {
  id: string;
  ownerId: string;
  title: string;
  body: string;
  global: boolean;
  secure: boolean;
  createdAt: string;
  updatedAt: string;
}

/** GET /v1/memos?scope= */
export type MemoListScope = "mine" | "readable";

export interface MemoList {
  items: Memo[];
}

export interface CreateMemoRequest {
  title?: string;
  body: string;
  global?: boolean;
  secure?: boolean;
}

export interface UpdateMemoRequest {
  title?: string;
  body?: string;
  global?: boolean;
  secure?: boolean;
}

/** Successful JSON responses carry data; errors throw ApiError. */
export type HttpMethod = "GET" | "POST" | "PATCH" | "PUT" | "DELETE";

export interface ClientOptions {
  /**
   * Base URL for the service (no trailing slash).
   * Examples:
   * - `""` — same-origin paths (`/v1/...`)
   * - `"/api/auth"` / `"/api/memo"` — Vite proxy prefixes (relative)
   * - `"http://localhost:3001"` — absolute (Deno service-to-service)
   */
  baseUrl?: string;
  /**
   * fetch implementation (defaults to globalThis.fetch).
   * Useful for tests or injecting Cookie headers server-side.
   */
  fetch?: typeof globalThis.fetch;
  /**
   * Extra headers merged into every request.
   * For server-side cookie forward: { Cookie: `playground_session=${id}` }
   */
  headers?: Record<string, string>;
  /**
   * Passed to fetch. Browser default for session cookies should be "include".
   * @default "include"
   */
  credentials?: RequestCredentials;
}
