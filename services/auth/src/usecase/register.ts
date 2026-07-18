/**
 * Register a new user (loginId + password).
 */
import type { UserRepository } from "../repository/users.ts";
import { hashPassword } from "../domain/password.ts";
import {
  toPublicUser,
  type PublicUser,
  type UserRecord,
} from "../domain/user.ts";

export interface RegisterDeps {
  users: UserRepository;
  now?: () => Date;
  newId?: () => string;
}

export interface RegisterInput {
  loginId: string;
  password: string;
}

export type RegisterResult =
  | { ok: true; user: PublicUser }
  | { ok: false; error: "conflict"; message: string };

function newUuid(): string {
  return crypto.randomUUID();
}

function isUniqueViolation(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const e = err as { code?: string; message?: string };
  return e.code === "23505" ||
    (typeof e.message === "string" &&
      e.message.toLowerCase().includes("duplicate"));
}

export async function register(
  deps: RegisterDeps,
  input: RegisterInput,
): Promise<RegisterResult> {
  const existing = await deps.users.findByLoginId(input.loginId);
  if (existing) {
    return {
      ok: false,
      error: "conflict",
      message: "loginId already registered",
    };
  }

  const now = (deps.now ?? (() => new Date()))();
  const passwordHash = await hashPassword(input.password);
  const user: UserRecord = {
    id: (deps.newId ?? newUuid)(),
    loginId: input.loginId,
    passwordHash,
    createdAt: now,
  };

  try {
    const created = await deps.users.insert(user);
    return { ok: true, user: toPublicUser(created) };
  } catch (err) {
    if (isUniqueViolation(err)) {
      return {
        ok: false,
        error: "conflict",
        message: "loginId already registered",
      };
    }
    throw err;
  }
}
