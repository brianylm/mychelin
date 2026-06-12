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

### 2026-06-08 - Production deploy for live conversation helper

Changed/decided:

- Deployed commit `8e05b7a Add live conversation helper` to production after preview auth was not usable for user testing.
- Production alias updated: `https://mychelin-sg.vercel.app`.
- Verified the new `/api/capture/conversation-assist` route exists in the production build and rejects unauthenticated requests.

Checks:

- `git status --short` was clean before deploy.
- `npm run build` passed from `app/`.
- `npx vercel --prod --yes` completed and aliased production to `https://mychelin-sg.vercel.app`.
- Production landing page returned HTTP 200.
- Production unauthenticated `POST /api/capture/conversation-assist` returned `Unauthorized`.
- Production smoke passed with a throwaway user: signup 201, auth me 200, recipe create 201, ingredient create 201, instruction create 201, recipe fetch 200, recipe delete 200, login 200.
- Throwaway production smoke user was deleted from Turso; remaining count 0.

Follow-ups:

- User should test live conversation capture on production with microphone permissions and real mixed-language audio.
- Next technical step remains true streamed captions/translation if near-live chunked assistance is not fast enough.

### 2026-06-08 - Live recipe conversation helper implementation

Changed/decided:

- Added a new Edge API route for conversation assistance that turns recent transcript messages into a translated gist, suggested learner questions, missing recipe cues, and uncertain terms.
- Updated the conversation capture modal from passive recording copy to live facilitation: sticky helper panel, gist, question chips, missing cues, uncertain terms, and copied-question feedback.
- Updated downstream copy across landing page, onboarding, sidebar, mobile create flow, recipe empty-state CTA, sharing signup nudge, metadata, and in-app changelog to reflect live conversation assistance.
- Added usage analytics event support for `conversation_assist_completed`.

Files touched:

- `app/src/app/api/capture/conversation-assist/route.ts`
- `app/src/components/capture/ConversationCapture.tsx`
- `app/src/components/LandingPage.tsx`
- `app/src/components/RecipeWorkspace.tsx`
- `app/src/components/layout/sidebar/SidebarToolbar.tsx`
- `app/src/components/onboarding/OnboardingFlow.tsx`
- `app/src/components/recipes/RecipeView.tsx`
- `app/src/components/sharing/SignupNudge.tsx`
- `app/src/app/layout.tsx`
- `app/src/app/preview/layout.tsx`
- `app/src/lib/changelog.ts`
- `app/src/lib/usage-events.ts`
- `MEMORY.md`

Checks:

- Focused ESLint passed on touched app files with existing image/font warnings only.
- `git diff --check` passed.
- `npm run build` passed from `app/`.

Follow-ups:

- Build the next Realtime layer with streamed captions/translation when latency becomes the blocker; current implementation is near-live chunked assistance.
- Add transcript review persistence if raw transcript, translated transcript, accepted questions, and final extraction need to become separate durable artifacts.
- Test with pilot audio clips across mixed English/Mandarin/Cantonese/Hokkien/Teochew and background kitchen noise.

### 2026-06-08 - Reprioritized pilot operations and realtime conversation facilitation

Changed/decided:

- Reordered the pilot roadmap so pilot operations sit above training/tutorial work.
- Elevated realtime translation/conversation facilitation from a deferred capability to a near-term core product requirement for family recipe conversations.
- Clarified that record-conversation should actively help the learner ask follow-up questions while preserving raw transcript, translated transcript, AI-suggested questions, accepted answers, and final recipe extraction as separable artifacts.

Files touched:

- `ROADMAP.md`
- `MEMORY.md`

Checks:

- `git diff --check` passed for the docs-only roadmap update.

Follow-ups:

- Design the record-conversation MVP as a facilitator: live captions/translation where possible, suggested questions, consent, transcript review, and graceful degradation for dialect or latency uncertainty.
- Keep older family cooks out of high-friction UI; optimize the active screen for the learner who is asking questions and capturing the recipe.

### 2026-06-08 - Pilot training roadmap and conversation-capture direction

Changed/decided:

- Added pilot training/tutorial items to `ROADMAP.md`: first-recipe guided mission, sample recipe sandbox, contextual coach tips, replayable Learn Mychelin under Profile, and pilot training scripts.
- Kept record-conversation direction as OpenAI speech-to-text first pass with Gemini fallback for dialect-heavy or diarization-sensitive cases.
- Recommendation for pilot MVP: harden the current near-live conversation capture and transcript review flow before building full realtime translation.

Files touched:

- `ROADMAP.md`
- `MEMORY.md`

Checks:

- `git diff --check` passed for the docs-only roadmap update.

Follow-ups:

- Add consent and transcript-review UX before extracting/saving a recipe from recorded conversation.
- Build a small pilot audio test set across English, Mandarin, Cantonese, Hokkien/Teochew where available, mixed speech, background noise, and two-speaker family conversations.
- Compare OpenAI diarized transcription against the Gemini fallback using transcript accuracy, speaker separation, dialect term preservation, latency, and extraction quality.

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


### 2026-06-07 - Meal plan to shopping list v1

Changed/decided:

- Implemented the next roadmap step: visible meal-plan ranges can now generate a shopping list and open the Shopping tab with that exact date range.
- Shopping list generation now returns stable item keys, summary metadata, display quantity labels, and approximate item flags.
- Numeric ingredients are aggregated and adjusted against matching inventory by ingredient/unit.
- Approximate or non-numeric ingredients such as "to taste" now appear in the shopping list instead of being silently dropped.
- Added a privacy-safe shopping_list_generated usage event with meal/recipe/item counts only.
- Updated the in-app changelog with the meal-plan shopping-list release.
- Changed the left-panel Create recipe section to be collapsed by default.
- Deployed the final build to production at https://mychelin-sg.vercel.app.

Files touched:

