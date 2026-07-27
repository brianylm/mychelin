#!/usr/bin/env bash
#
# Mychelin production deploy gate.
#
# Runs the full regression gauntlet BEFORE and AFTER deploying:
#   1. dirty-tree guard   (no uncommitted code to prod — see --allow-dirty)
#   2. typecheck          (tsc --noEmit)
#   3. lint               (eslint)
#   4. unit tests         (vitest)
#   5. production build   (next build)
#   6. deploy             (vercel --prod, from the repo root)
#   7. alias              (mychelin-sg.vercel.app -> new deployment)
#   8. regression smoke   (HTTP checks against the freshly deployed prod)
#
# Usage:
#   npm run deploy                 # full gate
#   bash scripts/deploy.sh --allow-dirty   # deploy uncommitted changes (escape hatch)

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
APP="$ROOT/app"
PROD_DOMAIN="mychelin-sg.vercel.app"
SCOPE="team_GhgWJD2sBWKzkZ5m06FWTUQv"

ALLOW_DIRTY=0
for arg in "$@"; do
  case "$arg" in
    --allow-dirty) ALLOW_DIRTY=1 ;;
    *) echo "Unknown argument: $arg" >&2; exit 2 ;;
  esac
done

step() { echo; echo "==> $*"; }

# ─── 1. Dirty-tree guard ────────────────────────────────────
step "1/8 Checking git working tree"
if [ -n "$(git -C "$ROOT" status --porcelain)" ]; then
  if [ "$ALLOW_DIRTY" -eq 1 ]; then
    echo "WARN deploying with uncommitted changes (--allow-dirty):"
    git -C "$ROOT" status --short
  else
    echo "ERROR: working tree has uncommitted changes." >&2
    echo "Deploys must ship committed code so prod is reproducible." >&2
    echo "Commit first, or re-run with --allow-dirty to override:" >&2
    git -C "$ROOT" status --short >&2
    exit 1
  fi
else
  echo "Working tree clean."
fi

# ─── 2-5. Static checks, tests, build ───────────────────────
step "2/8 Typecheck"
(cd "$APP" && npx tsc --noEmit -p tsconfig.json)

step "3/8 Lint (changed files)"
bash "$ROOT/scripts/lint-changed.sh"

step "4/8 Unit tests"
(cd "$APP" && npm test -- --run)

step "5/8 Production build"
(cd "$APP" && npm run build)

# ─── 6. Deploy ──────────────────────────────────────────────
step "6/8 Deploying to Vercel production"
(cd "$ROOT" && vercel --prod --yes)

# ─── 7. Alias the production domain ─────────────────────────
step "7/8 Aliasing $PROD_DOMAIN to the new deployment"
DEPLOY_URL="$(vercel ls mychelin --scope "$SCOPE" 2>&1 | grep -oE 'https://mychelin-[a-z0-9]+-brianylms-projects\.vercel\.app' | head -1)"
if [ -z "$DEPLOY_URL" ]; then
  echo "ERROR: could not resolve the new deployment URL" >&2
  exit 1
fi
vercel alias set "$DEPLOY_URL" "$PROD_DOMAIN" --scope "$SCOPE"
echo "$PROD_DOMAIN -> $DEPLOY_URL"

# ─── 8. Post-deploy regression smoke ────────────────────────
step "8/8 Running regression smoke against https://$PROD_DOMAIN"
sleep 3
(cd "$APP" && MYCHELIN_BASE_URL="https://$PROD_DOMAIN" node scripts/regression-smoke.mjs)

echo
echo "Deploy complete: https://$PROD_DOMAIN ($DEPLOY_URL)"
