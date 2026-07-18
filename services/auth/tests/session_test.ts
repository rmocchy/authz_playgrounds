import { assertEquals, assertThrows } from "@std/assert";
import {
  computeExpiresAt,
  isSessionActive,
} from "../src/domain/session.ts";
import {
  buildSessionSetCookie,
  parseCookieHeader,
} from "../src/http/cookies.ts";

Deno.test("isSessionActive: future expiresAt is active", () => {
  const now = new Date("2026-01-01T00:00:00.000Z");
  const expiresAt = new Date("2026-01-08T00:00:00.000Z");
  assertEquals(isSessionActive({ expiresAt }, now), true);
});

Deno.test("isSessionActive: past expiresAt is inactive", () => {
  const now = new Date("2026-01-10T00:00:00.000Z");
  const expiresAt = new Date("2026-01-08T00:00:00.000Z");
  assertEquals(isSessionActive({ expiresAt }, now), false);
});

Deno.test("isSessionActive: exact boundary is expired (not active)", () => {
  const t = new Date("2026-01-01T12:00:00.000Z");
  assertEquals(isSessionActive({ expiresAt: t }, t), false);
});

Deno.test("computeExpiresAt adds TTL ms", () => {
  const created = new Date("2026-01-01T00:00:00.000Z");
  const expires = computeExpiresAt(created, 3600_000);
  assertEquals(expires.toISOString(), "2026-01-01T01:00:00.000Z");
});

Deno.test("computeExpiresAt rejects non-positive TTL", () => {
  assertThrows(() => computeExpiresAt(new Date(), 0));
  assertThrows(() => computeExpiresAt(new Date(), -1));
});

Deno.test("buildSessionSetCookie sets HttpOnly Path=/ SameSite=Lax", () => {
  const c = buildSessionSetCookie({
    name: "playground_session",
    value: "abc-123",
    maxAgeSeconds: 604800,
    secure: false,
  });
  assertEquals(c.includes("playground_session=abc-123"), true);
  assertEquals(c.includes("HttpOnly"), true);
  assertEquals(c.includes("Path=/"), true);
  assertEquals(c.includes("SameSite=Lax"), true);
  assertEquals(c.includes("Max-Age=604800"), true);
  assertEquals(c.includes("Secure"), false);
});

Deno.test("buildSessionSetCookie clear expires cookie", () => {
  const c = buildSessionSetCookie({
    name: "playground_session",
    value: "",
    maxAgeSeconds: 0,
    secure: false,
    clear: true,
  });
  assertEquals(c.includes("Max-Age=0"), true);
});

Deno.test("parseCookieHeader extracts session id", () => {
  const header = "foo=1; playground_session=uuid-here; bar=2";
  assertEquals(
    parseCookieHeader(header, "playground_session"),
    "uuid-here",
  );
  assertEquals(parseCookieHeader(null, "playground_session"), undefined);
});
