/**
 * List memos for the authenticated user (mine | readable).
 */
import type { MemoListScope } from "../domain/memo.ts";
import type { MemoRepository } from "../repository/memos.ts";
import { type MemoJson, toMemoJson } from "../domain/memo.ts";

export interface ListMemosDeps {
  memos: MemoRepository;
}

export interface ListMemosInput {
  userId: string;
  scope: MemoListScope;
}

export interface ListMemosResult {
  ok: true;
  items: MemoJson[];
}

export async function listMemos(
  deps: ListMemosDeps,
  input: ListMemosInput,
): Promise<ListMemosResult> {
  const items = await deps.memos.listForUser(input.userId, input.scope);
  return { ok: true, items: items.map(toMemoJson) };
}
