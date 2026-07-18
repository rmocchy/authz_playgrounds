/**
 * Resolve the current session to a public user identity.
 */
import type { UserRepository } from "../repository/users.ts";
import type { SessionRepository } from "../repository/sessions.ts";
import { isSessionActive, type SessionMe } from "../domain/session.ts";

export interface GetMeDeps {
  users: UserRepository;
  sessions: SessionRepository;
  now?: () => Date;
}

export interface GetMeInput {
  sessionId: string | undefined;
}

export type GetMeResult =
  | { ok: true; me: SessionMe }
  | { ok: false; error: "unauthorized"; message: string };

export async function getMe(
  deps: GetMeDeps,
  input: GetMeInput,
): Promise<GetMeResult> {
  if (!input.sessionId) {
    return {
      ok: false,
      error: "unauthorized",
      message: "Missing or invalid session",
    };
  }

  const session = await deps.sessions.findById(input.sessionId);
  const now = (deps.now ?? (() => new Date()))();
  if (!session || !isSessionActive(session, now)) {
    return {
      ok: false,
      error: "unauthorized",
      message: "Missing or invalid session",
    };
  }

  const user = await deps.users.findById(session.userId);
  if (!user) {
    return {
      ok: false,
      error: "unauthorized",
      message: "Missing or invalid session",
    };
  }

  return {
    ok: true,
    me: {
      id: user.id,
      loginId: user.loginId,
    },
  };
}
