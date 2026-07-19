#!/usr/bin/env bash
# Generate API artifacts from TypeSpec contracts.
#
# Generated: doc/ → OpenAPI (doc/openapi/openapi.yaml)
# Hand-synced (not emitted): pkg/api-client/ Deno-friendly fetch client + types.
# After editing doc/, re-run this script and update pkg/api-client if paths/shapes changed.
#
# Usage (from repo root):
#   ./tools/generate.sh
#   npm run generate
#   bash tools/generate.sh
#
# Fallback: if TypeSpec packages are not installed, prints instructions and
# exits non-zero without wiping existing OpenAPI or pkg/api-client.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

DOC_DIR="${ROOT}/doc"
CONFIG="${DOC_DIR}/tspconfig.yaml"
OPENAPI_OUT="${DOC_DIR}/openapi"
OPENAPI_FILE="${OPENAPI_OUT}/openapi.yaml"

echo "==> Authz Playground: TypeSpec generate"
echo "    doc:    ${DOC_DIR}"
echo "    config: ${CONFIG}"

if ! command -v npx >/dev/null 2>&1; then
  echo "error: npx not found. Install Node.js/npm, then: npm install" >&2
  echo "fallback: pkg/api-client/ remains the hand-written client matching doc/." >&2
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

echo "==> tsp compile doc"
npx --no-install tsp compile "${DOC_DIR}" --config "${CONFIG}"

if [[ ! -f "${OPENAPI_FILE}" ]]; then
  echo "error: expected OpenAPI at ${OPENAPI_FILE} not found" >&2
  exit 1
fi

echo "==> OpenAPI written: ${OPENAPI_FILE}"

# Smoke-check key paths so committed OpenAPI cannot drift past missing routes.
echo "==> Smoke-check OpenAPI paths"
REQUIRED_PATHS=(
  "/v1/auth/login"
  "/v1/auth/register"
  "/v1/auth/logout"
  "/v1/sessions/me"
  "/v1/memos"
)
missing=0
for p in "${REQUIRED_PATHS[@]}"; do
  # OpenAPI yaml path keys are indented two spaces: "  /v1/auth/login:"
  if ! grep -qE "^  ${p}:" "${OPENAPI_FILE}"; then
    echo "error: missing OpenAPI path ${p}" >&2
    missing=1
  fi
done
if [[ "${missing}" -ne 0 ]]; then
  exit 1
fi
echo "    ok: ${REQUIRED_PATHS[*]}"

echo "==> pkg/api-client/ (hand-synced, not generated)"
echo "    After changing doc/, update pkg/api-client types/paths if needed."
echo "    Import: import { createAuthClient, createMemoClient } from \"./pkg/api-client/mod.ts\""
echo "    Client tests: deno test pkg/api-client/http_test.ts"

echo "==> Done."
