/**
 * Shared request-body parsing for loginId + password credentials.
 * Lives under http/ (not handler/) so both register and login handlers
 * can share it without bloating individual handlers.
 */
import {
  isValidLoginId,
  isValidPassword,
  MAX_PASSWORD_LENGTH,
  normalizeLoginId,
} from "../domain/user.ts";

export type Credentials =
  | { ok: true; loginId: string; password: string }
  | { ok: false; message: string };

export async function parseCredentials(req: Request): Promise<Credentials> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return { ok: false, message: "Request body must be JSON" };
  }
  if (!body || typeof body !== "object") {
    return { ok: false, message: "Request body must be a JSON object" };
  }
  const rec = body as Record<string, unknown>;
  if (typeof rec.loginId !== "string" || typeof rec.password !== "string") {
    return { ok: false, message: "loginId and password are required strings" };
  }
  const loginId = normalizeLoginId(rec.loginId);
  const password = rec.password;
  if (!isValidLoginId(loginId)) {
    return {
      ok: false,
      message: "loginId must be 1–128 characters after trim",
    };
  }
  if (!isValidPassword(password)) {
    return {
      ok: false,
      message: `password must be 1–${MAX_PASSWORD_LENGTH} characters`,
    };
  }
  return { ok: true, loginId, password };
}
