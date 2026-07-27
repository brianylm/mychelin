#!/usr/bin/env bash
#
# Lints only the TS/TSX files that differ from the base branch (plus
# untracked ones). The repo carries pre-existing eslint errors in files
# nobody is touching; a full-repo lint gate would be red from day one
# and get ignored. This keeps the gate meaningful: no NEW lint debt.
#
# Usage:
#   bash scripts/lint-changed.sh            # diffs against main
#   LINT_BASE=origin/main bash scripts/lint-changed.sh

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BASE="${LINT_BASE:-main}"

cd "$ROOT"

FILES=$({
  git diff --name-only "$BASE" --diff-filter=d -- app/src app/scripts 2>/dev/null || true
  git ls-files --others --exclude-standard -- app/src app/scripts
} | sort -u | grep -E '\.(ts|tsx|mts)$' | while IFS= read -r f; do [ -f "$f" ] && echo "$f"; done || true)

if [ -z "$FILES" ]; then
  echo "No changed TS files to lint (base: $BASE)."
  exit 0
fi

echo "Linting changed files (base: $BASE):"
echo "$FILES" | sed 's/^/  /'
echo

cd "$ROOT/app"
# shellcheck disable=SC2086
npx eslint $(echo "$FILES" | sed 's|^app/||')
