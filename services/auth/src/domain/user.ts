/**
 * User domain types and pure helpers.
 * API JSON uses camelCase (loginId, createdAt) per TypeSpec.
 */

export interface UserRecord {
  id: string;
  loginId: string;
  passwordHash: string;
  createdAt: Date;
}

/** Public user shape returned by register/login (no password). */
export interface PublicUser {
  id: string;
  loginId: string;
  createdAt: string;
}

export function toPublicUser(user: UserRecord): PublicUser {
  return {
    id: user.id,
    loginId: user.loginId,
    createdAt: user.createdAt.toISOString(),
  };
}

/** Normalize login id: trim; empty after trim is invalid. */
export function normalizeLoginId(loginId: string): string {
  return loginId.trim();
}

export function isValidLoginId(loginId: string): boolean {
  return loginId.length >= 1 && loginId.length <= 128;
}

export function isValidPassword(password: string): boolean {
  // Min 1 per TypeSpec; upper bound avoids abuse.
  return password.length >= 1 && password.length <= 256;
}
