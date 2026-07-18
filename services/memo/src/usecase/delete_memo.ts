/**
 * Delete a memo (owner write only).
 */
import type { MemoRepository } from "../repository/memos.ts";
import { decideAccess } from "../domain/authorize.ts";
import { isUuid } from "../domain/id.ts";

export interface DeleteMemoDeps {
  memos: MemoRepository;
}

export interface DeleteMemoInput {
  userId: string;
  memoId: string;
}

export type DeleteMemoResult =
  | { ok: true }
  | { ok: false; error: "not_found" | "forbidden"; message: string };

export async function deleteMemo(
  deps: DeleteMemoDeps,
  input: DeleteMemoInput,
): Promise<DeleteMemoResult> {
  if (!isUuid(input.memoId)) {
    return { ok: false, error: "not_found", message: "Memo not found" };
  }

  const memo = await deps.memos.findById(input.memoId);
  if (!memo) {
    return { ok: false, error: "not_found", message: "Memo not found" };
  }

  const decision = decideAccess(input.userId, memo, "write");
  if (decision === "not_found") {
    return { ok: false, error: "not_found", message: "Memo not found" };
  }
  if (decision === "forbidden") {
    return {
      ok: false,
      error: "forbidden",
      message: "Only the owner can delete this memo",
    };
  }

  await deps.memos.delete(input.memoId);
  return { ok: true };
}
