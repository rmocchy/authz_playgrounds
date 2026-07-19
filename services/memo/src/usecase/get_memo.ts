/**
 * Get a single memo with read authorization.
 */
import type { MemoRepository } from "../repository/memos.ts";
import { decideAccess } from "../domain/authorize.ts";
import { isUuid } from "../domain/id.ts";
import { type MemoJson, toMemoJson } from "../domain/memo.ts";

export interface GetMemoDeps {
  memos: MemoRepository;
}

export interface GetMemoInput {
  userId: string;
  memoId: string;
}

export type GetMemoResult =
  | { ok: true; memo: MemoJson }
  | { ok: false; error: "not_found" | "forbidden"; message: string };

export async function getMemo(
  deps: GetMemoDeps,
  input: GetMemoInput,
): Promise<GetMemoResult> {
  if (!isUuid(input.memoId)) {
    return { ok: false, error: "not_found", message: "Memo not found" };
  }

  const memo = await deps.memos.findById(input.memoId);
  if (!memo) {
    return { ok: false, error: "not_found", message: "Memo not found" };
  }

  const decision = decideAccess(input.userId, memo, "read");
  if (decision === "not_found") {
    return { ok: false, error: "not_found", message: "Memo not found" };
  }
  if (decision === "forbidden") {
    return {
      ok: false,
      error: "forbidden",
      message: "Not allowed to read this memo",
    };
  }

  return { ok: true, memo: toMemoJson(memo) };
}
