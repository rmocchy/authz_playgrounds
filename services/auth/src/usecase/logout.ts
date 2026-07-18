/**
 * Invalidate a session if present (idempotent).
 */
import type { SessionRepository } from "../repository/sessions.ts";

export interface LogoutDeps {
  sessions: SessionRepository;
}

export interface LogoutInput {
  sessionId: string | undefined;
}

/** Always succeeds; missing session is a no-op. */
export async function logout(
  deps: LogoutDeps,
  input: LogoutInput,
): Promise<void> {
  if (input.sessionId) {
    await deps.sessions.deleteById(input.sessionId);
  }
}
