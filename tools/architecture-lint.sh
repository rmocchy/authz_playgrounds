#!/usr/bin/env bash
# Run backend architecture lint from repo root.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
exec deno run -A --config tools/architecture-lint/deno.json \
  tools/architecture-lint/run.ts "$@"
