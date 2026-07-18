/**
 * POST /v1/memos
 */
import type { AppDeps } from "../deps.ts";
import { parseCreateMemoInput } from "../domain/memo_input.ts";
import {
  badRequest,
  jsonError,
  jsonOk,
  unauthorized,
} from "../http/errors.ts";
import { readJsonBody } from "../http/json_body.ts";
import { createMemo } from "../usecase/create_memo.ts";
import { requireUser } from "../usecase/require_user.ts";

export async function handleCreate(
  req: Request,
  deps: AppDeps,
): Promise<Response> {
  const authz = await requireUser(deps.auth, req.headers.get("cookie"));
  if (!authz.ok) {
    if (authz.error === "unauthorized") {
      return unauthorized(authz.message);
    }
    return jsonError(502, "bad_gateway", authz.message);
  }

  const raw = await readJsonBody(req);
  if (!raw.ok) return badRequest(raw.message);
  const input = parseCreateMemoInput(raw.data);
  if (!input.ok) return badRequest(input.message);

  const result = await createMemo(deps, {
    userId: authz.userId,
    input: input.value,
  });
  return jsonOk(result.memo, 201);
}
