/**
 * HTTP router for Auth service (fetch handler).
 * Separated from main.ts so tests can drive the app without binding a port.
 */
import type { AuthRouteDeps } from "./routes/auth.ts";
import {
  handleLogin,
  handleLogout,
  handleRegister,
} from "./routes/auth.ts";
import {
  handleMe,
  type SessionRouteDeps,
} from "./routes/sessions.ts";
import { jsonError } from "./http/errors.ts";

export type AppDeps = AuthRouteDeps & SessionRouteDeps;

export function createHandler(deps: AppDeps): (req: Request) => Promise<Response> {
  return async (req: Request): Promise<Response> => {
    try {
      const url = new URL(req.url);
      const path = url.pathname.replace(/\/+$/, "") || "/";
      const method = req.method.toUpperCase();

      // Health for compose / ops
      if (method === "GET" && (path === "/health" || path === "/healthz")) {
        return new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { "content-type": "application/json; charset=utf-8" },
        });
      }

      if (method === "POST" && path === "/v1/auth/register") {
        return await handleRegister(req, deps);
      }
      if (method === "POST" && path === "/v1/auth/login") {
        return await handleLogin(req, deps);
      }
      if (method === "POST" && path === "/v1/auth/logout") {
        return await handleLogout(req, deps);
      }
      if (method === "GET" && path === "/v1/sessions/me") {
        return await handleMe(req, deps);
      }

      return jsonError(404, "not_found", `No route ${method} ${path}`);
    } catch (err) {
      console.error("unhandled error", err);
      return jsonError(500, "internal_error", "Internal server error");
    }
  };
}
