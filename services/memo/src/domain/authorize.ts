/**
 * Authorization matrix for memos (owner / global / secure).
 *
 * Rules (initial playground):
 * - Owner: full CRUD (read + write)
 * - Non-owner + global=true + secure=false: read only
 * - Non-owner + global=false: no access
 * - secure=true: owner only, even if global=true
 * - Write (PATCH/DELETE): owner only
 *
 * HTTP mapping (documented in README):
 * - Unauthenticated: 401 (handled before authorize)
 * - Memo missing: 404
 * - Authenticated but cannot read: 404 (do not leak existence of private memos)
 * - Can read but cannot write: 403 on write operations
 */

export interface MemoAuthzFlags {
  ownerId: string;
  global: boolean;
  secure: boolean;
}

export type AuthzAction = "read" | "write";

/**
 * Whether the actor may perform the action on the memo.
 * Pure function — no I/O.
 */
export function canAccess(
  actorUserId: string,
  memo: MemoAuthzFlags,
  action: AuthzAction,
): boolean {
  const isOwner = actorUserId === memo.ownerId;
  if (isOwner) return true;

  // Non-owner: write never allowed
  if (action === "write") return false;

  // Non-owner read: only global && !secure
  return memo.global === true && memo.secure === false;
}

/**
 * Result of applying the matrix to an existing memo for a given action.
 * - allow: proceed
 * - not_found: 404 (hide private/missing-to-caller)
 * - forbidden: 403 (visible but write denied)
 */
export type AuthzDecision = "allow" | "not_found" | "forbidden";

/**
 * Decide HTTP-level outcome for an authenticated actor against a memo.
 * Caller must ensure actor is authenticated; missing memo is 404 outside this.
 */
export function decideAccess(
  actorUserId: string,
  memo: MemoAuthzFlags,
  action: AuthzAction,
): AuthzDecision {
  if (canAccess(actorUserId, memo, action)) {
    return "allow";
  }

  // Write denied: if they could read, expose 403; else 404
  if (action === "write") {
    if (canAccess(actorUserId, memo, "read")) {
      return "forbidden";
    }
    return "not_found";
  }

  // Read denied
  return "not_found";
}
