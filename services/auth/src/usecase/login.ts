/**
 * Authenticate user and create a session.
 */
import type { UserRepository } from "../repository/users.ts";
import type { SessionRepository } from "../repository/sessions.ts";
import { DUMMY_PASSWORD_HASH, verifyPassword } from "../domain/password.ts";
import { computeExpiresAt } from "../domain/session.ts";
import { type PublicUser, toPublicUser } from "../domain/user.ts";

export interface LoginDeps {
  users: UserRepository;
  sessions: SessionRepository;
  sessionTtlMs: number;
  now?: () => Date;
  newId?: () => string;
}

export interface LoginInput {
  loginId: string;
  password: string;
}

export type LoginResult =
  | { ok: true; user: PublicUser; sessionId: string }
  | { ok: false; error: "unauthorized"; message: string };

function newUuid(): string {
  return crypto.randomUUID();
}

export async function login(
  deps: LoginDeps,
  input: LoginInput,
): Promise<LoginResult> {
  const user = await deps.users.findByLoginId(input.loginId);
  // Uniform body + comparable verify cost for unknown user vs bad password
  // (dummy bcrypt compare when missing — mitigates timing user enumeration).
  const hashToCheck = user?.passwordHash ?? DUMMY_PASSWORD_HASH;
  const ok = await verifyPassword(input.password, hashToCheck);
  if (!user || !ok) {
    return {
      ok: false,
      error: "unauthorized",
      message: "Invalid loginId or password",
    };
  }

  const now = (deps.now ?? (() => new Date()))();
  const sessionId = (deps.newId ?? newUuid)();
  const session = await deps.sessions.insert({
    id: sessionId,
    userId: user.id,
    createdAt: now,
    expiresAt: computeExpiresAt(now, deps.sessionTtlMs),
  });

  return {
    ok: true,
    user: toPublicUser(user),
    sessionId: session.id,
  };
}
