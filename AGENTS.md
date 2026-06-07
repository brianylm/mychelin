# Mychelin Agent Guide

This file is the durable project context for agents working in this repository. Keep it concise and update it when product direction, deployment rules, or recurring mistakes change.

## Product Direction

Mychelin helps people who have moved out of their family home learn to cook the food they grew up with consistently and confidently. The product should reduce the mental load of homecooking: know what to cook, know what to buy, cook with guidance, and improve the recipe over time.

Primary user: a moved-out homecook starting a new nest who wants the same quality, nutritious family meals they used to have at home.

Secondary user: an older family cook who wants to store recipes and share them with loved ones. Important, but secondary.

Core success state: the user no longer worries about homecooking because they know they can cook consistently and well. The ideal outcome is that they homecook much more than they would have without Mychelin.

Near-term feature priority:

1. Meal planning
2. Shopping list
3. Cook-with-me cooking session
4. Fridge/inventory

Ingredient management, recommendations, pantry suggestions, friction scoring, leftover trails, and flavor-profile ideas are useful backlog areas, but do not let them displace the core planning, shopping, guided-cooking, and recipe-improvement loop.

## Functional Model

Mychelin is not a generic recipe app and not a restaurant guide. It is a family homecooking workflow:

- Capture messy family recipe knowledge from notes, URLs, voice, conversation, or manual entry.
- Turn it into usable recipes with ingredients, steps, timing, servings, story, cultural context, photos, and voice.
- Help the user plan meals and generate shopping lists.
- Sit with the user during cooking through a cook-with-me experience: large next-step text, clear controls, timers, and simple forward/back navigation.
- During cook-with-me, offer a CTA for "I changed something" so substitutions, timing tweaks, quantity changes, technique notes, and sensory observations are captured in the moment.
- At the end of a cooking session, ask whether this attempt was better, closer to home, and what should change next time.
- Feed those session notes into recipe versions so the dish improves incrementally every time it is cooked.

Versioning/forking is a core retention loop. A recipe should not be treated as static; it should become more reliable as the user cooks it repeatedly.

## Source Of Truth

Read these first when product or operational context matters:

- `README.md` - public product overview and setup
- `ROADMAP.md` - clean current roadmap
- `MYCHELIN.md` - operator context, live site, DB/auth/env/runtime gotchas
- `DEPLOYMENT.md` - deploy and production smoke-test map
- `MEMORY.md` - consolidated project memory, active priorities, discrepancies, and session log
- `app/DESIGN-AUDIT.md` - UX/product audit and activation gaps

External memory notes may contain useful backlog context, but repo docs win when there is conflict. Treat older references to `mychelin-1/`, "restaurant guide app", or a root production app as stale unless re-verified.

When the user asks "what's next" or asks for next priorities without naming a task, read `AGENTS.md` and `MEMORY.md` first, then answer from the missing work, risks, and follow-ups recorded there.

## Project Memory Updates

Keep `MEMORY.md` as the single repo-local memory file. After meaningful product, code, schema, deployment, or roadmap work, append a dated entry to the session log with:

- what changed or was decided
- files touched
- checks run and results
- follow-ups or risks

Do not put a noisy changelog in this `AGENTS.md`; keep this file focused on instructions future agents must follow.

## Repository Layout

- Production app code lives in `app/`.
- The repository root is a Vercel deploy wrapper and project documentation area.
- Vercel production builds from `app/` because the Vercel Root Directory is configured as `app`.
- Archived/root prototype code lives under `archive/`; do not edit it for production work.
- Active schema and migrations are under `app/src/db/schema.ts` and `app/drizzle/`.
- Root-level `drizzle/`, root `package.json`, and stale migration notes may be historical. Verify before relying on them.

## Commands

Run app commands from `app/`:

```bash
cd /home/cluser/projects/mychelin/app
npm run lint
npm run build
npm run dev
```

This workspace usually runs on a VPS, not the user's local machine. A local dev URL such as `http://localhost:3000` is useful for agent-side smoke tests but is not directly visible to the user. When the user needs to test UI changes, provide a public Vercel Preview deployment or another externally reachable URL.

For user-facing changes, deploy a production-parallel Vercel Preview from the repository root after checks pass, then include the preview URL in the final response so the user can test it. Use this for acceptance testing without replacing the live production alias. If deployment is skipped or blocked, say why in the final response.

Deploy from the repository root only:

```bash
cd /home/cluser/projects/mychelin
vercel --prod
```

Do not deploy from `app/`; that can target the wrong Vercel project/site.

