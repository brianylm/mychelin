# Mychelin Memory

This is the repo-local project memory for Mychelin. Keep it current, concise, and aligned with `AGENTS.md`, `README.md`, `ROADMAP.md`, `MYCHELIN.md`, and `DEPLOYMENT.md`.

## Current Product Thesis

Mychelin helps people who have moved out of their family home learn to cook the food they grew up with consistently and confidently.

The app should reduce the mental load of homecooking: know what to cook, know what to buy, cook with guidance, and improve the recipe over time. The ideal long-term outcome is that the user homecooks much more than they would have without Mychelin because they trust they can cook consistently and well.

Primary user: a moved-out homecook starting a new nest who wants the same quality, nutritious family meals they used to have at home.

Secondary user: an older family cook who wants to store recipes and share them with loved ones. This matters, but should not override the moved-out learner workflow.

## Functional Spine

Priority order:

1. Meal planning
2. Shopping list
3. Cook-with-me cooking session
4. Fridge/inventory

The core loop is:

1. Capture or create the family recipe.
2. Plan when to cook it.
3. Generate what to buy.
4. Cook with guided steps, timers, and large readable controls.
5. Capture what changed during the session.
6. Review whether the attempt was better or closer to home.
7. Promote useful notes into recipe versions so the dish becomes more reliable over time.

Versioning/forking is a core retention mechanism. A recipe should improve incrementally through repeated cooking, not remain static after first capture.

## Cook-With-Me Direction

Cook-with-me should feel like the app is sitting with the user while they cook. Prioritize:

- large next-step text
- obvious next/back controls
- timers tied to steps
- minimal clutter
- reliable state saving
- a clear "I changed something" CTA during the session
- an end-of-session review for what worked, what changed, and whether the result was closer to home

Changes to capture during cooking include substitutions, timing changes, quantity tweaks, technique notes, sensory cues, and mistakes to avoid next time.

## Deployment And Repo Facts

Production is intentionally a two-level repo:

- Repo/deploy wrapper: `/home/cluser/projects/mychelin`
- Production app code: `/home/cluser/projects/mychelin/app`
- Live site: `https://mychelin-sg.vercel.app`
- Correct Vercel project: `mychelin`
- Correct Vercel project ID: `prj_keoeCPZKShPgjPWLR5gpWxWIlfCt`
- Vercel Root Directory: `app`

Deploy production from the repo root only:

```bash
cd /home/cluser/projects/mychelin
vercel --prod
```

Do not deploy from `app/`; that can target the wrong Vercel project/site.

Run app checks from `app/`:

```bash
cd /home/cluser/projects/mychelin/app
npm run lint
npm run build
```

## Runtime And Architecture Notes

- New API routes should use Edge runtime: `export const runtime = "edge"` and `export const preferredRegion = "hnd1"`.
- Node.js serverless POST routes are known to hang on this Vercel project.
- DB access in routes should use `@/db`, which wraps `@libsql/client/web` and lazy initialization.
- Auth uses the `mychelin_token` JWT cookie, `jose`, bcrypt, and a 30-day expiry.
- Recipe access should flow through `app/src/lib/recipe-access.ts` where possible.
- Active schema is `app/src/db/schema.ts`.
- Active migrations are under `app/drizzle/`.
- Root `drizzle/`, root app files, and archived code are historical unless re-verified.

## Memory Reconciliation Notes

These sources were reviewed on 2026-06-03:

- `/home/cluser/projects/mychelin/MEMORY.md`
- `/home/cluser/.openclaw/workspace/memory/projects/mychelin.md`
- `/home/cluser/.openclaw/workspace/memory/projects/mychelin-kanban.md`
- `/home/cluser/second-brain-vault/20-notes/projects/mychelin/current-state.md`

Reconciled decisions:

- Repo-local `MEMORY.md` is now the canonical memory file for agents working in this repo.
- `AGENTS.md` is the durable instruction file and should stay concise.
- External memory files can be useful context but may lag behind repo truth.
- Product description should be family homecooking support for moved-out users, not "restaurant guide app".
- Feature priority is meal planning, shopping list, cook-with-me, then fridge/inventory.
- Wild-card recommendation ideas remain backlog/supporting ideas, not current product spine.

Known stale or conflicting external notes:

- OpenClaw project memory says "Restaurant guide app with family recipe sharing". Treat this as stale.
- OpenClaw kanban lists Kitchen Immune System and Last-Mile Grocery Optimizer as Now/Next. Treat those as backlog unless the user reprioritizes them.
- Some notes mention `mychelin-1/` or stale migration paths. Current production app path is `app/`.
- Some old migration docs/scripts may still point to `mychelin-1/`; verify before using.
- "Turso migration pending" requires fresh verification before being treated as active.
- Landing-page tightening notes are useful historical UX context, but current landing/product direction may supersede them.

## Current Risk Register

- Deployment confusion is the recurring operational failure mode: root deploy wrapper vs `app/` source directory.
- Multi-user isolation needs scrutiny beyond recipes. Known areas to review include meal plans, shopping list, inventory, ingredient catalog, and sharing permissions.
- There are currently no first-party automated tests; use lint/build plus targeted API/UI smoke tests.
- Migrations are not guaranteed to auto-run on deploy.
- Avoid asking the user to inspect Turso manually; agents should handle DB inspection/cleanup/migration verification when credentials are available.

## Session Log

### 2026-06-03 - Consolidated agent guidance and memory

Changed/decided:

- Created root `AGENTS.md` as the automatic Codex project instruction file.
- Confirmed Codex automatically loads `AGENTS.md` at session/run start from the repo root down to the current directory.
- Reframed Mychelin around moved-out homecooks learning to cook family meals consistently and well.
- Set near-term priority order: meal planning, shopping list, cook-with-me, fridge/inventory.
- Clarified cook-with-me and versioning as the core retention loop.
- Reconciled external OpenClaw and Second Brain notes into this repo-local `MEMORY.md`.
- Added a GitHub PR template with a project-memory checkbox to nudge future updates.

Files touched:

- `AGENTS.md`
- `MEMORY.md`
- `.github/pull_request_template.md`

Checks:

- `git diff --check` passed after the `AGENTS.md`, `MEMORY.md`, and PR template updates.

Follow-ups:

- Consider updating or archiving stale external memory files if they continue to mislead future agents.
- Freshly verify any claimed pending Turso migration before acting on it.

### 2026-06-03 - User-scoped planning and cook-with-me MVP

Changed/decided:

