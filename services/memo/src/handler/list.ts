/**
 * GET /v1/memos
 */
import type { AppDeps } from "../deps.ts";
import type { MemoListScope } from "../domain/memo.ts";
import { badRequest, jsonError, jsonOk, unauthorized } from "../http/errors.ts";
import { listMemos } from "../usecase/list_memos.ts";
import { requireUser } from "../usecase/require_user.ts";

function parseScope(raw: string | null): MemoListScope | null {
  if (raw === null || raw === "" || raw === "mine") return "mine";
  if (raw === "readable") return "readable";
  return null;
}

export async function handleList(
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

  const url = new URL(req.url);
  const scope = parseScope(url.searchParams.get("scope"));
  if (scope === null) {
    return badRequest("scope must be 'mine' or 'readable'");
  }

  const result = await listMemos(deps, {
    userId: authz.userId,
    scope,
  });
  return jsonOk({ items: result.items }, 200);
}
