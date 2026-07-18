/**
 * Shared application dependencies for Memo service handlers / usecases.
 */
import type { AuthClient } from "./clients/auth.ts";
import type { MemoRepository } from "./repository/memos.ts";

export interface AppDeps {
  memos: MemoRepository;
  auth: AuthClient;
}
