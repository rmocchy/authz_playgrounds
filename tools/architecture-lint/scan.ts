/**
 * Collect exported function value bindings from a TypeScript module
 * using the official TypeScript compiler API (AST).
 */
import ts from "typescript";

function isExported(node: ts.Node): boolean {
  const mods = ts.canHaveModifiers(node) ? ts.getModifiers(node) : undefined;
  return !!mods?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword);
}

function isDefault(node: ts.Node): boolean {
  const mods = ts.canHaveModifiers(node) ? ts.getModifiers(node) : undefined;
  return !!mods?.some((m) => m.kind === ts.SyntaxKind.DefaultKeyword);
}

function isFunctionLikeInitializer(
  node: ts.Expression | undefined,
): boolean {
  if (!node) return false;
  return ts.isArrowFunction(node) || ts.isFunctionExpression(node);
}

/**
 * Names of value-exported functions in `sourceText`.
 *
 * Counts:
 * - `export [async] function name`
 * - `export default [async] function [name]`
 * - `export const name = () =>` / `function`
 * - `export { name }` when `name` is a local function
 * - `export { name } from "..."` (re-export of a value; barrel smell)
 *
 * Does not count: `export type`, `export interface`, type-only named exports,
 * non-function `export const`, classes (unless you also export a function).
 */
export function collectFunctionValueExports(
  sourceText: string,
  fileName = "module.ts",
): string[] {
  const sf = ts.createSourceFile(
    fileName,
    sourceText,
    ts.ScriptTarget.Latest,
    /*setParentNodes*/ true,
    ts.ScriptKind.TS,
  );

  const localFunctions = new Set<string>();

  // First pass: classify local function bindings (for `export { name }`)
  for (const stmt of sf.statements) {
    if (ts.isFunctionDeclaration(stmt) && stmt.name) {
      localFunctions.add(stmt.name.text);
    }
    if (ts.isVariableStatement(stmt)) {
      for (const decl of stmt.declarationList.declarations) {
        if (!ts.isIdentifier(decl.name)) continue;
        if (isFunctionLikeInitializer(decl.initializer)) {
          localFunctions.add(decl.name.text);
        }
      }
    }
  }

  const names: string[] = [];

  for (const stmt of sf.statements) {
    // export function foo / export default function foo
    if (ts.isFunctionDeclaration(stmt) && isExported(stmt)) {
      if (isDefault(stmt)) {
        names.push(stmt.name?.text ?? "default");
      } else if (stmt.name) {
        names.push(stmt.name.text);
      }
      continue;
    }

    // export const foo = () => {}
    if (ts.isVariableStatement(stmt) && isExported(stmt)) {
      for (const decl of stmt.declarationList.declarations) {
        if (!ts.isIdentifier(decl.name)) continue;
        if (isFunctionLikeInitializer(decl.initializer)) {
          names.push(decl.name.text);
        }
      }
      continue;
    }

    // export { a, b as c } [from "..."]
    if (
      ts.isExportDeclaration(stmt) &&
      stmt.exportClause &&
      ts.isNamedExports(stmt.exportClause) &&
      !stmt.isTypeOnly
    ) {
      for (const el of stmt.exportClause.elements) {
        if (el.isTypeOnly) continue;
        const exportedName = el.name.text;
        const localName = (el.propertyName ?? el.name).text;

        // Re-export from another module: always a value export (discourages barrels)
        if (stmt.moduleSpecifier) {
          names.push(exportedName);
          continue;
        }

        // Local export { foo }: only count if foo is a function
        if (localFunctions.has(localName)) {
          names.push(exportedName);
        }
        // If unknown / non-function: skip
      }
    }

    // export default <identifier that is a function>
    if (ts.isExportAssignment(stmt) && !stmt.isExportEquals) {
      if (ts.isIdentifier(stmt.expression)) {
        if (localFunctions.has(stmt.expression.text)) {
          names.push("default");
        }
      } else if (isFunctionLikeInitializer(stmt.expression)) {
        names.push("default");
      }
    }
  }

  return [...new Set(names)];
}
