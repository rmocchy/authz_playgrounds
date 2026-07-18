/**
 * HTTP-level tests using in-memory memo repo + stub Auth client.
 */
import { assertEquals, assertExists } from "@std/assert";
import { createHandler } from "../src/app.ts";
import { createMemoryMemoRepository } from "../src/repository/memos.ts";
import type { AuthClient, SessionUser } from "../src/clients/auth.ts";
import type { MemoRecord } from "../src/domain/memo.ts";

const ALICE: SessionUser = {
  id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
  loginId: "alice",
};
const BOB: SessionUser = {
  id: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
  loginId: "bob",
};

const COOKIE_ALICE = "playground_session=alice-session";
const COOKIE_BOB = "playground_session=bob-session";

function stubAuth(): AuthClient {
  return {
    async getSessionMe(cookieHeader) {
      if (!cookieHeader) {
        return {
          ok: false,
          status: 401,
          message: "Missing or invalid session",
        };
      }
      if (cookieHeader.includes("alice-session")) {
        return { ok: true, user: ALICE };
      }
      if (cookieHeader.includes("bob-session")) {
        return { ok: true, user: BOB };
      }
      return {
        ok: false,
        status: 401,
        message: "Missing or invalid session",
      };
    },
  };
}

function testApp(seed: MemoRecord[] = []) {
  const memos = createMemoryMemoRepository(seed);
  const handler = createHandler({ memos, auth: stubAuth() });
  return { handler, memos };
}

function req(
  method: string,
  path: string,
  opts?: { body?: unknown; cookie?: string },
): Request {
  const headers: Record<string, string> = {};
  if (opts?.body !== undefined) {
    headers["content-type"] = "application/json";
  }
  if (opts?.cookie) {
    headers["cookie"] = opts.cookie;
  }
  return new Request(`http://memo.test${path}`, {
    method,
    headers,
    body: opts?.body === undefined ? undefined : JSON.stringify(opts.body),
  });
}

Deno.test("health → 200", async () => {
  const { handler } = testApp();
  const res = await handler(req("GET", "/health"));
  assertEquals(res.status, 200);
});

Deno.test("unauthenticated list → 401", async () => {
  const { handler } = testApp();
  const res = await handler(req("GET", "/v1/memos"));
  assertEquals(res.status, 401);
  const err = await res.json();
  assertEquals(err.code, "unauthorized");
});

Deno.test("unauthenticated create → 401", async () => {
  const { handler } = testApp();
  const res = await handler(
    req("POST", "/v1/memos", { body: { body: "x" } }),
  );
  assertEquals(res.status, 401);
});

Deno.test("create → 201 with camelCase shape", async () => {
  const { handler } = testApp();
  const res = await handler(
    req("POST", "/v1/memos", {
      cookie: COOKIE_ALICE,
      body: { title: "t", body: "hello", global: true, secure: false },
    }),
  );
  assertEquals(res.status, 201);
  const memo = await res.json();
  assertExists(memo.id);
  assertEquals(memo.ownerId, ALICE.id);
  assertEquals(memo.title, "t");
  assertEquals(memo.body, "hello");
  assertEquals(memo.global, true);
  assertEquals(memo.secure, false);
  assertExists(memo.createdAt);
  assertExists(memo.updatedAt);
});

Deno.test("create defaults title/global/secure", async () => {
  const { handler } = testApp();
  const res = await handler(
    req("POST", "/v1/memos", {
      cookie: COOKIE_ALICE,
      body: { body: "only body" },
    }),
  );
  assertEquals(res.status, 201);
  const memo = await res.json();
  assertEquals(memo.title, "");
  assertEquals(memo.global, false);
  assertEquals(memo.secure, false);
});

Deno.test("create missing body → 400", async () => {
  const { handler } = testApp();
  const res = await handler(
    req("POST", "/v1/memos", {
      cookie: COOKIE_ALICE,
      body: { title: "no body" },
    }),
  );
  assertEquals(res.status, 400);
});

Deno.test("list mine vs readable", async () => {
  const seed: MemoRecord[] = [
    {
      id: "11111111-1111-1111-1111-111111111111",
      ownerId: ALICE.id,
      title: "alice private",
      body: "a",
      global: false,
      secure: false,
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
      updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    },
    {
      id: "22222222-2222-2222-2222-222222222222",
      ownerId: ALICE.id,
      title: "alice global",
      body: "g",
      global: true,
      secure: false,
      createdAt: new Date("2026-01-02T00:00:00.000Z"),
      updatedAt: new Date("2026-01-02T00:00:00.000Z"),
    },
    {
      id: "33333333-3333-3333-3333-333333333333",
      ownerId: ALICE.id,
      title: "alice secure global",
      body: "s",
      global: true,
      secure: true,
      createdAt: new Date("2026-01-03T00:00:00.000Z"),
      updatedAt: new Date("2026-01-03T00:00:00.000Z"),
    },
    {
      id: "44444444-4444-4444-4444-444444444444",
      ownerId: BOB.id,
      title: "bob private",
      body: "b",
      global: false,
      secure: false,
      createdAt: new Date("2026-01-04T00:00:00.000Z"),
      updatedAt: new Date("2026-01-04T00:00:00.000Z"),
    },
  ];
  const { handler } = testApp(seed);

  const mine = await handler(
    req("GET", "/v1/memos?scope=mine", { cookie: COOKIE_BOB }),
  );
  assertEquals(mine.status, 200);
  const mineBody = await mine.json();
  assertEquals(mineBody.items.length, 1);
  assertEquals(mineBody.items[0].id, "44444444-4444-4444-4444-444444444444");

  const readable = await handler(
    req("GET", "/v1/memos?scope=readable", { cookie: COOKIE_BOB }),
  );
  assertEquals(readable.status, 200);
  const readableBody = await readable.json();
  const ids = readableBody.items.map((m: { id: string }) => m.id).sort();
  // bob's own + alice's global non-secure
  assertEquals(ids, [
    "22222222-2222-2222-2222-222222222222",
    "44444444-4444-4444-4444-444444444444",
  ]);
});