- app/src/app/api/shopping-list/route.ts
- app/src/components/RecipeWorkspace.tsx
- app/src/components/planner/MealPlanView.tsx
- app/src/components/shopping/ShoppingListView.tsx
- app/src/components/layout/sidebar/SidebarToolbar.tsx
- app/src/lib/usage-events.ts
- app/src/lib/changelog.ts
- MEMORY.md

Checks:

- npx eslint src/components/RecipeWorkspace.tsx src/components/planner/MealPlanView.tsx src/components/shopping/ShoppingListView.tsx src/components/layout/sidebar/SidebarToolbar.tsx src/app/api/shopping-list/route.ts src/lib/usage-events.ts src/lib/changelog.ts passed from app/.
- npm run build passed from app/.
- git diff --check passed before this memory entry.
- Production smoke after final deploy: landing page returned HTTP 200 and unauthenticated shopping-list returned HTTP 401.
- Production smoke with synthetic user passed: login 200, recipe create 201, two ingredients 201/201, inventory create 201, meal plan create 201, shopping list 200.
- Production smoke confirmed inventory subtraction and approximate ingredient handling: rice produced 1.5 kg to buy after 0.5 kg on hand; salt appeared as "to taste". Synthetic user and temporary /tmp env files were deleted afterward.

Follow-ups:

- Manual UI test: in Plan, click Generate shopping list for week and month ranges, confirm Shopping opens with the same dates and expected grouped items.
- Next roadmap item remains Calendar Prep Events: add prep lead-time requirements to recipes and export D-2/D-1 prep reminders plus D-day cooking events.


### 2026-06-08 - Cooking rhythm and PWA reminder foundation

Changed/decided:

- Implemented the first stickiness layer as a practical weekly cooking rhythm instead of a daily streak mechanic.
- Onboarding frequency/goals now seed the user's weekly cooking goal in notification preferences.
- Profile now shows cooked-this-week, planned-this-week, weekly goal, progress, reminder toggles, reminder time, and browser push enable/pause state.
- Added PWA push subscription storage, notification preferences, notification jobs, and a daily Vercel cron dispatch route.
- Cook-with-me attempt creation now queues a privacy-safe post-cook review reminder when review reminders are enabled.
- Service worker now handles push notifications and notification clicks.
- Added VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, and VAPID_SUBJECT to Vercel Production env only; no secret values were printed or committed.
- Preview deployment is available but authenticated smoke is blocked because Preview still lacks JWT_SECRET.

Files touched:

- ROADMAP.md
- app/package.json
- app/package-lock.json
- app/public/sw.js
- app/vercel.json
- app/drizzle/0022_notifications_and_rhythm.sql
- app/src/lib/rhythm.ts
- app/src/lib/changelog.ts
- app/src/db/schema.ts
- app/src/db/ensure-schema.ts
- app/src/components/profile/ProfileView.tsx
- app/src/app/api/user/preferences/route.ts
- app/src/app/api/recipes/[id]/attempts/route.ts
- app/src/app/api/notifications/preferences/route.ts
- app/src/app/api/notifications/rhythm/route.ts
- app/src/app/api/notifications/subscribe/route.ts
- app/src/app/api/notifications/vapid-public-key/route.ts
- app/src/app/api/notifications/dispatch/route.ts

Checks:

- npx eslint on touched notification/profile/rhythm files passed from app/.
- npm run build passed from app/.
- git diff --check passed.
- Vercel Preview deployed: https://mychelin-ibze342bo-brianylms-projects.vercel.app
- Preview unauth checks passed: landing 200, unauth /api/notifications/rhythm 401.
- Preview authenticated smoke could not run because signup returned 500 due missing JWT_SECRET in Preview env; this matches the known preview-auth limitation.

Follow-ups:

- Deploy to production and smoke-test auth plus rhythm/reminder APIs on https://mychelin-sg.vercel.app.
- Hobby Vercel cron only supports daily schedules, so notification dispatch is daily for now. Upgrade scheduling or use a different scheduler if tighter prep/review reminders become important.


### 2026-06-08 - Cooking rhythm production deploy and cron hardening

Changed/decided:

- Deployed cooking rhythm and PWA reminder foundation to production at https://mychelin-sg.vercel.app.
- Hardened /api/notifications/dispatch by removing the temporary query-string cron bypass; it now accepts Vercel cron headers or CRON_SECRET bearer auth.
- Added CRON_SECRET to Vercel Production env without printing or committing it. Initial deploy caught a trailing-whitespace CRON_SECRET issue; removed and re-added it without a newline.

Checks:

- npx eslint src/app/api/notifications/dispatch/route.ts passed from app/.
- npm run build passed from app/.
- Production deploy aliased to https://mychelin-sg.vercel.app.
- Production smoke passed after signup rate limit was worked around with a synthetic DB-seeded user: login 200, me 200, onboarding 200, notification preferences 200 with weeklyGoal 3, rhythm before 200 cooked 0, recipe create 201, attempt create 201 with rating 4.5, rhythm after 200 cooked 1 remaining 2, recipe delete 200, synthetic user cleanup remaining 0.
- Unauthenticated notification dispatch returned 401 and VAPID public-key route returned configured=true.

Follow-ups:

- Signup smoke temporarily hit 429 because repeated agent synthetic signups exhausted the auth rate limit. This is expected; login-based seeded smoke passed.
- Daily Vercel Hobby cron remains the current scheduler constraint.


### 2026-06-08 - Google sign-in implementation

Changed/decided:

- Added native Google OAuth login using the existing Mychelin JWT cookie session rather than migrating to a new auth library.
- Added users.auth_provider, users.google_sub, and users.email_verified schema fields plus migration and route-level ensure helper.
- Added /api/auth/google/start and /api/auth/google/callback Edge routes.
- Google callback exchanges the authorization code, verifies the ID token against Google's JWKS, links verified existing emails, or creates a new Google-backed user with an unusable random password hash.
- Login/signup UI now includes Continue with Google and shows user-friendly Google callback errors.

Files touched:

- app/drizzle/0023_google_oauth_users.sql
- app/src/app/api/auth/google/start/route.ts
- app/src/app/api/auth/google/callback/route.ts
- app/src/components/auth/AuthScreen.tsx
- app/src/db/schema.ts
- app/src/db/ensure-schema.ts
- app/src/lib/auth.ts
- app/src/lib/changelog.ts
- MEMORY.md

Checks:

- npx eslint on Google OAuth routes, AuthScreen, auth helper, schema, and ensure-schema passed from app/ with only the existing Mychelin logo img warning.
- npm run build passed from app/.

Follow-ups:

- Deploy to production and manually test the full Google browser redirect flow with a Google test user. API-only smoke can verify redirect wiring, but it cannot complete Google's hosted login page.


### 2026-06-08 - Google sign-in production deploy

Changed/decided:

- Deployed Google sign-in to production at https://mychelin-sg.vercel.app.
- Added a follow-up safety fix so normal signup, login lookup, and profile preferences ensure the new OAuth user columns before querying users.

Commits:

- 837bcb2 Add Google sign-in
- 861eaf9 Ensure Google auth user columns before auth queries

Checks:

- npx eslint on Google OAuth routes, AuthScreen, auth helper, signup route, user preferences route, schema, and ensure-schema passed from app/ with only the existing Mychelin logo img warning.
- npm run build passed from app/.
- Production deploy aliased to https://mychelin-sg.vercel.app.
- Production smoke passed: landing 200; /api/auth/google/start returned 307 to Google and set the state cookie; bad callback returned 307 to /login with google_state_mismatch; seeded password login 200; /api/auth/me 200; /api/user/preferences 200; OAuth columns were queryable; synthetic user cleanup remaining 0.

Follow-ups:

- Manual browser test required: click Continue with Google on production with a Google test user and confirm it returns to Mychelin logged in.
- If pilot users are outside the Google OAuth test-user list, add them in Google Auth Platform or publish/verify the app when ready.


### 2026-06-08 - Google button visual polish

Changed/decided:

- Restyled the auth screen Continue with Google button to more closely match Google's default white button style: four-color Google mark, Roboto/Arial font stack, standard border, square-ish radius, and neutral Google text color.
- Deployed the polish to production at https://mychelin-sg.vercel.app.

Files touched:

- app/src/components/auth/AuthScreen.tsx
- MEMORY.md

Checks:

- npx eslint src/components/auth/AuthScreen.tsx passed from app/ with only the existing Mychelin logo img warning.
- npm run build passed from app/.
- git diff --check passed.
- Production smoke: /login returned 200 and /api/auth/google/start returned 307 to accounts.google.com with a state cookie.


### 2026-06-08 - Pilot readiness feedback loop

Changed/decided:

- Implemented the first pilot-operations slice: a privacy-safe feedback store/API, a Profile pilot checklist, and lightweight milestone feedback prompts.
- Added pilot_feedback schema, migration, and route-level ensure helper.
- Added /api/pilot/status for the user's MVP loop checklist based on privacy-safe usage events.
- Added /api/pilot/feedback for first_capture, first_cook, first_version, and pilot_general feedback stages.
- Profile now shows a Pilot loop checklist for onboarding, first recipe capture/create, meal plan, shopping list, first cook, and version promotion.
- RecipeWorkspace now prompts once after first capture and once after first cook-with-me completion, using localStorage to avoid repeated prompting.

Files touched:

- ROADMAP.md
- app/drizzle/0024_pilot_feedback.sql
- app/src/app/api/pilot/feedback/route.ts
- app/src/app/api/pilot/status/route.ts
- app/src/components/pilot/PilotFeedbackPrompt.tsx
- app/src/components/pilot/PilotChecklistPanel.tsx
- app/src/components/RecipeWorkspace.tsx
- app/src/components/profile/ProfileView.tsx
- app/src/db/schema.ts
- app/src/db/ensure-schema.ts
- app/src/lib/usage-events.ts
- app/src/lib/changelog.ts
- MEMORY.md

Checks:

- npx eslint on touched pilot/profile/workspace/API/schema files passed from app/.
- git diff --check passed before build/deploy.

Follow-ups:

- Done in 2026-06-08 Pilot version feedback hardening: first promoted-version feedback prompt now appears after attempt promotion.
- Consider an admin/operator pilot dashboard if usage events and feedback need to be reviewed inside the app instead of through DB/API inspection.


### 2026-06-08 - Pilot readiness production deploy

Changed/decided:

- Deployed the pilot readiness feedback loop to production at https://mychelin-sg.vercel.app.
- Added a follow-up fix for pilot feedback comment cleanup so whitespace is normalized correctly before storage.

Commits:

- 9f939ef Add pilot readiness feedback loop
- a798d2c Fix pilot feedback comment cleanup

Checks:

- npx eslint src/app/api/pilot/feedback/route.ts passed from app/.
- npm run build passed from app/.
- Production deploy aliased to https://mychelin-sg.vercel.app.
- Production smoke passed: unauthenticated /api/pilot/status returned 401; synthetic signup returned 201; authenticated /api/pilot/status returned 200 with 6 checklist items; POST /api/pilot/feedback returned 201 for pilot_general; GET /api/pilot/feedback returned 200 with the submitted feedback; synthetic user cleanup remaining 0.

Follow-ups:

- Done in 2026-06-08 Pilot version feedback hardening: first promoted-version feedback prompt now appears after attempt promotion.
- Consider an admin/operator pilot dashboard if usage events and feedback need to be reviewed inside the app instead of through DB/API inspection.


### 2026-06-08 - Pilot version feedback hardening

Changed/decided:

- Added a one-time first_version pilot feedback prompt after a recipe attempt is promoted to a version.
- Polished the Profile Pilot loop checklist with clearer next-step guidance, row descriptions, completion dates, and a manual refresh control.
- Updated pilot checklist API labels so the cook and version steps distinguish attempts, versions, and definitive versions more clearly.
- Updated the in-app changelog entry for the pilot readiness loop.

Files touched:

