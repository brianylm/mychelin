# Mychelin Agent Guide

Durable repo-local context for Codex/OpenClaw workers. Keep this short, current, and practical; put detailed session history in `MEMORY.md` instead.

## Project Purpose

Mychelin is a Singapore-first, mobile-first PWA for preserving and cooking family food: oral recipes, dialect instructions, kitchen stories, voices, structured recipes, meal plans, shopping lists, and cook-with-me guidance.

Current product direction: help moved-out homecooks reliably cook the food they grew up with. The app should reduce homecooking mental load: know what to cook, know what to buy, cook with guidance, and improve the recipe over repeated attempts.

Primary user: moved-out homecook starting a new nest. Secondary user: older family cook storing/sharing recipes. Do not drift back to the stale “restaurant guide app” framing.

Core loop:

1. Capture/create a family recipe from conversation, voice, URL, paste, notes, or manual entry.
2. Plan when to cook it.
3. Generate what to buy.
4. Cook with large, kitchen-friendly guided steps/timers.
5. Capture substitutions, timing tweaks, sensory cues, mistakes, and whether the result was closer to home.
6. Promote useful notes into recipe versions so the dish gets more reliable over time.

Near-term feature spine: meal planning → shopping list → cook-with-me → fridge/inventory.

## Current Priorities

From the global kanban and recent repo context:

- Mobile landing hero/scrim readability.
- Onboarding goal flow and first-run habit loop.
- Whisper/OpenAI transcription fallback reliability in conversation capture.
- Feature screenshots/demo assets later; do not let screenshot work displace core product fixes.

For broader prioritization, read `/home/cluser/.openclaw/workspace/memory/task-kanban.md` plus this repo’s `MEMORY.md`.

## Canonical Context

Read these before product, deployment, or schema work:

- `README.md` — public overview and setup.
- `ROADMAP.md` — current product roadmap.
- `MYCHELIN.md` — operator context, live site, DB/auth/runtime gotchas.
- `DEPLOYMENT.md` — deploy and production smoke-test map.
- `MEMORY.md` — repo-local decisions, risks, and session log.
- `app/DESIGN-AUDIT.md` — UX/product audit and activation gaps.

External memory files can help, but repo docs win when they conflict. Known stale external framing includes `mychelin-1/`, root `src/`, “restaurant guide app”, and old migration notes.

## Repository Layout

- `app/` — production Next.js app; Vercel Root Directory is configured to this folder.
- `app/src/app/` — Next App Router pages and API routes.
- `app/src/components/LandingPage.tsx` and `app/src/app/globals.css` — public landing page and mobile hero/scrim styling.
- `app/src/components/auth/`, `app/src/app/login/`, `app/src/app/reset-password/`, `app/src/app/api/auth/` — auth surfaces.
- `app/src/components/onboarding/OnboardingFlow.tsx`, `app/src/app/api/user/`, `app/src/components/profile/` — onboarding goals, rhythm, and profile habit loop.
- `app/src/components/RecipeWorkspace.tsx` — main authenticated app shell.
- `app/src/components/recipes/`, `app/src/store/RecipeStore.tsx` — recipe UI/state, including cook-with-me and attempts.
- `app/src/components/capture/`, `app/src/app/api/capture/` — AI capture, conversation assist, realtime/chunked transcription, Whisper/OpenAI/Gemini fallback paths.
- `app/src/components/heritage/VoiceRecording.tsx`, `app/src/app/api/recipes/*/voice/` — voice recording features.
- `app/src/components/planner/`, `app/src/components/shopping/`, `app/src/components/fridge/` and matching `app/src/app/api/*` routes — planning, shopping list, inventory.
- `app/src/components/books/`, `app/src/components/sharing/`, `app/src/app/api/books/`, `app/src/app/api/share/`, `app/src/app/shared/` — family recipe books and sharing.
- `app/src/db/schema.ts` — schema source of truth.
- `app/drizzle/` — active migrations.
- `archive/` and root-level old app/migration paths — historical unless freshly verified.

## Common Commands

Install and app checks run from `app/`:

```bash
cd /home/cluser/projects/mychelin/app
npm install
npm run dev
npm run lint
npm run build
npm run db:generate
npm run db:migrate
npm run db:push
npm run smoke:privacy
npm run smoke:pilot
```

