/**
 * Memo domain types and pure helpers.
 * API JSON uses camelCase (ownerId, global, secure, createdAt, updatedAt).
 * DB columns use snake_case (owner_id, is_global, is_secure).
 */

export interface MemoRecord {
  id: string;
  ownerId: string;
  title: string;
  body: string;
  global: boolean;
  secure: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/** Public API shape matching TypeSpec Memo. */
export interface MemoJson {
  id: string;
  ownerId: string;
  title: string;
  body: string;
  global: boolean;
  secure: boolean;
  createdAt: string;
  updatedAt: string;
}

export function toMemoJson(memo: MemoRecord): MemoJson {
  return {
    id: memo.id,
    ownerId: memo.ownerId,
    title: memo.title,
    body: memo.body,
    global: memo.global,
    secure: memo.secure,
    createdAt: memo.createdAt.toISOString(),
    updatedAt: memo.updatedAt.toISOString(),
  };
}

export interface CreateMemoInput {
  title: string;
  body: string;
  global: boolean;
  secure: boolean;
}

export interface UpdateMemoInput {
  title?: string;
  body?: string;
  global?: boolean;
  secure?: boolean;
}

/** Max lengths for validation (learning playground, keep reasonable). */
export const MAX_TITLE_LENGTH = 500;
export const MAX_BODY_LENGTH = 100_000;

export function isValidTitle(title: string): boolean {
  return title.length <= MAX_TITLE_LENGTH;
}

export function isValidBody(body: string): boolean {
  return body.length <= MAX_BODY_LENGTH;
}
