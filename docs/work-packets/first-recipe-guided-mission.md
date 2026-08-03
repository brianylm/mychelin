# Work Packet — First Recipe Guided Mission

Status: ready for first implementation pass (decisions locked 2026-08-03)
Owner: Agrippa + B
Source roadmap item: Mychelin ROADMAP.md → Activation, training, and habit loop → first-recipe guided mission

## Product intent

Help first-time users after signup understand what Mychelin can do and feel accompanied through their first cooking journey.

This is not a generic feature tour. It should guide someone who may not know what recipe apps do, may not know how Mychelin differs from other apps, and may not have cooked before.

The desired feeling: Mychelin is an easy companion that helps them get from "I don't know where to start" to "I cooked something and recorded what happened."

## Target user

First-time users after signup, especially users who:

- have no recipes yet
- do not know what Mychelin can do
- may not have cooked before
- need a gentle, concrete path into cooking

## Core success moment

The guided flow succeeds when the user:

1. Cooks their first recipe, preferably through **Cook with Me**.
2. Records the first attempt after cooking.

Creating a recipe alone is not enough; the product loop should lead to a cooked attempt.

## Current baseline (what already exists — do not rebuild)

- **Onboarding already ends in capture.** `OnboardingFlow.tsx` (3 steps: goals → rhythm → capture) copies a starter recipe into the user's library when the user picks "Start from a sample dish". So "pick/create a first recipe" is largely solved by onboarding.
- **Starter recipes exist.** `app/src/lib/starter-recipes.ts` has 3 real cookable dishes (tau yu bak, garlicky xiao bai cai, onion omelette) with heat-tagged steps. Onboarding's capture step already lets users pick one.
- **Rhythm already tracks cooked attempts.** `weeklyCookingGoal` (default 2, clamped 1–6) is derived from onboarding goals/frequency in `app/src/lib/rhythm.ts`. Profile states progress counts completed cook-with-me attempts ("one finished dish equals one point, not a daily streak"). Attempts post to `app/src/app/api/recipes/[id]/attempts`.
- **Cook With Me exists.** `CookWithMeSession.tsx` / `MultiCookWithMeSession.tsx` are the guided step-by-step cooking mode.

The mission's real job is the **second half of the loop**: from "recipe exists" → plan/prep (optional) → Cook With Me → record attempt → feel the rhythm move. It is guidance over existing surfaces, not new capture.

## Locked product decisions (B, 2026-08-03)

### 1. Sample recipe source

**Reuse the existing 3 starter recipes**, copied into the library exactly as onboarding already does. No synthetic sandbox recipe in v1.

- The mission works with whatever recipe the user has; the starter path is just the safe default for users with none.
- Users who chose "Start from a sample dish" in onboarding already own a starter recipe and go straight to planning/cooking.

### 2. Entry point

**Post-onboarding dashboard card.** Onboarding stays as-is (3 steps). After it completes, an optional **"Cook your first dish"** card appears on the dashboard and launches the mission flow.

- Least friction at signup — the mission picks up exactly where onboarding leaves off.
- Not a full-screen wizard that blocks the dashboard; not buried in Profile.

### 3. Skip and recovery

