/**
 * JSON error responses matching TypeSpec Common.ErrorBody.
 */

export interface ErrorBody {
  code: string;
  message: string;
}

export function jsonError(
  status: number,
  code: string,
  message: string,
  headers?: HeadersInit,
): Response {
  const body: ErrorBody = { code, message };
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      ...headers,
    },
  });
}

export function badRequest(
  message: string,
  code = "validation_error",
): Response {
  return jsonError(400, code, message);
}

export function unauthorized(
  message = "Unauthorized",
  code = "unauthorized",
): Response {
  return jsonError(401, code, message);
}

export function conflict(message: string, code = "conflict"): Response {
  return jsonError(409, code, message);
}

export function jsonOk(
  data: unknown,
  status = 200,
  headers?: HeadersInit,
): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      ...headers,
    },
  });
}

export function noContent(headers?: HeadersInit): Response {
  return new Response(null, { status: 204, headers });
}
