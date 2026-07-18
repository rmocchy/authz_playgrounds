/**
 * Thin wrappers around pkg/api-client with Vite proxy base URLs.
 * Browser talks same-origin → cookie playground_session works without CORS.
 */
import {
  createAuthClient,
  createMemoClient,
  isApiError,
  type Credentials,
  type CreateMemoRequest,
  type Memo,
  type MemoListScope,
  type SessionMe,
  type UpdateMemoRequest,
  type User,
} from "@api-client/mod.ts";

export { isApiError };
export type {
  Credentials,
  CreateMemoRequest,
  Memo,
  MemoListScope,
  SessionMe,
  UpdateMemoRequest,
  User,
};

/** Auth API via Vite proxy: /api/auth → Auth service */
export const auth = createAuthClient({
  baseUrl: "/api/auth",
  credentials: "include",
});

/** Memo API via Vite proxy: /api/memo → Memo service */
export const memos = createMemoClient({
  baseUrl: "/api/memo",
  credentials: "include",
});

/** Human-readable error for UI banners. */
export function errorMessage(err: unknown): string {
  if (isApiError(err)) {
    const code = err.code ? ` (${err.code})` : "";
    return `${err.message}${code}`;
  }
  if (err instanceof Error) return err.message;
  return String(err);
}