- Added `user_id` ownership to `meal_plans` and `inventory` in the Drizzle schema.
- Added migration `app/drizzle/0017_user_scoped_planning.sql` to add and backfill those ownership columns.
- Added lazy schema guard `ensurePlanningOwnershipColumns()` so routes do not break before the migration is manually applied.
- Updated meal plan, inventory, and shopping-list APIs to require auth and scope reads/writes to the current user.
- Added `CookWithMeSession`, a full-screen guided cooking MVP with large step text, next/back controls, per-step timers, an "I changed something" note path, and end-of-session closeness review.
- Added a recipe-detail entry point: primary "Cook with me" and secondary "Log version" for the older adjustment modal.

Files touched:

- `app/src/db/schema.ts`
- `app/src/db/ensure-schema.ts`
- `app/drizzle/0017_user_scoped_planning.sql`
- `app/src/app/api/meal-plans/route.ts`
- `app/src/app/api/meal-plans/[id]/route.ts`
- `app/src/app/api/inventory/route.ts`
- `app/src/app/api/inventory/[id]/route.ts`
- `app/src/app/api/shopping-list/route.ts`
- `app/src/components/recipes/RecipeView.tsx`
- `app/src/components/recipes/CookWithMeSession.tsx`
- `MEMORY.md`

Checks:

- `npx tsc --noEmit` passed from `app/`.
- `git diff --check` passed.
- Targeted ESLint on touched app files passed with 0 errors and existing `<img>` warnings in `RecipeView`.
- Full `npm run lint` remains blocked by pre-existing repository lint errors outside this change.
- `npm run build` passed from `app/`.

Follow-ups:

- Smoke-test the authenticated planning/shopping/inventory APIs with real cookies once a dev or production session is available.
- Consider adding persistent cooking-session records later; the current MVP saves session notes through recipe versions.
- Decide whether completed planned meals should launch cook-with-me directly and then be marked cooked.

### 2026-06-03 - VPS testing and preview deployment convention

Changed/decided:

- Added to `AGENTS.md` that this workspace usually runs on a VPS, so `localhost` URLs are agent-only and not directly visible to the user.
- Created a public Vercel Preview deployment for user testing without replacing production.
- Confirmed the preview URL responds with `HTTP 200`.

Files touched:

- `AGENTS.md`
- `MEMORY.md`

Checks:

- `npx vercel --yes` from the repo root completed successfully.
- `curl -I https://mychelin-ls39hc832-brianylms-projects.vercel.app` returned `HTTP/2 200`.

Follow-ups:

- For future UI work, prefer Vercel Preview URLs over VPS-local dev URLs when the user needs to inspect changes.
- Consider creating a stable staging alias or separate staging Vercel project plus staging Turso database if previews become part of the normal acceptance flow.


### 2026-06-03 - Production-parallel preview handoff rule

Changed/decided:

- Updated `AGENTS.md` so future user-facing changes should get a production-parallel Vercel Preview deployment from the repo root after checks pass.
- Clarified that final handoffs should include the preview URL for user testing, or explain why deployment was skipped or blocked.
- Clarified that preview deployments are persistent snapshots for acceptance testing, not production promotions and not auto-following the live production alias.

Files touched:

- `AGENTS.md`
- `MEMORY.md`

Checks:

- `git diff --check` passed for this documentation-only update.

Follow-ups:

- Consider adding a stable staging alias or separate staging project/database if production-parallel previews become a regular release gate.

### 2026-06-03 - Auth login recovery hardening

Changed/decided:

- Verified production auth with a throwaway account: signup, cookie-backed `/api/auth/me`, logout, password login, and post-login `/api/auth/me` all returned success.
- Cleaned up the throwaway production auth user afterward.
- Hardened login/signup email handling by trimming email on the client and trimming/lowercasing on the server before lookup or insert.
- Updated password-reset navigation so invalid/successful reset flows return users to `/login` instead of the unauthenticated landing page.
- Added a visible landing-page `Log in` link for existing users.
- Created Vercel Preview `https://mychelin-bz1i7wjz5-brianylms-projects.vercel.app`; page responds, but auth APIs return 500 because Vercel `JWT_SECRET` is configured for Production only, not Preview. Attempts to add an all-preview secret through non-interactive Vercel CLI were blocked by a `git_branch_required` response, and branch-scoping to `main` is refused because `main` is the production branch.

Files touched:

- `app/src/context/AuthContext.tsx`
- `app/src/app/api/auth/login/route.ts`
- `app/src/app/api/auth/signup/route.ts`
- `app/src/app/reset-password/page.tsx`
- `app/src/components/LandingPage.tsx`
- `MEMORY.md`

Checks:

- `git diff --check` passed.
- `npx tsc --noEmit` passed from `app/`.
- Targeted ESLint on touched auth/UI files passed with 0 errors and existing `<img>` warnings.
- `npm run build` passed from `app/`.
- Production auth smoke test passed and throwaway user cleanup returned `remaining=0`.
- Preview `/login` returned HTTP 200, but preview auth smoke test failed as expected until `JWT_SECRET` is added to Preview.

Follow-ups:

- Add `JWT_SECRET` to Vercel Preview environment so production-parallel preview auth smoke tests can run.
- If the user remains locked out on production, inspect the specific account email/rate-limit state with consent; production auth infrastructure itself is currently healthy.

### 2026-06-03 - Reset email flow brand copy alignment

Changed/decided:

- Updated the password-reset email template from the old tan/orange treatment to the current warm canvas, dark primary button, and burgundy link accent.
- Replaced the stale email footer phrase `Preserving family recipes` with `Cook like home, even in your new home.`
- Restyled the reset-password page to match the current auth screen: warm background, Mychelin icon, logo wordmark, rounded translucent panel, burgundy focus states, and dark primary buttons.
- Replaced stale visible product positioning in app metadata, landing footer, shared-page footer, and recipe empty-state copy.
- Fixed touched shared-page homepage anchors to use `next/link` so targeted lint has no errors.
- Created Vercel Preview `https://mychelin-1wdy1x07w-brianylms-projects.vercel.app`; `/reset-password?token=preview-style-check` and `/login` both returned HTTP 200.

Files touched:

- `app/src/lib/email.ts`
- `app/src/app/reset-password/page.tsx`
- `app/src/app/layout.tsx`
- `app/src/components/LandingPage.tsx`
- `app/src/app/shared/[token]/page.tsx`
- `app/src/components/recipes/RecipeView.tsx`
- `MEMORY.md`

Checks:

- `git diff --check` passed.
- `npx tsc --noEmit` passed from `app/`.
- Targeted ESLint on touched files passed with 0 errors and existing `<img>`/unused warnings.
- `npm run build` passed from `app/`.
- Preview route smoke checks returned HTTP 200 for reset and login pages.

