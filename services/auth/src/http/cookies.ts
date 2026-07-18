/**
 * Session cookie helpers.
 * Attributes: HttpOnly; Path=/; SameSite=Lax; Secure only when configured (HTTPS).
 */

export function parseCookieHeader(
  header: string | null,
  name: string,
): string | undefined {
  if (!header) return undefined;
  // Simple parser: name=value pairs separated by "; "
  const parts = header.split(";");
  for (const part of parts) {
    const trimmed = part.trim();
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const k = trimmed.slice(0, eq).trim();
    if (k === name) {
      return decodeURIComponent(trimmed.slice(eq + 1).trim());
    }
  }
  return undefined;
}

export interface SessionCookieOptions {
  name: string;
  value: string;
  /** Max-Age in seconds. */
  maxAgeSeconds: number;
  secure: boolean;
  /** When true, expire the cookie immediately. */
  clear?: boolean;
}

/**
 * Build Set-Cookie for playground_session.
 * Local HTTP: no Secure. Path=/; HttpOnly; SameSite=Lax.
 */
export function buildSessionSetCookie(opts: SessionCookieOptions): string {
  if (opts.clear) {
    const parts = [
      `${opts.name}=`,
      "Path=/",
      "HttpOnly",
      "SameSite=Lax",
      "Max-Age=0",
    ];
    if (opts.secure) parts.push("Secure");
    return parts.join("; ");
  }

  const parts = [
    `${opts.name}=${encodeURIComponent(opts.value)}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${Math.max(0, Math.floor(opts.maxAgeSeconds))}`,
  ];
  if (opts.secure) parts.push("Secure");
  return parts.join("; ");
}
