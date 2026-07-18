/**
 * POST /v1/auth/register
 */
import type { AppDeps } from "../deps.ts";
import { parseCredentials } from "../http/credentials.ts";
import { badRequest, conflict, jsonOk } from "../http/errors.ts";
import { register } from "../usecase/register.ts";

export async function handleRegister(
  req: Request,
  deps: AppDeps,
): Promise<Response> {
  const creds = await parseCredentials(req);
  if (!creds.ok) return badRequest(creds.message);

  const result = await register(deps, {
    loginId: creds.loginId,
    password: creds.password,
  });

  if (!result.ok) {
    return conflict(result.message);
  }
  return jsonOk(result.user, 201);
}