Follow-ups:

- Preview auth APIs still require `JWT_SECRET` in the Vercel Preview environment before full reset-email request/submit smoke tests can run on preview.

### 2026-06-03 - Tomorrow reset-flow investigation note

Changed/decided:

- The user asked to continue tomorrow on the production password reset/login issue.
- Clarified that missing `JWT_SECRET` explains Preview auth failures only; it is not confirmed as the cause of the user being unable to reset or log into Production.
- Next investigation should focus on the live production reset flow: email delivery, reset token validity/expiry/used state, rate limits, whether the reset POST updates the intended user row, and login behavior immediately after reset.

Files touched:

- `MEMORY.md`
- `AGENTS.md`

Checks:

- Pending: documentation whitespace check after this note.

Follow-ups:

- Tomorrow, inspect the specific account/reset path with user consent and synthetic-safe handling. Do not ask the user to inspect Turso manually.
- If the user asks "what's next", consult `AGENTS.md` and `MEMORY.md` before answering.

### 2026-06-04 - Production reset/login investigation

Changed/decided:

- Inspected production auth/reset DB state with masked account output only.
- Confirmed production auth tables exist and recent June 3 reset tokens for user id `1` were created and marked used.
- Confirmed auth rate-limit rows related to the June 3 attempts were expired by June 4, so current lockout is unlikely to be the DB rate limiter.
- Confirmed live production deployment is still the June 1 deployment, so the June 3 local login/signup email-trimming and reset-navigation hardening is not live yet.
- Ran a synthetic production reset/login smoke test by creating a throwaway user, inserting a known reset token hash, calling live reset validation, calling live reset POST, logging in, checking `/api/auth/me`, and deleting the throwaway user. The full path passed and cleanup returned `remaining=0`.
- Diagnosis: production reset infrastructure works. For the real account, the June 3 reset token was consumed successfully; remaining login failure is most likely account/email mismatch, password mismatch after reset, stale production login input normalization, or browser/session input state rather than a broken reset endpoint.

Files touched:

- `MEMORY.md`

Checks:

- Live `GET /api/auth/reset-password?token=invalid` returned `200` with `valid:false`.
- Live synthetic forgot-password POST for a non-existent email returned generic `200`.
- Live synthetic invalid login returned `401`.
- Live synthetic reset/login smoke test passed: reset validation `200`, reset POST `200`, login `200`, auth cookie present, `/api/auth/me` `200`.

Follow-ups:

- For the real account, confirm the exact email being used in reset and login; there are multiple production accounts with similar masked prefixes.
- Deploy or preview the pending June 3 auth hardening after checks, especially server/client email trimming for login/signup and reset-page navigation back to `/login`.

### 2026-06-04 - Planned meal cook-with-me completion loop

Changed/decided:

- Added `cooked_at` to meal plans so a planned meal can be marked cooked after a cooking session.
- Added migration `app/drizzle/0018_meal_plan_cooked_at.sql` and lazy guard `ensureMealPlanCookedAtColumn()` for deployments before manual migration application.
- Updated meal-plan GET/POST/PATCH/DELETE paths to ensure the `cooked_at` column exists, and PATCH now accepts `cookedAt` for authenticated user-owned plans.
- Added planner cook buttons for uncooked planned meals and a cooked state indicator for completed planned meals.
- Wired planner cook actions through `RecipeWorkspace` to fetch the full recipe, open `CookWithMeSession`, save the session version, then PATCH the meal plan as cooked.
- Updated `CookWithMeSession` so completion callbacks can be awaited before closing.

Files touched:

- `app/src/db/schema.ts`
- `app/src/db/ensure-schema.ts`
- `app/drizzle/0018_meal_plan_cooked_at.sql`
- `app/src/app/api/meal-plans/route.ts`
- `app/src/app/api/meal-plans/[id]/route.ts`
- `app/src/components/planner/MealPlanView.tsx`
- `app/src/components/RecipeWorkspace.tsx`
- `app/src/components/recipes/CookWithMeSession.tsx`
- `MEMORY.md`

Checks:

- `npx tsc --noEmit` passed from `app/`.
- `npm run build` passed from `app/`.
- `git diff --check` passed.
- Targeted ESLint passed with 0 errors; it still reports pre-existing unused planner helpers in `MealPlanView.tsx`.

Follow-ups:

- Preview auth remains unavailable until Vercel Preview has `JWT_SECRET`; production auth is healthy.
- Apply or rely on lazy application of migrations `0017_user_scoped_planning.sql` and `0018_meal_plan_cooked_at.sql` before/at deploy.

### 2026-06-04 - Recipe-list cook-with-me entry points

Changed/decided:

- Added direct `Cook with me` entry points outside meal planning so users can cook from the recipe collection without creating a meal plan first.
- `RecipeWorkspace` now has a generic cook-session launcher used by recipe list/card actions and by planned meals. Planned meals still mark `cooked_at` after save; regular recipe-list sessions only save the cooking session/version.
- Added a compact chef-hat cook action to non-draft recipes in the sidebar list.
- Added full-width `Cook with me` actions to recipe cards in the main recipe grid and book recipe grid.
- Kept the existing recipe-detail `Cook with me` button intact.

Files touched:

- `app/src/components/RecipeWorkspace.tsx`
- `app/src/components/recipes/RecipeView.tsx`
- `app/src/components/layout/RecipeSidebar.tsx`
- `app/src/components/layout/sidebar/RecipeListItem.tsx`
- `MEMORY.md`

Checks:

- `npx tsc --noEmit` passed from `app/`.
- `npm run build` passed from `app/`.
- `git diff --check` passed.
- Targeted ESLint passed with 0 errors and existing `<img>` warnings.

Follow-ups:

- When preview auth is available, smoke-test sidebar, recipe-grid, book-grid, recipe-detail, and planned-meal cook session entry points in a browser.

### 2026-06-04 - App-wide dark action button contrast

Changed/decided:

- Added global CSS safeguards so Radix solid buttons and custom dark Mychelin action buttons using `bg-[#17131f]`, `bg-[#800020]`, `bg-[#800020]/50`, or `hover:bg-[#800020]` render with light contrast text/icons.
- This targets the recurring unreadable dark burgundy/black text issue at the app theme layer instead of patching individual buttons one at a time.

Files touched:

- `app/src/app/globals.css`
- `MEMORY.md`

Checks:

