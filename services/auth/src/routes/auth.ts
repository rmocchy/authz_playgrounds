/**
 * POST /v1/auth/register | login | logout
 */
import type { UserRepository } from "../db/users.ts";
import type { SessionRepository } from "../db/sessions.ts";
import {
  DUMMY_PASSWORD_HASH,
  hashPassword,
  verifyPassword,
} from "../domain/password.ts";
import {
  isValidLoginId,
  isValidPassword,
  MAX_PASSWORD_LENGTH,
  normalizeLoginId,
  toPublicUser,
  type UserRecord,
} from "../domain/user.ts";
import { computeExpiresAt } from "../domain/session.ts";
import {
  badRequest,
  conflict,
  jsonOk,
  noContent,
  unauthorized,
} from "../http/errors.ts";
import {
  buildSessionSetCookie,
  parseCookieHeader,
} from "../http/cookies.ts";

export interface AuthRouteDeps {
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

async function parseCredentials(
  req: Request,
): Promise<{ loginId: string; password: string } | Response> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return badRequest("Request body must be JSON");
  }
  if (!body || typeof body !== "object") {
    return badRequest("Request body must be a JSON object");
  }
  const rec = body as Record<string, unknown>;
  if (typeof rec.loginId !== "string" || typeof rec.password !== "string") {
    return badRequest("loginId and password are required strings");
  }
  const loginId = normalizeLoginId(rec.loginId);
  const password = rec.password;
  if (!isValidLoginId(loginId)) {
    return badRequest("loginId must be 1–128 characters after trim");
  }
  if (!isValidPassword(password)) {
    return badRequest(
      `password must be 1–${MAX_PASSWORD_LENGTH} characters`,
    );
  }
  return { loginId, password };
}

export async function handleRegister(
  req: Request,
  deps: AuthRouteDeps,
): Promise<Response> {
  const creds = await parseCredentials(req);
  if (creds instanceof Response) return creds;

  const existing = await deps.users.findByLoginId(creds.loginId);
  if (existing) {
    return conflict("loginId already registered");
  }

  const now = (deps.now ?? (() => new Date()))();
  const passwordHash = await hashPassword(creds.password);
  const user: UserRecord = {
    id: (deps.newId ?? newUuid)(),
    loginId: creds.loginId,
    passwordHash,
    createdAt: now,
  };

  try {
    const created = await deps.users.insert(user);
    return jsonOk(toPublicUser(created), 201);
  } catch (err) {
    if (isUniqueViolation(err)) {
      return conflict("loginId already registered");
    }
    throw err;
  }
}

export async function handleLogin(
  req: Request,
  deps: AuthRouteDeps,
): Promise<Response> {
  const creds = await parseCredentials(req);
  if (creds instanceof Response) return creds;

  const user = await deps.users.findByLoginId(creds.loginId);
  // Uniform body + comparable verify cost for unknown user vs bad password
  // (dummy bcrypt compare when missing — mitigates timing user enumeration).
  const hashToCheck = user?.passwordHash ?? DUMMY_PASSWORD_HASH;
  const ok = await verifyPassword(creds.password, hashToCheck);
  if (!user || !ok) {
    return unauthorized("Invalid loginId or password");
  }

  const now = (deps.now ?? (() => new Date()))();
  const sessionId = (deps.newId ?? newUuid)();
  const session = await deps.sessions.insert({
    id: sessionId,
    userId: user.id,
    createdAt: now,
    expiresAt: computeExpiresAt(now, deps.sessionTtlMs),
  });

  const setCookie = buildSessionSetCookie({
    name: deps.sessionCookieName,
    value: session.id,
    maxAgeSeconds: Math.floor(deps.sessionTtlMs / 1000),
    secure: deps.cookieSecure,
  });

  return jsonOk(toPublicUser(user), 200, { "set-cookie": setCookie });
}

export async function handleLogout(
  req: Request,
  deps: AuthRouteDeps,
): Promise<Response> {
  // Idempotent: always 204
  const cookieHeader = req.headers.get("cookie");
  const sessionId = parseCookieHeader(cookieHeader, deps.sessionCookieName);
  if (sessionId) {
    await deps.sessions.deleteById(sessionId);
  }

  const clearCookie = buildSessionSetCookie({
    name: deps.sessionCookieName,
    value: "",
    maxAgeSeconds: 0,
    secure: deps.cookieSecure,
    clear: true,
  });

  return noContent({ "set-cookie": clearCookie });
}
