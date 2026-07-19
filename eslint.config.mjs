/**
 * Strict lint for Deno backend sources (auth / memo).
 *
 * Formatting is NOT here — use `deno fmt` for BE and Biome for Web.
 */
import js from "@eslint/js";
import boundaries from "eslint-plugin-boundaries";
import tseslint from "typescript-eslint";

const sizeOpts = {
  skipBlankLines: true,
  skipComments: true,
};

// Folder-based layers only (plugin matches directories, not single files).
const layerElements = [
  { type: "handler", pattern: "**/src/handler/*" },
  { type: "usecase", pattern: "**/src/usecase/*" },
  { type: "domain", pattern: "**/src/domain/*" },
  { type: "repository", pattern: "**/src/repository/*" },
  { type: "http", pattern: "**/src/http/*" },
  { type: "clients", pattern: "**/src/clients/*" },
];

export default tseslint.config(
  {
    ignores: [
      "**/node_modules/**",
      "**/dist/**",
      "**/coverage/**",
      "**/reports/**",
      "**/.stryker-tmp/**",
      "services/web/**",
      "tools/**",
      "specs/**",
    ],
  },
  {
    name: "authz/backend-strict",
    files: ["services/auth/src/**/*.ts", "services/memo/src/**/*.ts"],
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        projectService: false,
        ecmaVersion: "latest",
        sourceType: "module",
      },
    },
    plugins: {
      boundaries,
    },
    settings: {
      "boundaries/elements": layerElements,
      "boundaries/include": ["services/*/src/**/*.ts"],
    },
    rules: {
      "max-lines": ["error", { max: 250, ...sizeOpts }],
      "max-lines-per-function": [
        "error",
        { max: 80, ...sizeOpts, IIFEs: true },
      ],
      complexity: ["error", { max: 12 }],
      "max-depth": ["error", { max: 4 }],
      "max-params": ["error", { max: 4 }],
      "max-nested-callbacks": ["error", { max: 3 }],

      eqeqeq: ["error", "always", { null: "ignore" }],
      "no-var": "error",
      "prefer-const": "error",
      "prefer-template": "error",
      "object-shorthand": ["error", "always"],
      "no-console": ["error", { allow: ["warn", "error"] }],
      "no-debugger": "error",
      "no-alert": "error",
      "no-eval": "error",
      "no-implied-eval": "error",
      "no-new-func": "error",
      "no-throw-literal": "error",
      "no-return-await": "error",
      "require-await": "error",
      "no-floating-decimal": "error",
      "no-multi-assign": "error",
      "no-nested-ternary": "error",
      "no-unneeded-ternary": "error",
      "prefer-arrow-callback": "error",
      "prefer-rest-params": "error",
      "prefer-spread": "error",
      // Braces: leave to `deno fmt` (it prefers single-line ifs without braces).
      curly: "off",
      "default-case-last": "error",
      "dot-notation": "error",
      yoda: ["error", "never"],

      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
      "@typescript-eslint/consistent-type-imports": [
        "error",
        { prefer: "type-imports", fixStyle: "separate-type-imports" },
      ],
      "@typescript-eslint/no-import-type-side-effects": "error",
      "@typescript-eslint/array-type": ["error", { default: "array-simple" }],
      "@typescript-eslint/consistent-type-definitions": ["error", "interface"],
      "@typescript-eslint/no-non-null-assertion": "error",
      "@typescript-eslint/prefer-as-const": "error",
      "@typescript-eslint/no-wrapper-object-types": "error",
      "no-unused-vars": "off",

      "boundaries/dependencies": [
        "error",
        {
          default: "disallow",
          policies: [
            {
              from: { type: "handler" },
              allow: {
                to: { type: ["usecase", "http", "domain", "handler"] },
              },
            },
            {
              from: { type: "usecase" },
              allow: {
                to: {
                  type: ["domain", "repository", "clients", "usecase", "http"],
                },
              },
            },
            {
              from: { type: "domain" },
              allow: { to: { type: "domain" } },
            },
            {
              from: { type: "repository" },
              allow: { to: { type: ["domain", "repository"] } },
            },
            {
              from: { type: "http" },
              allow: { to: { type: ["http", "domain"] } },
            },
            {
              from: { type: "clients" },
              allow: { to: { type: ["clients", "domain"] } },
            },
          ],
        },
      ],
      // deps.ts / app.ts / main.ts sit outside folder layers; ignore unknowns.
      "boundaries/no-unknown-dependencies": "off",
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
      "max-lines": ["error", { max: 100, ...sizeOpts }],
      "max-lines-per-function": [
        "error",
        { max: 50, ...sizeOpts, IIFEs: true },
      ],
      complexity: ["error", { max: 8 }],
    },
  },
  {
    name: "authz/repository-budget",
    files: [
      "services/auth/src/repository/**/*.ts",
      "services/memo/src/repository/**/*.ts",
    ],
    rules: {
      // SQL blocks are inherently long; still cap whole-file via max-lines.
      "max-lines-per-function": [
        "error",
        { max: 100, ...sizeOpts, IIFEs: true },
      ],
    },
  },
  {
    name: "authz/router-entry",
    files: ["services/*/src/app.ts", "services/*/src/main.ts"],
    rules: {
      // Route tables and bootstrap logs are allowed more branching / console.
      complexity: ["error", { max: 20 }],
      "no-console": "off",
      "max-lines-per-function": [
        "error",
        { max: 120, ...sizeOpts, IIFEs: true },
      ],
    },
  },
);