- `npx tsc --noEmit` passed from `app/`.
- `npm run build` passed from `app/`.
- `git diff --check` passed.
- Targeted ESLint passed with 0 errors and existing warnings only.

Follow-ups:

- Production deployed at `https://mychelin-pkcltdmal-brianylms-projects.vercel.app` and aliased to `https://mychelin-sg.vercel.app`.
- Live smoke checks passed: home `200`, login `200`, reset invalid-token endpoint `200`, synthetic signup/me/recipe create/recipe fetch/meal-plan create/meal-plan cookedAt patch/recipe delete all succeeded, cleanup returned `remaining=0`.
- Deployed CSS contains the app-wide contrast rule. Headless browser computed-style check was skipped because Playwright is not installed in the app package.


### 2026-06-04 - Meal planner day planning and recipe recency search

Changed/decided:

- Month-view date clicks now open an in-place day planner instead of switching the whole planner to week view.
- The add-meal dialog now fetches planner-enriched recipes and supports search across recipe title, description, cuisine/category, and ingredient names.
- Planner recipe results show cuisine/category, ingredient chips, and a last-cooked label, sorted with never/least-recently cooked recipes first to help avoid repeat meals.
- Recipe planner metadata now includes `ingredients` and `lastCookedAt` from `/api/recipes?planner=1`.
- `lastCookedAt` is derived from the latest recipe-version cooking session date and the latest planned-meal `cooked_at` timestamp for the current user.

Files touched:

- `app/src/app/api/recipes/route.ts`
- `app/src/components/planner/MealPlanView.tsx`
- `MEMORY.md`

Checks:

- `npx tsc --noEmit` passed from `app/`.
- `npx eslint src/components/planner/MealPlanView.tsx src/app/api/recipes/route.ts` passed from `app/`.
- `npm run build` passed from `app/`.
- `git diff --check` passed.

Follow-ups:

- Production deployed at `https://mychelin-58ju2ecz8-brianylms-projects.vercel.app` and aliased to `https://mychelin-sg.vercel.app`.
- Live smoke checks passed: home `200`, login `200`, synthetic signup/me/recipe create/meal-plan create/meal-plan cookedAt patch/planner metadata fetch all succeeded, planner metadata included ingredient names and `lastCookedAt`, and cleanup returned `remaining=0`.

### 2026-06-04 - Mychelin UI system audit against Agrippa doctrine

Changed/decided:

- Confirmed the UI-system scope is Mychelin specifically, using `~/.openclaw/workspace/AGRIPPA_UI.md` as the audit rubric.
- Added a Mychelin-specific UI system audit and implementation plan at `app/UI-SYSTEM-AUDIT.md`.
- The plan treats Mychelin as a warm family-cooking product skin over shared Agrippa primitives, not a direct copy of SGDS or any government visual identity.
- Prioritized implementation phases: tokens/primitives, planner search pilot, recipe list/search reuse, capture/import including conversation capture, recipe detail/cook-with-me, then shopping/fridge/books/share.
- Explicitly included `ConversationCapture` in Phase 4 with requirements to preserve live transcript, speaker naming, extraction, draft fallback, and recovery from permission/transcription/extraction failures.

Files touched:

- `app/UI-SYSTEM-AUDIT.md`
- `MEMORY.md`

Checks:

- `git diff --check` passed for the documentation update.

### 2026-06-04 - UI system phase 1/2A primitives and planner picker pilot

Changed/decided:

- Started implementing the Mychelin UI system in reversible phases so the user can test each phase on production.
- Added semantic UI primitive tokens to `app/src/app/globals.css` for surface, text, border, action, focus, success/warning/danger/info roles.
- Added first thin UI primitives under `app/src/components/ui/`: `Button`, `Field`, `Alert`, `Panel`, `EmptyState`, `FilterBar`, and `RecipeResultRow`.
- Applied the first visible pilot to the meal planner add-meal picker: shared `FilterBar`, shared `RecipeResultRow`, shared empty states, primitive footer buttons, result count, cuisine filter counts, and visible match evidence for title/cuisine/ingredient/notes searches.

Files touched:

- `app/src/app/globals.css`
- `app/src/components/ui/Button.tsx`
- `app/src/components/ui/Field.tsx`
- `app/src/components/ui/Alert.tsx`
- `app/src/components/ui/Panel.tsx`
- `app/src/components/ui/EmptyState.tsx`
- `app/src/components/ui/FilterBar.tsx`
- `app/src/components/ui/RecipeResultRow.tsx`
- `app/src/components/ui/index.ts`
- `app/src/components/planner/MealPlanView.tsx`
- `MEMORY.md`

Checks:

- `npx tsc --noEmit` passed from `app/`.
- `npx eslint src/components/planner/MealPlanView.tsx src/components/ui/Button.tsx src/components/ui/Field.tsx src/components/ui/Alert.tsx src/components/ui/Panel.tsx src/components/ui/EmptyState.tsx src/components/ui/FilterBar.tsx src/components/ui/RecipeResultRow.tsx` passed from `app/`.
- `npm run build` passed from `app/`.
- `git diff --check` passed.

Deployment/smoke:

- Production deployed at `https://mychelin-by44p5onm-brianylms-projects.vercel.app` and aliased to `https://mychelin-sg.vercel.app`.
- Live smoke checks passed: home `200`, login `200`, synthetic signup/recipe create/meal-plan create/planner metadata fetch succeeded, planner metadata included ingredient names, and cleanup returned `remaining=0`.

Follow-ups:

- User should test the live planner picker on `https://mychelin-sg.vercel.app`: month date modal, Add meal, search by ingredient/cuisine/title/notes, filter chips, selecting a result, and adding the meal.
- If accepted, next phase should reuse `FilterBar` and `RecipeResultRow` in recipe sidebar/search surfaces.

### 2026-06-04 - Cook-with-me attempts and photo workflow notes

Changed/decided:

- User reviewed the cook-with-me flow and wants the end of a session to ask `How would you rate this dish?` with half-star ratings.
- User does not want every cook session to automatically create a recipe version. Preferred model: cook sessions become `attempts`; attempts can later be promoted to version 2 or another definitive recipe version.
- Recipe versions should support an active/definitive version concept so the user can choose the active version of a recipe.
- Cook-with-me steps need smarter step crawling/splitting so multiple logical actions are not clogged into one step, especially where timers are involved.
- Recipe photos need a clearer flow: add multiple photos, then mark one photo as the cover photo.

Follow-ups:

- Design and implement attempts/rating/version promotion in a future push after the current UI-system phase.
- Include step-splitting logic in the cook-with-me redesign so timers attach to the right atomic step.
- Improve `PhotoUploadSection`/recipe page photo UX to support add photos plus cover-photo selection.

