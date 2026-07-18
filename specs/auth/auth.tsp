/**
 * Auth service: register / login / logout.
 *
 * Session cookie name: `playground_session`
 * Attributes (server-side): HttpOnly; Path=/; SameSite=Lax
 * (Secure only when served over HTTPS.)
 */
import "@typespec/http";
import "../common/errors.tsp";

using Http;
using AuthzPlayground.Common;

namespace AuthzPlayground.Auth;

// Session cookie name: playground_session (opaque session id / UUID).

@doc("Credentials for register and login.")
model Credentials {
  @doc("Login identifier (unique).")
  @minLength(1)
  loginId: string;

  @doc("Password (never stored in plaintext server-side).")
  @minLength(1)
  password: string;
}

@doc("Public user profile returned after register/login (not sessions/me; that uses SessionMe).")
model User {
  @doc("App user id (UUID).")
  id: string;

  @doc("Login identifier.")
  loginId: string;

  @doc("Account creation time (ISO-8601).")
  createdAt: string;
}

@doc("Register success — new user created (no session cookie required).")
model RegisterSuccess {
  @statusCode statusCode: 201;
  @body body: User;
}

@doc("Login success — session created; Set-Cookie: playground_session.")
model LoginSuccess {
  @statusCode statusCode: 200;
  @body body: User;

  /**
   * Session cookie set by the server.
   * Name: playground_session
   */
  @header("Set-Cookie")
  setCookie?: string;
}

@doc("Logout success — session destroyed; cookie cleared.")
model LogoutSuccess {
  @statusCode statusCode: 204;

  @header("Set-Cookie")
  setCookie?: string;
}

/**
 * Auth endpoints under /v1/auth.
 */
@route("/v1/auth")
@tag("Auth")
interface AuthRoutes {
  /**
   * Register a new user (local/dev signup).
   * Does not automatically establish a session; call login after register if desired.
   */
  @post
  @route("/register")
  @summary("Register user")
  op register(@body body: Credentials): RegisterSuccess | BadRequestError | ConflictError;

  /**
   * Login with loginId + password.
   * On success sets HttpOnly cookie `playground_session`.
   */
  @post
  @route("/login")
  @summary("Login")
  op login(@body body: Credentials): LoginSuccess | BadRequestError | UnauthorizedError;

  /**
   * Destroy the current session and clear `playground_session`.
   * Idempotent: always returns 204, including when the cookie is missing
   * or the session is already invalid/expired. Clients should treat any
   * outcome as logged-out and clear local UI state.
   */
  @post
  @route("/logout")
  @summary("Logout")
  op logout(
    @doc("Session cookie playground_session (optional if already cleared).")
    @cookie(#{ name: "playground_session" })
    playgroundSession?: string,
  ): LogoutSuccess;
}
