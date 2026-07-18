/**
 * GET /v1/sessions/me
 */
import type { UserRepository } from "../db/users.ts";
import type { SessionRepository } from "../db/sessions.ts";
import { isSessionActive, type SessionMe } from "../domain/session.ts";
import { jsonOk, unauthorized } from "../http/errors.ts";
import { parseCookieHeader } from "../http/cookies.ts";

export interface SessionRouteDeps {
  users: UserRepository;
  sessions: SessionRepository;
  sessionCookieName: string;
  now?: () => Date;
}

export async function handleMe(
  req: Request,
  deps: SessionRouteDeps,
): Promise<Response> {
  const sessionId = parseCookieHeader(
    req.headers.get("cookie"),
    deps.sessionCookieName,
  );
  if (!sessionId) {
    return unauthorized("Missing or invalid session");
  }

  const session = await deps.sessions.findById(sessionId);
  const now = (deps.now ?? (() => new Date()))();
  if (!session || !isSessionActive(session, now)) {
    return unauthorized("Missing or invalid session");
  }

  const user = await deps.users.findById(session.userId);
  if (!user) {
    return unauthorized("Missing or invalid session");
  }

  const body: SessionMe = {
    id: user.id,
    loginId: user.loginId,
  };
  return jsonOk(body, 200);
}
