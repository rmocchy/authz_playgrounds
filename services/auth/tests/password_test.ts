import { assert, assertEquals, assertRejects } from "@std/assert";
import { hashPassword, verifyPassword } from "../src/domain/password.ts";

Deno.test("hashPassword produces non-plaintext bcrypt hash", async () => {
  const plain = "s3cret-password";
  const hash = await hashPassword(plain);
  assert(hash !== plain);
  assert(hash.startsWith("$2a$") || hash.startsWith("$2b$"));
  assert(hash.length > 20);
});

Deno.test("verifyPassword accepts correct password", async () => {
  const plain = "correct-horse-battery";
  const hash = await hashPassword(plain);
  assertEquals(await verifyPassword(plain, hash), true);
});

Deno.test("verifyPassword rejects wrong password", async () => {
  const hash = await hashPassword("right");
  assertEquals(await verifyPassword("wrong", hash), false);
});

Deno.test("verifyPassword rejects empty/garbage hash", async () => {
  assertEquals(await verifyPassword("x", ""), false);
  assertEquals(await verifyPassword("x", "not-a-hash"), false);
});

Deno.test("hashPassword rejects empty password", async () => {
  await assertRejects(() => hashPassword(""));
});

Deno.test("hashPassword rejects password longer than bcrypt 72-char limit", async () => {
  await assertRejects(() => hashPassword("x".repeat(73)));
});