**Dismissible + resumable.** The mission can be skipped at any point (mirrors onboarding's existing Skip button). After dismissal, it stays as a resumable prompt (dashboard card, and/or Profile / Learn area) until the user records their **first attempt**. Once a first attempt exists, the card disappears for good.

### 4. Steps required before Cook With Me

**Recipe only.** Cook With Me unlocks as soon as a recipe exists (created/imported during onboarding). Planning and shopping-list generation are shown as optional prep steps with an explicit "skip" affordance — never a gate.

- The centerpiece of the mission is the cooked, recorded attempt.
- Plan/shopping steps teach the loop through action but must not block the cook.

### 5. Completion screen

**Celebrate + rhythm tie-in + next actions.** A warm finish:

- "First cook recorded — nice one." (warm, calm tone)
- Rhythm tie-in: "That's 1 of your N meals this week."
- Next actions: **Save what changed as a version** (promote-to-version, one tap) / **Plan your next meal** / **Done**.

### 6. Rhythm integration

**Surface existing progress — no new tracking.** Completed cook-with-me attempts already count toward `weeklyCookingGoal` via the existing mechanism. The mission only *surfaces* that count on the completion screen ("1 of N this week"). No new schema, no new counters.

## Mission flow (v1)

1. Onboarding completes → user lands on dashboard with a "Cook your first dish" card.
2. Card opens the mission. Step 1: recipe — confirms the starter recipe created in onboarding, or lets the user pick a recipe from their library if they created/imported one instead.
3. Step 2 (optional): **Plan it** — place the dish in a meal slot. "Skip for now" allowed.
4. Step 3 (optional): **What to buy** — generate the shopping list. "Skip for now" allowed.
5. Step 4: **Cook with Me** — launches the existing `CookWithMeSession` for that recipe.
6. Step 5: **Record attempt** — post the attempt via the existing attempts flow.
7. Step 6: **Completion** — celebrate, show "1 of N meals this week", offer next actions (save as version / plan next meal / done).
8. Card clears (first attempt exists); mission no longer shows.

Steps 2–3 are skippable; steps 4–6 are the core success moment.

## V1 scope

- Dashboard "Cook your first dish" card for users with no recorded attempt (and not in a dismissed/forever state).
- Mission flow UI: a lightweight stepper over existing surfaces (recipe picker, plan handoff, shopping handoff, Cook With Me launcher, attempt recording, completion screen).
- Completion screen with rhythm tie-in + next actions.
- "First attempt recorded" derived from existing attempt data (user-scoped), not a new schema field where avoidable.
- Dismiss state: user-scoped preference or localStorage (implementation choice; no schema change if possible).

## V1 non-goals

- No synthetic sandbox recipe.
- No new recipe data model.
- No changes to onboarding itself.
- No new habit/streak system — reuse the rhythm model.
- No changes to Cook With Me internals.
- No changes to the attempt/version model.

## Definition of done — v1

1. A user who completes onboarding lands on the dashboard with the "Cook your first dish" card.
2. The card is dismissible; it returns as a resumable prompt until the first attempt is recorded.
3. The mission guides: recipe → optional plan → optional shopping → Cook With Me → record attempt → completion.
4. Cook With Me unlocks with a recipe alone; plan/shopping steps are optional with explicit skip.
5. Completion celebrates, shows "1 of N meals this week" (from existing weekly progress), and offers save-as-version / plan-next-meal / done.
6. Once a first attempt is recorded, the card no longer shows.
7. Existing onboarding, Cook With Me, attempts, and rhythm flows are unchanged.
8. Validation: focused ESLint, `npx tsc --noEmit`, production build, `git diff --check` from repo root.
9. Preview-first on `mychelin-ui-uplift.vercel.app`; production only after B accepts the staged mission.

## Implementation starting points

- Dashboard shell: `app/src/components/RecipeWorkspace.tsx`.
- Onboarding: `app/src/components/onboarding/OnboardingFlow.tsx` (reference for flow patterns and starter-recipe creation).
- Starter recipes: `app/src/lib/starter-recipes.ts`.
- Cook With Me: `app/src/components/recipes/CookWithMeSession.tsx`, `MultiCookWithMeSession.tsx`.
- Attempts API: `app/src/app/api/recipes/[id]/attempts/`.
- Rhythm/weekly progress: `app/src/lib/rhythm.ts`, `app/src/components/profile/ProfileView.tsx` (source of the "completed attempts = points" progress), `app/src/lib/planner-logged-meals.ts`.
- Feature kill switch convention: `app/src/lib/feature-flags.ts` (mirror `COOKING_CARD_ENABLED` pattern — e.g. `FIRST_COOK_MISSION_ENABLED`).
- New component(s): `app/src/components/mission/` (e.g. `FirstCookMissionCard.tsx`, `FirstCookMissionFlow.tsx`).

## Acceptance criteria

1. Post-onboarding user sees the mission card once, on the dashboard.
2. Card is dismissible and reappears on next visit until a first attempt exists.
3. Mission reaches Cook With Me with just a recipe (plan/shopping skippable).
4. Recording an attempt through the mission completes it.
5. Completion screen shows the rhythm tie-in with the correct "N" from `weeklyCookingGoal`.
6. Save-as-version and plan-next-meal actions from completion work (existing flows).
7. After a first attempt, the card is gone.
8. User isolation: mission state and attempt detection are user-scoped; another user's data is never surfaced.
9. Focused lint, TypeScript, production build, and `git diff --check` pass.
10. Preview deployment used first; production unchanged until B accepts.

## Concrete smoke-test scenario

1. Seed synthetic user A with no recipes, no attempts, no preferences.
2. Complete onboarding as "Start from a sample dish" (pick tau yu bak). Assert the recipe lands in the library and the dashboard shows the mission card.
3. Dismiss the card. Reload — assert it returns.
4. Open the mission: skip plan, skip shopping. Assert Cook With Me opens for tau yu bak.
5. Complete a Cook With Me session and record an attempt.
6. Assert completion shows "1 of {weeklyCookingGoal} meals this week".
7. Reload — assert the mission card no longer shows.
8. Create user B. Assert user B has no mission card and can see none of user A's mission state (isolation).
9. Clean up both users.

## Product trap checks

- If the user chose voice/URL/scratch capture in onboarding (no starter recipe), the mission must pick from their existing library or prompt them to create one — never silently create a starter recipe they didn't choose.
- If a user somehow has no recipe at mission time, show a friendly "add a recipe" step rather than a dead end.
- Dismissal must not permanently hide the mission before the first attempt — it must remain resumable (per decision 3).
- Attempt detection must be user-scoped and not count only cook-with-me attempts from the mission (any completed attempt clears the card).
- The completion "N" must come from the user's actual `weeklyCookingGoal`, not a hardcoded number.
- The mission must not block the dashboard even if its data query fails — best-effort like the cooking card kill switch.
- Do not let the mission card become a permanent fixture; it is a one-time-first-loop prompt.
