/**
 * Common HTTP error models for the playground APIs (400/401/403/404).
 * Shared by Auth and Memo services.
 */
import "@typespec/http";

using Http;

namespace AuthzPlayground.Common;

/**
 * Stable machine-readable error code.
 * Examples: "validation_error", "unauthorized", "forbidden", "not_found", "conflict".
 */
@doc("Machine-readable error code.")
scalar ErrorCode extends string;

/**
 * Standard JSON error body returned by Auth and Memo APIs.
 */
@doc("Common error response body.")
model ErrorBody {
  @doc("Machine-readable error code.")
  code: ErrorCode;

  @doc("Human-readable error message (for logs/UI, not for branching).")
  message: string;
}

@doc("400 Bad Request — invalid input or validation failure.")
model BadRequestError is BadRequestResponse {
  @body body: ErrorBody;
}

@doc("401 Unauthorized — missing or invalid session.")
model UnauthorizedError is UnauthorizedResponse {
  @body body: ErrorBody;
}

@doc("403 Forbidden — authenticated but not allowed.")
model ForbiddenError is ForbiddenResponse {
  @body body: ErrorBody;
}

@doc("404 Not Found — resource does not exist or is hidden.")
model NotFoundError is NotFoundResponse {
  @body body: ErrorBody;
}

@doc("409 Conflict — e.g. duplicate login_id on register.")
model ConflictError is ConflictResponse {
  @body body: ErrorBody;
}
