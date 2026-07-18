/**
 * Resolve the actor user id from the inbound Cookie via Auth.
 */
import type { AuthClient } from "../clients/auth.ts";

export type RequireUserResult =
  | { ok: true; userId: string }
  | {
    ok: false;
    error: "unauthorized" | "bad_gateway";
    message: string;
  };

export async function requireUser(
  auth: AuthClient,
  cookieHeader: string | null,
): Promise<RequireUserResult> {
  const result = await auth.getSessionMe(cookieHeader);
  if (!result.ok) {
    if (result.status === 401) {
      return { ok: false, error: "unauthorized", message: result.message };
    }
    return { ok: false, error: "bad_gateway", message: result.message };
  }
  return { ok: true, userId: result.user.id };
}
