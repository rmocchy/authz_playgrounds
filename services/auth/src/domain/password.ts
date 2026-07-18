/**
 * Password hashing with bcrypt (cost factor 10).
 * Design allows argon2id or bcrypt — bcryptjs is pure JS and Deno-friendly
 * without native bindings (SafeQL/postgres path is separate).
 */
import bcrypt from "bcryptjs";

const BCRYPT_ROUNDS = 10;

/** Hash a plaintext password for storage. Never store plaintext. */
export async function hashPassword(plaintext: string): Promise<string> {
  if (plaintext.length < 1) {
    throw new Error("password must be non-empty");
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
