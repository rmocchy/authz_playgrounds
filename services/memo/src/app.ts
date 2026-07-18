/**
 * HTTP router for Memo service (fetch handler).
 * Separated from main.ts so tests can drive the app without binding a port.
 */
import type { MemoRouteDeps } from "./routes/memos.ts";
import {
  handleCreate,
  handleDelete,
  handleGet,
  handleList,
  handleUpdate,
} from "./routes/memos.ts";
import { jsonError } from "./http/errors.ts";

export type AppDeps = MemoRouteDeps;

const MEMO_ID_PATH = /^\/v1\/memos\/([^/]+)$/;

export function createHandler(
  deps: AppDeps,
): (req: Request) => Promise<Response> {
  return async (req: Request): Promise<Response> => {
    try {
      const url = new URL(req.url);
      const path = url.pathname.replace(/\/+$/, "") || "/";
      const method = req.method.toUpperCase();

      if (method === "GET" && (path === "/health" || path === "/healthz")) {
        return new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { "content-type": "application/json; charset=utf-8" },
        });
      }

      if (method === "GET" && path === "/v1/memos") {
        return await handleList(req, deps);
      }
      if (method === "POST" && path === "/v1/memos") {
        return await handleCreate(req, deps);
      }

      const match = path.match(MEMO_ID_PATH);
      if (match) {
        const id = decodeURIComponent(match[1]!);
        if (method === "GET") {
          return await handleGet(req, deps, id);
        }
        if (method === "PATCH") {
          return await handleUpdate(req, deps, id);
        }
        if (method === "DELETE") {
          return await handleDelete(req, deps, id);
        }
      }

      return jsonError(404, "not_found", `No route ${method} ${path}`);
    } catch (err) {
      console.error("unhandled error", err);
      return jsonError(500, "internal_error", "Internal server error");
    }
  };
}
