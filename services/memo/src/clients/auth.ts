/**
 * Auth session validation client.
 *
 * Memo does NOT read the auth DB. It forwards the browser Cookie header to
 * Auth GET /v1/sessions/me over server-to-server HTTP.
 */

export interface SessionUser {
  id: string;
  loginId: string;
}

export type SessionLookupResult =
  | { ok: true; user: SessionUser }
  | { ok: false; status: 401 | 502; message: string };

export interface AuthClient {
  /**
   * Validate session by forwarding the incoming Cookie header value
   * (full Cookie header string, e.g. "playground_session=...").
   */
  getSessionMe(cookieHeader: string | null): Promise<SessionLookupResult>;
}

export interface AuthClientOptions {
  baseUrl: string;
  /** Optional fetch override (tests). */
  fetch?: typeof globalThis.fetch;
}

export function createAuthClient(options: AuthClientOptions): AuthClient {
  const fetchFn = options.fetch ?? globalThis.fetch;
  const base = options.baseUrl.replace(/\/$/, "");

  return {
    async getSessionMe(cookieHeader) {
      if (!cookieHeader || cookieHeader.trim() === "") {
        return {
          ok: false,
          status: 401,
          message: "Missing or invalid session",
        };
      }

      let res: Response;
      try {
        res = await fetchFn(`${base}/v1/sessions/me`, {
          method: "GET",
          headers: {
            Accept: "application/json",
            Cookie: cookieHeader,
          },
        });
      } catch (err) {
        console.error("auth sessions/me request failed", err);
        return {
          ok: false,
          status: 502,
          message: "Auth service unavailable",
        };
      }

      if (res.status === 401) {
        return {
          ok: false,
          status: 401,
          message: "Missing or invalid session",
        };
      }

      if (!res.ok) {
        console.error(
          `auth sessions/me unexpected status ${res.status}`,
        );
        return {
          ok: false,
          status: 502,
          message: "Auth service error",
        };
      }

      try {
        const data = await res.json() as { id?: unknown; loginId?: unknown };
        if (
          typeof data.id !== "string" ||
          data.id === "" ||
          typeof data.loginId !== "string"
        ) {
          return {
            ok: false,
            status: 502,
            message: "Auth service returned invalid session body",
          };
        }
        return {
          ok: true,
          user: { id: data.id, loginId: data.loginId },
        };
      } catch {
        return {
          ok: false,
          status: 502,
          message: "Auth service returned invalid JSON",
        };
      }
    },
  };
}

/** Fixed-response client for unit/HTTP tests. */
export function createStubAuthClient(
  usersByCookie: Map<string, SessionUser | null>,
): AuthClient {
  return {
    getSessionMe(cookieHeader) {
      if (!cookieHeader) {
        return Promise.resolve({
          ok: false as const,
          status: 401,
          message: "Missing or invalid session",
        });
      }
      // Support full "name=value" or raw value match against map keys
      const user = usersByCookie.get(cookieHeader);
      if (user === undefined || user === null) {
        // Try matching by exact cookie header values stored as keys
        for (const [key, val] of usersByCookie) {
          if (cookieHeader.includes(key) && val) {
            return Promise.resolve({ ok: true as const, user: val });
          }
        }
        return Promise.resolve({
          ok: false as const,
          status: 401,
          message: "Missing or invalid session",
        });
      }
      return Promise.resolve({ ok: true as const, user });
    },
  };
}
