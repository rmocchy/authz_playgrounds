/**
 * Request-shaped memo input validation (pure; no HTTP types).
 */
import {
  type CreateMemoInput,
  isValidBody,
  isValidTitle,
  type UpdateMemoInput,
} from "./memo.ts";

export type ParseResult<T> =
  | { ok: true; value: T }
  | { ok: false; message: string };

function asObject(
  data: unknown,
): ParseResult<Record<string, unknown>> {
  if (data === null || typeof data !== "object" || Array.isArray(data)) {
    return { ok: false, message: "Body must be a JSON object" };
  }
  return { ok: true, value: data as Record<string, unknown> };
}

function optionalString(
  o: Record<string, unknown>,
  key: string,
  validate: (s: string) => boolean,
  tooLongMsg: string,
): ParseResult<string | undefined> {
  if (o[key] === undefined) {
    return { ok: true, value: undefined };
  }
  if (typeof o[key] !== "string") {
    return { ok: false, message: `${key} must be a string` };
  }
  const s = o[key];
  if (!validate(s)) {
    return { ok: false, message: tooLongMsg };
  }
  return { ok: true, value: s };
}

function optionalBoolean(
  o: Record<string, unknown>,
  key: string,
): ParseResult<boolean | undefined> {
  if (o[key] === undefined) {
    return { ok: true, value: undefined };
  }
  if (typeof o[key] !== "boolean") {
    return { ok: false, message: `${key} must be a boolean` };
  }
  return { ok: true, value: o[key] };
}

export function parseCreateMemoInput(
  data: unknown,
): ParseResult<CreateMemoInput> {
  const obj = asObject(data);
  if (!obj.ok) {
    return obj;
  }
  const o = obj.value;

  if (typeof o.body !== "string") {
    return { ok: false, message: "body is required and must be a string" };
  }
  if (!isValidBody(o.body)) {
    return { ok: false, message: "body is too long" };
  }

  const title = optionalString(o, "title", isValidTitle, "title is too long");
  if (!title.ok) {
    return title;
  }
  const global = optionalBoolean(o, "global");
  if (!global.ok) {
    return global;
  }
  const secure = optionalBoolean(o, "secure");
  if (!secure.ok) {
    return secure;
  }

  return {
    ok: true,
    value: {
      title: title.value ?? "",
      body: o.body,
      global: global.value ?? false,
      secure: secure.value ?? false,
    },
  };
}

function assignOptionalString(
  out: UpdateMemoInput,
  key: "title" | "body",
  parsed: ParseResult<string | undefined>,
): ParseResult<void> {
  if (!parsed.ok) {
    return parsed;
  }
  if (parsed.value !== undefined) {
    out[key] = parsed.value;
  }
  return { ok: true, value: undefined };
}

function assignOptionalBoolean(
  out: UpdateMemoInput,
  key: "global" | "secure",
  parsed: ParseResult<boolean | undefined>,
): ParseResult<void> {
  if (!parsed.ok) {
    return parsed;
  }
  if (parsed.value !== undefined) {
    out[key] = parsed.value;
  }
  return { ok: true, value: undefined };
}

export function parseUpdateMemoInput(
  data: unknown,
): ParseResult<UpdateMemoInput> {
  const obj = asObject(data);
  if (!obj.ok) {
    return obj;
  }
  const o = obj.value;
  const out: UpdateMemoInput = {};

  const title = assignOptionalString(
    out,
    "title",
    optionalString(o, "title", isValidTitle, "title is too long"),
  );
  if (!title.ok) {
    return title;
  }
  const body = assignOptionalString(
    out,
    "body",
    optionalString(o, "body", isValidBody, "body is too long"),
  );
  if (!body.ok) {
    return body;
  }
  const global = assignOptionalBoolean(
    out,
    "global",
    optionalBoolean(o, "global"),
  );
  if (!global.ok) {
    return global;
  }
  const secure = assignOptionalBoolean(
    out,
    "secure",
    optionalBoolean(o, "secure"),
  );
  if (!secure.ok) {
    return secure;
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
