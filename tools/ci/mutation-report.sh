#!/usr/bin/env bash
# Summarize Stryker mutation.json for GitHub Actions (step summary + metrics JSON).
#
# Usage:
#   mutation-report.sh <label> <mutation.json> [metrics-out.json]
#
# Score matches Stryker: (Killed + Timeout) / (Killed + Timeout + Survived + NoCoverage).
# Ignored mutants are excluded (same as Stryker total score).
set -euo pipefail

label="${1:?label required (e.g. memo-domain)}"
report_json="${2:?mutation.json path required}"
metrics_out="${3:-mutation-metrics.json}"

if [[ ! -f "$report_json" ]]; then
  echo "mutation-report: file not found: $report_json (skipping; mutation may have failed earlier)" >&2
  if [[ -n "${GITHUB_STEP_SUMMARY:-}" ]]; then
    {
      echo "## Mutation — \`${label}\`"
      echo
      echo "_Report missing — mutation step likely failed before producing \`mutation.json\`._"
    } >>"$GITHUB_STEP_SUMMARY"
  fi
  exit 0
fi

eval "$(
  python3 - "$report_json" <<'PY'
import json, sys
path = sys.argv[1]
data = json.load(open(path))
counts = {}
for info in data.get("files", {}).values():
    for m in info.get("mutants", []):
        st = m.get("status") or "Unknown"
        counts[st] = counts.get(st, 0) + 1

killed = counts.get("Killed", 0)
survived = counts.get("Survived", 0)
timeout = counts.get("Timeout", 0)
no_cov = counts.get("NoCoverage", 0)
ignored = counts.get("Ignored", 0)
runtime_error = counts.get("RuntimeError", 0)
compile_error = counts.get("CompileError", 0)

detected = killed + timeout
undetected = survived + no_cov
total = detected + undetected
score = (100.0 * detected / total) if total else 0.0

def emit(k, v):
    # shell-safe assignment
    if isinstance(v, float):
        print(f'{k}={v:.2f}')
    else:
        print(f'{k}={v}')

emit("killed", killed)
emit("survived", survived)
emit("timeout", timeout)
emit("no_coverage", no_cov)
emit("ignored", ignored)
emit("runtime_error", runtime_error)
emit("compile_error", compile_error)
emit("total_scored", total)
emit("score", score)
break_thr = (data.get("thresholds") or {}).get("break")
if break_thr is not None:
    emit("break_threshold", float(break_thr))
else:
    print("break_threshold=")
PY
)"

mkdir -p "$(dirname "$metrics_out")"
python3 - "$metrics_out" "$label" "$score" "$killed" "$survived" "$timeout" "$no_coverage" "$ignored" "$total_scored" "${break_threshold:-}" <<'PY'
import json, sys
out, label, score, killed, survived, timeout, no_cov, ignored, total, break_thr = sys.argv[1:]
payload = {
    "kind": "mutation",
    "label": label,
    "score": float(score),
    "killed": int(killed),
    "survived": int(survived),
    "timeout": int(timeout),
    "noCoverage": int(no_cov),
    "ignored": int(ignored),
    "totalScored": int(total),
}
if break_thr != "":
    payload["breakThreshold"] = float(break_thr)
with open(out, "w") as f:
    json.dump(payload, f, indent=2)
    f.write("\n")
PY

if [[ -n "${GITHUB_STEP_SUMMARY:-}" ]]; then
  {
    echo "## Mutation — \`${label}\`"
    echo
    echo "| Metric | Value |"
    echo "|--------|-------|"
    echo "| **Score** | **${score}%** |"
    echo "| Killed | ${killed} |"
    echo "| Survived | ${survived} |"
    echo "| Timeout | ${timeout} |"
    echo "| NoCoverage | ${no_coverage} |"
    echo "| Ignored | ${ignored} |"
    echo "| Total (scored) | ${total_scored} |"
    if [[ -n "${break_threshold:-}" ]]; then
      echo "| Break threshold | ${break_threshold}% |"
    fi
  } >>"$GITHUB_STEP_SUMMARY"
fi

echo "mutation-report: ${label} score=${score}% killed=${killed} survived=${survived} total=${total_scored}"
