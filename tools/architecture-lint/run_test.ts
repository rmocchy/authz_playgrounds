/**
 * Unit tests for architecture-lint export scanning (TypeScript AST).
 */
import { assertEquals } from "@std/assert";
import { collectFunctionValueExports } from "./scan.ts";

Deno.test("single export function is accepted", () => {
  const src = `
    export interface Deps { x: number }
    export async function handleLogin(req: Request): Promise<Response> {
      return new Response();
    }
  `;
  assertEquals(collectFunctionValueExports(src), ["handleLogin"]);
});

Deno.test("two handlers in one file are detected", () => {
  const src = `
    export async function handleLogin() {}
    export async function handleRegister() {}
  `;
  assertEquals(
    collectFunctionValueExports(src).sort(),
    ["handleLogin", "handleRegister"].sort(),
  );
});

Deno.test("export type and interface do not count", () => {
  const src = `
    export type Foo = string;
    export interface Bar { a: number }
    export const notFn = 1;
    export async function onlyOne() {}
  `;
  assertEquals(collectFunctionValueExports(src), ["onlyOne"]);
});

Deno.test("export const arrow counts as function", () => {
  const src = `export const login = async (x: number) => x;`;
  assertEquals(collectFunctionValueExports(src), ["login"]);
});

Deno.test("comments do not create false positives", () => {
  const src = `
    // export function fake() {}
    /* export function alsoFake() {} */
    export function real() {}
  `;
  assertEquals(collectFunctionValueExports(src), ["real"]);
});

Deno.test("type-only named export is ignored", () => {
  const src = `
    export type { PublicUser };
    export function register() {}
  `;
  assertEquals(collectFunctionValueExports(src), ["register"]);
});

Deno.test("local export { fn } of a function counts", () => {
  const src = `
    function login() {}
    export { login };
  `;
  assertEquals(collectFunctionValueExports(src), ["login"]);
});

Deno.test("local export { value } of a non-function is ignored", () => {
  const src = `
    const x = 1;
    export { x };
    export function only() {}
  `;
  assertEquals(collectFunctionValueExports(src), ["only"]);
});

Deno.test("re-export from another module counts (barrel smell)", () => {
  const src = `export { handleLogin, handleRegister } from "./other.ts";`;
  assertEquals(
    collectFunctionValueExports(src).sort(),
    ["handleLogin", "handleRegister"].sort(),
  );
});
