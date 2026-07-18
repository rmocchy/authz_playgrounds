/**
 * Create a memo owned by the authenticated user.
 */
import type { MemoRepository } from "../repository/memos.ts";
import {
  type CreateMemoInput,
  type MemoJson,
  toMemoJson,
} from "../domain/memo.ts";

export interface CreateMemoDeps {
  memos: MemoRepository;
}

export interface CreateMemoUsecaseInput {
  userId: string;
  input: CreateMemoInput;
}

export interface CreateMemoResult {
  ok: true;
  memo: MemoJson;
}

export async function createMemo(
  deps: CreateMemoDeps,
  args: CreateMemoUsecaseInput,
): Promise<CreateMemoResult> {
  const memo = await deps.memos.insert(args.userId, args.input);
  return { ok: true, memo: toMemoJson(memo) };
}
