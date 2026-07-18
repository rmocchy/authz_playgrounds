/**
 * Memo CRUD routes under /v1/memos.
 */
import type { AuthClient } from "../clients/auth.ts";
import type { MemoRepository, MemoListScope } from "../db/memos.ts";
import { decideAccess } from "../domain/authorize.ts";
import {
  isValidBody,
  isValidTitle,
  toMemoJson,
  type CreateMemoInput,
  type UpdateMemoInput,
} from "../domain/memo.ts";
import {
  badRequest,
  forbidden,
  jsonError,
  jsonOk,
  noContent,
  notFound,
  unauthorized,
} from "../http/errors.ts";

export interface MemoRouteDeps {
  memos: MemoRepository;
  auth: AuthClient;
}

async function requireUser(
  req: Request,
  auth: AuthClient,
): Promise<
  | { ok: true; userId: string }
  | { ok: false; response: Response }
> {
  const cookie = req.headers.get("cookie");
  const result = await auth.getSessionMe(cookie);
  if (!result.ok) {
    if (result.status === 401) {
      return { ok: false, response: unauthorized(result.message) };
    }
    return {
      ok: false,
      response: jsonError(502, "bad_gateway", result.message),
    };
  }
  return { ok: true, userId: result.user.id };
}

function parseScope(raw: string | null): MemoListScope | null {
  if (raw === null || raw === "" || raw === "mine") return "mine";
  if (raw === "readable") return "readable";
  return null;
}

function isUuid(id: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    .test(id);
}

async function parseJsonBody(req: Request): Promise<unknown | Response> {
  try {
    return await req.json();
  } catch {
    return badRequest("Invalid JSON body");
  }
}

function parseCreateBody(data: unknown): CreateMemoInput | Response {
  if (data === null || typeof data !== "object" || Array.isArray(data)) {
    return badRequest("Body must be a JSON object");
  }
  const o = data as Record<string, unknown>;

  if (typeof o.body !== "string") {
    return badRequest("body is required and must be a string");
  }
  if (!isValidBody(o.body)) {
    return badRequest("body is too long");
  }

  let title = "";
  if (o.title !== undefined) {
    if (typeof o.title !== "string") {
      return badRequest("title must be a string");
    }
    if (!isValidTitle(o.title)) {
      return badRequest("title is too long");
    }
    title = o.title;
  }

  let global = false;
  if (o.global !== undefined) {
    if (typeof o.global !== "boolean") {
      return badRequest("global must be a boolean");
    }
    global = o.global;
  }

  let secure = false;
  if (o.secure !== undefined) {
    if (typeof o.secure !== "boolean") {
      return badRequest("secure must be a boolean");
    }
    secure = o.secure;
  }

  return { title, body: o.body, global, secure };
}

function parseUpdateBody(data: unknown): UpdateMemoInput | Response {
  if (data === null || typeof data !== "object" || Array.isArray(data)) {
    return badRequest("Body must be a JSON object");
  }
  const o = data as Record<string, unknown>;
  const out: UpdateMemoInput = {};

  if (o.title !== undefined) {
    if (typeof o.title !== "string") {
      return badRequest("title must be a string");
    }
    if (!isValidTitle(o.title)) {
      return badRequest("title is too long");
    }
    out.title = o.title;
  }
  if (o.body !== undefined) {
    if (typeof o.body !== "string") {
      return badRequest("body must be a string");
    }
    if (!isValidBody(o.body)) {
      return badRequest("body is too long");
    }
    out.body = o.body;
  }
  if (o.global !== undefined) {
    if (typeof o.global !== "boolean") {
      return badRequest("global must be a boolean");
    }
    out.global = o.global;
  }
  if (o.secure !== undefined) {
    if (typeof o.secure !== "boolean") {
      return badRequest("secure must be a boolean");
    }
    out.secure = o.secure;
  }

  if (
    out.title === undefined &&
    out.body === undefined &&
    out.global === undefined &&
    out.secure === undefined
  ) {
    return badRequest("At least one field is required");
  }

  return out;
}

export async function handleList(
  req: Request,
  deps: MemoRouteDeps,
): Promise<Response> {
  const authz = await requireUser(req, deps.auth);
  if (!authz.ok) return authz.response;

  const url = new URL(req.url);
  const scope = parseScope(url.searchParams.get("scope"));
  if (scope === null) {
    return badRequest("scope must be 'mine' or 'readable'");
  }

  const items = await deps.memos.listForUser(authz.userId, scope);
  return jsonOk({ items: items.map(toMemoJson) }, 200);
}

export async function handleCreate(
  req: Request,
  deps: MemoRouteDeps,
): Promise<Response> {
  const authz = await requireUser(req, deps.auth);
  if (!authz.ok) return authz.response;

  const raw = await parseJsonBody(req);
  if (raw instanceof Response) return raw;
  const input = parseCreateBody(raw);
  if (input instanceof Response) return input;

  const memo = await deps.memos.insert(authz.userId, input);
  return jsonOk(toMemoJson(memo), 201);
}

export async function handleGet(
  req: Request,
  deps: MemoRouteDeps,
  id: string,
): Promise<Response> {
  const authz = await requireUser(req, deps.auth);
  if (!authz.ok) return authz.response;

  if (!isUuid(id)) {
    return notFound("Memo not found");
  }

  const memo = await deps.memos.findById(id);
  if (!memo) {
    return notFound("Memo not found");
  }

  const decision = decideAccess(authz.userId, memo, "read");
  if (decision === "not_found") {
    return notFound("Memo not found");
  }
  if (decision === "forbidden") {
    return forbidden("Not allowed to read this memo");
  }

  return jsonOk(toMemoJson(memo), 200);
}

export async function handleUpdate(
  req: Request,
  deps: MemoRouteDeps,
  id: string,
): Promise<Response> {
  const authz = await requireUser(req, deps.auth);
  if (!authz.ok) return authz.response;

  if (!isUuid(id)) {
    return notFound("Memo not found");
  }

  const memo = await deps.memos.findById(id);
  if (!memo) {
    return notFound("Memo not found");
  }

  const decision = decideAccess(authz.userId, memo, "write");
  if (decision === "not_found") {
    return notFound("Memo not found");
  }
  if (decision === "forbidden") {
    return forbidden("Only the owner can update this memo");
  }

  const raw = await parseJsonBody(req);
  if (raw instanceof Response) return raw;
  const input = parseUpdateBody(raw);
  if (input instanceof Response) return input;

  const updated = await deps.memos.update(id, input);
  if (!updated) {
    return notFound("Memo not found");
  }
  return jsonOk(toMemoJson(updated), 200);
}

export async function handleDelete(
  req: Request,
  deps: MemoRouteDeps,
  id: string,
): Promise<Response> {
  const authz = await requireUser(req, deps.auth);
  if (!authz.ok) return authz.response;

  if (!isUuid(id)) {
    return notFound("Memo not found");
  }

  const memo = await deps.memos.findById(id);
  if (!memo) {
    return notFound("Memo not found");
  }

  const decision = decideAccess(authz.userId, memo, "write");
  if (decision === "not_found") {
    return notFound("Memo not found");
  }
  if (decision === "forbidden") {
    return forbidden("Only the owner can delete this memo");
  }

  await deps.memos.delete(id);
  return noContent();
}
