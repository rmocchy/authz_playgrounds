/**
 * POST /v1/auth/login
 */
import type { AppDeps } from "../deps.ts";
import { parseCredentials } from "../http/credentials.ts";
import { buildSessionSetCookie } from "../http/cookies.ts";
import { badRequest, jsonOk, unauthorized } from "../http/errors.ts";
import { login } from "../usecase/login.ts";

export async function handleLogin(
  req: Request,
  deps: AppDeps,
): Promise<Response> {
  const creds = await parseCredentials(req);
  if (!creds.ok) return badRequest(creds.message);

  const result = await login(deps, {
    loginId: creds.loginId,
    password: creds.password,
  });

  if (!result.ok) {
    return unauthorized(result.message);
  }

  const setCookie = buildSessionSetCookie({
    name: deps.sessionCookieName,
    value: result.sessionId,
    maxAgeSeconds: Math.floor(deps.sessionTtlMs / 1000),
    secure: deps.cookieSecure,
  });

  return jsonOk(result.user, 200, { "set-cookie": setCookie });
}
