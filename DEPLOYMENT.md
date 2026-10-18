# Mychelin Deployment Map

Production is intentionally a two-level repo:

- **Repo / deploy wrapper:** `/home/cluser/projects/mychelin`
- **Production app code:** `/home/cluser/projects/mychelin/app`
- **Live URL:** `https://mychelin-sg.vercel.app`
- **Correct Vercel project:** `mychelin` (`prj_keoeCPZKShPgjPWLR5gpWxWIlfCt`)
- **Vercel team/org:** `team_GhgWJD2sBWKzkZ5m06FWTUQv` (`brianylms-projects`)
- **Vercel Root Directory:** `app`

## Commands

Build the production app locally:

```bash
cd /home/cluser/projects/mychelin/app
npm run build
```

Deploy production (the gated, recommended path):

```bash
cd /home/cluser/projects/mychelin
npm run deploy
```

`scripts/deploy.sh` runs the full regression gate, aborting on the first failure:

1. dirty-tree guard — refuses to deploy uncommitted changes (`--allow-dirty` overrides)
2. typecheck, 3. lint, 4. unit tests (`vitest`), 5. production build
6. `vercel --prod` from the repo root
7. re-aliases `mychelin-sg.vercel.app` to the new deployment (CLI deploys do NOT do this automatically)
8. post-deploy regression smoke (`app/scripts/regression-smoke.mjs`) against the live domain

Escape hatch for emergencies — deploy manually, but you skip every gate:

```bash
cd /home/cluser/projects/mychelin
vercel --prod
vercel alias set <deployment-url> mychelin-sg.vercel.app --scope team_GhgWJD2sBWKzkZ5m06FWTUQv
```

Do **not** deploy from inside `app/`. The root `.vercel/` link points at the correct production project.

Local regression tooling:

```bash
cd /home/cluser/projects/mychelin/app
npm test                # unit tests (vitest)
E2E_TURSO_DATABASE_URL=$(turso db show mychelin-staging --url) \
E2E_TURSO_AUTH_TOKEN=$(turso db tokens create mychelin-staging --expiration 1d) \
npm run test:e2e        # Playwright e2e (dev server on :3100, mychelin-staging Turso DB)
npm run smoke:regression   # post-deploy HTTP smoke, MYCHELIN_BASE_URL=... to target non-prod
```

CI: `.github/workflows/test.yml` runs typecheck + lint + unit tests + Playwright e2e + build on every push and PR. The e2e step uses the `E2E_TURSO_DATABASE_URL` and `E2E_TURSO_AUTH_TOKEN` GitHub secrets, which point at the `mychelin-staging` Turso database. Vercel **Preview** deployments use the same database (Preview-scoped `TURSO_*` env vars); Production keeps its own.

`mychelin-staging` = production's exact schema plus ONE account's data (account #1: recipes, books, plans, attempts, shopping, fridge), rebuilt by `app/scripts/seed-staging.mjs`. Other users' data, share links, push subscriptions, notification jobs, reset tokens and analytics are never copied. Staging login: `owner@staging.mychelin.test` (password set via `STAGING_PASSWORD`, otherwise printed by the script). Re-run the script to reset staging or after a production schema change:

```bash
cd /home/cluser/projects/mychelin/app
SOURCE_TURSO_DATABASE_URL=$(turso db show mychelin --url) \
SOURCE_TURSO_AUTH_TOKEN=$(turso db tokens create mychelin --read-only --expiration 1d) \
STAGING_TURSO_DATABASE_URL=$(turso db show mychelin-staging --url) \
STAGING_TURSO_AUTH_TOKEN=$(turso db tokens create mychelin-staging --expiration 1d) \
STAGING_PASSWORD='<choose one>' node scripts/seed-staging.mjs
```

CI e2e users (`*@example.com`) appear in previews briefly while a run is going and are cleaned up afterwards. A preview branch that runs schema-changing code (`ensure-schema`) changes staging for CI too; reset staging if that causes trouble. `app/.env.local` and the `TURSO_*` secrets are **production** — `playwright.config.ts` refuses to run without the E2E variables or against the production URL.

Verify Vercel root directory:

```bash
cd /home/cluser/projects/mychelin
vercel project inspect mychelin --scope team_GhgWJD2sBWKzkZ5m06FWTUQv
# Expected: Root Directory    app
```

## Test Push / Production Smoke Test

Use this when checking that GitHub → Vercel → production API → Turso still works.

### 1. Trigger the deployment pipeline

```bash
cd /home/cluser/projects/mychelin
git status --short
git commit --allow-empty -m "Test Mychelin deployment pipeline"
git push origin main
```

### 2. Wait for Vercel production to be ready

```bash
cd /home/cluser/projects/mychelin
vercel ls mychelin --scope team_GhgWJD2sBWKzkZ5m06FWTUQv
vercel inspect <new-production-deployment-url> \
  --scope team_GhgWJD2sBWKzkZ5m06FWTUQv \
  --wait \
  --timeout 4m
```

Expected:

- `status` becomes `Ready`
- aliases include `https://mychelin-sg.vercel.app`

### 3. Exercise production auth + DB APIs

Run against the live production domain with a throwaway user:

- `POST /api/auth/signup` → expect `201`
- `GET /api/auth/me` using returned auth cookie → expect `200`
- `POST /api/recipes` with one ingredient and one instruction → expect `201`
- `GET /api/recipes/:id` → expect `200`
- `DELETE /api/recipes/:id` → expect `200`
- `POST /api/auth/login` for the throwaway user → expect `200`

Clean up after the test:

- delete the smoke-test recipe through the API
- delete the throwaway smoke-test user from Turso using local app env vars

Example cleanup pattern:

```bash
cd /home/cluser/projects/mychelin/app
node - <<'NODE'
require('dotenv').config({ path: '.env.local' });
require('dotenv').config({ path: '.env' });
const { createClient } = require('@libsql/client');
const email = 'openclaw-smoke-REPLACE@example.com';
const db = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});
(async () => {
  await db.execute({ sql: 'delete from users where email = ?', args: [email] });
  const after = await db.execute({ sql: 'select count(*) as count from users where email = ?', args: [email] });
  console.log({ remaining: Number(after.rows[0].count) });
})();
NODE
```

### Last known-good verification

2026-05-22 UTC:

- Empty test commit: `688c628 Test Mychelin deployment pipeline`
- Vercel production deploy: `Ready`
- Live alias: `https://mychelin-sg.vercel.app`
- Production smoke test passed: signup, auth cookie, recipe create/fetch/delete, login
- Throwaway test user was removed from Turso afterward

## Archive

The old root-level prototype `src/` is archived at:

```text
archive/root-prototype-src-2026-05-22/
```
