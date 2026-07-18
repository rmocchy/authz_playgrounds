#!/usr/bin/env bash
# Mutation testing for critical Auth/Memo domain paths.
#
# Deno-friendly lightweight runner (not StrykerJS — Deno + JSR imports do not
# plug cleanly into Node-centric Stryker). Mutates pure domain modules in place,
# re-runs existing Deno unit tests, restores sources, and checks score threshold.
#
# Targets:
#   - services/memo/src/domain/authorize.ts  (owner / global / secure matrix)
#   - services/auth/src/domain/password.ts   (hash / verify control flow)
#
# Usage (from repo root):
#   ./tools/mutate.sh
#   ./tools/mutate.sh --target authorize
#   ./tools/mutate.sh --target password
#   ./tools/mutate.sh --threshold 40
#   bash tools/mutate.sh --help
#
# Design (projects/first_commit/design.md §6 / PR 6):
#   Initial threshold is intentionally low ("回る" first). Raise later.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

if ! command -v deno >/dev/null 2>&1; then
  echo "error: deno not found. Install from https://deno.land" >&2
  exit 1
fi

# Default threshold 50% — playground-friendly; override with --threshold N
THRESHOLD="${MUTATION_THRESHOLD:-50}"
EXTRA_ARGS=()
while [[ $# -gt 0 ]]; do
  case "$1" in
    --threshold)
      THRESHOLD="${2:?}"
      shift 2
      ;;
    --help|-h)
      exec deno run -A "${ROOT}/tools/mutation/run.ts" --help
      ;;
    *)
      EXTRA_ARGS+=("$1")
      shift
      ;;
  esac
done

echo "==> Authz Playground: mutation tests"
echo "    runner: tools/mutation/run.ts"
echo "    threshold: ${THRESHOLD}%"
echo "    note: password mutants use bcrypt and can take several minutes"

if [[ ${#EXTRA_ARGS[@]} -gt 0 ]]; then
  exec deno run -A "${ROOT}/tools/mutation/run.ts" \
    --threshold "${THRESHOLD}" \
    "${EXTRA_ARGS[@]}"
else
  exec deno run -A "${ROOT}/tools/mutation/run.ts" \
    --threshold "${THRESHOLD}"
fi
