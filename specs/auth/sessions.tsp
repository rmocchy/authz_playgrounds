/**
 * Session verification: GET /v1/sessions/me
 * Cookie: playground_session
 */
import "@typespec/http";
import "../common/errors.tsp";
import "./auth.tsp";

using Http;
using AuthzPlayground.Common;

namespace AuthzPlayground.Auth;

@doc("Current session user payload.")
model SessionMe {
  @doc("App user id (UUID).")
  id: string;

  @doc("Login identifier.")
  loginId: string;
}

@doc("Authenticated sessions/me response.")
model SessionMeSuccess {
  @statusCode statusCode: 200;
  @body body: SessionMe;
}

/**
 * Session endpoints under /v1/sessions.
 */
@route("/v1/sessions")
@tag("Sessions")
interface SessionRoutes {
  /**
   * Return the current authenticated user.
   * Unauthenticated (missing/invalid cookie) → 401.
   *
   * Used by Memo (server-to-server with Cookie forward) and by FE.
   */
  @get
  @route("/me")
  @summary("Current user")
  op me(
    @doc("Session cookie playground_session.")
    @cookie(#{ name: "playground_session" })
    playgroundSession?: string,
  ): SessionMeSuccess | UnauthorizedError;
}
