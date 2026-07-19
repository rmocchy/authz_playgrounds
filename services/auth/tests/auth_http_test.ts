/**
 * HTTP-level tests using in-memory repositories (no Postgres required).
 */
import { assertEquals, assertExists } from "@std/assert";
import { createHandler } from "../src/app.ts";
import { createMemoryUserRepository } from "../src/repository/users.ts";
import { createMemorySessionRepository } from "../src/repository/sessions.ts";
import { hashPassword } from "../src/domain/password.ts";

const COOKIE = "playground_session";
const TTL_MS = 7 * 24 * 60 * 60 * 1000;

function testApp(opts?: { now?: () => Date }) {
  const users = createMemoryUserRepository();
  const sessions = createMemorySessionRepository();
  const handler = createHandler({
    users,
    sessions,
    sessionCookieName: COOKIE,
    sessionTtlMs: TTL_MS,
    cookieSecure: false,
    now: opts?.now,
  });
  return { handler, users, sessions };
}

function jsonReq(
  method: string,
  path: string,
  body?: unknown,
  cookie?: string,
): Request {
  const headers: Record<string, string> = {
    "content-type": "application/json",
  };
  if (cookie) headers["cookie"] = cookie;
  return new Request(`http://auth.test${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

Deno.test("register → 201 and public user shape", async () => {
  const plainPassword = "pw-alice";
  const { handler, users } = testApp();
  const res = await handler(
    jsonReq("POST", "/v1/auth/register", {
      loginId: "alice",
      password: plainPassword,
    }),
  );
  assertEquals(res.status, 201);
  const body = await res.json();
  assertExists(body.id);
  assertEquals(body.loginId, "alice");
  assertExists(body.createdAt);
  assertEquals(body.password, undefined);
  assertEquals(body.passwordHash, undefined);

  // Persisted secret is bcrypt, not plaintext (focus: password not stored raw).
  const stored = await users.findByLoginId("alice");
  assertExists(stored);
  assertEquals(stored.passwordHash.startsWith("$2"), true);
  assertEquals(stored.passwordHash !== plainPassword, true);
});

Deno.test("register duplicate → 409", async () => {
  const { handler } = testApp();
  await handler(
    jsonReq("POST", "/v1/auth/register", {
      loginId: "bob",
      password: "pw",
    }),
  );
  const res = await handler(
    jsonReq("POST", "/v1/auth/register", {
      loginId: "bob",
      password: "other",
    }),
  );
  assertEquals(res.status, 409);
  const err = await res.json();
  assertEquals(err.code, "conflict");
});

Deno.test("register validation → 400", async () => {
  const { handler } = testApp();
  const res = await handler(
    jsonReq("POST", "/v1/auth/register", { loginId: "  ", password: "x" }),
  );
  assertEquals(res.status, 400);
});

Deno.test("login sets session cookie; me returns user", async () => {
  const { handler, users } = testApp();
  await users.insert({
    id: "11111111-1111-1111-1111-111111111111",
    loginId: "carol",
    passwordHash: await hashPassword("secret"),
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
  });

  const loginRes = await handler(
    jsonReq("POST", "/v1/auth/login", {
      loginId: "carol",
      password: "secret",
    }),
  );
  assertEquals(loginRes.status, 200);
  const setCookie = loginRes.headers.get("set-cookie");
  assertExists(setCookie);
  assertEquals(setCookie.includes(`${COOKIE}=`), true);
  assertEquals(setCookie.includes("HttpOnly"), true);
  assertEquals(setCookie.includes("Path=/"), true);
  assertEquals(setCookie.includes("SameSite=Lax"), true);

  const match = setCookie.match(new RegExp(`${COOKIE}=([^;]+)`));
  assertExists(match);
  const sessionId = decodeURIComponent(match[1]!);

  const meRes = await handler(
    jsonReq("GET", "/v1/sessions/me", undefined, `${COOKIE}=${sessionId}`),
  );
  assertEquals(meRes.status, 200);
  const me = await meRes.json();
  assertEquals(me.loginId, "carol");
  assertEquals(me.id, "11111111-1111-1111-1111-111111111111");
});

Deno.test("login bad password → 401", async () => {
  const { handler, users } = testApp();
  await users.insert({
    id: crypto.randomUUID(),
    loginId: "dave",
    passwordHash: await hashPassword("right"),
    createdAt: new Date(),
  });
  const res = await handler(
    jsonReq("POST", "/v1/auth/login", {
      loginId: "dave",
      password: "wrong",
    }),
  );
  assertEquals(res.status, 401);
});

Deno.test("me without cookie → 401", async () => {
  const { handler } = testApp();
  const res = await handler(jsonReq("GET", "/v1/sessions/me"));
  assertEquals(res.status, 401);
});

Deno.test("logout clears session; me then 401; logout idempotent", async () => {
  const { handler, users } = testApp();
  await users.insert({
    id: crypto.randomUUID(),
    loginId: "erin",
    passwordHash: await hashPassword("pw"),
    createdAt: new Date(),
  });
  const loginRes = await handler(
    jsonReq("POST", "/v1/auth/login", { loginId: "erin", password: "pw" }),
  );
  const setCookie = loginRes.headers.get("set-cookie")!;
  const sessionId = decodeURIComponent(
    setCookie.match(new RegExp(`${COOKIE}=([^;]+)`))![1]!,
  );
  const cookie = `${COOKIE}=${sessionId}`;

  const logoutRes = await handler(
    jsonReq("POST", "/v1/auth/logout", undefined, cookie),
  );
  assertEquals(logoutRes.status, 204);
  const clear = logoutRes.headers.get("set-cookie")!;
  assertEquals(clear.includes("Max-Age=0"), true);

  const meRes = await handler(
    jsonReq("GET", "/v1/sessions/me", undefined, cookie),
  );
  assertEquals(meRes.status, 401);

  const again = await handler(jsonReq("POST", "/v1/auth/logout"));
  assertEquals(again.status, 204);
});

Deno.test("expired session → me 401", async () => {
  let now = new Date("2026-01-01T00:00:00.000Z");
  const { handler, users } = testApp({ now: () => now });
  await users.insert({
    id: crypto.randomUUID(),
    loginId: "frank",
    passwordHash: await hashPassword("pw"),
    createdAt: now,
  });
  const loginRes = await handler(
    jsonReq("POST", "/v1/auth/login", { loginId: "frank", password: "pw" }),
  );
  const sessionId = decodeURIComponent(
    loginRes.headers.get("set-cookie")!.match(
      new RegExp(`${COOKIE}=([^;]+)`),
    )![1]!,
  );

  // Jump past 7-day TTL
  now = new Date("2026-01-10T00:00:00.000Z");
  const meRes = await handler(
    jsonReq("GET", "/v1/sessions/me", undefined, `${COOKIE}=${sessionId}`),
  );
  assertEquals(meRes.status, 401);
});

Deno.test("health endpoint", async () => {
  const { handler } = testApp();
  const res = await handler(new Request("http://auth.test/health"));
  assertEquals(res.status, 200);
});
