#!/usr/bin/env bash
# Summarize Deno coverage for GitHub Actions (step summary + metrics JSON).
#
# Usage:
#   coverage-report.sh <label> <coverage-dir> [metrics-out.json]
#
# Expects a profile produced by: deno test --coverage=<coverage-dir>
# Writes markdown to $GITHUB_STEP_SUMMARY when set.
set -euo pipefail

label="${1:?label required (e.g. auth)}"
cov_dir="${2:?coverage directory required}"
metrics_out="${3:-coverage-metrics.json}"

if [[ ! -d "$cov_dir" ]]; then
  echo "coverage-report: directory not found: $cov_dir (skipping; tests may have failed earlier)" >&2
  if [[ -n "${GITHUB_STEP_SUMMARY:-}" ]]; then
    {
      echo "## Coverage — \`${label}\`"
      echo
      echo "_Coverage profile missing — tests may have failed before collecting coverage._"
    } >>"$GITHUB_STEP_SUMMARY"
  fi
  exit 0
fi

# Ensure HTML + LCOV exist for artifacts (Deno 2 often emits them during
# `deno test --coverage`, but regenerate if missing / older CLI).
if [[ ! -d "${cov_dir}/html" ]]; then
  NO_COLOR=1 deno coverage --html "${cov_dir}" >/dev/null 2>&1 || true
fi
if [[ ! -f "${cov_dir}/lcov.info" ]]; then
  NO_COLOR=1 deno coverage --lcov --output="${cov_dir}/lcov.info" "${cov_dir}" \
    >/dev/null 2>&1 || true
fi

# Table to stdout (also used for parsing) + step summary.
# NO_COLOR / strip ANSI: Deno may colorize percentages in the table.
report="$(NO_COLOR=1 deno coverage "$cov_dir" 2>/dev/null || true)"
if [[ -z "$report" ]]; then
  echo "coverage-report: empty report for $cov_dir" >&2
  exit 1
fi

# Strip ANSI escapes (in case NO_COLOR is ignored)
report_plain="$(printf '%s\n' "$report" | python3 -c 'import re,sys; print(re.sub(r"\x1b\[[0-9;]*m", "", sys.stdin.read()), end="")')"

echo "$report_plain"

# Parse "All files" row: | All files | branch | function | line |
read -r branch_pct function_pct line_pct < <(
  printf '%s\n' "$report_plain" | awk -F'|' '
    /All files/ {
      gsub(/[[:space:]]/, "", $3);
      gsub(/[[:space:]]/, "", $4);
      gsub(/[[:space:]]/, "", $5);
      print $3, $4, $5;
      exit
    }
  '
)

if [[ -z "${line_pct:-}" ]]; then
  echo "coverage-report: could not parse All files totals" >&2
  exit 1
fi

# Strip trailing % if present
branch_pct="${branch_pct%%%}"
function_pct="${function_pct%%%}"
line_pct="${line_pct%%%}"

# Validate numbers (reject residual non-numeric junk)
python3 -c "float('${branch_pct}'); float('${function_pct}'); float('${line_pct}')" \
  || { echo "coverage-report: non-numeric percentages: ${branch_pct} ${function_pct} ${line_pct}" >&2; exit 1; }

mkdir -p "$(dirname "$metrics_out")"
python3 - "$metrics_out" "$label" "$branch_pct" "$function_pct" "$line_pct" <<'PY'
import json, sys
out, label, branch, function, line = sys.argv[1:]
json.dump(
    {
        "kind": "coverage",
        "label": label,
        "branch": float(branch),
        "function": float(function),
        "line": float(line),
    },
    open(out, "w"),
    indent=2,
)
open(out, "a").write("\n")
PY

if [[ -n "${GITHUB_STEP_SUMMARY:-}" ]]; then
  {
    echo "## Coverage — \`${label}\`"
    echo
    echo "| Metric | % |"
    echo "|--------|---|"
    echo "| Branch | ${branch_pct} |"
    echo "| Function | ${function_pct} |"
    echo "| Line | ${line_pct} |"
    echo
    echo "<details><summary>File breakdown</summary>"
    echo
    echo '```'
    echo "$report_plain"
    echo '```'
    echo
    echo "</details>"
  } >>"$GITHUB_STEP_SUMMARY"
fi

echo "coverage-report: ${label} line=${line_pct}% branch=${branch_pct}% function=${function_pct}%"