### 2026-06-04 - UI system phase 2B global recipe search primitive reuse

Changed/decided:

- Continued the phased Mychelin UI-system rollout after the planner picker pilot.
- Reused shared `FilterBar`, `RecipeResultRow`, and `EmptyState` in the full-screen global recipe search modal.
- Adjusted `RecipeResultRow` so last-cooked metadata is optional and search contexts can show a secondary label instead.
- Added optional `autoFocus` support to `FilterBar` so workflow/search dialogs can preserve autofocus behavior.
- Kept the sidebar recipe list component intact for now because it carries cook/share/delete actions; forcing the shared row there would be a larger behavioral refactor.

Files touched:

- `app/src/components/search/RecipeSearchModal.tsx`
- `app/src/components/ui/FilterBar.tsx`
- `app/src/components/ui/RecipeResultRow.tsx`
- `MEMORY.md`

Checks:

- `npx tsc --noEmit` passed from `app/`.
- `npx eslint src/components/search/RecipeSearchModal.tsx src/components/ui/FilterBar.tsx src/components/ui/RecipeResultRow.tsx src/components/planner/MealPlanView.tsx` passed from `app/`.
- `npm run build` passed from `app/`.
- `git diff --check` passed.

Follow-ups:

- Production deployed at `https://mychelin-llf2w8nh9-brianylms-projects.vercel.app` and aliased to `https://mychelin-sg.vercel.app`.
- Live smoke checks passed: home `200`, login `200`, synthetic signup/recipe create/global recipe search succeeded, search returned matched ingredient `sambal`, and cleanup returned `remaining=0`.
- User should test global recipe search via the header search control: empty state, search results, ingredient match evidence, Escape/close, and recipe selection.


### 2026-06-05 - Cook-with-me attempts and promotion model

Changed/decided:

- Implemented the attempt > version > active version model for cook-with-me.
- Cook-with-me completion now asks `How would you rate this dish?` and supports half-star dish ratings.
- Cook-with-me sessions now POST to `/api/recipes/[id]/attempts` instead of automatically creating `recipe_versions` rows.
- Added per-user recipe attempts with cooked date, rating, change notes, next-time notes, recipe snapshots, optional meal plan link, and promoted-version tracking.
- Added attempt promotion endpoint: an unpromoted attempt can become a new recipe version and is set as the active version by default.
- Recipe planner last-cooked metadata now includes attempts, so a cook session updates recency even if it is never promoted to a version.
- Recipe pages now show an Attempts panel under Versions & Refinement with a promote-to-active-version action.

Files touched:

- `app/src/db/schema.ts`
- `app/drizzle/0019_recipe_attempts.sql`
- `app/src/db/ensure-schema.ts`
- `app/src/app/api/recipes/route.ts`
- `app/src/app/api/recipes/[id]/attempts/route.ts`
- `app/src/app/api/recipes/[id]/attempts/[attemptId]/promote/route.ts`
- `app/src/components/recipes/CookWithMeSession.tsx`
- `app/src/components/recipes/AttemptHistory.tsx`
- `app/src/components/recipes/RecipeView.tsx`
- `app/src/components/RecipeWorkspace.tsx`
- `MEMORY.md`

Checks:

- `npx tsc --noEmit` passed from `app/`.
- Targeted eslint passed for touched API/schema/UI files; only existing `RecipeView` `<img>` warnings remain.
- `npm run build` passed from `app/`.
- `git diff --check` passed.
- Full `npm run lint` still fails on pre-existing unrelated repo lint errors in scripts/books/versioning/UI utility files; do not treat those as introduced by this attempt model work.

Follow-ups:

- Preview deployed at `https://mychelin-fl1pyg2dt-brianylms-projects.vercel.app`, but authenticated smoke was blocked because `JWT_SECRET` is configured for Production only in Vercel.
- Production deployed and aliased to `https://mychelin-sg.vercel.app`.
- Live smoke passed: synthetic signup `201`, recipe create `201`, attempt create with `4.5` rating `201`, attempts list `200`, promotion to active version `201`, versions activeVersionId matched promoted version, planner last-cooked present, recipe cleanup `200`.
- Next design-system phase should address smarter cook step splitting and the add-photos/cover-photo workflow.


### 2026-06-05 - Attempts pagination, definitive versions, planner date rollover, and batch cooking

Changed/decided:

- Attempt history now shows a total attempt counter and keeps attempts beyond five behind a Load more control instead of silently hiding them.
- Attempt promotion language changed to `Promote to version`; promoted attempts no longer become definitive automatically.
- Version history now uses `DEFINITIVE` and `Set as definitive` language for the active version pointer.
- Meal planner date keys now use local dates instead of UTC-derived `toISOString` keys, and the planner refreshes its `today` marker every minute so a tab left open across midnight rolls over correctly.
- Cook timers now play a Web Audio alarm when a timer reaches zero; the audio context is primed from the Start button path.
- Added an initial multi-dish cook-with-me flow from the meal planner: days with multiple uncooked planned meals can launch a batch cooking session with independent dish lanes and concurrently running timers. The review step saves attempts for all dishes and marks the linked meal plans cooked.

Files touched:

- `app/src/components/recipes/AttemptHistory.tsx`
- `app/src/components/versions/VersionTimeline.tsx`
- `app/src/app/api/recipes/[id]/attempts/[attemptId]/promote/route.ts`
- `app/src/app/api/recipes/[id]/versions/[versionId]/rollback/route.ts`
- `app/src/components/planner/MealPlanView.tsx`
- `app/src/components/recipes/CookWithMeSession.tsx`
- `app/src/components/recipes/MultiCookWithMeSession.tsx`
- `app/src/components/RecipeWorkspace.tsx`
- `app/src/lib/timer-alarm.ts`
- `MEMORY.md`

Checks:

- `npx tsc --noEmit` passed from `app/`.
- Targeted eslint passed for the touched attempt, timer, planner, workspace, version, and route files.
- `npm run build` passed from `app/`.
- `git diff --check` passed.

Follow-ups:

- Production deployed and aliased to `https://mychelin-sg.vercel.app`.
- Live API smoke passed: synthetic signup, recipe create, baseline definitive version, attempt create, promote attempt to version without changing definitive version, set promoted version as definitive via version action, and recipe cleanup.
- Manual UI test still needed for attempts counter/load more, planner today rollover behavior across midnight, timer alarm sound in browser, and batch cook from a day with multiple planned meals.
- Multi-dish cooking is a first usable batch workflow; later refinement should add smarter interleaving recommendations and shared prep sequencing rather than only parallel lanes.


