/**
 * GET /v1/sessions/me
 */
import type { AppDeps } from "../deps.ts";
import { parseCookieHeader } from "../http/cookies.ts";
import { jsonOk, unauthorized } from "../http/errors.ts";
import { getMe } from "../usecase/get_me.ts";

export async function handleMe(
  req: Request,
  deps: AppDeps,
): Promise<Response> {
  const sessionId = parseCookieHeader(
    req.headers.get("cookie"),
    deps.sessionCookieName,
  );

  const result = await getMe(deps, { sessionId });
  if (!result.ok) {
    return unauthorized(result.message);
  }
  return jsonOk(result.me, 200);
}
