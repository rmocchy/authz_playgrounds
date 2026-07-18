/**
 * Environment configuration for the Auth service.
 * Auth is the app authz platform (NOT an IdP).
 */

export interface Env {
  port: number;
  databaseUrl: string;
  sessionCookieName: string;
  /** Session TTL in milliseconds. */
  sessionTtlMs: number;
  cookieSecure: boolean;
  seedLoginId: string | null;
  seedPassword: string | null;
}

function requireString(name: string, fallback?: string): string {
  const v = Deno.env.get(name) ?? fallback;
  if (v === undefined || v === "") {
    throw new Error(`Missing required env: ${name}`);
  }
  return v;
}

function parseBool(raw: string | undefined, defaultValue: boolean): boolean {
  if (raw === undefined || raw === "") return defaultValue;
  const lower = raw.toLowerCase();
  if (["1", "true", "yes", "on"].includes(lower)) return true;
  if (["0", "false", "no", "off"].includes(lower)) return false;
  return defaultValue;
}

/** Default session TTL: 7 days. */
export const DEFAULT_SESSION_TTL_SECONDS = 7 * 24 * 60 * 60;

export function loadEnv(
  source: { get(key: string): string | undefined } = Deno.env,
): Env {
  const port = Number(source.get("PORT") ?? "3001");
  if (!Number.isFinite(port) || port <= 0) {
    throw new Error(`Invalid PORT: ${source.get("PORT")}`);
  }

  const ttlSeconds = Number(
    source.get("SESSION_TTL_SECONDS") ?? String(DEFAULT_SESSION_TTL_SECONDS),
  );
  if (!Number.isFinite(ttlSeconds) || ttlSeconds <= 0) {
    throw new Error(
      `Invalid SESSION_TTL_SECONDS: ${source.get("SESSION_TTL_SECONDS")}`,
    );
  }

  return {
    port,
    databaseUrl: requireString("DATABASE_URL", "postgres://playground:changeme@localhost:5432/auth"),
    sessionCookieName: source.get("SESSION_COOKIE_NAME") || "playground_session",
    sessionTtlMs: Math.floor(ttlSeconds * 1000),
    cookieSecure: parseBool(source.get("COOKIE_SECURE"), false),
    seedLoginId: source.get("SEED_LOGIN_ID") || null,
    seedPassword: source.get("SEED_PASSWORD") || null,
  };
}