- app/src/app/api/pilot/status/route.ts
- app/src/components/pilot/PilotChecklistPanel.tsx
- app/src/components/recipes/RecipeView.tsx
- app/src/lib/changelog.ts
- MEMORY.md

Checks:

- npx eslint src/components/recipes/RecipeView.tsx src/components/pilot/PilotChecklistPanel.tsx src/app/api/pilot/status/route.ts src/lib/changelog.ts passed from app/ with only the existing RecipeView img warnings.
- git diff --check passed.
- npm run build passed from app/.
- Production deploy aliased to https://mychelin-sg.vercel.app.
- Production smoke passed: synthetic signup 201; recipe create 201; attempt create 201; attempt promote 201; /api/pilot/status returned 200 and marked version_completed=true with label "Promote an attempt to a version"; synthetic user cleanup remaining 0.

Follow-ups:

- Manually verify in-browser that the first_version feedback modal appears once after promoting an attempt and does not keep reappearing after dismissal.
- Next roadmap slice remains conversation capture / Whisper-first live assistance.


### 2026-06-08 - Realtime conversation capture production deploy

Changed/decided:

- Added an authenticated /api/capture/realtime-transcription Edge route that exchanges browser SDP with OpenAI Realtime using the server-side OPENAI_API_KEY, so the browser never sees the secret.
- Updated ConversationCapture to try OpenAI Realtime WebRTC transcription first.
- Added a browser SpeechRecognition live-caption fallback for production sessions where OpenAI Realtime is unavailable or not configured.
- Kept the existing chunked OpenAI/Gemini transcription path as the final fallback and reduced chunk duration from 4s to 3s.
- The live helper now displays Realtime, Browser, or Backup caption mode and marks partial transcript text while it is updating.
- Updated ROADMAP.md and in-app changelog copy to reflect the realtime-first, fallback-backed behavior.

Files touched:

- ROADMAP.md
- app/src/app/api/capture/realtime-transcription/route.ts
- app/src/components/capture/ConversationCapture.tsx
- app/src/lib/changelog.ts
- MEMORY.md

Checks:

- npx eslint src/components/capture/ConversationCapture.tsx src/app/api/capture/realtime-transcription/route.ts src/lib/changelog.ts passed from app/.
- git diff --check passed.
- npm run build passed from app/.
- Production deploy aliased to https://mychelin-sg.vercel.app.
- Production smoke passed: /app returned 200; unauthenticated /api/capture/realtime-transcription returned 401; seeded production login returned 200; authenticated empty-SDP request returned 503 with "OpenAI Realtime transcription is not configured. Add OPENAI_API_KEY."; seeded user cleanup remaining 0.

Follow-ups:

- Add OPENAI_API_KEY to Vercel Production to enable the OpenAI Realtime path; current production will use browser live captions first, then chunked backup.
- Manually test microphone flow in Chrome/Safari: start conversation, confirm browser live captions appear, stop, label speaker, and extract/save recipe.
- Real-audio pilot validation still needed for dialect accuracy, latency, and whether browser captions are good enough before OpenAI Realtime is configured.


### 2026-06-08 - DeepSeek-first capture text reasoning

Changed/decided:

- Added shared DeepSeek helper for OpenAI-compatible chat completions using DEEPSEEK_API_KEY, optional DEEPSEEK_BASE_URL, and DEEPSEEK_MODEL defaulting to deepseek-v4-flash.
- Updated conversation assist to use DeepSeek first for translated gist, missing cues, uncertain terms, and suggested questions; Gemini remains optional fallback only if configured.
- Updated conversation-to-recipe extraction and shared paste/URL extraction helper to use DeepSeek first for low-cost text reasoning.
- Updated app copy and docs so Gemini is no longer described as required for text reasoning/extraction.
- Confirmed Vercel Production already has DEEPSEEK_API_KEY and DEEPSEEK_MODEL. DEEPSEEK_BASE_URL is optional because the helper defaults to https://api.deepseek.com.

Files touched:

- MYCHELIN.md
- README.md
- ROADMAP.md
- app/src/lib/deepseek.ts
- app/src/lib/ai-extract.ts
- app/src/app/api/capture/conversation-assist/route.ts
- app/src/app/api/capture/extract/route.ts
- app/src/app/api/capture/paste/route.ts
- app/src/app/api/capture/url/route.ts
- app/src/components/capture/ConversationCapture.tsx
- app/src/components/capture/PasteRecipeModal.tsx
- app/src/components/recipes/RecipeView.tsx
- app/src/lib/changelog.ts
- MEMORY.md

Checks:

- npx eslint on DeepSeek helper, capture routes, capture UI, RecipeView, and changelog passed from app/ with only existing RecipeView img warnings.
- git diff --check passed.
- npm run build passed from app/.
- Production deploy aliased to https://mychelin-sg.vercel.app.
- Production smoke passed: seeded login 200; /api/capture/conversation-assist returned 200 with gist present and 4 suggested questions; /api/capture/paste returned 200 with provider=deepseek and 2 ingredients; seeded users and usage events cleaned up with remaining=0.

Follow-ups:

- Add OPENAI_API_KEY to Vercel Production to enable OpenAI Realtime/transcription; DeepSeek does not transcribe audio.
- Manually test full conversation flow in browser: live captions, DeepSeek suggested questions, stop, label speaker, extract/save recipe.


### 2026-06-08 - OpenAI production key enabled

Changed/decided:

- User added OPENAI_API_KEY to Vercel Production.
- Vercel automatically created a new Production deployment after the env var was added.
- Confirmed the latest Production deployment is Ready and the live app responds at https://mychelin-sg.vercel.app.

Checks:

- npx vercel env ls shows OPENAI_API_KEY present in Production, value encrypted.
- npx vercel inspect mychelin-bs3orrxiq-brianylms-projects.vercel.app --wait reported Ready.
- Production smoke passed: /app returned 200; seeded login returned 200; authenticated empty-SDP POST to /api/capture/realtime-transcription returned 400 "SDP offer is required" instead of the previous 503 missing OpenAI key; seeded user cleanup remaining 0.

