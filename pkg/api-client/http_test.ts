/**
 * Unit tests for URL joining used by the API client.
 * Run: deno test pkg/api-client/http_test.ts
 */
import { assertEquals } from "@std/assert";
import { joinUrl } from "./http.ts";

Deno.test("joinUrl: empty baseUrl (same-origin)", () => {
  assertEquals(joinUrl("", "/v1/auth/login"), "/v1/auth/login");
  assertEquals(
    joinUrl("", "/v1/memos", { scope: "readable" }),
    "/v1/memos?scope=readable",
  );
});

Deno.test("joinUrl: absolute http base (Deno service)", () => {
  assertEquals(
    joinUrl("http://localhost:3001", "/v1/auth/login"),
    "http://localhost:3001/v1/auth/login",
  );
  assertEquals(
    joinUrl("http://localhost:3001/", "/v1/sessions/me"),
    "http://localhost:3001/v1/sessions/me",
  );
  assertEquals(
    joinUrl("http://auth:3001", "/v1/memos", { scope: "mine" }),
    "http://auth:3001/v1/memos?scope=mine",
  );
});

Deno.test("joinUrl: relative Vite proxy prefixes", () => {
  assertEquals(
    joinUrl("/api/auth", "/v1/auth/login"),
    "/api/auth/v1/auth/login",
  );
  assertEquals(
    joinUrl("/api/auth/", "/v1/auth/logout"),
    "/api/auth/v1/auth/logout",
  );
  assertEquals(
    joinUrl("/api/memo", "/v1/memos", { scope: "readable" }),
    "/api/memo/v1/memos?scope=readable",
  );
  assertEquals(
    joinUrl("/api/memo", `/v1/memos/${"abc"}`),
    "/api/memo/v1/memos/abc",
  );
});

Deno.test("joinUrl: omits empty query values", () => {
  assertEquals(
    joinUrl("/api/memo", "/v1/memos", { scope: undefined, other: null }),
    "/api/memo/v1/memos",
  );
});
