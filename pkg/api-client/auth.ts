/**
 * Auth + Sessions client functions.
 * Paths match TypeSpec: POST /v1/auth/*, GET /v1/sessions/me
 * Cookie: playground_session (sent automatically with credentials: 'include').
 */
import { createHttp, type RequestOptions } from "./http.ts";
import type { ClientOptions, Credentials, SessionMe, User } from "./types.ts";

export interface AuthClient {
  register(body: Credentials): Promise<User>;
  login(body: Credentials): Promise<User>;
  logout(): Promise<void>;
  me(): Promise<SessionMe>;
}

export function createAuthClient(options: ClientOptions = {}): AuthClient {
  const http = createHttp(options);

  return {
    register(body: Credentials): Promise<User> {
      return http.request<User>({
        method: "POST",
        path: "/v1/auth/register",
        body,
      });
    },

    login(body: Credentials): Promise<User> {
      return http.request<User>({
        method: "POST",
        path: "/v1/auth/login",
        body,
      });
    },

    logout(): Promise<void> {
      return http.request<void>(
        {
          method: "POST",
          path: "/v1/auth/logout",
          expectJson: false,
        } satisfies RequestOptions,
      );
    },

    me(): Promise<SessionMe> {
      return http.request<SessionMe>({
        method: "GET",
        path: "/v1/sessions/me",
      });
    },
  };
}

/** Convenience: one-shot helpers using default client options. */
export function register(
  body: Credentials,
  options?: ClientOptions,
): Promise<User> {
  return createAuthClient(options).register(body);
}

export function login(
  body: Credentials,
  options?: ClientOptions,
): Promise<User> {
  return createAuthClient(options).login(body);
}

export function logout(options?: ClientOptions): Promise<void> {
  return createAuthClient(options).logout();
}

export function me(options?: ClientOptions): Promise<SessionMe> {
  return createAuthClient(options).me();
}