Use `git diff --check` for documentation-only changes. There are currently no first-party automated tests; use lint/build plus focused API/UI smoke tests for code changes.

## Deployment Facts

- Live site: `https://mychelin-sg.vercel.app`
- Correct Vercel project: `mychelin`
- Correct Vercel project ID: `prj_keoeCPZKShPgjPWLR5gpWxWIlfCt`
- Vercel team/org: `team_GhgWJD2sBWKzkZ5m06FWTUQv`
- Vercel Root Directory: `app`
- Preferred Vercel/Turso region: `hnd1` / Tokyo-adjacent
- User test deployments should be Vercel Preview deployments from the repo root, not production promotions. They are persistent deployment snapshots, but they do not follow later production deploys unless redeployed.

Before production deployment, check `git status --short`, build from `app/`, deploy from root, then smoke-test auth and recipe create/fetch/delete paths as described in `DEPLOYMENT.md`.

## Runtime And API Rules

The Node.js serverless runtime is known to hang on POST requests for this Vercel project. New API routes should use:

```ts
export const runtime = "edge";
export const preferredRegion = "hnd1";
```

For DB access in routes, import from `@/db`. That uses `@libsql/client/web` and lazy initialization for Edge compatibility. Do not switch new Edge route DB code to `@libsql/client` or `app/src/db/http.ts` without a specific reason.

Auth uses a JWT cookie named `mychelin_token`, `jose`, bcrypt password hashing, and a 30-day expiry. Auth helpers live in `app/src/lib/auth.ts`.

Recipe access is server-side and should flow through `app/src/lib/recipe-access.ts` where possible. A user can access a recipe if they own it or it belongs to a book they are a member of.

Be especially careful around multi-user isolation. Known areas needing scrutiny include sharing permissions and non-recipe APIs such as meal plans, shopping list, inventory, and ingredient catalog.

## Data And Migrations

Schema source: `app/src/db/schema.ts`.

Active migrations: `app/drizzle/`.

Drizzle config: `app/drizzle.config.ts`.

Migrations are not guaranteed to auto-run on deploy. Some route-level schema fixups exist, but do not assume that is the preferred long-term pattern. For schema changes, include a Drizzle migration and explain data impact.

Never ask the user to inspect Turso manually. If DB inspection, cleanup, seeding, or migration verification is needed, handle it with scripts, API routes, or CLI commands and report UI-level outcomes.

## UI And Product Conventions

The app is a mobile-first PWA. Preserve mobile ergonomics, kitchen use, large touch targets, and one-handed flows.

Main authenticated surface: `app/src/components/RecipeWorkspace.tsx`.

Important supporting areas:

- Recipes: `app/src/components/recipes/`
- Recipe store: `app/src/store/RecipeStore.tsx`
- Capture/import: `app/src/components/capture/` and `app/src/app/api/capture/`
- Books/sharing: `app/src/components/books/`, `app/src/components/sharing/`, `app/src/app/api/books/`, `app/src/app/api/share/`
- Planning/shopping/fridge: `app/src/components/planner/`, `app/src/components/shopping/`, `app/src/components/fridge/`

Use the existing visual language: warm editorial canvas, burgundy accent, restrained utility UI, serif branding for major titles, Tailwind/Radix/lucide patterns already present. Avoid turning internal app screens into marketing pages.

For cook-with-me work, prioritize legibility while cooking: large step text, obvious next/back controls, timers, minimal clutter, and reliable state saving.

## Privacy And Safety

Mychelin may handle private family recipes, stories, photos, voice recordings, transcripts, account data, and sharing permissions.

- Do not commit secrets, `.env`, database dumps, real family data, voice files, or private screenshots.
- Use synthetic test data.
- Treat AI extraction/transcription inputs as sensitive.
- Treat auth, sharing, invitations, uploaded assets, and public share pages as high-risk surfaces.

## Known Stale Context

Do not carry these forward as current truth without verification:

- `mychelin-1/` as the active production app path
- root `src/` as production source
- "restaurant guide app" as the product description
- migration scripts or docs that still point to `mychelin-1/`
- any claim that deployment should happen from inside `app/`

## Working Expectations

- Prefer small, focused changes.
- Match existing architecture and helpers before adding abstractions.
- Keep unrelated refactors out of feature work.
- Run relevant checks before handing back code.
- If changing behavior around auth, sharing, privacy, DB schema, or uploads, call out risks and verification clearly.
- If user-facing UI changes are made, verify responsive behavior where feasible.
