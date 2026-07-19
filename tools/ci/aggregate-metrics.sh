#!/usr/bin/env bash
# Aggregate coverage / mutation metrics JSON files into a markdown report.
#
# Usage:
#   aggregate-metrics.sh <title> <glob-or-dir> [out.md]
#
# Finds **/*-metrics.json (or *.json metrics) under the given path and
# prints a markdown table. Writes to out.md and appends to $GITHUB_STEP_SUMMARY.
set -euo pipefail

title="${1:?title required}"
src="${2:?source dir or file glob required}"
out_md="${3:-aggregated-metrics.md}"

files_list="$(mktemp)"
trap 'rm -f "$files_list"' EXIT

# Prefer *metrics.json so large Stryker mutation.json / lcov sidecars are skipped.
if [[ -d "$src" ]]; then
  find "$src" -type f \( -name '*-metrics.json' -o -name '*metrics.json' \) \
    | sort >"$files_list"
else
  # shellcheck disable=SC2086
  compgen -G "$src" 2>/dev/null | sort >"$files_list" || true
fi

python3 - "$title" "$out_md" "$src" "$files_list" <<'PY'
import json, sys
from pathlib import Path

title, out_md, src, list_path = sys.argv[1:5]
paths = [ln.strip() for ln in open(list_path) if ln.strip()]

rows = []
for p in paths:
    try:
        data = json.load(open(p))
    except (OSError, json.JSONDecodeError):
        continue
    kind = data.get("kind")
    if kind not in ("coverage", "mutation"):
        continue
    label = data.get("label", Path(p).stem)
    if kind == "coverage":
        rows.append(
            (
                "coverage",
                label,
                f"{data.get('line', '—')}%",
                f"branch {data.get('branch', '—')}% · function {data.get('function', '—')}%",
            )
        )
    else:
        score = data.get("score")
        score_s = f"{score:.2f}%" if isinstance(score, (int, float)) else "—"
        detail = (
            f"killed {data.get('killed', 0)} · survived {data.get('survived', 0)} · "
            f"timeout {data.get('timeout', 0)} · total {data.get('totalScored', 0)}"
        )
        thr = data.get("breakThreshold")
        if thr is not None:
            detail += f" · break ≥ {thr}%"
        rows.append(("mutation", label, score_s, detail))

rows.sort(key=lambda r: (r[0], r[1]))

if not rows:
    print(f"aggregate-metrics: no metrics files under {src}", file=sys.stderr)
    text = f"## {title}\n\n_No metrics files found._\n"
else:
    lines = [
        f"## {title}",
        "",
        "| Kind | Target | Score / Line % | Details |",
        "|------|--------|----------------|---------|",
    ]
    for kind, label, score, detail in rows:
        lines.append(f"| {kind} | `{label}` | **{score}** | {detail} |")
    lines.append("")
    lines.append("_Artifacts: HTML/JSON reports are attached to this workflow run._")
    lines.append("")
    text = "\n".join(lines)

Path(out_md).write_text(text)
print(text, end="")
PY

if [[ -n "${GITHUB_STEP_SUMMARY:-}" ]]; then
  cat "$out_md" >>"$GITHUB_STEP_SUMMARY"
fi
