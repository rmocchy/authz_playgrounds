/**
 * Password hashing with bcrypt (cost factor 10).
 * Design allows argon2id or bcrypt — bcryptjs is pure JS and Deno-friendly
 * without native bindings (SafeQL/postgres path is separate).
 *
 * bcrypt only uses the first 72 bytes of the password; callers should cap
 * input length at BCRYPT_MAX_PASSWORD_LENGTH (see isValidPassword).
 */
import bcrypt from "bcryptjs";

const BCRYPT_ROUNDS = 10;

/** bcrypt effective password length limit (bytes; we treat as characters). */
export const BCRYPT_MAX_PASSWORD_LENGTH = 72;

/**
 * Precomputed bcrypt hash of a dummy secret (cost 10).
 * Used on login when the user is missing so verify still burns ~same time
 * (mitigates user-enumeration via response timing). Never matches a real user.
 */
export const DUMMY_PASSWORD_HASH =
  "$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy";

/** Hash a plaintext password for storage. Never store plaintext. */
export async function hashPassword(plaintext: string): Promise<string> {
  if (plaintext.length < 1) {
    throw new Error("password must be non-empty");
  }
  if (plaintext.length > BCRYPT_MAX_PASSWORD_LENGTH) {
    throw new Error(
      `password must be at most ${BCRYPT_MAX_PASSWORD_LENGTH} characters (bcrypt limit)`,
    );
  }
  return await bcrypt.hash(plaintext, BCRYPT_ROUNDS);
}

/** Constant-time verify of plaintext against a stored bcrypt hash. */
export async function verifyPassword(
  plaintext: string,
  passwordHash: string,
): Promise<boolean> {
  if (!passwordHash) return false;
  try {
    return await bcrypt.compare(plaintext, passwordHash);
  } catch {
    return false;
  }
}
