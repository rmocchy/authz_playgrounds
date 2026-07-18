/**
 * Memo CRUD client functions.
 * Paths match TypeSpec: /v1/memos
 * Cookie: playground_session (credentials: 'include').
 */
import { createHttp } from "./http.ts";
import type {
  ClientOptions,
  CreateMemoRequest,
  Memo,
  MemoList,
  MemoListScope,
  UpdateMemoRequest,
} from "./types.ts";

export interface MemoClient {
  list(scope?: MemoListScope): Promise<MemoList>;
  create(body: CreateMemoRequest): Promise<Memo>;
  get(id: string): Promise<Memo>;
  update(id: string, body: UpdateMemoRequest): Promise<Memo>;
  delete(id: string): Promise<void>;
}

export function createMemoClient(options: ClientOptions = {}): MemoClient {
  const http = createHttp(options);

  return {
    async list(scope: MemoListScope = "mine"): Promise<MemoList> {
      return http.request<MemoList>({
        method: "GET",
        path: "/v1/memos",
        query: { scope },
      });
    },

    async create(body: CreateMemoRequest): Promise<Memo> {
      return http.request<Memo>({
        method: "POST",
        path: "/v1/memos",
        body,
      });
    },

    async get(id: string): Promise<Memo> {
      return http.request<Memo>({
        method: "GET",
        path: `/v1/memos/${encodeURIComponent(id)}`,
      });
    },

    async update(id: string, body: UpdateMemoRequest): Promise<Memo> {
      return http.request<Memo>({
        method: "PATCH",
        path: `/v1/memos/${encodeURIComponent(id)}`,
        body,
      });
    },

    async delete(id: string): Promise<void> {
      return http.request<void>({
        method: "DELETE",
        path: `/v1/memos/${encodeURIComponent(id)}`,
        expectJson: false,
      });
    },
  };
}

export async function listMemos(
  scope?: MemoListScope,
  options?: ClientOptions,
): Promise<MemoList> {
  return createMemoClient(options).list(scope);
}

export async function createMemo(
  body: CreateMemoRequest,
  options?: ClientOptions,
): Promise<Memo> {
  return createMemoClient(options).create(body);
}

export async function getMemo(
  id: string,
  options?: ClientOptions,
): Promise<Memo> {
  return createMemoClient(options).get(id);
}

export async function updateMemo(
  id: string,
  body: UpdateMemoRequest,
  options?: ClientOptions,
): Promise<Memo> {
  return createMemoClient(options).update(id, body);
}

export async function deleteMemo(
  id: string,
  options?: ClientOptions,
): Promise<void> {
  return createMemoClient(options).delete(id);
}