### 2026-06-05 - Cook flow polish: attempt/version editing, timer alarm, batch layout

Changed/decided:

- Attempt history now supports collapsing after expansion and uses `Load more attempts (5 more)` wording.
- Attempts can be edited inline for rating, attempt notes, and next-time notes; attempts can also be deleted with confirmation.
- Versions can now be edited from the version menu for version note/details and deleted when they are not definitive/ancestor versions.
- Existing definitive version protection prevents deleting the active/definitive version until another version is set definitive.
- Single and multi-dish cook-with-me close actions now show a confirmation modal before exiting unsaved sessions.
- Timer alarm triggering was moved out of React state updates into a timer state-transition effect; alarm tone is louder and uses vibration where supported.
- Multi-dish cook entry moved from day-level to meal-segment-level so `Cook together` appears within breakfast/lunch/dinner/snack only when that meal segment has multiple uncooked dishes.
- Planner no longer navigates to the recipe page when starting cook sessions from meal plan; the planner stays underneath the modal so closing returns to meal plan.
- Batch cook session now has sticky live timer chips at the top of the cooking surface so active timers remain visible without scrolling.
- Meal plan dish rows were spaced out to reduce clumping.
- Roadmap updated for Send to Calendar prep events, e.g. D-2 marinade/prep events plus D-day cook event.

Files touched:

- `app/src/app/api/recipes/[id]/attempts/[attemptId]/route.ts`
- `app/src/app/api/recipes/[id]/versions/[versionId]/route.ts`
- `app/src/components/recipes/AttemptHistory.tsx`
- `app/src/components/versions/VersionTimeline.tsx`
- `app/src/components/recipes/CookWithMeSession.tsx`
- `app/src/components/recipes/MultiCookWithMeSession.tsx`
- `app/src/components/planner/MealPlanView.tsx`
- `app/src/components/RecipeWorkspace.tsx`
- `app/src/lib/timer-alarm.ts`
- `ROADMAP.md`
- `MEMORY.md`

Checks:

- `npx tsc --noEmit` passed from `app/`.
- Targeted eslint passed for touched attempt/version/cook/planner/workspace/timer files.
- `npm run build` passed from `app/`; Turbopack compile phase was slow and completed in 15.4 minutes.
- `git diff --check` passed.

Follow-ups:

- Production deployed and aliased to `https://mychelin-sg.vercel.app`.
- Live API smoke passed: attempt rating/notes edit, attempt delete, version note/details edit, non-definitive version delete, definitive version delete blocked with `409`, and cleanup.
- Manual UI test still needed for audible timer alarm on desktop/mobile, exit confirmation, batch live timer chips, segment-level batch entry, and returning to meal plan after closing cook sessions.


### 2026-06-05 - Landing/profile polish and in-app changelog

Changed/decided:

- Removed the decorative hairline from the glass top nav and softened the recipe save-status divider so the rounded nav reads cleaner.
- Landing page feature carousel now has visible previous/next controls in addition to swipe/card selection.
- Landing page final `Start your recipe book` section is now a distinct dark CTA band so it separates clearly from the features section.
- Added a compact in-app changelog under Profile & Settings using a curated static changelog source.
- Fixed a touched-file React lint issue in `RecipeSaveStatus` while preserving the saved-state behavior.

Files touched:

- `app/src/components/layout/Header.tsx`
- `app/src/components/recipes/RecipeSaveStatus.tsx`
- `app/src/components/LandingPage.tsx`
- `app/src/components/profile/ProfileView.tsx`
- `app/src/lib/changelog.ts`
- `MEMORY.md`

Checks:

- `npx tsc --noEmit` passed from `app/`.
- Targeted eslint passed for touched files; existing `<img>` warnings remain in landing/header imagery.
- `npm run build` passed from `app/`.
- `git diff --check` passed.

Follow-ups:

- Deploy to production and manually verify top-nav cleanliness, landing carousel controls, final CTA contrast, and Profile > Changelog.

### 2026-06-05 - Nav, landing carousel, and changelog disclosure fixes

Changed/decided:

- Removed the sticky translucent recipe save-status panel so it no longer appears as an extra strip below the rounded top nav.
- Made the landing feature carousel manual/swipe controlled by removing auto-advance, preventing left-arrow jumps when timing overlaps with rotation.
- Updated the final CTA affordability note to the styled text `Free.`.
- Changed Profile > Changelog entries into collapsed disclosure rows that can expand and recollapse.

Files touched:

- `app/src/components/recipes/RecipeSaveStatus.tsx`
- `app/src/components/LandingPage.tsx`
- `app/src/components/profile/ProfileView.tsx`
- `MEMORY.md`

Checks:

- `npx tsc --noEmit` passed from `app/`.
- Targeted eslint passed for touched UI files; existing `<img>` warnings remain in landing/header imagery.
- `npm run build` passed from `app/`.
- `git diff --check` passed.

Follow-ups:

- Deploy and manually verify the top nav, landing carousel back button, final CTA label, and changelog expand/collapse on `https://mychelin-sg.vercel.app`.

### 2026-06-06 - Top nav lower-strip removal

Changed/decided:

- Reworked both authenticated and landing top nav glass styling to remove the remaining lower strip effect.
- Removed the bottom-heavy inset shadow, hard white border, and overflow clipping from the rounded nav pills.
- Replaced that treatment with a simpler translucent fill, soft outer shadow, and white ring so the nav reads as one clean rounded bar.

Files touched:

- `app/src/components/layout/Header.tsx`
- `app/src/components/LandingPage.tsx`
- `MEMORY.md`

Checks:

- `npx tsc --noEmit` passed from `app/`.
- Targeted eslint passed for nav/landing files; existing `<img>` warnings remain.
- `npm run build` passed from `app/`.
- `git diff --check` passed before the memory entry.

Follow-ups:

- Deploy and manually verify that the top nav no longer shows an extra line or panel underneath on `https://mychelin-sg.vercel.app`.

### 2026-06-06 - Mobile hero, onboarding, and OpenAI transcription

Changed/decided:

