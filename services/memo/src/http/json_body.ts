/**
 * Shared JSON body reader for Memo handlers.
 */
export type JsonBodyResult =
  | { ok: true; data: unknown }
  | { ok: false; message: string };

export async function readJsonBody(req: Request): Promise<JsonBodyResult> {
  try {
    return { ok: true, data: await req.json() };
  } catch {
    return { ok: false, message: "Invalid JSON body" };
  }
}