Follow-ups:

- Manual browser microphone test is now the next required validation: start conversation capture, confirm OpenAI Realtime captions connect before browser fallback, stop, label speaker, and extract/save recipe.

### 2026-06-08 - Landing hero crop adjustment

Changed/decided:

- Nudged the landing hero image crop slightly to improve spacing between the two visible human subjects without changing the asset.
- Deployed the adjustment to production at `https://mychelin-sg.vercel.app`.

Files touched:

- `app/src/app/globals.css`

Checks:

- `git diff --check` passed.
- `npm run build` passed from `app/`.
- `npx vercel --prod --yes` completed and aliased production to `https://mychelin-sg.vercel.app`.
- Production landing page returned HTTP 200.

Follow-ups:

- User should visually confirm the hero crop on mobile and desktop; if either subject still feels too tight, adjust object-position by another small increment.

### 2026-06-08 - Conversation capture immediate recording fix

Changed/decided:

- Changed recipe conversation capture so microphone recording starts immediately after mic permission instead of waiting for the OpenAI Realtime handshake.
- Added a visible audio-level meter and "Recording now" state so users can tell whether Mychelin is hearing audio even before transcript text appears.
- Moved OpenAI Realtime startup to a background attempt with a short timeout; browser live captions remain active when OpenAI Realtime is unavailable.
- Confirmed current OpenAI docs show `gpt-realtime-whisper` is the intended realtime transcription model, priced per audio minute, and free-tier realtime transcription is not supported.
- Deployed the fix to production at `https://mychelin-sg.vercel.app`.

Files touched:

- `app/src/components/capture/ConversationCapture.tsx`

Checks:

- Focused `npx eslint src/components/capture/ConversationCapture.tsx` passed.
- `git diff --check` passed.
- Full `npm run lint` still fails on existing unrelated repo lint debt.
- `npm run build` passed from `app/`.
- `npx vercel --prod --yes` completed and aliased production to `https://mychelin-sg.vercel.app`.
- Production `/` and `/app` returned HTTP 200.

Follow-ups:

- User should retest Record conversation in-browser: after mic permission, the modal should immediately show Recording now and an audio meter; live text should appear via OpenAI Realtime if billing/tier is active, or via browser captions where supported.
- If OpenAI Realtime remains unavailable after billing setup, inspect `/api/capture/realtime-transcription` production logs for the provider status and consider migrating the handshake to the latest documented realtime transcription session flow if needed.

### 2026-06-08 - Conversation transcript fallback hardening

Changed/decided:

- Updated conversation capture so short-batch transcription runs in parallel with browser live captions, preventing a blank chat if the browser recognizer claims to start but emits no text.
- Reduced audio chunk duration to 2.5 seconds and suppresses delayed chunk text when recent live captions have already appeared, avoiding obvious duplicates.
- Added an in-chat "Listening for words..." placeholder when audio is detected but no transcript text has appeared yet.
- Deployed the change to production at `https://mychelin-sg.vercel.app`.

Files touched:

- `app/src/components/capture/ConversationCapture.tsx`

Checks:

- Focused `npx eslint src/components/capture/ConversationCapture.tsx` passed.
- `git diff --check` passed.
- `npm run build` passed from `app/`.
- `npx vercel --prod --yes` completed and aliased production to `https://mychelin-sg.vercel.app`.
- Production `/` and `/app` returned HTTP 200.

Follow-ups:

- User should retest by speaking immediately after recording starts. Expected: audio meter moves; if live caption events fire, text appears directly; if not, the chat shows the listening placeholder and short-batch transcript should appear when speech transcription is available.
- If no transcript appears after this change, inspect production logs for `/api/capture/transcribe-whisper` and `/api/capture/realtime-transcription`; likely remaining cause is OpenAI billing/tier or unsupported browser speech recognition on the test device.

### 2026-06-09 - Pilot onboarding and utility UI polish

Changed/decided:

- Split onboarding into a three-step flow: goals, cooking rhythm, and first recipe capture path.
- Replaced Profile plain loading text with skeleton loading sections that match the profile layout.
- Added a Mychelin `/app` backlink to Google Calendar, Outlook, and ICS event descriptions.
- Fixed shopping-list date selector overflow by stacking/wrapping date fields on small screens.
- Tightened cook-with-me timer controls from `1 min` labels to `-1m` and `+1m` with smaller non-wrapping text in single and multi-dish sessions.
- Delayed the first-capture pilot feedback prompt by 60 seconds and updated copy so it asks after users have had time to review the generated recipe.
- Deployed the UI batch to production at `https://mychelin-sg.vercel.app`.

Files touched:

- `app/src/components/onboarding/OnboardingFlow.tsx`
- `app/src/components/profile/ProfileView.tsx`
- `app/src/lib/calendar.ts`
- `app/src/components/shopping/ShoppingListView.tsx`
- `app/src/components/recipes/CookWithMeSession.tsx`
- `app/src/components/recipes/MultiCookWithMeSession.tsx`
- `app/src/components/RecipeWorkspace.tsx`
- `app/src/components/pilot/PilotFeedbackPrompt.tsx`

Checks:

- Focused ESLint on touched app files passed with only the existing onboarding `<img>` warning.
- `git diff --check` passed.
- `npm run build` passed from `app/`.
- `npx vercel --prod --yes` completed and aliased production to `https://mychelin-sg.vercel.app`.
- Production `/` and `/app` returned HTTP 200.

Follow-ups:

- User should test the three-step onboarding on a fresh account, Profile loading skeletons, shopping date controls on mobile, calendar export descriptions, cook-with-me timer button alignment, and first-capture feedback prompt timing.
- Recipe-specific calendar backlinks still require a reliable deep-link route/query handling for selected recipes; current implementation links back to the app.

### 2026-06-09 - Authenticated recipe deep links

Changed/decided:

- Added authenticated private recipe deep links via `/app?recipe=<id>` by hydrating `selectedRecipeId` from the URL in `RecipeStoreProvider`.
- Recipe selection now keeps the `recipe` query parameter in sync, and clearing selection removes the query parameter.
- Browser back/forward listens for `popstate` and restores selection from the URL.
- Calendar event descriptions now link to the exact recipe when the meal plan has a recipe id, falling back to `/app` otherwise.
- Deployed the deep-link update to production at `https://mychelin-sg.vercel.app`.

Files touched:

- `app/src/store/RecipeStore.tsx`
- `app/src/lib/calendar.ts`
- `app/src/components/planner/MealPlanView.tsx`

Checks:

- Focused `npx eslint src/store/RecipeStore.tsx src/lib/calendar.ts src/components/planner/MealPlanView.tsx` passed.
- `git diff --check` passed.
- `npm run build` passed from `app/`.
- `npx vercel --prod --yes` completed and aliased production to `https://mychelin-sg.vercel.app`.
- Production `/`, `/app`, and `/app?recipe=1` returned HTTP 200.

Follow-ups:

- Manually test logged-in browser behavior: click a recipe and confirm URL becomes `/app?recipe=<id>`; refresh and confirm the same recipe opens; clear back to recipe grid and confirm the query clears.
- Verify exported calendar events include `Open in Mychelin: https://mychelin-sg.vercel.app/app?recipe=<id>` for planned meals.
- Shared `/shared/<token>` links remain separate from private authenticated deep links.

### 2026-06-09 - Internal usage analytics dashboard

Changed/decided:

- Added an internal product usage dashboard at `/admin/analytics`.
- Added a protected aggregate analytics API at `/api/admin/analytics`, gated by logged-in email in `ANALYTICS_ADMIN_EMAILS` or `ADMIN_EMAILS`.
- Dashboard tracks total/new/active users, activation funnel, daily event volume, top usage events, capture sources/providers, onboarding goals, cooking rhythm, first capture modes, pilot feedback, and recent event metadata.
- Kept the dashboard privacy-safe: it does not return recipe text, prompts, transcripts, photos, family stories, or uploaded content.
- Deployed the dashboard to production at `https://mychelin-sg.vercel.app`.

Files touched:

- `app/src/app/admin/analytics/page.tsx`
- `app/src/app/api/admin/analytics/route.ts`

Checks:

- Focused `npx eslint src/app/api/admin/analytics/route.ts src/app/admin/analytics/page.tsx` passed.
- `git diff --check` passed.
- `npm run build` passed from `app/`.
- `npx vercel --prod --yes` completed and aliased production to `https://mychelin-sg.vercel.app`.
- Production `/`, `/app`, and `/admin/analytics` returned HTTP 200.
- Production `/api/admin/analytics` returned HTTP 401 without auth, as intended.

Follow-ups:

- Add the operator login email to Vercel `ANALYTICS_ADMIN_EMAILS` or `ADMIN_EMAILS`; otherwise the dashboard shell loads but the API will return 403 after login.
- As pilot usage grows, consider adding cohort filtering by signup date/source and exportable CSV snapshots.

### 2026-06-09 - Privacy and access-control hardening

Changed/decided:

- Audited high-risk API surfaces for cross-user access: auth, recipes, recipe search, recipe versions, attempts, photos, books, book recipes, book analysis, sharing, meal plans, shopping list, inventory, notifications, pilot feedback, and admin analytics.
- Fixed recipe search diagnostics so debug/sample ingredient counts are scoped only to recipes visible to the current user.
- Fixed recipe share-link creation so users can only create share links for recipes they can access.
- Fixed book recipe add/remove paths so editors can only add recipes they can access and remove logging no longer reveals guessed recipe titles.
- Fixed book principle analysis so recipe contents are read only after book membership is verified.
- Fixed recipe version tree/base-version/compare queries so guessed version ids or fork descendants outside the user's visible recipes are not returned or used.
- Fixed cover-photo selection so the cover must be one of the recipe's uploaded photos.
- Added shared admin email gating in `app/src/lib/admin-auth.ts` and applied it to admin analytics, the version migration endpoint, and global ingredient-catalog writes.
- Deployed the privacy hardening to production at `https://mychelin-sg.vercel.app`.

Files touched:

- `app/src/lib/admin-auth.ts`
- `app/src/app/api/admin/analytics/route.ts`
- `app/src/app/api/admin/migrate-versions/route.ts`
- `app/src/app/api/books/[id]/analyze-principles/route.ts`
- `app/src/app/api/books/[id]/recipes/route.ts`
- `app/src/app/api/ingredient-catalog/route.ts`
- `app/src/app/api/ingredient-catalog/[id]/route.ts`
- `app/src/app/api/recipes/[id]/photos/route.ts`
- `app/src/app/api/recipes/[id]/versions/route.ts`
- `app/src/app/api/recipes/[id]/versions/compare/route.ts`
- `app/src/app/api/recipes/search/route.ts`
- `app/src/app/api/share/route.ts`

Checks:

- Focused ESLint on touched files passed.
- `git diff --check` passed.
- `npm run build` passed from `app/`.
- `npx vercel --prod --yes` completed and aliased production to `https://mychelin-sg.vercel.app`.
- Production `/` and `/app` returned HTTP 200.
- Production unauthenticated checks returned HTTP 401 for `/api/recipes/search`, `/api/share`, `/api/books/1/analyze-principles`, and catalog write `/api/ingredient-catalog`.

Follow-ups:

- Uploaded recipe photos and voice clips are still public Vercel Blob URLs once someone has the URL; access to URL discovery/listing is gated, but true private media would require signed/private blob delivery.
- Shared links remain intentionally public to anyone with the token; token management/revocation should stay visible in the sharing UI.
- Consider adding automated two-user isolation tests before pilot launch.

### 2026-06-10 - Sidebar library hierarchy and OCR placement

Changed/decided:

