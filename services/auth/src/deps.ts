/**
 * Shared application dependencies for Auth service handlers / usecases.
 */
import type { UserRepository } from "./repository/users.ts";
import type { SessionRepository } from "./repository/sessions.ts";

export interface AppDeps {
  users: UserRepository;
  sessions: SessionRepository;
  sessionCookieName: string;
  sessionTtlMs: number;
  cookieSecure: boolean;
  /** Injectable clock for tests. */
  now?: () => Date;
  /** Injectable id generator for tests. */
  newId?: () => string;
}
