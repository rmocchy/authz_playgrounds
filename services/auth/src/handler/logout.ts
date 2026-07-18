/**
 * POST /v1/auth/logout
 */
import type { AppDeps } from "../deps.ts";
import { buildSessionSetCookie, parseCookieHeader } from "../http/cookies.ts";
import { noContent } from "../http/errors.ts";
import { logout } from "../usecase/logout.ts";

export async function handleLogout(
  req: Request,
  deps: AppDeps,
): Promise<Response> {
  // Idempotent: always 204
  const sessionId = parseCookieHeader(
    req.headers.get("cookie"),
    deps.sessionCookieName,
  );

  await logout(deps, { sessionId });

  const clearCookie = buildSessionSetCookie({
    name: deps.sessionCookieName,
    value: "",
    maxAgeSeconds: 0,
    secure: deps.cookieSecure,
    clear: true,
  });

  return noContent({ "set-cookie": clearCookie });
}
