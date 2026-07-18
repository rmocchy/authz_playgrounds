/**
 * PATCH /v1/memos/:id
 */
import type { AppDeps } from "../deps.ts";
import { parseUpdateMemoInput } from "../domain/memo_input.ts";
import {
  badRequest,
  forbidden,
  jsonError,
  jsonOk,
  notFound,
  unauthorized,
} from "../http/errors.ts";
import { readJsonBody } from "../http/json_body.ts";
import { requireUser } from "../usecase/require_user.ts";
import { updateMemo } from "../usecase/update_memo.ts";

export async function handleUpdate(
  req: Request,
  deps: AppDeps,
  id: string,
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
  const input = parseUpdateMemoInput(raw.data);
  if (!input.ok) return badRequest(input.message);

  const result = await updateMemo(deps, {
    userId: authz.userId,
    memoId: id,
    input: input.value,
  });
  if (!result.ok) {
    if (result.error === "forbidden") return forbidden(result.message);
    return notFound(result.message);
  }
  return jsonOk(result.memo, 200);
}
