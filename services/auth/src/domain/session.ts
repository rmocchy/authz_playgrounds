/**
 * Session domain: expiry logic is pure and unit-tested.
 * Cookie value = session id (UUID).
 */

export interface SessionRecord {
  id: string;
  userId: string;
  expiresAt: Date;
  createdAt: Date;
}

/** Payload for GET /v1/sessions/me (TypeSpec SessionMe). */
export interface SessionMe {
  id: string;
  loginId: string;
}

/**
 * Whether a session is still valid at `now`.
 * Expired if expiresAt <= now (inclusive boundary: equal means expired).
 */
export function isSessionActive(
  session: Pick<SessionRecord, "expiresAt">,
  now: Date = new Date(),
): boolean {
  return session.expiresAt.getTime() > now.getTime();
}

/** Compute expiresAt from creation time + TTL (ms). */
export function computeExpiresAt(
  createdAt: Date,
  ttlMs: number,
): Date {
  if (ttlMs <= 0) {
    throw new Error("session TTL must be positive");
  }
  return new Date(createdAt.getTime() + ttlMs);
}
