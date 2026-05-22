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

Deploy production:

```bash
cd /home/cluser/projects/mychelin
vercel --prod
```

Do **not** deploy from inside `app/`. The root `.vercel/` link points at the correct production project.

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
