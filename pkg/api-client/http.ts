import { ApiError } from "./error.ts";
import type { ClientOptions, ErrorBody, HttpMethod } from "./types.ts";

export interface RequestOptions {
  method: HttpMethod;
  path: string;
  query?: Record<string, string | undefined | null>;
  body?: unknown;
  headers?: Record<string, string>;
  /** When true, parse JSON body; when false, return void (e.g. 204). */
  expectJson?: boolean;
}

function appendQuery(
  target: string,
  query?: RequestOptions["query"],
): string {
  if (!query) return target;
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(query)) {
    if (v !== undefined && v !== null && v !== "") {
      qs.set(k, v);
    }
  }
  const s = qs.toString();
  if (!s) return target;
  return target.includes("?") ? `${target}&${s}` : `${target}?${s}`;
}

/**
 * Join a client baseUrl with an API path and optional query.
 *
 * Supports:
 * - `""` → same-origin absolute path (`/v1/...`)
 * - `"/api/auth"` / `"/api/memo"` → Vite proxy prefixes (relative, no host)
 * - `"http://localhost:3001"` → absolute service URL (Deno / server-to-server)
 *
 * Exported for unit tests.
 */
export function joinUrl(
  baseUrl: string,
  path: string,
  query?: RequestOptions["query"],
): string {
  const base = (baseUrl ?? "").replace(/\/$/, "");
  const p = path.startsWith("/") ? path : `/${path}`;
  const isAbsoluteHttp = /^https?:\/\//i.test(base);

  if (isAbsoluteHttp) {
    const url = new URL(base);
    const basePath = url.pathname.replace(/\/$/, "");
    url.pathname = `${basePath}${p}`;
    // Clear any search from base; query args win.
    url.search = "";
    if (query) {
      for (const [k, v] of Object.entries(query)) {
        if (v !== undefined && v !== null && v !== "") {
          url.searchParams.set(k, v);
        }
      }
    }
    return url.toString();
  }

  // Empty or relative path prefix (browser / Vite proxy) — no host invention.
  return appendQuery(`${base}${p}`, query);
}

async function parseErrorBody(res: Response): Promise<ErrorBody | null> {
  try {
    const data = await res.json();
    if (data && typeof data === "object" && "code" in data && "message" in data) {
      return data as ErrorBody;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Low-level JSON fetch helper with credentials: 'include' for session cookies.
 */
export async function apiRequest<T>(
  options: ClientOptions,
  req: RequestOptions,
): Promise<T> {
  const fetchFn = options.fetch ?? globalThis.fetch;
  const url = joinUrl(options.baseUrl ?? "", req.path, req.query);
  const headers: Record<string, string> = {
    Accept: "application/json",
    ...options.headers,
    ...req.headers,
  };
  let body: string | undefined;
  if (req.body !== undefined) {
    headers["Content-Type"] = headers["Content-Type"] ?? "application/json";
    body = JSON.stringify(req.body);
  }

  const res = await fetchFn(url, {
    method: req.method,
    headers,
    body,
    credentials: options.credentials ?? "include",
  });

  if (!res.ok) {
    const errBody = await parseErrorBody(res);
    throw new ApiError(res.status, errBody, res);
  }

  if (req.expectJson === false || res.status === 204) {
    return undefined as T;
  }

  // 201/200 with empty body safety
  const text = await res.text();
  if (!text) {
    return undefined as T;
  }
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new ApiError(
      res.status,
      {
        code: "invalid_response",
        message: "Expected JSON response body but failed to parse",
      },
      res,
    );
  }
}

export function createHttp(options: ClientOptions = {}) {
  return {
    options,
    request: <T>(req: RequestOptions) => apiRequest<T>(options, req),
  };
}
