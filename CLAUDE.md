# CLAUDE.md

## Working Style
- Be proactive. Don't just advise — take action. Recommend and do.
- When the user says something needs to happen, do it. Don't ask the user to do it manually unless there's genuinely no way to do it from here.
- Merge PRs, redeploy, test endpoints — handle the full loop.
- Only escalate to the user when truly blocked (e.g., needs credentials, dashboard-only actions with no API access).

## Project: Mychelin
- **Live site**: mychelin-sg.vercel.app
- **Repo**: brianylmorg/mychelin
- **Primary app**: `mychelin-1/` subfolder (this is what Vercel deploys — Vercel Root Directory is set to `mychelin-1`)
- **Database**: Turso (libsql) at `libsql://mychelin-brianylm.aws-ap-northeast-1.turso.io`
- **Region**: hnd1 (Tokyo) on Vercel
- **Auth**: JWT cookie (`mychelin_token`), bcrypt passwords, 30-day expiry, uses `jose` (not `jsonwebtoken`) for edge compatibility
- **Framework**: Next.js 16 with Drizzle ORM
- **Key env vars**: `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`, `JWT_SECRET`, `BLOB_READ_WRITE_TOKEN`

## Runtime Gotcha — Use Edge, Not Node
The **Node.js serverless runtime is broken** on this Vercel project — POST requests hang indefinitely with "Provisional headers" in DevTools, and zero function invocations appear in Vercel runtime logs. Edge runtime works fine.

**All new API routes should use `export const runtime = "edge"`.** The auth routes (login, signup, logout, me) are already converted. If you add a new route that uses the DB, import from `@libsql/client/web` (not `@libsql/client`).

Root cause is still unknown — possibly a Vercel bundling issue specific to this project. Do not spend time debugging Node runtime; just use edge.

## libsql / Turso Notes
- Use `@libsql/client/web` — works on both Node and Edge, and avoids the "slug names" bug in older versions
- Initialize the DB client **lazily** via a Proxy (see `src/db/index.ts`) so a bad env var or parsing error doesn't crash the serverless container at module import time
- Drizzle's `drizzle-orm/libsql` adapter is compatible with both the `/web` and default clients

## Service Worker
Currently **disabled** (self-unregistering `public/sw.js`). The old SW was intercepting POST requests and caching stale HTML. Do not re-enable without a plan to bypass `/api/*` routes explicitly and version the cache aggressively.
