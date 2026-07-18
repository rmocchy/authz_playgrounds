#!/usr/bin/env bash
# Generate API artifacts from TypeSpec contracts.
#
# Primary: compile specs/ → OpenAPI (specs/tsp-output/openapi/openapi.yaml)
# Client:  pkg/api-client/ is a Deno-friendly TypeScript client kept in sync
#          with the TypeSpec contract (hand-maintained fetch wrappers + types).
#
# Usage (from repo root):
#   ./tools/generate.sh
#   npm run generate
#
# Fallback: if TypeSpec packages are not installed, prints instructions and
# exits non-zero without wiping existing OpenAPI or pkg/api-client.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

SPECS_DIR="${ROOT}/specs"
CONFIG="${SPECS_DIR}/tspconfig.yaml"
OPENAPI_OUT="${SPECS_DIR}/tsp-output/openapi"

echo "==> Authz Playground: TypeSpec generate"
echo "    specs:  ${SPECS_DIR}"
echo "    config: ${CONFIG}"

if ! command -v npx >/dev/null 2>&1; then
  echo "error: npx not found. Install Node.js/npm, then: npm install" >&2
  echo "fallback: pkg/api-client/ remains the hand-written client matching specs/." >&2
  exit 1
fi

if [[ ! -d "${ROOT}/node_modules/@typespec/compiler" ]]; then
  echo "==> Installing TypeSpec devDependencies (npm install)..."
  npm install
fi

if [[ ! -f "${CONFIG}" ]]; then
  echo "error: missing ${CONFIG}" >&2
  exit 1
fi

echo "==> tsp compile specs"
npx --no-install tsp compile "${SPECS_DIR}" --config "${CONFIG}"

if [[ -f "${OPENAPI_OUT}/openapi.yaml" ]]; then
  echo "==> OpenAPI written: ${OPENAPI_OUT}/openapi.yaml"
else
  echo "warning: expected OpenAPI at ${OPENAPI_OUT}/openapi.yaml not found" >&2
fi

echo "==> pkg/api-client/"
echo "    Hand-maintained Deno-friendly client (types + fetch) matching TypeSpec."
echo "    After changing specs/, update pkg/api-client types/paths if needed,"
echo "    then re-run this script to refresh OpenAPI."
echo "    Import: import { createAuthClient, createMemoClient } from \"./pkg/api-client/mod.ts\""

echo "==> Done."
