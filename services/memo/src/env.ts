/**
 * Environment configuration for the Memo service.
 */

export interface Env {
  port: number;
  databaseUrl: string;
  /** Auth service base URL (no trailing slash), e.g. http://auth:3001 */
  authBaseUrl: string;
  sessionCookieName: string;
}

function requireString(name: string, fallback?: string): string {
  const v = Deno.env.get(name) ?? fallback;
  if (v === undefined || v === "") {
    throw new Error(`Missing required env: ${name}`);
  }
  return v;
}

export function loadEnv(
  source: { get(key: string): string | undefined } = Deno.env,
): Env {
  const port = Number(source.get("PORT") ?? "3002");
  if (!Number.isFinite(port) || port <= 0) {
    throw new Error(`Invalid PORT: ${source.get("PORT")}`);
  }

  const authBaseUrl = requireString(
    "AUTH_BASE_URL",
    "http://localhost:3001",
  ).replace(/\/$/, "");

  return {
    port,
    databaseUrl: requireString(
      "DATABASE_URL",
      "postgres://playground:changeme@localhost:5432/memo",
    ),
    authBaseUrl,
    sessionCookieName: source.get("SESSION_COOKIE_NAME") ||
      "playground_session",
  };
}
