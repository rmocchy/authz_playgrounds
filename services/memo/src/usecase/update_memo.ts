/**
 * Update a memo (owner write only).
 */
import type { MemoRepository } from "../repository/memos.ts";
import { decideAccess } from "../domain/authorize.ts";
import { isUuid } from "../domain/id.ts";
import {
  type MemoJson,
  toMemoJson,
  type UpdateMemoInput,
} from "../domain/memo.ts";

export interface UpdateMemoDeps {
  memos: MemoRepository;
}

export interface UpdateMemoUsecaseInput {
  userId: string;
  memoId: string;
  input: UpdateMemoInput;
}

export type UpdateMemoResult =
  | { ok: true; memo: MemoJson }
  | { ok: false; error: "not_found" | "forbidden"; message: string };

export async function updateMemo(
  deps: UpdateMemoDeps,
  args: UpdateMemoUsecaseInput,
): Promise<UpdateMemoResult> {
  if (!isUuid(args.memoId)) {
    return { ok: false, error: "not_found", message: "Memo not found" };
  }

  const memo = await deps.memos.findById(args.memoId);
  if (!memo) {
    return { ok: false, error: "not_found", message: "Memo not found" };
  }

  const decision = decideAccess(args.userId, memo, "write");
  if (decision === "not_found") {
    return { ok: false, error: "not_found", message: "Memo not found" };
  }
  if (decision === "forbidden") {
    return {
      ok: false,
      error: "forbidden",
      message: "Only the owner can update this memo",
    };
  }

  const updated = await deps.memos.update(args.memoId, args.input);
  if (!updated) {
    return { ok: false, error: "not_found", message: "Memo not found" };
  }
  return { ok: true, memo: toMemoJson(updated) };
}
