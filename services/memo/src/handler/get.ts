/**
 * GET /v1/memos/:id
 */
import type { AppDeps } from "../deps.ts";
import {
  forbidden,
  jsonError,
  jsonOk,
  notFound,
  unauthorized,
} from "../http/errors.ts";
import { getMemo } from "../usecase/get_memo.ts";
import { requireUser } from "../usecase/require_user.ts";

export async function handleGet(
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

  const result = await getMemo(deps, {
    userId: authz.userId,
    memoId: id,
  });
  if (!result.ok) {
    if (result.error === "forbidden") return forbidden(result.message);
    return notFound(result.message);
  }
  return jsonOk(result.memo, 200);
}
