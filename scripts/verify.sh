#!/usr/bin/env bash
set -euo pipefail

level="${1:-}"
if [[ $# != 1 || ( "$level" != fast && "$level" != ui ) ]]; then
  echo 'Usage: bash scripts/verify.sh <fast|ui>' >&2
  exit 2
fi
# Override inherited credentials before ANY child, including git and mktemp.
export TURSO_DATABASE_URL=http://127.0.0.1:8317
export TURSO_AUTH_TOKEN=local-verify
export E2E_TURSO_DATABASE_URL="$TURSO_DATABASE_URL"
export E2E_TURSO_AUTH_TOKEN="$TURSO_AUTH_TOKEN"
export JWT_SECRET=playwright-test-secret
export MYCHELIN_BASE_URL=http://127.0.0.1:3100
export MYCHELIN_CLEANUP_USERS=0
export NEXT_TELEMETRY_DISABLED=1
export NODE_OPTIONS=--max-old-space-size=768
export PLAYWRIGHT_CHROMIUM_EXECUTABLE=/home/cluser/.cache/ms-playwright/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell
# Keep overrides immutable in this shell; every launched child inherits them.
readonly TURSO_DATABASE_URL TURSO_AUTH_TOKEN E2E_TURSO_DATABASE_URL E2E_TURSO_AUTH_TOKEN JWT_SECRET
cd "$(dirname "${BASH_SOURCE[0]}")/.."
ROOT="$PWD"
export NODE_OPTIONS="--max-old-space-size=768 --require=\"$ROOT/scripts/verify-local.cjs\""
local_preload="--require=\"$ROOT/scripts/verify-local.cjs\""
export NEXT_FONT_GOOGLE_MOCKED_RESPONSES="$ROOT/scripts/verify-fonts.cjs"
assert_local_db() {
  if [[ ! "${TURSO_DATABASE_URL:-}" =~ ^http://127\.0\.0\.1:[0-9]+$ ]]; then
    echo 'Refusing verification: TURSO_DATABASE_URL must be http://127.0.0.1:<port>.' >&2
    return 3
  fi
}
assert_local_db
mkdir -p .verify/logs .verify/shots .verify/cache
node scripts/verify-report.mjs start "$level"
verify_tmp=''
server_pid=''
db_pid=''
remove_next=0
active_step=''
active_log=''
active_started=0
cleanup() {
  local code=$?
  trap - EXIT INT TERM
  for pid in "$server_pid" "$db_pid"; do
    [[ -n "$pid" ]] || continue
    kill -TERM -- "-$pid" 2>/dev/null || true
    for ((i=0; i<30; i++)); do
      if ! kill -0 -- "-$pid" 2>/dev/null; then break; fi
      sleep 0.1
    done
    kill -KILL -- "-$pid" 2>/dev/null || true
    wait "$pid" 2>/dev/null || true
  done
  [[ -z "$verify_tmp" ]] || rm -rf -- "$verify_tmp"
  if ((remove_next)); then rm -rf -- "$ROOT/app/.next"; fi
  if [[ -n "$active_step" ]]; then
    node scripts/verify-report.mjs step "$active_step" fail "$((SECONDS-active_started))" "$active_log"
  fi
  node scripts/verify-report.mjs finish "$code"
  exit "$code"
}
trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM
export LINT_BASE="${LINT_BASE:-$(git merge-base HEAD origin/main)}"
step() {
  assert_local_db
  active_step="$1"
  active_log=".verify/logs/$1.log"
  active_started=$SECONDS
  shift
  local server_lines=0
  if [[ "$active_step" == privacy || "$active_step" == pilot ]]; then
    server_lines=$(wc -l < .verify/logs/server.log)
  fi
  echo "Running $active_step…"
  local code=0
  "$@" >"$active_log" 2>&1 || code=$?
  cat "$active_log"
  local status=pass
  if ((code != 0)); then status=fail; fi
  if ((code != 0)) && [[ "$active_step" == privacy || "$active_step" == pilot ]] && \
      known_smoke_failure "$active_step" "$active_log" "$server_lines"; then
    status=known-failing
  fi
  node scripts/verify-report.mjs step "$active_step" "$status" "$((SECONDS-active_started))" "$active_log"
  active_step=''
  if [[ "$status" == known-failing ]]; then return 0; fi
  return "$code"
}
in_app() { (cd "$ROOT/app" && "$@"); }
step typecheck node scripts/verify-check.mjs typecheck "$LINT_BASE"
step lint node scripts/verify-check.mjs lint "$LINT_BASE"
step test in_app npm test
if [[ -f scripts/feature-map-check.mjs ]]; then
  step feature-map node scripts/feature-map-check.mjs
else
  echo 'SKIP: scripts/feature-map-check.mjs is absent.' > .verify/logs/feature-map.log
  node scripts/verify-report.mjs step feature-map skip 0 .verify/logs/feature-map.log
fi
if [[ "$level" == fast ]]; then exit 0; fi

check_ports() {
  node --input-type=module - <<'JS'
import net from 'node:net';
for (const port of [3100, 8317]) {
  await new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once('error', () => reject(new Error(`Port ${port} occupied; refusing to reuse another server.`)));
    server.listen(port, '127.0.0.1', () => server.close(resolve));
  });
}
JS
}
step ports check_ports
schema() {
  assert_local_db
  # The sole allowed remote operation: schema only, no rows or credentials.
  if turso db shell mychelin-staging .schema > .verify/cache/schema.new.sql; then
    if [[ ! -s .verify/cache/schema.new.sql ]]; then echo 'Empty schema dump'; return 1; fi
    mv .verify/cache/schema.new.sql .verify/cache/schema.sql
    echo 'Refreshed staging schema (DDL only).'
  elif [[ -s .verify/cache/schema.sql ]]; then
    rm -f .verify/cache/schema.new.sql
    echo 'Schema dump failed; using cached .verify/cache/schema.sql.'
  else
    rm -f .verify/cache/schema.new.sql
    echo 'Schema dump failed and no cached schema exists.'; return 1
  fi
}
step schema schema
# Build before either local service or Chromium is started: their memory peaks
# must not overlap. Keep the harmless JWT/loopback DB placeholders above (the
# CI build needs the same three env vars), dotenv/network guard and font hook.
if [[ ! -e app/.next && ! -L app/.next ]]; then remove_next=1; fi
# Next derives its static worker count from CIRCLE_NODE_TOTAL minus one.
# Constrain both JS workers and Turbopack's native threads on the small VPS.
step build in_app env NODE_ENV=production CIRCLE_NODE_TOTAL=2 RAYON_NUM_THREADS=1 \
  NODE_OPTIONS="--max-old-space-size=1280 $local_preload" npx next build
verify_tmp="$(mktemp -d /tmp/mychelin-verify-XXXXXXXX)"
start_db() {
  assert_local_db
  setsid turso dev -f "$verify_tmp/db.sqlite" -p 8317 > .verify/logs/turso.log 2>&1 &
  db_pid=$!
  for ((i=0; i<60; i++)); do
    kill -0 "$db_pid" 2>/dev/null || { echo 'Turso exited; see turso.log'; return 1; }
    if curl -fsS --max-time 1 http://127.0.0.1:8317/health > /dev/null 2>&1; then break; fi
    sleep 1
  done
  # Use the app's web client against loopback, never a remote shell to apply SQL.
  in_app node --input-type=module - <<'JS'
import { createClient } from '@libsql/client/web';
import { readFileSync } from 'node:fs';
if (!/^http:\/\/127\.0\.0\.1:\d+$/.test(process.env.TURSO_DATABASE_URL ?? '')) process.exit(3);
const db = createClient({ url: process.env.TURSO_DATABASE_URL, authToken: process.env.TURSO_AUTH_TOKEN });
try {
  await db.executeMultiple(readFileSync('../.verify/cache/schema.sql', 'utf8'));
  await db.executeMultiple(readFileSync('drizzle/seed_ingredient_catalog.sql', 'utf8'));
  console.log('Fresh local DB: schema and ingredient catalog applied. Runtime ensures remain app-owned.');
} finally { db.close(); }
JS
}
step database start_db
start_server() {
  assert_local_db
  (cd app && exec setsid env NODE_ENV=production \
    NODE_OPTIONS="--max-old-space-size=512 $local_preload" \
    npx next start -p 3100 -H 127.0.0.1) > .verify/logs/server.log 2>&1 &
  server_pid=$!
  for ((i=0; i<120; i++)); do
    kill -0 "$server_pid" 2>/dev/null || { echo 'Next exited; see server.log'; return 1; }
    # Warm the actual page, including fonts, before Playwright checks this URL.
    if curl -fsS --max-time 2 http://127.0.0.1:3100/ > /dev/null 2>&1; then return 0; fi
    sleep 1
  done
  echo 'Next readiness timed out; see server.log'; return 1
}
step server start_server
rm -f .verify/shots/{landing,app-home,recipe-detail,cooking-card,planner,shopping-list,profile}.png
# Only failures reproduced identically on clean origin/release-2026-11-06 belong here.
KNOWN_FAILING=()
playwright_args=(test --project=mobile --workers=1 --output ../.verify/playwright --reporter=list,json)
if ((${#KNOWN_FAILING[@]})); then
  known_pattern="$(IFS='|'; echo "${KNOWN_FAILING[*]}")"
  playwright_args+=(--grep-invert "$known_pattern")
fi
# The runner owns the server even if invoked from a CI shell; standalone CI's
# existing playwright.config.ts behavior remains unchanged.
rm -f .verify/playwright/results.json
playwright_code=0
step playwright in_app env CI= PLAYWRIGHT_JSON_OUTPUT_FILE="$ROOT/.verify/playwright/results.json" \
  npx playwright "${playwright_args[@]}" || playwright_code=$?
# Parse even when assertions fail, so retries remain visible in failed reports.
results_code=0
step playwright-results node scripts/verify-report.mjs playwright .verify/playwright/results.json || results_code=$?
if ((playwright_code != 0)); then exit "$playwright_code"; fi
if ((results_code != 0)); then exit "$results_code"; fi

known_smoke_failure() {
  local name="$1" log="$2" server_lines="$3" signature
  case "$name" in
    privacy) signature='Privacy smoke failed: Privacy Smoke A can sign up: {"error":"Failed to create account"}' ;;
    pilot) signature='Pilot smoke failed: Pilot user POST /api/auth/signup returns 201: got 500 {"error":"Failed to create account"}' ;;
    *) return 1 ;;
  esac
  local server_log=".verify/logs/$name-server.log"
  sed -n "$((server_lines+1)),\$p" .verify/logs/server.log > "$server_log"
  # Reproduced on an untouched git archive of origin/release-2026-11-06
  # (33969a43175fe7de856fc3838c96449244ec6480), 2026-11-07, with the same
  # production build/local DB. Both smoke commands exit 1 at signup. Evidence:
  # .verify/logs/release-{privacy,pilot,server}.log. Match BOTH the assertion
  # and this step's new server error, so another failure cannot be excused.
  grep -Fqx "$signature" "$log" || return 1
  grep -Fq 'Signup error: Error: A Node.js API is used (setImmediate) which is not supported in the Edge Runtime.' "$server_log" || return 1
  node scripts/verify-report.mjs known-failing "$name" \
    'origin/release-2026-11-06@33969a43175fe7de856fc3838c96449244ec6480' \
    "$log" "$server_log" ".verify/logs/release-$name.log" .verify/logs/release-server.log
  echo "KNOWN_FAILING: $name signup hits Next's LOCAL Edge emulation artifact: EDGE_UNSUPPORTED_NODE_APIS in next/dist/shared/lib/constants.js defines a throwing setImmediate stub, which bcryptjs selects via typeof setImmediate === \"function\". Vercel real Edge leaves setImmediate undefined and bcryptjs falls back to scheduler/setTimeout; prod signup is not implicated (not yet confirmed against prod). See $server_log."
}
step privacy in_app npm run smoke:privacy
step pilot in_app npm run smoke:pilot
