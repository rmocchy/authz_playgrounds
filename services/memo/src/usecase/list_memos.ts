/**
 * List memos for the authenticated user (mine | readable).
 */
import type { MemoRepository, MemoListScope } from "../repository/memos.ts";
import { toMemoJson, type MemoJson } from "../domain/memo.ts";

export interface ListMemosDeps {
  memos: MemoRepository;
}

export interface ListMemosInput {
  userId: string;
  scope: MemoListScope;
}

export type ListMemosResult = { ok: true; items: MemoJson[] };

export async function listMemos(
  deps: ListMemosDeps,
  input: ListMemosInput,
): Promise<ListMemosResult> {
  const items = await deps.memos.listForUser(input.userId, input.scope);
  return { ok: true, items: items.map(toMemoJson) };
}
