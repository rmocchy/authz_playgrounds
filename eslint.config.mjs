/**
 * Size / fat-file guard for Deno backend sources (auth / memo).
 *
 * Uses ESLint core rules only (no project-specific AST).
 * Layer layout (handler / usecase / …) remains a convention in docs/rules;
 * we only enforce "files and functions stay small enough to split".
 */
import tseslint from "typescript-eslint";

/** Count non-blank, non-comment lines for size rules. */
const sizeOpts = {
  skipBlankLines: true,
  skipComments: true,
};

export default tseslint.config(
  {
    name: "authz/backend-src",
    files: ["services/auth/src/**/*.ts", "services/memo/src/**/*.ts"],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        // Syntax only — no type-aware rules required for size checks.
        projectService: false,
      },
    },
    rules: {
      // Whole-module budget (repository / in-memory impls can be larger).
      "max-lines": ["error", { max: 250, ...sizeOpts }],
      // Prefer splitting long functions even inside allowed large files.
      "max-lines-per-function": [
        "error",
        { max: 100, ...sizeOpts, IIFEs: true },
      ],
    },
  },
  {
    name: "authz/handler-usecase-thin",
    files: [
      "services/auth/src/handler/**/*.ts",
      "services/auth/src/usecase/**/*.ts",
      "services/memo/src/handler/**/*.ts",
      "services/memo/src/usecase/**/*.ts",
    ],
    rules: {
      // HTTP / app entry modules should stay thin (stricter than domain/repo).
      "max-lines": ["error", { max: 120, ...sizeOpts }],
      "max-lines-per-function": [
        "error",
        { max: 80, ...sizeOpts, IIFEs: true },
      ],
    },
  },
);
