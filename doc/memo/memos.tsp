/**
 * Memo API: CRUD with authorization attributes global / secure.
 *
 * Auth: session cookie `playground_session` (validated via Auth GET /v1/sessions/me).
 *
 * Authorization (initial):
 * - Owner: full CRUD
 * - Non-owner + global=true + secure=false: read-only
 * - Non-owner + global=false: 403 or 404 (implementation chooses one and documents)
 * - secure=true: owner-only for now (even if global=true)
 * - Unauthenticated: 401
 */
import "@typespec/http";
import "../common/errors.tsp";

using Http;
using AuthzPlayground.Common;

namespace AuthzPlayground.Memo;

@doc("Memo resource.")
model Memo {
  @doc("Memo id (UUID).")
  id: string;

  @doc("Owner app user id (from Auth).")
  ownerId: string;

  @doc("Title (may be empty string).")
  title: string;

  @doc("Markdown body.")
  body: string;

  @doc("If true, any authenticated user may read (unless secure).")
  global: boolean;

  @doc("If true, requires step-up auth in the future; initial behavior is owner-only.")
  secure: boolean;

  @doc("Creation time (ISO-8601).")
  createdAt: string;

  @doc("Last update time (ISO-8601).")
  updatedAt: string;
}

@doc("List scope for GET /v1/memos.")
enum MemoListScope {
  @doc("Only memos owned by the current user.")
  mine,

  @doc("Own memos plus global memos the user can read.")
  readable,
}

@doc("Create memo request body.")
model CreateMemoRequest {
  @doc("Optional title; default empty string.")
  title?: string;

  @doc("Markdown body.")
  body: string;

  @doc("Share read access with other authenticated users. Default false.")
  global?: boolean;

  @doc("Mark as requiring future step-up. Default false. Owner-only while unset.")
  secure?: boolean;
}

@doc("Partial update for PATCH /v1/memos/{id}. Owner only.")
model UpdateMemoRequest {
  title?: string;
  body?: string;
  global?: boolean;
  secure?: boolean;
}

@doc("List response.")
model MemoList {
  items: Memo[];
}

model MemoOk {
  @statusCode statusCode: 200;
  @body body: Memo;
}

model MemoCreated {
  @statusCode statusCode: 201;
  @body body: Memo;
}

model MemoListOk {
  @statusCode statusCode: 200;
  @body body: MemoList;
}

model MemoDeleted {
  @statusCode statusCode: 204;
}

/**
 * Memo endpoints under /v1/memos.
 */
@route("/v1/memos")
@tag("Memos")
interface MemoRoutes {
  /**
   * List memos.
   * Query `scope=mine` (default) or `scope=readable`.
   */
  @get
  @summary("List memos")
  op list(
    @doc("Session cookie playground_session.")
    @cookie(#{ name: "playground_session" })
    playgroundSession?: string,

    @query scope?: MemoListScope,
  ): MemoListOk | UnauthorizedError | BadRequestError;

  /**
   * Create a memo for the current user.
   */
  @post
  @summary("Create memo")
  op create(
    @cookie(#{ name: "playground_session" }) playgroundSession?: string,
    @body body: CreateMemoRequest,
  ): MemoCreated | UnauthorizedError | BadRequestError;

  /**
   * Get a single memo by id (authorization checked).
   */
  @get
  @route("/{id}")
  @summary("Get memo")
  op get(
    @cookie(#{ name: "playground_session" }) playgroundSession?: string,
    @path id: string,
  ): MemoOk | UnauthorizedError | ForbiddenError | NotFoundError;

  /**
   * Update a memo (owner only).
   */
  @patch
  @route("/{id}")
  @summary("Update memo")
  op update(
    @cookie(#{ name: "playground_session" }) playgroundSession?: string,
    @path id: string,
    @body body: UpdateMemoRequest,
  ): MemoOk | UnauthorizedError | ForbiddenError | NotFoundError | BadRequestError;

  /**
   * Delete a memo (owner only).
   */
  @delete
  @route("/{id}")
  @summary("Delete memo")
  op delete(
    @cookie(#{ name: "playground_session" }) playgroundSession?: string,
    @path id: string,
  ): MemoDeleted | UnauthorizedError | ForbiddenError | NotFoundError;
}
