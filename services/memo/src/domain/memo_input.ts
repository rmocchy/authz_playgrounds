/**
 * Request-shaped memo input validation (pure; no HTTP types).
 */
import {
  isValidBody,
  isValidTitle,
  type CreateMemoInput,
  type UpdateMemoInput,
} from "./memo.ts";

export type ParseResult<T> =
  | { ok: true; value: T }
  | { ok: false; message: string };

export function parseCreateMemoInput(data: unknown): ParseResult<CreateMemoInput> {
  if (data === null || typeof data !== "object" || Array.isArray(data)) {
    return { ok: false, message: "Body must be a JSON object" };
  }
  const o = data as Record<string, unknown>;

  if (typeof o.body !== "string") {
    return { ok: false, message: "body is required and must be a string" };
  }
  if (!isValidBody(o.body)) {
    return { ok: false, message: "body is too long" };
  }

  let title = "";
  if (o.title !== undefined) {
    if (typeof o.title !== "string") {
      return { ok: false, message: "title must be a string" };
    }
    if (!isValidTitle(o.title)) {
      return { ok: false, message: "title is too long" };
    }
    title = o.title;
  }

  let global = false;
  if (o.global !== undefined) {
    if (typeof o.global !== "boolean") {
      return { ok: false, message: "global must be a boolean" };
    }
    global = o.global;
  }

  let secure = false;
  if (o.secure !== undefined) {
    if (typeof o.secure !== "boolean") {
      return { ok: false, message: "secure must be a boolean" };
    }
    secure = o.secure;
  }

  return { ok: true, value: { title, body: o.body, global, secure } };
}

export function parseUpdateMemoInput(data: unknown): ParseResult<UpdateMemoInput> {
  if (data === null || typeof data !== "object" || Array.isArray(data)) {
    return { ok: false, message: "Body must be a JSON object" };
  }
  const o = data as Record<string, unknown>;
  const out: UpdateMemoInput = {};

  if (o.title !== undefined) {
    if (typeof o.title !== "string") {
      return { ok: false, message: "title must be a string" };
    }
    if (!isValidTitle(o.title)) {
      return { ok: false, message: "title is too long" };
    }
    out.title = o.title;
  }
  if (o.body !== undefined) {
    if (typeof o.body !== "string") {
      return { ok: false, message: "body must be a string" };
    }
    if (!isValidBody(o.body)) {
      return { ok: false, message: "body is too long" };
    }
    out.body = o.body;
  }
  if (o.global !== undefined) {
    if (typeof o.global !== "boolean") {
      return { ok: false, message: "global must be a boolean" };
    }
    out.global = o.global;
  }
  if (o.secure !== undefined) {
    if (typeof o.secure !== "boolean") {
      return { ok: false, message: "secure must be a boolean" };
    }
    out.secure = o.secure;
  }

  if (
    out.title === undefined &&
    out.body === undefined &&
    out.global === undefined &&
    out.secure === undefined
  ) {
    return { ok: false, message: "At least one field is required" };
  }

  return { ok: true, value: out };
}
