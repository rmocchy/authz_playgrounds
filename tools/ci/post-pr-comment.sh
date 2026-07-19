#!/usr/bin/env bash
# Upsert a sticky PR comment from a markdown file (requires gh + pull-requests: write).
#
# Usage:
#   post-pr-comment.sh <marker> <body.md>
#
# marker: unique string embedded in the comment (e.g. <!-- ci-coverage -->)
# Only runs on pull_request events; no-ops otherwise.
set -euo pipefail

marker="${1:?marker required}"
body_file="${2:?markdown body file required}"

if [[ ! -f "$body_file" ]]; then
  echo "post-pr-comment: body not found: $body_file" >&2
  exit 1
fi

if [[ "${GITHUB_EVENT_NAME:-}" != "pull_request" ]]; then
  echo "post-pr-comment: skip (event=${GITHUB_EVENT_NAME:-none})"
  exit 0
fi

if [[ -z "${GITHUB_TOKEN:-}" ]]; then
  echo "post-pr-comment: GITHUB_TOKEN not set" >&2
  exit 1
fi

pr_number="${PR_NUMBER:-${GITHUB_EVENT_PULL_REQUEST_NUMBER:-}}"
if [[ -z "$pr_number" && -n "${GITHUB_EVENT_PATH:-}" ]]; then
  pr_number="$(python3 -c 'import json,os; print(json.load(open(os.environ["GITHUB_EVENT_PATH"])).get("pull_request",{}).get("number",""))')"
fi
if [[ -z "$pr_number" ]]; then
  echo "post-pr-comment: could not determine PR number" >&2
  exit 1
fi

repo="${GITHUB_REPOSITORY:?}"

body="$(cat "$body_file")
${marker}
"

# Find existing sticky comment from github-actions only (never patch humans).
# Pass marker via env so jq does not break on quotes in the marker string.
existing_id="$(
  MARKER="${marker}" gh api "repos/${repo}/issues/${pr_number}/comments" --paginate \
    --jq '
      .[]
      | select(.user.login == "github-actions[bot]")
      | select(.body | contains(env.MARKER))
      | .id
    ' \
    | head -n1
)"

if [[ -n "$existing_id" ]]; then
  gh api -X PATCH "repos/${repo}/issues/comments/${existing_id}" \
    -f body="$body" >/dev/null
  echo "post-pr-comment: updated comment ${existing_id}"
else
  gh api -X POST "repos/${repo}/issues/${pr_number}/comments" \
    -f body="$body" >/dev/null
  echo "post-pr-comment: created comment on PR #${pr_number}"
fi
