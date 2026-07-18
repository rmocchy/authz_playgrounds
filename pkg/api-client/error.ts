import type { ErrorBody } from "./types.ts";

/**
 * Thrown when the API returns a non-2xx response.
 * `body` is parsed ErrorBody when the response is JSON with code/message.
 */
export class ApiError extends Error {
  readonly status: number;
  readonly body: ErrorBody | null;
  readonly response: Response;

  constructor(status: number, body: ErrorBody | null, response: Response) {
    const msg = body?.message ?? `HTTP ${status}`;
    super(msg);
    this.name = "ApiError";
    this.status = status;
    this.body = body;
    this.response = response;
  }

  get code(): string | undefined {
    return this.body?.code;
  }
}

export function isApiError(e: unknown): e is ApiError {
  return e instanceof ApiError;
}