- Renamed the authenticated sidebar's top recipe section from `Recipes` to `Recipe library` so it reads as the user's saved/captured recipe library rather than another create action.
- Demoted the Books create action from a `+ New` text button to a compact icon-only `Create book` action, reducing mid-screen pull away from the primary Create recipe path.
- Updated empty Books copy so books are framed as later organization, not a required first action.
- Decided OCR should be a dedicated `Scan recipe photo` capture path under Create recipe, separate from Import URL and Paste recipe text. OCR output should feed the same recipe parser as pasted text while preserving the original image as provenance.
- Updated `ROADMAP.md` to include scanned recipe photos in AI recipe capture and a dedicated OCR/photo import workflow.
- Deployed the sidebar copy/hierarchy update to production at `https://mychelin-sg.vercel.app`.

Files touched:

- `app/src/components/layout/RecipeSidebar.tsx`
- `ROADMAP.md`

Checks:

- Focused `npx eslint src/components/layout/RecipeSidebar.tsx` passed.
- `git diff --check` passed.
- `npm run build` passed from `app/`.
- `npx vercel --prod --yes` completed and aliased production to `https://mychelin-sg.vercel.app`.
- Production `/` and `/app` returned HTTP 200.

Follow-ups:

- Implement the actual OCR flow as a new Create recipe action: capture/upload image, run OCR, show extracted text for correction, then parse into recipe fields.

### 2026-06-10 - One-click Create recipe route presentation

Changed/decided:

- Removed the Create recipe accordion interaction from the authenticated sidebar because it added an unnecessary extra click before recipe capture.
- Kept the input-route mental model as visual grouping only: `Capture from real life`, `Import existing recipe`, and `Start from scratch`.
- Existing route buttons are now directly visible and one-click: Live conversation, Import URL/video, Paste recipe text, Ask Mychelin, and Manual recipe.
- Did not add a disabled Scan photo/OCR button yet; the OCR route should appear when the actual OCR flow exists, not as a dead affordance.
- Deployed the sidebar route-presentation update to production at `https://mychelin-sg.vercel.app`.

Files touched:

- `app/src/components/layout/sidebar/SidebarToolbar.tsx`

Checks:

- Focused `npx eslint src/components/layout/sidebar/SidebarToolbar.tsx` passed.
- `git diff --check` passed.
- `npm run build` passed from `app/`.
- `npx vercel --prod --yes` completed and aliased production to `https://mychelin-sg.vercel.app`.
- Production `/` and `/app` returned HTTP 200.

Follow-ups:

- When OCR is implemented, add `Scan recipe photo` as the first one-click route under `Capture from real life`, alongside Live conversation.

### 2026-06-11 - Pilot control-plane pause: privacy smoke, runbook, analytics

Changed/decided:

- Paused feature progress to regain operational clarity before inviting pilot users.
- Added a two-user privacy smoke test that creates synthetic users and verifies User A cannot access User B private recipes, recipe search results, share-link creation, books/book recipes/book analysis, meal plans, attempts, versions, version compare, or admin analytics.
- Added optional Turso cleanup for the synthetic smoke-test users when `MYCHELIN_CLEANUP_USERS=1`, `TURSO_DATABASE_URL`, and `TURSO_AUTH_TOKEN` are available in the shell.
- Added a pilot runbook centered on the core MVP loop: signup/onboarding, first recipe capture, meal plan, shopping list, cook-with-me, attempt notes, and promote-to-version.
- Added an analytics operating guide for the existing first-party `/admin/analytics` dashboard and privacy-safe event rules.

Files touched:

- `ANALYTICS.md`
- `PILOT_RUNBOOK.md`
- `app/package.json`
- `app/scripts/privacy-smoke.mjs`

Checks:

- `node --check app/scripts/privacy-smoke.mjs` passed.
- Focused `npx eslint scripts/privacy-smoke.mjs` passed from `app/`.
- `git diff --check` passed.
- Production privacy smoke passed against `https://mychelin-sg.vercel.app`: 32 assertions, including cross-user denials and synthetic Turso user cleanup.
- Full `npm run lint` still fails on pre-existing unrelated lint debt across scripts/books/capture/PWA/version components; not introduced by this batch.

Follow-ups:

- Use `cd app && MYCHELIN_BASE_URL=https://mychelin-sg.vercel.app npm run smoke:privacy` before each pilot wave or risky privacy-related change.
- Add operator emails to `ANALYTICS_ADMIN_EMAILS` or `ADMIN_EMAILS` in Vercel before relying on the analytics dashboard in pilot operations.
- Clear the pre-existing full-project lint debt separately so future pilot-readiness checks can use full `npm run lint` as a clean gate.

### 2026-06-11 - Analytics admin email added

Changed/decided:

- Added `brianyaplm@hotmail.com` to the production `ANALYTICS_ADMIN_EMAILS` Vercel environment variable.
- Redeployed production so the live `/admin/analytics` API can read the new env value.

Checks:

- `npx vercel env ls` confirmed no prior analytics admin env var was configured before this addition.
- `npx vercel --prod --yes` completed and aliased production to `https://mychelin-sg.vercel.app`.
- Production `/admin/analytics` returned HTTP 200.
- Production unauthenticated `/api/admin/analytics` returned HTTP 401, as intended.

Follow-ups:

- Log in as `brianyaplm@hotmail.com` and open `/admin/analytics` to confirm the authenticated API path returns data instead of 403.

### 2026-06-11 - Admin analytics registered-user outreach view

Changed/decided:

- Added an admin-only registered-users section to `/admin/analytics` so pilot operators can see user id, name, email, signup date, last tracked activity, onboarding fields, 30-day privacy-safe usage counts, and latest feedback metadata.
- Added copy-all-emails and per-user mailto links for pilot feedback outreach.
- Extended `/api/admin/analytics` to return the registered-user usage array only after the existing `ANALYTICS_ADMIN_EMAILS` / `ADMIN_EMAILS` gate passes.
- Updated `ANALYTICS.md` to document that email/name/id are PII and only allowed inside the protected admin outreach view.
- Deployed the change to production at `https://mychelin-sg.vercel.app`.

