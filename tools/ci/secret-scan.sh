#!/usr/bin/env bash
# Detect secrets / credential-like env material in the working tree and git history.
#
# Primary engine: gitleaks (https://github.com/gitleaks/gitleaks)
# Also fails if any real .env file (not *.example) is tracked by git.
#
# Usage (repo root):
#   ./tools/ci/secret-scan.sh
#   npm run lint:secrets
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT"

CONFIG="${GITLEAKS_CONFIG:-${ROOT}/.gitleaks.toml}"
RED=$'\033[31m'
GRN=$'\033[32m'
YLW=$'\033[33m'
RST=$'\033[0m'

echo "==> Secret scan (env / credentials)"

# --- 1. Never track real dotenv files --------------------------------------
echo "    [1/2] tracked .env files must not exist"
tracked_env="$(
  git ls-files -z -- . ':!:*/node_modules/*' \
    | tr '\0' '\n' \
    | grep -E '(^|/)\.env($|\.)' \
    | grep -vE '\.env\.example$' \
    || true
)"
if [[ -n "${tracked_env}" ]]; then
  echo "${RED}error: tracked dotenv file(s) found (should be gitignored):${RST}" >&2
  echo "${tracked_env}" >&2
  echo "    remove from git: git rm --cached <file>  (keep local file)" >&2
  exit 1
fi
echo "    ${GRN}ok${RST}: no tracked .env (only .env.example allowed)"

# --- 2. gitleaks -----------------------------------------------------------
echo "    [2/2] gitleaks detect"
if [[ ! -f "${CONFIG}" ]]; then
  echo "${RED}error: missing config ${CONFIG}${RST}" >&2
  exit 1
fi

run_gitleaks() {
  local bin="$1"
  shift
  # --no-git: scan working tree files (respects .gitignore via gitleaks)
  # Plus git history when available for committed leaks.
  "${bin}" detect \
    --source="${ROOT}" \
    --config="${CONFIG}" \
    --verbose \
    --redact \
    --exit-code=1 \
    "$@"
}

if command -v gitleaks >/dev/null 2>&1; then
  echo "    using: $(command -v gitleaks) ($(gitleaks version 2>/dev/null || echo '?'))"
  run_gitleaks gitleaks
elif command -v docker >/dev/null 2>&1; then
  echo "    using: docker.io/zricethezav/gitleaks:latest"
  docker run --rm \
    -v "${ROOT}:/repo:ro" \
    -w /repo \
    zricethezav/gitleaks:latest \
    detect \
    --source=/repo \
    --config=/repo/.gitleaks.toml \
    --verbose \
    --redact \
    --exit-code=1
else
  echo "${RED}error: gitleaks not found and docker unavailable${RST}" >&2
  echo "    install one of:" >&2
  echo "      brew install gitleaks" >&2
  echo "      # or https://github.com/gitleaks/gitleaks/releases" >&2
  echo "      # or Docker Desktop (script falls back to the official image)" >&2
  exit 1
fi

echo "${GRN}==> Secret scan passed${RST}"