Documentation-only validation can be lightweight:

```bash
cd /home/cluser/projects/mychelin
git diff --check
```

Deploy from the repository root only, never from `app/`:

```bash
cd /home/cluser/projects/mychelin
vercel --prod
```

For user-facing fixes, prefer a Vercel Preview deployment from the repo root after lint/build so B can test without replacing production. If deployment is skipped or blocked, say why.

## Runtime, Auth, AI, and DB Rules

- Live site: `https://mychelin-sg.vercel.app`.
- Correct Vercel project: `mychelin` (`prj_keoeCPZKShPgjPWLR5gpWxWIlfCt`), team `team_GhgWJD2sBWKzkZ5m06FWTUQv`, root directory `app`.
- New API routes should usually use Edge runtime:

```ts
export const runtime = "edge";
export const preferredRegion = "hnd1";
```

- Node.js serverless POST routes are known to hang on this Vercel project. Do not spend time re-debugging that unless explicitly assigned.
- DB access in routes should import from `@/db`, which uses `@libsql/client/web` and lazy initialization for Edge compatibility.
- Auth uses JWT cookie `mychelin_token`, `jose`, bcrypt password hashing, and 30-day expiry. Auth helpers live in `app/src/lib/auth.ts`.
- Recipe access should flow through `app/src/lib/recipe-access.ts` when possible. Multi-user isolation is high risk.
- AI capture currently uses OpenAI/Whisper or Realtime speech-to-text paths, browser live captions where available, Gemini as optional audio fallback, and DeepSeek for lower-cost text reasoning/extraction where configured. Treat transcripts, recordings, and prompts as sensitive.
- Migrations are not guaranteed to auto-run on deploy. For schema changes, add a Drizzle migration under `app/drizzle/`, explain data impact, and verify with app-level checks/scripts. Do not rely on stale Turso migration docs that point to `mychelin-1/`.

## Safety and Privacy

Mychelin may handle private family recipes, stories, photos, voice recordings, transcripts, account data, and sharing permissions.

- Do not commit secrets, `.env*`, DB dumps, real family data, voice files, or private screenshots.
- Use synthetic data for tests, screenshots, and demos.
- Treat auth, sharing, invitations, uploaded assets, public share pages, voice/transcript storage, and non-recipe user-scoped APIs as high-risk surfaces.
- Never ask B to inspect Turso manually. If DB inspection, cleanup, seeding, or migration verification is needed, handle it with scripts/API/CLI and report UI-level outcomes.

## Working Expectations

- Edit only files needed for the task. Do not touch unrelated changes already in the worktree.
- Prefer small, boring changes that match existing helpers and UI patterns.
- No speculative abstractions, dependency additions, broad rewrites, or “while I’m here” refactors.
- Preserve mobile ergonomics: large touch targets, one-handed use, kitchen legibility, senior-friendly flows.
- Use existing visual language: warm editorial canvas, burgundy accent, restrained utility UI, serif branding for major titles, Tailwind/Radix/lucide patterns.
- Run the smallest meaningful validation before handoff: `git diff --check` for docs, lint/build/smoke checks for code, plus focused API/UI checks for behavior changes.
- If you change user-facing code, restart/redeploy or provide a preview URL where applicable.
- If touching auth, sharing, privacy, DB schema, uploads, or AI transcript/voice handling, call out risks and verification clearly.

## Known Traps

- Active production app is `app/`; root is the deploy wrapper. Do not deploy from `app/`.
- Root `drizzle/`, root `package.json`, archived/root prototype code, and `app/DATABASE_MIGRATION_NOTE.md` may be historical. Verify before using.
- Old paths mentioning `/home/cluser/projects/mychelin/mychelin-1` are stale.
- There are few/no first-party automated tests; do not claim full coverage from lint/build alone.
- Service worker changes can stale-cache UI; bump cache version in `app/public/sw.js` when needed.

## Memory Updates

After meaningful product, code, schema, deployment, or roadmap work, append a concise dated entry to `MEMORY.md` with what changed, files touched, checks run, and follow-ups/risks. Keep this `AGENTS.md` focused on durable instructions only.