Files touched:

- `ANALYTICS.md`
- `app/src/app/admin/analytics/page.tsx`
- `app/src/app/api/admin/analytics/route.ts`

Checks:

- Focused `npx eslint src/app/api/admin/analytics/route.ts src/app/admin/analytics/page.tsx` passed from `app/`.
- `git diff --check` passed.
- `npm run build` passed from `app/`.
- `npx vercel --prod --yes` completed and aliased production to `https://mychelin-sg.vercel.app`.
- Production `/admin/analytics` returned HTTP 200.
- Production unauthenticated `/api/admin/analytics` returned HTTP 401.
- Production privacy smoke passed: 32 assertions, including authenticated non-admin `/api/admin/analytics` returning 403 and synthetic Turso user cleanup.

Follow-ups:

- Log in as `brianyaplm@hotmail.com` and open `/admin/analytics`; the registered-users table should appear under the summary cards.
- Consider CSV export later if outreach volume grows beyond manual pilot follow-up.

### 2026-06-12 - Pilot blocker pass and core-loop smoke test

Changed/decided:

- User confirmed admin analytics access works for `brianyaplm@hotmail.com`.
- Kept feature progress paused and ran a pilot-blocker pass focused only on the MVP loop and privacy boundaries.
- Added `app/scripts/pilot-smoke.mjs`, a single-user production smoke for signup, recipe creation, planner recipe discovery, meal planning, shopping-list generation, cook attempt creation, attempt promotion to version/definitive version, pilot checklist status, pilot feedback, and non-admin analytics denial.
- Added `npm run smoke:pilot` and documented it in `PILOT_RUNBOOK.md` and `ANALYTICS.md` as a pre-pilot gate alongside `smoke:privacy`.
- No production runtime code changed and no deploy was needed for this tooling/docs checkpoint.

Files touched:

- `ANALYTICS.md`
- `PILOT_RUNBOOK.md`
- `app/package.json`
- `app/scripts/pilot-smoke.mjs`

Checks:

- `node --check app/scripts/pilot-smoke.mjs` passed.
- Focused `npx eslint scripts/pilot-smoke.mjs scripts/privacy-smoke.mjs` passed from `app/`.
- `git diff --check` passed.
- Production `smoke:pilot` passed against `https://mychelin-sg.vercel.app`: 42 assertions and synthetic Turso user cleanup.
- Production `smoke:privacy` passed against `https://mychelin-sg.vercel.app`: 32 assertions and synthetic Turso user cleanup.

Follow-ups:

- The core API pilot path currently has no automated blocker based on production smoke results.
- The next real blocker pass should be a human UI dry-run using the runbook, because the smoke verifies APIs but not mobile interaction friction, copy clarity, camera/photo flows, or cook-with-me ergonomics.

### 2026-06-12 - Pilot navigation and install-prompt polish

Changed/decided:

- Fixed the left-panel Create recipe section so it is collapsed by default and can be expanded from the Create recipe header.
- Made the mobile hamburger open the recipe drawer from Fridge, Shopping, and Meal Plan views, not only the Recipes view. Non-recipe views use a mobile-only drawer so desktop layouts are unchanged.
- Clarified Profile cooking rhythm copy: the weekly goal is a dish goal and counts completed cook-with-me attempts, not cooking days or generic meals.
- Reduced Add to Home Screen prompt aggressiveness: it now waits two minutes, appears at most once per session, snoozes for seven days after being shown, and snoozes for thirty days after dismissal.
- Added an in-app changelog entry for this pilot polish batch.

Files touched:

- `app/src/components/InstallPrompt.tsx`
- `app/src/components/RecipeWorkspace.tsx`
- `app/src/components/layout/RecipeSidebar.tsx`
- `app/src/components/layout/sidebar/SidebarToolbar.tsx`
- `app/src/components/profile/ProfileView.tsx`
- `app/src/lib/changelog.ts`

Checks:

- Focused `npx eslint src/components/RecipeWorkspace.tsx src/components/layout/RecipeSidebar.tsx src/components/layout/sidebar/SidebarToolbar.tsx src/components/profile/ProfileView.tsx src/components/InstallPrompt.tsx` passed from `app/`.
- `git diff --check` passed.
- `npm run build` passed from `app/`.

Follow-ups:

- Deploy to production and verify on mobile: hamburger from Fridge/Shopping/Meal Plan, collapsed Create recipe section, Profile dish-goal wording, and quieter install prompt behavior.

### 2026-06-12 - Discovery note: localized multimodal food understanding

Changed/decided:

- Treated the HawkerSense/Wong Qi Han note as discovery input for Mychelin rather than a current pilot feature.
- Public web search did not surface reliable primary/public sources confirming the specific HawkerSense architecture, App Store/AsiaOne claims, or quoted UX details, so the roadmap marks those claims as unverified competitor intelligence.
- Added a roadmap section for localized multimodal food understanding: Mychelin should eventually treat scanned/photo recipe inputs as provenance plus Singapore family-cooking context, not generic OCR/object detection only.
- Added future prompt-layer notes for Singapore-aware multimodal capture: dish-family context, local/dialect term preservation, hidden/ambiguous sauce/gravy/oil handling, follow-up questions, and uncertainty instead of hallucinated precision.
- Reaffirmed that Mychelin should not become a nutrition tracker; use confidence/cookability/family-confirmation signals instead of health-style grades.

Files touched:

- `ROADMAP.md`

Checks:

- `git diff --check` passed for the docs-only roadmap update.

References used:

- Nutrition5k paper: food-image nutritional understanding is challenging and needs richer datasets/labels.
- FoodLMM paper: general multimodal models still underperform in specialized food domains, motivating food-specific multimodal training/prompting.

Follow-ups:

- Revisit this after the first pilot dry-run, before building Scan recipe photo/OCR beyond basic text extraction.