- Tuned the landing hero for mobile by moving the image crop away from the far-right position and replacing the desktop left wash with a mobile bottom readability scrim.
- Added persisted onboarding fields for cooking goal, desired home-cooking frequency, first capture mode, and onboarding completion.
- Added a new-user onboarding flow gated after signup/new rollout users, with a skip path that marks onboarding complete.
- Updated preferences PATCH to preserve omitted fields so onboarding does not wipe profile settings.
- Added OpenAI speech-to-text capture at `/api/capture/transcribe-whisper`, using `gpt-4o-transcribe-diarize` by default with `diarized_json` output.
- Updated conversation capture to try OpenAI transcription first and keep the existing Gemini chunk transcription as fallback.
- Roadmap updated with the activation/stickiness direction: fast first recipe magic moment, forgiving cooking habit loop, and goal capture without over-gamifying.
- In-app changelog updated for the onboarding and voice-capture release.

Files touched:

- `app/src/components/LandingPage.tsx`
- `app/src/app/globals.css`
- `app/src/components/auth/AuthScreen.tsx`
- `app/src/components/RecipeWorkspace.tsx`
- `app/src/components/onboarding/OnboardingFlow.tsx`
- `app/src/app/api/user/preferences/route.ts`
- `app/src/app/api/capture/transcribe-whisper/route.ts`
- `app/src/components/capture/ConversationCapture.tsx`
- `app/src/db/schema.ts`
- `app/src/db/ensure-schema.ts`
- `app/drizzle/0020_user_onboarding.sql`
- `app/src/lib/changelog.ts`
- `ROADMAP.md`
- `MEMORY.md`

Checks:

- `npx tsc --noEmit` passed from `app/`.
- Targeted eslint passed for touched files; existing `<img>` warnings remain.
- `npm run build` passed from `app/`.
- `git diff --check` passed before the memory entry.

Follow-ups:

- Deploy and manually verify mobile landing readability, new-user onboarding, Profile > Changelog, and conversation capture with `OPENAI_API_KEY` configured in production.

### 2026-06-07 - Onboarding goals, create recipe sidebar, and AI draft flow

Changed/decided:

- Onboarding goals are now multi-select and persist as a JSON-encoded list in user preferences.
- The recipe sidebar now clearly groups input paths under Create recipe: URL/video import, pasted recipe text, recorded conversation, Ask Mychelin, and manual recipe entry.
- Recipes and Books are now peer sections in the left panel, with Books moved out of the middle of the recipe-creation/list flow.
- Added sidebar and mobile FAB access to recipe conversation capture so users can start it from the recipe list context, not only inside an existing recipe page.
- Added Ask Mychelin first-draft recipe generation via /api/capture/draft-recipe. It uses DeepSeek v4 Flash when DEEPSEEK_API_KEY is configured, then falls back to Gemini. DeepSeek is suitable for structured text drafting/extraction, but not for audio transcription, so OpenAI speech-to-text remains the right first pass for voice capture.
- Checked local project env files for DeepSeek configuration and did not find a Mychelin DEEPSEEK_API_KEY; production needs that Vercel env var before Ask Mychelin uses DeepSeek instead of Gemini fallback.
- In-app changelog updated with the 2026-06-07 recipe creation paths entry.

Files touched:

- app/src/components/onboarding/OnboardingFlow.tsx
- app/src/components/layout/sidebar/SidebarToolbar.tsx
- app/src/components/layout/RecipeSidebar.tsx
- app/src/components/RecipeWorkspace.tsx
- app/src/components/capture/AiDraftRecipeModal.tsx
- app/src/app/api/capture/draft-recipe/route.ts
- app/src/lib/changelog.ts
- ROADMAP.md
- MEMORY.md

Checks:

- npx tsc --noEmit passed from app/.
- Targeted eslint passed for touched files; one existing onboarding <img> warning remains.
- npm run build passed from app/.
- git diff --check passed before this memory entry.

Follow-ups:

- Deploy and manually verify onboarding multi-select, left sidebar Create recipe grouping, Books/Recipes hierarchy, sidebar conversation capture, Ask Mychelin draft creation, and mobile FAB parity.
- Configure DEEPSEEK_API_KEY and optionally DEEPSEEK_MODEL=deepseek-v4-flash in Vercel if DeepSeek should be used in production.

### 2026-06-07 - Recipe input flow polish and worktree cleanup

Changed/decided:

- Treated the dirty worktree as deployed-but-uncommitted production work; local .commandcode agent/session notes are now ignored rather than committed.
- Recipe title entry now treats Untitled recipe as a soft placeholder: clicking into the field clears it visually, while blank blur falls back to Untitled recipe instead of saving null.
- Photo upload now checks HTTP failures, updates the selected recipe cache immediately with the returned photo, and refreshes both recipe detail and recipe list caches so uploaded photos/cover images appear without a stale UI.
- Paste-list ingredients can now be separated by commas or line breaks; parsed commas are not carried into ingredient names or quantities.
- Draft ingredient Done now adds the current draft ingredient before closing the input form.
- Ingredient and step delete controls were enlarged, and the ingredient approximate toggle is more separated from delete.
- Step reordering now uses a larger drag handle, suppresses text selection during drag, and shows a stronger active drag state.
- Cook-with-me timer defaults now use a shared parser that understands explicit ranges, repeated/per-side timing, and common cooking verbs such as pan-fry lightly, stir-fry, simmer, boil, steam, rest, and marinate.
- Attempt history now highlights next-time notes with a CTA to promote those suggested changes into a new version.
- In-app changelog updated with the recipe input polish entry.

Files touched:

- .gitignore
- app/src/components/recipes/RecipeTitleCard.tsx
- app/src/components/recipes/RecipeView.tsx
- app/src/components/recipes/IngredientList.tsx
- app/src/components/recipes/RecipeSteps.tsx
- app/src/components/recipes/AttemptHistory.tsx
- app/src/components/recipes/CookWithMeSession.tsx
- app/src/components/recipes/MultiCookWithMeSession.tsx
- app/src/lib/step-timers.ts
- app/src/lib/changelog.ts
- MEMORY.md

Checks:

- npx tsc --noEmit passed from app/.
- Targeted eslint passed for touched input/cook files; existing RecipeView <img> warnings remain.
- npm run build passed from app/.
- git diff --check passed before this memory entry.

Follow-ups:

- Deploy to production and manually verify title placeholder behavior, mobile photo upload display, comma-separated ingredient paste, Done-on-draft ingredient add, step drag behavior, timer defaults, and next-time promotion CTA.
- Commit the deployed work to clear the repository worktree while leaving .commandcode ignored.

### 2026-06-07 - Internal usage event tracking foundation

Changed/decided:

- Added a platform-agnostic internal usage event layer so Mychelin can track core product usage even if the external analytics vendor changes later.
- Added a privacy-safe usage_events table with user/event/source/recipe/book/meal-plan anchors, sanitized JSON properties, path, and created_at.
- Added lazy ensureUsageEventsTable() so production routes can create the table/indexes even before manual migration application.
- Added trackUsageEvent() helper that is best-effort and catches errors so analytics never breaks product flows.
- Instrumented initial high-signal server events: user signup, onboarding completion, recipe creation, paste capture completion, Ask Mychelin draft completion, OpenAI transcription completion, photo upload, meal planned, cook attempt created, and attempt promoted to version.
- Event properties intentionally avoid recipe text, prompts, transcripts, family stories, photo URLs, raw ingredient names, and raw step content. Only counts, booleans, source/provider labels, model names, and coarse size buckets are stored.

Files touched:

- app/src/db/schema.ts
- app/drizzle/0021_usage_events.sql
- app/src/db/ensure-schema.ts
- app/src/lib/usage-events.ts
- app/src/app/api/auth/signup/route.ts
- app/src/app/api/user/preferences/route.ts
- app/src/app/api/recipes/route.ts
- app/src/app/api/capture/paste/route.ts
- app/src/app/api/capture/draft-recipe/route.ts
- app/src/app/api/capture/transcribe-whisper/route.ts
- app/src/app/api/meal-plans/route.ts
- app/src/app/api/recipes/[id]/photos/route.ts
- app/src/app/api/recipes/[id]/attempts/route.ts
- app/src/app/api/recipes/[id]/attempts/[attemptId]/promote/route.ts
- MEMORY.md

Checks:

- npx tsc --noEmit passed from app/.
- Targeted eslint passed for usage tracking files and instrumented routes.

Follow-ups:

- Future analytics enhancements should extend this event taxonomy and helper rather than sending private recipe data directly to an external analytics platform.
- Add dashboard/query surfaces later for activation, retention, cook-session completion, attempt promotion, AI cost/reliability, and planning conversion.
- If PostHog/Plausible/Vercel Analytics is added, forward sanitized copies from trackUsageEvent rather than duplicating event definitions across the codebase.

### 2026-06-07 - DeepSeek production env configured

Changed/decided:

- Added DEEPSEEK_API_KEY and DEEPSEEK_MODEL to the Mychelin Vercel Production environment.
- The key was read from /home/cluser/agrippa-brain/.env and piped directly to Vercel; no Mychelin .env file was created or modified.
- Confirmed .env* remains ignored by git.
- Do not commit or print the DeepSeek key value.

Files touched:

- MEMORY.md

Checks:

- npx vercel env ls shows DEEPSEEK_API_KEY and DEEPSEEK_MODEL as encrypted Production env vars.

Follow-ups:

- Redeploy production so the serverless functions receive the newly added env vars.
- Ask Mychelin should now use DeepSeek v4 Flash first, with Gemini fallback only if DeepSeek fails.


### 2026-06-07 - Sidebar create collapse and Ask Mychelin production fix

Changed/decided:

- Made the authenticated left-panel Create recipe segment collapsible and slightly larger, with bigger icon touch targets and clearer expanded/collapsed state.
- Diagnosed production Ask Mychelin 503s after DeepSeek env setup: Vercel had DEEPSEEK_MODEL configured with a trailing newline, so the route sent an invalid model string.
- Updated Ask Mychelin provider env reads to trim whitespace for DeepSeek and Gemini values before use.
- Kept authenticated 503 responses more accurate by reporting non-sensitive provider state booleans/model name; unauthenticated requests still return a plain Unauthorized response.
- Re-synced DeepSeek Vercel Production env from the known-good /home/cluser/agrippa-brain/.env source without printing or committing secrets.
- Deployed the final fix to production at https://mychelin-sg.vercel.app.

Files touched:

- app/src/components/layout/sidebar/SidebarToolbar.tsx
- app/src/app/api/capture/draft-recipe/route.ts
- MEMORY.md

Checks:

- npx eslint src/components/layout/sidebar/SidebarToolbar.tsx src/app/api/capture/draft-recipe/route.ts passed from app/.
- npm run build passed from app/.
- git diff --check passed.
- Production smoke: landing page returned HTTP 200.
- Production smoke: unauthenticated Ask route returned plain Unauthorized.
- Production smoke: synthetic DB user login returned HTTP 200 and Ask Mychelin returned HTTP 200 with provider deepseek-v4-flash; synthetic users and temporary /tmp env files were deleted afterward.

Follow-ups:

- User should manually verify the left-panel collapse affordance and Ask Mychelin flow in their real account.
- Avoid storing Vercel env values with pasted trailing whitespace; route now trims defensively, but clean env values are still preferred.


### 2026-06-07 - Sidebar section collapse cleanup

Changed/decided:

- Removed the "5 ways" label from the authenticated sidebar Create recipe header; the chevron alone now indicates collapse state.
- Made Recipes and Books first-tier sidebar sections collapsible, defaulting open.
- Search automatically reopens the Recipes section so search results remain visible.
- Deployed the change to production at https://mychelin-sg.vercel.app.

Files touched:

- app/src/components/layout/RecipeSidebar.tsx
- app/src/components/layout/sidebar/SidebarToolbar.tsx
- MEMORY.md

Checks:

- npx eslint src/components/layout/RecipeSidebar.tsx src/components/layout/sidebar/SidebarToolbar.tsx passed from app/.
- npm run build passed from app/.
- git diff --check passed.
- Production smoke: landing page returned HTTP 200.

Follow-ups:

- User is brainstorming a new "firing up the wok" loading animation; preferred direction should be chosen before generating or implementing the asset.


### 2026-06-07 - Wok loading animations

Changed/decided:

- Replaced the old generic wok loader with a code-native LoadingAnimation component that supports two variants.
- General app loading now uses the calmer Wok Ignition animation: wok silhouette, blue/orange flame, oil shimmer, and heat wisps.
- Ask Mychelin drafting now uses the livelier Hei Burst animation: wok toss, flame burst, sparks, and flying ingredient shapes.
- Kept this as SVG/CSS rather than a GIF so it stays lightweight, themeable, and easy to tune.
- Deployed the change to production at https://mychelin-sg.vercel.app.

Files touched:

- app/src/components/ui/LoadingAnimation.tsx
- app/src/components/capture/AiDraftRecipeModal.tsx
- MEMORY.md

Checks:

- npx eslint src/components/ui/LoadingAnimation.tsx src/components/capture/AiDraftRecipeModal.tsx passed from app/.
- npm run build passed from app/.
- git diff --check passed.
- Production smoke: landing page returned HTTP 200.

Follow-ups:

- User should manually test app boot/loading and Ask Mychelin drafting to judge animation speed and visual personality.