Deno.test("get: owner can read private", async () => {
  const id = "11111111-1111-1111-1111-111111111111";
  const { handler } = testApp([
    {
      id,
      ownerId: ALICE.id,
      title: "",
      body: "secret",
      global: false,
      secure: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ]);
  const res = await handler(
    req("GET", `/v1/memos/${id}`, { cookie: COOKIE_ALICE }),
  );
  assertEquals(res.status, 200);
  const memo = await res.json();
  assertEquals(memo.body, "secret");
});

Deno.test("get: other cannot read private → 404", async () => {
  const id = "11111111-1111-1111-1111-111111111111";
  const { handler } = testApp([
    {
      id,
      ownerId: ALICE.id,
      title: "",
      body: "secret",
      global: false,
      secure: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ]);
  const res = await handler(
    req("GET", `/v1/memos/${id}`, { cookie: COOKIE_BOB }),
  );
  assertEquals(res.status, 404);
});

Deno.test("get: other can read global non-secure", async () => {
  const id = "22222222-2222-2222-2222-222222222222";
  const { handler } = testApp([
    {
      id,
      ownerId: ALICE.id,
      title: "shared",
      body: "public-ish",
      global: true,
      secure: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ]);
  const res = await handler(
    req("GET", `/v1/memos/${id}`, { cookie: COOKIE_BOB }),
  );
  assertEquals(res.status, 200);
});

Deno.test("get: other cannot read global+secure → 404", async () => {
  const id = "33333333-3333-3333-3333-333333333333";
  const { handler } = testApp([
    {
      id,
      ownerId: ALICE.id,
      title: "step-up later",
      body: "locked",
      global: true,
      secure: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ]);
  const res = await handler(
    req("GET", `/v1/memos/${id}`, { cookie: COOKIE_BOB }),
  );
  assertEquals(res.status, 404);
});

Deno.test("patch: owner can update", async () => {
  const id = "11111111-1111-1111-1111-111111111111";
  const { handler } = testApp([
    {
      id,
      ownerId: ALICE.id,
      title: "old",
      body: "old body",
      global: false,
      secure: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ]);
  const res = await handler(
    req("PATCH", `/v1/memos/${id}`, {
      cookie: COOKIE_ALICE,
      body: { title: "new", global: true },
    }),
  );
  assertEquals(res.status, 200);
  const memo = await res.json();
  assertEquals(memo.title, "new");
  assertEquals(memo.body, "old body");
  assertEquals(memo.global, true);
});

Deno.test("patch: other global → 403", async () => {
  const id = "22222222-2222-2222-2222-222222222222";
  const { handler } = testApp([
    {
      id,
      ownerId: ALICE.id,
      title: "shared",
      body: "x",
      global: true,
      secure: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ]);
  const res = await handler(
    req("PATCH", `/v1/memos/${id}`, {
      cookie: COOKIE_BOB,
      body: { body: "hacked" },
    }),
  );
  assertEquals(res.status, 403);
});

Deno.test("patch: other private → 404", async () => {
  const id = "11111111-1111-1111-1111-111111111111";
  const { handler } = testApp([
    {
      id,
      ownerId: ALICE.id,
      title: "",
      body: "x",
      global: false,
      secure: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ]);
  const res = await handler(
    req("PATCH", `/v1/memos/${id}`, {
      cookie: COOKIE_BOB,
      body: { body: "hacked" },
    }),
  );
  assertEquals(res.status, 404);
});

Deno.test("delete: owner → 204", async () => {
  const id = "11111111-1111-1111-1111-111111111111";
  const { handler, memos } = testApp([
    {
      id,
      ownerId: ALICE.id,
      title: "",
      body: "x",
      global: false,
      secure: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ]);
  const res = await handler(
    req("DELETE", `/v1/memos/${id}`, { cookie: COOKIE_ALICE }),
  );
  assertEquals(res.status, 204);
  assertEquals(await memos.findById(id), null);
});

Deno.test("delete: other global → 403", async () => {
  const id = "22222222-2222-2222-2222-222222222222";
  const { handler } = testApp([
    {
      id,
      ownerId: ALICE.id,
      title: "",
      body: "x",
      global: true,
      secure: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ]);
  const res = await handler(
    req("DELETE", `/v1/memos/${id}`, { cookie: COOKIE_BOB }),
  );
  assertEquals(res.status, 403);
});

Deno.test("get missing memo → 404", async () => {
  const { handler } = testApp();
  const res = await handler(
    req("GET", "/v1/memos/99999999-9999-9999-9999-999999999999", {
      cookie: COOKIE_ALICE,
    }),
  );
  assertEquals(res.status, 404);
});

Deno.test("invalid scope → 400", async () => {
  const { handler } = testApp();
  const res = await handler(
    req("GET", "/v1/memos?scope=all", { cookie: COOKIE_ALICE }),
  );
  assertEquals(res.status, 400);
});
